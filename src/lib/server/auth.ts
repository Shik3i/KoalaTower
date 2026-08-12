import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { Db } from './db';
import { openDatabase } from './db';
import { BCRYPT_COST, getPasswordPepper, getSessionSecret, SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from './env';
import { normalizeUsername } from './validation';

export type Account = {
	id: string;
	username: string;
	username_normalized: string;
	display_name: string;
	password_hash: string;
	created_at: string;
	updated_at: string;
	last_login_at: string | null;
	disabled_at: string | null;
};

export type SessionAccount = Pick<Account, 'id' | 'username' | 'display_name'>;

/**
 * A fixed, valid bcrypt hash of a throwaway value. Used by the login route to
 * run a real `compare` even when no account matches, so that the "unknown user"
 * and "wrong password" paths cost the same — closing the timing side-channel
 * that would otherwise allow username enumeration. The plaintext is unknown and
 * irrelevant; it only needs to be a parseable cost-12 hash.
 */
export const DUMMY_PASSWORD_HASH = '$2b$12$IcJcHgVieVkbzCQVkRbiC.aEayQPwMDOsC8L3LNh0igqYdEHoWDjK';

/**
 * Pepper the password before bcrypt via an HMAC-SHA256 pre-hash keyed by the
 * server pepper, base64-encoded.
 *
 * Why not just `bcrypt(password + pepper)`:
 *   - bcrypt only consumes the first 72 bytes of its input. Appending the pepper
 *     means it is silently dropped for long passwords (and two passwords sharing
 *     the first 72 bytes would collide). HMAC-SHA256 is a fixed 32 bytes → 44
 *     base64 chars, always under 72, so the *whole* password always contributes
 *     and the pepper is a real cryptographic key over it, never truncated.
 *   - base64 output also contains no NUL byte, avoiding bcrypt's NUL-truncation.
 *
 * The pepper stays server-only, so a leaked password_hash cannot be cracked
 * offline without it.
 */
function pepperPassword(password: string): string {
	return createHmac('sha256', getPasswordPepper()).update(password, 'utf8').digest('base64');
}

// bcrypt is deliberately run via the async API so the cost-12 KDF does not block
// the single Node event loop (which also serves gameplay/`/api/*` requests).
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(pepperPassword(password), BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
	return bcrypt.compare(pepperPassword(password), passwordHash);
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token + getSessionSecret()).digest('hex');
}

export function hashOptionalFingerprint(value: string | null | undefined): string | null {
	if (!value) return null;
	return createHash('sha256').update(value + getSessionSecret()).digest('hex');
}

export function createSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export async function createAccount(db: Db, username: string, displayName: string, password: string): Promise<Account> {
	const now = new Date().toISOString();
	const account: Account = {
		id: randomUUID(),
		username,
		username_normalized: normalizeUsername(username),
		display_name: displayName,
		password_hash: await hashPassword(password),
		created_at: now,
		updated_at: now,
		last_login_at: null,
		disabled_at: null
	};
	db.prepare(`
INSERT INTO accounts (id, username, username_normalized, display_name, password_hash, created_at, updated_at)
VALUES (@id, @username, @username_normalized, @display_name, @password_hash, @created_at, @updated_at)
`).run(account);
	return account;
}

export function findAccountByUsername(db: Db, username: string): Account | null {
	const row = db.prepare('SELECT * FROM accounts WHERE username_normalized = ? AND disabled_at IS NULL').get(normalizeUsername(username));
	return (row as Account | undefined) ?? null;
}

/** Delete sessions whose TTL has elapsed so the table cannot grow without bound. */
export function purgeExpiredSessions(db: Db, now = new Date()): void {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
}

export function createSession(db: Db, accountId: string, event: RequestEvent): string {
	const token = createSessionToken();
	const now = new Date();
	purgeExpiredSessions(db, now);
	const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
	db.prepare(`
INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at, last_seen_at, user_agent_hash, ip_hash)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
		randomUUID(),
		accountId,
		hashToken(token),
		now.toISOString(),
		expires.toISOString(),
		now.toISOString(),
		hashOptionalFingerprint(event.request.headers.get('user-agent')),
		hashOptionalFingerprint(event.getClientAddress())
	);
	db.prepare('UPDATE accounts SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now.toISOString(), now.toISOString(), accountId);
	return token;
}

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export function destroySession(cookies: Cookies, db?: Db): void {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (token) {
		(db ?? openDatabase()).prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
	}
	clearSessionCookie(cookies);
}

/**
 * Permanently remove an account's private data while retaining public
 * community-run rows as explicitly anonymized history.
 *
 * The transaction deliberately handles relations explicitly instead of
 * relying only on SQLite foreign-key actions. That keeps the deletion policy
 * visible and also covers historical tables whose owner columns are not FKs.
 */
export function deleteAccountData(db: Db, accountId: string): boolean {
	return db.transaction(() => {
		const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId) as { id: string } | undefined;
		if (!account) return false;

		const localIdentities = db.prepare('SELECT local_player_id FROM player_identities WHERE account_id = ?').all(accountId) as { local_player_id: string }[];
		const anonymizeLeaderboard = db.prepare(`
UPDATE leaderboard_runs
SET account_id = NULL,
	local_player_id = NULL,
	display_name = 'Deleted account'
WHERE account_id = ?
`);
		anonymizeLeaderboard.run(accountId);

		for (const identity of localIdentities) {
			const localPlayerId = identity.local_player_id;
			db.prepare(`
UPDATE leaderboard_runs
SET account_id = NULL,
	local_player_id = NULL,
	display_name = 'Deleted account'
WHERE local_player_id = ?
`).run(localPlayerId);
			db.prepare(`
UPDATE kofi_events
SET matched_owner_type = NULL,
	matched_owner_id = NULL,
	support_code = NULL,
	raw_json = '{}'
WHERE matched_owner_type = 'local_identity' AND matched_owner_id = ?
`).run(localPlayerId);
			db.prepare('DELETE FROM entitlements WHERE owner_type = \'local_identity\' AND owner_id = ?').run(localPlayerId);
		}

		// Private online data is deleted, not soft-deleted.
		db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
		db.prepare('DELETE FROM cloud_saves WHERE account_id = ?').run(accountId);
		db.prepare('DELETE FROM entitlements WHERE owner_type = \'account\' AND owner_id = ?').run(accountId);
		db.prepare(`
UPDATE kofi_events
SET matched_owner_type = NULL,
	matched_owner_id = NULL,
	support_code = NULL,
	raw_json = '{}'
WHERE matched_owner_type = 'account' AND matched_owner_id = ?
`).run(accountId);
		db.prepare('UPDATE app_error_logs SET user_id = NULL WHERE user_id = ?').run(accountId);
		db.prepare('DELETE FROM player_identities WHERE account_id = ?').run(accountId);

		const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);
		return result.changes === 1;
	})();
}

export function getSessionAccount(cookies: Cookies, db?: Db): SessionAccount | null {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!token) return null;
	const instance = db ?? openDatabase();
	const tokenHash = hashToken(token);
	const now = new Date().toISOString();
	const row = instance.prepare(`
SELECT accounts.id, accounts.username, accounts.display_name
FROM sessions
JOIN accounts ON accounts.id = sessions.account_id
WHERE sessions.token_hash = ?
	AND sessions.expires_at > ?
	AND accounts.disabled_at IS NULL
`).get(tokenHash, now) as SessionAccount | undefined;
	if (!row) return null;
	instance.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(now, tokenHash);
	return row;
}
