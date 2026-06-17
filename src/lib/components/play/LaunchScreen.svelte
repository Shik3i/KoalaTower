<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { TierId } from '$lib/game/engine/gameTypes';
	import { TIERS, getTierNumber, getFrontName, getPreviousFront, FRONT_UNLOCK_WAVE } from '$lib/game/balance/tiers';
	import { getFrontAlloyMultiplier } from '$lib/game/balance/balanceMath';

	let {
		highestWave,
		coins,
		totalRuns,
		selectedFront = $bindable(TierId.Tier1),
		unlockedFronts,
		onDeploy,
	}: {
		highestWave: number;
		coins: number;
		totalRuns: number;
		selectedFront?: TierId;
		unlockedFronts: TierId[];
		onDeploy: () => void;
	} = $props();
</script>

<div class="start-ol">
	<div class="start-card">
		<div class="sc-accent"></div>
		<div class="sc-icon"><img class="sc-logo" src="/branding/flatland-logo-medium.svg" alt="Flatland TD" /></div>
		<h2 class="sc-title">Flatland TD</h2>
		<p class="sc-sub">Deploy from orbit. Defend the plane. Field upgrades are lost with the tower — Orbital research endures.</p>
		{#if highestWave > 0}
			<div class="sc-rec">
				<div class="sc-r"><Icon name="crit" size={15} /> Best: Wave {highestWave}</div>
				<div class="sc-r"><Icon name="alloy" size={15} /> {coins.toLocaleString()} Alloy</div>
				<div class="sc-r"><Icon name="play" size={15} /> {totalRuns} Runs</div>
			</div>
		{/if}
		<!-- Front (tier) selector -->
		<div class="front-sel">
			<div class="front-sel-h"><Icon name="hub" size={13} /> Select Front</div>
			<div class="front-list">
				{#each TIERS as t}
					{@const unlocked = unlockedFronts.includes(t.id)}
					<button
						class="front-opt"
						class:on={selectedFront === t.id}
						class:locked={!unlocked}
						disabled={!unlocked}
						onclick={() => selectedFront = t.id}
						title={unlocked ? t.name : 'Locked — reach Wave ' + FRONT_UNLOCK_WAVE + ' on ' + (getPreviousFront(t.id) ? getFrontName(getPreviousFront(t.id)!) : '')}
					>
						<span class="front-n">{getFrontName(t.id)}</span>
						<span class="front-sub">{unlocked ? (t.id === TierId.Tier1 ? 'Baseline · ×' + getFrontAlloyMultiplier(1).toFixed(1) + ' Alloy' : '×' + getTierNumber(t.id) + ' front · ×' + getFrontAlloyMultiplier(getTierNumber(t.id)).toFixed(1) + ' Alloy') : '🔒 W' + FRONT_UNLOCK_WAVE + '·T' + (getPreviousFront(t.id) ? getTierNumber(getPreviousFront(t.id)!) : '')}</span>
					</button>
				{/each}
			</div>
		</div>
		<button class="sc-btn" onclick={onDeploy}><span class="sc-bi"></span><span class="sc-bt"><Icon name="play" size={16} /> Deploy to {getFrontName(selectedFront)}</span></button>
		<p class="sc-hint"><kbd>Enter</kbd> start · <kbd>Space</kbd> pause · <kbd>1-4</kbd> speed</p>
	</div>
</div>

<style>
	.start-ol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at center,rgba(7,8,18,.5) 0%,var(--bg-primary) 100%); z-index:10; }
	.start-card { position:relative; text-align:center; padding:2.25rem 2.25rem 1.75rem; background:var(--bg-glass-strong); border:1px solid var(--border-neon); border-radius:var(--radius-xl); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); max-width:380px; width:90%; animation:si .35s ease; box-shadow:0 0 60px rgba(0,255,255,.06); }
	.sc-accent { position:absolute; top:-1px; left:20%; right:20%; height:1px; background:linear-gradient(90deg,transparent,var(--cyan),transparent); opacity:.6; }
	.sc-icon { font-size:var(--fs-icon-2xl); display:block; margin-bottom:.5rem; filter:drop-shadow(0 0 20px rgba(0,255,255,.3)); }
	.sc-logo { width:100%; max-width:280px; height:auto; }
	.sc-title { font-size:var(--fs-icon-lg); margin-bottom:.2rem; }
	.sc-sub { font-size:var(--fs-body); color:var(--text-secondary); margin-bottom:1.1rem; }
	.sc-rec { display:flex; flex-direction:column; gap:.2rem; margin-bottom:1.1rem; padding:.6rem; background:rgba(0,0,0,.2); border-radius:var(--radius-md); }
	.front-sel { margin-bottom:1.1rem; width:100%; max-width:340px; }
	.front-sel-h { display:flex; align-items:center; gap:.3rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.06em; text-transform:uppercase; color:var(--text-dim); margin-bottom:.45rem; }
	.front-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(58px,1fr)); gap:.35rem; }
	.front-opt { display:flex; flex-direction:column; align-items:center; gap:.1rem; padding:.45rem .3rem; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border-neon); transition:all var(--transition-fast); cursor:pointer; }
	.front-opt:hover:not(:disabled) { border-color:var(--cyan); background:rgba(0,255,255,.06); }
	.front-opt.on { border-color:var(--cyan); background:rgba(0,255,255,.12); box-shadow:0 0 12px rgba(0,255,255,.18); }
	.front-opt.locked { opacity:.4; cursor:not-allowed; }
	.front-n { font-family:var(--font-display); font-weight:700; font-size:var(--fs-body-sm); color:var(--text-primary); }
	.front-sub { font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); white-space:nowrap; }
	.front-opt.on .front-n { color:var(--cyan); }
	.sc-r { font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-secondary); display:flex; gap:.3rem; align-items:center; }
	.sc-btn { position:relative; display:inline-flex; align-items:center; gap:.4rem; padding:.7rem 2rem; border-radius:var(--radius-md); background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:var(--fs-btn); cursor:pointer; overflow:hidden; transition:all var(--transition-normal); box-shadow:0 0 30px rgba(0,255,255,.2); }
	.sc-btn:hover { transform:translateY(-2px); box-shadow:0 0 50px rgba(0,255,255,.35); }
	.sc-bi { position:absolute; inset:0; background:linear-gradient(135deg,transparent,rgba(255,255,255,.12),transparent); transition:opacity var(--transition-normal); opacity:0; }
	.sc-btn:hover .sc-bi { opacity:1; }
	.sc-bt { position:relative; z-index:1; }
	.sc-hint { margin-top:.5rem; font-size:var(--fs-caption-sm); color:var(--text-secondary); }
	.sc-hint kbd { padding:.08rem .3rem; background:var(--bg-tertiary); border-radius:3px; font-family:var(--font-mono); font-size:var(--fs-caption-sm); border:1px solid var(--border-neon); }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
</style>
