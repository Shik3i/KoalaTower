<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { loadSave, persistSave, getCachedSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';

	let { children } = $props();

	let loaded = $state(false);

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
