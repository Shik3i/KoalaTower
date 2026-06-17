<script lang="ts">
	import type { GameSnapshot } from '$lib/game/engine/gameTypes';
	import { EnemyType } from '$lib/game/engine/gameTypes';
	import { computeEnemyConfig } from '$lib/game/balance/balanceMath';

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

	const enemyStats = $derived.by(() => {
		if (!snap?.runActive) return null;
		const wave = snap.wave;
		const isBossWave = wave > 0 && wave % 10 === 0;
		const normal = computeEnemyConfig(EnemyType.Normal, wave);
		let boss = null;
		if (isBossWave) {
			boss = computeEnemyConfig(EnemyType.Boss, wave);
		}
		return { normal, boss, isBossWave, wave };
	});

	function fmt(n: number): string {
		if (n < 1000) return n.toFixed(0);
		if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
		if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
		return (n / 1_000_000_000).toFixed(2) + 'B';
	}

	function pct(n: number): string {
		return (n * 100).toFixed(1) + '%';
	}
</script>

{#if snap?.runActive && enemyStats}
	<div class="enemy-panel" class:compact class:mobile={isMobile} role="region" aria-label="Enemy stats">
		<button class="ep-toggle" onclick={() => compact = !compact} aria-label={compact ? 'Expand' : 'Collapse'}>
			{compact ? '+' : '−'}
		</button>
		<div class="ep-content">
			<div class="ep-title">Shapes</div>
			<div class="ep-row"><span class="ep-lbl">HP</span><span class="ep-val">{fmt(enemyStats.normal.hp)}</span></div>
			<div class="ep-row"><span class="ep-lbl">Armor</span><span class="ep-val">{enemyStats.normal.armor > 0 ? pct(enemyStats.normal.armor) : 'absent'}</span></div>
			<div class="ep-row"><span class="ep-lbl">DMG</span><span class="ep-val">{fmt(enemyStats.normal.damage)}</span></div>
			{#if !compact}
				<div class="ep-row"><span class="ep-lbl">Speed</span><span class="ep-val">{enemyStats.normal.speed.toFixed(0)}</span></div>
			{/if}
			{#if enemyStats.isBossWave && enemyStats.boss}
				<div class="ep-divider"></div>
				<div class="ep-row boss-row"><span class="ep-lbl">Boss HP</span><span class="ep-val boss-val">{fmt(enemyStats.boss.hp)}</span></div>
				<div class="ep-row boss-row"><span class="ep-lbl">Boss DMG</span><span class="ep-val boss-val">{fmt(enemyStats.boss.damage)}</span></div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.enemy-panel {
		position: absolute;
		bottom: 8px;
		right: 8px;
		z-index: 20;
		background: var(--bg-glass-strong);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		pointer-events: auto;
		min-width: 110px;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
		animation: fadeIn 0.2s ease;
	}

	.enemy-panel.compact {
		min-width: 85px;
	}

	.enemy-panel.mobile {
		bottom: 60px;
	}

	.ep-toggle {
		position: absolute;
		top: 2px;
		right: 3px;
		color: var(--text-dim);
		font-size: 0.55rem;
		padding: 0 3px;
		line-height: 1;
		cursor: pointer;
		z-index: 1;
	}

	.ep-toggle:hover {
		color: var(--cyan);
	}

	.ep-content {
		padding: 0.35rem 0.4rem;
	}

	.ep-title {
		font-size: 0.55rem;
		color: var(--violet);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.2rem;
		padding-bottom: 0.15rem;
		border-bottom: 1px solid rgba(136, 68, 255, 0.1);
	}

	.ep-row {
		display: flex;
		justify-content: space-between;
		gap: 0.3rem;
		padding: 0.08rem 0;
	}

	.ep-lbl {
		color: var(--text-dim);
	}

	.ep-val {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.boss-row .ep-val {
		color: var(--pink);
	}

	.ep-divider {
		height: 1px;
		background: rgba(255, 68, 170, 0.15);
		margin: 0.15rem 0;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
