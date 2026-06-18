import { describe, expect, it } from 'vitest';
import { TierId } from '../engine/gameTypes';
import {
	getFrontBandPanels,
	getFrontSelectorStatus,
	getSelectedFrontBandIndex,
	normalizeSelectedFront,
} from '../balance/frontSelector';

describe('Front selector grouping', () => {
	it('groups sixteen Fronts into four bands of four', () => {
		const panels = getFrontBandPanels();
		expect(panels).toHaveLength(4);
		for (const panel of panels) {
			expect(panel.fronts).toHaveLength(4);
		}
		expect(panels.flatMap((panel) => panel.fronts)).toHaveLength(16);
	});

	it('maps selected Fronts to the correct horizontal band index', () => {
		expect(getSelectedFrontBandIndex(TierId.Tier1)).toBe(0);
		expect(getSelectedFrontBandIndex(TierId.Tier5)).toBe(1);
		expect(getSelectedFrontBandIndex(TierId.Tier9)).toBe(2);
		expect(getSelectedFrontBandIndex(TierId.Tier13)).toBe(3);
	});

	it('keeps the selected Front valid against unlock state', () => {
		expect(normalizeSelectedFront(TierId.Tier3, [TierId.Tier1, TierId.Tier2, TierId.Tier3])).toBe(TierId.Tier3);
		expect(normalizeSelectedFront(TierId.Tier3, [TierId.Tier1])).toBe(TierId.Tier1);
	});

	it('keeps locked requirements visible through selector status', () => {
		const locked = getFrontBandPanels()[0]!.fronts[1]!;
		expect(getFrontSelectorStatus(locked, [TierId.Tier1], {})).toContain('Reach Wave');
	});
});
