<script lang="ts">
	import Icon from './Icon.svelte';
	import { formatCompact } from '$lib/game/balance/balanceMath';

	let { hp, maxHp, wave, segments = 1 }:
		{ hp: number; maxHp: number; wave: number; segments?: number } = $props();

	// Layered health: each segment is one "bar". The current segment fills/empties
	// and cycles colour as it depletes. With segments=1 this is a plain bar — but
	// the structure supports very-high-HP bosses later (peel a colour per layer).
	const LAYER_COLORS = ['#FF44AA', '#FF6644', '#FFAA22', '#FFDD44', '#44FFAA', '#44AAFF'];

	let layerHp = $derived(maxHp / Math.max(1, segments));
	let currentLayer = $derived(Math.max(1, Math.ceil(hp / layerHp)));
	let withinLayer = $derived(Math.max(0, Math.min(1, (hp - (currentLayer - 1) * layerHp) / layerHp)));
	let color = $derived(LAYER_COLORS[(currentLayer - 1) % LAYER_COLORS.length]);
	let pct = $derived(Math.max(0, Math.min(100, (hp / maxHp) * 100)));
</script>

<div class="boss-bar" style="--bc:{color}">
	<div class="boss-head">
		<span class="boss-name"><Icon name="boss" size={15} /> BOSS</span>
		<span class="boss-wave">WAVE {wave}</span>
		<span class="boss-hp">{formatCompact(Math.max(0, Math.ceil(hp)))} / {formatCompact(maxHp)}</span>
	</div>
	<div class="boss-track">
		<!-- Ghost of total HP across all layers -->
		<div class="boss-total" style="width:{pct}%"></div>
		<!-- Current layer fill (sits on top) -->
		<div class="boss-fill" style="width:{withinLayer * 100}%"></div>
	</div>
	{#if segments > 1}
		<div class="boss-pips">
			{#each Array(segments) as _, i}
				<span class="pip" class:spent={i + 1 > currentLayer} class:active={i + 1 === currentLayer}></span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.boss-bar {
		position: absolute; top: .75rem; left: 50%; transform: translateX(-50%);
		width: min(560px, 90%); z-index: 30; pointer-events: none;
		padding: .5rem .7rem; border-radius: 10px;
		background: rgba(8, 6, 14, .72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
		border: 1px solid color-mix(in srgb, var(--bc) 55%, transparent);
		box-shadow: 0 0 24px color-mix(in srgb, var(--bc) 28%, transparent), inset 0 0 18px rgba(0,0,0,.4);
		animation: bb-in .35s cubic-bezier(.2,.9,.3,1);
	}
	.boss-head {
		display: flex; align-items: center; gap: .6rem; margin-bottom: .4rem;
		font-family: var(--font-mono); font-size: .72rem; letter-spacing: .06em;
	}
	.boss-name { display: inline-flex; align-items: center; gap: .3rem; color: var(--bc); font-weight: 700; }
	.boss-wave { color: var(--text-dim); }
	.boss-hp { margin-left: auto; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
	.boss-track {
		position: relative; height: 12px; border-radius: 6px; overflow: hidden;
		background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
	}
	.boss-total {
		position: absolute; inset: 0 auto 0 0; height: 100%;
		background: color-mix(in srgb, var(--bc) 22%, transparent);
		transition: width .25s ease;
	}
	.boss-fill {
		position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 6px;
		background: linear-gradient(90deg, color-mix(in srgb, var(--bc) 60%, #000), var(--bc));
		box-shadow: 0 0 12px var(--bc); transition: width .15s ease;
	}
	.boss-pips { display: flex; gap: 3px; margin-top: .35rem; }
	.pip { flex: 1; height: 3px; border-radius: 2px; background: color-mix(in srgb, var(--bc) 70%, transparent); }
	.pip.spent { background: rgba(255,255,255,.1); }
	.pip.active { box-shadow: 0 0 6px var(--bc); }
	@keyframes bb-in { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
</style>
