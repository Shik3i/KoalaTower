import type { RequestEvent } from './$types';
import { ok } from '$lib/server/api';
import { destroySession } from '$lib/server/auth';

export const prerender = false;

export function POST(event: RequestEvent): Response {
	destroySession(event.cookies);
	return ok({});
}
