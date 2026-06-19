import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { openDatabase } from '$lib/server/db';
import { isRateLimited } from '$lib/server/rateLimit';
import { createSupportCode } from '$lib/server/supportCode';
import { validateDisplayName, validateLocalPlayerId } from '$lib/server/validation';

export const prerender = false;

export async function POST(event: RequestEvent): Promise<Response> {
	if (isRateLimited(`identity:${event.getClientAddress()}`)) return fail(429, 'rate_limited', 'Please wait before trying again');
	const body = await readJsonObject(event, 4 * 1024);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	const localPlayerId = validateLocalPlayerId(body.localPlayerId);
	const displayName = validateDisplayName(body.displayName);
	if (!localPlayerId.ok) return fail(400, 'bad_request', localPlayerId.message);
	if (!displayName.ok) return fail(400, 'bad_request', displayName.message);

	const db = openDatabase();
	const now = new Date().toISOString();
	const existing = db.prepare('SELECT id FROM player_identities WHERE local_player_id = ?').get(localPlayerId.value) as { id: string } | undefined;
	const id = existing?.id ?? randomUUID();
	db.prepare(`
INSERT INTO player_identities (id, local_player_id, display_name, created_at, updated_at, last_seen_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(local_player_id) DO UPDATE SET
	display_name = excluded.display_name,
	updated_at = excluded.updated_at,
	last_seen_at = excluded.last_seen_at
`).run(id, localPlayerId.value, displayName.value, now, now, now);

	return ok({
		identity: {
			id,
			localPlayerId: localPlayerId.value,
			displayName: displayName.value,
			supportCode: createSupportCode('local_identity', localPlayerId.value)
		}
	});
}
