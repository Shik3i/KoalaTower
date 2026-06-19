export type Migration = {
	id: number;
	name: string;
	sql: string;
};

export const migrations: Migration[] = [
	{
		id: 1,
		name: 'optional_online_foundation',
		sql: `
CREATE TABLE IF NOT EXISTS accounts (
	id TEXT PRIMARY KEY,
	username TEXT NOT NULL,
	username_normalized TEXT NOT NULL UNIQUE,
	display_name TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	last_login_at TEXT,
	disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
	token_hash TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL,
	user_agent_hash TEXT,
	ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS player_identities (
	id TEXT PRIMARY KEY,
	local_player_id TEXT NOT NULL UNIQUE,
	account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
	display_name TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_identities_account_id ON player_identities(account_id);

CREATE TABLE IF NOT EXISTS cloud_saves (
	id TEXT PRIMARY KEY,
	account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
	save_json TEXT NOT NULL,
	schema_version INTEGER NOT NULL,
	game_version TEXT NOT NULL,
	save_hash TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard_runs (
	id TEXT PRIMARY KEY,
	leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('unverified', 'verified')),
	account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
	local_player_id TEXT,
	display_name TEXT NOT NULL,
	front_id INTEGER NOT NULL,
	wave INTEGER NOT NULL,
	score INTEGER NOT NULL,
	run_started_at TEXT,
	run_ended_at TEXT,
	game_version TEXT NOT NULL,
	balance_hash TEXT,
	run_hash TEXT,
	verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_runs_type_score ON leaderboard_runs(leaderboard_type, score DESC, wave DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_runs_local_player ON leaderboard_runs(local_player_id);

CREATE TABLE IF NOT EXISTS challenge_configs (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	seed TEXT NOT NULL,
	config_json TEXT NOT NULL,
	starts_at TEXT NOT NULL,
	ends_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS entitlements (
	id TEXT PRIMARY KEY,
	owner_type TEXT NOT NULL CHECK (owner_type IN ('local_identity', 'account')),
	owner_id TEXT NOT NULL,
	entitlement_type TEXT NOT NULL,
	entitlement_key TEXT NOT NULL,
	source TEXT NOT NULL,
	source_ref TEXT,
	created_at TEXT NOT NULL,
	revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_entitlements_owner ON entitlements(owner_type, owner_id);

CREATE TABLE IF NOT EXISTS kofi_events (
	id TEXT PRIMARY KEY,
	event_id TEXT NOT NULL UNIQUE,
	raw_json TEXT NOT NULL,
	amount REAL NOT NULL DEFAULT 0,
	currency TEXT NOT NULL DEFAULT '',
	support_code TEXT,
	matched_owner_type TEXT,
	matched_owner_id TEXT,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kofi_events_support_code ON kofi_events(support_code);

CREATE TABLE IF NOT EXISTS community_buff_events (
	id TEXT PRIMARY KEY,
	source TEXT NOT NULL,
	source_ref TEXT NOT NULL,
	percent REAL NOT NULL,
	starts_at TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_community_buff_events_window ON community_buff_events(starts_at, expires_at);
`
	},
	{
		id: 2,
		name: 'app_error_logs',
		// Stores recent server-side errors for the read-only admin panel. user_id
		// is TEXT to match accounts.id (a UUID), not the INTEGER in the original
		// sketch. No secrets/tokens/cookies/bodies are ever written here — see
		// src/lib/server/errorLog.ts for the sanitizing/truncating writer.
		sql: `
CREATE TABLE IF NOT EXISTS app_error_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	created_at TEXT NOT NULL,
	level TEXT NOT NULL,
	source TEXT NOT NULL,
	message TEXT NOT NULL,
	stack TEXT,
	route TEXT,
	method TEXT,
	status INTEGER,
	user_id TEXT,
	request_id TEXT,
	user_agent TEXT,
	metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at ON app_error_logs(created_at DESC);
`
	}
];

export const latestMigrationId = migrations[migrations.length - 1]?.id ?? 0;
