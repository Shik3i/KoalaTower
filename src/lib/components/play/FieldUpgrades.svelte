<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { UpgradeId, type GameSnapshot, type BlueprintId } from '$lib/game/engine/gameTypes';
	import { buildBattleUpgradeList, getBattleUpgradeEffect } from '$lib/game/balance/battleUpgrades';
	import { formatBattleEffect } from '$lib/game/balance/upgradeScaling';
	import { isFieldUpgradeUnlocked, getBlueprintForFieldUpgrade } from '$lib/game/balance/blueprints';
	import { getCachedSave } from '$lib/game/save/saveService';

	type BuyMultiplier = 1 | 5 | 10 | 50 | 'max';

	let {
		snap,
		upgradeCategory = $bindable('offense'),
		buyMultiplier = $bindable(1),
		showBuyMultiplier = true,
		scrollList = false,
		purchasedId = null,
		onBuy,
	}: {
		snap: GameSnapshot | null;
		upgradeCategory?: 'offense' | 'defense' | 'utility';
		buyMultiplier?: BuyMultiplier;
		showBuyMultiplier?: boolean;
		scrollList?: boolean;
		purchasedId?: string | null;
		onBuy: (id: UpgradeId) => void;
	} = $props();

	const BATTLE_UPGRADES = buildBattleUpgradeList();
	const MULTIPLIERS: BuyMultiplier[] = [1, 5, 10, 50, 'max'];

	/** Readable current effect of an upgrade at the given level. */
	function upgradeCurrentValue(id: UpgradeId, lv: number): string {
		if (lv === 0) return '—';
		return formatBattleEffect(id, getBattleUpgradeEffect(id, lv));
	}

	/** Readable effect at the next level. */
	function upgradeNextValue(id: UpgradeId, lv: number): string {
		return upgradeCurrentValue(id, Math.min(lv + 1, 999));
	}

	function lvOf(id: UpgradeId): number {
		return snap?.upgradeLevels[id] ?? 0;
	}

	/** Whether a field upgrade is still locked behind an un-owned blueprint. */
	function isUpgradeLocked(id: UpgradeId): boolean {
		const unlockedBPs = (getCachedSave()?.unlockedBlueprints ?? []) as BlueprintId[];
		return !isFieldUpgradeUnlocked(id, unlockedBPs);
	}

	/** Name of the blueprint that gates a locked upgrade. */
	function getLockBlueprintName(id: UpgradeId): string {
		return getBlueprintForFieldUpgrade(id)?.name ?? 'Unknown';
	}
</script>

<div class="cat-tabs">
	<button class="cat-tab" class:on={upgradeCategory === 'offense'} onclick={() => upgradeCategory = 'offense'} title="Damage, Attack Speed, Range, Multishot, Crit"><Icon name="offense" size={13} /> Offense</button>
	<button class="cat-tab" class:on={upgradeCategory === 'defense'} onclick={() => upgradeCategory = 'defense'} title="Defense (flat reduction), Max HP"><Icon name="defense" size={13} /> Defense</button>
	<button class="cat-tab" class:on={upgradeCategory === 'utility'} onclick={() => upgradeCategory = 'utility'} title="Energy Amp (+% energy per kill)"><Icon name="utility" size={13} /> Utility</button>
</div>
{#if showBuyMultiplier}
	<div class="buy-mult">
		<span class="mult-label">Buy</span>
		{#each MULTIPLIERS as val}
			<button class="mult-btn" class:on={buyMultiplier === val} onclick={() => buyMultiplier = val} title={val === 'max' ? 'Buy max affordable (Ctrl)' : val === 50 ? 'Buy ×50 (Shift+Ctrl)' : val === 5 ? 'Buy ×5 (Shift)' : 'Buy ×1'}>{val === 'max' ? 'Max' : '×' + val}</button>
		{/each}
	</div>
{/if}
<div class="ug" class:ug-scroll={scrollList}>
	{#each BATTLE_UPGRADES.filter(u => u.category === upgradeCategory) as u}
		{@const lv = lvOf(u.id)}
		{@const cost = u.cost(lv)}
		{@const aff = (snap?.cash ?? 0) >= cost}
		{@const mx = lv >= u.maxLevel}
		{@const locked = isUpgradeLocked(u.id)}
		<button
			class="uc"
			class:aff={aff && !mx && !locked}
			class:mx={mx}
			class:locked={locked}
			class:purchased={purchasedId === u.id}
			disabled={!aff || mx || locked || !snap?.runActive}
			onclick={() => onBuy(u.id)}
			title={locked ? 'Locked: reconstruct the ' + getLockBlueprintName(u.id) + ' Schematic' : 'Current: ' + upgradeCurrentValue(u.id, lv) + ' | Next: ' + upgradeNextValue(u.id, lv) + ' | Cost: ' + cost + ' Energy'}
		>
			<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
			{#if !locked}
				<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
				<div class="uc-eff">{upgradeCurrentValue(u.id, lv)}</div>
				<div class="uc-b"><span class="ucc">⚡{cost}</span><span class="ucnx">{mx ? 'MAXED' : '→ ' + upgradeNextValue(u.id, lv)}</span></div>
			{:else}
				<div class="uc-eff" style="color:var(--text-dim)">🔒 Requires {getLockBlueprintName(u.id)}</div>
			{/if}
		</button>
	{/each}
</div>

<style>
	.cat-tabs { display:flex; gap:2px; margin-bottom:.35rem; padding:2px; background:rgba(0,0,0,.12); border-radius:var(--radius-sm); }
	.cat-tab { flex:1; padding:.25rem .2rem; font-size:var(--fs-body-sm); color:var(--text-secondary); border-radius:4px; transition:all var(--transition-fast); text-align:center; cursor:pointer; }
	.cat-tab.on { color:var(--cyan); background:rgba(0,255,255,.08); }
	.cat-tab:hover:not(.on) { color:var(--text-primary); background:rgba(255,255,255,.02); }
	.buy-mult { display:flex; align-items:center; gap:2px; margin-bottom:.35rem; }
	.mult-label { font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); margin-right:.2rem; }
	.mult-btn { padding:.15rem .35rem; font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:4px; background:rgba(0,0,0,.12); border:1px solid transparent; cursor:pointer; transition:all var(--transition-fast); }
	.mult-btn:hover { color:var(--text-secondary); border-color:var(--border-neon); }
	.mult-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }
	.ug { display:flex; flex-direction:column; gap:2px; }
	.ug-scroll { max-height:35vh; overflow-y:auto; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.52rem .55rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); box-shadow:0 0 8px rgba(0,255,255,.06); }
	.uc.purchased { animation:purchaseGlow .5s ease-out; }
	@keyframes purchaseGlow { 0%{box-shadow:0 0 0 rgba(0,255,255,0);transform:scale(1)} 25%{box-shadow:0 0 25px rgba(0,255,255,.8),0 0 50px rgba(0,255,255,.3);transform:scale(1.03)} 100%{box-shadow:0 0 0 rgba(0,255,255,0);transform:scale(1)} }
	.uc.mx { opacity:.45; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.55; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.25rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	.uc-btr { height:3px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-eff { font-size:var(--fs-mono); color:var(--text-secondary); font-family:var(--font-mono); padding:.05rem 0; }
	.uc.aff .uc-eff { color:var(--green); }
	.uc-b { display:flex; align-items:center; gap:.3rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
</style>
