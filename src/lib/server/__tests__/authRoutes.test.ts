import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, openDatabase } from '../db';
import { clearRateLimits } from '../rateLimit';
import { POST as register } from '../../../routes/api/auth/register/+server';
import { POST as login } from '../../../routes/api/auth/login/+server';
import { DELETE as deleteAccount } from '../../../routes/api/auth/account/+server';

const SESSION_COOKIE = 'flatland_td_session';

type EventOpts = { contentType?: string | null; ip?: string };

function makeEvent(path: string, body: unknown, opts: EventOpts = {}, cookieStore = new Map<string, string>()) {
	const { contentType = 'application/json', ip = '127.0.0.1' } = opts;
	const store = cookieStore;
	const headers: Record<string, string> = { 'user-agent': 'vitest' };
	if (contentType) headers['content-type'] = contentType;
	const text = typeof body === 'string' ? body : JSON.stringify(body);
	return {
		request: new Request(`http://localhost${path}`, { method: 'POST', headers, body: text }),
		getClientAddress: () => ip,
		cookies: {
			get: (name: string) => store.get(name),
			set: (name: string, value: string) => store.set(name, value),
			delete: (name: string) => store.delete(name)
		},
		_store: store
	} as never as { _store: Map<string, string> } & Record<string, unknown>;
}

