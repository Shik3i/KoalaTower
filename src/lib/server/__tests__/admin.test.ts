import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createAccount, createSession } from '../auth';
import { createDatabase, type Db } from '../db';
import { getAdminUsernames, isAdminUsername, getAdminUser, requireAdmin } from '../admin';
import { getAdminUsers } from '../adminData';

beforeEach(() => {
	process.env.AUTH_PASSWORD_PEPPER = 'test-pepper';
	process.env.SESSION_SECRET = 'test-session-secret';
});

afterEach(() => {
	delete process.env.ADMIN_USERNAMES;
});

function cookiesWith(token: string | undefined): Cookies {
	return { get: () => token } as unknown as Cookies;
}

function loginToken(db: Db, accountId: string): string {
	return createSession(db, accountId, {
		request: new Request('http://localhost/api/auth/login', { headers: { 'user-agent': 'vitest' } }),
		getClientAddress: () => '127.0.0.1'
	} as never);
}

describe('admin username parsing', () => {
	it('parses a comma-separated list, trimming and lowercasing', () => {
		process.env.ADMIN_USERNAMES = ' Timo , AnotherAdmin ';
		const set = getAdminUsernames();
		expect(set.has('timo')).toBe(true);
		expect(set.has('anotheradmin')).toBe(true);
		expect(set.size).toBe(2);
	});

	it('treats a missing env as no admins', () => {
		delete process.env.ADMIN_USERNAMES;
		expect(getAdminUsernames().size).toBe(0);
		expect(isAdminUsername('timo')).toBe(false);
	});

	it('treats an empty/whitespace env as no admins', () => {
		process.env.ADMIN_USERNAMES = '   ,  , ';
		expect(getAdminUsernames().size).toBe(0);
		expect(isAdminUsername('timo')).toBe(false);
	});

	it('matches usernames case-insensitively', () => {
		process.env.ADMIN_USERNAMES = 'timo';
		expect(isAdminUsername('Timo')).toBe(true);
		expect(isAdminUsername('TIMO')).toBe(true);
		expect(isAdminUsername(' timo ')).toBe(true);
		expect(isAdminUsername('nottimo')).toBe(false);
		expect(isAdminUsername(null)).toBe(false);
		expect(isAdminUsername(undefined)).toBe(false);
	});
});

describe('admin access enforcement', () => {
	it('returns null for an unauthenticated user', () => {
		process.env.ADMIN_USERNAMES = 'timo';
		const db = createDatabase(':memory:');
		expect(getAdminUser(cookiesWith(undefined), db)).toBeNull();
		db.close();
	});

	it('returns null for a logged-in non-admin user', async () => {
		process.env.ADMIN_USERNAMES = 'timo';
		const db = createDatabase(':memory:');
		const account = await createAccount(db, 'Player', 'Player', 'correct horse battery');
		const token = loginToken(db, account.id);
		expect(getAdminUser(cookiesWith(token), db)).toBeNull();
		db.close();
	});

	it('returns the account for a logged-in admin user', async () => {
		process.env.ADMIN_USERNAMES = 'timo';
		const db = createDatabase(':memory:');
		const account = await createAccount(db, 'Timo', 'Timo', 'correct horse battery');
		const token = loginToken(db, account.id);
		const admin = getAdminUser(cookiesWith(token), db);
		expect(admin?.username).toBe('Timo');
		db.close();
	});

	it('requireAdmin throws a 404 for non-admins and does not reveal the area', () => {
		process.env.ADMIN_USERNAMES = 'timo';
		const db = createDatabase(':memory:');
		expect(() => requireAdmin(cookiesWith(undefined), db)).toThrow();
		try {
			requireAdmin(cookiesWith(undefined), db);
		} catch (err) {
			expect((err as { status?: number }).status).toBe(404);
		}
		db.close();
	});
});

describe('admin data does not expose secrets', () => {
	it('user rows carry no password hash, token, or pepper fields', async () => {
		const db = createDatabase(':memory:');
		await createAccount(db, 'Timo', 'Timo', 'correct horse battery');
		const rows = getAdminUsers(db);
		expect(rows.length).toBe(1);
		const serialized = JSON.stringify(rows);
		expect(serialized).not.toContain('password');
		expect(serialized).not.toContain('correct horse battery');
		expect(serialized).not.toContain('token');
		expect(serialized).not.toContain('pepper');
		expect(Object.keys(rows[0]!)).not.toContain('password_hash');
		db.close();
	});
});
