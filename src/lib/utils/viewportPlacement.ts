export interface PlacementInput {
	targetRect: DOMRect;
	tooltipWidth: number;
	tooltipHeight: number;
	preferred: 'top' | 'bottom' | 'left' | 'right' | 'center';
	viewportWidth: number;
	viewportHeight: number;
	margin: number;
}

export interface PlacementResult {
	left: number;
	top: number;
	actualPlacement: string;
}

export function computePlacement(input: PlacementInput): PlacementResult {
	const { targetRect, tooltipWidth, tooltipHeight, preferred, viewportWidth, viewportHeight, margin } = input;

	function fits(left: number, top: number): boolean {
		return (
			left >= margin &&
			top >= margin &&
			left + tooltipWidth <= viewportWidth - margin &&
			top + tooltipHeight <= viewportHeight - margin
		);
	}

	const gap = 12;

	switch (preferred) {
		case 'bottom': {
			let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
			let top = targetRect.bottom + gap;
			if (fits(left, top)) return { left, top, actualPlacement: 'bottom' };
			left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
			top = targetRect.top - tooltipHeight - gap;
			if (fits(left, top)) return { left, top, actualPlacement: 'top' };
			break;
		}
		case 'top': {
			let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
			let top = targetRect.top - tooltipHeight - gap;
			if (fits(left, top)) return { left, top, actualPlacement: 'top' };
			left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
			top = targetRect.bottom + gap;
			if (fits(left, top)) return { left, top, actualPlacement: 'bottom' };
			break;
		}
		case 'left': {
			let left = targetRect.left - tooltipWidth - gap;
			let top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
			if (fits(left, top)) return { left, top, actualPlacement: 'left' };
			left = targetRect.right + gap;
			top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
			if (fits(left, top)) return { left, top, actualPlacement: 'right' };
			break;
		}
		case 'right': {
			let left = targetRect.right + gap;
			let top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
			if (fits(left, top)) return { left, top, actualPlacement: 'right' };
			left = targetRect.left - tooltipWidth - gap;
			top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
			if (fits(left, top)) return { left, top, actualPlacement: 'left' };
			break;
		}
	}

	const minL = margin;
	const maxL = Math.max(minL, viewportWidth - tooltipWidth - margin);
	const minT = margin;
	const maxT = Math.max(minT, viewportHeight - tooltipHeight - margin);
	return {
		left: Math.max(minL, Math.min(maxL, (viewportWidth - tooltipWidth) / 2)),
		top: Math.max(minT, Math.min(maxT, (viewportHeight - tooltipHeight) / 2)),
		actualPlacement: 'center',
	};
}
