<script lang="ts">
	import {
		getActiveOrders,
		getCompletedOrders,
		isOrderComplete,
		claimableMilestones,
		nextMilestone,
		boardRefreshRemainingMs,
		formatRefreshCountdown,
		COMMAND_ORDERS_MAX_PER_WEEK,
		GIFT_BOX_REWARDS,
		type CommandOrderInstance,
		type CommandOrdersState,
	} from '$lib/game/balance/commandOrders';
	import { tooltip } from '$lib/components/tooltip';

	let {
		commandOrderPool,
		commandOrdersState,
		claimGiftBox,
		claimCommandOrder,
		claimAllCompleted
	}: {
		commandOrderPool: CommandOrderInstance[];
		commandOrdersState: CommandOrdersState;
		claimGiftBox: (m: number) => void;
		claimCommandOrder: (slot: number) => void;
		claimAllCompleted: () => void;
	} = $props();

	let showCompletedOrders = $state(true);

	// Derived logic for local state
	let activeOrders = $derived(getActiveOrders(commandOrderPool, commandOrdersState));
	let completedOrders = $derived(getCompletedOrders(commandOrderPool, commandOrdersState));
	let ordersDone = $derived(commandOrdersState.completedCount);
	let nextGift = $derived(nextMilestone(commandOrdersState));
	let giftsReady = $derived(claimableMilestones(commandOrdersState));
	let refreshRemaining = $derived(boardRefreshRemainingMs(commandOrdersState));
	let refreshLabel = $derived(formatRefreshCountdown(refreshRemaining));
	let canClaimAll = $derived(completedOrders.length > 1);
</script>

