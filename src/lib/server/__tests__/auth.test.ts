import { describe, expect, it, beforeEach } from 'vitest';
import { createAccount, createSession, hashToken, verifyPassword } from '../auth';
import { createDatabase } from '../db';

beforeEach(() => {
	process.env.AUTH_PASSWORD_PEPPER = 'test-pepper';
	process.env.SESSION_SECRET = 'test-session-secret';
});

describe('auth foundation', () => {
	it('hashes passwords with the environment pepper and rejects wrong passwords', async () => {
		const db = createDatabase(':memory:');
		const account = await createAccount(db, 'Commander', 'Commander', 'correct horse battery');
		expect(account.password_hash).not.toContain('correct horse battery');
		expect(await verifyPassword('correct horse battery', account.password_hash)).toBe(true);
		expect(await verifyPassword('wrong horse battery', account.password_hash)).toBe(false);
		db.close();
	});

	it('uses the entire password — no bcrypt 72-byte truncation', async () => {
		const db = createDatabase(':memory:');
		const shared = 'A'.repeat(72); // fills bcrypt's whole 72-byte window
		const account = await createAccount(db, 'LongPass', 'LongPass', shared + '-tail-one');
		expect(await verifyPassword(shared + '-tail-one', account.password_hash)).toBe(true);
		// Same first 72 bytes, different tail: must NOT verify (would collide under
		// the old `bcrypt(password + pepper)` scheme).
		expect(await verifyPassword(shared + '-tail-two', account.password_hash)).toBe(false);
		db.close();
	});

	it('changes the hash when the pepper changes (pepper actually keys the hash)', async () => {
		const db = createDatabase(':memory:');
		const account = await createAccount(db, 'Peppered', 'Peppered', 'correct horse battery');
		process.env.AUTH_PASSWORD_PEPPER = 'a-different-pepper';
		expect(await verifyPassword('correct horse battery', account.password_hash)).toBe(false);
		db.close();
	});

	it('stores only a hash of the session token', async () => {
		const db = createDatabase(':memory:');
		const account = await createAccount(db, 'Pilot', 'Pilot', 'correct horse battery');
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
