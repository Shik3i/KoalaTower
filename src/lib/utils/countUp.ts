/**
 * countUp.ts — Svelte action that animates a bound number from its previous
 * value to the new one over ~400ms. Used on currency / wave pills so big
 * jumps read as count-ups instead of an instant snap.
 *
 * Usage:
 *   <span use:countUp={coins}>{coins}</span>
 *   <span use:countUp={coins} duration={500}>{coins}</span>
 *
 * Honors prefers-reduced-motion: when the user has it on, the action skips
 * animation and just renders the target value. Avoids layout shift by
 * setting opacity:0 until the first frame lands.
 *
 * The pure helpers (animateValue, easeOutCubic, formatCompactFor) are
 * exported separately for unit testing.
 */

import { formatCompact } from '../game/balance/balanceMath';

export interface CountUpOptions {
	duration?: number;
	/** Use compact K/M/B formatting above this magnitude (default 999_999). */
	compactAbove?: number;
	/** Disable rAF entirely — used for tests / reduced motion. */
	disabled?: boolean;
}

/** Cubic ease-out: decelerates nicely for currency pulses. */
export function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

/**
 * Format a value for count-up display. Below `compactAbove` we use en-US
 * grouping (1,234) for deterministic output across user locales; at or above
 * it we delegate to the game's compact formatter so trillion-class idle values
 * stay short. The en-US choice is deliberate: a game UI reads better when
 * grouping is consistent regardless of the player's browser locale.
 */
export function formatCompactFor(value: number, compactAbove: number = 999_999): string {
	if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
	if (Math.abs(value) >= compactAbove) return formatCompact(value);
	return Math.round(value).toLocaleString('en-US');
}

/**
 * Drive a count-up animation from `from` to `to`, calling `onFrame` with the
 * interpolated value each tick. Resolves when finished. Pure / testable.
 */
export function animateValue(
	from: number,
	to: number,
	durationMs: number,
	onFrame: (value: number) => void,
	opts: { raf?: typeof requestAnimationFrame; now?: () => number } = {},
): Promise<void> {
	const raf = opts.raf ?? requestAnimationFrame;
	const now = opts.now ?? (() => performance.now());
	return new Promise((resolve) => {
		if (!Number.isFinite(from) || !Number.isFinite(to) || durationMs <= 0) {
			onFrame(to);
			resolve();
			return;
		}
		const start = now();
		const span = to - from;
		const step = () => {
			const elapsed = now() - start;
			const t = Math.min(1, elapsed / durationMs);
			onFrame(from + span * easeOutCubic(t));
			if (t < 1) {
				raf(step);
			} else {
				onFrame(to);
				resolve();
			}
		};
		raf(step);
	});
}

/**
 * Svelte action. Re-animates whenever `value` changes by a meaningful delta
 * (tiny per-frame jitter is ignored to avoid noise — see THRESHOLD).
 */
const THRESHOLD = 0.5;
const DEFAULT_DURATION = 400;

export function countUp(node: HTMLElement, value: number, opts: CountUpOptions = {}): { update(v: number, o?: CountUpOptions): void; destroy(): void } {
	const reduced = typeof window !== 'undefined'
		&& window.matchMedia
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let current = value;
	let rafId: number | null = null;
	let compactAbove = opts.compactAbove ?? 999_999;
	let duration = opts.duration ?? DEFAULT_DURATION;

	const render = (v: number) => { node.textContent = formatCompactFor(v, compactAbove); };
	render(value);

	function play(from: number, to: number) {
		if (reduced || opts.disabled || Math.abs(to - from) < THRESHOLD) {
			render(to);
			current = to;
			return;
		}
		if (rafId !== null) cancelAnimationFrame(rafId);
		const start = performance.now();
		const span = to - from;
		const tick = () => {
			const elapsed = performance.now() - start;
			const t = Math.min(1, elapsed / duration);
			current = from + span * easeOutCubic(t);
			render(current);
			if (t < 1) {
				rafId = requestAnimationFrame(tick);
			} else {
				rafId = null;
				render(to);
				current = to;
			}
		};
		rafId = requestAnimationFrame(tick);
	}

	return {
		update(v: number, o?: CountUpOptions) {
			if (o) {
				compactAbove = o.compactAbove ?? compactAbove;
				duration = o.duration ?? duration;
				opts = o;
			}
			play(current, v);
		},
		destroy() {
			if (rafId !== null) cancelAnimationFrame(rafId);
		},
	};
}
