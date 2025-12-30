import "dotenv/config";
import { mini } from "../api/interactions.js";

try {
	await mini.registerCommands(process.env.DISCORD_BOT_TOKEN!);
	console.log("Registration complete!");
} catch (error) {
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
