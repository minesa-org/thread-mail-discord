import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandBuilder,
	CommandContext,
	IntegrationType,
	type MiniComponentMessageActionRow,
	type CommandInteraction,
	type MiniInteractionCommand,
} from "@minesa-org/mini-interaction";

const button: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("button")
		.setDescription("This will show button")
		.setContexts([CommandContext.Guild])
		.setIntegrationTypes([IntegrationType.GuildInstall])
		.addStringOption((option) =>
			option
				.setName("text")
				.setDescription("Write some text")
				.setRequired(false),
		)
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const { options } = interaction;

		const text = options.getString("text");

		const response = text ? `Tap to button: ${text}` : "Tap to button";

		const button_1 = new ButtonBuilder()
			.setCustomId("button:btn:primary")
			.setLabel("Tap me!")
			.setStyle(ButtonStyle.Primary);

		const button_2 = new ButtonBuilder()
			.setLabel("Google")
			.setStyle(ButtonStyle.Link)
			.setURL("https://www.google.com");

		const row = new ActionRowBuilder<MiniComponentMessageActionRow>()
			.addComponents(button_1, button_2)
			.toJSON();

		return interaction.reply({
			content: response,
			components: [row],
		});
	},
};

export default button;
