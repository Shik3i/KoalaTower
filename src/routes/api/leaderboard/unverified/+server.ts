import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { openDatabase } from '$lib/server/db';
import { validateDisplayName, validateLocalPlayerId, validateOptionalIsoDate, validatePositiveInt } from '$lib/server/validation';

export const prerender = false;

export function GET(): Response {
	const rows = openDatabase().prepare(`
SELECT id, display_name AS displayName, local_player_id AS localPlayerId, front_id AS frontId, wave, score, game_version AS gameVersion, created_at AS createdAt
FROM leaderboard_runs
WHERE leaderboard_type = 'unverified' AND verified = 0
ORDER BY score DESC, wave DESC, created_at ASC
LIMIT 50
`).all() as Record<string, unknown>[];
	return ok({ leaderboardType: 'unverified', entries: rows });
}

export async function POST(event: RequestEvent): Promise<Response> {
	const body = await readJsonObject(event, 8 * 1024);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	const localPlayerId = validateLocalPlayerId(body.localPlayerId);
	const displayName = validateDisplayName(body.displayName);
	const frontId = validatePositiveInt(body.frontId, 'Front', 1, 99);
	const wave = validatePositiveInt(body.wave, 'Wave', 1, 100_000);
	const score = validatePositiveInt(body.score, 'Score', 0, 10_000_000_000);
	if (!localPlayerId.ok) return fail(400, 'bad_request', localPlayerId.message);
	if (!displayName.ok) return fail(400, 'bad_request', displayName.message);
	if (!frontId.ok) return fail(400, 'bad_request', frontId.message);
	if (!wave.ok) return fail(400, 'bad_request', wave.message);
	if (!score.ok) return fail(400, 'bad_request', score.message);

	const now = new Date().toISOString();
	const id = randomUUID();
	openDatabase().prepare(`
INSERT INTO leaderboard_runs (
	id, leaderboard_type, local_player_id, display_name, front_id, wave, score,
	run_started_at, run_ended_at, game_version, verified, created_at
) VALUES (?, 'unverified', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
`).run(
		id,
		localPlayerId.value,
		displayName.value,
		frontId.value,
		wave.value,
		score.value,
		validateOptionalIsoDate(body.runStartedAt),
		validateOptionalIsoDate(body.runEndedAt),
		typeof body.gameVersion === 'string' && body.gameVersion.trim() ? body.gameVersion.slice(0, 32) : 'unknown',
		now
	);
	return ok({ leaderboardType: 'unverified', id }, { status: 201 });
}
