import { createHash, randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { getSessionAccount } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { validatePositiveInt } from '$lib/server/validation';

export const prerender = false;

const MAX_SAVE_BYTES = 750_000;

type CloudSaveRow = {
	save_json: string;
	schemaVersion: number;
	gameVersion: string;
	saveHash: string;
	updatedAt: string;
};

function readCloudSave(accountId: string): CloudSaveRow | null {
	const row = openDatabase().prepare(`
SELECT save_json, schema_version AS schemaVersion, game_version AS gameVersion, save_hash AS saveHash, updated_at AS updatedAt
FROM cloud_saves
WHERE account_id = ?
	`).get(accountId) as CloudSaveRow | undefined;
	return row ?? null;
}

export function GET(event: RequestEvent): Response {
	const account = getSessionAccount(event.cookies);
	if (!account) return fail(401, 'unauthorized', 'Login required');
	const row = readCloudSave(account.id);
	if (!row) {
		return ok({ exists: false, metadata: null, saveJson: null });
	}
	const metadata = {
		updatedAt: row.updatedAt,
		schemaVersion: row.schemaVersion,
		gameVersion: row.gameVersion,
		saveHash: row.saveHash
	};
	const includeSave = new URL(event.request.url).searchParams.get('includeSave') === '1';
	let saveJson: unknown = null;
	if (includeSave) {
		try {
			saveJson = JSON.parse(row.save_json);
		} catch {
			saveJson = null;
		}
	}
	return ok({ exists: true, metadata, saveJson });
}

export async function PUT(event: RequestEvent): Promise<Response> {
	const account = getSessionAccount(event.cookies);
	if (!account) return fail(401, 'unauthorized', 'Login required');
	const body = await readJsonObject(event, MAX_SAVE_BYTES + 16 * 1024);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	if (typeof body.saveJson !== 'object' || body.saveJson === null || Array.isArray(body.saveJson)) {
		return fail(400, 'bad_request', 'saveJson must be an object');
	}
	const schemaVersion = validatePositiveInt(body.schemaVersion, 'Schema version', 1, 1000);
	if (!schemaVersion.ok) return fail(400, 'bad_request', schemaVersion.message);
	const gameVersion = typeof body.gameVersion === 'string' && body.gameVersion.trim() ? body.gameVersion.trim().slice(0, 32) : 'unknown';
	const saveJson = JSON.stringify(body.saveJson);
	if (new TextEncoder().encode(saveJson).length > MAX_SAVE_BYTES) {
		return fail(400, 'bad_request', 'Cloud save is too large');
	}
	const now = new Date().toISOString();
	const saveHash = createHash('sha256').update(saveJson).digest('hex');
	openDatabase().prepare(`
INSERT INTO cloud_saves (id, account_id, save_json, schema_version, game_version, save_hash, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(account_id) DO UPDATE SET
	save_json = excluded.save_json,
	schema_version = excluded.schema_version,
	game_version = excluded.game_version,
	save_hash = excluded.save_hash,
	updated_at = excluded.updated_at
`).run(randomUUID(), account.id, saveJson, schemaVersion.value, gameVersion, saveHash, now, now);
	return ok({ updatedAt: now, gameVersion, schemaVersion: schemaVersion.value, saveHash });
}
