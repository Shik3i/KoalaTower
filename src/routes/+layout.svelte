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
	import { loadSave, persistSave, getCachedSave, didLastLoadCreateDefaultSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { LAB_DEFS } from '$lib/game/balance/labs';
	import { APP_VERSION, SUPPORT_URL, GITHUB_URL, SITE_URL, REDDIT_URL } from '$lib/version';
	import { isSupportUrlConfigured } from '$lib/game/balance/blackMarket';
	import { applyCounterDeltas, rolloverCommandOrders, commandOrdersWeekKey } from '$lib/game/balance/dailyTasks';
	import { writeSeenVersion } from '$lib/stores/whatsNew';
	import { page } from '$app/state';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';
	import { notifications } from '$lib/stores/notificationStore';
	import WhatsNewModal from '$lib/components/WhatsNewModal.svelte';
	import { registerFlatlandServiceWorker } from '$lib/pwa/serviceWorker';

	let { children } = $props();

	let loaded = $state(false);
	let suppressWhatsNewFirstRun = $state(false);
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
			suppressWhatsNewFirstRun = didLastLoadCreateDefaultSave();
			if (suppressWhatsNewFirstRun) writeSeenVersion(APP_VERSION);
		} catch (e) {
			console.warn('Failed to load save:', e);
			toast('⚠ Could not load saved data. Starting fresh.', 'warning');
		}
		loaded = true;
		loadedStore.set(true);
		registerFlatlandServiceWorker().catch((e) => console.warn('Service worker registration failed:', e));

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
			let researchCompletions = 0;

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
				researchCompletions++;
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
					researchCompletions++;
				}
			}

			if (researchCompletions > 0) {
				// Count finished Research toward the weekly Command Orders.
				save.commandOrders = rolloverCommandOrders(save.commandOrders, commandOrdersWeekKey());
				save.commandOrders.counters = applyCounterDeltas(save.commandOrders.counters, { researchClaims: researchCompletions });
			}

			if (changed) {
				coinsStore.set(save.totalCoins);
				highestWaveStore.set(save.highestWave);
				totalRunsStore.set(save.totalRuns);
				persistSave(save);
				toast('🔬 Research complete: ' + completedLabName, 'milestone');
				notifications.notify({ kind: 'research', title: 'Research complete', detail: completedLabName });
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

<svelte:head>
	<link rel="canonical" href="{SITE_URL}{page.url.pathname}" />
</svelte:head>

<Toasts controller={toasts} vertical="bottom" offsetRem={3} zIndex={500} />

{#if loaded}
	<WhatsNewModal suppressFirstRun={suppressWhatsNewFirstRun} />
{/if}

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
		{#if isSupportUrlConfigured(SUPPORT_URL)}
			<a href={SUPPORT_URL} target="_blank" rel="noopener" class="lf-coffee" aria-label="Support Flatland TD">
				☕ Support
			</a>
		{/if}
		<a href={GITHUB_URL} target="_blank" rel="noopener" class="lf-version-link" aria-label="View source on GitHub (version {APP_VERSION})">
			<span class="lf-version">{APP_VERSION}</span>
			<svg class="lf-gh" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
				<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
			</svg>
		</a>
		<a href={REDDIT_URL} target="_blank" rel="noopener" class="lf-reddit-link" aria-label="Flatland TD on Reddit">
			<svg class="lf-reddit-icon" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
				<path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm5.04 11.3c-.06.72-.58 1.3-1.24 1.36-.38.04-.76-.1-1.04-.38-.82.58-1.94.94-3.2 1l-.72 2.3c-.04.12-.2.16-.3.08l-1.34-1.08c-.08-.06-.1-.18-.04-.26l.28-.48-2.06-.28c-.12-.02-.2-.14-.18-.26l.18-1.22c.02-.12.12-.2.24-.2h.04c-.28-.68-.26-1.42.1-2.06.28-.5.76-.86 1.34-.96.28-.04.56-.02.82.06.18-.38.48-.68.86-.82.6-.2 1.28 0 1.66.52.32-.16.7-.22 1.06-.16.6.1 1.1.54 1.28 1.12.16.52.04 1.06-.26 1.44zm-7.2 1.56c-.28.22-.28.62-.02.84.26.2.64.16.84-.08.18-.24.16-.58-.06-.78-.22-.2-.56-.16-.76.02zm4.3.84c.2.24.58.28.84.08.26-.22.3-.62.02-.84-.2-.18-.54-.22-.76-.02-.22.2-.24.54-.1.78z"/>
			</svg>
			<span>Reddit</span>
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
	.lf-version-link { display:inline-flex; align-items:center; gap:.35rem; color:var(--text-dim); opacity:.5; text-decoration:none; transition:color var(--transition-fast),opacity var(--transition-fast); }
	.lf-version-link:hover { color:var(--cyan); opacity:1; }
	.lf-version { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:inherit; }
	.lf-gh { display:block; }
	.lf-reddit-link { display:inline-flex; align-items:center; gap:.3rem; color:var(--text-dim); opacity:.5; text-decoration:none; font-size:var(--fs-caption-sm); transition:color var(--transition-fast),opacity var(--transition-fast); }
	.lf-reddit-link:hover { color:#FF4500; opacity:1; }
	.lf-reddit-icon { flex-shrink:0; }
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
