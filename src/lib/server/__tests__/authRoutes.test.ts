import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase } from '../db';
import { clearRateLimits } from '../rateLimit';
import { POST as register } from '../../../routes/api/auth/register/+server';
import { POST as login } from '../../../routes/api/auth/login/+server';

const SESSION_COOKIE = 'flatland_td_session';

type EventOpts = { contentType?: string | null; ip?: string };

function makeEvent(path: string, body: unknown, opts: EventOpts = {}) {
	const { contentType = 'application/json', ip = '127.0.0.1' } = opts;
	const store = new Map<string, string>();
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
});
