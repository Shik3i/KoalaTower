import type { RequestEvent } from './$types';
import { fail, ok, readJsonObject } from '$lib/server/api';
import { deleteAccountData, getSessionAccount, verifyPassword } from '$lib/server/auth';
import { openDatabase } from '$lib/server/db';
import { clearSessionCookie } from '$lib/server/auth';
import { isRateLimited } from '$lib/server/rateLimit';
import { validatePassword } from '$lib/server/validation';

export const prerender = false;

export async function DELETE(event: RequestEvent): Promise<Response> {
	const contentType = (event.request.headers.get('content-type') ?? '').toLowerCase();
	if (!contentType.includes('application/json')) {
		return fail(400, 'bad_request', 'Content-Type must be application/json');
	}
	if (isRateLimited(`account-delete:${event.getClientAddress()}`)) {
		return fail(429, 'rate_limited', 'Please wait before trying again');
	}

	const account = getSessionAccount(event.cookies);
	if (!account) return fail(401, 'unauthorized', 'Login required');

	const body = await readJsonObject(event, 8 * 1024);
	if (!body) return fail(400, 'bad_request', 'Invalid request body');
	const password = validatePassword(body.password);
	if (!password.ok) return fail(400, 'bad_request', password.message);

	const db = openDatabase();
	const stored = db.prepare('SELECT password_hash AS passwordHash FROM accounts WHERE id = ? AND disabled_at IS NULL').get(account.id) as { passwordHash: string } | undefined;
	if (!stored || !(await verifyPassword(password.value, stored.passwordHash))) {
		return fail(401, 'unauthorized', 'Invalid password');
	}

	if (!deleteAccountData(db, account.id)) return fail(404, 'not_found', 'Account not found');
	clearSessionCookie(event.cookies);
	return ok({ deleted: true });
}
