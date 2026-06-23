<script lang="ts">
	import type { GameSnapshot } from '$lib/game/engine/gameTypes';
	import { towerStatsCompact } from '$lib/stores/uiLayoutPrefs';

	let { snap, mobile = false }: { snap: GameSnapshot | null; mobile?: boolean } = $props();
	// Collapse state persists across runs/reloads via localStorage (shared on all
	// platforms) so a player who collapses this panel keeps it collapsed — and
	// vice-versa — exactly as requested.
	const compact = $derived($towerStatsCompact);
	function toggleCompact() {
		$towerStatsCompact = !$towerStatsCompact;
	}

	function fmt(n: number): string {
		if (n < 1000) return n < 10 ? n.toFixed(1) : n.toFixed(0);
		if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
		if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
		return (n / 1_000_000_000).toFixed(2) + 'B';
	}

	function pct(n: number): string {
		return (n * 100).toFixed(1) + '%';
	}

	// HP fill ratio (0..1) for the bar; drives both width and the green→red tint.
	const hpRatio = $derived(
		snap ? Math.max(0, Math.min(1, snap.towerHp / Math.max(1, snap.towerMaxHp))) : 1,
	);
	const hpLevel = $derived(hpRatio < 0.3 ? 'crit' : hpRatio < 0.6 ? 'warn' : 'ok');
</script>

{#if snap?.runActive}
	<div class="tower-panel" class:compact class:mobile={mobile} role="region" aria-label="Tower stats">
		<div class="tp-content">
			<div class="tp-title">
				<span class="tp-name">Tower</span>
				<button class="tp-toggle" onclick={toggleCompact} aria-label={compact ? 'Expand' : 'Collapse'}>
					{compact ? '+' : '−'}
				</button>
			</div>
			<div class="tp-hpbar" data-level={hpLevel} role="meter" aria-label="Tower HP" aria-valuenow={Math.ceil(snap.towerHp)} aria-valuemax={snap.towerMaxHp}>
				<div class="tp-hpfill" style="width:{hpRatio * 100}%"></div>
				<div class="tp-hptext"><span>HP</span><span>{Math.ceil(snap.towerHp)}/{snap.towerMaxHp}</span></div>
			</div>
			<div class="tp-row"><span class="tp-lbl">DMG</span><span class="tp-val">{fmt(snap.towerDamage)}</span></div>
			{#if !compact}
				<div class="tp-row"><span class="tp-lbl">APS</span><span class="tp-val">{snap.towerFireRate.toFixed(2)}</span></div>
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
		min-width: 0;
	}

	.tower-panel.mobile {
		bottom: 6px;
		left: 6px;
	}

	.tower-panel.mobile.compact {
		min-width: 84px;
	}

	.tp-toggle {
		color: var(--text-dim);
		font-size: var(--fs-body-sm);
		padding: 2px;
		width: 22px;
		height: 22px;
		margin: -2px -2px -2px 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		cursor: pointer;
		flex-shrink: 0;
	}

	.tower-panel.mobile .tp-toggle {
		width: 26px;
		height: 26px;
	}

	.tp-toggle:hover {
		color: var(--cyan);
	}

	.tp-content {
		padding: 0.3rem 0.4rem;
	}

	.tower-panel.compact .tp-content {
		padding: 0.25rem 0.35rem;
	}

	.tp-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
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

	.tower-panel.compact .tp-hpbar {
		height: 15px;
		margin: 0.05rem 0 0.15rem;
	}
	.tower-panel.compact .tp-hptext { font-size: var(--fs-caption-sm); padding: 0 0.3rem; }
	.tower-panel.compact .tp-row { padding: 0.04rem 0; }

	.tp-lbl {
		color: var(--text-dim);
	}

	.tp-val {
		color: var(--text-secondary);
		font-weight: 500;
	}

	/* HP rendered as a filled bar: green track that drains right-to-left and
	   tints amber → red as it falls, with the HP label + value overlaid. */
	.tp-hpbar {
		position: relative;
		height: 18px;
		margin: 0.1rem 0 0.25rem;
		min-width: 0;
		border-radius: var(--radius-sm, 4px);
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.12);
		overflow: hidden;
	}
	.tp-hpfill {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(180deg, #4dffa0 0%, var(--green, #22c55e) 100%);
		box-shadow: 0 0 8px rgba(60, 255, 150, 0.45) inset;
		transition: width 0.18s ease-out;
	}
	.tp-hpbar[data-level='warn'] .tp-hpfill {
		background: linear-gradient(180deg, #ffe27a 0%, #f5b301 100%);
		box-shadow: 0 0 8px rgba(255, 200, 60, 0.45) inset;
	}
	.tp-hpbar[data-level='crit'] .tp-hpfill {
		background: linear-gradient(180deg, #ff8a8a 0%, #e02424 100%);
		box-shadow: 0 0 8px rgba(255, 80, 80, 0.5) inset;
		animation: hpPulse 0.9s ease-in-out infinite;
	}
	.tp-hptext {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.4rem;
		font-size: var(--fs-caption);
		font-weight: 600;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
		pointer-events: none;
	}
	.tp-hptext span:first-child {
		color: var(--text-dim);
		letter-spacing: 0.04em;
	}

	@keyframes hpPulse {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.45); }
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
