import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok } from '$lib/server/api';
import { insertCommunityBuffEvent } from '$lib/server/communityBuff';
import { openDatabase } from '$lib/server/db';
import { isKofiWebhookEnabled, getKofiWebhookSecret } from '$lib/server/env';
import { findSupportCode } from '$lib/server/supportCode';

export const prerender = false;

const MAX_PAYLOAD_BYTES = 128 * 1024;

type KofiPayload = {
	message_id?: unknown;
	kofi_transaction_id?: unknown;
	verification_token?: unknown;
	amount?: unknown;
	currency?: unknown;
	message?: unknown;
};

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

/**
 * Ko-fi posts its webhook as application/x-www-form-urlencoded (or
 * multipart/form-data) with a single `data` field whose value is a JSON string.
 * Some integrations/tests send raw JSON directly. This reader accepts both and
 * never throws.
 */
async function readKofiPayload(event: RequestEvent): Promise<Record<string, unknown> | null> {
	try {
		const contentLength = Number(event.request.headers.get('content-length') ?? 0);
		if (contentLength > MAX_PAYLOAD_BYTES) return null;
		const contentType = (event.request.headers.get('content-type') ?? '').toLowerCase();
		const text = await event.request.text();
		if (new TextEncoder().encode(text).length > MAX_PAYLOAD_BYTES) return null;

		if (contentType.includes('application/x-www-form-urlencoded')) {
			const dataField = new URLSearchParams(text).get('data');
			if (dataField) {
				const parsed = JSON.parse(dataField);
				if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
					return parsed as Record<string, unknown>;
				}
			}
		}

		const body = JSON.parse(text);
		if (body && typeof body === 'object' && !Array.isArray(body)) {
			return body as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

/** Strip the sensitive verification_token before the raw payload is persisted. */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
	const clone: Record<string, unknown> = { ...payload };
	delete clone.verification_token;
	return clone;
}

export async function POST(event: RequestEvent): Promise<Response> {
	// Production guard: with no secret configured the endpoint must refuse to
	// record anything. Dev/test is permitted to run without a secret.
	if (!isKofiWebhookEnabled()) {
		return fail(503, 'server_error', 'Webhook not configured');
	}

	const payload = await readKofiPayload(event);
	if (!payload) return fail(400, 'bad_request', 'Invalid payload');

	// Verify Ko-fi's verification_token against the configured secret. The token
	// must come from the payload, never from a client-controlled query/header.
	const configuredSecret = getKofiWebhookSecret();
	const suppliedToken = firstString(payload.verification_token);
	const tokenVerified = configuredSecret === null || (suppliedToken !== null && suppliedToken === configuredSecret);
	// dev-only fallback (no secret configured): treated as verified for local tests
	const webhookVerified = tokenVerified || configuredSecret === null;
	if (!webhookVerified) {
		return fail(403, 'forbidden', 'Webhook verification failed');
	}

	const kofi = payload as KofiPayload;
	const eventId = firstString(kofi.message_id, kofi.kofi_transaction_id) ?? randomUUID();
	const rawJson = JSON.stringify(sanitizePayload(payload));
	const amount = typeof kofi.amount === 'number' ? kofi.amount : Number(kofi.amount ?? 0);
	const currency = (firstString(kofi.currency) ?? '').toUpperCase();
	const supportCode = findSupportCode(firstString(kofi.message));

	const db = openDatabase();
	const now = new Date().toISOString();
	const insertResult = db.prepare(`
INSERT OR IGNORE INTO kofi_events (id, event_id, raw_json, amount, currency, support_code, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(randomUUID(), eventId, rawJson, Number.isFinite(amount) ? amount : 0, currency, supportCode, now);

	const communityBuffEventCreated = insertResult.changes > 0 && webhookVerified && Number.isFinite(amount) && amount > 0 && currency === 'EUR';
	if (communityBuffEventCreated) {
		insertCommunityBuffEvent(db, 'kofi', eventId, amount, new Date());
	}

	return ok({ recorded: insertResult.changes > 0, verified: webhookVerified, communityBuffEventCreated });
}
