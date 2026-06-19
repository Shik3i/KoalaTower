import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Force production mode for this file: a missing KOFI_WEBHOOK_SECRET must
// disable the endpoint entirely. `vi.mock` is hoisted to the top of the file.
vi.mock('$app/environment', () => ({ dev: false, browser: false, building: false, version: 'test' }));

import { closeDatabase, openDatabase } from '../db';
import { getCommunityBuff } from '../communityBuff';
import { POST as postKofiWebhook } from '../../../routes/api/kofi/webhook/+server';

function kofiFormBody(payload: Record<string, unknown>): string {
	return new URLSearchParams({ data: JSON.stringify(payload) }).toString();
}

describe('Ko-fi webhook production guard', () => {
	beforeEach(() => {
		closeDatabase();
		delete process.env.KOFI_WEBHOOK_SECRET;
		delete process.env.DATABASE_PATH;
		process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'flatland-kofi-prod-')), 'flatland.db');
	});

	afterEach(() => {
		closeDatabase();
		delete process.env.KOFI_WEBHOOK_SECRET;
		delete process.env.DATABASE_PATH;
	});

	it('refuses to process when the secret is missing in production', async () => {
		const response = await postKofiWebhook({
			request: new Request('http://localhost/api/kofi/webhook', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: kofiFormBody({
					message_id: 'kofi-prod-no-secret',
					amount: '5',
					currency: 'EUR'
				})
			})
		} as never);
		expect(response.status).toBe(503);
		// No event recorded, no buff created.
		const db = openDatabase();
		const events = db.prepare('SELECT COUNT(*) AS n FROM kofi_events').get() as { n: number };
		expect(events.n).toBe(0);
		expect(getCommunityBuff(db).activePercent).toBe(0);
	});

	it('still processes correctly in production when the secret IS configured', async () => {
		process.env.KOFI_WEBHOOK_SECRET = 'prod-secret';
		const response = await postKofiWebhook({
			request: new Request('http://localhost/api/kofi/webhook', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: kofiFormBody({
					message_id: 'kofi-prod-ok',
					verification_token: 'prod-secret',
					amount: '5',
					currency: 'EUR'
				})
			})
		} as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ verified: true, communityBuffEventCreated: true });
	});
});
