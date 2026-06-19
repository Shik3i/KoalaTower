import { describe, expect, it } from 'vitest';
import {
	applyCommunityBuff,
	clampCommunityBuffPercent,
	formatCommunityBuffPercent,
	COMMUNITY_BUFF_CLIENT_CAP_PERCENT
} from '../communityBuffClient';

describe('community buff client math', () => {
	it('0% buff changes nothing', () => {
		expect(applyCommunityBuff(1000, 0)).toBe(1000);
		expect(applyCommunityBuff(0, 0)).toBe(0);
	});

	it('a 3.5% buff increases Alloy by 3.5%', () => {
		expect(applyCommunityBuff(1000, 3.5)).toBe(1035);
		expect(applyCommunityBuff(200, 3.5)).toBe(207); // 200 * 1.035 = 207
	});

	it('> 100% clamps to the 100% cap', () => {
		expect(applyCommunityBuff(1000, 250)).toBe(2000);
		expect(clampCommunityBuffPercent(250)).toBe(COMMUNITY_BUFF_CLIENT_CAP_PERCENT);
	});

	it('offline/garbage inputs fall back to 0%', () => {
		expect(clampCommunityBuffPercent(NaN)).toBe(0);
		expect(clampCommunityBuffPercent(-5)).toBe(0);
		expect(clampCommunityBuffPercent('garbage')).toBe(0);
		expect(clampCommunityBuffPercent(null)).toBe(0);
		expect(applyCommunityBuff(500, 'garbage')).toBe(500);
	});

	it('never grants negative alloy', () => {
		expect(applyCommunityBuff(-100, 10)).toBe(0);
	});

	it('formatting', () => {
		expect(formatCommunityBuffPercent(3.5)).toBe('+3.5%');
		expect(formatCommunityBuffPercent(0)).toBe('0%');
		expect(formatCommunityBuffPercent(123)).toBe('+100%');
	});
});
