import { describe, it, expect } from 'vitest';
import { formatCompact } from '../balance/balanceMath';

describe('formatCompact', () => {
	it('shows raw integers below 1000', () => {
		expect(formatCompact(0)).toBe('0');
		expect(formatCompact(7)).toBe('7');
		expect(formatCompact(999)).toBe('999');
	});

	it('uses K/M/B/T suffixes at the right magnitudes', () => {
		expect(formatCompact(1500)).toBe('1.5K');
		expect(formatCompact(2_500_000)).toBe('2.50M');
		expect(formatCompact(3_200_000_000)).toBe('3.20B');
		expect(formatCompact(4_500_000_000_000)).toBe('4.50T');
	});

	it('extends past trillions for the long-tail economy instead of overflowing T', () => {
		expect(formatCompact(1e15)).toBe('1.00Qa');
		expect(formatCompact(1e18)).toBe('1.00Qi');
		expect(formatCompact(2.5e21)).toBe('2.50Sx');
	});

	it('handles non-finite and negative values defensively', () => {
		expect(formatCompact(Infinity)).toBe('∞');
		expect(formatCompact(-1500)).toBe('-1.5K');
	});

	it('rolls the suffix up instead of printing a 1000+ mantissa at a boundary', () => {
		// Naive formatting would render 999_999 as "1000.0K"; the roll-up gives "1.00M".
		const s = formatCompact(999_999);
		expect(s).toBe('1.00M');
		expect(parseFloat(s)).toBeLessThan(1000);
	});
});
