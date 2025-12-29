import {
	CommandBuilder,
	CommandContext,
	type CommandInteraction,
	LabelBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	type MiniInteractionCommand,
} from "@minesa-org/mini-interaction";

const modal: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("modal")
		.setDescription("Show modal")
		.setContexts([CommandContext.Guild])
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const modal = new ModalBuilder()
			.setCustomId("modal:mdl")
			.setTitle("Modal Example")
			.addComponents(
				new LabelBuilder()
					.setLabel("First Label")
					.setDescription("First label description")
					.setComponent(
						new TextInputBuilder()
							.setCustomId("modal:mdl:first")
							.setStyle(TextInputStyle.Short),
					),
			);

		return interaction.showModal(modal);
	},
};

export default modal;
