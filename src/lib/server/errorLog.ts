import type { Db } from './db';
import { openDatabase } from './db';

/**
 * # Application error log
 *
 * Persists recent server-side errors into the SQLite `app_error_logs` table so
 * the admin panel can surface them without reading Docker logs, mounting the
 * Docker socket, or shelling out.
 *
 * Hard rules:
 *   - Never log secrets, passwords, auth tokens, cookies, full request bodies,
 *     or full cloud-save data. Callers pass only safe fields.
 *   - Long fields are truncated so a single error cannot bloat the DB.
 *   - Logging must fail safely: any error while logging is swallowed so the app
 *     never crashes because of its own logging.
 *   - Retention is bounded to the most recent {@link RETENTION_LIMIT} rows.
 */

const MAX_LEVEL = 16;
const MAX_SOURCE = 64;
const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_ROUTE = 256;
const MAX_METHOD = 16;
const MAX_ID = 128;
const MAX_USER_AGENT = 512;
const MAX_METADATA = 4000;

/** Keep at most this many rows; oldest beyond the limit are pruned on insert. */
export const RETENTION_LIMIT = 1000;

export type ErrorLogInput = {
	level?: string;
	source: string;
	message: string;
	stack?: string | null;
	route?: string | null;
	method?: string | null;
	status?: number | null;
	userId?: string | null;
	requestId?: string | null;
	userAgent?: string | null;
	metadata?: unknown;
};

function truncate(value: string | null | undefined, max: number): string | null {
	if (value === null || value === undefined) return null;
	const text = String(value);
	return text.length > max ? text.slice(0, max) : text;
}

function serializeMetadata(metadata: unknown): string | null {
	if (metadata === undefined || metadata === null) return null;
	try {
		return truncate(JSON.stringify(metadata), MAX_METADATA);
	} catch {
		return null;
	}
}

/**
 * Insert one error record. Never throws. `db` is mainly for tests; in
 * production callers can omit it to use the shared connection.
 */
export function logServerError(input: ErrorLogInput, db?: Db): void {
	try {
		const instance = db ?? openDatabase();
		const now = new Date().toISOString();
		instance
			.prepare(
				`INSERT INTO app_error_logs
				(created_at, level, source, message, stack, route, method, status, user_id, request_id, user_agent, metadata_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				now,
				truncate(input.level ?? 'error', MAX_LEVEL) ?? 'error',
				truncate(input.source, MAX_SOURCE) ?? 'unknown',
				truncate(input.message, MAX_MESSAGE) ?? '',
				truncate(input.stack, MAX_STACK),
				truncate(input.route, MAX_ROUTE),
				truncate(input.method, MAX_METHOD),
				typeof input.status === 'number' && Number.isFinite(input.status) ? Math.trunc(input.status) : null,
				truncate(input.userId, MAX_ID),
				truncate(input.requestId, MAX_ID),
				truncate(input.userAgent, MAX_USER_AGENT),
				serializeMetadata(input.metadata)
			);

		// Bounded retention: drop everything older than the newest RETENTION_LIMIT rows.
		instance
			.prepare(
				`DELETE FROM app_error_logs
				WHERE id NOT IN (SELECT id FROM app_error_logs ORDER BY id DESC LIMIT ?)`
			)
			.run(RETENTION_LIMIT);
	} catch {
		// Logging must never crash the app — swallow all failures.
	}
}

export type ErrorLogRow = {
	id: number;
	created_at: string;
	level: string;
	source: string;
	message: string;
	stack: string | null;
	route: string | null;
	method: string | null;
	status: number | null;
	request_id: string | null;
	metadata_json: string | null;
};

/** Read the most recent error rows for the admin UI. Safe, read-only. */
export function getRecentErrorLogs(db: Db, limit = 250): ErrorLogRow[] {
	const bounded = Math.max(1, Math.min(limit, RETENTION_LIMIT));
	return db
		.prepare(
			`SELECT id, created_at, level, source, message, stack, route, method, status, request_id, metadata_json
			FROM app_error_logs
			ORDER BY id DESC
			LIMIT ?`
		)
		.all(bounded) as ErrorLogRow[];
}

/** Count of stored error rows (for the dashboard "recent errors" card). */
export function getErrorLogCount(db: Db): number {
	const row = db.prepare('SELECT COUNT(*) AS count FROM app_error_logs').get() as { count: number } | undefined;
	return row?.count ?? 0;
}
