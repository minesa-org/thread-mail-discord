import {
	CommandBuilder,
	CommandContext,
	IntegrationType,
	InteractionReplyFlags,
	MiniPermFlags,
	type CommandInteraction,
	type MiniInteractionCommand,
} from "@minesa-org/mini-interaction";
import { db } from "../utils/database.ts";

const closeCommand: MiniInteractionCommand = {
	data: new CommandBuilder()
		.setName("close")
		.setDescription("Close and archive the current ticket thread")
		.setContexts([CommandContext.Guild, CommandContext.Bot])
		.setIntegrationTypes([
			IntegrationType.GuildInstall,
			IntegrationType.UserInstall,
		])
		.setDefaultMemberPermissions(MiniPermFlags.ManageThreads)
		.toJSON(),

	handler: async (interaction: CommandInteraction) => {
		const user = interaction.user ?? interaction.member?.user;
		const channel = interaction.channel;
		const isDM = !interaction.guild;

		if (!user) {
			return interaction.reply({
				content: "<:Oops:1455132060044759092> Could not resolve user.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}

		// Check for close cooldown (30 minutes)
		const cooldownKey = `cooldown:close:${user.id}`;
		try {
			const cooldownData = await db.get(cooldownKey);
			const now = Date.now();
			const cooldownDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

			if (cooldownData && (cooldownData as any).expiresAt > now) {
				const remainingTime = Math.ceil(
					((cooldownData as any).expiresAt - now) / 1000,
				);
				const timestamp = Math.floor(
					(cooldownData as any).expiresAt / 1000,
				);

				return interaction.reply({
					content: `<:Oops:1455132060044759092> **You're on cooldown!**\n\nYou closed a ticket too quickly. Please wait before closing another ticket.\n\n-# <:timeout:1455604328835449109> **Time remaining:** <t:${timestamp}:R>`,
					flags: [InteractionReplyFlags.Ephemeral],
				});
			}
		} catch (cooldownError) {
			console.error("Error checking cooldown:", cooldownError);
			// Continue with close operation if cooldown check fails
		}

		if (isDM) {
			try {
				const userTicketData = await db.get(`user:${user.id}`);
				if (!userTicketData || !userTicketData.activeTicketId) {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> You don't have an active ticket to close.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}

				const ticketData = await db.get(
					`ticket:${userTicketData.activeTicketId}`,
				);
				if (!ticketData) {
					return interaction.reply({
						content:
							"<:Oops:1455132060044759092> Ticket data not found.",
						flags: [InteractionReplyFlags.Ephemeral],
					});
				}

				await interaction.deferReply({
					flags: [InteractionReplyFlags.Ephemeral],
				});

				// Warn user about cooldown policy via DM
				try {
					const dmResponse = await fetch(
						`https://discord.com/api/v10/users/@me/channels`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								recipient_id: ticketData.userId,
							}),
						},
					);

					if (dmResponse.ok) {
						const dmChannel = await dmResponse.json();
						await fetch(
							`https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
							{
								method: "POST",
								headers: {
									Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									content: `-# **Warning:** Closing tickets too quickly will put you on a <:timeout:1455604328835449109> 30-minute cooldown before you can close another ticket.`,
								}),
							},
						);
					}
				} catch (warnError) {
					console.error(
						"Error sending cooldown warning DM:",
						warnError,
					);
				}
				try {
					await fetch(
						`https://discord.com/api/v10/channels/${ticketData.threadId}/messages`,
						{
							method: "POST",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								content: `## <:thread_archive_server:1455132087496741000> Ticket Closed\n\n**User:** ${ticketData.username}\n\n-# This ticket has been closed by the user.`,
							}),
						},
					);
				} catch (messageError) {
					console.error(
						"Error sending archive message to thread:",
						messageError,
					);
				}
				try {
					const archiveResponse = await fetch(
						`https://discord.com/api/v10/channels/${ticketData.threadId}`,
						{
							method: "PATCH",
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								locked: true,
								archived: true,
							}),
						},
					);

					if (!archiveResponse.ok) {
						console.error(
							`Failed to archive thread ${ticketData.threadId}: ${archiveResponse.status}`,
						);
					}
				} catch (archiveError) {
					console.error("Error archiving thread:", archiveError);
				}
				const updatedUserData = {
					...userTicketData,
					activeTicketId: null,
				};
				delete (updatedUserData as any).createdAt;
				delete (updatedUserData as any).updatedAt;
				await db.set(`user:${user.id}`, updatedUserData);

				// Set cooldown after successful ticket closure
				try {
					const cooldownDuration = 30 * 60 * 1000; // 30 minutes
					await db.set(`cooldown:close:${user.id}`, {
						userId: user.id,
						expiresAt: Date.now() + cooldownDuration,
						reason: "ticket_close_cooldown",
					});
				} catch (cooldownError) {
					console.error("Error setting cooldown:", cooldownError);
					// Don't fail the close operation if cooldown setting fails
				}

				try {
					await db.delete(`ticket:${userTicketData.activeTicketId}`);
					await db.delete(`thread:${ticketData.threadId}`);
				} catch (deleteError) {
					console.error("Error deleting ticket data:", deleteError);
				}

				return interaction.followUp({
					content: `## <:thread_archive_server:1455132087496741000> **Your ticket has been closed!**\n\nIf you need further assistance, you can create a new ticket anytime using </create:1453302198086664249> command.`,
				});
			} catch (error) {
				console.error("Error closing ticket in DM:", error);
				return interaction.reply({
					content:
						"<:Oops:1455132060044759092> Failed to close the ticket. Please try again.",
					flags: [InteractionReplyFlags.Ephemeral],
				});
			}
		}
		if (!channel || channel.type !== 12 || !channel.name) {
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> This command can only be used in ticket threads.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}

		try {
			const threadData = await db.get(`thread:${channel.id}`);
			if (!threadData || !threadData.ticketId) {
				return interaction.reply({
					content:
						"<:Oops:1455132060044759092> This is not a valid ticket thread.",
					flags: [InteractionReplyFlags.Ephemeral],
				});
			}

			const ticketData = await db.get(`ticket:${threadData.ticketId}`);
			if (!ticketData) {
				return interaction.reply({
					content:
						"<:Oops:1455132060044759092> Ticket data not found.",
					flags: [InteractionReplyFlags.Ephemeral],
				});
			}

			await interaction.deferReply({
				flags: [InteractionReplyFlags.Ephemeral],
			});
			try {
				await fetch(
					`https://discord.com/api/v10/channels/${channel.id}/messages`,
					{
						method: "POST",
						headers: {
							Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							content: `## <:thread_archive_server:1455132087496741000> Ticket Archived\n\n**User:** ${ticketData.username}\n**Status:** Closed by staff\n\n-# This ticket has been archived by staff.`,
						}),
					},
				);
			} catch (messageError) {
				console.error(
					"Error sending archive message to thread:",
					messageError,
				);
			}

			interaction.followUp({
				content: `<:thread_archive_server:1455132087496741000> **Archived the ticket.**`,
			});

			const response = await fetch(
				`https://discord.com/api/v10/channels/${channel.id}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						locked: true,
						archived: true,
					}),
				},
			);

			if (!response.ok) {
				if (response.status === 403) {
					throw new Error(
						"403: Bot lacks permission to manage threads. Required permission: Manage Threads",
					);
				}
				throw new Error(`Failed to archive thread: ${response.status}`);
			}

			const userData = await db.get(String(ticketData.userId));
			if (userData) {
				const updatedUserData = { ...userData, activeTicketId: null };
				delete (updatedUserData as any).createdAt;
				delete (updatedUserData as any).updatedAt;
				await db.set(String(ticketData.userId), updatedUserData);
			}

			if (!response.ok) {
				throw new Error(`Failed to close thread: ${response.status}`);
			}

			const dmResponse = await fetch(
				`https://discord.com/api/v10/users/@me/channels`,
				{
					method: "POST",
					headers: {
						Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						recipient_id: ticketData.userId,
					}),
				},
			);

			if (dmResponse.ok) {
				const dmChannel = await dmResponse.json();

				await fetch(
					`https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
					{
						method: "POST",
						headers: {
							Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							components: [
								{
									type: 17,
									accent_color: null,
									spoiler: false,
									components: [
										{
											type: 10,
											content: `## Your ticket has been closed!\nStaff have resolved your issue. If you need further assistance, you can create a new ticket anytime using </create:1453302198086664249> command in the DM after [User Installing](https://discord.com/oauth2/authorize?client_id=${
												process.env
													.DISCORD_APPLICATION_ID
											}&response_type=code&redirect_uri=${encodeURIComponent(
												process.env
													.DISCORD_REDIRECT_URI!,
											)}&scope=applications.commands+identify+guilds+role_connections.write&integration_type=1) the app.`,
										},
										{
											type: 10,
											content: `-# Ticket closed by staff <:thread_archive_server:1455132087496741000>`,
										},
									],
								},
							],
							flags: 32768,
						}),
					},
				);
			}

			await db.delete(`ticket:${threadData.ticketId}`);
			await db.delete(`thread:${channel.id}`);
		} catch (error) {
			console.error("Error closing ticket:", error);
			return interaction.reply({
				content:
					"<:Oops:1455132060044759092> Failed to close the ticket. Please try again.",
				flags: [InteractionReplyFlags.Ephemeral],
			});
		}
	},
};

export default closeCommand;
