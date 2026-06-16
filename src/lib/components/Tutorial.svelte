<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const TUTORIAL_KEY = 'koala-tower-tutorial-done';

	let { onComplete }: { onComplete?: () => void } = $props();

	let step = $state(0);
	let visible = $state(false);

	let highlightEl = $state<HTMLElement | null>(null);
	let highlightRect = $state<DOMRect | null>(null);

	const steps = [
		{
			title: 'Welcome to KoalaTower!',
			desc: 'This is a neon cyber idle tower defense. Your tower automatically shoots enemies. Click "Start Run" to begin.',
			target: '.sc-btn, .start-btn, .btn-start',
			placement: 'center' as const,
		},
		{
			title: 'Gold & KoalaCoins',
			desc: 'Kill enemies to earn Gold (temporary) and KoalaCoins (permanent). Gold buys battle upgrades during the run. KoalaCoins unlock permanent upgrades.',
			target: '.tb-stats',
			placement: 'bottom' as const,
		},
		{
			title: 'Speed Controls',
			desc: 'Speed up the action! Use 1x-5x buttons or press Space to pause. Keys 1-4 switch speed instantly.',
			target: '.spd-grp',
			placement: 'bottom' as const,
		},
		{
			title: 'Battle Upgrades',
			desc: 'The right panel has battle upgrades split into Offense, Defense, and Utility. Buy them with Gold during a run.',
			target: '.panel.right',
			placement: 'left' as const,
		},
		{
			title: 'Workshop & Lab',
			desc: 'The Workshop has permanent upgrades using KoalaCoins. The Lab has real-time research that runs even while you are away.',
			target: '.hub-link, [href="/hub"]',
			placement: 'bottom' as const,
		},
		{
			title: 'Ready!',
			desc: 'That is all you need. Start a run, upgrade your tower, and see how far you can get. Good luck, commander!',
			target: '',
			placement: 'center' as const,
		},
	];

	function findTarget(selector: string): HTMLElement | null {
		if (!selector) return null;
		// Try each selector in the comma-separated list
		for (const sel of selector.split(',').map(s => s.trim())) {
			const el = document.querySelector(sel);
			if (el instanceof HTMLElement) return el;
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
			highlightEl = el;
			highlightRect = el.getBoundingClientRect();
		} else {
			highlightEl = null;
			highlightRect = null;
		}
	}

	function next() {
		if (step < steps.length - 1) {
			step++;
			updateHighlight();
		} else {
			finish();
		}
	}

	function prev() {
		if (step > 0) {
			step--;
			updateHighlight();
		}
	}

	function finish() {
		localStorage.setItem(TUTORIAL_KEY, 'true');
		visible = false;
		onComplete?.();
	}

	function skip() {
		finish();
	}

	onMount(() => {
		const done = localStorage.getItem(TUTORIAL_KEY);
		if (!done) {
			visible = true;
			// Wait a tick for DOM to render
			requestAnimationFrame(() => {
				requestAnimationFrame(() => updateHighlight());
			});
		}
	});

	// Re-calc highlights on resize
	function onResize() { updateHighlight(); }
	onMount(() => { window.addEventListener('resize', onResize); });
	onDestroy(() => { window.removeEventListener('resize', onResize); });

	const currentStep = $derived(steps[step]);
	const isLast = $derived(step === steps.length - 1);
	const isFirst = $derived(step === 0);
</script>

{#if visible}
	<div class="tutorial-overlay" role="dialog" aria-modal="true" aria-label="Tutorial">
		<!-- Full-screen dim backdrop -->
		<div class="tutorial-backdrop" onclick={skip}></div>

		<!-- Highlight ring around target element -->
		{#if highlightRect && currentStep?.target}
			<div
				class="tutorial-highlight"
				style="left: {highlightRect.left - 6}px; top: {highlightRect.top - 6}px; width: {highlightRect.width + 12}px; height: {highlightRect.height + 12}px;"
			></div>
		{/if}

		<!-- Tooltip card -->
		<div
			class="tutorial-tooltip"
			class:placement-center={!highlightRect || !currentStep?.target}
			class:placement-bottom={currentStep?.placement === 'bottom'}
			class:placement-left={currentStep?.placement === 'left'}
			class:placement-right={currentStep?.placement === 'right'}
			style={highlightRect && currentStep?.target ? getTooltipStyle(currentStep.placement, highlightRect) : ''}
		>
			<div class="tt-progress">
				{#each steps as _, i}
					<div class="tt-dot" class:active={i === step} class:done={i < step}></div>
				{/each}
			</div>
			<h3 class="tt-title">{currentStep.title}</h3>
			<p class="tt-desc">{currentStep.desc}</p>
			<div class="tt-actions">
				<button class="tt-back" class:invisible={isFirst} onclick={prev}>Back</button>
				<div class="tt-right">
					<button class="tt-skip" onclick={skip}>Skip</button>
					<button class="tt-next" onclick={next}>{isLast ? 'Done' : 'Next'}</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<script lang="ts" context="module">
	function getTooltipStyle(placement: string, rect: DOMRect): string {
		const gap = 12;
		switch (placement) {
			case 'bottom':
				return `position:fixed; left:${rect.left + rect.width / 2}px; top:${rect.bottom + gap}px; transform:translateX(-50%);`;
			case 'left':
				return `position:fixed; right:${window.innerWidth - rect.left + gap}px; top:${rect.top + rect.height / 2}px; transform:translateY(-50%);`;
			case 'right':
				return `position:fixed; left:${rect.right + gap}px; top:${rect.top + rect.height / 2}px; transform:translateY(-50%);`;
			default:
				return '';
		}
	}
</script>

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
		background: rgba(7, 8, 18, 0.65);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		pointer-events: auto;
		cursor: pointer;
	}

	.tutorial-highlight {
		position: fixed;
		z-index: 501;
		border: 2px solid var(--cyan);
		border-radius: var(--radius-md);
		box-shadow:
			0 0 0 4px rgba(0, 255, 255, 0.15),
			0 0 20px rgba(0, 255, 255, 0.2),
			0 0 60px rgba(0, 255, 255, 0.1);
		pointer-events: none;
		animation: glow 2s ease-in-out infinite;
	}

	@keyframes glow {
		0%, 100% { box-shadow: 0 0 0 4px rgba(0, 255, 255, 0.15), 0 0 20px rgba(0, 255, 255, 0.2), 0 0 60px rgba(0, 255, 255, 0.1); }
		50% { box-shadow: 0 0 0 6px rgba(0, 255, 255, 0.2), 0 0 30px rgba(0, 255, 255, 0.3), 0 0 80px rgba(0, 255, 255, 0.15); }
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
		font-size: 1rem;
		color: var(--cyan);
		margin-bottom: 0.4rem;
		text-align: center;
	}

	.tt-desc {
		font-size: 0.78rem;
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
		font-size: 0.75rem;
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
</style>
