import { MiniDatabase } from "@minesa-org/mini-interaction";
import { mini } from "./interactions.js";
import { updateDiscordMetadata } from "../src/utils/database.js";

// Create database instance with logging suppressed
const rawDatabase = MiniDatabase.fromEnv();

// Wrapper to suppress database logging
const database = new Proxy(rawDatabase, {
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

			await updateDiscordMetadata(user.id, tokens.access_token);
		} catch (error) {
			console.error("OAuth callback error:", error);
			throw error;
		}
	},
});
