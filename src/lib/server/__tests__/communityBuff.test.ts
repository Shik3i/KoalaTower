import { describe, expect, it } from 'vitest';
import { calculateCommunityBuff } from '../communityBuff';

describe('community buff calculation', () => {
	const now = new Date('2026-06-19T00:00:00.000Z');

	it('returns zero when no events are active', () => {
		expect(calculateCommunityBuff([], now)).toMatchObject({ activePercent: 0, activeEvents: 0 });
	});

	it('sums active events and ignores expired events', () => {
		const result = calculateCommunityBuff([
			{ percent: 10, expires_at: '2026-06-20T00:00:00.000Z' },
			{ percent: 15, expires_at: '2026-06-18T00:00:00.000Z' },
			{ percent: 5, expires_at: '2026-06-21T00:00:00.000Z' }
		], now);
		expect(result.activePercent).toBe(15);
		expect(result.activeEvents).toBe(2);
	});

	it('caps active events at 100 percent', () => {
		const result = calculateCommunityBuff([
			{ percent: 90, expires_at: '2026-06-20T00:00:00.000Z' },
			{ percent: 40, expires_at: '2026-06-21T00:00:00.000Z' }
		], now);
		expect(result.activePercent).toBe(100);
		expect(result.capPercent).toBe(100);
	});

	it('preserves fractional amounts instead of flooring', () => {
		const result = calculateCommunityBuff([
			{ percent: 3.5, expires_at: '2026-06-20T00:00:00.000Z' }
		], now);
		expect(result.activePercent).toBe(3.5);
	});

	it('sums fractional amounts and clamps above the cap', () => {
		expect(calculateCommunityBuff([
			{ percent: 3.5, expires_at: '2026-06-20T00:00:00.000Z' },
			{ percent: 2.25, expires_at: '2026-06-21T00:00:00.000Z' }
		], now).activePercent).toBe(5.75);
		expect(calculateCommunityBuff([
			{ percent: 99.6, expires_at: '2026-06-20T00:00:00.000Z' },
			{ percent: 0.5, expires_at: '2026-06-21T00:00:00.000Z' }
		], now).activePercent).toBe(100);
	});
});
