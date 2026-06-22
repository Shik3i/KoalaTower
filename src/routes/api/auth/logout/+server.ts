import type { RequestEvent } from './$types';
import { fail, ok } from '$lib/server/api';
import { destroySession } from '$lib/server/auth';

export const prerender = false;

export function POST(event: RequestEvent): Response {
	// Require Content-Type: application/json as a CSRF guard.
	// A cross-site <form> POST cannot set this header without a CORS preflight
	// that this server never approves, so forged form posts are rejected here.
	const contentType = (event.request.headers.get('content-type') ?? '').toLowerCase();
	if (!contentType.includes('application/json')) {
		return fail(400, 'bad_request', 'Content-Type must be application/json');
	}
	destroySession(event.cookies);
	return ok({});
}
