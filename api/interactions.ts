import {
	MiniInteraction,
	RoleConnectionMetadataTypes,
} from "@minesa-org/mini-interaction";

export const mini = new MiniInteraction({
	applicationId: process.env.DISCORD_APPLICATION_ID!,
	publicKey: process.env.DISCORD_APP_PUBLIC_KEY!,
});

export default mini.createNodeHandler();
