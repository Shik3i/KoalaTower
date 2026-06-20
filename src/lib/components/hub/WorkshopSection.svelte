<script lang="ts">
	import { FORGE_ECONOMY_WORKSHOP_IDS, buildWorkshopUpgradeList, getWorkshopUpgradeEffect } from '$lib/game/balance/workshopUpgrades';
	import { buildForgeUpgradeList, getForgeUpgradeEffect } from '$lib/game/balance/forgeUpgrades';
	import { formatBattleEffect } from '$lib/game/balance/upgradeScaling';
	import { isFieldUpgradeUnlocked, isFoundryUpgradeUnlocked, getBlueprintForFieldUpgrade, getBlueprintForFoundryUpgrade } from '$lib/game/balance/blueprints';
	import { tooltip } from '$lib/components/tooltip';
	import type { UpgradeId, WorkshopUpgradeId, BlueprintId } from '$lib/game/engine/gameTypes';

	let {
		buyMultiplier = $bindable(),
		coins,
		forgeLevels,
		workshopLevels,
		ownedBlueprints,
		buyForgeUpgrade,
		buyWorkshopUpgrade
	}: {
		buyMultiplier: 1 | 5 | 10 | 50 | 'max';
		coins: number;
		forgeLevels: Partial<Record<UpgradeId, number>>;
		workshopLevels: Partial<Record<WorkshopUpgradeId, number>>;
		ownedBlueprints: BlueprintId[];
		buyForgeUpgrade: (id: UpgradeId) => void;
		buyWorkshopUpgrade: (id: WorkshopUpgradeId) => void;
	} = $props();

	// Local constants & setup
	const BUY_MULTIPLIERS = [1, 5, 10, 50, 'max'] as const;
	const FORGE_UPGRADES = buildForgeUpgradeList();
	const FORGE_ECONOMY_SET = new Set(FORGE_ECONOMY_WORKSHOP_IDS);
	const WORKSHOP_UPGRADES = buildWorkshopUpgradeList().filter(u => FORGE_ECONOMY_SET.has(u.id));

	// Local helper functions
	function fLv(id: UpgradeId): number {
		return forgeLevels[id] ?? 0;
	}

	function wLv(id: WorkshopUpgradeId): number {
		return workshopLevels[id] ?? 0;
	}

	function forgeValueLabel(id: UpgradeId, level: number): string {
		return formatBattleEffect(id, getForgeUpgradeEffect(id, level));
	}
</script>

