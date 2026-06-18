<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { tooltip } from '$lib/components/tooltip';
	import { UpgradeId, type GameSnapshot, type BlueprintId } from '$lib/game/engine/gameTypes';
	import { buildBattleUpgradeList, getBattleUpgradeEffect } from '$lib/game/balance/battleUpgrades';
	import { formatBattleEffect, formatBattleEffectNext } from '$lib/game/balance/upgradeScaling';
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

	/** Readable current effective value of an upgrade at the given level. */
	function upgradeCurrentValue(id: UpgradeId, lv: number): string {
		if (lv === 0) {
			// Show base stat even at level 0 (no upgrades purchased yet)
			return formatBattleEffect(id, 0);
		}
		return formatBattleEffect(id, getBattleUpgradeEffect(id, lv));
	}

	/** Readable per-level delta for the next purchase (secondary info only). */
	function upgradeNextDelta(id: UpgradeId): string {
		const def = BATTLE_UPGRADES.find(u => u.id === id);
		if (!def) return '';
		return formatBattleEffectNext(id, getBattleUpgradeEffect(id, 1));
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
	<button class="cat-tab" class:on={upgradeCategory === 'offense'} onclick={() => upgradeCategory = 'offense'} use:tooltip={'Offense — Damage, Attack Speed, Range, Multishot, Crit.'}><Icon name="offense" size={13} /> Offense</button>
	<button class="cat-tab" class:on={upgradeCategory === 'defense'} onclick={() => upgradeCategory = 'defense'} use:tooltip={'Defense — flat damage reduction and Max HP.'}><Icon name="defense" size={13} /> Defense</button>
	<button class="cat-tab" class:on={upgradeCategory === 'utility'} onclick={() => upgradeCategory = 'utility'} use:tooltip={'Utility — Energy Amp (+% energy per kill).'}><Icon name="utility" size={13} /> Utility</button>
</div>
{#if showBuyMultiplier}
	<div class="buy-mult">
		<span class="mult-label">Buy</span>
		{#each MULTIPLIERS as val}
			<button class="mult-btn" class:on={buyMultiplier === val} onclick={() => buyMultiplier = val} use:tooltip={val === 'max' ? 'Buy as many levels as you can afford.\nShortcut: hold Ctrl.' : val === 50 ? 'Buy up to 50 levels.\nShortcut: Shift + Ctrl.' : val === 10 ? 'Buy up to 10 levels at once.' : val === 5 ? 'Buy up to 5 levels.\nShortcut: hold Shift.' : 'Buy a single level.'}>{val === 'max' ? 'Max' : '×' + val}</button>
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
			use:tooltip={locked
				? `🔒 ${u.name}\nLocked — reconstruct the ${getLockBlueprintName(u.id)} Schematic in Orbital Command.`
				: mx
					? `${u.name} — MAXED\nCurrent: ${upgradeCurrentValue(u.id, lv)}`
					: `${u.name}\nCurrent: ${upgradeCurrentValue(u.id, lv)}\nNext: ${upgradeNextDelta(u.id)}\nCost: ${cost} Energy${aff ? '' : ' — not enough Energy'}`}
		>
			<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
			{#if !locked}
				<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
				<div class="uc-val">{upgradeCurrentValue(u.id, lv)}</div>
				<div class="uc-b"><span class="ucc">⚡{cost.toLocaleString()}</span><span class="ucnx">{mx ? 'MAXED' : upgradeNextDelta(u.id)}</span></div>
			{:else}
				<div class="uc-val" style="color:var(--text-dim)">🔒 Requires {getLockBlueprintName(u.id)}</div>
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
	.uc-t { display:flex; align-items:center; gap:.3rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono); font-weight:600; color:var(--text-primary); }
	.ucl { font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	.uc-btr { height:3px; background:rgba(0,0,0,.35); border-radius:2px; overflow:hidden; margin-bottom:.08rem; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	/* Primary: current value */
	.uc-val { font-size:var(--fs-mono-lg); color:var(--text-primary); font-family:var(--font-mono); font-weight:600; padding:.02rem 0; }
	.uc.aff .uc-val { color:var(--green); }
	/* Bottom row: cost (prominent) + next delta (subtle) */
	.uc-b { display:flex; align-items:baseline; gap:.25rem; }
	.ucc { font-family:var(--font-mono); font-size:var(--fs-body); font-weight:600; color:var(--yellow); }
	.uc.aff .ucc { color:var(--yellow); }
	.ucnx { margin-left:auto; font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--text-secondary); }
</style>
