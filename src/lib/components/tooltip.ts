/**
 * tooltip.ts — Reusable rich-tooltip Svelte action.
 *
 * Replaces native `title=""` attributes with a stylable, accessible tooltip
 * that works with mouse hover, keyboard focus, AND mobile tap/long-press.
 *
 * Design goals (kept deliberately small):
 *  - One tiny floating element is reused for every tooltip (singleton), so
 *    there is no per-anchor DOM bloat and nothing that can break layout.
 *  - Plain-text content only (rendered with `white-space: pre-line` so `\n`
 *    becomes line breaks). No `@html`, so no injection surface.
 *  - Accessible: the anchor gets `aria-describedby`; the tip has role="tooltip".
 *    Escape and outside-tap dismiss the mobile/persistent tip; focus shows it.
 *  - SSR-safe: every DOM touch is guarded by `typeof document`.
 *
 * Usage:
 *   <button use:tooltip={'Damage +12%\nNext: +14%\nCost: 250 Alloy'}>…</button>
 *   <span use:tooltip={{ content: 'Locked', placement: 'right' }}>…</span>
 *
 * The position math (`computeTooltipPosition`) is exported separately and is a
 * pure function so it can be unit-tested without a DOM.
 */

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipOptions {
	/** Text body. `\n` renders as a line break. Empty/nullish disables the tooltip. */
	content: string | null | undefined;
	/** Preferred side. Flips automatically when it would overflow. Default 'top'. */
	placement?: TooltipPlacement;
	/** Hover/focus show delay in ms. Default 120. */
	delay?: number;
}

export type TooltipParam = string | null | undefined | TooltipOptions;

