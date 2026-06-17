<script lang="ts">
	import type { GameSnapshot } from '$lib/game/engine/gameTypes';

	let { snap }: { snap: GameSnapshot | null } = $props();
	let compact = $state(false);
	let isMobile = $state(false);

	function onResize() {
		isMobile = window.innerWidth < 900;
	}

	$effect(() => {
		onResize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (isMobile) compact = true;
	});

	function fmt(n: number): string {
		if (n < 1000) return n < 10 ? n.toFixed(1) : n.toFixed(0);
		if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
		if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
		return (n / 1_000_000_000).toFixed(2) + 'B';
	}

	function pct(n: number): string {
		return (n * 100).toFixed(1) + '%';
	}
</script>

{#if snap?.runActive}
	<div class="tower-panel" class:compact class:mobile={isMobile} role="region" aria-label="Tower stats">
		<button class="tp-toggle" onclick={() => compact = !compact} aria-label={compact ? 'Expand' : 'Collapse'}>
			{compact ? '+' : '−'}
		</button>
		<div class="tp-content">
			<div class="tp-title">Tower</div>
			<div class="tp-row"><span class="tp-lbl">HP</span><span class="tp-val hp-val">{Math.ceil(snap.towerHp)}<span class="tp-max">/{snap.towerMaxHp}</span></span></div>
			<div class="tp-row"><span class="tp-lbl">DMG</span><span class="tp-val">{fmt(snap.towerDamage)}</span></div>
			<div class="tp-row"><span class="tp-lbl">APS</span><span class="tp-val">{snap.towerFireRate.toFixed(2)}</span></div>
			{#if !compact}
				<div class="tp-row"><span class="tp-lbl">Range</span><span class="tp-val">{snap.towerRange.toFixed(0)}</span></div>
				<div class="tp-row"><span class="tp-lbl">Def%</span><span class="tp-val">{pct(snap.towerDefensePercent)}</span></div>
				<div class="tp-row"><span class="tp-lbl">Def</span><span class="tp-val">{snap.towerDefenseAbsolute.toFixed(0)}</span></div>
				<div class="tp-row"><span class="tp-lbl">Regen</span><span class="tp-val">{fmt(snap.towerRegen)}/s</span></div>
				<div class="tp-row"><span class="tp-lbl">Lifesteal</span><span class="tp-val">{pct(snap.towerLifesteal)}</span></div>
				<div class="tp-row"><span class="tp-lbl">Thorns</span><span class="tp-val">{fmt(snap.towerThorns)}</span></div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.tower-panel {
		position: absolute;
		bottom: 8px;
		left: 8px;
		z-index: 20;
		background: var(--bg-glass-strong);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		pointer-events: auto;
		min-width: 120px;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
		animation: fadeIn 0.2s ease;
	}

	.tower-panel.compact {
		min-width: 95px;
	}

	.tower-panel.mobile {
		bottom: 60px;
	}

	.tp-toggle {
		position: absolute;
		top: 2px;
		right: 3px;
		color: var(--text-dim);
		font-size: var(--fs-caption);
		padding: 4px 6px;
		min-width: 28px;
		min-height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		cursor: pointer;
		z-index: 1;
	}

	.tp-toggle:hover {
		color: var(--cyan);
	}

	.tp-content {
		padding: 0.35rem 0.4rem;
	}

	.tp-title {
		font-size: var(--fs-caption);
		color: var(--cyan);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.2rem;
		padding-bottom: 0.15rem;
		border-bottom: 1px solid rgba(0, 255, 255, 0.1);
	}

	.tp-row {
		display: flex;
		justify-content: space-between;
		gap: 0.3rem;
		padding: 0.08rem 0;
	}

	.tp-lbl {
		color: var(--text-dim);
	}

	.tp-val {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.hp-val {
		color: var(--green);
	}

	.tp-max {
		color: var(--text-dim);
		font-size: var(--fs-caption-sm);
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
