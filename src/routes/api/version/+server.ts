import { APP_VERSION } from '$lib/version';
import { ok } from '$lib/server/api';
import { getMigrationVersion, openDatabase } from '$lib/server/db';
import { onlineFeaturesEnabled } from '$lib/server/env';

export const prerender = false;

export function GET(): Response {
	const db = openDatabase();
	return ok({
		appVersion: APP_VERSION,
		schemaVersion: getMigrationVersion(db),
		onlineFeaturesEnabled: onlineFeaturesEnabled()
	});
}
