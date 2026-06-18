<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		wave,
		best,
		coins,
		kills,
		bosses,
		cash,
		schematics = 0,
		frontName = '',
		autoDeploymentArmed = false,
		autoDeploymentCountdown = 0,
		onCancelAutoDeployment,
		onRedeploy,
		onExport,
	}: {
		wave: number;
		best: number;
		coins: number;
		kills: number;
		bosses: number;
		cash: number;
		schematics?: number;
		frontName?: string;
		autoDeploymentArmed?: boolean;
		autoDeploymentCountdown?: number;
		onCancelAutoDeployment?: () => void;
		onRedeploy: () => void;
		onExport: () => void;
	} = $props();

	// First run (best === 0) still counts as a new record if any wave was reached.
	const isRecord = $derived(wave > 0 && wave >= best);
	let primaryBtn = $state<HTMLButtonElement>();

	// Move focus to the primary action when the panel appears (it mounts only
	// while the game-over overlay is shown).
	onMount(() => requestAnimationFrame(() => primaryBtn?.focus()));
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Run complete">
	<div class="go-panel" class:go-record={isRecord}>
		<div class="go-glow"></div>
		<div class="go-glow-ring"></div>
		<div class="go-icon"><Icon name={isRecord ? 'crit' : 'kill'} size={44} stroke={1.6} /></div>
		<h2 class="go-title">{isRecord ? 'New Record!' : 'Tower Lost'}</h2>
		<div class="go-wave">Reached <strong>Wave {wave}</strong></div>
		{#if best > 0 && wave < best}
			<div class="go-wave-sub">Best: Wave {best} ({(wave / best * 100).toFixed(0)}%)</div>
		{/if}
		<div class="go-stats">
			<div class="go-s"><span class="go-si"><Icon name="alloy" size={20} /></span><span class="go-sv">+{coins.toLocaleString()}</span><span class="go-sl">Alloy</span></div>
			<div class="go-sd"></div>
			<div class="go-s"><span class="go-si"><Icon name="kill" size={20} /></span><span class="go-sv">{kills.toLocaleString()}</span><span class="go-sl">Kills</span></div>
			<div class="go-sd"></div>
			<div class="go-s"><span class="go-si"><Icon name="boss" size={20} /></span><span class="go-sv">{bosses}</span><span class="go-sl">Bosses</span></div>
		</div>
		{#if schematics > 0}
			<div class="go-schem">📐 +{schematics.toLocaleString()} {frontName} Schematics recovered</div>
		{/if}
		{#if autoDeploymentArmed}
			<div class="go-auto">
				<span>Auto Deployment armed: {autoDeploymentCountdown}s</span>
				<button onclick={onCancelAutoDeployment}>Cancel Auto Deployment</button>
			</div>
		{/if}
		<div class="go-stats-sub">
			<span><Icon name="energy" size={13} /> {Math.floor(cash).toLocaleString()} Energy harvested</span>
			<span><Icon name="crit" size={13} /> Best: Wave {best}</span>
		</div>
		<button class="go-btn" bind:this={primaryBtn} onclick={onRedeploy}><Icon name="play" size={16} /> Launch Deployment</button>
		<button class="go-btn2" style="margin-top:.5rem;width:100%" onclick={onRedeploy}><Icon name="play" size={15} /> Quick Redeploy (Same Front)</button>
		<div class="go-row2">
			<a href="/hub" class="go-btn2"><Icon name="hub" size={15} /> Orbital Command</a>
			<button class="go-btn2" onclick={onExport}><Icon name="export" size={15} /> Export</button>
		</div>
	</div>
</div>

<style>
	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.go-panel { position:relative; text-align:center; padding:2rem 1.75rem 1.5rem; background:var(--bg-secondary); border:1px solid rgba(255,68,170,.2); border-radius:var(--radius-xl); max-width:400px; width:90%; overflow:hidden; animation:goAppear .4s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 0 80px rgba(255,68,170,.08),0 0 160px rgba(0,0,0,.4); }
	.go-panel.go-record { border-color:rgba(255,221,68,.3); box-shadow:0 0 80px rgba(255,221,68,.1),0 0 160px rgba(0,0,0,.4); }
	@keyframes goAppear { from{opacity:0;transform:scale(.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	.go-glow { position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle at center,rgba(255,68,170,.05) 0%,transparent 60%); pointer-events:none; }
	.go-glow-ring { position:absolute; top:50%; left:50%; width:200px; height:200px; transform:translate(-50%,-50%); border-radius:50%; border:1px solid rgba(255,68,170,.06); pointer-events:none; animation:goRingPulse 3s ease-in-out infinite; }
	@keyframes goRingPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.3} 50%{transform:translate(-50%,-50%) scale(1.8);opacity:0} }
	.go-panel.go-record .go-glow-ring { border-color:rgba(255,221,68,.1); }
	.go-icon { font-size:var(--fs-icon-2xl); margin-bottom:.3rem; display:block; filter:drop-shadow(0 0 20px rgba(255,68,170,.3)); }
	.go-panel.go-record .go-icon { filter:drop-shadow(0 0 20px rgba(255,221,68,.4)); }
	.go-title { font-size:var(--fs-hero); color:var(--pink); margin-bottom:.15rem; }
	.go-wave { font-size:var(--fs-heading); color:var(--text-secondary); margin-bottom:.1rem; font-family:var(--font-mono); }
	.go-wave strong { color:var(--text-primary); }
	.go-wave-sub { font-size:var(--fs-body); color:var(--text-secondary); margin-bottom:1rem; font-family:var(--font-mono); }
	.go-stats { display:flex; align-items:center; justify-content:center; gap:.8rem; margin-bottom:.5rem; padding:.6rem .75rem; background:rgba(0,0,0,.12); border-radius:var(--radius-md); }
	.go-schem { font-size:var(--fs-body-sm); color:var(--cyan); margin-bottom:.5rem; font-family:var(--font-mono); }
	.go-auto { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.45rem .55rem; margin-bottom:.65rem; background:rgba(136,68,255,.08); border:1px solid rgba(136,68,255,.25); border-radius:var(--radius-sm); color:var(--violet); font-family:var(--font-mono); font-size:var(--fs-caption); }
	.go-auto button { padding:.3rem .45rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--text-secondary); }
	.go-stats-sub { display:flex; justify-content:center; gap:1rem; font-size:var(--fs-caption); color:var(--text-secondary); margin-bottom:1rem; font-family:var(--font-mono); }
	.go-s { text-align:center; min-width:55px; }
	.go-si { font-size:var(--fs-icon-md); display:block; margin-bottom:.1rem; }
	.go-sv { font-size:var(--fs-icon-md); font-weight:700; font-family:var(--font-mono); color:var(--text-primary); }
	.go-sl { font-size:var(--fs-caption-sm); color:var(--text-secondary); margin-top:.05rem; text-transform:uppercase; letter-spacing:.05em; }
	.go-sd { width:1px; height:28px; background:var(--border-neon); }
	.go-btn { display:block; width:100%; padding:.75rem; background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:var(--fs-btn); border-radius:var(--radius-md); cursor:pointer; transition:all var(--transition-normal); box-shadow:0 0 20px rgba(0,255,255,.1); }
	.go-btn:hover { box-shadow:0 0 30px rgba(0,255,255,.2); transform:translateY(-1px); }
	.go-row2 { display:flex; gap:.4rem; margin-top:.45rem; }
	.go-btn2 { flex:1; padding:.5rem; font-size:var(--fs-btn-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; text-decoration:none; display:block; text-align:center; transition:all var(--transition-fast); }
	.go-btn2:hover { border-color:var(--text-secondary); color:var(--text-primary); }
	@media(max-width:899px){ .go-panel{max-width:340px;padding:1.5rem 1.25rem 1.25rem} }
</style>
