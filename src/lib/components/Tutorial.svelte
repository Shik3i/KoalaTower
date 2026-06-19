<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { computePlacement } from '$lib/utils/viewportPlacement';

	export interface TutorialStep {
		title: string;
		desc: string;
		target: string;
		placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
	}

	let { steps, tutorialKey, onComplete }: {
		steps: TutorialStep[];
		tutorialKey: string;
		onComplete?: () => void;
	} = $props();

	let step = $state(0);
	let visible = $state(false);

	let highlightEl = $state<HTMLElement | null>(null);
	let highlightRect = $state<DOMRect | null>(null);

	let tooltipEl = $state<HTMLDivElement | undefined>(undefined);
	let tooltipStyle = $state('');
	let isMobile = $state(false);

	const MARGIN = 14;
	const MOBILE_BREAKPOINT = 900;

	function findTarget(selector: string): HTMLElement | null {
		if (!selector) return null;
		for (const sel of selector.split(',').map(s => s.trim())) {
			const el = document.querySelector(sel);
			if (!(el instanceof HTMLElement)) continue;
			const rect = el.getBoundingClientRect();
			const style = window.getComputedStyle(el);
			if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') return el;
		}
		return null;
	}

	function updateHighlight() {
		const s = steps[step];
		if (!s || !s.target) {
			highlightEl = null;
			highlightRect = null;
			return;
		}
		const el = findTarget(s.target);
		if (el) {
			el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
			highlightEl = el;
			highlightRect = el.getBoundingClientRect();
		} else {
			highlightEl = null;
			highlightRect = null;
		}
	}

	function recalcPosition() {
		updateHighlight();
		if (!tooltipEl) return;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		isMobile = vw < MOBILE_BREAKPOINT;

		const s = steps[step];
		if (!s?.target || !highlightRect) {
			tooltipStyle = '';
			return;
		}

		if (isMobile) {
			tooltipStyle = 'position:fixed; left:0; right:0; bottom:0;';
			return;
		}

		const tw = tooltipEl.offsetWidth || 320;
		const th = tooltipEl.offsetHeight || 200;
		const result = computePlacement({
			targetRect: highlightRect,
			tooltipWidth: tw,
			tooltipHeight: th,
			preferred: s.placement,
			viewportWidth: vw,
			viewportHeight: vh,
			margin: MARGIN,
		});
		tooltipStyle = `position:fixed; left:${result.left}px; top:${result.top}px;`;
	}

	function next() {
		if (step < steps.length - 1) {
			step++;
			requestAnimationFrame(() => recalcPosition());
		} else {
			finish();
		}
	}

	function prev() {
		if (step > 0) {
			step--;
			requestAnimationFrame(() => recalcPosition());
		}
	}

	function finish() {
		try {
			localStorage.setItem(tutorialKey, 'true');
		} catch (e) {
			console.warn('Could not persist tutorial completion:', e);
		}
		visible = false;
		onComplete?.();
	}

	function skip() {
		finish();
	}

	function onKey(e: KeyboardEvent) {
		if (!visible) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			visible = false;
			return;
		}
		if (e.key !== 'Tab') return;
		const focusable = Array.from(tooltipEl?.querySelectorAll<HTMLElement>(
			'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) ?? []).filter(el => el.offsetParent !== null);
		if (focusable.length === 0) return;
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function focusTooltip() {
		requestAnimationFrame(() => {
			const first = tooltipEl?.querySelector<HTMLElement>('button:not([disabled])');
			first?.focus();
		});
	}

	onMount(() => {
		let done: string | null = null;
		try {
			done = localStorage.getItem(tutorialKey);
		} catch (e) {
			console.warn('Could not read tutorial completion:', e);
		}
		if (!done) {
			visible = true;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					updateHighlight();
					requestAnimationFrame(() => {
						recalcPosition();
						focusTooltip();
					});
				});
			});
		}
		window.addEventListener('resize', recalcPosition);
		window.addEventListener('keydown', onKey);
		// Recalculate highlight position on scroll (passive for performance)
		window.addEventListener('scroll', recalcPosition, { passive: true, capture: true });
	});

	onDestroy(() => {
		window.removeEventListener('resize', recalcPosition);
		window.removeEventListener('keydown', onKey);
		window.removeEventListener('scroll', recalcPosition, { capture: true } as AddEventListenerOptions);
	});

	const currentStep = $derived(steps[step]);
	const isLast = $derived(step === steps.length - 1);
	const isFirst = $derived(step === 0);
</script>

