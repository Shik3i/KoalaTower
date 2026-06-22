import { describe, expect, it } from 'vitest';
import { fetchCloudSaveMeta, fetchCloudSaveFull, uploadCloudSave } from '../cloudSaveClient';

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function makeFetch(responder: () => Response | Promise<Response>): typeof fetch {
	return (((_input: RequestInfo | URL, _init?: RequestInit) => responder()) as unknown) as typeof fetch;
}

const META = { updatedAt: '2026-06-19T00:00:00.000Z', schemaVersion: 17, gameVersion: '0.5.7', saveHash: 'abc' };

describe('cloud save client', () => {
	it('treats unauthenticated (401) as a normal failure, not offline', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(401, { ok: false, error: { code: 'unauthorized', message: 'Login required' } })) as typeof fetch;
		try {
			const r = await fetchCloudSaveMeta();
			expect(r.ok).toBe(false);
			if (!r.ok) {
				expect(r.offline).toBe(false);
				expect(r.message).toContain('Login');
			}
		} finally {
			globalThis.fetch = original;
		}
	});

	it('returns metadata when the cloud save exists', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true, exists: true, metadata: META, saveJson: null })) as typeof fetch;
		try {
			const r = await fetchCloudSaveMeta();
			expect(r.ok).toBe(true);
			if (r.ok) {
				expect(r.exists).toBe(true);
				expect(r.metadata?.saveHash).toBe('abc');
			}
		} finally {
			globalThis.fetch = original;
		}
	});

	it('returns exists=false when there is no cloud save', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true, exists: false, metadata: null, saveJson: null })) as typeof fetch;
		try {
			const r = await fetchCloudSaveMeta();
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.exists).toBe(false);
		} finally {
			globalThis.fetch = original;
		}
	});

	it('full fetch includes the save payload', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => jsonResponse(200, { ok: true, exists: true, metadata: META, saveJson: { totalAlloy: 5 } })) as typeof fetch;
		try {
			const r = await fetchCloudSaveFull();
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.saveJson?.totalAlloy).toBe(5);
		} finally {
			globalThis.fetch = original;
		}
	});

	it('upload returns updated metadata', async () => {
		const original = globalThis.fetch;
		let sentBody: unknown;
		globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
			sentBody = init?.body ? JSON.parse(String(init.body)) : null;
			return Promise.resolve(jsonResponse(200, { ok: true, ...META }));
		}) as unknown as typeof fetch;
		try {
			const r = await uploadCloudSave({ totalAlloy: 5 }, 17, '0.5.7');
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.metadata.saveHash).toBe('abc');
			expect((sentBody as { saveJson: { totalAlloy: number } }).saveJson.totalAlloy).toBe(5);
		} finally {
			globalThis.fetch = original;
		}
	});

	it('network failure is reported as offline and does not throw', async () => {
		const original = globalThis.fetch;
		globalThis.fetch = makeFetch(() => Promise.reject(new Error('offline'))) as typeof fetch;
		try {
			const r = await uploadCloudSave({ totalAlloy: 5 }, 17, '0.5.7');
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.offline).toBe(true);
		} finally {
			globalThis.fetch = original;
		}
	});
});
