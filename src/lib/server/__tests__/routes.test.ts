import { describe, expect, it } from 'vitest';
import { GET as getCloudSave } from '../../../routes/api/cloud-save/+server';
import { POST as postUnverifiedLeaderboard } from '../../../routes/api/leaderboard/unverified/+server';

describe('online API route guards', () => {
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
});
