import { MiniDatabase } from "@minesa-org/mini-interaction";

export const db = MiniDatabase.fromEnv();

export async function getUserData(userId: string) {
	try {
		return await db.get(userId);
	} catch (error) {
		console.error("❌ Error getting user data:", error);
		console.error("Database config:", {
			type: process.env.DATABASE_TYPE || "json",
			path: process.env.DATABASE_PATH || "./data",
		});
		throw error;
	}
}

export async function setUserAssistantStatus(
	userId: string,
	isAssistant: boolean,
) {
	try {
		return await db.set(userId, {
			userId,
			is_assistant: isAssistant,
			lastUpdated: Date.now(),
		});
	} catch (error) {
		console.error("❌ Error setting user assistant status:", error);
		console.error("Database config:", {
			type: process.env.DATABASE_TYPE || "json",
			path: process.env.DATABASE_PATH || "./data",
		});
		throw error;
	}
}

export async function updateDiscordMetadata(
	userId: string,
	accessToken: string,
) {
	const userData = await getUserData(userId);
	const isAssistant = userData?.is_assistant || false;

	const metadata = {
		platform_name: "Mini-Interaction",
		metadata: {
			is_assistant: isAssistant ? 1 : 0,
		},
	};

	const response = await fetch(
		`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_APPLICATION_ID}/role-connection`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(metadata),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update Discord metadata: ${error}`);
	}

	return await response.json();
}
