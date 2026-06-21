<script lang="ts">
	import {
		canClaimWeeklyShipment,
		canClaimDailyStrangeMatter,
		weeklyShipmentRemainingMs,
		STRANGE_MATTER_WEEKLY_SHIPMENT,
		STRANGE_MATTER_DAILY_PICKUP,
		BLACK_MARKET_UNLOCKS,
		hasBlackMarketUnlock,
		SCHEMATIC_CONVERSION_RATE,
		type BlackMarketUnlockId,
		type BlackMarketUnlocks
	} from '$lib/game/balance/blackMarket';
	import { FRONT_META, getFrontName } from '$lib/game/balance/tiers';
	import { getSchematics } from '$lib/game/balance/schematics';
	import { tooltip } from '$lib/components/tooltip';

	let {
		converterSourceFront = $bindable(),
		lastWeeklyBlackMarketShipmentClaimedAt,
		lastDailyStrangeMatterPickedUpAt,
		bmUnlocked,
		schematicsByFront,
		strangeMatter,
		lifetimeStrangeMatterEarned,
		blackMarketUnlocks,
		autoDeploymentEnabled,
		nowTick,
		bmSignalText,
		bmShipmentFlavour,
		bmDailyFlavour,
		openShipmentModal,
		claimDailyPickup,
		buyBlackMarketUnlock,
		toggleAutoDeployment,
		convertOneSchematic
	}: {
		converterSourceFront: number;
		lastWeeklyBlackMarketShipmentClaimedAt: number;
		lastDailyStrangeMatterPickedUpAt: number;
		bmUnlocked: boolean;
		schematicsByFront: Record<number, number>;
		strangeMatter: number;
		lifetimeStrangeMatterEarned: number;
		blackMarketUnlocks: BlackMarketUnlocks;
		autoDeploymentEnabled: boolean;
		nowTick: number;
		bmSignalText: string;
		bmShipmentFlavour: string;
		bmDailyFlavour: string;
		openShipmentModal: () => void;
		claimDailyPickup: () => void;
		buyBlackMarketUnlock: (id: BlackMarketUnlockId) => void;
		toggleAutoDeployment: () => void;
		convertOneSchematic: (max: boolean) => void;
	} = $props();

	// Derived logic for local state
	let weeklyReady = $derived(canClaimWeeklyShipment(lastWeeklyBlackMarketShipmentClaimedAt, nowTick));
	let dailyReady = $derived(canClaimDailyStrangeMatter(bmUnlocked, lastDailyStrangeMatterPickedUpAt, nowTick));
	let sourceBalance = $derived(getSchematics(schematicsByFront, converterSourceFront));
	let maxConversions = $derived(Math.floor(sourceBalance / SCHEMATIC_CONVERSION_RATE));

	function formatDuration(ms: number): string {
		const totalMinutes = Math.ceil(Math.max(0, ms) / 60000);
		const days = Math.floor(totalMinutes / 1440);
		const hours = Math.floor((totalMinutes % 1440) / 60);
		const minutes = totalMinutes % 60;
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}
</script>

