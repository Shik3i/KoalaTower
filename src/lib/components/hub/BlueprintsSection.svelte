<script lang="ts">
	import { FRONT_META, getFrontName } from '$lib/game/balance/tiers';
	import FrontIcon from '$lib/components/FrontIcon.svelte';
	import { getSchematics, getPathSchematicCost, SCHEMATICS_FLAVOR } from '$lib/game/balance/schematics';
	import { BLUEPRINT_DEFS, getFieldUpgradesUnlockedBy, getFoundryUpgradesUnlockedBy, describeBlueprintDiscovery } from '$lib/game/balance/blueprints';
	import { getBlueprintStatus } from '$lib/game/progression/blueprintDiscovery';
	import { tooltip } from '$lib/components/tooltip';
	import type { BlueprintId, TierId } from '$lib/game/engine/gameTypes';

	let {
		ownedBlueprints,
		discoveredBlueprints,
		schematicsByFront,
		unlockedFronts,
		buyBlueprint
	}: {
		ownedBlueprints: BlueprintId[];
		discoveredBlueprints: BlueprintId[];
		schematicsByFront: Record<number, number>;
		unlockedFronts: TierId[];
		buyBlueprint: (id: BlueprintId) => void;
	} = $props();
</script>

<div class="hs">
	<h2 class="hst">📐 Schematics</h2>
	<p class="hsd">{SCHEMATICS_FLAVOR}</p>
	
	{#if FRONT_META.reduce((sum, m) => sum + getSchematics(schematicsByFront, m.front), 0) === 0}
		<p class="empty-flavor">📐 No Schematics recovered yet. Complete waves on a Front to salvage obsolete designs, then reconstruct them here.</p>
	{:else}
		<div class="schem-bal">
			{#each FRONT_META as m}
				{@const n = getSchematics(schematicsByFront, m.front)}
				{#if n > 0 || unlockedFronts.includes(m.id)}
					<span class="schem-chip" use:tooltip={`${getFrontName(m.id)} Schematics: ${n}\nRecovered by completing waves on this Front.\nSpend them in the Schematics tab to reconstruct new upgrade paths.`}>
						<FrontIcon front={m.id} size={16} /> {n}
					</span>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="cl">
		{#each BLUEPRINT_DEFS as bp}
			{@const status = getBlueprintStatus(bp.id, ownedBlueprints, discoveredBlueprints)}
			{@const cost = getPathSchematicCost(bp.id)}
			{@const costFrontId = cost ? FRONT_META[cost.front - 1]!.id : null}
			{@const have = cost ? getSchematics(schematicsByFront, cost.front) : 0}
			{@const aff = !!cost && have >= cost.cost}
			{@const fieldCount = getFieldUpgradesUnlockedBy(bp.id).length}
			{@const foundryCount = getFoundryUpgradesUnlockedBy(bp.id).length}
			
			<div class="cc" class:lck={status === 'undiscovered'}>
				<div class="cc-h">
					<span class="cci">{status === 'owned' ? '✅' : status === 'discovered' ? bp.icon : '🔒'}</span>
					<div>
						<div class="ccn">{status === 'undiscovered' ? '??? Unknown Schematic' : bp.name}</div>
						<div class="ccd">{status === 'undiscovered' ? 'Schematic not yet recovered.' : bp.description}</div>
					</div>
				</div>
				
				{#if status === 'owned'}
					<div class="ccs">✓ Reconstructed — unlocks {fieldCount} field + {foundryCount} foundry upgrade{fieldCount + foundryCount === 1 ? '' : 's'}</div>
				{:else if status === 'discovered'}
					<div class="ccl-found">🔍 Recovered — ready to reconstruct</div>
					<div class="uc-b" style="margin-top:.3rem">
						{#if cost && costFrontId}
							<button class="hub-action" disabled={!aff} onclick={() => buyBlueprint(bp.id)} style={aff ? 'background:linear-gradient(135deg,var(--cyan),var(--blue));color:var(--bg-primary);font-weight:600' : ''}>
								<span class="ucc">📐{cost.cost} {getFrontName(costFrontId)}</span> Reconstruct
							</button>
						{:else}
							<span class="ucc" style="color:var(--text-dim)">Reconstruction not yet available</span>
						{/if}
					</div>
				{:else}
					<div class="ccl">🔒 {describeBlueprintDiscovery(bp)}</div>
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
	
	.schem-bal { display:flex; flex-wrap:wrap; gap:.4rem; margin:.4rem 0 .8rem; }
	.schem-chip { display:inline-flex; align-items:center; gap:.25rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-secondary); background:rgba(0,0,0,.18); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.15rem .4rem; }
	
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.cc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.cc.lck { opacity:.55; }
	.cc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.cci { font-size:var(--fs-icon-lg); flex-shrink:0; margin-top:2px; }
	.ccn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.ccd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	
	.ccs,.ccl,.ccl-found { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.ccl-found { color:var(--cyan); background:rgba(0,255,255,.08); }
	.ccs { color:var(--green); }
	
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	.uc-b { display:block; }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
