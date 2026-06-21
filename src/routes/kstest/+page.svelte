<script lang="ts">
	// Design harness for the in-game Killstreak HUD counter. Not linked from the
	// app — open /kstest directly to iterate on the counter's look (tiers, roll,
	// flames, spark flick, word pop) in isolation, at an adjustable zoom.
	import KillstreakCounter from '$lib/components/play/KillstreakCounter.svelte';
	import { getKillstreakTier } from '$lib/game/systems/enemySystem';

	let count = $state(1000);
	const tier = $derived(getKillstreakTier(count));
	let auto = $state(false);
	let zoom = $state(2.4);
	let reduced = $state(false);

	$effect(() => {
		if (!auto) return;
		const id = setInterval(() => { count += 1; }, 450);
		return () => clearInterval(id);
	});

	const presets = [5, 10, 25, 50, 100, 500, 1000, 5000, 10000];
</script>

<div class="stage">
	<!-- The counter anchors itself top-right; scale a wrapper so we can inspect
	     it large without changing the component. -->
	<div class="zoomwrap" style="transform: scale({zoom});">
		<KillstreakCounter {count} {tier} {reduced} />
	</div>

	<div class="panel">
		<div class="title">Killstreak design harness — count {count.toLocaleString('en-US')} · tier {tier}</div>
		<div class="row">
			{#each presets as p}
				<button class:active={count === p} onclick={() => (count = p)}>{p.toLocaleString('en-US')}</button>
			{/each}
		</div>
		<div class="row">
			<button onclick={() => (count += 1)}>+1</button>
			<button onclick={() => (count += 9)}>+9</button>
			<button onclick={() => (count += 100)}>+100</button>
			<button onclick={() => (count = Math.max(0, count - 1))}>−1</button>
			<button onclick={() => (count = 5)}>reset</button>
			<button class:active={auto} onclick={() => (auto = !auto)}>{auto ? '⏸ stop' : '▶ auto +1'}</button>
			<button class:active={reduced} onclick={() => (reduced = !reduced)}>reduced motion</button>
		</div>
		<label class="row zoomrow">
			zoom {zoom.toFixed(1)}×
			<input type="range" min="1" max="4" step="0.1" bind:value={zoom} />
		</label>
	</div>
</div>

<style>
	.stage {
		position: relative;
		width: 100%;
		min-height: 100vh;
		overflow: hidden;
		background:
			radial-gradient(circle at 72% 28%, #181530 0%, transparent 55%),
			#0a0a12;
	}
	/* Scale anchored at the viewport's top-right (where the counter lives) so it
	   grows down-and-left into view instead of off the edge. */
	.zoomwrap { position: absolute; inset: 0; transform-origin: 100% 0; }
	.panel {
		position: absolute;
		bottom: 2rem;
		left: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		font-family: monospace;
		color: #cfd3e6;
		z-index: 50;
	}
	.title { font-size: 0.8rem; opacity: 0.8; }
	.row { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
	.zoomrow { font-size: 0.8rem; }
	button {
		padding: 0.35rem 0.6rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 6px;
		color: #e6e8f2;
		font-family: monospace;
		cursor: pointer;
	}
	button:hover { background: rgba(255, 255, 255, 0.12); }
	button.active { background: #2dd4bf; color: #08121a; border-color: #2dd4bf; }
</style>
