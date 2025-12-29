import {
	MiniInteraction,
	RoleConnectionMetadataTypes,
} from "@minesa-org/mini-interaction";

export const mini = new MiniInteraction({
	applicationId: process.env.DISCORD_APPLICATION_ID!,
	publicKey: process.env.DISCORD_APP_PUBLIC_KEY!,
});

await mini.registerMetadata(process.env.DISCORD_BOT_TOKEN!, [
	{
		key: "is_assistant",
		name: "Is Assistant?",
		description: "Is the user an assistant?",
		type: RoleConnectionMetadataTypes.BooleanEqual,
	},
]);

export default mini.createNodeHandler();
