import { describe, it, expect } from 'vitest';
import { computePlacement } from './viewportPlacement';

function rect(left: number, top: number, width: number, height: number): DOMRect {
	return { left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => {} };
}

describe('computePlacement', () => {
	const margin = 14;
	const vw = 1440;
	const vh = 900;

	it('places below when enough space', () => {
		const target = rect(200, 200, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 320, tooltipHeight: 200, preferred: 'bottom', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('bottom');
		expect(result.top).toBeGreaterThanOrEqual(target.bottom + 12);
	});

	it('flips to top when not enough space below', () => {
		const target = rect(200, 750, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 320, tooltipHeight: 200, preferred: 'bottom', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('top');
		expect(result.top + 200).toBeLessThanOrEqual(target.top - 12);
	});

	it('places left when enough space left', () => {
		const target = rect(300, 300, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 200, tooltipHeight: 100, preferred: 'left', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('left');
		expect(result.left + 200).toBeLessThanOrEqual(target.left - 12);
	});

	it('flips to right when not enough space left', () => {
		const target = rect(10, 300, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 200, tooltipHeight: 100, preferred: 'left', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('right');
		expect(result.left).toBeGreaterThanOrEqual(target.right + 12);
	});

	it('clamps within viewport when no side fits', () => {
		const target = rect(5, 5, 50, 20);
		const result = computePlacement({ targetRect: target, tooltipWidth: 400, tooltipHeight: 300, preferred: 'bottom', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('center');
		expect(result.left).toBeGreaterThanOrEqual(margin);
		expect(result.top).toBeGreaterThanOrEqual(margin);
		expect(result.left + 400).toBeLessThanOrEqual(vw - margin);
		expect(result.top + 300).toBeLessThanOrEqual(vh - margin);
	});

	it('handles right edge overflow', () => {
		const target = rect(1300, 300, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 200, tooltipHeight: 100, preferred: 'right', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('left');
		expect(result.left + 200).toBeLessThanOrEqual(target.left - 12);
	});

	it('flips bottom to top when bottom overflows and top fits', () => {
		const target = rect(400, 800, 100, 40);
		const result = computePlacement({ targetRect: target, tooltipWidth: 250, tooltipHeight: 120, preferred: 'bottom', viewportWidth: vw, viewportHeight: vh, margin });
		expect(result.actualPlacement).toBe('top');
	});

	it('center placement stays within bounds', () => {
		const target = rect(0, 0, 0, 0);
		const result = computePlacement({ targetRect: target, tooltipWidth: 300, tooltipHeight: 200, preferred: 'center', viewportWidth: 390, viewportHeight: 844, margin: 14 });
		expect(result.left).toBeGreaterThanOrEqual(14);
		expect(result.top).toBeGreaterThanOrEqual(14);
		expect(result.left + 300).toBeLessThanOrEqual(390 - 14);
		expect(result.top + 200).toBeLessThanOrEqual(844 - 14);
	});
});
