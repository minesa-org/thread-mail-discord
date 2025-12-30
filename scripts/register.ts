import "dotenv/config";
import {
	MiniInteraction,
	RoleConnectionMetadataTypes,
} from "@minesa-org/mini-interaction";
import { mini } from "../api/interactions.js";

try {
	await mini.registerCommands(process.env.DISCORD_BOT_TOKEN!);
	await mini.registerMetadata(process.env.DISCORD_BOT_TOKEN!, [
		{
			key: "threads_created",
			name: "Threads Created",
			description: "The amount of threadmail user has created",
			type: RoleConnectionMetadataTypes.IntegerGreaterThanOrEqual,
		},
	]);
	console.log("Registration complete!");
} catch (error: any) {
	if (
		error.message?.includes("rate limited") ||
		error.message?.includes("429")
	) {
		console.log(
			"Rate limited during registration, skipping (commands likely already registered)",
		);
	} else {
		throw error;
	}
}
