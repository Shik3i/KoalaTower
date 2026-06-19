import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, createDatabase, latestMigrationId } from '../db';

describe('online database migrations', () => {
	afterEach(() => closeDatabase());

	it('creates required foundation tables and records schema version', () => {
		const db = createDatabase(':memory:');
		const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
		const names = new Set(tables.map((table) => table.name));
		for (const table of [
			'schema_migrations',
			'accounts',
			'sessions',
			'player_identities',
			'cloud_saves',
			'leaderboard_runs',
			'challenge_configs',
			'entitlements',
			'kofi_events',
			'community_buff_events'
		]) {
			expect(names.has(table)).toBe(true);
		}
		const version = db.prepare('SELECT MAX(id) AS version FROM schema_migrations').get() as { version: number };
		expect(version.version).toBe(latestMigrationId);
		db.close();
	});
});
