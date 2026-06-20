<script lang="ts">
	import { TIERS, FRONT_META, getFrontBandDef, describeFrontUnlock } from '$lib/game/balance/tiers';
	import { getSchematics } from '$lib/game/balance/schematics';
	import { TIER_MULTIPLIERS } from '$lib/game/balance/balanceMath';
	import FrontIcon from '$lib/components/FrontIcon.svelte';
	import type { TierId } from '$lib/game/engine/gameTypes';

	let {
		unlockedFronts,
		schematicsByFront,
		frontBestWave
	}: {
		unlockedFronts: TierId[];
		schematicsByFront: Record<number, number>;
		frontBestWave: Partial<Record<TierId, number>>;
	} = $props();
</script>

<div class="hs">
	<h2 class="hst">🌍 Fronts</h2>
	<p class="hsd">Sixteen Fronts across four bands — Perimeter, Redline, Blacksite, Anomaly. Each Front spawns denser waves and drops its own Schematics. Most Fronts unlock at Wave 100 on the previous one; crossing into a new band is the hard wall. Remember: the enemy is also fighting a war. They are losing. Please continue to help them lose.</p>
	<div class="cl">
		{#each TIERS as t}
			{@const unl = unlockedFronts.includes(t.id)}
			{@const band = getFrontBandDef(t.id)}
			{@const front = FRONT_META.findIndex(m => m.id === t.id) + 1}
			{@const schem = getSchematics(schematicsByFront, front)}
			{@const alloyMult = TIER_MULTIPLIERS[front]?.alloy ?? 1}
			
			<div class="tc" class:unl={unl} style="--band:{band.color}">
				<div class="tc-h">
					<FrontIcon front={t.id} size={30} locked={!unl} />
					<div>
						<div class="tcn">{t.name}</div>
						<div class="tcd">{t.description}</div>
					</div>
				</div>
				<div class="tcr" class:tcr-ok={unl}>
					{unl 
						? '✓ Unlocked · Best Wave ' + (frontBestWave[t.id] ?? 0) + ' · Alloy x' + alloyMult.toFixed(2) + (schem > 0 ? ' · 📐' + schem : '') 
						: '🔒 ' + describeFrontUnlock(t.id)}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.tc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.tc.unl { border-color:rgba(68,255,136,.12); }
	.tc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.tcn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.tcd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	.tcr { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.tcr-ok { color:var(--green); }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
