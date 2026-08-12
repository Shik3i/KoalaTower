import { safeApiJson } from './apiClient';
import type { ChallengeId } from '$lib/game/engine/gameTypes';

export type VerifiedChallengeTicket = {
	verifiedRulesetVersion: string;
	runId: string;
	challengeId: ChallengeId;
	name: string;
	description: string;
	tier: 1;
	seed: number;
	durationSeconds: number;
	rulesetHash: string;
	startedAt: string;
	expiresAt: string;
};

export type VerifiedLeaderboardEntry = {
	id: string;
	challengeId: ChallengeId;
	displayName: string;
	wave: number;
	score: number;
	gameVersion: string;
	createdAt: string;
};

export type VerifiedLeaderboardResult = {
	leaderboardType: 'verified';
	entries: VerifiedLeaderboardEntry[];
};

export type VerifiedClientResult<T> =
	| { ok: true; data: T }
	| { ok: false; offline: boolean; status?: number; message: string };

export async function startVerifiedChallenge(challengeId: ChallengeId): Promise<VerifiedClientResult<VerifiedChallengeTicket>> {
	const result = await safeApiJson<VerifiedChallengeTicket>(
		'/api/leaderboard/verified/start',
		{ method: 'POST', body: JSON.stringify({ challengeId }) },
		{ timeoutMs: 8000 }
	);
	if (result.ok) return { ok: true, data: result.data };
	return { ok: false, offline: result.offline, status: result.offline ? undefined : result.status, message: result.offline ? 'Verified ranking unavailable offline.' : result.message };
}

export async function submitVerifiedChallenge(input: {
	runId: string;
	challengeId: ChallengeId;
	wave: number;
	kills: number;
	bosses: number;
	gameVersion: string;
}): Promise<VerifiedClientResult<{ leaderboardType: 'verified'; id: string; challengeId: ChallengeId; score: number; rank: number }>> {
	const result = await safeApiJson<{ leaderboardType: 'verified'; id: string; challengeId: ChallengeId; score: number; rank: number }>(
		'/api/leaderboard/verified',
		{ method: 'POST', body: JSON.stringify(input) },
		{ timeoutMs: 20_000 }
	);
	if (result.ok) return { ok: true, data: result.data };
	return { ok: false, offline: result.offline, status: result.offline ? undefined : result.status, message: result.offline ? 'Verified submission unavailable offline.' : result.message };
}

export async function fetchVerifiedLeaderboard(challengeId?: ChallengeId): Promise<VerifiedClientResult<VerifiedLeaderboardResult>> {
	const query = challengeId ? `?challengeId=${encodeURIComponent(challengeId)}` : '';
	const result = await safeApiJson<VerifiedLeaderboardResult>(`/api/leaderboard/verified${query}`, {}, { timeoutMs: 5000 });
	if (result.ok) return { ok: true, data: result.data };
	return { ok: false, offline: result.offline, status: result.offline ? undefined : result.status, message: result.offline ? 'Verified leaderboard unavailable offline.' : result.message };
}
