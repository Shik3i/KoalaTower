<script lang="ts">
	// Self-hosted fonts (bundled, no external/CDN request — keeps the privacy promise).
	import '@fontsource/orbitron/latin-500.css';
	import '@fontsource/orbitron/latin-700.css';
	import '@fontsource/orbitron/latin-900.css';
	import '@fontsource/rajdhani/latin-400.css';
	import '@fontsource/rajdhani/latin-500.css';
	import '@fontsource/rajdhani/latin-600.css';
	import '@fontsource/rajdhani/latin-700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { loadSave, persistSave, getCachedSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { LAB_DEFS } from '$lib/game/balance/labs';
	import { APP_VERSION, SUPPORT_URL } from '$lib/version';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';

	let { children } = $props();

	let loaded = $state(false);
	let labInterval: ReturnType<typeof setInterval> | null = null;
	let visibilityHandler: (() => void) | null = null;
	const toasts = createToastStore(3000);
	const toast = toasts.push;

	onMount(async () => {
		try {
			const save = await loadSave();
			coinsStore.set(save.totalCoins);
			settingsStore.set(save.settings);
			highestWaveStore.set(save.highestWave);
			totalRunsStore.set(save.totalRuns);
		} catch (e) {
			console.warn('Failed to load save:', e);
			toast('⚠ Could not load saved data. Starting fresh.', 'warning');
		}
		loaded = true;
		loadedStore.set(true);

		document.addEventListener('visibilitychange', visibilityHandler = async () => {
			if (document.visibilityState === 'hidden') {
				const save = getCachedSave();
				if (save) await persistSave(save);
			}
		});

		// Global lab research polling — checks active research completion via timestamps
		labInterval = setInterval(() => {
			const save = getCachedSave(); if (!save) return;
			const now = Date.now();
			let changed = false;
			let completedLabName = '';

			if (save.activeLab && save.activeLab.finishesAt <= now) {
				const labId = save.activeLab.labId;
				const currentLevel = (save.labLevels as Record<string, number>)[labId] ?? 0;
				(save.labLevels as Record<string, number>)[labId] = Math.max(currentLevel, save.activeLab.targetLevel);
				const rs = save.labResearch[labId];
				if (rs) { rs.complete = true; }
				const labDef = LAB_DEFS.find(l => l.id === labId);
				completedLabName = (labDef?.name ?? labId) + ' Lv.' + save.activeLab.targetLevel;
				save.activeLab = null;
				changed = true;
			}

			// Legacy: also check old-style labResearch
			for (const item of LAB_DEFS) {
				const rs = save.labResearch[item.id];
				if (!rs || rs.researchStart === 0 || rs.complete) continue;
				if (now - rs.researchStart >= rs.duration) {
					rs.complete = true;
					(save.labLevels as Record<string, number>)[item.id] = (rs.level ?? 0) + 1;
					completedLabName = completedLabName || (item.name + ' Lv.' + ((rs.level ?? 0) + 1));
					changed = true;
				}
			}

			if (changed) {
				coinsStore.set(save.totalCoins);
				highestWaveStore.set(save.highestWave);
				totalRunsStore.set(save.totalRuns);
				persistSave(save);
				toast('🔬 Research complete: ' + completedLabName, 'milestone');
				// Browser notification if enabled
				if (save.settings.browserNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
					new Notification('Flatland TD — Research Complete', { body: completedLabName, icon: '/favicon.png' });
				}
			}
		}, 2000);
	});

	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (labInterval !== null) clearInterval(labInterval);
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
	});
</script>

<Toasts controller={toasts} vertical="bottom" offsetRem={3} zIndex={500} />

{@render children()}

<footer class="layout-footer">
	<p class="lf-tagline">All data stored locally in your browser. No tracking, no cookies. The Shapes remain hostile, flat, and statistically inconvenient.</p>
	<nav class="lf-nav" aria-label="Site navigation">
		<a href="/" class="lf-link">Home</a>
		<span class="lf-sep" aria-hidden="true">·</span>
		<a href="/play" class="lf-link">Deploy</a>
		<span class="lf-sep" aria-hidden="true">·</span>
		<a href="/hub" class="lf-link">Orbital Command</a>
		<span class="lf-sep" aria-hidden="true">·</span>
		<a href="/help" class="lf-link">Help</a>
		<span class="lf-sep" aria-hidden="true">·</span>
		<a href="/privacy" class="lf-link">Privacy</a>
		<span class="lf-sep" aria-hidden="true">·</span>
		<a href="/imprint" class="lf-link">Imprint</a>
	</nav>
	<div class="lf-bottom">
		<span class="lf-version">{APP_VERSION}</span>
		<a href={SUPPORT_URL} target="_blank" rel="noopener" class="lf-coffee" aria-label="Buy me a coffee">
			☕ Support
		</a>
	</div>
</footer>

<style>
	.layout-footer { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.5rem; padding:.8rem 1rem 1rem; border-top:1px solid var(--border-neon); background:var(--bg-primary); position:relative; z-index:1; }
	.lf-tagline { color:var(--text-dim); font-size:var(--fs-caption-sm); text-align:center; margin:0; max-width:40rem; line-height:1.5; }
	.lf-nav { display:flex; gap:.35rem; align-items:center; flex-wrap:wrap; justify-content:center; }
	.lf-link { color:var(--text-dim); font-size:var(--fs-caption-sm); text-decoration:none; transition:color var(--transition-fast); }
	.lf-link:hover { color:var(--cyan); }
	.lf-sep { color:var(--text-dim); opacity:.3; font-size:var(--fs-caption-sm); }
	.lf-bottom { display:flex; align-items:center; gap:.75rem; }
	.lf-version { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:.4; }
	.lf-coffee { font-size:var(--fs-caption-sm); color:var(--yellow); text-decoration:none; border:1px solid rgba(255,221,68,0.3); border-radius:100px; padding:.2rem .75rem; transition:all var(--transition-fast); }
	.lf-coffee:hover { border-color:var(--yellow); box-shadow:0 0 12px rgba(255,221,68,0.2); }
	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: var(--font-sans);
	}
</style>
