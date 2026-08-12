import { describe, expect, it } from 'vitest';
import { calculateUnverifiedScore } from '../balance/communityLeaderboard';

describe('unverified community score', () => {
	it('combines front, wave, kills, and bosses into a stable fun score', () => {
		expect(calculateUnverifiedScore({ front: 2, wave: 10, kills: 50, bosses: 1 })).toBe(13_200);
	});

	it('clamps malformed and negative values safely', () => {
		expect(calculateUnverifiedScore({ front: -2, wave: Number.NaN, kills: -4, bosses: Number.POSITIVE_INFINITY })).toBe(100);
	});
});
