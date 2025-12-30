import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandBuilder,
	CommandContext,
	ContainerBuilder,
	IntegrationType,
	InteractionReplyFlags,
	MiniPermFlags,
	TextDisplayBuilder,
	type CommandInteraction,
	type MiniComponentMessageActionRow,
	type MiniInteractionCommand,
} from "@minesa-org/mini-interaction";
import { db } from "../utils/database.ts";

const sendCommand: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("send")
		.setDescription("Send a message to the ticket system")
		.setDefaultMemberPermissions(MiniPermFlags.ManageThreads)
		.setContexts([CommandContext.Guild, CommandContext.Bot])
		.setIntegrationTypes([
			IntegrationType.GuildInstall,
			IntegrationType.UserInstall,
		])
		.addStringOption((option) =>
			option
				.setName("content")
				.setDescription("The message content")
				.setRequired(true),
		)
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const { options, guild, channel } = interaction;
		const user = interaction.user ?? interaction.member?.user;

		if (!user) {
			return interaction.reply({
				content: "<:Oops:1455132060044759092> Could not resolve user.",
			});
		}

		const content = options.getString("content")!;

		try {
			const isDM = !guild;

			if (isDM) {
				let userData;
				try {
					userData = await db.get(`user:${user.id}`);
				} catch (dbError) {
					console.error("Database error getting user data:", dbError);
					userData = null; // Treat as unauthorized if database fails
				}

				if (!userData || !userData.accessToken) {
					const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${
						process.env.DISCORD_APPLICATION_ID
					}&response_type=code&redirect_uri=${encodeURIComponent(
						process.env.DISCORD_REDIRECT_URI!,
					)}&scope=applications.commands+identify+guilds+role_connections.write&integration_type=1`;

					const button =
						new ActionRowBuilder<MiniComponentMessageActionRow>()
							.addComponents(
								new ButtonBuilder()
									.setLabel("Authorize App")
									.setStyle(ButtonStyle.Link)
									.setURL(oauthUrl),
							)
							.toJSON();

					return interaction.reply({
						components: [
							new ContainerBuilder()
								.addComponent(
									new TextDisplayBuilder().setContent(
										"## <:sharedwithu:1455132088926863412> Authorization Required",
									),
								)
								.addComponent(
									new TextDisplayBuilder().setContent(
										"You have not authorized your account with the app. Click the button below to authorize.",
									),
								)
								.addComponent(button)
								.toJSON(),
						],
						flags: [InteractionReplyFlags.IsComponentsV2],
					});
				}

				if (!userData.activeTicketId) {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> You don't have an active ticket. Use </create:1453302198086664249> command in a server first.",
					});
				}

				const ticketData = await db.get(
					`ticket:${userData.activeTicketId}`,
				);

				if (!ticketData || ticketData.status !== "open") {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> Your ticket is not active or doesn't exist.",
					});
				}

				const guildData = await db.get(`guild:${ticketData.guildId}`);
				const webhookUrl = guildData?.webhookUrl;

				let webhookWorked = false;

				if (
					webhookUrl &&
					typeof webhookUrl === "string" &&
					webhookUrl.startsWith("https://discord.com/api/webhooks/")
				) {
					try {
						const webhookResponse = await fetch(
							`${webhookUrl}?thread_id=${ticketData.threadId}`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									content: content,
									username: user.username,
									avatar_url: user.avatar
										? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
										: undefined,
								}),
							},
						);

						if (webhookResponse.ok) {
							webhookWorked = true;
							return interaction.reply({
								flags: [InteractionReplyFlags.IsComponentsV2],
								components: [
									new TextDisplayBuilder()
										.setContent(`>>> ${content}`)
										.toJSON(),
									new ContainerBuilder()
										.addComponent(
											new TextDisplayBuilder().setContent(
												"-# Message sent to ticket <:reply:1455132061441593579>",
											),
										)
										.toJSON(),
								],
							});
						} else {
							console.warn(
								`Webhook failed with status ${webhookResponse.status}`,
							);
						}
					} catch (webhookError) {
						console.warn("Webhook error:", webhookError);
					}
				}

				if (!webhookWorked) {
					const response = await fetch(
						`https://discord.com/api/v10/channels/${ticketData.threadId}/messages`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								flags: 32768,
								components: [
									{
										type: 10,
										content: content,
									},
									{
										type: 17,
										accent_color: null,
										spoiler: false,
										components: [
											{
												type: 10,
												content:
													"-# Replied by staff <:seal:1455132090906710057>",
											},
										],
									},
								],
							}),
						},
					);

					if (!response.ok) {
						throw new Error(
							`Failed to send message: ${response.status}`,
						);
					}
				}

				const container = new ContainerBuilder()
					.addComponent(
						new TextDisplayBuilder().setContent(`>>> ${content}`),
					)
					.addComponent(
						new TextDisplayBuilder().setContent(
							"-# <:thread:1455132093226160322> Message sent to ticket.",
						),
					)
					.toJSON();

				return interaction.reply({
					components: [container],
					flags: [InteractionReplyFlags.IsComponentsV2],
				});
			} else {
				if (!channel || channel.type !== 12 || !channel.name) {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> This command can only be used in ticket threads.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}

				const threadData = await db.get(`thread:${channel.id}`);
				if (!threadData || !threadData.ticketId) {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> This is not a valid ticket thread.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}

				const ticketData = await db.get(
					`ticket:${threadData.ticketId}`,
				);
				if (!ticketData || ticketData.status !== "open") {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> This ticket is not active or doesn't exist.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}

				try {
					const dmResponse = await fetch(
						`https://discord.com/api/v10/users/@me/channels`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								recipient_id: ticketData.userId,
							}),
						},
					);

					if (!dmResponse.ok) {
						throw new Error(
							`Failed to create DM: ${dmResponse.status}`,
						);
					}

					const dmChannel = await dmResponse.json();
					const messageResponse = await fetch(
						`https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								components: [
									{
										type: 10,
										content: content,
									},
									{
										type: 17,
										accent_color: null,
										spoiler: false,
										components: [
											{
												type: 10,
												content:
													"-# Replied by staff <:seal:1455132090906710057>",
											},
										],
									},
								],
								flags: 32768,
							}),
						},
					);

					if (!messageResponse.ok) {
						throw new Error(
							`Failed to send message: ${messageResponse.status}`,
						);
					}

					return interaction.reply({
						components: [
							new ContainerBuilder()
								.addComponent(
									new TextDisplayBuilder().setContent(
										`>>> ${content}`,
									),
								)
								.addComponent(
									new TextDisplayBuilder().setContent(
										`-# <:thread:1455132093226160322> Response sent to user via DM.`,
									),
								)
								.toJSON(),
						],
						flags: [InteractionReplyFlags.IsComponentsV2],
					});
				} catch (dmError) {
					console.error("DM Error:", dmError);
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> Could not send DM to user. They may have DMs disabled.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}
			}
		} catch (error) {
			console.error("Error in /send command:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> An error occurred while sending the message.",
			});
		}
	},
};

export default sendCommand;
