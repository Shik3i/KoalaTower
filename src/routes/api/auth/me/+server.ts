import type { RequestEvent } from './$types';
import { ok } from '$lib/server/api';
import { getSessionAccount } from '$lib/server/auth';

export const prerender = false;

export function GET(event: RequestEvent): Response {
	const account = getSessionAccount(event.cookies);
	return ok({
		account: account ? { id: account.id, username: account.username, displayName: account.display_name } : null
	});
}
