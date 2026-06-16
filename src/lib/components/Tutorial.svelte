<script lang="ts">
	import { onMount } from 'svelte';

	const TUTORIAL_KEY = 'koala-tower-tutorial-done';

	let { onComplete }: { onComplete?: () => void } = $props();

	let step = $state(0);
	let visible = $state(false);
	let dismissable = $state(false);

	const steps = [
		{
			title: '👋 Welcome to KoalaTower!',
			desc: 'This is a neon cyber idle tower defense game. Your tower automatically attacks enemies. Let\'s walk through the basics.',
			target: '', // no highlight, just welcome
			placement: 'center' as const,
		},
		{
			title: '▶ Start a Run',
			desc: 'Click "Start Run" to begin. Enemies will spawn from the edges and move toward your tower. Your tower fires automatically.',
			target: '.sc-btn, .start-btn, .btn-start',
			placement: 'center' as const,
		},
		{
			title: '💰 Gold & KoalaCoins',
			desc: 'Kill enemies to earn Gold (💰) and KoalaCoins (🪙). Gold is temporary — spend it on Battle Upgrades during the run. KoalaCoins are permanent — use them in the Workshop for upgrades that persist forever.',
			target: '.tb-stats',
			placement: 'bottom' as const,
		},
		{
			title: '⚡ Speed Controls',
			desc: 'Speed up the action! Use the speed buttons in the top bar: 1× (normal), 2×, 3×, or 5×. Press Space to pause. Use 1-4 keys for quick switching.',
			target: '.spd-grp',
			placement: 'bottom' as const,
		},
		{
			title: '⚔ Battle Upgrades',
			desc: 'The right panel shows Battle Upgrades sorted by category: Offense, Defense, Utility. Buy them with Gold during a run. They reset after game over.',
			target: '.panel.right .pc',
			placement: 'left' as const,
		},
		{
			title: '🏪 Workshop & Lab',
			desc: 'Visit the Workshop for permanent upgrades using KoalaCoins. The Lab has real-time research that progresses even when you\'re away. Access them via the 🏪 button or the main menu.',
			target: '.hub-link, .mnb a[href="/hub"]',
			placement: 'bottom' as const,
		},
		{
			title: '📊 Run Info Panel',
			desc: 'The left panel shows live run stats: wave number, tower HP, kills, and detailed tower statistics. Toggle it with the ◀ button.',
			target: '.panel.left',
			placement: 'right' as const,
		},
		{
			title: '🎯 Ready?',
			desc: 'That\'s all you need to know! Start a run, upgrade your tower, and see how far you can get. Good luck, commander! 🐨',
			target: '',
			placement: 'center' as const,
		},
	];

	onMount(() => {
		const done = localStorage.getItem(TUTORIAL_KEY);
		if (!done) {
			visible = true;
			// Set dismissable after first interaction
			setTimeout(() => { dismissable = true; }, 1000);
		}
	});

	function next() {
		if (step < steps.length - 1) {
			step++;
			if (step > 0) dismissable = true;
		} else {
			finish();
		}
	}

	function prev() {
		if (step > 0) step--;
	}

	function finish() {
		localStorage.setItem(TUTORIAL_KEY, 'true');
		visible = false;
		onComplete?.();
	}

	function skip() {
		finish();
	}

	let currentStep = $derived(steps[step]);
	let isLast = $derived(step === steps.length - 1);
	let isFirst = $derived(step === 0);
</script>

{#if visible}
	<div class="tutorial-overlay" role="dialog" aria-modal="true" aria-label="Tutorial">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="tutorial-backdrop" onclick={dismissable ? skip : undefined}></div>
		<div class="tutorial-card placement-{currentStep.placement}">
			<div class="tutorial-progress">
				{#each steps as _, i}
					<div class="tutorial-dot" class:active={i === step} class:done={i < step}></div>
				{/each}
			</div>
			<div class="tutorial-content">
				<h2 class="tutorial-title">{currentStep.title}</h2>
				<p class="tutorial-desc">{currentStep.desc}</p>
			</div>
			<div class="tutorial-actions">
				<button class="tutorial-back-btn" class:invisible={isFirst} onclick={prev}>Back</button>
				<div class="tutorial-right">
					<button class="tutorial-skip-btn" onclick={skip}>Skip</button>
					<button class="tutorial-next-btn" onclick={next}>
						{#if isLast}Got it!{:else}Next{/if}
					</button>
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
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fi 0.2s ease;
	}

	.tutorial-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(7, 8, 18, 0.7);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
	}

	.tutorial-card {
		position: relative;
		z-index: 1;
		background: var(--bg-secondary);
		border: 1px solid var(--border-neon-strong);
		border-radius: var(--radius-xl);
		padding: 1.75rem;
		max-width: 420px;
		width: 90%;
		box-shadow: 0 0 60px rgba(0, 255, 255, 0.08);
		animation: si 0.25s ease;
	}

	.tutorial-progress {
		display: flex;
		gap: 0.4rem;
		justify-content: center;
		margin-bottom: 1.25rem;
	}

	.tutorial-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1px solid var(--border-neon);
		transition: all var(--transition-fast);
	}

	.tutorial-dot.active {
		background: var(--cyan);
		box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
	}

	.tutorial-dot.done {
		background: var(--cyan-dim);
	}

	.tutorial-content {
		text-align: center;
		margin-bottom: 1.25rem;
	}

	.tutorial-title {
		font-size: 1.15rem;
		color: var(--cyan);
		margin-bottom: 0.6rem;
	}

	.tutorial-desc {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.tutorial-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.tutorial-right {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.tutorial-back-btn, .tutorial-skip-btn, .tutorial-next-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.invisible { visibility: hidden; }

	.tutorial-back-btn, .tutorial-skip-btn {
		background: transparent;
		border: 1px solid var(--border-neon);
		color: var(--text-dim);
	}

	.tutorial-back-btn:hover, .tutorial-skip-btn:hover {
		border-color: var(--text-dim);
		color: var(--text-secondary);
	}

	.tutorial-next-btn {
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary);
		border: none;
	}

	.tutorial-next-btn:hover {
		box-shadow: 0 0 16px rgba(0, 255, 255, 0.3);
	}

	@keyframes fi { from { opacity: 0; } to { opacity: 1; } }
	@keyframes si { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
