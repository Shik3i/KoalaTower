import { describe, expect, it } from 'vitest';
import { createRunRng, nextRunRandom, normalizeSeed } from '../engine/runRng';

describe('run RNG', () => {
	it('repeats the exact sequence for the same seed', () => {
		const first = createRunRng(0x1234_5678);
		const second = createRunRng(0x1234_5678);

		const firstSequence = Array.from({ length: 16 }, () => nextRunRandom(first));
		const secondSequence = Array.from({ length: 16 }, () => nextRunRandom(second));

		expect(firstSequence).toEqual(secondSequence);
		expect(first.calls).toBe(16);
		expect(second.calls).toBe(16);
	});

	it('normalizes seeds to unsigned 32-bit integers', () => {
		expect(normalizeSeed(-1)).toBe(0xFFFF_FFFF);
		expect(normalizeSeed(0x1_0000_0001)).toBe(1);
		expect(normalizeSeed(Number.NaN)).toBe(0);
	});

	it('keeps generated values inside the expected range', () => {
		const rng = createRunRng(42);
		const values = Array.from({ length: 100 }, () => nextRunRandom(rng));

		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
	});
});