<div class="hs bm-layout">
	<div class="bm-header-bar">
		<h2 class="hst bm-header-title">◈ BLACK MARKET</h2>
		<span class="bm-header-sub">{bmSignalText}</span>
	</div>
	<p class="hsd bm-copy">Orbital Command does not authorize the possession, trade, study, inhalation, resale, or emotional attachment to Strange Matter. Fortunately, this terminal is not connected to Orbital Command.</p>
	<div class="bm-ledger">
		<div class="ir"><span class="il">Strange Matter</span><span class="iv">◈ {strangeMatter.toLocaleString()}</span></div>
		<div class="ir"><span class="il">Lifetime Recovered</span><span class="iv">◈ {lifetimeStrangeMatterEarned.toLocaleString()}</span></div>
	</div>

	<div class="bm-grid">
		<section class="bm-panel">
			<h3 class="stats-sub">Unmarked Shipment</h3>
			{#if weeklyReady}
				<p class="hsd">{bmShipmentFlavour}</p>
				<div class="bm-actions">
					<button class="hub-action bm-primary" onclick={openShipmentModal}>Inspect Shipment (+{STRANGE_MATTER_WEEKLY_SHIPMENT})</button>
				</div>
			{:else}
				<p class="hsd">Previous shipment accepted. No record exists of the transaction.</p>
				<div class="ccl">Next shipment in {formatDuration(weeklyShipmentRemainingMs(lastWeeklyBlackMarketShipmentClaimedAt, nowTick))}</div>
			{/if}
		</section>

		<section class="bm-panel">
			<h3 class="stats-sub">Daily Pickup</h3>
			<p class="hsd bm-pickup-copy">{bmDailyFlavour}</p>
			<button class="hub-action bm-primary" disabled={!dailyReady} onclick={claimDailyPickup}>Take the Vial (+{STRANGE_MATTER_DAILY_PICKUP})</button>
			{#if !dailyReady}
				<div class="ccl">Picked up today. Back tomorrow.</div>
			{:else}
				<div class="ccl">No deployment needed — just stop by.</div>
			{/if}
		</section>
	</div>

	<h3 class="stats-sub" style="margin-top:1rem">Contraband Procurement</h3>
	<div class="cl">
		{#each BLACK_MARKET_UNLOCKS as item}
			{@const owned = hasBlackMarketUnlock(blackMarketUnlocks, item.id)}
			{@const reqOk = !item.requirement || hasBlackMarketUnlock(blackMarketUnlocks, item.requirement)}
			{@const aff = strangeMatter >= item.cost}
			
			<div class="cc" class:lck={!owned && (!reqOk || !aff)}
				use:tooltip={
					owned
						? `${item.name}\nProcured.${item.status === 'scaffold' ? '\nFull effect remains reserved for a later update.' : ''}`
						: item.status === 'scaffold'
							? `${item.name}\nComing later — procurement is not available yet.\nPlanned cost: ◈ ${item.cost} Strange Matter`
							: item.requirement && !reqOk
								? `${item.name}\nLocked — first procure ${BLACK_MARKET_UNLOCKS.find(u => u.id === item.requirement)?.name ?? ''}.\nCost: ◈ ${item.cost} Strange Matter`
								: `${item.name}\nCost: ◈ ${item.cost} Strange Matter${aff ? '' : ' — not enough recovered yet'}`
				}
			>
				<div class="cc-h">
					<span class="cci">{owned ? '✓' : '◈'}</span>
					<div>
						<div class="ccn">{item.name}</div>
						<div class="ccd">{item.description}</div>
					</div>
				</div>
				<div class="uc-b" style="margin-top:.35rem">
					<span class="ucc">◈ {item.cost}</span>
					{#if owned}
						<span class="ucnx">OWNED{item.status === 'scaffold' ? ' · effect pending' : ''}</span>
					{:else if item.status === 'scaffold'}
						<span class="ucnx">COMING LATER</span>
					{:else if item.requirement && !reqOk}
						<span class="ucnx">Requires {BLACK_MARKET_UNLOCKS.find(u => u.id === item.requirement)?.name}</span>
					{:else}
						<button class="hub-action" disabled={!aff} onclick={() => buyBlackMarketUnlock(item.id)}>{aff ? 'Procure' : 'Need more'}</button>
					{/if}
				</div>
				{#if item.id === 'autoDeployment' && owned}
					<button class="hub-action" style="margin-top:.35rem" onclick={toggleAutoDeployment} use:tooltip={`Auto Deployment ${autoDeploymentEnabled ? 'is ARMED' : 'is idle'}.\nWhen armed, deployments relaunch automatically after a tower falls.\nLocal only — runs in this browser, even offline.`}>{autoDeploymentEnabled ? 'Disable Auto Deployment' : 'Arm Auto Deployment'}</button>
				{/if}
			</div>
		{/each}
	</div>

	{#if hasBlackMarketUnlock(blackMarketUnlocks, 'schematicConverter')}
		<section class="bm-panel converter">
			<h3 class="stats-sub">Schematic Converter</h3>
			<p class="hsd">Twenty-five obsolete designs go in. One restricted design comes out. Nobody asks why the ink is still wet.</p>
			<div class="sim-controls">
				<div class="sim-param">
					<label class="sim-label" for="converter-front">Source:</label>
					<select id="converter-front" bind:value={converterSourceFront} class="sim-select">
						{#each FRONT_META.slice(0, 15) as m}
							{@const targetFront = FRONT_META[m.front]}
							<option value={m.front}>{m.displayName} -> {targetFront ? getFrontName(targetFront.id) : 'Front ' + (m.front + 1)}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="ig" style="max-width:600px">
				<div class="ir"><span class="il">Source Balance</span><span class="iv">{sourceBalance}</span></div>
				<div class="ir"><span class="il">Target Balance</span><span class="iv">{getSchematics(schematicsByFront, converterSourceFront + 1)}</span></div>
				<div class="ir"><span class="il">Rate</span><span class="iv">{SCHEMATIC_CONVERSION_RATE}:1</span></div>
				<div class="ir"><span class="il">Max Conversions</span><span class="iv">{maxConversions}</span></div>
			</div>
			<div class="bm-actions">
				<button class="hub-action bm-primary" disabled={maxConversions < 1} onclick={() => convertOneSchematic(false)}>Convert 1</button>
				<button class="hub-action" disabled={maxConversions < 1} onclick={() => convertOneSchematic(true)}>Convert Max</button>
			</div>
			<div class="ccl">Conversion can prepare future Front Schematics, but it does not unlock the Front itself.</div>
		</section>
	{/if}
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.bm-layout { border:1px solid rgba(136,68,255,.15); border-radius:var(--radius-md); padding:1.15rem 1.25rem; background:linear-gradient(180deg,rgba(136,68,255,.04),rgba(0,0,0,.06)),var(--bg-secondary); }
	.bm-header-bar { display:flex; align-items:baseline; gap:.65rem; flex-wrap:wrap; margin-bottom:.5rem; }
	.bm-header-title { color:rgba(210,190,255,.85); text-shadow:0 0 18px rgba(136,68,255,.18); font-size:var(--fs-heading); margin-bottom:.4rem; }
	.bm-header-sub { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:.65; text-transform:uppercase; letter-spacing:.04em; }
	.bm-copy { max-width:760px; color:rgba(210,190,255,.78); text-shadow:0 0 14px rgba(136,68,255,.08); }
	
	.bm-ledger { display:grid; gap:3px; max-width:420px; margin-bottom:1rem; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); }
	.iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	
	.bm-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin-bottom:1rem; }
	.bm-panel { padding:.85rem 1rem; background:linear-gradient(135deg,rgba(136,68,255,.055),rgba(0,0,0,.08)),var(--bg-tertiary); border:1px solid rgba(136,68,255,.22); border-radius:var(--radius-sm); box-shadow:inset 0 0 18px rgba(0,0,0,.18); }
	.bm-actions { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.65rem; }
	.bm-primary { border-color:rgba(0,255,255,.35); color:var(--cyan); }
	.converter { margin-top:1rem; max-width:760px; }
	.bm-pickup-copy { color:var(--text-secondary); font-style:italic; }
	
	.stats-sub { margin:.9rem 0 .45rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	
	.ccl { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.cc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.cc.lck { opacity:.55; }
	.cc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.cci { font-size:var(--fs-icon-lg); flex-shrink:0; margin-top:2px; }
	.ccn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.ccd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	
	.sim-controls { display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:1rem; padding:.75rem 1rem; background:rgba(0,0,0,.15); border-radius:var(--radius-sm); border:1px solid var(--border-neon); }
	.sim-param { display:flex; align-items:center; gap:.5rem; }
	.sim-label { font-size:var(--fs-body); color:var(--text-secondary); font-family:var(--font-mono); white-space:nowrap; }
	.sim-select { padding:.3rem .5rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:4px; font-family:var(--font-mono); font-size:var(--fs-body-sm); cursor:pointer; }
	
	.ig { display:grid; gap:3px; max-width:600px; }

	@media(max-width:767px){
		.bm-grid { grid-template-columns:1fr; }
	}

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