<div class="hs">
	<h2 class="hst">⚙ Forge</h2>
	<p class="hsd">Permanent pre-installed tower upgrades. Each Forge level sets the <strong>starting level</strong> of the matching Field Upgrade — the same curve continues in deployment, where you buy the next levels with Energy. Locked paths require Schematic reconstruction. The Forge never stops. Neither does the paperwork.</p>
	
	<div class="buy-mult">
		<span class="mult-label">Buy</span>
		{#each BUY_MULTIPLIERS as m}
			{@const val = m}
			<button
				class="mult-btn"
				class:on={buyMultiplier === val}
				onclick={() => buyMultiplier = val}
				use:tooltip={
					val === 'max'
						? 'Buy as many levels as you can afford.\nShortcut: hold Ctrl while buying.'
						: val === 50
							? 'Buy up to 50 levels at once.\nShortcut: Shift + Ctrl.'
							: val === 10
								? 'Buy up to 10 levels at once.'
								: val === 5
									? 'Buy up to 5 levels at once.\nShortcut: hold Shift.'
									: 'Buy a single level.'
				}
			>
				{val === 'max' ? 'Max' : '×' + val}
			</button>
		{/each}
	</div>

	<h3 class="forge-sub">Combat — starting Field levels</h3>
	<div class="ug">
		{#each FORGE_UPGRADES as u}
			{@const lv = fLv(u.id)}
			{@const nl = Math.min(lv + 1, u.maxLevel)}
			{@const cost = u.cost(lv)}
			{@const aff = coins >= cost}
			{@const mx = lv >= u.maxLevel}
			{@const locked = !!u.requiredBlueprint && !isFieldUpgradeUnlocked(u.id, ownedBlueprints)}
			{@const bpName = u.requiredBlueprint ? (getBlueprintForFieldUpgrade(u.id)?.name ?? '') : ''}
			
			<button
				class="uc"
				class:aff={aff && !mx && !locked}
				class:mx={mx}
				class:locked={locked}
				disabled={!aff || mx || locked}
				onclick={() => buyForgeUpgrade(u.id)}
				use:tooltip={
					locked
						? `🔒 ${u.name}\nRequires the ${bpName} Schematic.\nReconstruct it in the Schematics tab to unlock this path.`
						: mx
							? `${u.name} — MAXED at Lv.${lv}\nStarts deployment at: ${forgeValueLabel(u.id, lv)}\nNo further Forge levels available.`
							: `${u.name} — Forge Lv.${lv}\nStarts deployment at: ${forgeValueLabel(u.id, lv)}\nNext (Lv.${nl}): ${forgeValueLabel(u.id, nl)}\nCost: ${cost.toLocaleString()} Alloy${aff ? '' : ' — not enough Alloy yet'}`
				}
			>
				<div class="uc-t">
					<span class="uci">{locked ? '🔒' : u.icon}</span>
					<span class="ucn">{u.name}</span>
					<span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span>
				</div>
				{#if !locked}
					<div class="uc-btr">
						<div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div>
					</div>
					<div class="uc-val">{forgeValueLabel(u.id, lv)}</div>
					<div class="uc-b">
						<span class="ucc">🔩{cost.toLocaleString()}</span>
						<span class="ucnx">{mx ? 'MAXED' : '→ ' + forgeValueLabel(u.id, nl)}</span>
					</div>
				{:else}
					<div class="uc-val" style="color:var(--text-dim)">🔒 Requires {bpName}</div>
				{/if}
			</button>
		{/each}
	</div>

	<h3 class="forge-sub">Economy — permanent income</h3>
	<div class="ug">
		{#each WORKSHOP_UPGRADES as u}
			{@const lv = wLv(u.id)}
			{@const nl = Math.min(lv + 1, u.maxLevel)}
			{@const cost = u.cost(lv)}
			{@const aff = coins >= cost}
			{@const mx = lv >= u.maxLevel}
			{@const locked = u.requiredBlueprint && !isFoundryUpgradeUnlocked(u.id, ownedBlueprints)}
			{@const bpName = u.requiredBlueprint ? (getBlueprintForFoundryUpgrade(u.id)?.name ?? '') : ''}
			
			<button
				class="uc"
				class:aff={aff && !mx && !locked}
				class:mx={mx}
				class:locked={locked}
				disabled={!aff || mx || locked}
				onclick={() => buyWorkshopUpgrade(u.id)}
				use:tooltip={
					locked
						? `🔒 ${u.name}\nRequires the ${bpName} Schematic.\nReconstruct it in the Schematics tab to unlock this path.`
						: mx
							? `${u.name} — MAXED\nCurrent bonus: +${getWorkshopUpgradeEffect(u.id, lv)}\nNo further levels available.`
							: `${u.name}\nCurrent: ${lv > 0 ? '+' + getWorkshopUpgradeEffect(u.id, lv) : 'not yet installed'}\nNext (Lv.${nl}): +${getWorkshopUpgradeEffect(u.id, nl)}\nCost: ${cost.toLocaleString()} Alloy${aff ? '' : ' — not enough Alloy yet'}`
				}
			>
				<div class="uc-t">
					<span class="uci">{locked ? '🔒' : u.icon}</span>
					<span class="ucn">{u.name}</span>
					<span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span>
				</div>
				{#if !locked}
					<div class="uc-btr">
						<div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div>
					</div>
					<div class="uc-b">
						<span class="ucc">🔩{cost.toLocaleString()}</span>
						<span class="ucnx">{mx ? 'MAXED' : lv > 0 ? '→ +' + getWorkshopUpgradeEffect(u.id, nl) : 'Lv.1 +' + getWorkshopUpgradeEffect(u.id, 1)}</span>
					</div>
				{:else}
					<div class="uc-b">
						<span class="ucc" style="color:var(--text-dim)">🔒 Requires {bpName}</span>
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.buy-mult { display:flex; align-items:center; gap:2px; margin-bottom:.5rem; }
	.mult-label { font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); margin-right:.2rem; }
	.mult-btn { padding:.15rem .4rem; font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:4px; background:rgba(0,0,0,.12); border:1px solid transparent; cursor:pointer; transition:all var(--transition-fast); }
	.mult-btn:hover { color:var(--text-secondary); border-color:var(--border-neon); }
	.mult-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }
	
	.forge-sub { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin:.6rem 0 .3rem; }
	.forge-sub:first-of-type { margin-top:.2rem; }
	
	.ug { display:flex; flex-direction:column; gap:4px; max-width:800px; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.72rem .8rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.uc.mx { opacity:.5; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.65; cursor:default; }
	
	.uc-t { display:flex; align-items:center; gap:.35rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	
	.uc-btr { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	
	.uc-val { font-size:var(--fs-mono-lg); color:var(--text-primary); font-family:var(--font-mono); font-weight:600; padding:.02rem 0; }
	.uc.aff .uc-val { color:var(--green); }
	
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
