import {
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

const staffRoleCommands: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("staff")
		.setDescription("Staff role management")
		.setContexts([CommandContext.Guild])
		.setIntegrationTypes([IntegrationType.GuildInstall])
		.setDefaultMemberPermissions(MiniPermFlags.ManageGuild)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("set")
				.setDescription(
					"Set staff role to mention when thread created.",
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
				.setDescription("Remove current staff role."),
		)
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const guild = interaction.guild;
		const subcommand = interaction.options.getSubcommand();

		try {
			const guildData = await db.get(`guild:${guild!.id}`);

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

				if (guildData && guildData.pingRoleId) {
					const container = new ContainerBuilder()
						.addComponent(
							new TextDisplayBuilder().setContent(
								"## <:seal:1455132090906710057> Current Staff Role",
							),
						)
						.addComponent(
							new TextDisplayBuilder().setContent(
								`Current ping role: <@&${
									guildData.pingRoleId
								}>\n\n**Ticket Channel:** ${
									guildData.ticketChannelId
										? `<#${guildData.ticketChannelId}>`
										: `System Channel (${systemChannelInfo})`
								}\n\n-# Use \`/staff set\` to change role, \`/channel set\` to change channel.`,
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
								`No custom ping role is set for this server. New threads will ping @here.\n\n**Ticket Channel:** ${
									guildData?.ticketChannelId
										? `<#${guildData.ticketChannelId}>`
										: `System Channel (${systemChannelInfo})`
								}\n\n-# Use \`/staff set\` to set a role, \`/channel set\` to set a custom channel.`,
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
		} catch (error) {
			console.error("Error managing staff role:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> Failed to manage staff role. Please try again.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}
	},
};

export default staffRoleCommands;
