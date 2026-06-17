<script lang="ts">
	// Self-hosted fonts (bundled, no external/CDN request — keeps the privacy promise).
	import '@fontsource/orbitron/500.css';
	import '@fontsource/orbitron/700.css';
	import '@fontsource/orbitron/900.css';
	import '@fontsource/rajdhani/400.css';
	import '@fontsource/rajdhani/500.css';
	import '@fontsource/rajdhani/600.css';
	import '@fontsource/rajdhani/700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { loadSave, persistSave, getCachedSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { LAB_DEFS } from '$lib/game/balance/labs';
	import { APP_VERSION } from '$lib/version';

	let { children } = $props();

	let loaded = $state(false);
	let labInterval: ReturnType<typeof setInterval> | null = null;
	let visibilityHandler: (() => void) | null = null;
	let toasts: { id: number; msg: string; type: string }[] = $state([]);
	let nextToast = 0;

	function toast(msg: string, type: string = 'info') {
		const id = ++nextToast;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3000);
	}

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

{#if toasts.length}
	<div class="layout-toasts" aria-live="polite" role="alert">{#each toasts as t}<div class="toast toast-{t.type}">{t.msg}</div>{/each}</div>
{/if}

{@render children()}

<footer class="layout-footer">
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
	</nav>
	<span class="lf-version">{APP_VERSION}</span>
</footer>

<style>
	.layout-toasts { position:fixed; bottom:3rem; left:50%; transform:translateX(-50%); z-index:500; display:flex; flex-direction:column; gap:.3rem; pointer-events:none; }
	.toast { padding:.4rem 1rem; font-size:var(--fs-body-sm); border-radius:100px; white-space:nowrap; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:lti .2s ease; box-shadow:0 0 20px rgba(0,0,0,.3); }
	.toast-info { background:rgba(0,255,255,.1); color:var(--cyan); border:1px solid rgba(0,255,255,.25); }
	.toast-success { background:rgba(68,255,136,.1); color:var(--green); border:1px solid rgba(68,255,136,.25); }
	.toast-warning { background:rgba(255,68,68,.1); color:var(--red); border:1px solid rgba(255,68,68,.25); }
	.toast-error { background:rgba(255,68,68,.12); color:#FF6666; border:1px solid rgba(255,68,68,.3); }
	.toast-milestone { background:rgba(255,221,68,.1); color:var(--yellow); border:1px solid rgba(255,221,68,.25); }
	@keyframes lti { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
	.layout-footer { display:flex; align-items:center; justify-content:center; gap:.75rem; padding:.65rem 1rem; border-top:1px solid var(--border-neon); background:var(--bg-primary); position:relative; z-index:1; flex-wrap:wrap; }
	.lf-nav { display:flex; gap:.35rem; align-items:center; }
	.lf-link { color:var(--text-dim); font-size:var(--fs-caption-sm); text-decoration:none; transition:color var(--transition-fast); }
	.lf-link:hover { color:var(--cyan); }
	.lf-sep { color:var(--text-dim); opacity:.3; font-size:var(--fs-caption-sm); }
	.lf-version { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:.4; }
	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: var(--font-sans);
	}
</style>
