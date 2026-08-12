import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { getSessionAccount } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { getVerifiedChallenge, VERIFIED_RULESET_VERSION } from '$lib/game/balance/verifiedChallenges';
import { getVerifiedRulesetHash } from '$lib/server/verifiedChallenge';
import { isRateLimited } from '$lib/server/rateLimit';

export const prerender = false;

export async function POST(event: RequestEvent): Promise<Response> {
	const account = getSessionAccount(event.cookies);
	if (!account) return fail(401, 'unauthorized', 'Login required for verified challenges');
	if (isRateLimited(`verified-start:${account.id}`, 12, 10 * 60_000)) return fail(429, 'rate_limited', 'Please wait before starting another verified challenge');

	const body = await readJsonObject(event, 4 * 1024);
	const challengeId = body?.challengeId;
	if (!body || typeof challengeId !== 'string') return fail(400, 'bad_request', 'Challenge id is required');
	const challenge = getVerifiedChallenge(challengeId);
	if (!challenge) return fail(404, 'not_found', 'Verified challenge not found');

	const now = new Date();
	const startedAt = now.toISOString();
	const expiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();
	const runId = randomUUID();
	openDatabase().prepare(`
INSERT INTO verified_challenge_runs (id, challenge_id, account_id, seed, ruleset_hash, started_at, expires_at, status)
VALUES (?, ?, ?, ?, ?, ?, ?, 'issued')
`).run(runId, challenge.id, account.id, challenge.seed, getVerifiedRulesetHash(challenge), startedAt, expiresAt);

	return ok({
		verifiedRulesetVersion: VERIFIED_RULESET_VERSION,
		runId,
		challengeId: challenge.id,
		name: challenge.name,
		description: challenge.description,
		tier: challenge.tier,
		seed: challenge.seed,
		durationSeconds: challenge.durationSeconds,
		rulesetHash: getVerifiedRulesetHash(challenge),
		startedAt,
		expiresAt,
	});
}
