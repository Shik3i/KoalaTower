import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { getSessionAccount } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { getVerifiedChallenge } from '$lib/game/balance/verifiedChallenges';
import { validateVerifiedReplay } from '$lib/server/verifiedChallenge';
import { isRateLimited } from '$lib/server/rateLimit';
import { validatePositiveInt } from '$lib/server/validation';
import { APP_VERSION } from '$lib/version';

export const prerender = false;

export function GET(event: RequestEvent): Response {
	const challengeId = event.url.searchParams.get('challengeId');
	if (challengeId && !getVerifiedChallenge(challengeId)) return fail(400, 'bad_request', 'Unknown verified challenge');
	const rows = openDatabase().prepare(`
SELECT id, challenge_id AS challengeId, display_name AS displayName, wave, score,
       game_version AS gameVersion, created_at AS createdAt
FROM leaderboard_runs
WHERE leaderboard_type = 'verified' AND verified = 1
  AND (? IS NULL OR challenge_id = ?)
ORDER BY score DESC, wave DESC, created_at ASC
LIMIT 50
`).all(challengeId, challengeId) as Record<string, unknown>[];
	return ok({ leaderboardType: 'verified', entries: rows });
}

export async function POST(event: RequestEvent): Promise<Response> {
	const account = getSessionAccount(event.cookies);
	if (!account) return fail(401, 'unauthorized', 'Login required for verified challenges');
	if (isRateLimited(`verified-submit:${account.id}`, 12, 10 * 60_000)) return fail(429, 'rate_limited', 'Please wait before submitting another verified challenge');

	const body = await readJsonObject(event, 4 * 1024);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	const runId = body.runId;
	const challengeId = body.challengeId;
	if (typeof runId !== 'string' || !/^[0-9a-f-]{36}$/i.test(runId)) return fail(400, 'bad_request', 'Run id is invalid');
	if (typeof challengeId !== 'string') return fail(400, 'bad_request', 'Challenge id is required');
	const wave = validatePositiveInt(body.wave, 'Wave', 1, 100_000);
	const kills = validatePositiveInt(body.kills, 'Kills', 0, 10_000_000);
	const bosses = validatePositiveInt(body.bosses, 'Bosses', 0, 100_000);
	if (!wave.ok) return fail(400, 'bad_request', wave.message);
	if (!kills.ok) return fail(400, 'bad_request', kills.message);
	if (!bosses.ok) return fail(400, 'bad_request', bosses.message);

	const db = openDatabase();
	const ticket = db.prepare(`
SELECT id, challenge_id AS challengeId, seed, ruleset_hash AS rulesetHash, expires_at AS expiresAt
FROM verified_challenge_runs
WHERE id = ? AND account_id = ? AND status = 'issued'
`).get(runId, account.id) as { id: string; challengeId: string; seed: number; rulesetHash: string; expiresAt: string } | undefined;
	if (!ticket) return fail(404, 'not_found', 'Verified run ticket not found or already used');
	if (ticket.challengeId !== challengeId) return fail(409, 'conflict', 'Verified challenge does not match the run ticket');
	if (Date.parse(ticket.expiresAt) <= Date.now()) {
		db.prepare("UPDATE verified_challenge_runs SET status = 'expired' WHERE id = ?").run(runId);
		return fail(409, 'conflict', 'Verified run ticket expired');
	}

	const validation = validateVerifiedReplay(ticket.challengeId, { wave: wave.value, kills: kills.value, bosses: bosses.value });
	if (!validation.ok) {
		db.prepare("UPDATE verified_challenge_runs SET status = 'rejected', submitted_at = ? WHERE id = ?").run(new Date().toISOString(), runId);
		return fail(422, 'conflict', validation.message);
	}
	if (validation.challenge.seed !== ticket.seed || validation.challenge.id !== ticket.challengeId) {
		return fail(409, 'conflict', 'Verified run ruleset mismatch');
	}

	const now = new Date().toISOString();
	const leaderboardId = randomUUID();
	const displayName = account.display_name;
	const result = validation.result;
	const insert = db.transaction(() => {
		db.prepare(`
INSERT INTO leaderboard_runs (
	 id, leaderboard_type, account_id, local_player_id, display_name, front_id, wave, score,
	 run_started_at, run_ended_at, game_version, balance_hash, run_hash, verified,
	 created_at, challenge_id, verified_run_id
) VALUES (?, 'verified', ?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 1, ?, ?, ?)
`).run(
			leaderboardId,
			account.id,
			displayName,
			validation.challenge.tier,
			result.wave,
			result.score,
			now,
			typeof body.gameVersion === 'string' && body.gameVersion.trim() ? body.gameVersion.slice(0, 32) : APP_VERSION,
			ticket.rulesetHash,
			result.verificationHash,
			now,
			validation.challenge.id,
			runId
		);
		db.prepare("UPDATE verified_challenge_runs SET status = 'accepted', submitted_at = ? WHERE id = ?").run(now, runId);
	});
	insert();

	const rank = (db.prepare(`
SELECT COUNT(*) AS rank FROM leaderboard_runs
WHERE leaderboard_type = 'verified' AND verified = 1 AND challenge_id = ?
  AND (score > ? OR (score = ? AND (wave > ? OR (wave = ? AND created_at < ?))))
`).get(validation.challenge.id, result.score, result.score, result.wave, result.wave, now) as { rank: number }).rank + 1;
	return ok({ leaderboardType: 'verified', id: leaderboardId, challengeId: validation.challenge.id, score: result.score, rank }, { status: 201 });
}
