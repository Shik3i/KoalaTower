import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrations, latestMigrationId } from './migrations';

export type Db = Database.Database;

let db: Db | null = null;

export function getDatabasePath(): string {
	return process.env.DATABASE_PATH || '/data/flatland.db';
}

export function openDatabase(path = getDatabasePath()): Db {
	if (db) return db;
	db = createDatabase(path);
	return db;
}

export function createDatabase(path: string): Db {
	if (path !== ':memory:') {
		mkdirSync(dirname(path), { recursive: true });
	}
	const instance = new Database(path);
	instance.pragma('foreign_keys = ON');
	try {
		instance.pragma('journal_mode = WAL');
	} catch {
		// Some test or read-only environments may not allow WAL. The DB remains usable.
	}
	runMigrations(instance);
	return instance;
}

export function closeDatabase(): void {
	db?.close();
	db = null;
}

export function runMigrations(instance: Db): number {
	instance.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	applied_at TEXT NOT NULL
);
`);

	const applied = new Set(
		instance.prepare('SELECT id FROM schema_migrations').all().map((row) => (row as { id: number }).id)
	);

	const apply = instance.transaction(() => {
		for (const migration of migrations) {
			if (applied.has(migration.id)) continue;
			instance.exec(migration.sql);
			instance.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
				migration.id,
				migration.name,
				new Date().toISOString()
			);
		}
	});
	apply();

	return getMigrationVersion(instance);
}

export function getMigrationVersion(instance = openDatabase()): number {
	const row = instance.prepare('SELECT MAX(id) AS version FROM schema_migrations').get() as { version: number | null } | undefined;
	return row?.version ?? 0;
}

export function isDatabaseReachable(): boolean {
	try {
		openDatabase().prepare('SELECT 1').get();
		return true;
	} catch {
		return false;
	}
}

export { latestMigrationId };
