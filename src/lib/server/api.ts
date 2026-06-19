import { json, type RequestEvent } from '@sveltejs/kit';

export type ApiErrorCode =
	| 'bad_request'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'rate_limited'
	| 'server_error';

export function ok<T extends Record<string, unknown>>(body: T, init?: ResponseInit): Response {
	return json({ ok: true, ...body }, init);
}

export function fail(status: number, code: ApiErrorCode, message: string): Response {
	return json({ ok: false, error: { code, message } }, { status });
}

export async function readJsonObject(event: RequestEvent, maxBytes = 64 * 1024): Promise<Record<string, unknown> | null> {
	try {
		// Require an explicit JSON content type. This is also our CSRF guard for
		// state-changing API routes: a cross-site page cannot set
		// `Content-Type: application/json` without triggering a CORS preflight
		// that this server never approves, so forged form/`text/plain` posts are
		// rejected here. (The Ko-fi webhook uses its own form-aware reader and is
		// intentionally not affected.) All first-party clients send this header.
		const contentType = (event.request.headers.get('content-type') ?? '').toLowerCase();
		if (!contentType.includes('application/json')) return null;
		const contentLength = Number(event.request.headers.get('content-length') ?? 0);
		if (contentLength > maxBytes) return null;
		const text = await event.request.text();
		if (new TextEncoder().encode(text).length > maxBytes) return null;
		const body = JSON.parse(text);
		if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
		return body as Record<string, unknown>;
	} catch {
		return null;
	}
}
