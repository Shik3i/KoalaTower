<script lang="ts">
	/**
	 * FrontIcon — one shared Front glyph, recolored per band, with 0–3 star
	 * overlays. No external image assets; pure inline SVG so it themes via the
	 * band color and stays crisp at any size.
	 */
	import type { TierId } from '$lib/game/engine/gameTypes';
	import { getFrontMeta, getFrontBandDef } from '$lib/game/balance/tiers';

	let { front, size = 34, locked = false }: { front: TierId; size?: number; locked?: boolean } = $props();

	const meta = $derived(getFrontMeta(front));
	const band = $derived(getFrontBandDef(front));
	// Star pips sit along the top of the glyph; positions for up to 3.
	const starX = [10, 16, 22];
</script>

<svg
	class="front-icon"
	class:locked
	width={size}
	height={size}
	viewBox="0 0 32 32"
	role="img"
	aria-label={locked ? `${meta.displayName} (locked)` : meta.displayName}
	style="display:block;{locked ? 'opacity:.7' : `filter:drop-shadow(0 0 6px ${band.color}66)`}"
>
	<!-- Shared shield/chevron glyph -->
	<defs>
		<linearGradient id="fg-{meta.front}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={band.color} stop-opacity="0.95" />
			<stop offset="1" stop-color={band.accent} stop-opacity="0.85" />
		</linearGradient>
	</defs>
	<path
		d="M16 3 L27 7 V16 C27 23 22 27 16 29 C10 27 5 23 5 16 V7 Z"
		fill={locked ? 'rgba(120,130,160,0.18)' : `url(#fg-${meta.front})`}
		stroke={locked ? 'rgba(150,160,190,0.5)' : band.color}
		stroke-width="1.3"
	/>
	<!-- Inner core mark -->
	<circle cx="16" cy="17" r="3.4" fill="rgba(0,0,0,0.35)" stroke={locked ? 'rgba(150,160,190,0.5)' : band.accent} stroke-width="1.1" />
	<!-- Star overlays (band escalation) -->
	{#each Array(meta.stars) as _, i}
		<circle cx={starX[i]} cy="9" r="1.7" fill={locked ? 'rgba(150,160,190,0.6)' : '#fff'} stroke={band.accent} stroke-width="0.6" />
	{/each}
</svg>
