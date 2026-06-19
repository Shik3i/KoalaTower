import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import type { Db } from './db';
import { getSessionAccount, type SessionAccount } from './auth';

/**
 * # Admin access model
 *
 * Admin access is controlled exclusively by the server-only `ADMIN_USERNAMES`
 * environment variable — a comma-separated list of account usernames.
 *
 *     ADMIN_USERNAMES=timo,anotheradmin
 *
 * There is intentionally NO `PUBLIC_` equivalent: the list must never reach the
 * client bundle. If the variable is missing or empty there are simply no admins.
 *
 * A request is treated as an admin request only when BOTH hold:
 *   1. It carries a valid session (via the existing auth/session system), and
 *   2. The session account's username matches one of the configured admins.
 *
 * Matching is case-insensitive and trims surrounding whitespace, mirroring the
 * username normalization used elsewhere (see {@link normalizeUsername}).
 */

/** Parse `ADMIN_USERNAMES` into a normalized (trimmed, lowercased) set. */
export function getAdminUsernames(): Set<string> {
	const raw = process.env.ADMIN_USERNAMES;
	if (!raw) return new Set();
	return new Set(
		raw
			.split(',')
			.map((name) => name.trim().toLowerCase())
			.filter((name) => name.length > 0)
	);
}

/** True when `username` is one of the configured admins (case-insensitive). */
export function isAdminUsername(username: string | null | undefined): boolean {
	if (!username) return false;
	return getAdminUsernames().has(username.trim().toLowerCase());
}

/**
 * Resolve the current session account and return it only if it is an admin.
 * Returns null for anonymous users, non-admin users, or when the session/DB
 * lookup fails (e.g. database unavailable) — never throws.
 */
export function getAdminUser(cookies: Cookies, db?: Db): SessionAccount | null {
	let account: SessionAccount | null = null;
	try {
		account = getSessionAccount(cookies, db);
	} catch {
		// If the session cannot be resolved (DB down, etc.) treat as not-admin.
		return null;
	}
	if (!account) return null;
	return isAdminUsername(account.username) ? account : null;
}

/**
 * Enforce admin access server-side. For non-admins (anonymous, wrong username,
 * or unresolved session) we throw a 404 rather than 401/403 so the very
 * existence of the admin area is not advertised, and no partial admin layout is
 * ever rendered.
 */
export function requireAdmin(cookies: Cookies, db?: Db): SessionAccount {
	const admin = getAdminUser(cookies, db);
	if (!admin) throw error(404, 'Not found');
	return admin;
}
