<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { loadSave, persistSave, getCachedSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { LAB_ITEMS } from '$lib/game/balance/labs';

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

		// Global lab research polling
		labInterval = setInterval(() => {
			const save = getCachedSave(); if (!save) return;
			let changed = false;
			for (const item of LAB_ITEMS) {
				const rs = save.labResearch[item.id];
				if (!rs || rs.researchStart === 0 || rs.complete) continue;
				if (Date.now() - rs.researchStart >= rs.duration) {
					rs.complete = true;
					(save.labLevels as Record<string, number>)[item.id] = (rs.level ?? 0) + 1;
					changed = true;
				}
			}
			if (changed) { coinsStore.set(save.totalCoins); persistSave(save); }
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
