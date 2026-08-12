import { safeApiJson } from './apiClient';

export type UnverifiedLeaderboardEntry = {
	id: string;
	displayName: string;
	frontId: number;
	wave: number;
	score: number;
	gameVersion: string;
	createdAt: string;
};

export type LeaderboardResult<T> =
	| { ok: true; data: T }
	| { ok: false; offline: boolean; message: string };

type LeaderboardResponse = {
	leaderboardType: 'unverified';
	entries: UnverifiedLeaderboardEntry[];
};

export type UnverifiedLeaderboardSubmission = {
	localPlayerId: string;
	displayName: string;
	frontId: number;
	wave: number;
	score: number;
	runStartedAt?: string;
	runEndedAt?: string;
	gameVersion: string;
};

export async function fetchUnverifiedLeaderboard(): Promise<LeaderboardResult<LeaderboardResponse>> {
	const result = await safeApiJson<LeaderboardResponse>('/api/leaderboard/unverified', {}, { timeoutMs: 5000 });
	if (result.ok) return { ok: true, data: result.data };
	return { ok: false, offline: result.offline, message: result.offline ? 'Leaderboard unavailable offline.' : result.message };
}

export async function submitUnverifiedLeaderboard(input: UnverifiedLeaderboardSubmission): Promise<LeaderboardResult<{ id: string; leaderboardType: 'unverified' }>> {
	const result = await safeApiJson<{ id: string; leaderboardType: 'unverified' }>(
		'/api/leaderboard/unverified',
		{ method: 'POST', body: JSON.stringify(input) },
		{ timeoutMs: 8000 }
	);
	if (result.ok) return { ok: true, data: result.data };
	return { ok: false, offline: result.offline, message: result.offline ? 'Leaderboard submission unavailable offline.' : result.message };
}
