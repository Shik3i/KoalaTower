import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase } from '../db';
import { GET as getCloudSave } from '../../../routes/api/cloud-save/+server';
import { POST as postKofiWebhook } from '../../../routes/api/kofi/webhook/+server';
import { POST as postUnverifiedLeaderboard } from '../../../routes/api/leaderboard/unverified/+server';

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

	it('creates at most one community buff for a duplicate verified Ko-fi EUR event', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const body = JSON.stringify({
			message_id: 'kofi-duplicate',
			amount: '5',
			currency: 'EUR',
			message: 'For Flatland FLTD-ABC123'
		});
		const makeEvent = () => ({
			request: new Request('http://localhost/api/kofi/webhook', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-flatland-kofi-secret': 'test-kofi-secret' },
				body
			})
		}) as never;
		const first = await postKofiWebhook(makeEvent());
		const second = await postKofiWebhook(makeEvent());
		expect(await first.json()).toMatchObject({ ok: true, recorded: true, communityBuffEventCreated: true });
		expect(await second.json()).toMatchObject({ ok: true, recorded: false, communityBuffEventCreated: false });
	});

	it('records verified non-EUR Ko-fi events without creating a buff', async () => {
		useTempDatabase();
		process.env.KOFI_WEBHOOK_SECRET = 'test-kofi-secret';
		const response = await postKofiWebhook({
			request: new Request('http://localhost/api/kofi/webhook', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-flatland-kofi-secret': 'test-kofi-secret' },
				body: JSON.stringify({ message_id: 'kofi-usd', amount: '5', currency: 'USD' })
			})
		} as never);
		expect(await response.json()).toMatchObject({ ok: true, recorded: true, verified: true, communityBuffEventCreated: false });
	});
});
