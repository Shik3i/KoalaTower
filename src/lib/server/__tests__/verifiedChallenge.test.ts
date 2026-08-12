import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { closeDatabase } from '../db';
import { clearRateLimits } from '../rateLimit';
import { getVerifiedChallenge } from '$lib/game/balance/verifiedChallenges';
import { simulateVerifiedChallenge, validateVerifiedReplay } from '../verifiedChallenge';
import { POST as register } from '../../../routes/api/auth/register/+server';
import { POST as start } from '../../../routes/api/leaderboard/verified/start/+server';
import { GET as leaderboard, POST as submit } from '../../../routes/api/leaderboard/verified/+server';

function makeEvent(path: string, body: unknown, cookieStore = new Map<string, string>()) {
	return {
		request: new Request(`http://localhost${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
			body: JSON.stringify(body),
		}),
		getClientAddress: () => '127.0.0.1',
		cookies: {
			get: (name: string) => cookieStore.get(name),
			set: (name: string, value: string) => cookieStore.set(name, value),
			delete: (name: string) => cookieStore.delete(name),
		},
		url: new URL(`http://localhost${path}`),
	} as never;
}

describe('verified challenge contract', () => {
	beforeEach(() => {
		clearRateLimits();
		closeDatabase();
		process.env.AUTH_PASSWORD_PEPPER = 'test-pepper';
		process.env.SESSION_SECRET = 'test-session-secret';
		process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'flatland-verified-')), 'flatland.db');
	});

	afterEach(() => {
		closeDatabase();
		delete process.env.DATABASE_PATH;
		delete process.env.AUTH_PASSWORD_PEPPER;
		delete process.env.SESSION_SECRET;
	});

	it('replays every official challenge deterministically', () => {
		for (const challengeId of ['fastSwarm', 'glassTower', 'bossRush']) {
			const challenge = getVerifiedChallenge(challengeId)!;
			const first = simulateVerifiedChallenge(challenge);
			const second = simulateVerifiedChallenge(challenge);
			expect(first).toEqual(second);
			expect(first.gameOver || first.elapsedTime >= challenge.durationSeconds).toBe(true);
			expect(validateVerifiedReplay(challengeId, first)).toMatchObject({ ok: true });
		}
	});

	it('issues one account-bound ticket and accepts the exact server replay once', async () => {
		const cookieStore = new Map<string, string>();
		const registration = await register(makeEvent('/api/auth/register', {
			username: 'RankedPilot', password: 'correct horse battery', displayName: 'Ranked Pilot'
		}, cookieStore));
		expect(registration.status).toBe(201);

		const issued = await start(makeEvent('/api/leaderboard/verified/start', { challengeId: 'glassTower' }, cookieStore));
		expect(issued.status).toBe(200);
		const ticket = await issued.json() as { runId: string; challengeId: string };
		const replay = simulateVerifiedChallenge(getVerifiedChallenge(ticket.challengeId)!);

		const accepted = await submit(makeEvent('/api/leaderboard/verified', {
			runId: ticket.runId,
			challengeId: ticket.challengeId,
			wave: replay.wave,
			kills: replay.kills,
			bosses: replay.bosses,
			gameVersion: 'test',
		}, cookieStore));
		expect(accepted.status).toBe(201);
		expect(await accepted.json()).toMatchObject({ leaderboardType: 'verified', score: replay.score });

		const duplicate = await submit(makeEvent('/api/leaderboard/verified', {
			runId: ticket.runId, challengeId: ticket.challengeId, wave: replay.wave, kills: replay.kills, bosses: replay.bosses,
		}, cookieStore));
		expect(duplicate.status).toBe(404);

		const board = leaderboard({ url: new URL('http://localhost/api/leaderboard/verified') } as never);
		expect(await board.json()).toMatchObject({ leaderboardType: 'verified', entries: [{ displayName: 'Ranked Pilot', score: replay.score }] });
	});

	it('rejects forged replay counters before writing a ranking row', () => {
		const challenge = getVerifiedChallenge('fastSwarm')!;
		const replay = simulateVerifiedChallenge(challenge);
		const result = validateVerifiedReplay(challenge.id, { ...replay, kills: replay.kills + 1 });
		expect(result).toEqual({ ok: false, message: 'Replay result does not match the server simulation' });
	});
});
