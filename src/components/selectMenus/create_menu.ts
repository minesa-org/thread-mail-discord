import {
	InteractionReplyFlags,
	type StringSelectInteraction,
	type MiniInteractionComponent,
	TextDisplayBuilder,
	ContainerBuilder,
	SectionBuilder,
	ThumbnailBuilder,
} from "@minesa-org/mini-interaction";
import { fetchDiscord } from "../../utils/discord.ts";
import { db } from "../../utils/database.ts";

export const createMenuHandler: MiniInteractionComponent = {
	customId: "create:select_server",
	handler: async (interaction: StringSelectInteraction) => {
		const guildId = interaction.data.values[0];
		const user = interaction.user ?? interaction.member?.user;

		if (!user) {
			return interaction.reply({
				content: "<:Oops:1455132060044759092> Could not resolve user.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}

		try {
			const userData = await db.get(`user:${user.id}`);
			if (userData && userData.activeTicketId) {
				const existingTicket = await db.get(
					`ticket:${userData.activeTicketId}`,
				);
				if (existingTicket && existingTicket.status === "open") {
					return interaction.reply({
						components: [
							new ContainerBuilder()
								.addComponent(
									new TextDisplayBuilder().setContent(
										"## <:Oops:1455132060044759092> You already have an open ticket!",
									),
								)
								.addComponent(
									new TextDisplayBuilder().setContent(
										`Please use </send:1453302198086664248> command in DMs to communicate with staff.\n\nYour ticket: <#${existingTicket.threadId}>`,
									),
								)
								.toJSON(),
						],
						flags: [
							InteractionReplyFlags.IsComponentsV2,
							InteractionReplyFlags.Ephemeral,
						],
					});
				}
			}

			const ticketId = Date.now().toString();
			let caseNumber = 1;
			try {
				const counterData: any = await db.get(`counter:${guildId}`);
				if (counterData && counterData.lastCaseNumber) {
					caseNumber = counterData.lastCaseNumber + 1;
				}
				await db.set(`counter:${guildId}`, {
					lastCaseNumber: caseNumber,
				});
			} catch (error) {
				caseNumber = 1; // Fallback
			}

			const guild = await fetchDiscord(
				`/guilds/${guildId}`,
				process.env.DISCORD_BOT_TOKEN!,
				true,
			);

			// Get guild data to check for custom ticket channel
			let ticketChannelId;
			try {
				const guildData = await db.get(`guild:${guildId}`);
				ticketChannelId = guildData?.ticketChannelId;
			} catch (dbError) {
				console.error("Error fetching guild data:", dbError);
			}

			// Use custom channel if set, otherwise fall back to system channel
			const targetChannelId = ticketChannelId || guild.system_channel_id;

			if (!targetChannelId) {
				return interaction.reply({
					content:
						"<:Oops:1455132060044759092> This server does not have a system channel configured. Please create a thread manually or tell the server owner to configure a system channel.\n\n-# You may want to forward this message to the server owner to configure a system channel.",
				});
			}

			const thread = await fetch(
				`https://discord.com/api/v10/channels/${targetChannelId}/threads`,
				{
					method: "POST",
					headers: {
						Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: `#${caseNumber} - ${user.username}`,
						auto_archive_duration: 10080, // 1 week
						type: 12, // Guild Private Thread
					}),
				},
			).then((res) => res.json());

			try {
				let pingMention = "@here"; // Default fallback
				try {
					const guildData = await db.get(`guild:${guildId}`);
					if (
						guildData &&
						guildData.pingRoleId &&
						guildData.pingRoleId !== null
					) {
						pingMention = `<@&${guildData.pingRoleId}>`;
					}
				} catch (dbError) {}

				await fetch(
					`https://discord.com/api/v10/channels/${thread.id}/messages`,
					{
						method: "POST",
						headers: {
							Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							components: [
								{
									type: 17,
									accent_color: null,
									spoiler: false,
									components: [
										{
											type: 10,
											content: `## <:thread_create:1455132063077371952> New Ticket #${caseNumber}\n-# [ ${pingMention} ]\n\n**Created by:** ${user.username}`,
										},
										{
											type: 10,
											content: `-# Please assist this user with their inquiry <:reply:1455132061441593579>`,
										},
									],
								},
							],
							flags: 32768,
						}),
					},
				);
			} catch (messageError) {
				console.error(
					"Error sending initial thread message:",
					messageError,
				);
			}
			let webhookUrl = null;
			try {
				const webhooks = await fetchDiscord(
					`/channels/${targetChannelId}/webhooks`,
					process.env.DISCORD_BOT_TOKEN!,
					true,
				);
				let existingWebhook = webhooks.find(
					(wh: any) => wh.name === "TicketSystem",
				);

				if (!existingWebhook) {
					const webhookResponse = await fetch(
						`https://discord.com/api/v10/channels/${targetChannelId}/webhooks`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								name: "TicketSystem",
							}),
						},
					);

					if (webhookResponse.ok) {
						existingWebhook = await webhookResponse.json();
					}
				}

				webhookUrl = `https://discord.com/api/webhooks/${existingWebhook.id}/${existingWebhook.token}`;
			} catch (webhookError) {}
			try {
				await db.set(`guild:${guildId}`, {
					guildId,
					guildName: guild.name,
					systemChannelId: guild.system_channel_id,
					ticketChannelId,
					webhookUrl,
					status: "active",
				});

				await db.set(`ticket:${ticketId}`, {
					ticketId,
					caseNumber,
					guildId,
					userId: user.id,
					username: user.username,
					threadId: thread.id,
					status: "open",
				});

				await db.set(`thread:${thread.id}`, {
					ticketId,
				});

				const existingUserData = await db.get(`user:${user.id}`);
				await db.set(`user:${user.id}`, {
					...existingUserData,
					activeTicketId: ticketId,
					guildId,
				});

				// Update Linked Roles metadata for thread creation count
				try {
					const userData = await db.get(user.id);
					if (userData && userData.accessToken) {
						// Get current thread count from metadata or initialize to 0
						let currentCount = 0;
						try {
							const metadataResponse = await fetch(
								`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_APPLICATION_ID}/role-connection`,
								{
									headers: {
										Authorization: `Bearer ${userData.accessToken}`,
									},
								},
							);
							if (metadataResponse.ok) {
								const metadata = await metadataResponse.json();
								currentCount =
									metadata.metadata?.threads_created || 0;
							}
						} catch (fetchError) {
							console.error(
								"Error fetching current metadata:",
								fetchError,
							);
							// Continue with 0 if we can't fetch
						}

						// Update with incremented count
						const newCount = currentCount + 1;
						await fetch(
							`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_APPLICATION_ID}/role-connection`,
							{
								method: "PUT",
								headers: {
									Authorization: `Bearer ${userData.accessToken}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									platform_name: "ThreadMail",
									metadata: {
										threads_created: newCount,
									},
								}),
							},
						);
						console.log(
							`✅ Updated Linked Roles for ${user.username}: ${newCount} threads created`,
						);
					}
				} catch (metadataError) {
					console.error(
						"Error updating Linked Roles metadata:",
						metadataError,
					);
					// Don't fail ticket creation if metadata update fails
				}
			} catch (dbError) {
				console.error("Database save error:", dbError);
				try {
					await fetch(
						`https://discord.com/api/v10/channels/${thread.id}`,
						{
							method: "DELETE",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
							},
						},
					);
				} catch (cleanupError) {
					console.error("Failed to clean up thread:", cleanupError);
				}
				throw new Error("Failed to save ticket data to database");
			}

			return interaction.update({
				components: [
					new ContainerBuilder()
						.addComponent(
							new SectionBuilder()
								.addComponent(
									new TextDisplayBuilder().setContent(
										[
											`## <:thread:1455132093226160322> Ticket created in ${guild.name}!`,
											`You can now send messages using </send:1453302198086664248> command in our DMs!\n<#${thread.id}>`,
										].join("\n"),
									),
								)
								.setAccessory(
									new ThumbnailBuilder().setMedia(
										guild.icon
											? {
													url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`,
											  }
											: null,
									),
								),
						)
						.toJSON(),
				],
				flags: [InteractionReplyFlags.IsComponentsV2],
			});
		} catch (error) {
			console.error("Error in create menu handler:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> Failed to create thread. Check bot permissions in the selected server.",
			});
		}
	},
};

export default createMenuHandler;
