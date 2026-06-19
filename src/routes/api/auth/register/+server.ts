import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { createAccount, createSession, setSessionCookie } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { requireAuthSecrets } from '$lib/server/env';
import { isRateLimited } from '$lib/server/rateLimit';
import { validateDisplayName, validatePassword, validateUsername } from '$lib/server/validation';

export const prerender = false;

export async function POST(event: RequestEvent): Promise<Response> {
	if (isRateLimited(`register:${event.getClientAddress()}`)) return fail(429, 'rate_limited', 'Please wait before trying again');
	requireAuthSecrets();
	const body = await readJsonObject(event);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	const username = validateUsername(body.username);
	const password = validatePassword(body.password);
	const displayName = validateDisplayName(body.displayName, username.ok ? username.value : 'Flatland Player');
	if (!username.ok) return fail(400, 'bad_request', username.message);
	if (!password.ok) return fail(400, 'bad_request', password.message);
	if (!displayName.ok) return fail(400, 'bad_request', displayName.message);

	const db = openDatabase();
	try {
		const account = createAccount(db, username.value, displayName.value, password.value);
		const token = createSession(db, account.id, event);
		setSessionCookie(event.cookies, token);
		return ok({ account: { id: account.id, username: account.username, displayName: account.display_name } }, { status: 201 });
	} catch {
		return fail(409, 'conflict', 'Username is not available');
	}
}