<div class="hs">
	<h2 class="hst">🛰 Command Orders</h2>
	<p class="hsd">Orbital Command has issued this week's assignments. Complete orders to improve your standing with Command. Command favor resets weekly. Missed days are not prosecuted. Usually.</p>
	<div class="bm-ledger">
		<div class="ir"><span class="il">Orbital Favor this week</span><span class="iv">{ordersDone} / {COMMAND_ORDERS_MAX_PER_WEEK}</span></div>
		<div class="ir"><span class="il">{nextGift ? 'Next Command Gift Box' : 'All gift boxes claimed'}</span><span class="iv">{nextGift ? `${ordersDone} / ${nextGift}` : '✓'}</span></div>
		{#if refreshLabel}
			<div class="ir"><span class="il">Next order refresh in</span><span class="iv" style="color:var(--cyan);">{refreshLabel}</span></div>
		{/if}
	</div>

	{#if giftsReady.length > 0}
		<div class="gift-row">
			{#each giftsReady as m}
				<button class="hub-action bm-primary gift-btn" onclick={() => claimGiftBox(m)} use:tooltip={'Command Gift Box ready.'}>🎁 Command Gift Box ({m}) — +{GIFT_BOX_REWARDS[m]} Alloy</button>
			{/each}
		</div>
	{/if}

	{#if ordersDone >= COMMAND_ORDERS_MAX_PER_WEEK}
		<p class="empty-flavor">Weekly Command Orders complete. Your obedience has been noticed. Briefly. Command favor resets next week.</p>
	{/if}

	<!-- Active Orders -->
	<h3 class="stats-sub" style="margin-top:.5rem">Active Orders</h3>
	<div class="ug">
		{#each activeOrders as order}
			{@const prog = commandOrdersState.counters[order.key] ?? 0}
			{@const complete = isOrderComplete(order, commandOrdersState.counters)}
			{@const started = prog > 0 && !complete}
			{@const pct = Math.min(100, (prog / order.target) * 100)}
			<div class="uc task-card" class:aff={complete} class:started={started}>
				<div class="uc-t"><span class="uci">🛰</span><span class="ucn">{order.label}</span><span class="ucl">+{order.reward} Alloy</span></div>
				<div class="uc-btr"><div class="uc-btf" style="width:{pct}%"></div></div>
				<div class="uc-b">
					<span class="ucc" style="color:var(--text-secondary)">{Math.min(prog, order.target).toLocaleString()} / {order.target.toLocaleString()}</span>
					{#if complete}
						<button class="hub-action task-claim" onclick={() => claimCommandOrder(order.slot)}>Claim Alloy</button>
					{:else}
						<span class="ucnx">{started ? 'In progress' : 'Available'}</span>
					{/if}
				</div>
			</div>
		{/each}
		{#if activeOrders.length === 0 && ordersDone < COMMAND_ORDERS_MAX_PER_WEEK}
			<p class="empty-flavor">No active orders right now. Check back after the board refreshes or complete a deployment.</p>
		{/if}
	</div>

	<!-- Completed Orders -->
	{#if completedOrders.length > 0}
		<button
			type="button"
			class="stats-sub completed-toggle"
			onclick={() => showCompletedOrders = !showCompletedOrders}
			aria-expanded={showCompletedOrders}
			aria-controls="completed-orders-section"
			aria-label={`${showCompletedOrders ? 'Collapse' : 'Expand'} completed Command Orders`}
		>
			<span>{showCompletedOrders ? '▾' : '▸'}</span> Completed ({completedOrders.length})
		</button>
		{#if showCompletedOrders}
			{#if canClaimAll}
				<button class="hub-action bm-primary" style="margin-bottom:.4rem" onclick={claimAllCompleted}>Claim All (+{completedOrders.reduce((s, o) => s + o.reward, 0)} Alloy)</button>
			{/if}
			<div class="ug" id="completed-orders-section">
				{#each completedOrders as order}
					<div class="uc task-card aff">
						<div class="uc-t"><span class="uci">✅</span><span class="ucn">{order.label}</span><span class="ucl">+{order.reward} Alloy</span></div>
						<div class="uc-btr"><div class="uc-btf" style="width:100%"></div></div>
						<div class="uc-b">
							<span class="ucc" style="color:var(--green)">Complete — awaiting acknowledgement</span>
							<button class="hub-action task-claim" onclick={() => claimCommandOrder(order.slot)}>Claim Alloy</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
	<p class="orders-footer">Every five completed orders unlocks a Command Gift Box. Orders you've started stay visible until claimed — board refresh only fills empty slots.</p>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.bm-ledger { display:grid; gap:3px; max-width:420px; margin-bottom:1rem; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); }
	.iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	
	.gift-row { display:flex; flex-wrap:wrap; gap:.4rem; margin:.5rem 0; }
	.gift-btn { background:linear-gradient(135deg,var(--yellow),var(--orange)); color:var(--bg-primary); font-weight:600; }
	
	.empty-flavor { color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-mono-sm); line-height:1.5; margin:0 0 1rem; padding:.6rem .8rem; border:1px dashed var(--border-neon); border-radius:var(--radius-sm); background:rgba(0,255,255,.03); }
	
	.stats-sub { margin:.9rem 0 .45rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.completed-toggle { margin-top:1rem; display:flex; align-items:center; gap:.35rem; width:100%; padding:0; background:transparent; border:0; text-align:left; cursor:pointer; }
	.completed-toggle:focus-visible { outline:2px solid var(--cyan); outline-offset:3px; border-radius:var(--radius-sm); }
	
	.ug { display:flex; flex-direction:column; gap:4px; max-width:800px; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.72rem .8rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); }
	
	.task-card.aff { border-color:rgba(68,255,136,.4); background:rgba(68,255,136,.04); }
	.task-claim { padding:.2rem .6rem; margin-left:auto; background:linear-gradient(135deg,var(--green),var(--cyan)); color:var(--bg-primary); font-weight:600; font-size:var(--fs-mono-sm); border-radius:var(--radius-sm); }
	.orders-footer { margin-top:.6rem; font-size:var(--fs-caption-sm); color:var(--text-dim); font-style:italic; }

	.uc-t { display:flex; align-items:center; gap:.35rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	
	.uc-btr { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	
	.bm-primary { border-color:rgba(0,255,255,.35); color:var(--cyan); }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
