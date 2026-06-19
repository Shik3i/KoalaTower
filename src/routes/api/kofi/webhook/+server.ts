import { randomUUID } from 'node:crypto';
import type { RequestEvent } from './$types';
import { fail, ok } from '$lib/server/api';
import { insertCommunityBuffEvent } from '$lib/server/communityBuff';
import { openDatabase } from '$lib/server/db';
import { getKofiWebhookSecret } from '$lib/server/env';
import { findSupportCode } from '$lib/server/supportCode';

export const prerender = false;

type KofiPayload = {
	message_id?: unknown;
	kofi_transaction_id?: unknown;
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

export async function POST(event: RequestEvent): Promise<Response> {
	const configuredSecret = getKofiWebhookSecret();
	if (configuredSecret) {
		const supplied = event.request.headers.get('x-flatland-kofi-secret') || new URL(event.request.url).searchParams.get('secret');
		if (supplied !== configuredSecret) return fail(403, 'forbidden', 'Webhook secret mismatch');
	}
	const webhookVerified = !!configuredSecret;

	let payload: KofiPayload;
	try {
		payload = await event.request.json() as KofiPayload;
	} catch {
		return fail(400, 'bad_request', 'Invalid JSON payload');
	}

	const eventId = firstString(payload.message_id, payload.kofi_transaction_id) ?? randomUUID();
	const rawJson = JSON.stringify(payload);
	const amount = typeof payload.amount === 'number' ? payload.amount : Number(payload.amount ?? 0);
	const currency = firstString(payload.currency) ?? '';
	const supportCode = findSupportCode(firstString(payload.message));
	const db = openDatabase();
	const now = new Date().toISOString();
	db.prepare(`
INSERT OR IGNORE INTO kofi_events (id, event_id, raw_json, amount, currency, support_code, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(randomUUID(), eventId, rawJson, Number.isFinite(amount) ? amount : 0, currency, supportCode, now);

	if (webhookVerified && Number.isFinite(amount) && amount > 0) {
		insertCommunityBuffEvent(db, 'kofi', eventId, amount, new Date());
	}

	return ok({ recorded: true, verified: webhookVerified, communityBuffEventCreated: webhookVerified && Number.isFinite(amount) && amount > 0 });
}
