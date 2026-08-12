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
			'community_buff_events',
			'verified_challenge_runs'
		]) {
			expect(names.has(table)).toBe(true);
		}
		const version = db.prepare('SELECT MAX(id) AS version FROM schema_migrations').get() as { version: number };
		expect(version.version).toBe(latestMigrationId);
		const leaderboardColumns = new Set((db.prepare('PRAGMA table_info(leaderboard_runs)').all() as { name: string }[]).map((column) => column.name));
		expect(leaderboardColumns.has('challenge_id')).toBe(true);
		expect(leaderboardColumns.has('verified_run_id')).toBe(true);
		db.close();
	});
});
