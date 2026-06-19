<script lang="ts">
	import Icon from './Icon.svelte';
	import { formatCompact } from '$lib/game/balance/balanceMath';

	let { hp, maxHp, wave }:
		{ hp: number; maxHp: number; wave: number } = $props();

	const color = '#FF44AA';
	let pct = $derived(Math.max(0, Math.min(100, (hp / maxHp) * 100)));
</script>

<div class="boss-bar" style="--bc:{color}">
	<div class="boss-head">
		<span class="boss-name"><Icon name="boss" size={15} /> BOSS</span>
		<span class="boss-wave">WAVE {wave}</span>
		<span class="boss-hp">{formatCompact(Math.max(0, Math.ceil(hp)))} / {formatCompact(maxHp)}</span>
	</div>
	<div class="boss-track"
		role="progressbar"
		aria-valuenow={Math.round(pct)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Boss health: {Math.round(pct)}%"
	>
		<div class="boss-fill" style="width:{pct}%" aria-hidden="true"></div>
	</div>
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
		font-family: var(--font-mono); font-size: var(--fs-caption); letter-spacing: .06em;
	}
	.boss-name { display: inline-flex; align-items: center; gap: .3rem; color: var(--bc); font-weight: 700; }
	.boss-wave { color: var(--text-dim); }
	.boss-hp { margin-left: auto; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
	.boss-track {
		position: relative; height: 12px; border-radius: 6px; overflow: hidden;
		background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
	}
	.boss-fill {
		position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 6px;
		background: linear-gradient(90deg, color-mix(in srgb, var(--bc) 60%, #000), var(--bc));
		box-shadow: 0 0 12px var(--bc); transition: width .15s ease;
	}
	@keyframes bb-in { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
</style>
