export async function fetchDiscord(
	endpoint: string,
	token: string,
	isBot: boolean = false,
	timeoutMs: number = 5000,
) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
			headers: {
				Authorization: isBot ? `Bot ${token}` : `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Discord API error: ${response.status} ${error}`);
		}

		return await response.json();
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(
				`Discord API request timed out after ${timeoutMs}ms`,
			);
		}
		throw error;
	}
}
