import { get, writable } from 'svelte/store';
import { safeApiJson, type ApiResult } from './apiClient';

export type AccountInfo = {
	id: string;
	username: string;
	displayName: string;
};

type MeResponse = { account: AccountInfo | null };

export type AccountState = {
	account: AccountInfo | null;
	loaded: boolean;
};

function createAccountStore() {
	const store = writable<AccountState>({ account: null, loaded: false });
	let inflight: Promise<void> | null = null;

	return {
		subscribe: store.subscribe,
		refresh(): Promise<void> {
			if (inflight) return inflight;
			inflight = (async () => {
				// /api/auth/me reads the httpOnly session cookie; no token in localStorage.
				const r = await safeApiJson<MeResponse>('/api/auth/me', {}, { timeoutMs: 2500 });
				if (r.ok && r.data) {
					store.set({ account: r.data.account ?? null, loaded: true });
				} else {
					// Offline or logged-out — never blocks local play.
					store.set({ account: null, loaded: true });
				}
			})()
				.catch(() => store.set({ account: null, loaded: true }))
				.finally(() => { inflight = null; });
			return inflight;
		},
		set(account: AccountInfo) {
			store.set({ account, loaded: true });
		},
		clear() {
			store.set({ account: null, loaded: true });
		}
	};
}

export const accountStore = createAccountStore();

export type AuthFormResult = { ok: boolean; message: string };

function authMessage(r: ApiResult<unknown>): string {
	if (r.ok) return 'Request failed.';
	if (r.offline) return 'Online features unavailable. You can keep playing locally.';
	// Deliberately generic — never reveals whether a username exists.
	if (r.status === 401) return 'Invalid username or password.';
	if (r.status === 409) return 'That username is not available.';
	if (r.status === 429) return 'Too many attempts. Please wait a moment.';
	if (r.status === 400) return r.message || 'Please check your input and try again.';
	return r.message || 'Request failed. You can keep playing locally.';
}

export async function registerAccount(username: string, password: string, displayName?: string): Promise<AuthFormResult> {
	const r = await safeApiJson<{ account: AccountInfo }>(
		'/api/auth/register',
		{
			method: 'POST',
			body: JSON.stringify({ username, password, displayName: displayName || undefined })
		},
		{ timeoutMs: 8000 }
	);
	if (r.ok && r.data?.account) {
		accountStore.set(r.data.account);
		return { ok: true, message: 'Account created.' };
	}
	return { ok: false, message: authMessage(r) };
}

export async function loginAccount(username: string, password: string): Promise<AuthFormResult> {
	const r = await safeApiJson<{ account: AccountInfo }>(
		'/api/auth/login',
		{ method: 'POST', body: JSON.stringify({ username, password }) },
		{ timeoutMs: 8000 }
	);
	if (r.ok && r.data?.account) {
		accountStore.set(r.data.account);
		return { ok: true, message: 'Logged in.' };
	}
	return { ok: false, message: authMessage(r) };
}

export async function logoutAccount(): Promise<void> {
	await safeApiJson('/api/auth/logout', { method: 'POST', body: '{}' }, { timeoutMs: 2500 });
	// Local gameplay is untouched — only the online account session is cleared.
	accountStore.clear();
}

export function getCurrentAccount(): AccountInfo | null {
	return get(accountStore).account;
}
