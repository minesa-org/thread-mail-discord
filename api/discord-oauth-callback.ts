import { MiniDatabase } from "@minesa-org/mini-interaction";
import { mini } from "./interactions.js";
import { updateDiscordMetadata } from "../src/utils/database.js";

// Create database instance with logging suppressed
const rawDatabase = MiniDatabase.fromEnv();

// Wrapper to suppress database logging
const database = new Proxy(rawDatabase, {
	get(target, prop) {
		const originalMethod = target[prop as keyof typeof target];
		if (typeof originalMethod === "function") {
			const wrappedMethod = async (...args: any[]) => {
				// Temporarily suppress console methods during database operations
				const originalLog = console.log;
				const originalInfo = console.info;
				console.log = () => {}; // Suppress logs
				console.info = () => {}; // Suppress info logs

				try {
					// @ts-expect-error - TypeScript proxy inference issue
					const result = originalMethod.apply(target, args);
					// Handle both sync and async results
					if (result && typeof result.then === "function") {
						try {
							return await result;
						} finally {
							// Restore console methods
							console.log = originalLog;
							console.info = originalInfo;
						}
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
			return wrappedMethod.bind(target);
		}
		return originalMethod;
	},
});
const failedPage = mini.failedOAuthPage("public/pages/failed.html");

export default mini.discordOAuthCallback({
	templates: {
		success: mini.connectedOAuthPage("public/pages/connected.html"),
		missingCode: failedPage,
		oauthError: failedPage,
		invalidState: failedPage,
		serverError: failedPage,
	},
	async onAuthorize({ user, tokens }: { user: any; tokens: any }) {
		try {
			await database.set(user.id, {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt: tokens.expires_at,
				scope: tokens.scope,
			});

			// Initialize Linked Roles metadata
			let currentCount = 0;
			try {
				const metadataResponse = await fetch(
					`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_APPLICATION_ID}/role-connection`,
					{
						headers: {
							Authorization: `Bearer ${tokens.access_token}`,
						},
					},
				);
				if (metadataResponse.ok) {
					const metadata = await metadataResponse.json();
					currentCount = metadata.metadata?.threads_created || 0;
				}
			} catch (fetchError) {
				console.error("Error fetching current metadata:", fetchError);
			}

			await fetch(
				`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_APPLICATION_ID}/role-connection`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${tokens.access_token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						platform_name: "ThreadMail",
						metadata: {
							threads_created: currentCount,
						},
					}),
				},
			);
		} catch (error) {
			console.error("OAuth callback error:", error);
			throw error;
		}
	},
});