{#if visible}
	<div class="tutorial-overlay" role="dialog" aria-modal="true" aria-label="Tutorial">
		<div class="tutorial-backdrop" role="button" tabindex="0" aria-label="Skip tutorial" onclick={skip} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }}></div>

		{#if highlightRect && currentStep?.target}
			<div
				class="tutorial-spotlight"
				style="left: {highlightRect.left - 10}px; top: {highlightRect.top - 10}px; width: {highlightRect.width + 20}px; height: {highlightRect.height + 20}px;"
			></div>
			<div
				class="tutorial-highlight"
				style="left: {highlightRect.left - 6}px; top: {highlightRect.top - 6}px; width: {highlightRect.width + 12}px; height: {highlightRect.height + 12}px;"
			></div>
		{/if}

		<div
			bind:this={tooltipEl}
			class="tutorial-tooltip"
			class:placement-center={!highlightRect || !currentStep?.target}
			class:mobile-sheet={isMobile && highlightRect && currentStep?.target}
			style={isMobile && highlightRect && currentStep?.target ? '' : tooltipStyle}
		>
			<div class="tt-progress">
				{#each steps as _, i}
					<div class="tt-dot" class:active={i === step} class:done={i < step}></div>
				{/each}
			</div>
			<h3 class="tt-title">{currentStep.title}</h3>
			<p class="tt-desc">{currentStep.desc}</p>
			<div class="tt-actions">
				<button class="tt-back" class:invisible={isFirst} tabindex={isFirst ? -1 : 0} aria-hidden={isFirst} onclick={prev}>Back</button>
				<div class="tt-right">
					<button class="tt-skip" onclick={skip}>Skip</button>
					<button class="tt-next" onclick={next}>{isLast ? 'Done' : 'Next'}</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.tutorial-overlay {
		position: fixed;
		inset: 0;
		z-index: 500;
		pointer-events: none;
	}

	.tutorial-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(7, 8, 18, 0.12);
		backdrop-filter: blur(0.75px);
		-webkit-backdrop-filter: blur(0.75px);
		pointer-events: auto;
		cursor: pointer;
	}

	.tutorial-spotlight {
		position: fixed;
		z-index: 500;
		border-radius: calc(var(--radius-md) + 6px);
		box-shadow: 0 0 0 9999px rgba(7, 8, 18, 0.34);
		pointer-events: none;
	}

	.tutorial-highlight {
		position: fixed;
		z-index: 501;
		border: 2px solid rgba(122, 246, 255, 0.95);
		border-radius: var(--radius-md);
		box-shadow:
			0 0 0 3px rgba(0, 255, 255, 0.16),
			0 0 16px rgba(0, 255, 255, 0.36),
			0 0 44px rgba(0, 255, 255, 0.18);
		pointer-events: none;
		animation: glow 2s ease-in-out infinite;
	}

	@keyframes glow {
		0%, 100% { box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.16), 0 0 16px rgba(0, 255, 255, 0.36), 0 0 44px rgba(0, 255, 255, 0.18); }
		50% { box-shadow: 0 0 0 5px rgba(0, 255, 255, 0.22), 0 0 26px rgba(0, 255, 255, 0.44), 0 0 64px rgba(0, 255, 255, 0.22); }
	}

	.tutorial-tooltip {
		position: fixed;
		z-index: 502;
		pointer-events: auto;
		background: var(--bg-secondary);
		border: 1px solid var(--border-neon-strong);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.5rem;
		max-width: 360px;
		width: max-content;
		box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
		animation: fadeIn 0.2s ease;
	}

	.mobile-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-width: 100%;
		width: auto;
		margin: 0 8px 8px;
		border-radius: var(--radius-xl);
		animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.placement-center {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		max-width: 380px;
	}

	.tt-progress {
		display: flex;
		gap: 0.35rem;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.tt-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1px solid var(--border-neon);
		transition: all var(--transition-fast);
	}

	.tt-dot.active {
		background: var(--cyan);
		box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
	}

	.tt-dot.done {
		background: var(--cyan-dim);
	}

	.tt-title {
		font-size: var(--fs-icon-md);
		color: var(--cyan);
		margin-bottom: 0.4rem;
		text-align: center;
	}

	.tt-desc {
		font-size: var(--fs-body-sm);
		color: var(--text-secondary);
		line-height: 1.55;
		text-align: center;
		margin-bottom: 0.75rem;
	}

	.tt-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.tt-right {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		margin-left: auto;
	}

	.tt-back, .tt-skip, .tt-next {
		padding: 0.4rem 0.85rem;
		border-radius: var(--radius-sm);
		font-size: var(--fs-body-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.tt-back, .tt-skip {
		background: transparent;
		border: 1px solid var(--border-neon);
		color: var(--text-dim);
	}

	.tt-back:hover, .tt-skip:hover {
		border-color: var(--text-dim);
		color: var(--text-secondary);
	}

	.tt-next {
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary);
		border: none;
	}

	.tt-next:hover {
		box-shadow: 0 0 12px rgba(0, 255, 255, 0.3);
	}

	.invisible {
		visibility: hidden;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(100%); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (prefers-reduced-motion: reduce) {
		.tutorial-highlight,
		.tutorial-tooltip,
		.mobile-sheet {
			animation: none;
		}
	}
</style>
