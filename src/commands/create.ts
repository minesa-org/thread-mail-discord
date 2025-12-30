import {
	ActionRowBuilder,
	CommandBuilder,
	CommandContext,
	IntegrationType,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ButtonBuilder,
	ButtonStyle,
	type MiniComponentMessageActionRow,
	type CommandInteraction,
	type MiniInteractionCommand,
	InteractionReplyFlags,
	ContainerBuilder,
	TextDisplayBuilder,
} from "@minesa-org/mini-interaction";
import { db } from "../utils/database.ts";
import { fetchDiscord } from "../utils/discord.ts";

const createCommand: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("create")
		.setDescription("Create a ticket thread in a mutual server")
		.setContexts([CommandContext.Bot])
		.setIntegrationTypes([
			IntegrationType.UserInstall,
			IntegrationType.GuildInstall,
		])
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const user = interaction.user ?? interaction.member?.user;

		if (!user) {
			return interaction.reply({
				content: "<:Oops:1455132060044759092> Could not resolve user.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}

		let userTicketData;
		try {
			userTicketData = await db.get(`user:${user.id}`);
		} catch (dbError) {
			console.error("Database error getting user ticket data:", dbError);
			userTicketData = null; // Skip ticket check if database fails
		}

		if (userTicketData && userTicketData.activeTicketId) {
			let existingTicket;
			try {
				existingTicket = await db.get(
					`ticket:${userTicketData.activeTicketId}`,
				);
			} catch (dbError) {
				console.error("Database error getting ticket data:", dbError);
				existingTicket = null; // Skip ticket check if database fails
			}

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
									"Please use </send:1453302198086664248> command in DMs to communicate with staff.",
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

		let userData;
		try {
			userData = await db.get(user.id);
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

			const button = new ActionRowBuilder<MiniComponentMessageActionRow>()
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

		try {
			let userGuilds;
			try {
				userGuilds = await fetchDiscord(
					"/users/@me/guilds",
					userData.accessToken as string,
					false,
					1500,
				);
			} catch (userError) {
				if (
					userError instanceof Error &&
					userError.message.includes("401")
				) {
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
										"## <:sharedwithu:1455132088926863412> Re-authorization Required",
									),
								)
								.addComponent(
									new TextDisplayBuilder().setContent(
										"Your authorization has expired. Click the button below to re-authorize.",
									),
								)
								.addComponent(button)
								.toJSON(),
						],
						flags: [InteractionReplyFlags.IsComponentsV2],
					});
				}
				throw userError;
			}
			const botGuilds = await fetchDiscord(
				"/users/@me/guilds",
				process.env.DISCORD_BOT_TOKEN!,
				true,
				1500,
			);

			const mutualGuilds = userGuilds.filter((ug: any) =>
				botGuilds.some((bg: any) => bg.id === ug.id),
			);

			if (mutualGuilds.length === 0) {
				return interaction.reply({
					content:
						"<:Oops:1455132060044759092> No mutual servers found. Make sure the bot is invited to the servers you are in.",
				});
			}

			const menu = new ActionRowBuilder<MiniComponentMessageActionRow>()
				.addComponents(
					new StringSelectMenuBuilder()
						.setCustomId("create:select_server")
						.setPlaceholder("Select a server to create a thread")
						.addOptions(
							...mutualGuilds
								.slice(0, 25)
								.map((guild: any) =>
									new StringSelectMenuOptionBuilder()
										.setLabel(guild.name)
										.setValue(guild.id),
								),
						),
				)
				.toJSON();

			return interaction.reply({
				components: [
					new ContainerBuilder()
						.addComponent(
							new TextDisplayBuilder().setContent(
								"## <:thread_create:1455132063077371952> Creating a ticketmail",
							),
						)
						.addComponent(
							new TextDisplayBuilder().setContent(
								"Please select a server where you want to create a ticketmail from the dropdown below.",
							),
						)
						.addComponent(menu)
						.toJSON(),
				],
				flags: [InteractionReplyFlags.IsComponentsV2],
			});
		} catch (error) {
			console.error("Error in /create command:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> An error occurred while fetching your servers. Please try again later.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}
	},
};

export default createCommand;
