import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, openDatabase } from '../db';
import { getCommunityBuff } from '../communityBuff';
import { GET as getCloudSave } from '../../../routes/api/cloud-save/+server';
import { POST as postKofiWebhook } from '../../../routes/api/kofi/webhook/+server';
import { POST as postUnverifiedLeaderboard } from '../../../routes/api/leaderboard/unverified/+server';

// Ko-fi posts urlencoded bodies whose `data` field is a JSON string.
function kofiFormBody(payload: Record<string, unknown>): string {
	return new URLSearchParams({ data: JSON.stringify(payload) }).toString();
}

function formRequest(payload: Record<string, unknown>): Request {
	return new Request('http://localhost/api/kofi/webhook', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: kofiFormBody(payload)
	});
}

function jsonRequest(payload: Record<string, unknown>): Request {
	return new Request('http://localhost/api/kofi/webhook', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload)
	});
}

describe('online API route guards', () => {
	afterEach(() => {
		closeDatabase();
		delete process.env.KOFI_WEBHOOK_SECRET;
		delete process.env.DATABASE_PATH;
	});

	function useTempDatabase() {
		closeDatabase();
		process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'flatland-routes-')), 'flatland.db');
	}

	it('requires login for cloud save metadata', () => {
		const response = getCloudSave({ cookies: { get: () => undefined } } as never);
		expect(response.status).toBe(401);
	});

	it('rejects invalid unverified leaderboard names before storing', async () => {
		const response = await postUnverifiedLeaderboard({
			getClientAddress: () => '127.0.0.1',
			request: new Request('http://localhost/api/leaderboard/unverified', {
				method: 'POST',
				body: JSON.stringify({
					localPlayerId: '11111111-1111-4111-8111-111111111111',
					displayName: '<script>',
					frontId: 1,
					wave: 10,
					score: 100
				})
			})
		} as never);
		expect(response.status).toBe(400);
	});
});

describe('Ko-fi webhook payload + verification', () => {
	afterEach(() => {
		closeDatabase();
		delete process.env.KOFI_WEBHOOK_SECRET;
		delete process.env.DATABASE_PATH;
	});

	function useTempDatabase() {
		closeDatabase();
		process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'flatland-kofi-')), 'flatland.db');
	}

	it('accepts the Ko-fi form data=<json> payload and creates a verified EUR buff', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-form-1',
				verification_token: 'test-kofi-secret',
				amount: '5',
				currency: 'EUR',
				message: 'For Flatland'
			})
		} as never);
		expect(await response.json()).toMatchObject({ ok: true, recorded: true, verified: true, communityBuffEventCreated: true });
	});

	it('also accepts a raw JSON fallback payload', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: jsonRequest({
				message_id: 'kofi-json-1',
				verification_token: 'test-kofi-secret',
				amount: '4',
				currency: 'EUR'
			})
		} as never);
		expect(await response.json()).toMatchObject({ ok: true, recorded: true, communityBuffEventCreated: true });
	});

	it('rejects a wrong verification_token with 403 and creates no buff', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-bad-token',
				verification_token: 'wrong',
				amount: '5',
				currency: 'EUR'
			})
		} as never);
		expect(response.status).toBe(403);
		const db = openDatabase();
		expect(getCommunityBuff(db).activePercent).toBe(0);
	});

	it('rejects a missing verification_token with 403 when a secret is configured', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-no-token',
				amount: '5',
				currency: 'EUR'
			})
		} as never);
		expect(response.status).toBe(403);
	});

	it('is idempotent for a duplicate message_id (creates at most one buff)', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const payload = {
			message_id: 'kofi-duplicate',
			verification_token: 'test-kofi-secret',
			amount: '5',
			currency: 'EUR',
			message: 'For Flatland FLTD-ABC123'
		};
		const first = await postKofiWebhook({ request: formRequest(payload) } as never);
		const second = await postKofiWebhook({ request: formRequest(payload) } as never);
		expect(await first.json()).toMatchObject({ ok: true, recorded: true, communityBuffEventCreated: true });
		expect(await second.json()).toMatchObject({ ok: true, recorded: false, communityBuffEventCreated: false });
		const db = openDatabase();
		expect(getCommunityBuff(db).activePercent).toBe(5);
	});

	it('records verified non-EUR events without creating a buff', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-usd',
				verification_token: 'test-kofi-secret',
				amount: '5',
				currency: 'USD'
			})
		} as never);
		expect(await response.json()).toMatchObject({ ok: true, recorded: true, verified: true, communityBuffEventCreated: false });
	});

	it('preserves fractional EUR amounts in the community buff', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-fractional',
				verification_token: 'test-kofi-secret',
				amount: 3.5,
				currency: 'EUR'
			})
		} as never);
		const db = openDatabase();
		expect(getCommunityBuff(db).activePercent).toBe(3.5);
	});

	it('does not let a missing/malformed support code block buff creation', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-no-code',
				verification_token: 'test-kofi-secret',
				amount: '2',
				currency: 'EUR',
				message: 'just words, no code here'
			})
		} as never);
		expect(await response.json()).toMatchObject({ communityBuffEventCreated: true });
	});

	it('redacts verification_token from the stored raw payload', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		await postKofiWebhook({
			request: formRequest({
				message_id: 'kofi-redact',
				verification_token: 'test-kofi-secret',
				amount: '1',
				currency: 'EUR'
			})
		} as never);
		const db = openDatabase();
		const row = db.prepare('SELECT raw_json FROM kofi_events WHERE event_id = ?').get('kofi-redact') as { raw_json: string };
		expect(row.raw_json).not.toContain('verification_token');
		expect(row.raw_json).not.toContain('test-kofi-secret');
	});
});
