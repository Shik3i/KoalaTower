import { describe, expect, it } from 'vitest';
import { safeApiJson } from '../apiClient';

describe('safeApiJson', () => {
	it('returns an offline result when fetch fails', async () => {
		const result = await safeApiJson('/api/health', {}, {
			fetchImpl: async () => {
				throw new TypeError('network down');
			}
		});
		expect(result).toEqual({ ok: false, offline: true, message: 'Online features unavailable' });
	});
});
