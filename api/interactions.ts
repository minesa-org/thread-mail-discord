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
		key: "threads_created",
		name: "Threads created",
		description: "The amount of threadmail user has created",
		type: RoleConnectionMetadataTypes.IntegerGreaterThanOrEqual,
	},
]);

export default mini.createNodeHandler();