describe('auth routes (register/login)', () => {
	beforeEach(() => {
		clearRateLimits();
		closeDatabase();
		process.env.AUTH_PASSWORD_PEPPER = 'test-pepper';
		process.env.SESSION_SECRET = 'test-session-secret';
		process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'flatland-auth-')), 'flatland.db');
	});

	afterEach(() => {
		closeDatabase();
		delete process.env.DATABASE_PATH;
		delete process.env.AUTH_PASSWORD_PEPPER;
		delete process.env.SESSION_SECRET;
	});

	it('registers a new account and sets a session cookie', async () => {
		const event = makeEvent('/api/auth/register', { username: 'Commander', password: 'correct horse battery' });
		const res = await register(event as never);
		expect(res.status).toBe(201);
		expect(event._store.get(SESSION_COOKIE)).toBeTruthy();
	});

	it('rejects a duplicate username with 409 (and not a misleading 500)', async () => {
		await register(makeEvent('/api/auth/register', { username: 'Dup', password: 'correct horse battery' }) as never);
		const res = await register(makeEvent('/api/auth/register', { username: 'dup', password: 'another password!!' }) as never);
		expect(res.status).toBe(409);
	});

	it('rejects a non-JSON content type (CSRF guard) on register', async () => {
		const event = makeEvent(
			'/api/auth/register',
			'username=x&password=correct+horse+battery',
			{ contentType: 'application/x-www-form-urlencoded' }
		);
		const res = await register(event as never);
		expect(res.status).toBe(400);
		expect(event._store.get(SESSION_COOKIE)).toBeFalsy();
	});

	it('logs in with correct credentials', async () => {
		await register(makeEvent('/api/auth/register', { username: 'Pilot', password: 'correct horse battery' }) as never);
		const event = makeEvent('/api/auth/login', { username: 'Pilot', password: 'correct horse battery' });
		const res = await login(event as never);
		expect(res.status).toBe(200);
		expect(event._store.get(SESSION_COOKIE)).toBeTruthy();
	});

	it('rejects a wrong password with a generic 401', async () => {
		await register(makeEvent('/api/auth/login-seed', { username: 'Pilot2', password: 'correct horse battery' }) as never);
		// NB: register path above seeds the account; now attempt a bad login.
		const res = await login(makeEvent('/api/auth/login', { username: 'Pilot2', password: 'wrong password here' }) as never);
		expect(res.status).toBe(401);
		expect(await res.json()).toMatchObject({ error: { message: 'Invalid username or password' } });
	});

	it('rejects an unknown username with the same generic 401 (no enumeration / no throw)', async () => {
		const res = await login(makeEvent('/api/auth/login', { username: 'ghost', password: 'whatever password' }) as never);
		expect(res.status).toBe(401);
		expect(await res.json()).toMatchObject({ error: { message: 'Invalid username or password' } });
	});

	it('rejects a form-encoded login attempt (CSRF guard)', async () => {
		const res = await login(
			makeEvent('/api/auth/login', 'username=x&password=y', { contentType: 'text/plain' }) as never
		);
		expect(res.status).toBe(400);
	});

	it('deletes private account data and anonymizes linked leaderboard history', async () => {
		const registerEvent = makeEvent('/api/auth/register', { username: 'EraseMe', password: 'correct horse battery', displayName: 'Erase Me' });
		await register(registerEvent as never);
		const db = openDatabase();
		const account = db.prepare('SELECT id FROM accounts WHERE username = ?').get('EraseMe') as { id: string };
		const localPlayerId = '11111111-1111-4111-8111-111111111111';
		const now = new Date().toISOString();

		db.prepare('INSERT INTO player_identities (id, local_player_id, account_id, display_name, created_at, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('identity-1', localPlayerId, account.id, 'Erase Me', now, now, now);
		db.prepare('INSERT INTO cloud_saves (id, account_id, save_json, schema_version, game_version, save_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('cloud-1', account.id, '{}', 1, 'test', 'hash', now, now);
		db.prepare('INSERT INTO leaderboard_runs (id, leaderboard_type, account_id, local_player_id, display_name, front_id, wave, score, game_version, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('run-account', 'unverified', account.id, localPlayerId, 'Erase Me', 1, 10, 100, 'test', 0, now);
		db.prepare('INSERT INTO leaderboard_runs (id, leaderboard_type, account_id, local_player_id, display_name, front_id, wave, score, game_version, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('run-local', 'unverified', null, localPlayerId, 'Erase Me', 1, 9, 90, 'test', 0, now);
		db.prepare('INSERT INTO leaderboard_runs (id, leaderboard_type, account_id, local_player_id, display_name, front_id, wave, score, game_version, verified, created_at, challenge_id, verified_run_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('run-verified', 'verified', account.id, null, 'Erase Me', 1, 12, 120, 'test', 1, now, 'fastSwarm', 'ticket-1');
		db.prepare('INSERT INTO entitlements (id, owner_type, owner_id, entitlement_type, entitlement_key, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('ent-1', 'account', account.id, 'badge', 'supporter', 'test', now);
		db.prepare('INSERT INTO kofi_events (id, event_id, raw_json, amount, currency, support_code, matched_owner_type, matched_owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('kofi-1', 'event-1', '{}', 1, 'EUR', 'code', 'account', account.id, now);
		db.prepare('INSERT INTO app_error_logs (created_at, level, source, message, user_id) VALUES (?, ?, ?, ?, ?)').run(now, 'error', 'test', 'private', account.id);

		const deleteEvent = makeEvent('/api/auth/account', { password: 'correct horse battery' }, {}, registerEvent._store);
		const response = await deleteAccount(deleteEvent as never);

		expect(response.status).toBe(200);
		expect(deleteEvent._store.get(SESSION_COOKIE)).toBeFalsy();
		expect((db.prepare('SELECT COUNT(*) AS count FROM accounts').get() as { count: number }).count).toBe(0);
		expect((db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number }).count).toBe(0);
		expect((db.prepare('SELECT COUNT(*) AS count FROM cloud_saves').get() as { count: number }).count).toBe(0);
		expect((db.prepare('SELECT COUNT(*) AS count FROM player_identities').get() as { count: number }).count).toBe(0);
		expect((db.prepare('SELECT COUNT(*) AS count FROM entitlements').get() as { count: number }).count).toBe(0);
		expect(db.prepare('SELECT account_id, local_player_id, display_name FROM leaderboard_runs ORDER BY id').all()).toEqual([
			{ account_id: null, local_player_id: null, display_name: 'Deleted account' },
			{ account_id: null, local_player_id: null, display_name: 'Deleted account' },
			{ account_id: null, local_player_id: null, display_name: 'Deleted account' }
		]);
		expect(db.prepare('SELECT raw_json, support_code, matched_owner_type, matched_owner_id FROM kofi_events').get()).toEqual({ raw_json: '{}', support_code: null, matched_owner_type: null, matched_owner_id: null });
		expect((db.prepare('SELECT user_id FROM app_error_logs').get() as { user_id: string | null }).user_id).toBeNull();
	});

	it('does not delete the account when the confirmation password is wrong', async () => {
		const registerEvent = makeEvent('/api/auth/register', { username: 'KeepMe', password: 'correct horse battery' });
		await register(registerEvent as never);
		const deleteEvent = makeEvent('/api/auth/account', { password: 'wrong password here' }, {}, registerEvent._store);
		const response = await deleteAccount(deleteEvent as never);

		expect(response.status).toBe(401);
		expect((openDatabase().prepare('SELECT COUNT(*) AS count FROM accounts').get() as { count: number }).count).toBe(1);
	});
});
