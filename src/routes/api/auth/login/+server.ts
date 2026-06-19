import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { createSession, DUMMY_PASSWORD_HASH, findAccountByUsername, setSessionCookie, verifyPassword } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { requireAuthSecrets } from '$lib/server/env';
import { isRateLimited } from '$lib/server/rateLimit';
import { validatePassword, validateUsername } from '$lib/server/validation';

export const prerender = false;

const GENERIC_LOGIN_ERROR = 'Invalid username or password';

export async function POST(event: RequestEvent): Promise<Response> {
	if (isRateLimited(`login:${event.getClientAddress()}`)) return fail(429, 'rate_limited', 'Please wait before trying again');
	requireAuthSecrets();
	const body = await readJsonObject(event, 8 * 1024);
	if (!body) return fail(400, 'bad_request', GENERIC_LOGIN_ERROR);
	const username = validateUsername(body.username);
	const password = validatePassword(body.password);
	if (!username.ok || !password.ok) return fail(401, 'unauthorized', GENERIC_LOGIN_ERROR);

	const db = openDatabase();
	const account = findAccountByUsername(db, username.value);
	// Always run one bcrypt compare — against the real hash, or a fixed dummy
	// hash when the user does not exist — so both paths take the same time and
	// cannot be used to enumerate valid usernames via response latency.
	const passwordOk = await verifyPassword(password.value, account?.password_hash ?? DUMMY_PASSWORD_HASH);
	if (!account || !passwordOk) {
		return fail(401, 'unauthorized', GENERIC_LOGIN_ERROR);
	}
	const token = createSession(db, account.id, event);
	setSessionCookie(event.cookies, token);
	return ok({ account: { id: account.id, username: account.username, displayName: account.display_name } });
}
