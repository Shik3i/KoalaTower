import { describe, expect, it } from 'vitest';
import { computeTooltipPosition } from '../tooltip';

const viewport = { width: 1000, height: 800 };
const tip = { width: 200, height: 80 };

function anchorAt(left: number, top: number, w = 40, h = 20) {
	return { left, top, right: left + w, bottom: top + h, width: w, height: h };
}

describe('computeTooltipPosition', () => {
	it('places above and horizontally centered when there is room', () => {
		const a = anchorAt(500, 400);
		const { left, top, placement } = computeTooltipPosition(a, tip, viewport, 'top');
		expect(placement).toBe('top');
		// centered: anchor center 520 - tipWidth/2 100 = 420
		expect(left).toBe(420);
		// above: anchor top 400 - gap 8 - tipHeight 80 = 312
		expect(top).toBe(312);
	});

	it('flips to bottom when there is no room above', () => {
		const a = anchorAt(500, 10);
		const { placement } = computeTooltipPosition(a, tip, viewport, 'top');
		expect(placement).toBe('bottom');
	});

	it('flips right when there is no room on the left', () => {
		const a = anchorAt(5, 400);
		const { placement } = computeTooltipPosition(a, tip, viewport, 'left');
		expect(placement).toBe('right');
	});

	it('clamps horizontally so the tip never overflows the right edge', () => {
		const a = anchorAt(980, 400);
		const { left } = computeTooltipPosition(a, tip, viewport, 'top');
		expect(left).toBeLessThanOrEqual(viewport.width - tip.width - 6);
		expect(left).toBeGreaterThanOrEqual(6);
	});

	it('clamps to the left margin for an anchor at x=0', () => {
		const a = anchorAt(0, 400);
		const { left } = computeTooltipPosition(a, tip, viewport, 'top');
		expect(left).toBe(6);
	});

	it('keeps preferred placement when both sides fit', () => {
		const a = anchorAt(500, 400);
		expect(computeTooltipPosition(a, tip, viewport, 'bottom').placement).toBe('bottom');
		expect(computeTooltipPosition(a, tip, viewport, 'right').placement).toBe('right');
	});
});
