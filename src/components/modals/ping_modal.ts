import {
	type ModalSubmitInteraction,
	type MiniInteractionComponent,
} from "@minesa-org/mini-interaction";

const ping_modal: MiniInteractionComponent = {
	customId: "modal:mdl",

	handler: async (interaction: ModalSubmitInteraction) => {
		const firstValue = interaction.getTextInputValue("modal:mdl:first");

		return interaction.reply({
			content: `First value: ${firstValue}`,
		});
	},
};

export default ping_modal;
