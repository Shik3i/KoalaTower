import { describe, expect, it, beforeEach } from 'vitest';
import { createAccount, createSession, hashToken, verifyPassword } from '../auth';
import { createDatabase } from '../db';

beforeEach(() => {
	process.env.AUTH_PASSWORD_PEPPER = 'test-pepper';
	process.env.SESSION_SECRET = 'test-session-secret';
});

describe('auth foundation', () => {
	it('hashes passwords with the environment pepper and rejects wrong passwords', () => {
		const db = createDatabase(':memory:');
		const account = createAccount(db, 'Commander', 'Commander', 'correct horse battery');
		expect(account.password_hash).not.toContain('correct horse battery');
		expect(verifyPassword('correct horse battery', account.password_hash)).toBe(true);
		expect(verifyPassword('wrong horse battery', account.password_hash)).toBe(false);
		db.close();
	});

	it('stores only a hash of the session token', () => {
		const db = createDatabase(':memory:');
		const account = createAccount(db, 'Pilot', 'Pilot', 'correct horse battery');
		const token = createSession(db, account.id, {
			request: new Request('http://localhost/api/auth/login', { headers: { 'user-agent': 'vitest' } }),
			getClientAddress: () => '127.0.0.1'
		} as never);
		const row = db.prepare('SELECT token_hash FROM sessions WHERE account_id = ?').get(account.id) as { token_hash: string };
		expect(row.token_hash).toBe(hashToken(token));
		expect(row.token_hash).not.toBe(token);
		db.close();
	});
});
