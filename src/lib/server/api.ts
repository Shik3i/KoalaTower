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

export async function readJsonObject(event: RequestEvent): Promise<Record<string, unknown> | null> {
	try {
		const body = await event.request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
		return body as Record<string, unknown>;
	} catch {
		return null;
	}
}
