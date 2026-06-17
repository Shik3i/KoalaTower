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
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { LAB_DEFS } from '$lib/game/balance/labs';

	let { children } = $props();

	let loaded = $state(false);
	let labInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		try {
			const save = await loadSave();
			coinsStore.set(save.totalCoins);
			settingsStore.set(save.settings);
			highestWaveStore.set(save.highestWave);
			totalRunsStore.set(save.totalRuns);
		} catch (e) {
			console.warn('Failed to load save:', e);
		}
		loaded = true;

		document.addEventListener('visibilitychange', async () => {
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

			// Check active lab research for completion
			if (save.activeLab && save.activeLab.finishesAt <= now) {
				const labId = save.activeLab.labId;
				const currentLevel = (save.labLevels as Record<string, number>)[labId] ?? 0;
				(save.labLevels as Record<string, number>)[labId] = Math.max(currentLevel, save.activeLab.targetLevel);
				// Mark the old-style labResearch as complete too for compat
				const rs = save.labResearch[labId];
				if (rs) {
					rs.complete = true;
				}
				save.activeLab = null;
				changed = true;
			}

			// Legacy: also check old-style labResearch for any remaining research state
			for (const item of LAB_DEFS) {
				const rs = save.labResearch[item.id];
				if (!rs || rs.researchStart === 0 || rs.complete) continue;
				if (now - rs.researchStart >= rs.duration) {
					rs.complete = true;
					(save.labLevels as Record<string, number>)[item.id] = (rs.level ?? 0) + 1;
					changed = true;
				}
			}

			if (changed) {
				coinsStore.set(save.totalCoins);
				highestWaveStore.set(save.highestWave);
				totalRunsStore.set(save.totalRuns);
				persistSave(save);
			}
		}, 2000);
	});

	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (labInterval !== null) clearInterval(labInterval);
	});
</script>

{#if loaded}
	{@render children()}
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: var(--font-sans);
	}
</style>
