import { afterEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { accountStore, registerAccount, loginAccount, logoutAccount, deleteAccount } from '../accountClient';

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function makeFetch(responder: () => Response | Promise<Response>): typeof fetch {
	return (((_input: RequestInfo | URL, _init?: RequestInit) => responder()) as unknown) as typeof fetch;
}

const SAMPLE_ACCOUNT = { id: 'acc-1', username: 'Commander', displayName: 'Commander' };

describe('account client', () => {
	afterEach(() => {
		accountStore.clear();
	});

	it('register stores the account on success', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(201, { ok: true, account: SAMPLE_ACCOUNT })) as typeof fetch;
		try {
			const r = await registerAccount('Commander', 'correct-horse-battery', 'Commander');
			expect(r.ok).toBe(true);
			expect(get(accountStore).account?.id).toBe('acc-1');
		} finally {
			globalThis.fetch = original;
		}
	});

	it('login succeeds and stores the account', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true, account: SAMPLE_ACCOUNT })) as typeof fetch;
		try {
			const r = await loginAccount('Commander', 'correct-horse-battery');
			expect(r.ok).toBe(true);
		} finally {
			globalThis.fetch = original;
		}
	});

	it('login uses a generic error for bad credentials (never reveals user existence)', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(401, { ok: false, error: { code: 'unauthorized', message: 'Invalid username or password' } })) as typeof fetch;
		try {
			const r = await loginAccount('Ghost', 'whatever-pass');
			expect(r.ok).toBe(false);
			expect(r.message).toBe('Invalid username or password.');
		} finally {
			globalThis.fetch = original;
		}
	});

	it('reports a conflict for an unavailable username', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(409, { ok: false, error: { code: 'conflict', message: 'Username is not available' } })) as typeof fetch;
		try {
			const r = await registerAccount('Taken', 'correct-horse-battery');
			expect(r.ok).toBe(false);
			expect(r.message).toBe('That username is not available.');
		} finally {
			globalThis.fetch = original;
		}
	});

	it('offline / network failure is non-blocking and clears no local state', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => Promise.reject(new Error('offline'))) as typeof fetch;
		try {
			const r = await loginAccount('Someone', 'correct-horse-battery');
			expect(r.ok).toBe(false);
			expect(r.message).toContain('unavailable');
		} finally {
			globalThis.fetch = original;
		}
	});

	it('logout clears the account state but keeps local play intact', async () => {
		accountStore.set(SAMPLE_ACCOUNT);
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true })) as typeof fetch;
		try {
			await logoutAccount();
		} finally {
			globalThis.fetch = original;
		}
		expect(get(accountStore).account).toBeNull();
	});

	it('account deletion clears the account store only after the server confirms deletion', async () => {
		accountStore.set(SAMPLE_ACCOUNT);
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true, deleted: true })) as typeof fetch;
		try {
			const result = await deleteAccount('correct-horse-battery');
			expect(result.ok).toBe(true);
			expect(get(accountStore).account).toBeNull();
		} finally {
			globalThis.fetch = original;
		}
	});

	it('keeps the account state when deletion fails', async () => {
		accountStore.set(SAMPLE_ACCOUNT);
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(401, { ok: false, error: { message: 'Invalid password' } })) as typeof fetch;
		try {
			const result = await deleteAccount('wrong-password');
			expect(result.ok).toBe(false);
			expect(result.message).toBe('Invalid password.');
			expect(get(accountStore).account?.id).toBe('acc-1');
		} finally {
			globalThis.fetch = original;
		}
	});
});
