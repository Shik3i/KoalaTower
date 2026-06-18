import { describe, it, expect } from 'vitest';
import { resolveKindStyle } from '../render/EffectsRenderer';

describe('resolveKindStyle — floating-text classification', () => {
	it('returns distinct font sizes per kind so text reads at different scales', () => {
		const damage = resolveKindStyle('damage');
		const crit = resolveKindStyle('crit');
		const energy = resolveKindStyle('energy');
		const alloy = resolveKindStyle('alloy');
		const strange = resolveKindStyle('strange');
		const schematic = resolveKindStyle('schematic');
		const chain = resolveKindStyle('chain');
		const error = resolveKindStyle('error');

		expect(damage.fontSize).toBeGreaterThan(0);
		// Crits are the most prominent.
		expect(crit.fontSize).toBeGreaterThan(damage.fontSize);
		// Resource gains sit between damage and crits.
		expect(energy.fontSize).not.toBe(damage.fontSize);
		expect(alloy.fontSize).not.toBe(damage.fontSize);
		expect(strange.fontSize).not.toBe(damage.fontSize);
		expect(schematic.fontSize).not.toBe(damage.fontSize);
		// Chain text holds position (no upward drift).
		expect(chain.ascent).toBe(0);
		expect(chain.fontSize).toBeGreaterThan(0);
		// Error text is small / unobtrusive.
		expect(error.fontSize).toBeGreaterThan(0);
	});

	it('exposes a strokeWidth so every kind keeps a dark outline for contrast', () => {
		const kinds = ['damage', 'crit', 'energy', 'alloy', 'strange', 'schematic', 'chain', 'error'] as const;
		for (const k of kinds) {
			const s = resolveKindStyle(k);
			expect(s.strokeWidth).toBeGreaterThan(0);
			expect(s.fontWeight).toBe('bold');
		}
	});

	it('falls back to plain damage for unknown / omitted kinds', () => {
		const fallback = resolveKindStyle(undefined);
		const damage = resolveKindStyle('damage');
		expect(fallback).toBe(damage);
		// @ts-expect-error: unknown kind must not crash the renderer
		expect(resolveKindStyle('nonsense')).toBe(damage);
	});
});
