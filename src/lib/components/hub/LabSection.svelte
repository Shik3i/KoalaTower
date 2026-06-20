<script lang="ts">
	import { LAB_DEFS, getLabCost, getLabEffect, isLabUnlocked, getLabDuration, formatLabDuration } from '$lib/game/balance/labs';
	import { formatCompact } from '$lib/game/balance/balanceMath';
	import { tooltip } from '$lib/components/tooltip';

	let {
		coins,
		highestWave,
		labLevels,
		activeLabId,
		activeLabTarget,
		labProgressPct,
		startLabResearch
	}: {
		coins: number;
		highestWave: number;
		labLevels: Record<string, number>;
		activeLabId: string | null;
		activeLabTarget: number;
		labProgressPct: number;
		startLabResearch: (id: string) => void;
	} = $props();

	function lLv(id: string): number {
		return labLevels[id] ?? 0;
	}
</script>

<div class="hs">
	<h2 class="hst">🔬 Research Deck</h2>
	<p class="hsd">Time-based orbital research projects. Each level grants a permanent multiplicative bonus. Research continues offline. Only one project can be active at a time. Research continues offline because the scientists have been locked in. For their own safety.</p>
	
	{#if !activeLabId}
		<p class="empty-flavor">🔬 Research deck idle. Suspiciously quiet. Start a project below — it keeps running even while you're offline.</p>
	{/if}
	
	<div class="ug">
		{#each LAB_DEFS as lab}
			{@const unlocked = isLabUnlocked(lab, highestWave)}
			{@const lv = lLv(lab.id)}
			{@const cost = getLabCost(lab.id, lv)}
			{@const duration = getLabDuration(lab.id, lv)}
			{@const aff = coins >= cost}
			{@const mx = lv >= lab.maxLevel}
			{@const isResearching = activeLabId === lab.id}
			{@const currMult = 1 + getLabEffect(lab.id, lv)}
			{@const hasActive = !!activeLabId}
			{@const lockedDisplay = '🔒 Reach Wave ' + lab.unlockWave}
			
			<div
				class="uc lc"
				class:locked={!unlocked}
				class:researching={isResearching}
				class:mx={mx && unlocked}
				use:tooltip={
					!unlocked
						? `🔒 ${lab.name}\nUnlocks at Wave ${lab.unlockWave}.\nReach it on any Front to begin research.`
						: mx
							? `${lab.name} — MAXED\nCurrent: ×${currMult.toFixed(2)} multiplier`
							: isResearching
								? `${lab.name}\nResearching Lv.${activeLabTarget}…\nResearch continues even while you are offline.`
								: `${lab.name}\nCurrent: ×${currMult.toFixed(2)} multiplier\nNext (Lv.${lv + 1}): ×${(1 + getLabEffect(lab.id, lv + 1)).toFixed(2)}\nCost: ${formatCompact(cost)} Alloy · takes ${formatLabDuration(duration)}${hasActive ? '\nAnother project is already running.' : ''}`
				}
			>
				<div class="uc-t">
					<span class="uci">{unlocked ? lab.icon : '🔒'}</span>
					<span class="ucn">{lab.name}</span>
					<span class="ucl">{unlocked ? 'Lv.' + lv : lockedDisplay}</span>
				</div>
				
				{#if unlocked}
					<div class="uc-btr">
						<div class="uc-btf" style="width:{Math.min(100, (lv / lab.maxLevel) * 100)}%"></div>
					</div>
					<div class="uc-eff">×{currMult.toFixed(2)} multiplier</div>
					
					{#if isResearching}
						<div class="rs-bar-track">
							<div class="rs-bar-fill" style="width:{labProgressPct}%"></div>
						</div>
						<div class="rs-info">Researching Lv.{activeLabTarget} — {labProgressPct.toFixed(0)}%</div>
					{:else if mx}
						<div class="rs-info">MAXED</div>
					{:else}
						<button
							class="uc-b rs-btn"
							class:aff={aff && !hasActive}
							disabled={!aff || hasActive}
							onclick={() => startLabResearch(lab.id)}
						>
							<span class="ucc">🔩{formatCompact(cost)}</span>
							<span class="ucnx">{hasActive ? 'BUSY' : '→ ' + formatLabDuration(duration)}</span>
						</button>
					{/if}
				{:else}
					<div class="uc-b">
						<span class="ucc" style="color:var(--text-dim)">🔒 Requires Wave {lab.unlockWave}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.empty-flavor { color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-mono-sm); line-height:1.5; margin:0 0 1rem; padding:.6rem .8rem; border:1px dashed var(--border-neon); border-radius:var(--radius-sm); background:rgba(0,255,255,.03); }
	
	.ug { display:flex; flex-direction:column; gap:4px; max-width:800px; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.72rem .8rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.mx { opacity:.5; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.65; cursor:default; }
	
	.uc-t { display:flex; align-items:center; gap:.35rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	
	.uc-btr { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc-eff { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); margin-top:.2rem; }
	
	.rs-bar-track { height:5px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.rs-bar-fill { height:100%; background:linear-gradient(90deg,var(--yellow),var(--orange)); border-radius:2px; transition:width .5s linear; }
	.rs-info { font-size:var(--fs-caption-sm); color:var(--yellow); font-family:var(--font-mono); text-align:center; }
	
	.rs-btn { display:block; width:100%; margin-top:.25rem; padding:.4rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); font-weight:600; cursor:pointer; transition:all var(--transition-fast); text-align:center; background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.rs-btn.aff { background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); }
	.rs-btn:disabled { opacity:.55; background:var(--bg-tertiary); color:var(--text-dim); cursor:default; pointer-events:none; }
	
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.lc { gap:.25rem; }
	.uc.researching { border-color:rgba(255,221,68,.3); background:rgba(255,221,68,.03); }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
