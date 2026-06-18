<script lang="ts">
	/**
	 * WhatsNewModal.svelte — returning-player "what changed" panel.
	 *
	 * Shows once per app version (tracked in localStorage, not the game save, so
	 * it works fully offline). Dismissible, keyboard-accessible, respects reduced
	 * motion, and never appears on the active combat page (/play) to avoid
	 * interrupting a run — it simply waits for the next non-combat visit.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { APP_VERSION } from '$lib/version';
	import { shouldShowWhatsNew, readSeenVersion, writeSeenVersion } from '$lib/stores/whatsNew';

	let open = $state(false);
	let dialogEl = $state<HTMLDivElement | null>(null);

	// Concise highlights — not a full changelog.
	const highlights: string[] = [
		'16 Fronts across four bands, each with star variants',
		'Schematics & Front-specific progression in the Forge',
		'Black Market and Strange Matter — an unauthorized channel',
		'Offline & installable (PWA) — play with no connection',
		'Polished Deploy Front selector',
		'Combat feedback pass — death effects, floating text, killstreaks',
	];

	function dismiss(): void {
		open = false;
		writeSeenVersion(APP_VERSION);
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape' && open) dismiss();
	}

	onMount(() => {
		// Don't interrupt an active combat session; it'll show next non-/play visit.
		if (page.url.pathname.startsWith('/play')) return;
		if (shouldShowWhatsNew(APP_VERSION, readSeenVersion())) {
			open = true;
			queueMicrotask(() => dialogEl?.focus());
		}
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div class="wn-ol" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
		<div
			class="wn-card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="wn-title"
			tabindex="-1"
			bind:this={dialogEl}
		>
			<button class="wn-x" onclick={dismiss} aria-label="Close"><Icon name="close" size={16} /></button>
			<div class="wn-kicker">What's New · {APP_VERSION}</div>
			<h2 id="wn-title" class="wn-title">Orbital Command, upgraded</h2>
			<p class="wn-sub">Here's what has landed since your last deployment.</p>
			<ul class="wn-list">
				{#each highlights as h}
					<li><span class="wn-dot" aria-hidden="true">▸</span>{h}</li>
				{/each}
			</ul>
			<div class="wn-actions">
				<button class="wn-btn primary" onclick={dismiss}>Got it</button>
				<a class="wn-btn" href="/help" onclick={dismiss}>View Help</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.wn-ol { position:fixed; inset:0; z-index:800; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(7,8,18,.72); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:wnFade .2s ease; }
	.wn-card { position:relative; width:100%; max-width:30rem; max-height:90vh; overflow-y:auto; padding:1.5rem 1.5rem 1.25rem; background:var(--bg-glass-strong); border:1px solid var(--border-neon-strong); border-radius:var(--radius-lg); box-shadow:0 0 50px rgba(0,255,255,.1); animation:wnIn .25s cubic-bezier(.22,1,.36,1); }
	@media (prefers-reduced-motion: reduce) { .wn-ol, .wn-card { animation:none; } }
	@keyframes wnFade { from{opacity:0} to{opacity:1} }
	@keyframes wnIn { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
	.wn-x { position:absolute; top:.6rem; right:.6rem; display:inline-flex; min-width:36px; min-height:36px; align-items:center; justify-content:center; color:var(--text-dim); background:transparent; border:none; border-radius:var(--radius-sm); cursor:pointer; transition:color var(--transition-fast); }
	.wn-x:hover { color:var(--cyan); }
	.wn-x:focus-visible, .wn-btn:focus-visible, .wn-card:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
	.wn-kicker { font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.08em; text-transform:uppercase; color:var(--cyan); margin-bottom:.3rem; }
	.wn-title { font-family:var(--font-display); font-size:var(--fs-subheading); color:var(--text-primary); margin:0 0 .25rem; }
	.wn-sub { font-size:var(--fs-body-sm); color:var(--text-secondary); margin:0 0 .9rem; }
	.wn-list { list-style:none; padding:0; margin:0 0 1.1rem; display:flex; flex-direction:column; gap:.45rem; }
	.wn-list li { display:flex; gap:.5rem; font-size:var(--fs-body-sm); color:var(--text-primary); line-height:1.4; }
	.wn-dot { color:var(--cyan); flex-shrink:0; }
	.wn-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
	.wn-btn { display:inline-flex; align-items:center; justify-content:center; padding:.5rem 1.1rem; font-size:var(--fs-body-sm); font-weight:600; font-family:var(--font-mono); text-decoration:none; color:var(--text-secondary); background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-md); cursor:pointer; transition:all var(--transition-fast); }
	.wn-btn:hover { color:var(--cyan); border-color:var(--border-neon-strong); }
	.wn-btn.primary { background:var(--cyan); color:var(--bg-primary); border-color:var(--cyan); }
	.wn-btn.primary:hover { color:var(--bg-primary); filter:brightness(1.08); box-shadow:0 0 14px rgba(0,255,255,.35); }
</style>
