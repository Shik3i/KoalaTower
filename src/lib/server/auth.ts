import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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

export function hashPassword(password: string): string {
	return bcrypt.hashSync(password + getPasswordPepper(), BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
	return bcrypt.compareSync(password + getPasswordPepper(), passwordHash);
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

export function createAccount(db: Db, username: string, displayName: string, password: string): Account {
	const now = new Date().toISOString();
	const account: Account = {
		id: randomUUID(),
		username,
		username_normalized: normalizeUsername(username),
		display_name: displayName,
		password_hash: hashPassword(password),
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
