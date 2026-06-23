<script lang="ts">
	import type { GameSettings } from '$lib/game/engine/gameTypes';

	let {
		settings,
		isCriticalHP,
		isSevereHP,
		bossIntroWave,
		bossIntroKey,
		runActive,
	}: {
		settings: GameSettings;
		isCriticalHP: boolean;
		isSevereHP: boolean;
		bossIntroWave: number;
		bossIntroKey: number;
		runActive: boolean;
	} = $props();
</script>

<!-- Ambient atmosphere overlay (CSS only — zero render-loop cost). A soft
     radial vignette gives the battlefield depth without touching the WebGL
     pipeline. Disabled in low-effects mode to keep the field flat and cheap. -->
{#if !settings.lowEffectsMode}
	<div class="atmosphere" class:reduced={settings.reducedMotion} aria-hidden="true"></div>
{/if}

<!-- Low-HP vignette overlay (CSS — above canvas, below HUD panels). Pulses
     red when tower HP < 30%, stronger + faster when < 15%. -->
<div
	class="vignette"
	class:critical={isCriticalHP}
	class:severe={isSevereHP}
	class:reduced={settings.reducedMotion || settings.lowEffectsMode}
	aria-hidden="true"
></div>

<!-- Boss wave intro flash. {#key} re-triggers the CSS animation each time
     bossIntroKey increments so back-to-back boss waves re-play cleanly. -->
{#if bossIntroWave > 0}
	<div class="boss-intro-host" aria-hidden="true">
		{#key bossIntroKey}
			<div class="boss-intro" class:reduced={settings.reducedMotion || settings.lowEffectsMode}>
				<div class="boss-intro-label">⚠ BOSS WAVE ⚠</div>
				<div class="boss-intro-wave">// Wave {bossIntroWave}</div>
			</div>
		{/key}
	</div>
{/if}

<!-- Critical HP warning chip — small, lives above vignette so it isn't washed out. -->
{#if isCriticalHP && runActive}
	<div class="hp-warn" class:flicker={isSevereHP && !settings.reducedMotion} aria-live="polite">
		<span class="hp-warn-dot"></span>
		Tower integrity critical
	</div>
{/if}

<style>
	/* Atmosphere: soft edge vignette only. z-index 5 keeps it under the low-HP
	   vignette (6) so damage feedback stays readable. (CRT scanlines were
	   removed — they read as a distracting dotted filter over the field.) */
	.atmosphere, .atmosphere.reduced { position:absolute; inset:0; pointer-events:none; z-index:5;
		background:radial-gradient(ellipse at center, transparent 55%, rgba(3,4,12,0.35) 88%, rgba(2,3,9,0.6) 100%); }

	.vignette { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .35s ease; z-index:6;
		background:radial-gradient(ellipse at center, transparent 35%, rgba(255,40,80,0.18) 80%, rgba(255,40,80,0.35) 100%);
		mix-blend-mode:screen; }
	.vignette.critical { opacity:1; animation:vignettePulse 1.4s ease-in-out infinite; }
	.vignette.severe   { opacity:1; animation:vignettePulse .7s  ease-in-out infinite; background:radial-gradient(ellipse at center, transparent 25%, rgba(255,40,80,0.30) 70%, rgba(255,40,80,0.55) 100%); }
	.vignette.reduced.critical, .vignette.reduced.severe { animation:none; opacity:.7; }
	@keyframes vignettePulse { 0%,100%{opacity:.55} 50%{opacity:1} }

	/* ─── Boss-wave intro flash ─────────────────────────────────────────── */
	/* One-shot centered overlay shown for ~700ms when a boss wave starts.
	   Purely additive — does not block input (pointer-events:none). */
	.boss-intro-host { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:7; }
	.boss-intro { text-align:center; font-family:var(--font-tech); text-transform:uppercase; letter-spacing:.18em;
		color:var(--pink); text-shadow:0 0 16px rgba(255,68,170,.7), 0 0 36px rgba(255,68,170,.4);
		animation:bossIntro .85s cubic-bezier(.22,1,.36,1) forwards; }
	.boss-intro.reduced { animation:bossIntroReduced .5s ease forwards; }
	.boss-intro-label { font-size:clamp(1.2rem, 3vw, 2rem); font-weight:700; }
	.boss-intro-wave { font-size:clamp(.9rem, 2vw, 1.25rem); color:var(--text-secondary); margin-top:.35rem; letter-spacing:.25em; }
	@keyframes bossIntro {
		0%   { opacity:0; transform:scale(.85); }
		15%  { opacity:1; transform:scale(1.05); }
		25%  { transform:scale(1); }
		75%  { opacity:1; }
		100% { opacity:0; transform:scale(1.02); }
	}
	@keyframes bossIntroReduced { from{opacity:0} 30%{opacity:1} to{opacity:0} }

	/* ─── Critical HP warning chip ──────────────────────────────────────── */
	.hp-warn { position:absolute; top:18%; left:50%; transform:translateX(-50%);
		display:inline-flex; align-items:center; gap:.4rem; padding:.3rem .75rem;
		font-family:var(--font-mono); font-size:var(--fs-caption); font-weight:600;
		color:var(--red); background:rgba(7,8,18,.85); border:1px solid rgba(255,68,68,.45);
		border-radius:100px; z-index:8; pointer-events:none;
		box-shadow:0 0 14px rgba(255,68,68,.25);
		animation:hpWarnIn .25s ease; }
	.hp-warn.flicker { animation:hpWarnFlicker .55s ease-in-out infinite; }
	.hp-warn-dot { width:8px; height:8px; border-radius:50%; background:var(--red); box-shadow:0 0 8px var(--red); }
	@keyframes hpWarnIn { from{opacity:0; transform:translate(-50%,-6px)} to{opacity:1; transform:translate(-50%,0)} }
	@keyframes hpWarnFlicker { 0%,100%{opacity:1} 50%{opacity:.55} }
</style>
