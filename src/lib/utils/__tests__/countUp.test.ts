import { describe, it, expect } from 'vitest';
import { animateValue, easeOutCubic, formatCompactFor } from '../countUp';

describe('easeOutCubic', () => {
	it('hits 0 at start and 1 at end with a decelerating curve', () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
		// Decelerating means the slope at t=0.5 is steeper than linear at 0.5.
		// For cubic-out: 1 - (1 - 0.5)^3 = 1 - 0.125 = 0.875.
		expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 5);
		// Monotonic increasing
		const a = easeOutCubic(0.3);
		const b = easeOutCubic(0.7);
		expect(b).toBeGreaterThan(a);
	});
});

describe('formatCompactFor', () => {
	it('returns grouped integers below the compact threshold', () => {
		expect(formatCompactFor(0)).toBe('0');
		expect(formatCompactFor(7)).toBe('7');
		expect(formatCompactFor(999)).toBe('999');
		expect(formatCompactFor(1234)).toBe('1,234');
	});

	it('rolls into K/M/B/T formatting above the threshold', () => {
		expect(formatCompactFor(1_000_000)).toBe('1.00M');
		expect(formatCompactFor(2_500_000_000)).toBe('2.50B');
	});

	it('respects a custom compactAbove boundary', () => {
		expect(formatCompactFor(500, 1000)).toBe('500');
		expect(formatCompactFor(1500, 1000)).toBe('1.5K');
	});

	it('handles non-finite values without throwing', () => {
		expect(formatCompactFor(Infinity)).toBe('∞');
		expect(formatCompactFor(-Infinity)).toBe('-∞');
	});
});

describe('animateValue', () => {
	it('resolves immediately with the target value when duration is 0', async () => {
		const frames: number[] = [];
		// Use a synchronous "raf" so the promise resolves deterministically.
		const syncRaf = (cb: FrameRequestCallback) => { cb(0); return 0; };
		await animateValue(10, 50, 0, (v) => frames.push(v), { raf: syncRaf as unknown as typeof requestAnimationFrame });
		expect(frames).toEqual([50]);
	});

	it('resolves immediately with target when values are non-finite', async () => {
		const frames: number[] = [];
		const syncRaf = (cb: FrameRequestCallback) => { cb(0); return 0; };
		await animateValue(NaN, 50, 400, (v) => frames.push(v), { raf: syncRaf as unknown as typeof requestAnimationFrame });
		expect(frames).toEqual([50]);
	});

	it('animates through interpolated values and ends exactly at target', async () => {
		const frames: number[] = [];
		let t = 0;
		const syncRaf = (cb: FrameRequestCallback) => { t += 100; cb(t); return 0; };
		await animateValue(0, 100, 400, (v) => frames.push(v), {
			raf: syncRaf as unknown as typeof requestAnimationFrame,
			now: () => t,
		});
		// Final frame must be exactly the target.
		expect(frames[frames.length - 1]).toBe(100);
		// All frames within [0, 100].
		for (const f of frames) expect(f).toBeGreaterThanOrEqual(0);
		for (const f of frames) expect(f).toBeLessThanOrEqual(100);
	});

	it('clamps the final value to the target even with overshoot timing', async () => {
		const frames: number[] = [];
		let t = 0;
		const syncRaf = (cb: FrameRequestCallback) => { t += 1000; cb(t); return 0; };
		await animateValue(0, 42, 100, (v) => frames.push(v), {
			raf: syncRaf as unknown as typeof requestAnimationFrame,
			now: () => t,
		});
		expect(frames[frames.length - 1]).toBe(42);
	});
});
