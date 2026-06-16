<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
	import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
	import {
		UpgradeId,
		WorkshopUpgradeId,
		type GameSnapshot,
		type GameSettings,
	} from '$lib/game/engine/gameTypes';
	import { BATTLE_UPGRADES } from '$lib/game/balance/battleUpgrades';
	import { WORKSHOP_UPGRADES } from '$lib/game/balance/workshopUpgrades';
	import { LAB_ITEMS } from '$lib/game/balance/labs';
	import { TIERS } from '$lib/game/balance/tiers';
	import { CHALLENGES } from '$lib/game/balance/challenges';
	import { getBattleUpgradeCost, getBattleUpgradeEffect } from '$lib/game/balance/battleUpgrades';
	import { getWorkshopUpgradeCost, getWorkshopUpgradeEffect } from '$lib/game/balance/workshopUpgrades';
	import { getLabItemCost, getLabItemEffect } from '$lib/game/balance/labs';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';

	let container = $state<HTMLDivElement>();
	let gameView = $state<PixiGameView | null>(null);
	let engine = $state<GameEngine | null>(null);

	// UI state
	let isMobile = $state(false);
	let leftPanelOpen = $state(false);
	let rightPanelOpen = $state(true);
	let activeTab = $state<'battle' | 'workshop' | 'lab' | 'tiers' | 'challenges' | 'stats' | 'settings'>('battle');
	let showGameOver = $state(false);
	let gameOverCoins = $state(0);
	let gameOverWave = $state(0);
	let gameOverKills = $state(0);

	// Reactive data
	let snapshot = $state<GameSnapshot | null>(null);
	let coins = $state(0);
	let settings = $state<GameSettings>({
		reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false,
	});
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let upgradeVersion = $state(0); // bumped on every purchase to force re-render
	let speedValue = $state(1);
	let isPaused = $state(false);

	// Save/import/export
	let showSaveMenu = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let showMobilePanel = $state(false);

	// Toast system
	let toasts: { id: number; msg: string; type: string }[] = $state([]);
	let toastId = 0;

	function toast(msg: string, type: string = 'info') {
		const id = ++toastId;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 2500);
	}

	onMount(() => {
		const checkMobile = () => { isMobile = window.innerWidth < 768; };
		checkMobile();
		window.addEventListener('resize', checkMobile);

		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);

		// Keyboard shortcuts
		function onKey(e: KeyboardEvent) {
			if (!engine) return;
			if (e.key === ' ') { e.preventDefault(); handleSpeed(0); }
			if (e.key === '1') handleSpeed(1);
			if (e.key === '2') handleSpeed(2);
			if (e.key === '3') handleSpeed(3);
			if (e.key === '4') handleSpeed(4);
		}
		window.addEventListener('keydown', onKey);

		return () => {
			window.removeEventListener('resize', checkMobile);
			window.removeEventListener('keydown', onKey);
			u1(); u2(); u3(); u4();
		};
	});

	onDestroy(() => { gameView?.destroy(); engine?.cleanup(); });

	function initEngine() {
		if (engine) engine.cleanup();
		if (gameView) { gameView.destroy(); gameView = null; }
		engine = new GameEngine();
		engine.setCallbacks({
			onSnapshot: (s: GameSnapshot) => {
				snapshot = s;
				if (engine) speedValue = engine.speedMultiplier;
			},
			onStateChange: () => {
				upgradeVersion++;
				if (engine) { speedValue = engine.speedMultiplier; isPaused = engine.isPaused(); }
			},
			onGameOver: (_coins: number, _wave: number) => {
				gameOverCoins = _coins;
				gameOverWave = _wave;
				gameOverKills = engine?.state.killCount ?? 0;
				showGameOver = true;
				if (engine) {
					const save = getCachedSave();
					if (save) {
						save.totalCoins = engine.state.coins;
						save.totalRuns = engine.state.totalRuns;
						save.highestWave = engine.state.highestWave;
						coinsStore.set(save.totalCoins);
						highestWaveStore.set(save.highestWave);
						totalRunsStore.set(save.totalRuns);
						persistSave(save);
					}
				}
				toast(`💀 Game Over — Wave ${_wave}`, 'warning');
			},
			onMilestone: (text: string) => { toast(`🏆 ${text}`, 'milestone'); },
		});
		if (!container) return;
		gameView = new PixiGameView(container, engine);
		gameView.start();
	}

	function startRun() {
		if (!engine) initEngine();
		if (!engine) return;
		showGameOver = false;
		showMobilePanel = false;
		speedValue = 1;
		isPaused = false;
		const save = getCachedSave();
		engine.startRun(save?.workshopUpgrades ?? {}, coins);
		gameView?.start();
		toast('▶ Run started!', 'success');
	}

	function handleSpeed(preset: number) {
		if (!engine) return;
		if (preset === 0) {
			engine.togglePause();
			isPaused = engine.isPaused();
			toast(isPaused ? '⏸ Paused' : '▶ Resumed', 'info');
		} else {
			const speeds = GAME_CONFIG.SPEED_PRESETS;
			const spd = speeds[preset - 1] ?? 1;
			engine.setSpeed(spd);
			speedValue = spd;
			isPaused = false;
			toast(`⏩ ${spd}x`, 'info');
		}
		upgradeVersion++;
	}

	function buyBattleUpgrade(id: UpgradeId) {
		if (!engine) return;
		const cost = getBattleUpgradeCost(id, engine.state.battleUpgrades[id] ?? 0);
		if (engine.buyBattleUpgrade(id)) {
			upgradeVersion++;
			toast(`⬆ Upgrade bought!`, 'success');
		} else {
			if ((engine.state.battleUpgrades[id] ?? 0) >= 50) {
				toast(`⚠ Already max level!`, 'warning');
			} else {
				toast(`💰 Not enough Cash!`, 'error');
			}
		}
	}

	function bl(id: UpgradeId): number { return engine?.state.battleUpgrades[id] ?? 0; }

	function buyWorkshopUpgrade(id: WorkshopUpgradeId) {
		const save = getCachedSave();
		if (!save) return;
		const level = save.workshopUpgrades[id] ?? 0;
		const cost = getWorkshopUpgradeCost(id, level);
		if (save.totalCoins >= cost && level < 100) {
			save.totalCoins -= cost;
			save.workshopUpgrades[id] = level + 1;
			coinsStore.set(save.totalCoins);
			persistSave(save);
			upgradeVersion++;
			toast(`🔧 ${WORKSHOP_UPGRADES.find(u => u.id === id)?.name} upgraded!`, 'success');
		} else {
			toast(`🪙 Not enough Coins!`, 'error');
		}
	}

	function wl(id: WorkshopUpgradeId): number { return getCachedSave()?.workshopUpgrades[id] ?? 0; }

	function buyLabUpgrade(id: string) {
		const save = getCachedSave();
		if (!save) return;
		const level = (save.labLevels as Record<string, number>)[id] ?? 0;
		const item = LAB_ITEMS.find(l => l.id === id);
		if (!item) return;
		const cost = item.cost(level);
		if (save.totalCoins >= cost && level < item.maxLevel) {
			save.totalCoins -= cost;
			(save.labLevels as Record<string, number>)[id] = level + 1;
			coinsStore.set(save.totalCoins);
			persistSave(save);
			upgradeVersion++;
			toast(`🔬 Research completed!`, 'success');
		} else {
			toast(`🪙 Not enough Coins!`, 'error');
		}
	}

	function ll(id: string): number {
		const save = getCachedSave();
		if (!save) return 0;
		return (save.labLevels as Record<string, number>)[id] ?? 0;
	}

	function handleResetSave() {
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
			upgradeVersion++;
			toast('🗑 Save reset!', 'warning');
		});
	}

	function updateSetting(key: keyof GameSettings, value: boolean) {
		const save = getCachedSave();
		if (!save) return;
		save.settings[key] = value;
		settingsStore.set({ ...save.settings });
		persistSave(save);
		if (engine) engine.state.settings[key] = value;
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const settingsList = [
		{ key: 'reducedMotion' as keyof GameSettings, label: 'Reduced Motion', desc: 'Minimize animations' },
		{ key: 'screenShake' as keyof GameSettings, label: 'Screen Shake', desc: 'Shake on damage' },
		{ key: 'particles' as keyof GameSettings, label: 'Particles', desc: 'Death & hit effects' },
		{ key: 'damageNumbers' as keyof GameSettings, label: 'Damage Numbers', desc: 'Show floating numbers' },
		{ key: 'lowEffectsMode' as keyof GameSettings, label: 'Low Effects Mode', desc: 'Reduce visual effects' },
	];

	const tabs = [
		{ id: 'battle' as const, label: 'Battle', icon: '⚔' },
		{ id: 'workshop' as const, label: 'Workshop', icon: '⚙' },
		{ id: 'lab' as const, label: 'Lab', icon: '🔬' },
		{ id: 'tiers' as const, label: 'Tiers', icon: '🏆' },
		{ id: 'challenges' as const, label: 'Challenges', icon: '⚡' },
		{ id: 'stats' as const, label: 'Stats', icon: '📊' },
		{ id: 'settings' as const, label: 'Settings', icon: '⚙' },
	];

	// Speed labels for various display uses
	const speedLabel = $derived.by(() => {
		if (isPaused) return '⏸';
		return `${speedValue}×`;
	});
</script>

<div class="play-layout">
	<!-- ===== Toast Container ===== -->
	{#if toasts.length > 0}
		<div class="toast-container">
			{#each toasts as t}
				<div class="toast toast-{t.type}">{t.msg}</div>
			{/each}
		</div>
	{/if}

	<!-- ===== Top Bar ===== -->
	<header class="topbar" class:run-active={snapshot?.runActive ?? false}>
		<a href="/" class="topbar-back" aria-label="Home">←</a>
		<div class="topbar-brand">KoalaTower</div>
		<div class="topbar-divider"></div>
		<div class="topbar-stats">
			{#if snapshot?.runActive}
				<div class="stat-pill stat-wave"><span class="stat-icon">🌊</span><span class="stat-val">{snapshot.wave}</span></div>
			{/if}
			<div class="stat-pill stat-coins"><span class="stat-icon">🪙</span><span class="stat-val">{coins.toLocaleString()}</span></div>
			{#if snapshot?.runActive}
				<div class="stat-pill stat-cash"><span class="stat-icon">💰</span><span class="stat-val">{Math.floor(snapshot.cash)}</span></div>
				<div class="stat-pill stat-hp">
					<span class="stat-icon">❤️</span>
					<span class="stat-val">{Math.ceil(snapshot.towerHp)}</span>
					<span class="stat-max">/{snapshot.towerMaxHp}</span>
				</div>
			{/if}
		</div>
		<div class="topbar-actions">
			{#if snapshot?.runActive}
				<div class="speed-controls">
					<button class="speed-btn" class:active={isPaused} onclick={() => handleSpeed(0)} aria-label="Pause" title="Pause (Space)">⏸</button>
					{#each [1, 2, 3] as sp}
						<button class="speed-btn speed-num" class:active={!isPaused && speedValue === sp} onclick={() => handleSpeed(sp)} aria-label="{sp}x speed" title="{sp}x ({sp})">{sp}×</button>
					{/each}
					<button class="speed-btn speed-num" class:active={!isPaused && speedValue === 5} onclick={() => handleSpeed(4)} aria-label="5x speed" title="5x (4)">5×</button>
				</div>
			{/if}
			<div class="save-btn-wrap">
				<button class="icon-btn" onclick={() => showSaveMenu = !showSaveMenu} aria-label="Save menu">💾</button>
				{#if showSaveMenu}
					<div class="save-dropdown">
						<button onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast('📋 Exported to clipboard!', 'success'); showSaveMenu = false; }}>📋 Export Save</button>
						<button onclick={() => { showImportDialog = true; showSaveMenu = false; }}>📂 Import Save</button>
						<button onclick={() => { showResetConfirm = true; showSaveMenu = false; }}>🗑 Reset Save</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- ===== Speed bar (Mobile, always visible during runs) ===== -->
	{#if isMobile && snapshot?.runActive}
		<div class="mobile-speed-bar">
			<button class="speed-btn" class:active={isPaused} onclick={() => handleSpeed(0)}>⏸</button>
			{#each [1, 2, 3] as sp}
				<button class="speed-btn speed-num" class:active={!isPaused && speedValue === sp} onclick={() => handleSpeed(sp)}>{sp}×</button>
			{/each}
			<button class="speed-btn speed-num" class:active={!isPaused && speedValue === 5} onclick={() => handleSpeed(4)}>5×</button>
			<span class="mobile-speed-label">{speedLabel}</span>
		</div>
	{/if}

	<!-- ===== Game Over ===== -->
	{#if showGameOver}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Game Over">
			<div class="gameover-panel">
				<div class="gameover-glow"></div>
				<div class="gameover-icon">💀</div>
				<h2 class="gameover-title">Run Over</h2>
				<div class="gameover-wave-text">Reached Wave <strong>{gameOverWave}</strong></div>
				<div class="gameover-stats">
					<div class="gameover-stat"><span class="gos-icon">🪙</span><span class="gos-val">+{gameOverCoins}</span><span class="gos-label">Coins</span></div>
					<div class="gameover-stat-divider"></div>
					<div class="gameover-stat"><span class="gos-icon">💀</span><span class="gos-val">{gameOverKills}</span><span class="gos-label">Kills</span></div>
					<div class="gameover-stat-divider"></div>
					<div class="gameover-stat"><span class="gos-icon">🏆</span><span class="gos-val">{highestWave}</span><span class="gos-label">Best Wave</span></div>
				</div>
				<button class="gameover-btn" onclick={startRun}>▶ Play Again</button>
				<div class="gameover-second-row">
					<button class="gameover-second-btn" onclick={() => { showGameOver = false; showMobilePanel = true; activeTab = 'workshop'; }}>⚙ Workshop</button>
					<button class="gameover-second-btn" onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast('📋 Exported!', 'success'); }}>💾 Export</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ===== Import Dialog ===== -->
	{#if showImportDialog}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Import save">
			<div class="dialog-panel">
				<h3>📂 Import Save</h3>
				<p class="dialog-desc">Paste your exported save JSON below.</p>
				<textarea bind:value={importText} placeholder='Paste save JSON here...' rows={5}></textarea>
				<div class="dialog-actions">
					<button class="btn-dialog-primary" onclick={async () => {
						const result = await importSave(importText);
						toast(result.success ? '✅ Save imported!' : `❌ Error: ${result.error}`, result.success ? 'success' : 'error');
						showImportDialog = false;
						if (result.success) {
							const save = getCachedSave();
							if (save) { coinsStore.set(save.totalCoins); highestWaveStore.set(save.highestWave); totalRunsStore.set(save.totalRuns); }
						}
					}}>Import</button>
					<button class="btn-dialog-secondary" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ===== Reset Confirm ===== -->
	{#if showResetConfirm}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Reset save">
			<div class="dialog-panel dialog-danger">
				<h3>🗑 Reset Save?</h3>
				<p class="dialog-desc">This will permanently delete all progress. This cannot be undone. Consider exporting first.</p>
				<div class="dialog-actions">
					<button class="btn-dialog-danger" onclick={handleResetSave}>Reset Everything</button>
					<button class="btn-dialog-secondary" onclick={() => showResetConfirm = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="game-body">
		<!-- ===== Left Panel (desktop) ===== -->
		{#if !isMobile}
			<aside class="side-panel left-panel" class:collapsed={!leftPanelOpen}>
				<button class="panel-toggle" onclick={() => leftPanelOpen = !leftPanelOpen} aria-label="Toggle left panel">
					{leftPanelOpen ? '◀' : '▶'}
				</button>
				{#if leftPanelOpen}
					<div class="panel-content">
						<div class="panel-section">
							<div class="ps-title">📊 Run Info</div>
							{#if snapshot?.runActive}
								<div class="info-grid">
									<div class="info-row"><span class="info-l">Wave</span><span class="info-v">{snapshot.wave}</span></div>
									<div class="info-row"><span class="info-l">HP</span><span class="info-v hp-v">{Math.ceil(snapshot.towerHp)}<span class="info-max">/{snapshot.towerMaxHp}</span></span></div>
									<div class="info-row"><span class="info-l">Kills</span><span class="info-v">{snapshot.killCount}</span></div>
									<div class="info-row"><span class="info-l">Time</span><span class="info-v">{formatTime(snapshot.elapsedTime)}</span></div>
									<div class="info-row"><span class="info-l">Enemies</span><span class="info-v">{snapshot.enemyCount}</span></div>
									<div class="info-row"><span class="info-l">Cash</span><span class="info-v cash-v">💰{Math.floor(snapshot.cash)}</span></div>
								</div>
							{:else}
								<div class="panel-empty">Start a run to see live info.</div>
							{/if}
						</div>
						<div class="ps-divider"></div>
						<div class="panel-section">
							<div class="ps-title">⚡ Tower Stats</div>
							{#if engine?.state?.runActive}
								<div class="info-grid">
									<div class="info-row"><span class="info-l">Damage</span><span class="info-v">{engine.state.tower.stats.damage.toFixed(1)}</span></div>
									<div class="info-row"><span class="info-l">Fire Rate</span><span class="info-v">{engine.state.tower.stats.fireRate.toFixed(2)}/s</span></div>
									<div class="info-row"><span class="info-l">Range</span><span class="info-v">{engine.state.tower.stats.range.toFixed(0)}</span></div>
									<div class="info-row"><span class="info-l">Multishot</span><span class="info-v">×{engine.state.tower.stats.multishot}</span></div>
									<div class="info-row"><span class="info-l">Crit</span><span class="info-v">{(engine.state.tower.stats.critChance * 100).toFixed(1)}%</span></div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}

		<!-- ===== Game Canvas ===== -->
		<div class="game-canvas-container" bind:this={container}>
			{#if !engine?.state?.runActive && !showGameOver}
				<div class="start-overlay">
					<div class="start-card">
						<div class="start-card-accent"></div>
						<div class="start-card-icon">🐨</div>
						<h2 class="start-card-title">KoalaTower</h2>
						<p class="start-card-sub">Defend the tower. Survive the waves.</p>
						{#if highestWave > 0}
							<div class="start-card-records">
								<div class="start-rec"><span>🏆</span> Best: Wave {highestWave}</div>
								<div class="start-rec"><span>🪙</span> {coins.toLocaleString()} Coins</div>
								<div class="start-rec"><span>🎮</span> {totalRuns} Runs</div>
							</div>
						{/if}
						<button class="start-btn" onclick={startRun}>
							<span class="start-btn-bg"></span>
							<span class="start-btn-inner">▶ Start Run</span>
						</button>
						<p class="start-card-hint"><kbd>Enter</kbd> to start · <kbd>Space</kbd> pause</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- ===== Right Panel (desktop) ===== -->
		{#if !isMobile}
			<aside class="side-panel right-panel" class:collapsed={!rightPanelOpen}>
				<button class="panel-toggle" onclick={() => rightPanelOpen = !rightPanelOpen} aria-label="Toggle right panel">
					{rightPanelOpen ? '▶' : '◀'}
				</button>
				{#if rightPanelOpen}
					<div class="panel-content">
						<div class="panel-tabs">
							{#each tabs as tab}
								<button class="panel-tab" class:active={activeTab === tab.id} onclick={() => activeTab = tab.id}>
									{tab.icon}<span class="panel-tab-lbl">{tab.label}</span>
								</button>
							{/each}
						</div>
						<div class="panel-tab-body">
							{#if activeTab === 'battle'}
								<div class="panel-section">
									<div class="ps-title">⚔ Battle Upgrades</div>
									{#if snapshot?.runActive}
										<div class="upgrade-grid">
											{#each BATTLE_UPGRADES as upg}
												{@const lv = bl(upg.id)}
												{@const nextLv = Math.min(lv + 1, upg.maxLevel)}
												{@const cost = upg.cost(lv)}
												{@const canAfford = snapshot.cash >= cost}
												{@const maxed = lv >= upg.maxLevel}
												<button class="upgrade-card" class:afford={canAfford && !maxed && snapshot.runActive} class:maxed={maxed} class:locked={!snapshot.runActive} disabled={!canAfford || maxed || !snapshot?.runActive} onclick={() => buyBattleUpgrade(upg.id)}>
													<div class="uc-top">
														<span class="uc-icon">{upg.icon}</span>
														<span class="uc-name">{upg.name}</span>
														<span class="uc-lv">Lv.{lv}</span>
													</div>
													<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / upg.maxLevel) * 100)}%"></div></div>
													<div class="uc-bot">
														<span class="uc-cost">💰{cost}</span>
														<span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `→ ${getBattleUpgradeEffect(upg.id, nextLv).toFixed(1)}` : `Lv.1 ${getBattleUpgradeEffect(upg.id, 1).toFixed(1)}`}</span>
													</div>
												</button>
											{/each}
										</div>
									{:else}
										<div class="panel-empty">Start a run to buy upgrades with Cash.</div>
									{/if}
								</div>
							{:else if activeTab === 'workshop'}
								<div class="panel-section">
									<div class="ps-title">⚙ Workshop</div>
									<div class="upgrade-grid">
										{#each WORKSHOP_UPGRADES as upg}
											{@const lv = wl(upg.id)}
											{@const nextLv = Math.min(lv + 1, upg.maxLevel)}
											{@const cost = upg.cost(lv)}
											{@const canAfford = coins >= cost}
											{@const maxed = lv >= upg.maxLevel}
											<button class="upgrade-card" class:afford={canAfford && !maxed} class:maxed={maxed} disabled={!canAfford || maxed} onclick={() => buyWorkshopUpgrade(upg.id)}>
												<div class="uc-top"><span class="uc-icon">{upg.icon}</span><span class="uc-name">{upg.name}</span><span class="uc-lv">Lv.{lv}</span></div>
												<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / upg.maxLevel) * 100)}%"></div></div>
												<div class="uc-bot">
													<span class="uc-cost">🪙{cost}</span>
													<span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `+${getWorkshopUpgradeEffect(upg.id, nextLv)}` : `Lv.1: +${getWorkshopUpgradeEffect(upg.id, 1)}`}</span>
												</div>
											</button>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'lab'}
								<div class="panel-section">
									<div class="ps-title">🔬 Laboratory</div>
									<div class="upgrade-grid">
										{#each LAB_ITEMS as item}
											{@const lv = ll(item.id)}
											{@const nextLv = Math.min(lv + 1, item.maxLevel)}
											{@const cost = item.cost(lv)}
											{@const canAfford = coins >= cost}
											{@const maxed = lv >= item.maxLevel}
											<button class="upgrade-card lab-card" class:afford={canAfford && !maxed} class:maxed={maxed} disabled={!canAfford || maxed} onclick={() => buyLabUpgrade(item.id)}>
												<div class="uc-top"><span class="uc-icon">{item.icon}</span><span class="uc-name">{item.name}</span><span class="uc-lv">Lv.{lv}</span></div>
												<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / item.maxLevel) * 100)}%"></div></div>
												<div class="uc-bot"><span class="uc-cost">🪙{cost}</span><span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `+${getLabItemEffect(item.id, nextLv)}` : `Lv.1 +${getLabItemEffect(item.id, 1)}`}</span></div>
												<div class="lab-desc">{item.description}</div>
											</button>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'tiers'}
								<div class="panel-section">
									<div class="ps-title">🏆 Tiers</div>
									<div class="card-list">
										{#each TIERS as tier}
											<div class="tier-card" class:unlocked={tier.unlocked}>
												<div class="tier-hdr"><span class="tier-ico">{tier.unlocked ? '🔓' : '🔒'}</span><div><div class="tier-name">{tier.name}</div><div class="tier-desc">{tier.description}</div></div></div>
												<div class="tier-req" class:tier-ok={tier.unlocked}>{tier.unlocked ? '✓ Unlocked' : `Requires Wave ${tier.waveRequirement}`}</div>
											</div>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'challenges'}
								<div class="panel-section">
									<div class="ps-title">⚡ Challenges</div>
									<div class="card-list">
										{#each CHALLENGES as ch}
											<div class="challenge-card" class:locked={ch.locked}>
												<div class="ch-hdr"><span class="ch-icon">{ch.icon}</span><div><div class="ch-name">{ch.name}</div><div class="ch-desc">{ch.description}</div></div></div>
												{#if ch.highScore > 0}
													<div class="ch-score">Best: Wave {ch.highScore}</div>
												{:else if ch.locked}
													<div class="ch-locked">🔒 Locked</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- ===== Mobile Bottom Nav ===== -->
	{#if isMobile}
		<nav class="mobile-nav">
			{#each tabs as t}
				<button class="mn-btn" class:active={activeTab === t.id} onclick={() => { activeTab = t.id; showMobilePanel = true; }}>
					<span class="mn-icon">{t.icon}</span>
					<span class="mn-lbl">{t.label}</span>
				</button>
			{/each}
		</nav>

		{#if showMobilePanel}
			<div class="mob-overlay" onclick={() => showMobilePanel = false} onkeydown={(e) => e.key === 'Escape' && (showMobilePanel = false)} role="presentation"></div>
			<div class="mob-sheet" role="dialog" aria-modal="true" aria-label={activeTab}>
				<div class="mob-handle"></div>
				<div class="mob-hdr">
					<h3>{tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}</h3>
					<button class="mob-close" onclick={() => showMobilePanel = false}>✕</button>
				</div>
				<div class="mob-body">
					{#if activeTab === 'battle'}
						<div class="panel-section"><div class="ps-title">📊 Run Info</div>
							{#if snapshot?.runActive}
								<div class="info-grid">
									<div class="info-row"><span class="info-l">Wave</span><span class="info-v">{snapshot.wave}</span></div>
									<div class="info-row"><span class="info-l">HP</span><span class="info-v hp-v">{Math.ceil(snapshot.towerHp)}<span class="info-max">/{snapshot.towerMaxHp}</span></span></div>
									<div class="info-row"><span class="info-l">Kills</span><span class="info-v">{snapshot.killCount}</span></div>
									<div class="info-row"><span class="info-l">Cash</span><span class="info-v cash-v">💰{Math.floor(snapshot.cash)}</span></div>
								</div>
							{/if}
						</div>
						<div class="ps-divider"></div>
						<div class="panel-section"><div class="ps-title">⚡ Tower Stats</div>
							{#if engine?.state?.runActive}
								<div class="info-grid">
									<div class="info-row"><span class="info-l">Damage</span><span class="info-v">{engine.state.tower.stats.damage.toFixed(1)}</span></div>
									<div class="info-row"><span class="info-l">Fire Rate</span><span class="info-v">{engine.state.tower.stats.fireRate.toFixed(2)}/s</span></div>
									<div class="info-row"><span class="info-l">Range</span><span class="info-v">{engine.state.tower.stats.range.toFixed(0)}</span></div>
									<div class="info-row"><span class="info-l">Multishot</span><span class="info-v">×{engine.state.tower.stats.multishot}</span></div>
									<div class="info-row"><span class="info-l">Crit</span><span class="info-v">{(engine.state.tower.stats.critChance * 100).toFixed(1)}%</span></div>
								</div>
							{/if}
						</div>
						<div class="ps-divider"></div>
						<div class="panel-section"><div class="ps-title">⚔ Battle Upgrades</div>
							{#if snapshot?.runActive}
								<div class="upgrade-grid">
									{#each BATTLE_UPGRADES as upg}
										{@const lv = bl(upg.id)}
										{@const nextLv = Math.min(lv + 1, upg.maxLevel)}
										{@const cost = upg.cost(lv)}
										{@const canAfford = snapshot.cash >= cost}
										{@const maxed = lv >= upg.maxLevel}
										<button class="upgrade-card" class:afford={canAfford && !maxed} class:maxed={maxed} disabled={!canAfford || maxed || !snapshot?.runActive} onclick={() => buyBattleUpgrade(upg.id)}>
											<div class="uc-top"><span class="uc-icon">{upg.icon}</span><span class="uc-name">{upg.name}</span><span class="uc-lv">Lv.{lv}</span></div>
											<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / upg.maxLevel) * 100)}%"></div></div>
											<div class="uc-bot"><span class="uc-cost">💰{cost}</span><span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `→ ${getBattleUpgradeEffect(upg.id, nextLv).toFixed(1)}` : `Lv.1 ${getBattleUpgradeEffect(upg.id, 1).toFixed(1)}`}</span></div>
										</button>
									{/each}
								</div>
							{:else}
								<div class="panel-empty">Start a run to buy upgrades.</div>
							{/if}
						</div>
					{:else if activeTab === 'workshop'}
						<div class="panel-section"><div class="ps-title">⚙ Workshop</div>
							<div class="upgrade-grid">
								{#each WORKSHOP_UPGRADES as upg}
									{@const lv = wl(upg.id)}
									{@const nextLv = Math.min(lv + 1, upg.maxLevel)}
									{@const cost = upg.cost(lv)}
									{@const canAfford = coins >= cost}
									{@const maxed = lv >= upg.maxLevel}
									<button class="upgrade-card" class:afford={canAfford && !maxed} class:maxed={maxed} disabled={!canAfford || maxed} onclick={() => buyWorkshopUpgrade(upg.id)}>
										<div class="uc-top"><span class="uc-icon">{upg.icon}</span><span class="uc-name">{upg.name}</span><span class="uc-lv">Lv.{lv}</span></div>
										<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / upg.maxLevel) * 100)}%"></div></div>
										<div class="uc-bot"><span class="uc-cost">🪙{cost}</span><span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `+${getWorkshopUpgradeEffect(upg.id, nextLv)}` : `Lv.1 +${getWorkshopUpgradeEffect(upg.id, 1)}`}</span></div>
									</button>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'lab'}
						<div class="panel-section"><div class="ps-title">🔬 Laboratory</div>
							<div class="upgrade-grid">
								{#each LAB_ITEMS as item}
									{@const lv = ll(item.id)}
									{@const nextLv = Math.min(lv + 1, item.maxLevel)}
									{@const cost = item.cost(lv)}
									{@const canAfford = coins >= cost}
									{@const maxed = lv >= item.maxLevel}
									<button class="upgrade-card lab-card" class:afford={canAfford && !maxed} class:maxed={maxed} disabled={!canAfford || maxed} onclick={() => buyLabUpgrade(item.id)}>
										<div class="uc-top"><span class="uc-icon">{item.icon}</span><span class="uc-name">{item.name}</span><span class="uc-lv">Lv.{lv}</span></div>
										<div class="uc-bar-track"><div class="uc-bar-fill" style="width: {Math.min(100, (lv / item.maxLevel) * 100)}%"></div></div>
										<div class="uc-bot"><span class="uc-cost">🪙{cost}</span><span class="uc-next">{maxed ? 'MAXED' : lv > 0 ? `+${getLabItemEffect(item.id, nextLv)}` : `Lv.1 +${getLabItemEffect(item.id, 1)}`}</span></div>
										<div class="lab-desc">{item.description}</div>
									</button>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'tiers'}
						<div class="panel-section"><div class="ps-title">🏆 Tiers</div>
							<div class="card-list">
								{#each TIERS as tier}
									<div class="tier-card" class:unlocked={tier.unlocked}>
										<div class="tier-hdr"><span class="tier-ico">{tier.unlocked ? '🔓' : '🔒'}</span><div><div class="tier-name">{tier.name}</div><div class="tier-desc">{tier.description}</div></div></div>
										<div class="tier-req" class:tier-ok={tier.unlocked}>{tier.unlocked ? '✓ Unlocked' : `Requires Wave ${tier.waveRequirement}`}</div>
									</div>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'challenges'}
						<div class="panel-section"><div class="ps-title">⚡ Challenges</div>
							<div class="card-list">
								{#each CHALLENGES as ch}
									<div class="challenge-card" class:locked={ch.locked}>
										<div class="ch-hdr"><span class="ch-icon">{ch.icon}</span><div><div class="ch-name">{ch.name}</div><div class="ch-desc">{ch.description}</div></div></div>
										{#if ch.highScore > 0}
											<div class="ch-score">Best: Wave {ch.highScore}</div>
										{:else if ch.locked}
											<div class="ch-locked">🔒 Locked</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'stats'}
						<div class="panel-section"><div class="ps-title">📊 Statistics</div>
							<div class="info-grid">
								<div class="info-row"><span class="info-l">Total Runs</span><span class="info-v">{totalRuns}</span></div>
								<div class="info-row"><span class="info-l">Highest Wave</span><span class="info-v">{highestWave}</span></div>
								<div class="info-row"><span class="info-l">Total Coins</span><span class="info-v">🪙{coins.toLocaleString()}</span></div>
							</div>
							{#if snapshot?.runActive}
								<div class="ps-divider"></div>
								<div class="info-grid">
									<div class="info-row"><span class="info-l">Current Kills</span><span class="info-v">{snapshot.killCount}</span></div>
									<div class="info-row"><span class="info-l">Current Wave</span><span class="info-v">{snapshot.wave}</span></div>
									<div class="info-row"><span class="info-l">Run Time</span><span class="info-v">{formatTime(snapshot.elapsedTime)}</span></div>
								</div>
							{/if}
						</div>
					{:else if activeTab === 'settings'}
						<div class="panel-section"><div class="ps-title">⚙ Settings</div>
							<div class="settings-group">
								{#each settingsList as s}
									<label class="setting-row">
										<div class="set-info"><span class="set-lbl">{s.label}</span><span class="set-desc">{s.desc}</span></div>
										<div class="toggle" class:on={settings[s.key]} role="switch" aria-checked={settings[s.key]} tabindex="0" onclick={() => updateSetting(s.key, !settings[s.key])} onkeydown={(e) => e.key === 'Enter' && updateSetting(s.key, !settings[s.key])}>
											<div class="toggle-knob"></div>
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* ===== Layout ===== */
	.play-layout { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; background: var(--bg-primary); user-select: none; }

	/* ===== Toast ===== */
	.toast-container { position: fixed; top: 3.2rem; left: 50%; transform: translateX(-50%); z-index: 300; display: flex; flex-direction: column; gap: 0.35rem; pointer-events: none; }
	.toast {
		padding: 0.45rem 1.1rem; font-size: 0.78rem; border-radius: 100px; white-space: nowrap;
		backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
		animation: toastIn 0.2s ease; box-shadow: 0 0 20px rgba(0,0,0,0.3);
	}
	.toast-info { background: rgba(0,255,255,0.1); color: var(--cyan); border: 1px solid rgba(0,255,255,0.25); }
	.toast-success { background: rgba(68,255,136,0.1); color: var(--green); border: 1px solid rgba(68,255,136,0.25); }
	.toast-warning { background: rgba(255,68,68,0.1); color: var(--red); border: 1px solid rgba(255,68,68,0.25); }
	.toast-error { background: rgba(255,68,68,0.12); color: #FF6666; border: 1px solid rgba(255,68,68,0.3); }
	.toast-milestone { background: rgba(255,221,68,0.1); color: var(--yellow); border: 1px solid rgba(255,221,68,0.25); }
	@keyframes toastIn { from { opacity: 0; transform: translateY(-8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

	/* ===== Top Bar ===== */
	.topbar {
		display: flex; align-items: center; padding: 0.35rem 0.75rem; gap: 0.5rem;
		background: rgba(7,8,18,0.95); border-bottom: 1px solid var(--border-neon);
		z-index: 100; flex-shrink: 0; position: relative;
	}
	.topbar.run-active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--cyan), transparent); opacity: 0.5; }
	.topbar-back { color: var(--text-dim); font-size: 1.05rem; text-decoration: none; padding: 0.15rem 0.35rem; border-radius: var(--radius-sm); transition: all var(--transition-fast); line-height: 1; }
	.topbar-back:hover { color: var(--cyan); background: rgba(0,255,255,0.06); }
	.topbar-brand { font-weight: 700; font-size: 0.85rem; background: linear-gradient(135deg, var(--cyan), var(--blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; white-space: nowrap; }
	.topbar-divider { width: 1px; height: 18px; background: var(--border-neon); flex-shrink: 0; }
	.topbar-stats { display: flex; gap: 0.3rem; align-items: center; margin-left: auto; }
	.stat-pill { display: flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.45rem; font-size: 0.7rem; font-family: var(--font-mono); border-radius: 100px; background: var(--bg-tertiary); border: 1px solid var(--border-neon); transition: all var(--transition-fast); }
	.stat-icon { font-size: 0.7rem; }
	.stat-val { font-weight: 500; }
	.stat-max { color: var(--text-dim); font-size: 0.62rem; }
	.stat-wave .stat-val { color: var(--cyan); }
	.stat-coins .stat-val { color: var(--yellow); }
	.stat-cash .stat-val { color: var(--green); }
	.stat-hp .stat-val { color: #FF9988; }

	/* ===== Speed Controls ===== */
	.speed-controls { display: flex; gap: 2px; align-items: center; background: var(--bg-tertiary); border: 1px solid var(--border-neon); border-radius: 100px; padding: 1px; }
	.speed-btn { padding: 0.2rem 0.45rem; font-size: 0.62rem; font-family: var(--font-mono); color: var(--text-dim); border-radius: 100px; transition: all var(--transition-fast); line-height: 1; cursor: pointer; }
	.speed-btn:hover { color: var(--text-secondary); background: rgba(255,255,255,0.05); }
	.speed-btn.active { color: var(--cyan); background: rgba(0,255,255,0.1); }
	.speed-num { min-width: 1.6rem; text-align: center; }

	/* ===== Save Dropdown ===== */
	.topbar-actions { display: flex; gap: 0.25rem; align-items: center; position: relative; }
	.icon-btn { padding: 0.3rem; border-radius: var(--radius-sm); color: var(--text-dim); transition: all var(--transition-fast); font-size: 0.85rem; line-height: 1; cursor: pointer; }
	.icon-btn:hover { color: var(--cyan); background: rgba(0,255,255,0.08); }
	.save-btn-wrap { position: relative; }
	.save-dropdown { position: absolute; top: calc(100% + 4px); right: 0; min-width: 160px; background: var(--bg-secondary); border: 1px solid var(--border-neon-strong); border-radius: var(--radius-md); z-index: 200; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: fadeIn 0.12s ease; }
	.save-dropdown button { display: block; width: 100%; padding: 0.55rem 0.9rem; font-size: 0.75rem; text-align: left; color: var(--text-secondary); transition: all var(--transition-fast); }
	.save-dropdown button:hover { background: rgba(0,255,255,0.06); color: var(--text-primary); }

	/* ===== Mobile Speed Bar ===== */
	.mobile-speed-bar { display: flex; align-items: center; gap: 3px; padding: 0.3rem 0.75rem; background: rgba(7,8,18,0.9); border-bottom: 1px solid var(--border-neon); flex-shrink: 0; }
	.mobile-speed-bar .speed-btn { padding: 0.3rem 0.55rem; font-size: 0.7rem; }
	.mobile-speed-label { margin-left: auto; font-size: 0.7rem; color: var(--cyan); font-family: var(--font-mono); }

	/* ===== Game Body ===== */
	.game-body { flex: 1; display: flex; overflow: hidden; position: relative; }
	.game-canvas-container { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); }

	/* ===== Start Overlay ===== */
	.start-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at center, rgba(7,8,18,0.5) 0%, var(--bg-primary) 100%); z-index: 10; }
	.start-card { position: relative; text-align: center; padding: 2.5rem 2.5rem 2rem; background: var(--bg-glass-strong); border: 1px solid var(--border-neon); border-radius: var(--radius-xl); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); max-width: 360px; width: 90%; animation: scaleIn 0.35s ease; box-shadow: 0 0 60px rgba(0,255,255,0.06); }
	.start-card-accent { position: absolute; top: -1px; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, var(--cyan), transparent); opacity: 0.6; }
	.start-card-icon { font-size: 2.8rem; display: block; margin-bottom: 0.6rem; filter: drop-shadow(0 0 20px rgba(0,255,255,0.3)); }
	.start-card-title { font-size: 1.4rem; margin-bottom: 0.25rem; }
	.start-card-sub { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 1.25rem; }
	.start-card-records { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; padding: 0.65rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-md); }
	.start-rec { font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-dim); display: flex; gap: 0.35rem; align-items: center; }
	.start-btn { position: relative; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.8rem 2.25rem; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--cyan), var(--blue)); color: var(--bg-primary); font-weight: 700; font-size: 1rem; cursor: pointer; overflow: hidden; transition: all var(--transition-normal); box-shadow: 0 0 30px rgba(0,255,255,0.2); }
	.start-btn:hover { transform: translateY(-2px); box-shadow: 0 0 50px rgba(0,255,255,0.35); }
	.start-btn-bg { position: absolute; inset: 0; background: linear-gradient(135deg, transparent, rgba(255,255,255,0.12), transparent); transition: opacity var(--transition-normal); opacity: 0; }
	.start-btn:hover .start-btn-bg { opacity: 1; }
	.start-btn-inner { position: relative; z-index: 1; display: flex; align-items: center; gap: 0.4rem; }
	.start-card-hint { margin-top: 0.6rem; font-size: 0.65rem; color: var(--text-dim); }
	.start-card-hint kbd { padding: 0.05rem 0.3rem; background: var(--bg-tertiary); border-radius: 3px; font-family: var(--font-mono); font-size: 0.6rem; border: 1px solid var(--border-neon); }

	/* ===== Side Panels ===== */
	.side-panel { display: flex; flex-direction: column; background: var(--bg-glass); border-left: 1px solid var(--border-neon); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); position: relative; transition: width var(--transition-normal); width: 255px; flex-shrink: 0; overflow: hidden; z-index: 5; }
	.side-panel.collapsed { width: 26px; }
	.left-panel { border-left: none; border-right: 1px solid var(--border-neon); }
	.panel-toggle { position: absolute; top: 0.35rem; z-index: 6; background: var(--bg-tertiary); border: 1px solid var(--border-neon); border-radius: var(--radius-sm); color: var(--text-dim); font-size: 0.6rem; padding: 0.15rem 0.25rem; cursor: pointer; transition: all var(--transition-fast); line-height: 1; }
	.left-panel .panel-toggle { right: 0.2rem; } .right-panel .panel-toggle { left: 0.2rem; }
	.panel-toggle:hover { background: rgba(0,255,255,0.12); color: var(--cyan); }
	.panel-content { padding: 0.55rem; overflow-y: auto; flex: 1; height: 100%; display: flex; flex-direction: column; gap: 0.15rem; }

	/* ===== Panel Utils ===== */
	.panel-section { margin-bottom: 0.35rem; }
	.ps-title { display: flex; align-items: center; gap: 0.3rem; font-size: 0.65rem; color: var(--cyan); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; padding-bottom: 0.3rem; border-bottom: 1px solid rgba(0,255,255,0.1); }
	.ps-divider { height: 1px; background: linear-gradient(90deg, var(--border-neon), transparent); margin: 0.15rem 0 0.35rem; }
	.panel-empty { color: var(--text-dim); font-size: 0.68rem; font-style: italic; padding: 0.4rem 0; }

	/* ===== Info Grid ===== */
	.info-grid { display: grid; gap: 1px; }
	.info-row { display: flex; justify-content: space-between; padding: 0.15rem 0.3rem; font-size: 0.68rem; border-radius: 3px; }
	.info-row:nth-child(odd) { background: rgba(0,0,0,0.12); }
	.info-l { color: var(--text-dim); }
	.info-v { color: var(--text-secondary); font-family: var(--font-mono); font-weight: 500; }
	.hp-v { color: var(--green); } .cash-v { color: var(--green); }
	.info-max { color: var(--text-dim); font-size: 0.6rem; }

	/* ===== Panel Tabs ===== */
	.panel-tabs { display: flex; gap: 1px; margin-bottom: 0.4rem; padding: 2px; background: rgba(0,0,0,0.15); border-radius: var(--radius-sm); flex-wrap: wrap; }
	.panel-tab { flex: 1; min-width: 0; padding: 0.25rem 0.15rem; font-size: 0.57rem; color: var(--text-dim); border-radius: 4px; transition: all var(--transition-fast); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.panel-tab.active { color: var(--cyan); background: rgba(0,255,255,0.08); }
	.panel-tab:hover:not(.active) { color: var(--text-secondary); background: rgba(255,255,255,0.02); }
	.panel-tab-lbl { margin-left: 2px; }
	.panel-tab-body { flex: 1; overflow-y: auto; }

	/* ===== Upgrade Cards ===== */
	.upgrade-grid { display: flex; flex-direction: column; gap: 2px; }
	.upgrade-card { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.35rem 0.45rem; background: var(--bg-tertiary); border: 1px solid var(--border-neon); border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast); text-align: left; width: 100%; }
	.upgrade-card.afford { border-color: rgba(68,255,136,0.25); }
	.upgrade-card.afford:hover { border-color: var(--cyan); background: rgba(0,255,255,0.05); box-shadow: 0 0 8px rgba(0,255,255,0.06); }
	.upgrade-card.maxed { opacity: 0.35; cursor: default; }
	.upgrade-card.locked { opacity: 0.5; cursor: default; }
	.upgrade-card:disabled:not(.maxed):not(.locked) { opacity: 0.55; cursor: default; }
	.uc-top { display: flex; align-items: center; gap: 0.25rem; }
	.uc-icon { font-size: 0.75rem; flex-shrink: 0; }
	.uc-name { flex: 1; font-size: 0.65rem; font-weight: 500; color: var(--text-secondary); }
	.uc-lv { font-size: 0.58rem; font-family: var(--font-mono); color: var(--text-dim); }
	.uc-bar-track { height: 2px; background: rgba(0,0,0,0.3); border-radius: 2px; overflow: hidden; }
	.uc-bar-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--blue)); border-radius: 2px; transition: width var(--transition-normal); }
	.upgrade-card.afford .uc-bar-fill { background: linear-gradient(90deg, var(--green), var(--cyan)); }
	.uc-bot { display: flex; align-items: center; gap: 0.3rem; font-size: 0.58rem; }
	.uc-cost { font-family: var(--font-mono); color: var(--yellow); }
	.uc-next { margin-left: auto; color: var(--text-dim); font-family: var(--font-mono); }
	.upgrade-card.afford .uc-next { color: var(--green); }
	.lab-card { gap: 0.2rem; }
	.lab-desc { font-size: 0.55rem; color: var(--text-dim); line-height: 1.3; }

	/* ===== Tier / Challenge Cards ===== */
	.card-list { display: flex; flex-direction: column; gap: 0.35rem; }
	.tier-card, .challenge-card { padding: 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-neon); border-radius: var(--radius-sm); transition: all var(--transition-fast); }
	.tier-card.unlocked { border-color: rgba(68,255,136,0.15); }
	.challenge-card.locked { opacity: 0.5; }
	.tier-hdr, .ch-hdr { display: flex; gap: 0.4rem; align-items: flex-start; }
	.tier-ico, .ch-icon { font-size: 0.95rem; flex-shrink: 0; margin-top: 1px; }
	.tier-name, .ch-name { font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-bottom: 0.1rem; }
	.tier-desc, .ch-desc { font-size: 0.6rem; color: var(--text-dim); line-height: 1.35; }
	.tier-req, .ch-score, .ch-locked { font-size: 0.58rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.25rem; padding: 0.15rem 0.35rem; background: rgba(0,0,0,0.15); border-radius: 3px; display: inline-block; }
	.tier-ok { color: var(--green); }
	.ch-score { color: var(--green); }
	.ch-locked { color: var(--text-dim); }

	/* ===== Settings ===== */
	.settings-group { display: flex; flex-direction: column; gap: 1px; }
	.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.35rem; border-radius: var(--radius-sm); cursor: pointer; transition: background var(--transition-fast); }
	.setting-row:hover { background: rgba(255,255,255,0.02); }
	.set-info { display: flex; flex-direction: column; gap: 0.05rem; }
	.set-lbl { font-size: 0.7rem; color: var(--text-secondary); }
	.set-desc { font-size: 0.58rem; color: var(--text-dim); }
	.toggle { width: 34px; height: 20px; border-radius: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-neon); position: relative; transition: all var(--transition-fast); flex-shrink: 0; cursor: pointer; }
	.toggle.on { background: rgba(0,255,255,0.12); border-color: var(--cyan); }
	.toggle-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--text-dim); transition: all var(--transition-fast); }
	.toggle.on .toggle-knob { left: 16px; background: var(--cyan); box-shadow: 0 0 6px rgba(0,255,255,0.4); }

	/* ===== Overlays ===== */
	.overlay { position: fixed; inset: 0; background: rgba(7,8,18,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }

	/* ===== Game Over ===== */
	.gameover-panel { position: relative; text-align: center; padding: 2.25rem 2rem 1.75rem; background: var(--bg-secondary); border: 1px solid rgba(255,68,170,0.25); border-radius: var(--radius-xl); max-width: 340px; width: 100%; overflow: hidden; animation: scaleIn 0.3s ease; box-shadow: 0 0 60px rgba(255,68,170,0.06); }
	.gameover-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at center, rgba(255,68,170,0.04) 0%, transparent 60%); pointer-events: none; }
	.gameover-icon { font-size: 2.8rem; margin-bottom: 0.35rem; display: block; }
	.gameover-title { font-size: 1.6rem; color: var(--pink); margin-bottom: 0.15rem; }
	.gameover-wave-text { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1.25rem; font-family: var(--font-mono); }
	.gameover-wave-text strong { color: var(--text-primary); }
	.gameover-stats { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.25rem; padding: 0.85rem; background: rgba(0,0,0,0.15); border-radius: var(--radius-md); }
	.gameover-stat { text-align: center; min-width: 60px; }
	.gos-icon { font-size: 1.1rem; display: block; margin-bottom: 0.15rem; }
	.gos-val { font-size: 1.2rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }
	.gos-label { font-size: 0.58rem; color: var(--text-dim); margin-top: 0.05rem; text-transform: uppercase; letter-spacing: 0.06em; }
	.gameover-stat-divider { width: 1px; height: 35px; background: var(--border-neon); }
	.gameover-btn { display: block; width: 100%; padding: 0.75rem; background: linear-gradient(135deg, var(--cyan), var(--blue)); color: var(--bg-primary); font-weight: 700; font-size: 0.95rem; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-normal); box-shadow: 0 0 20px rgba(0,255,255,0.12); }
	.gameover-btn:hover { box-shadow: 0 0 30px rgba(0,255,255,0.25); transform: translateY(-1px); }
	.gameover-second-row { display: flex; gap: 0.5rem; margin-top: 0.55rem; }
	.gameover-second-btn { flex: 1; padding: 0.5rem; font-size: 0.75rem; border-radius: var(--radius-sm); background: transparent; border: 1px solid var(--border-neon); color: var(--text-dim); cursor: pointer; transition: all var(--transition-fast); }
	.gameover-second-btn:hover { border-color: var(--text-dim); color: var(--text-secondary); }

	/* ===== Dialog Panels ===== */
	.dialog-panel { background: var(--bg-secondary); border: 1px solid var(--border-neon-strong); border-radius: var(--radius-xl); padding: 1.75rem; max-width: 380px; width: 100%; animation: scaleIn 0.25s ease; }
	.dialog-panel h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
	.dialog-desc { color: var(--text-dim); font-size: 0.78rem; margin-bottom: 0.85rem; line-height: 1.5; }
	.dialog-panel textarea { width: 100%; margin-bottom: 0.85rem; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-neon); border-radius: var(--radius-sm); padding: 0.5rem; font-family: var(--font-mono); font-size: 0.68rem; resize: vertical; }
	.dialog-actions { display: flex; gap: 0.5rem; justify-content: center; }
	.btn-dialog-primary, .btn-dialog-secondary, .btn-dialog-danger { padding: 0.5rem 1.15rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all var(--transition-fast); }
	.btn-dialog-primary { background: var(--cyan); color: var(--bg-primary); }
	.btn-dialog-primary:hover { box-shadow: 0 0 14px rgba(0,255,255,0.3); }
	.btn-dialog-secondary { background: transparent; border: 1px solid var(--border-neon); color: var(--text-secondary); }
	.btn-dialog-secondary:hover { border-color: var(--text-dim); color: var(--text-primary); }
	.btn-dialog-danger { background: var(--red); color: white; }
	.btn-dialog-danger:hover { box-shadow: 0 0 14px rgba(255,68,68,0.3); }
	.dialog-danger { border-color: rgba(255,68,68,0.25); }

	/* ===== Mobile Nav ===== */
	.mobile-nav { display: flex; overflow-x: auto; background: rgba(7,8,18,0.95); border-top: 1px solid var(--border-neon); flex-shrink: 0; z-index: 100; }
	.mn-btn { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 0.3rem 0.05rem; font-size: 0.5rem; color: var(--text-dim); transition: all var(--transition-fast); gap: 1px; position: relative; }
	.mn-btn.active { color: var(--cyan); }
	.mn-btn.active::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2px; background: var(--cyan); border-radius: 0 0 2px 2px; }
	.mn-icon { font-size: 1.05rem; }
	.mn-lbl { font-size: 0.48rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

	/* ===== Mobile Sheet ===== */
	.mob-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 150; animation: fadeIn 0.12s ease; }
	.mob-sheet { position: fixed; bottom: 0; left: 0; right: 0; max-height: 78vh; background: var(--bg-secondary); border-top: 1px solid var(--border-neon); border-radius: var(--radius-xl) var(--radius-xl) 0 0; z-index: 160; display: flex; flex-direction: column; animation: slideUp 0.25s cubic-bezier(0.4,0,0.2,1); }
	.mob-handle { width: 32px; height: 3px; background: var(--text-dim); border-radius: 2px; margin: 0.5rem auto 0.3rem; flex-shrink: 0; }
	.mob-hdr { display: flex; justify-content: space-between; align-items: center; padding: 0.15rem 1rem 0.35rem; flex-shrink: 0; }
	.mob-hdr h3 { color: var(--cyan); font-size: 0.9rem; }
	.mob-close { font-size: 1rem; color: var(--text-dim); padding: 0.2rem; cursor: pointer; }
	.mob-body { padding: 0 1rem 1.5rem; overflow-y: auto; }

	/* ===== Animations ===== */
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
	@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

	/* ===== Responsive ===== */
	@media (min-width: 768px) { .mobile-nav, .mob-overlay, .mob-sheet, .mobile-speed-bar { display: none; } }
	@media (max-width: 767px) {
		.topbar { padding: 0.3rem 0.5rem; gap: 0.3rem; }
		.topbar-brand { font-size: 0.75rem; }
		.topbar-divider { display: none; }
		.speed-controls { display: none; }
	}
</style>
