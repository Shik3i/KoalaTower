import { describe, it, expect } from 'vitest';
import { resolveKindStyle } from '../render/EffectsRenderer';
import { FLOATING_TEXT_COLORS, formatFloatingText } from '../systems/enemySystem';

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

	it('formats resource gains without plus signs and with compact glyphs', () => {
		expect(formatFloatingText('energy', 1)).toBe('1⚡');
		expect(formatFloatingText('alloy', 12)).toBe('12 ✨');
		expect(formatFloatingText('strange', 3)).toBe('3 ◆');
		expect(formatFloatingText('schematic', 2)).toBe('2 ▣');
		for (const kind of ['energy', 'alloy', 'strange', 'schematic'] as const) {
			expect(formatFloatingText(kind, 5)).not.toContain('+');
		}
	});

	it('formats damage without minus signs and crits distinctly', () => {
		expect(formatFloatingText('damage', 50)).toBe('50');
		expect(formatFloatingText('crit', 120)).toBe('CRIT 120');
		expect(formatFloatingText('damage', 50)).not.toContain('-');
		expect(formatFloatingText('crit', 120)).not.toContain('-');
		expect(formatFloatingText('crit', 120)).toContain('CRIT');
	});

	it('maps floating text kinds to distinct color tokens', () => {
		expect(FLOATING_TEXT_COLORS.damage).toBe(0xF0F4FF);
		expect(FLOATING_TEXT_COLORS.crit).not.toBe(FLOATING_TEXT_COLORS.damage);
		expect(FLOATING_TEXT_COLORS.energy).not.toBe(FLOATING_TEXT_COLORS.alloy);
		expect(FLOATING_TEXT_COLORS.strange).not.toBe(FLOATING_TEXT_COLORS.schematic);
		expect(FLOATING_TEXT_COLORS.chain).not.toBe(FLOATING_TEXT_COLORS.damage);
	});
});
