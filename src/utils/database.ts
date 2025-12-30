import { MiniDatabase } from "@minesa-org/mini-interaction";

// Configure database with minimal logging
const rawDb = MiniDatabase.fromEnv();

// Wrapper to suppress database logging
export const db = new Proxy(rawDb, {
	get(target, prop) {
		const originalMethod = target[prop as keyof typeof target];
		if (typeof originalMethod === 'function') {
			return (...args: any[]) => {
				// Temporarily suppress console methods during database operations
				const originalLog = console.log;
				const originalInfo = console.info;
				console.log = () => {}; // Suppress logs
				console.info = () => {}; // Suppress info logs

				try {
					const result = originalMethod.apply(target, args);
					// Handle both sync and async results
					if (result && typeof result.then === 'function') {
						return result.finally(() => {
							// Restore console methods
							console.log = originalLog;
							console.info = originalInfo;
						});
					} else {
						// Restore console methods for sync operations
						console.log = originalLog;
						console.info = originalInfo;
						return result;
					}
				} catch (error) {
					// Restore console methods on error
					console.log = originalLog;
					console.info = originalInfo;
					throw error;
				}
			};
		}
		return originalMethod;
	}
});

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