interface Rectish {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

interface Sizeish {
	width: number;
	height: number;
}

/**
 * Pure placement solver. Given the anchor rect, the tip size and the viewport,
 * returns the fixed-position coordinates and the placement actually used.
 *
 * The preferred placement is used when it fits; otherwise it flips to the
 * opposite side, then clamps onto the viewport so the tip is never cut off.
 * Exported for unit testing.
 */
export function computeTooltipPosition(
	anchor: Rectish,
	tip: Sizeish,
	viewport: Sizeish,
	placement: TooltipPlacement = 'top',
	gap = 8,
	margin = 6,
): { left: number; top: number; placement: TooltipPlacement } {
	const fits = (p: TooltipPlacement): boolean => {
		switch (p) {
			case 'top':
				return anchor.top - gap - tip.height >= margin;
			case 'bottom':
				return anchor.bottom + gap + tip.height <= viewport.height - margin;
			case 'left':
				return anchor.left - gap - tip.width >= margin;
			case 'right':
				return anchor.right + gap + tip.width <= viewport.width - margin;
		}
	};

	const opposite: Record<TooltipPlacement, TooltipPlacement> = {
		top: 'bottom',
		bottom: 'top',
		left: 'right',
		right: 'left',
	};

	// Use preferred placement if it fits, else the opposite if THAT fits, else preferred.
	let resolved = placement;
	if (!fits(placement) && fits(opposite[placement])) resolved = opposite[placement];

	const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

	let left: number;
	let top: number;
	const cx = anchor.left + anchor.width / 2;
	const cy = anchor.top + anchor.height / 2;

	switch (resolved) {
		case 'top':
			left = cx - tip.width / 2;
			top = anchor.top - gap - tip.height;
			break;
		case 'bottom':
			left = cx - tip.width / 2;
			top = anchor.bottom + gap;
			break;
		case 'left':
			left = anchor.left - gap - tip.width;
			top = cy - tip.height / 2;
			break;
		case 'right':
			left = anchor.right + gap;
			top = cy - tip.height / 2;
			break;
	}

	left = clamp(left, margin, Math.max(margin, viewport.width - tip.width - margin));
	top = clamp(top, margin, Math.max(margin, viewport.height - tip.height - margin));
	return { left, top, placement: resolved };
}

function normalize(param: TooltipParam): TooltipOptions {
	if (param == null || typeof param === 'string') return { content: param ?? '' };
	return param;
}

// ─── Singleton floating element ─────────────────────────────────────────────

let tipEl: HTMLDivElement | null = null;
let tipIdCounter = 0;

function ensureTipEl(): HTMLDivElement | null {
	if (typeof document === 'undefined') return null;
	if (tipEl) return tipEl;
	tipEl = document.createElement('div');
	tipEl.className = 'rich-tooltip';
	tipEl.setAttribute('role', 'tooltip');
	tipEl.id = 'rich-tooltip-singleton';
	tipEl.style.position = 'fixed';
	tipEl.style.zIndex = '9999';
	tipEl.style.pointerEvents = 'none';
	tipEl.style.opacity = '0';
	tipEl.style.visibility = 'hidden';
	document.body.appendChild(tipEl);
	return tipEl;
}

/** The anchor whose tooltip is currently shown (so we can hide on demand). */
let activeAnchor: HTMLElement | null = null;

function showFor(anchor: HTMLElement, opts: TooltipOptions): void {
	const el = ensureTipEl();
	if (!el || !opts.content) return;
	el.textContent = opts.content;
	el.style.visibility = 'hidden';
	el.style.opacity = '0';
	el.style.left = '0px';
	el.style.top = '0px';
	// Measure after content is set.
	const tipRect = el.getBoundingClientRect();
	const anchorRect = anchor.getBoundingClientRect();
	const { left, top } = computeTooltipPosition(
		anchorRect,
		{ width: tipRect.width, height: tipRect.height },
		{ width: window.innerWidth, height: window.innerHeight },
		opts.placement ?? 'top',
	);
	el.style.left = `${Math.round(left)}px`;
	el.style.top = `${Math.round(top)}px`;
	el.style.visibility = 'visible';
	el.style.opacity = '1';
	activeAnchor = anchor;
}

function hide(anchor?: HTMLElement): void {
	if (anchor && activeAnchor !== anchor) return;
	if (!tipEl) return;
	tipEl.style.opacity = '0';
	tipEl.style.visibility = 'hidden';
	activeAnchor = null;
}

/**
 * Svelte action. Attach with `use:tooltip={content}`.
 * Returns update/destroy so the content can change reactively.
 */
export function tooltip(node: HTMLElement, param: TooltipParam) {
	let opts = normalize(param);
	let showTimer: ReturnType<typeof setTimeout> | null = null;
	let persistent = false; // true after a tap (touch) — stays until dismissed
	const descId = `tt-${++tipIdCounter}`;

	function applyAria(): void {
		// Mirror the content into aria-describedby via a hidden element so screen
		// readers get it even though the visual tip is a shared singleton.
		if (!opts.content) {
			node.removeAttribute('aria-describedby');
			const old = document.getElementById(descId);
			if (old) old.remove();
			return;
		}
		let sr = document.getElementById(descId);
		if (!sr) {
			sr = document.createElement('span');
			sr.id = descId;
			sr.className = 'sr-only';
			node.appendChild(sr);
		}
		sr.textContent = opts.content;
		node.setAttribute('aria-describedby', descId);
	}

	function open(): void {
		if (!opts.content) return;
		showFor(node, opts);
	}

	function scheduleOpen(): void {
		if (!opts.content) return;
		if (showTimer) clearTimeout(showTimer);
		showTimer = setTimeout(open, opts.delay ?? 120);
	}

	function close(): void {
		if (showTimer) {
			clearTimeout(showTimer);
			showTimer = null;
		}
		persistent = false;
		hide(node);
	}

	function onPointerEnter(e: PointerEvent): void {
		if (e.pointerType === 'touch') return; // touch handled by click/long-press
		scheduleOpen();
	}
	function onPointerLeave(): void {
		if (!persistent) close();
	}
	function onFocus(): void {
		open();
	}
	function onBlur(): void {
		close();
	}
	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') close();
	}
	function onClick(e: MouseEvent): void {
		// On touch/coarse pointers, a tap toggles a persistent tip. We don't
		// preventDefault so the underlying button still works.
		const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
		if (!coarse) return;
		if (persistent && activeAnchor === node) {
			close();
		} else {
			persistent = true;
			open();
		}
		void e;
	}

	function onOutside(e: Event): void {
		if (!persistent) return;
		if (e.target instanceof Node && node.contains(e.target)) return;
		close();
	}

	if (typeof document !== 'undefined') {
		node.addEventListener('pointerenter', onPointerEnter);
		node.addEventListener('pointerleave', onPointerLeave);
		node.addEventListener('focus', onFocus, true);
		node.addEventListener('blur', onBlur, true);
		node.addEventListener('keydown', onKeydown);
		node.addEventListener('click', onClick);
		document.addEventListener('pointerdown', onOutside, true);
		applyAria();
	}

	return {
		update(next: TooltipParam) {
			opts = normalize(next);
			applyAria();
			if (activeAnchor === node) {
				if (opts.content) showFor(node, opts);
				else close();
			}
		},
		destroy() {
			close();
			if (typeof document !== 'undefined') {
				node.removeEventListener('pointerenter', onPointerEnter);
				node.removeEventListener('pointerleave', onPointerLeave);
				node.removeEventListener('focus', onFocus, true);
				node.removeEventListener('blur', onBlur, true);
				node.removeEventListener('keydown', onKeydown);
				node.removeEventListener('click', onClick);
				document.removeEventListener('pointerdown', onOutside, true);
				const sr = document.getElementById(descId);
				if (sr) sr.remove();
			}
		},
	};
}
