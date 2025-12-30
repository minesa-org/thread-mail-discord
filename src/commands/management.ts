import {
	ChannelType,
	CommandBuilder,
	CommandContext,
	ContainerBuilder,
	IntegrationType,
	InteractionReplyFlags,
	MiniPermFlags,
	TextDisplayBuilder,
	type CommandInteraction,
	type MiniInteractionCommand,
} from "@minesa-org/mini-interaction";
import { db } from "../utils/database.ts";
import { fetchDiscord } from "../utils/discord.ts";

const managementCommands: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("manage")
		.setDescription("Server management settings")
		.setContexts([CommandContext.Guild])
		.setIntegrationTypes([IntegrationType.GuildInstall])
		.setDefaultMemberPermissions(MiniPermFlags.ManageGuild)
		.addSubcommandGroup((group) =>
			group
				.setName("staff")
				.setDescription("Staff role management")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("set")
						.setDescription(
							"Set staff role to mention when thread created",
						)
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription(
									"Select the role for Threadmail to ping",
								)
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("view")
						.setDescription("View current staff role"),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("clear")
						.setDescription("Remove current staff role"),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName("channel")
				.setDescription("Ticket channel management")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("set")
						.setDescription(
							"Set custom channel for ticket creation",
						)
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"Select the channel for ticket creation",
								)
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("view")
						.setDescription("View current ticket channel"),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("clear")
						.setDescription("Reset to default system channel"),
				),
		)
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const guild = interaction.guild;
		const subcommandGroup = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();

		try {
			const guildData = await db.get(`guild:${guild!.id}`);

			// Staff role management
			if (subcommandGroup === "staff") {
				if (subcommand === "set") {
					const roleId = interaction.options.getRole("role")?.id;

					let updatedGuildData = guildData || {
						guildId: guild!.id,
					};

					updatedGuildData.pingRoleId = roleId;

					const cleanGuildData = { ...updatedGuildData };
					delete cleanGuildData.createdAt;
					delete cleanGuildData.updatedAt;

					await db.set(`guild:${guild!.id}`, cleanGuildData);

					let systemChannelInfo = "Not set";
					try {
						const fullGuild = await fetchDiscord(
							`/guilds/${guild!.id}`,
							process.env.DISCORD_BOT_TOKEN!,
							true,
						);
						if (fullGuild.system_channel_id) {
							systemChannelInfo = `<#${fullGuild.system_channel_id}>`;
						}
					} catch (error) {
						console.error("Error fetching guild info:", error);
					}

					const container = new ContainerBuilder()
						.addComponent(
							new TextDisplayBuilder().setContent(
								"## <:seal:1455132090906710057> Successfully set the role",
							),
						)
						.addComponent(
							new TextDisplayBuilder().setContent(
								`-# <@&${roleId}>\nSet as the role to mention when new ticket threads are created.\n\n**Default Channel:** System Channel (${systemChannelInfo})\n-# Threads are created in the server's system channel by default.`,
							),
						)
						.toJSON();

					return interaction.reply({
						components: [container],
						flags: [InteractionReplyFlags.IsComponentsV2],
					});
				}

				if (subcommand === "view") {
					if (guildData && guildData.pingRoleId) {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:seal:1455132090906710057> Current Staff Role",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									`Current ping role: <@&${guildData.pingRoleId}>\n\n-# Use \`/manage staff set\` to change role.`,
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					} else {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:seal:1455132090906710057> No Staff Role Set",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									`No custom ping role is set for this server. New threads will ping @here.\n\n-# Use \`/manage staff set\` to set a role.`,
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					}
				}

				if (subcommand === "clear") {
					if (guildData && guildData.pingRoleId) {
						const cleanGuildData = {
							guildId: guild!.id,
							guildName: guildData.guildName,
							systemChannelId: guildData.systemChannelId,
							webhookUrl: guildData.webhookUrl,
							status: guildData.status,
							pingRoleId: null, // Explicitly set to null
							ticketChannelId: guildData.ticketChannelId,
						};

						await db.set(`guild:${guild!.id}`, cleanGuildData);

						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:seal:1455132090906710057> Staff Role Cleared",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									"Successfully cleared the ping role. New threads will now ping @here.",
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					} else {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:Oops:1455132060044759092> No Role to Clear",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									"No ping role is currently set for this server.",
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					}
				}
			}

			// Channel management
			if (subcommandGroup === "channel") {
				if (subcommand === "set") {
					const channelId =
						interaction.options.getChannel("channel")?.id;
					const channel = interaction.options.getChannel("channel");

					if (!channel) {
						return interaction.reply({
							content:
								"<:Oops:1455132060044759092> Channel not found.",
							flags: [InteractionReplyFlags.Ephemeral],
						});
					}

					if (channel.type !== 0) {
						return interaction.reply({
							content:
								"<:Oops:1455132060044759092> Only text channels can be used for ticket creation.",
							flags: [InteractionReplyFlags.Ephemeral],
						});
					}

					try {
						// First check if bot can view the channel
						const channelInfo = await fetch(
							`https://discord.com/api/v10/channels/${channelId}`,
							{
								headers: {
									Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								},
							},
						);

						if (!channelInfo.ok) {
							if (channelInfo.status === 403) {
								throw new Error(
									"403: Bot lacks permission to view this channel. Required permission: View Channel",
								);
							}
							throw new Error(
								`Failed to access channel: ${channelInfo.status}`,
							);
						}

						// Then test sending a message
						const messageResponse = await fetch(
							`https://discord.com/api/v10/channels/${channelId}/messages`,
							{
								method: "POST",
								headers: {
									Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									content:
										"**Permission Test:** This message will be deleted automatically.",
								}),
							},
						);

						if (!messageResponse.ok) {
							if (messageResponse.status === 403) {
								throw new Error(
									"403: Bot lacks permission to send messages in this channel. Required permissions: View Channel, Send Messages",
								);
							}
							throw new Error(
								`Failed to send test message: ${messageResponse.status}`,
							);
						}

						const messageData = await messageResponse.json();

						// Test deleting the message
						const deleteResponse = await fetch(
							`https://discord.com/api/v10/channels/${channelId}/messages/${messageData.id}`,
							{
								method: "DELETE",
								headers: {
									Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								},
							},
						);

						if (
							!deleteResponse.ok &&
							deleteResponse.status === 403
						) {
							throw new Error(
								"403: Bot lacks permission to manage messages in this channel. Required permission: Manage Messages",
							);
						}
					} catch (permError: any) {
						return interaction.reply({
							content: `<:Oops:1455132060044759092> **Permission Error:**\n\n${permError.message}\n\nPlease ensure the bot has the required permissions in <#${channelId}>.`,
							flags: [InteractionReplyFlags.Ephemeral],
						});
					}

					let updatedGuildData = guildData || {
						guildId: guild!.id,
					};

					updatedGuildData.ticketChannelId = channelId;

					const cleanGuildData = { ...updatedGuildData };
					delete cleanGuildData.createdAt;
					delete cleanGuildData.updatedAt;

					await db.set(`guild:${guild!.id}`, cleanGuildData);

					const container = new ContainerBuilder()
						.addComponent(
							new TextDisplayBuilder().setContent(
								"## <:thread_create:1455132063077371952> Custom Channel Set",
							),
						)
						.addComponent(
							new TextDisplayBuilder().setContent(
								`-# <#${channelId}>\nSet as the channel for ticket creation.\n\n**Permission Test:** Bot can send messages in this channel.`,
							),
						)
						.toJSON();

					return interaction.reply({
						components: [container],
						flags: [InteractionReplyFlags.IsComponentsV2],
					});
				}

				if (subcommand === "view") {
					const customChannelId = guildData?.ticketChannelId;
					let systemChannelId = null;

					try {
						const fullGuild = await fetchDiscord(
							`/guilds/${guild!.id}`,
							process.env.DISCORD_BOT_TOKEN!,
							true,
						);
						systemChannelId = fullGuild.system_channel_id;
					} catch (error) {
						console.error("Error fetching guild info:", error);
					}

					if (customChannelId) {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:thread_create:1455132063077371952> Current Ticket Channel",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									`Custom channel: <#${customChannelId}>\n\n-# Tickets are created in the custom channel. Use \`/manage channel clear\` to reset to system channel.`,
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					} else {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:thread_create:1455132063077371952> Default Ticket Channel",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									`Using system channel: ${
										systemChannelId
											? `<#${systemChannelId}>`
											: "Not set"
									}\n\n-# No custom channel is set. Use \`/manage channel set\` to set a custom channel.`,
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					}
				}

				if (subcommand === "clear") {
					if (guildData && guildData.ticketChannelId) {
						let systemChannelId = null;

						try {
							const fullGuild = await fetchDiscord(
								`/guilds/${guild!.id}`,
								process.env.DISCORD_BOT_TOKEN!,
								true,
							);
							systemChannelId = fullGuild.system_channel_id;
						} catch (error) {
							console.error("Error fetching guild info:", error);
						}

						const cleanGuildData = {
							guildId: guild!.id,
							guildName: guildData.guildName,
							systemChannelId: guildData.systemChannelId,
							webhookUrl: guildData.webhookUrl,
							status: guildData.status,
							pingRoleId: guildData.pingRoleId,
							ticketChannelId: null,
						};

						await db.set(`guild:${guild!.id}`, cleanGuildData);

						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:thread_create:1455132063077371952> Custom Channel Cleared",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									`Successfully reset to system channel: ${
										systemChannelId
											? `<#${systemChannelId}>`
											: "Not set"
									}\n\n-# Tickets will now be created in the system channel.`,
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					} else {
						const container = new ContainerBuilder()
							.addComponent(
								new TextDisplayBuilder().setContent(
									"## <:Oops:1455132060044759092> No Custom Channel to Clear",
								),
							)
							.addComponent(
								new TextDisplayBuilder().setContent(
									"No custom ticket channel is currently set for this server.",
								),
							)
							.toJSON();

						return interaction.reply({
							components: [container],
							flags: [InteractionReplyFlags.IsComponentsV2],
						});
					}
				}
			}
		} catch (error) {
			console.error("Error managing settings:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> Failed to manage settings. Please try again.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}
	},
};

export default managementCommands;
