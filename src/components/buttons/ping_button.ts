import {
	type ButtonInteraction,
	type MiniInteractionComponent,
} from "@minesa-org/mini-interaction";

const ping_button: MiniInteractionComponent = {
	customId: "button:btn:primary",

	handler: async (interaction: ButtonInteraction) => {
		const response = "Button clicked!";

		return interaction.reply({
			content: response,
		});
	},
};

export default ping_button;
