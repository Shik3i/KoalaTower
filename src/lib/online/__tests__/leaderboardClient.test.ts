import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchUnverifiedLeaderboard, submitUnverifiedLeaderboard } from '../leaderboardClient';

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function makeFetch(responder: () => Response | Promise<Response>): typeof fetch {
	return (((_input: RequestInfo | URL, _init?: RequestInit) => responder()) as unknown) as typeof fetch;
}

describe('leaderboard client', () => {
	afterEach(() => { vi.restoreAllMocks(); });

	it('reads unverified entries', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, {
			ok: true,
			leaderboardType: 'unverified',
			entries: [{ id: 'run-1', displayName: 'Commander', frontId: 1, wave: 10, score: 10_000, gameVersion: 'test', createdAt: '2026-01-01T00:00:00.000Z' }]
		}));
		try {
			const result = await fetchUnverifiedLeaderboard();
			expect(result.ok).toBe(true);
			if (result.ok) expect(result.data.entries[0]?.displayName).toBe('Commander');
		} finally {
			globalThis.fetch = original;
		}
	});

	it('submits a community run and reports offline failures', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(201, { ok: true, id: 'run-1', leaderboardType: 'unverified' }));
		try {
			const result = await submitUnverifiedLeaderboard({ localPlayerId: '11111111-1111-4111-8111-111111111111', displayName: 'Commander', frontId: 1, wave: 10, score: 10_000, gameVersion: 'test' });
			expect(result.ok).toBe(true);
		} finally {
			globalThis.fetch = original;
		}

		const offlineFetch = globalThis.fetch;
		globalThis.fetch = makeFetch(() => Promise.reject(new Error('offline')));
		try {
			const result = await submitUnverifiedLeaderboard({ localPlayerId: '11111111-1111-4111-8111-111111111111', displayName: 'Commander', frontId: 1, wave: 10, score: 10_000, gameVersion: 'test' });
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.offline).toBe(true);
		} finally {
			globalThis.fetch = offlineFetch;
		}
	});
});
