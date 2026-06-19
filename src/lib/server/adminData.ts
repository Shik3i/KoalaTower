import type { Db } from './db';
import { isDatabaseReachable } from './db';
import { getCommunityBuff, type CommunityBuffSummary } from './communityBuff';
import { getErrorLogCount } from './errorLog';
import { APP_VERSION } from '$lib/version';

/**
 * Read-only operational queries for the admin panel. Every function only ever
 * SELECTs and returns non-sensitive, aggregated, or already-redacted data.
 * Nothing here exposes password hashes, peppers, session tokens, raw cookies,
 * Ko-fi verification tokens, or full cloud-save JSON.
 */

function count(db: Db, sql: string, ...params: unknown[]): number {
	const row = db.prepare(sql).get(...params) as { count: number } | undefined;
	return row?.count ?? 0;
}

function scalarText(db: Db, sql: string, ...params: unknown[]): string | null {
	const row = db.prepare(sql).get(...params) as { value: string | null } | undefined;
	return row?.value ?? null;
}

export type AdminOverview = {
	appVersion: string;
	dbReachable: boolean;
	totalUsers: number;
	activeSessions: number;
	cloudSaves: number;
	latestCloudSaveAt: string | null;
	communityBuff: CommunityBuffSummary;
	totalKofiEvents: number;
	latestKofiEventAt: string | null;
	totalErrorLogs: number;
};

export function getAdminOverview(db: Db, now = new Date()): AdminOverview {
	return {
		appVersion: APP_VERSION,
		dbReachable: isDatabaseReachable(),
		totalUsers: count(db, 'SELECT COUNT(*) AS count FROM accounts'),
		activeSessions: count(db, 'SELECT COUNT(*) AS count FROM sessions WHERE expires_at > ?', now.toISOString()),
		cloudSaves: count(db, 'SELECT COUNT(*) AS count FROM cloud_saves'),
		latestCloudSaveAt: scalarText(db, 'SELECT MAX(updated_at) AS value FROM cloud_saves'),
		communityBuff: getCommunityBuff(db, now),
		totalKofiEvents: count(db, 'SELECT COUNT(*) AS count FROM kofi_events'),
		latestKofiEventAt: scalarText(db, 'SELECT MAX(created_at) AS value FROM kofi_events'),
		totalErrorLogs: getErrorLogCount(db)
	};
}

export type AdminUserRow = {
	username: string;
	created_at: string;
	last_login_at: string | null;
	disabled_at: string | null;
	has_cloud_save: number;
	cloud_save_updated_at: string | null;
};

export function getAdminUsers(db: Db, limit = 500): AdminUserRow[] {
	const bounded = Math.max(1, Math.min(limit, 2000));
	return db
		.prepare(
			`SELECT a.username, a.created_at, a.last_login_at, a.disabled_at,
				CASE WHEN cs.account_id IS NULL THEN 0 ELSE 1 END AS has_cloud_save,
				cs.updated_at AS cloud_save_updated_at
			FROM accounts a
			LEFT JOIN cloud_saves cs ON cs.account_id = a.id
			ORDER BY a.created_at DESC
			LIMIT ?`
		)
		.all(bounded) as AdminUserRow[];
}

export type AdminKofiRow = {
	created_at: string;
	message_id: string;
	amount: number;
	currency: string;
	support_code: string | null;
	matched_owner_type: string | null;
	buff_created: number;
};

export function getAdminKofiEvents(db: Db, limit = 250): AdminKofiRow[] {
	const bounded = Math.max(1, Math.min(limit, 1000));
	// buff_created is derived from the community_buff_events join: a verified EUR
	// Ko-fi event creates exactly one buff event keyed by the Ko-fi message id.
	// raw_json is intentionally NOT selected — it is never shown in the UI.
	return db
		.prepare(
			`SELECT k.created_at, k.event_id AS message_id, k.amount, k.currency, k.support_code,
				k.matched_owner_type,
				CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS buff_created
			FROM kofi_events k
			LEFT JOIN community_buff_events b ON b.source = 'kofi' AND b.source_ref = k.event_id
			ORDER BY k.created_at DESC
			LIMIT ?`
		)
		.all(bounded) as AdminKofiRow[];
}

export type AdminBuffEventRow = {
	id: string;
	source: string;
	source_ref: string;
	percent: number;
	starts_at: string;
	expires_at: string;
	created_at: string;
	amount: number | null;
	currency: string | null;
};

export function getAdminBuffEvents(db: Db, limit = 100): AdminBuffEventRow[] {
	const bounded = Math.max(1, Math.min(limit, 500));
	// Amount/currency are joined from the originating Ko-fi event when available.
	return db
		.prepare(
			`SELECT e.id, e.source, e.source_ref, e.percent, e.starts_at, e.expires_at, e.created_at,
				k.amount, k.currency
			FROM community_buff_events e
			LEFT JOIN kofi_events k ON k.event_id = e.source_ref AND e.source = 'kofi'
			ORDER BY e.created_at DESC
			LIMIT ?`
		)
		.all(bounded) as AdminBuffEventRow[];
}
