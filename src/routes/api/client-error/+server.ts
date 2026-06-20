import type { RequestEvent } from './$types';
import { ok } from '$lib/server/api';
import { openDatabase } from '$lib/server/db';
import { logServerError } from '$lib/server/errorLog';

export const prerender = false;

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Fire-and-forget sink for client-side runtime errors (the global error/
 * unhandledrejection banner in +layout posts here). Lets the admin panel see
 * crashes that would otherwise only live in a user's browser console.
 *
 * Best-effort by design: it never 500s. If the DB is unavailable (offline /
 * local-first deploy) the error is simply dropped. logServerError sanitizes
 * and truncates everything it writes.
 */
export async function POST(event: RequestEvent): Promise<Response> {
	try {
		const contentLength = Number(event.request.headers.get('content-length') ?? 0);
		if (contentLength > MAX_BODY_BYTES) return ok({ recorded: false });
		const text = await event.request.text();
		if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return ok({ recorded: false });

		let body: Record<string, unknown> | null = null;
		try {
			const parsed = JSON.parse(text);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				body = parsed as Record<string, unknown>;
			}
		} catch {
			body = null;
		}
		if (!body) return ok({ recorded: false });

		const message = typeof body.message === 'string' ? body.message : '';
		if (!message.trim()) return ok({ recorded: false });

		logServerError(
			{
				level: 'error',
				source: 'client',
				message,
				stack: typeof body.stack === 'string' ? body.stack : null,
				route: typeof body.route === 'string' ? body.route : null,
				userAgent: event.request.headers.get('user-agent')
			},
			openDatabase()
		);
		return ok({ recorded: true });
	} catch {
		// Never let the error sink itself become an error.
		return ok({ recorded: false });
	}
}
