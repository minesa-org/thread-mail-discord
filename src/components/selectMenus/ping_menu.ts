import {
	type MiniInteractionComponent,
	type StringSelectInteraction,
} from "@minesa-org/mini-interaction";

const selectmenu_menu: MiniInteractionComponent = {
	customId: "menu:role",

	handler: async (interaction: StringSelectInteraction) => {
		const value = interaction.getStringValues().join(", ");

		return interaction.reply({
			content: `Value(s) of select menu you selected: ${value}`,
		});
	},
};

export default selectmenu_menu;
