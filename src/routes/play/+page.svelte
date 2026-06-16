<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
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

	let isMobile = $state(false);
	let leftPanelOpen = $state(false);
	let rightPanelOpen = $state(true);
	let activeTab = $state<'battle' | 'workshop' | 'lab' | 'tiers' | 'challenges' | 'stats' | 'settings'>('battle');
	let showGameOver = $state(false);
	let gameOverCoins = $state(0);
	let gameOverWave = $state(0);

	let snapshot = $state<GameSnapshot | null>(null);
	let coins = $state(0);
	let settings = $state<GameSettings>({
		reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false,
	});
	let highestWave = $state(0);
	let totalRuns = $state(0);

	let showSaveMenu = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let saveMessage = $state('');
	let showMobilePanel = $state(false);
	let showRunStats = $state(false);

	onMount(() => {
		const checkMobile = () => { isMobile = window.innerWidth < 768; };
		checkMobile();
		window.addEventListener('resize', checkMobile);
		const unsub1 = coinsStore.subscribe(c => coins = c);
		const unsub2 = settingsStore.subscribe(s => { settings = s; });
		const unsub3 = highestWaveStore.subscribe(w => highestWave = w);
		const unsub4 = totalRunsStore.subscribe(r => totalRuns = r);
		return () => {
			window.removeEventListener('resize', checkMobile);
			unsub1(); unsub2(); unsub3(); unsub4();
		};
	});

	onDestroy(() => { gameView?.destroy(); engine?.cleanup(); });

	function initEngine() {
		if (engine) engine.cleanup();
		if (gameView) { gameView.destroy(); gameView = null; }
		engine = new GameEngine();
		engine.setCallbacks({
			onSnapshot: (s: GameSnapshot) => { snapshot = s; },
			onGameOver: (_coinsEarned: number, _wave: number) => {
				gameOverCoins = _coinsEarned;
				gameOverWave = _wave;
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
			},
			onMilestone: (_text: string) => {},
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
		const save = getCachedSave();
		engine.startRun(save?.workshopUpgrades ?? {}, coins);
		gameView?.start();
	}

	function buyBattleUpgrade(id: UpgradeId) { engine?.buyBattleUpgrade(id); }
	function getBattleUpgradeLevel(id: UpgradeId): number { return engine?.state.battleUpgrades[id] ?? 0; }

	function getBattleUpgradeEffectDisplay(id: UpgradeId): string {
		const level = getBattleUpgradeLevel(id);
		if (level === 0) return '';
		const val = getBattleUpgradeEffect(id, level);
		switch (id) {
			case UpgradeId.Damage: return `+${val}`;
			case UpgradeId.FireRate: return `+${(val * 100).toFixed(0)}%`;
			case UpgradeId.Range: return `+${val}`;
			case UpgradeId.Multishot: return `+${val}`;
			case UpgradeId.CritChance: return `+${(val * 100).toFixed(0)}%`;
			case UpgradeId.Defense: return `+${val}`;
			case UpgradeId.MaxHp: return `+${val}`;
		}
	}

	function getWorkshopLevel(id: WorkshopUpgradeId): number { return getCachedSave()?.workshopUpgrades[id] ?? 0; }

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
			saveMessage = 'Upgrade purchased!';
			setTimeout(() => saveMessage = '', 2000);
		}
	}

	function getLabLevel(id: string): number {
		const save = getCachedSave();
		if (!save) return 0;
		return (save.labLevels as Record<string, number>)[id] ?? 0;
	}

	function buyLabUpgrade(id: string) {
		const save = getCachedSave();
		if (!save) return;
		const level = (save.labLevels as Record<string, number>)[id] ?? 0;
		const labItem = LAB_ITEMS.find(l => l.id === id);
		if (!labItem) return;
		const cost = labItem.cost(level);
		if (save.totalCoins >= cost && level < labItem.maxLevel) {
			save.totalCoins -= cost;
			save.labLevels[id as keyof typeof save.labLevels] = level + 1;
			coinsStore.set(save.totalCoins);
			persistSave(save);
			saveMessage = 'Research completed!';
			setTimeout(() => saveMessage = '', 2000);
		}
	}

	function handleResetSave() {
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
			saveMessage = 'Save reset!';
			setTimeout(() => saveMessage = '', 2000);
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

	const settings_list = [
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
</script>

<div class="play-layout">
	<!-- Top Bar -->
	<header class="topbar">
		<a href="/" class="topbar-back" aria-label="Home">←</a>
		<div class="topbar-brand">KoalaTower</div>
		<div class="topbar-divider"></div>
		<div class="topbar-stats">
			{#if snapshot?.runActive}
				<div class="stat-pill stat-wave">
					<svg class="stat-pill-icon" viewBox="0 0 16 16" width="14" height="14"><path d="M8 1l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="currentColor"/></svg>
					<span>{snapshot.wave}</span>
				</div>
			{/if}
			<div class="stat-pill stat-coins">
				<span>🪙</span>
				<span>{coins.toLocaleString()}</span>
			</div>
			{#if snapshot?.runActive}
				<div class="stat-pill stat-cash">
					<span>💰</span>
					<span>{Math.floor(snapshot.cash)}</span>
				</div>
				<div class="stat-pill stat-hp">
					<svg class="stat-pill-icon" viewBox="0 0 16 16" width="14" height="14"><path d="M8 14s-5-4-5-7a4 4 0 018 0c0 3-5 7-5 7z" fill="currentColor"/></svg>
					<span>{Math.ceil(snapshot.towerHp)}</span>
				</div>
			{/if}
		</div>
		<div class="topbar-actions">
			{#if snapshot?.runActive}
				<button class="topbar-action-btn" onclick={() => engine?.togglePause()} aria-label="Pause">
					<svg viewBox="0 0 16 16" width="16" height="16"><rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/><rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/></svg>
				</button>
			{/if}
			<div class="save-btn-wrap">
				<button class="topbar-action-btn" onclick={() => showSaveMenu = !showSaveMenu} aria-label="Save menu">
					<svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 1H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V4l-3-3zM8 12a2 2 0 110-4 2 2 0 010 4zm1-7H4V2h5v3z" fill="currentColor"/></svg>
				</button>
				{#if showSaveMenu}
					<div class="save-dropdown">
						<button onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); saveMessage = 'Exported to clipboard!'; setTimeout(() => saveMessage = '', 2000); showSaveMenu = false; }}>📋 Export Save</button>
						<button onclick={() => { showImportDialog = true; showSaveMenu = false; }}>📂 Import Save</button>
						<button onclick={() => { showResetConfirm = true; showSaveMenu = false; }}>🗑 Reset Save</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Toast -->
	{#if saveMessage}
		<div class="toast">{saveMessage}</div>
	{/if}

	<!-- Game Over -->
	{#if showGameOver}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Game Over">
			<div class="gameover-panel">
				<div class="gameover-glow"></div>
				<div class="gameover-icon">💀</div>
				<h2 class="gameover-title">Game Over</h2>
				<div class="gameover-wave-text">Wave {gameOverWave}</div>
				<div class="gameover-stats">
					<div class="gameover-stat">
						<div class="gameover-stat-icon">🪙</div>
						<div class="gameover-stat-value">+{gameOverCoins}</div>
						<div class="gameover-stat-label">Coins Earned</div>
					</div>
					<div class="gameover-stat-divider"></div>
					<div class="gameover-stat">
						<div class="gameover-stat-icon">💀</div>
						<div class="gameover-stat-value">{snapshot?.killCount ?? 0}</div>
						<div class="gameover-stat-label">Kills</div>
					</div>
				</div>
				<button class="gameover-btn" onclick={startRun}>▶ Play Again</button>
				<button class="gameover-close" onclick={() => { showGameOver = false; }}>Close</button>
			</div>
		</div>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Import save">
			<div class="dialog-panel">
				<h3>📂 Import Save</h3>
				<p class="dialog-desc">Paste your exported save JSON below.</p>
				<textarea bind:value={importText} placeholder='Paste your save JSON here...' rows={5}></textarea>
				<div class="dialog-actions">
					<button class="btn-dialog-primary" onclick={async () => {
						const result = await importSave(importText);
						saveMessage = result.success ? 'Save imported!' : `Error: ${result.error}`;
						showImportDialog = false;
						if (result.success) {
							const save = getCachedSave();
							if (save) { coinsStore.set(save.totalCoins); highestWaveStore.set(save.highestWave); totalRunsStore.set(save.totalRuns); }
						}
						setTimeout(() => saveMessage = '', 3000);
					}}>Import</button>
					<button class="btn-dialog-secondary" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Reset Confirm -->
	{#if showResetConfirm}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Reset save">
			<div class="dialog-panel dialog-danger">
				<h3>🗑 Reset Save?</h3>
				<p class="dialog-desc">This will permanently delete all progress. This cannot be undone.</p>
				<div class="dialog-actions">
					<button class="btn-dialog-danger" onclick={handleResetSave}>Reset Everything</button>
					<button class="btn-dialog-secondary" onclick={() => showResetConfirm = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="game-body">
		<!-- Left Panel (desktop) -->
		{#if !isMobile}
			<aside class="side-panel left-panel" class:collapsed={!leftPanelOpen}>
				<button class="panel-toggle" onclick={() => leftPanelOpen = !leftPanelOpen} aria-label="Toggle left panel">
					{leftPanelOpen ? '◀' : '▶'}
				</button>
				{#if leftPanelOpen}
					<div class="panel-content">
						<div class="panel-section">
							<div class="panel-section-title">
								<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
								Run Info
							</div>
							{#if snapshot?.runActive}
								<div class="info-grid">
									<div class="info-item"><span class="info-label">Wave</span><span class="info-val">{snapshot.wave}</span></div>
									<div class="info-item"><span class="info-label">HP</span><span class="info-val hp">{Math.ceil(snapshot.towerHp)}<span class="info-max">/{snapshot.towerMaxHp}</span></span></div>
									<div class="info-item"><span class="info-label">Kills</span><span class="info-val">{snapshot.killCount}</span></div>
									<div class="info-item"><span class="info-label">Time</span><span class="info-val">{formatTime(snapshot.elapsedTime)}</span></div>
									<div class="info-item"><span class="info-label">Enemies</span><span class="info-val">{snapshot.enemyCount}</span></div>
									<div class="info-item"><span class="info-label">Cash</span><span class="info-val cash">💰{Math.floor(snapshot.cash)}</span></div>
								</div>
							{:else}
								<div class="panel-empty">Start a run to see live info.</div>
							{/if}
						</div>
						<div class="panel-section-divider"></div>
						<div class="panel-section">
							<div class="panel-section-title">
								<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 1l2 3 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="currentColor"/></svg>
								Tower Stats
							</div>
							{#if engine?.state?.runActive}
								<div class="info-grid">
									<div class="info-item"><span class="info-label">Damage</span><span class="info-val">{engine.state.tower.stats.damage.toFixed(1)}</span></div>
									<div class="info-item"><span class="info-label">Fire Rate</span><span class="info-val">{engine.state.tower.stats.fireRate.toFixed(2)}/s</span></div>
									<div class="info-item"><span class="info-label">Range</span><span class="info-val">{engine.state.tower.stats.range.toFixed(0)}</span></div>
									<div class="info-item"><span class="info-label">Multishot</span><span class="info-val">x{engine.state.tower.stats.multishot}</span></div>
									<div class="info-item"><span class="info-label">Crit</span><span class="info-val">{(engine.state.tower.stats.critChance * 100).toFixed(1)}%</span></div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}

		<!-- Game Canvas -->
		<div class="game-canvas-container" bind:this={container}>
			{#if !engine?.state?.runActive && !showGameOver}
				<div class="start-overlay">
					<div class="start-card">
						<div class="start-card-glow"></div>
						<div class="start-card-icon">🐨</div>
						<h2 class="start-card-title">KoalaTower</h2>
						<p class="start-card-subtitle">Defend the tower. Survive the waves.</p>
						{#if highestWave > 0}
							<div class="start-card-records">
								<div class="start-record"><span>🏆</span> Best Wave: {highestWave}</div>
								<div class="start-record"><span>🪙</span> Total Coins: {coins.toLocaleString()}</div>
								<div class="start-record"><span>🎮</span> Total Runs: {totalRuns}</div>
							</div>
						{/if}
						<button class="start-btn" onclick={startRun}>
							<span class="start-btn-glow"></span>
							<span class="start-btn-content">
								<svg viewBox="0 0 20 20" width="18" height="18"><polygon points="5,3 17,10 5,17" fill="currentColor"/></svg>
								Start Run
							</span>
						</button>
						{#if !isMobile}
							<p class="start-card-hint">Press <kbd>Enter</kbd> to start</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Panel (desktop) -->
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
									{tab.icon}<span class="panel-tab-label">{tab.label}</span>
								</button>
							{/each}
						</div>
						<div class="panel-tab-content">
							{#if activeTab === 'battle'}
								<div class="panel-section">
									<div class="panel-section-title">Battle Upgrades</div>
									{#if snapshot?.runActive}
										<div class="upgrade-grid">
											{#each BATTLE_UPGRADES as upgrade}
												{@const level = getBattleUpgradeLevel(upgrade.id)}
												{@const cost = upgrade.cost(level)}
												{@const canAfford = snapshot.cash >= cost}
												<button class="upgrade-card" class:can-afford={canAfford && snapshot.runActive} class:maxed={level >= upgrade.maxLevel} class:locked={!snapshot.runActive} disabled={!canAfford || level >= upgrade.maxLevel || !snapshot?.runActive} onclick={() => buyBattleUpgrade(upgrade.id)}>
													<div class="upgrade-card-top">
														<span class="upgrade-card-icon">{upgrade.icon}</span>
														<span class="upgrade-card-name">{upgrade.name}</span>
														<span class="upgrade-card-lvl">Lv.{level}</span>
													</div>
													<div class="upgrade-card-bar-wrap">
														<div class="upgrade-card-bar" style="width: {Math.min(100, (level / upgrade.maxLevel) * 100)}%"></div>
													</div>
													<div class="upgrade-card-bottom">
														<span class="upgrade-card-cost">💰{cost}</span>
														{#if level > 0}
															<span class="upgrade-card-effect">{getBattleUpgradeEffectDisplay(upgrade.id)}</span>
														{/if}
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
									<div class="panel-section-title">Workshop</div>
									<div class="upgrade-grid">
										{#each WORKSHOP_UPGRADES as upgrade}
											{@const level = getWorkshopLevel(upgrade.id)}
											{@const cost = upgrade.cost(level)}
											{@const canAfford = coins >= cost}
											<button class="upgrade-card" class:can-afford={canAfford} class:maxed={level >= upgrade.maxLevel} disabled={!canAfford || level >= upgrade.maxLevel} onclick={() => buyWorkshopUpgrade(upgrade.id)}>
												<div class="upgrade-card-top">
													<span class="upgrade-card-icon">{upgrade.icon}</span>
													<span class="upgrade-card-name">{upgrade.name}</span>
													<span class="upgrade-card-lvl">Lv.{level}</span>
												</div>
												<div class="upgrade-card-bar-wrap">
													<div class="upgrade-card-bar" style="width: {Math.min(100, (level / upgrade.maxLevel) * 100)}%"></div>
												</div>
												<div class="upgrade-card-bottom">
													<span class="upgrade-card-cost">🪙{cost}</span>
													{#if level > 0}
														<span class="upgrade-card-effect">+{getWorkshopUpgradeEffect(upgrade.id, level)}</span>
													{/if}
												</div>
											</button>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'lab'}
								<div class="panel-section">
									<div class="panel-section-title">Laboratory</div>
									<div class="upgrade-grid">
										{#each LAB_ITEMS as item}
											{@const level = getLabLevel(item.id)}
											{@const cost = item.cost(level)}
											{@const canAfford = coins >= cost}
											<button class="upgrade-card lab-card" class:can-afford={canAfford} class:maxed={level >= item.maxLevel} disabled={!canAfford || level >= item.maxLevel} onclick={() => buyLabUpgrade(item.id)}>
												<div class="upgrade-card-top">
													<span class="upgrade-card-icon">{item.icon}</span>
													<span class="upgrade-card-name">{item.name}</span>
													<span class="upgrade-card-lvl">Lv.{level}</span>
												</div>
												<div class="upgrade-card-bar-wrap">
													<div class="upgrade-card-bar" style="width: {Math.min(100, (level / item.maxLevel) * 100)}%"></div>
												</div>
												<div class="upgrade-card-bottom">
													<span class="upgrade-card-cost">🪙{cost}</span>
													{#if level > 0}
														<span class="upgrade-card-effect">+{getLabItemEffect(item.id, level)}</span>
													{/if}
												</div>
												<div class="lab-desc">{item.description}</div>
											</button>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'tiers'}
								<div class="panel-section">
									<div class="panel-section-title">Tiers</div>
									<div class="tier-grid">
										{#each TIERS as tier}
											<div class="tier-card" class:unlocked={tier.unlocked}>
												<div class="tier-card-header">
													<span class="tier-card-icon">{tier.unlocked ? '🔓' : '🔒'}</span>
													<div>
														<div class="tier-card-name">{tier.name}</div>
														<div class="tier-card-desc">{tier.description}</div>
													</div>
												</div>
												{#if !tier.unlocked}
													<div class="tier-req">Requires Wave {tier.waveRequirement}</div>
												{:else}
													<div class="tier-req tier-req-unlocked">✓ Unlocked</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{:else if activeTab === 'challenges'}
								<div class="panel-section">
									<div class="panel-section-title">Challenges</div>
									<div class="challenge-grid">
										{#each CHALLENGES as challenge}
											<div class="challenge-card" class:locked={challenge.locked}>
												<div class="challenge-card-header">
													<span class="challenge-card-icon">{challenge.icon}</span>
													<div>
														<div class="challenge-card-name">{challenge.name}</div>
														<div class="challenge-card-desc">{challenge.description}</div>
													</div>
												</div>
												{#if challenge.highScore > 0}
													<div class="challenge-score">Best: Wave {challenge.highScore}</div>
												{:else if challenge.locked}
													<div class="challenge-locked-badge">🔒 Locked</div>
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

	<!-- Mobile Bottom Nav -->
	{#if isMobile}
		<nav class="mobile-nav" role="navigation" aria-label="Main navigation">
			{#each tabs as tab}
				<button class="mobile-nav-btn" class:active={activeTab === tab.id} onclick={() => { activeTab = tab.id; showMobilePanel = true; }}>
					<span class="mobile-nav-icon">{tab.icon}</span>
					<span class="mobile-nav-label">{tab.label}</span>
				</button>
			{/each}
		</nav>

		{#if showMobilePanel}
			<div class="mobile-overlay" onclick={() => showMobilePanel = false} onkeydown={(e) => e.key === 'Escape' && (showMobilePanel = false)} role="presentation"></div>
			<div class="mobile-sheet" role="dialog" aria-modal="true" aria-label={activeTab}>
				<div class="mobile-sheet-handle"></div>
				<div class="mobile-sheet-header">
					<h3>{tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}</h3>
					<button class="mobile-sheet-close" onclick={() => showMobilePanel = false}>✕</button>
				</div>
				<div class="mobile-sheet-body">
					{#if activeTab === 'battle'}
						<div class="panel-section">
							<div class="panel-section-title">Run Info</div>
							{#if snapshot?.runActive}
								<div class="info-grid">
									<div class="info-item"><span class="info-label">Wave</span><span class="info-val">{snapshot.wave}</span></div>
									<div class="info-item"><span class="info-label">HP</span><span class="info-val hp">{Math.ceil(snapshot.towerHp)}<span class="info-max">/{snapshot.towerMaxHp}</span></span></div>
									<div class="info-item"><span class="info-label">Kills</span><span class="info-val">{snapshot.killCount}</span></div>
									<div class="info-item"><span class="info-label">Cash</span><span class="info-val cash">💰{Math.floor(snapshot.cash)}</span></div>
								</div>
							{/if}
						</div>
						<div class="panel-section-divider"></div>
						<div class="panel-section">
							<div class="panel-section-title">Tower Stats</div>
							{#if engine?.state?.runActive}
								<div class="info-grid">
									<div class="info-item"><span class="info-label">Damage</span><span class="info-val">{engine.state.tower.stats.damage.toFixed(1)}</span></div>
									<div class="info-item"><span class="info-label">Fire Rate</span><span class="info-val">{engine.state.tower.stats.fireRate.toFixed(2)}/s</span></div>
									<div class="info-item"><span class="info-label">Range</span><span class="info-val">{engine.state.tower.stats.range.toFixed(0)}</span></div>
									<div class="info-item"><span class="info-label">Multishot</span><span class="info-val">x{engine.state.tower.stats.multishot}</span></div>
									<div class="info-item"><span class="info-label">Crit</span><span class="info-val">{(engine.state.tower.stats.critChance * 100).toFixed(1)}%</span></div>
								</div>
							{/if}
						</div>
						<div class="panel-section-divider"></div>
						<div class="panel-section">
							<div class="panel-section-title">Battle Upgrades</div>
							{#if snapshot?.runActive}
								<div class="upgrade-grid">
									{#each BATTLE_UPGRADES as upgrade}
										{@const level = getBattleUpgradeLevel(upgrade.id)}
										{@const cost = upgrade.cost(level)}
										{@const canAfford = snapshot.cash >= cost}
										<button class="upgrade-card" class:can-afford={canAfford} class:maxed={level >= upgrade.maxLevel} disabled={!canAfford || level >= upgrade.maxLevel || !snapshot?.runActive} onclick={() => buyBattleUpgrade(upgrade.id)}>
											<div class="upgrade-card-top">
												<span class="upgrade-card-icon">{upgrade.icon}</span>
												<span class="upgrade-card-name">{upgrade.name}</span>
												<span class="upgrade-card-lvl">Lv.{level}</span>
											</div>
											<div class="upgrade-card-bar-wrap"><div class="upgrade-card-bar" style="width: {Math.min(100, (level / upgrade.maxLevel) * 100)}%"></div></div>
											<div class="upgrade-card-bottom">
												<span class="upgrade-card-cost">💰{cost}</span>
												{#if level > 0}<span class="upgrade-card-effect">{getBattleUpgradeEffectDisplay(upgrade.id)}</span>{/if}
											</div>
										</button>
									{/each}
								</div>
							{:else}
								<div class="panel-empty">Start a run to buy upgrades.</div>
							{/if}
						</div>
					{:else if activeTab === 'workshop'}
						<div class="panel-section">
							<div class="panel-section-title">Workshop</div>
							<div class="upgrade-grid">
								{#each WORKSHOP_UPGRADES as upgrade}
									{@const level = getWorkshopLevel(upgrade.id)}
									{@const cost = upgrade.cost(level)}
									{@const canAfford = coins >= cost}
									<button class="upgrade-card" class:can-afford={canAfford} class:maxed={level >= upgrade.maxLevel} disabled={!canAfford || level >= upgrade.maxLevel} onclick={() => buyWorkshopUpgrade(upgrade.id)}>
										<div class="upgrade-card-top">
											<span class="upgrade-card-icon">{upgrade.icon}</span>
											<span class="upgrade-card-name">{upgrade.name}</span>
											<span class="upgrade-card-lvl">Lv.{level}</span>
										</div>
										<div class="upgrade-card-bar-wrap"><div class="upgrade-card-bar" style="width: {Math.min(100, (level / upgrade.maxLevel) * 100)}%"></div></div>
										<div class="upgrade-card-bottom">
											<span class="upgrade-card-cost">🪙{cost}</span>
											{#if level > 0}<span class="upgrade-card-effect">+{getWorkshopUpgradeEffect(upgrade.id, level)}</span>{/if}
										</div>
									</button>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'lab'}
						<div class="panel-section">
							<div class="panel-section-title">Laboratory</div>
							<div class="upgrade-grid">
								{#each LAB_ITEMS as item}
									{@const level = getLabLevel(item.id)}
									{@const cost = item.cost(level)}
									{@const canAfford = coins >= cost}
									<button class="upgrade-card lab-card" class:can-afford={canAfford} class:maxed={level >= item.maxLevel} disabled={!canAfford || level >= item.maxLevel} onclick={() => buyLabUpgrade(item.id)}>
										<div class="upgrade-card-top">
											<span class="upgrade-card-icon">{item.icon}</span>
											<span class="upgrade-card-name">{item.name}</span>
											<span class="upgrade-card-lvl">Lv.{level}</span>
										</div>
										<div class="upgrade-card-bar-wrap"><div class="upgrade-card-bar" style="width: {Math.min(100, (level / item.maxLevel) * 100)}%"></div></div>
										<div class="upgrade-card-bottom">
											<span class="upgrade-card-cost">🪙{cost}</span>
											{#if level > 0}<span class="upgrade-card-effect">+{getLabItemEffect(item.id, level)}</span>{/if}
										</div>
										<div class="lab-desc">{item.description}</div>
									</button>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'tiers'}
						<div class="panel-section">
							<div class="panel-section-title">Tiers</div>
							<div class="tier-grid">
								{#each TIERS as tier}
									<div class="tier-card" class:unlocked={tier.unlocked}>
										<div class="tier-card-header">
											<span class="tier-card-icon">{tier.unlocked ? '🔓' : '🔒'}</span>
											<div>
												<div class="tier-card-name">{tier.name}</div>
												<div class="tier-card-desc">{tier.description}</div>
											</div>
										</div>
										{#if !tier.unlocked}
											<div class="tier-req">Requires Wave {tier.waveRequirement}</div>
										{:else}
											<div class="tier-req tier-req-unlocked">✓ Unlocked</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'challenges'}
						<div class="panel-section">
							<div class="panel-section-title">Challenges</div>
							<div class="challenge-grid">
								{#each CHALLENGES as challenge}
									<div class="challenge-card" class:locked={challenge.locked}>
										<div class="challenge-card-header">
											<span class="challenge-card-icon">{challenge.icon}</span>
											<div>
												<div class="challenge-card-name">{challenge.name}</div>
												<div class="challenge-card-desc">{challenge.description}</div>
											</div>
										</div>
										{#if challenge.highScore > 0}
											<div class="challenge-score">Best: Wave {challenge.highScore}</div>
										{:else if challenge.locked}
											<div class="challenge-locked-badge">🔒 Locked</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'stats'}
						<div class="panel-section">
							<div class="panel-section-title">Statistics</div>
							<div class="info-grid">
								<div class="info-item"><span class="info-label">Total Runs</span><span class="info-val">{totalRuns}</span></div>
								<div class="info-item"><span class="info-label">Highest Wave</span><span class="info-val">{highestWave}</span></div>
								<div class="info-item"><span class="info-label">Total Coins</span><span class="info-val">🪙{coins.toLocaleString()}</span></div>
							</div>
							{#if snapshot?.runActive}
								<div class="panel-section-divider"></div>
								<div class="info-grid">
									<div class="info-item"><span class="info-label">Current Kills</span><span class="info-val">{snapshot.killCount}</span></div>
									<div class="info-item"><span class="info-label">Current Wave</span><span class="info-val">{snapshot.wave}</span></div>
									<div class="info-item"><span class="info-label">Run Time</span><span class="info-val">{formatTime(snapshot.elapsedTime)}</span></div>
								</div>
							{/if}
						</div>
					{:else if activeTab === 'settings'}
						<div class="panel-section">
							<div class="panel-section-title">Settings</div>
							<div class="settings-group">
								{#each settings_list as setting}
									<label class="setting-row">
										<div class="setting-info">
											<span class="setting-label">{setting.label}</span>
											<span class="setting-desc">{setting.desc}</span>
										</div>
										<div class="toggle" class:active={settings[setting.key]} role="switch" aria-checked={settings[setting.key]} tabindex="0" onclick={() => updateSetting(setting.key, !settings[setting.key])} onkeydown={(e) => e.key === 'Enter' && updateSetting(setting.key, !settings[setting.key])}>
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
	.play-layout { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; background: var(--bg-primary); }

	/* ===== Top Bar ===== */
	.topbar {
		display: flex; align-items: center; padding: 0.4rem 1rem; gap: 0.6rem;
		background: rgba(7, 8, 18, 0.95); border-bottom: 1px solid var(--border-neon);
		z-index: 100; flex-shrink: 0; position: relative;
	}
	.topbar::after {
		content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px;
		background: linear-gradient(90deg, transparent, var(--cyan-glow), transparent);
	}
	.topbar-back { color: var(--text-dim); font-size: 1.1rem; text-decoration: none; padding: 0.2rem 0.4rem; border-radius: var(--radius-sm); transition: all var(--transition-fast); }
	.topbar-back:hover { color: var(--cyan); background: rgba(0,255,255,0.06); }
	.topbar-brand { font-weight: 700; font-size: 0.9rem; background: linear-gradient(135deg, var(--cyan), var(--blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; white-space: nowrap; }
	.topbar-divider { width: 1px; height: 20px; background: var(--border-neon); flex-shrink: 0; }
	.topbar-stats { display: flex; gap: 0.4rem; align-items: center; margin-left: auto; }
	.stat-pill {
		display: flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.55rem;
		font-size: 0.72rem; font-family: var(--font-mono); border-radius: 100px;
		background: var(--bg-tertiary); border: 1px solid var(--border-neon);
		transition: all var(--transition-fast);
	}
	.stat-wave { color: var(--cyan); }
	.stat-coins { color: var(--yellow); }
	.stat-cash { color: var(--green); }
	.stat-hp { color: var(--red); }
	.stat-pill-icon { flex-shrink: 0; opacity: 0.8; }
	.topbar-actions { display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem; position: relative; }
	.topbar-action-btn {
		padding: 0.35rem; border-radius: var(--radius-sm);
		color: var(--text-dim); transition: all var(--transition-fast); display: flex;
	}
	.topbar-action-btn:hover { color: var(--cyan); background: rgba(0,255,255,0.08); }
	.save-btn-wrap { position: relative; }
	.save-dropdown {
		position: absolute; top: calc(100% + 4px); right: 0; min-width: 170px;
		background: var(--bg-secondary); border: 1px solid var(--border-neon-strong);
		border-radius: var(--radius-md); z-index: 200; overflow: hidden;
		box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: fadeIn 0.15s ease;
	}
	.save-dropdown button {
		display: block; width: 100%; padding: 0.6rem 1rem; font-size: 0.8rem;
		text-align: left; color: var(--text-secondary);
		transition: all var(--transition-fast);
	}
	.save-dropdown button:hover { background: rgba(0,255,255,0.06); color: var(--text-primary); }

	/* ===== Toast ===== */
	.toast {
		position: fixed; top: 3.5rem; left: 50%; transform: translateX(-50%);
		padding: 0.5rem 1.25rem; font-size: 0.82rem; color: var(--cyan);
		background: rgba(0, 255, 255, 0.08); border: 1px solid var(--border-neon-strong);
		border-radius: 100px; z-index: 300; white-space: nowrap;
		box-shadow: 0 0 24px rgba(0, 255, 255, 0.15);
		animation: fadeIn 0.2s ease; backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	/* ===== Game Body ===== */
	.game-body { flex: 1; display: flex; overflow: hidden; position: relative; }

	/* ===== Canvas ===== */
	.game-canvas-container {
		flex: 1; position: relative; overflow: hidden;
		display: flex; align-items: center; justify-content: center;
		background: var(--bg-primary);
	}

	/* ===== Start Overlay ===== */
	.start-overlay {
		position: absolute; inset: 0;
		display: flex; align-items: center; justify-content: center;
		background: radial-gradient(ellipse at center, rgba(7,8,18,0.6) 0%, var(--bg-primary) 100%);
		z-index: 10;
	}
	.start-card {
		position: relative; text-align: center; padding: 2.5rem 3rem;
		background: var(--bg-glass-strong); border: 1px solid var(--border-neon);
		border-radius: var(--radius-xl); backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		max-width: 380px; width: 90%;
		animation: scaleIn 0.35s ease;
		box-shadow: 0 0 60px rgba(0,255,255,0.06);
	}
	.start-card-glow {
		position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
		background: linear-gradient(90deg, transparent, var(--cyan), transparent);
		opacity: 0.6;
	}
	.start-card-icon { font-size: 3rem; display: block; margin-bottom: 0.75rem; filter: drop-shadow(0 0 20px rgba(0,255,255,0.3)); }
	.start-card-title { font-size: 1.5rem; margin-bottom: 0.35rem; color: var(--text-primary); }
	.start-card-subtitle { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1.5rem; }
	.start-card-records { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1.5rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-md); }
	.start-record { font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-dim); display: flex; gap: 0.4rem; align-items: center; }
	.start-btn {
		position: relative; display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.85rem 2.5rem; border-radius: var(--radius-md);
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary); font-weight: 700; font-size: 1.05rem;
		cursor: pointer; overflow: hidden; transition: all var(--transition-normal);
		box-shadow: 0 0 30px rgba(0,255,255,0.2);
	}
	.start-btn:hover { transform: translateY(-2px); box-shadow: 0 0 50px rgba(0,255,255,0.35); }
	.start-btn-glow {
		position: absolute; inset: 0;
		background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent);
		transition: opacity var(--transition-normal); opacity: 0;
	}
	.start-btn:hover .start-btn-glow { opacity: 1; }
	.start-btn-content { position: relative; z-index: 1; display: flex; align-items: center; gap: 0.5rem; }
	.start-card-hint { margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-dim); }
	.start-card-hint kbd { padding: 0.1rem 0.4rem; background: var(--bg-tertiary); border-radius: 3px; font-family: var(--font-mono); font-size: 0.65rem; border: 1px solid var(--border-neon); }

	/* ===== Side Panels ===== */
	.side-panel {
		display: flex; flex-direction: column;
		background: var(--bg-glass); border-left: 1px solid var(--border-neon);
		backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
		position: relative; transition: width var(--transition-normal);
		width: 270px; flex-shrink: 0; overflow: hidden; z-index: 5;
	}
	.side-panel.collapsed { width: 28px; }
	.left-panel { border-left: none; border-right: 1px solid var(--border-neon); }
	.panel-toggle {
		position: absolute; top: 0.4rem; z-index: 5;
		background: var(--bg-tertiary); border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm); color: var(--text-dim);
		font-size: 0.65rem; padding: 0.2rem 0.3rem; cursor: pointer;
		transition: all var(--transition-fast);
	}
	.left-panel .panel-toggle { right: 0.25rem; }
	.right-panel .panel-toggle { left: 0.25rem; }
	.panel-toggle:hover { background: rgba(0,255,255,0.12); color: var(--cyan); }
	.panel-content { padding: 0.65rem; overflow-y: auto; flex: 1; height: 100%; display: flex; flex-direction: column; gap: 0.25rem; }

	/* ===== Panel Sections ===== */
	.panel-section { margin-bottom: 0.5rem; }
	.panel-section-title {
		display: flex; align-items: center; gap: 0.35rem;
		font-size: 0.7rem; color: var(--cyan); font-family: var(--font-mono);
		text-transform: uppercase; letter-spacing: 0.08em;
		margin-bottom: 0.5rem; padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--border-neon);
	}
	.panel-section-title svg { flex-shrink: 0; opacity: 0.8; }
	.panel-section-divider { height: 1px; background: linear-gradient(90deg, var(--border-neon), transparent); margin: 0.25rem 0 0.5rem; }
	.panel-empty { color: var(--text-dim); font-size: 0.72rem; font-style: italic; padding: 0.5rem 0; }

	/* ===== Info Grid ===== */
	.info-grid { display: grid; gap: 2px; }
	.info-item { display: flex; justify-content: space-between; padding: 0.2rem 0.35rem; font-size: 0.72rem; border-radius: 3px; }
	.info-item:nth-child(odd) { background: rgba(0,0,0,0.15); }
	.info-label { color: var(--text-dim); }
	.info-val { color: var(--text-secondary); font-family: var(--font-mono); font-weight: 500; }
	.info-val.hp { color: var(--green); }
	.info-val.cash { color: var(--green); }
	.info-max { color: var(--text-dim); font-size: 0.65rem; }

	/* ===== Panel Tabs ===== */
	.panel-tabs {
		display: flex; gap: 2px; margin-bottom: 0.5rem;
		padding: 2px; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);
		flex-wrap: wrap;
	}
	.panel-tab {
		flex: 1; min-width: 0; padding: 0.3rem 0.25rem;
		font-size: 0.6rem; color: var(--text-dim); border-radius: 4px;
		transition: all var(--transition-fast); text-align: center;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.panel-tab.active { color: var(--cyan); background: rgba(0,255,255,0.08); }
	.panel-tab:hover:not(.active) { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
	.panel-tab-label { margin-left: 2px; }
	.panel-tab-content { flex: 1; overflow-y: auto; }

	/* ===== Upgrade Cards ===== */
	.upgrade-grid { display: flex; flex-direction: column; gap: 3px; }
	.upgrade-card {
		display: flex; flex-direction: column; gap: 0.2rem;
		padding: 0.4rem 0.5rem; background: var(--bg-tertiary);
		border: 1px solid var(--border-neon); border-radius: var(--radius-sm);
		cursor: pointer; transition: all var(--transition-fast);
		text-align: left; width: 100%;
	}
	.upgrade-card.can-afford { border-color: rgba(68, 255, 136, 0.3); }
	.upgrade-card.can-afford:hover { border-color: var(--cyan); background: rgba(0,255,255,0.06); }
	.upgrade-card.maxed { opacity: 0.4; cursor: default; }
	.upgrade-card.locked { opacity: 0.5; cursor: default; }
	.upgrade-card:disabled:not(.maxed):not(.locked) { opacity: 0.55; cursor: default; }
	.upgrade-card-top { display: flex; align-items: center; gap: 0.3rem; }
	.upgrade-card-icon { font-size: 0.8rem; flex-shrink: 0; }
	.upgrade-card-name { flex: 1; font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); }
	.upgrade-card-lvl { font-size: 0.62rem; font-family: var(--font-mono); color: var(--text-dim); }
	.upgrade-card-bar-wrap { height: 3px; background: rgba(0,0,0,0.3); border-radius: 2px; overflow: hidden; }
	.upgrade-card-bar { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--blue)); border-radius: 2px; transition: width var(--transition-normal); }
	.upgrade-card.can-afford .upgrade-card-bar { background: linear-gradient(90deg, var(--green), var(--cyan)); }
	.upgrade-card-bottom { display: flex; align-items: center; gap: 0.3rem; font-size: 0.62rem; }
	.upgrade-card-cost { font-family: var(--font-mono); color: var(--yellow); }
	.upgrade-card-effect { margin-left: auto; color: var(--green); font-family: var(--font-mono); }
	.lab-card { gap: 0.3rem; }
	.lab-desc { font-size: 0.6rem; color: var(--text-dim); line-height: 1.3; padding: 0.1rem 0; }

	/* ===== Tier Cards ===== */
	.tier-grid { display: flex; flex-direction: column; gap: 0.4rem; }
	.tier-card {
		padding: 0.6rem; background: var(--bg-tertiary); border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm); transition: all var(--transition-fast);
	}
	.tier-card.unlocked { border-color: rgba(68, 255, 136, 0.2); }
	.tier-card-header { display: flex; gap: 0.5rem; align-items: flex-start; }
	.tier-card-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
	.tier-card-name { font-size: 0.78rem; color: var(--text-secondary); font-weight: 500; margin-bottom: 0.15rem; }
	.tier-card-desc { font-size: 0.65rem; color: var(--text-dim); line-height: 1.4; }
	.tier-req { font-size: 0.62rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.3rem; padding: 0.2rem 0.4rem; background: rgba(0,0,0,0.2); border-radius: 3px; display: inline-block; }
	.tier-req-unlocked { color: var(--green); }

	/* ===== Challenge Cards ===== */
	.challenge-grid { display: flex; flex-direction: column; gap: 0.4rem; }
	.challenge-card {
		padding: 0.6rem; background: var(--bg-tertiary); border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm); transition: all var(--transition-fast);
	}
	.challenge-card.locked { opacity: 0.5; }
	.challenge-card-header { display: flex; gap: 0.5rem; align-items: flex-start; }
	.challenge-card-icon { font-size: 1.2rem; flex-shrink: 0; }
	.challenge-card-name { font-size: 0.78rem; color: var(--text-secondary); font-weight: 500; margin-bottom: 0.15rem; }
	.challenge-card-desc { font-size: 0.65rem; color: var(--text-dim); line-height: 1.4; }
	.challenge-score { font-size: 0.62rem; color: var(--green); font-family: var(--font-mono); margin-top: 0.35rem; }
	.challenge-locked-badge { font-size: 0.62rem; color: var(--text-dim); margin-top: 0.35rem; }

	/* ===== Settings ===== */
	.settings-group { display: flex; flex-direction: column; gap: 2px; }
	.setting-row {
		display: flex; justify-content: space-between; align-items: center;
		padding: 0.5rem 0.4rem; border-radius: var(--radius-sm);
		cursor: pointer; transition: background var(--transition-fast);
	}
	.setting-row:hover { background: rgba(255,255,255,0.03); }
	.setting-info { display: flex; flex-direction: column; gap: 0.1rem; }
	.setting-label { font-size: 0.75rem; color: var(--text-secondary); }
	.setting-desc { font-size: 0.62rem; color: var(--text-dim); }
	.toggle {
		width: 38px; height: 22px; border-radius: 11px;
		background: var(--bg-tertiary); border: 1px solid var(--border-neon);
		position: relative; transition: all var(--transition-fast); flex-shrink: 0;
		cursor: pointer;
	}
	.toggle.active { background: rgba(0, 255, 255, 0.15); border-color: var(--cyan); }
	.toggle-knob {
		position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
		border-radius: 50%; background: var(--text-dim);
		transition: all var(--transition-fast);
	}
	.toggle.active .toggle-knob { left: 18px; background: var(--cyan); box-shadow: 0 0 6px rgba(0,255,255,0.4); }

	/* ===== Overlays / Dialogs ===== */
	.overlay {
		position: fixed; inset: 0;
		background: rgba(7, 8, 18, 0.85);
		display: flex; align-items: center; justify-content: center;
		z-index: 200; padding: 1rem;
		backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease;
	}

	/* ===== Game Over ===== */
	.gameover-panel {
		position: relative; text-align: center; padding: 2.5rem 2rem 2rem;
		background: var(--bg-secondary); border: 1px solid rgba(255, 68, 170, 0.3);
		border-radius: var(--radius-xl); max-width: 360px; width: 100%;
		overflow: hidden; animation: scaleIn 0.3s ease;
		box-shadow: 0 0 60px rgba(255, 68, 170, 0.08);
	}
	.gameover-glow {
		position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
		background: radial-gradient(circle at center, rgba(255,68,170,0.04) 0%, transparent 60%);
		pointer-events: none;
	}
	.gameover-icon { font-size: 3rem; margin-bottom: 0.5rem; display: block; }
	.gameover-title { font-size: 1.8rem; color: var(--pink); margin-bottom: 0.25rem; }
	.gameover-wave-text { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 1.5rem; font-family: var(--font-mono); }
	.gameover-stats {
		display: flex; align-items: center; justify-content: center;
		gap: 1.5rem; margin-bottom: 1.5rem;
		padding: 1rem; background: rgba(0,0,0,0.2); border-radius: var(--radius-md);
	}
	.gameover-stat { text-align: center; }
	.gameover-stat-icon { font-size: 1.2rem; display: block; margin-bottom: 0.25rem; }
	.gameover-stat-value { font-size: 1.3rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }
	.gameover-stat-label { font-size: 0.65rem; color: var(--text-dim); margin-top: 0.1rem; }
	.gameover-stat-divider { width: 1px; height: 40px; background: var(--border-neon); }
	.gameover-btn {
		display: block; width: 100%; padding: 0.8rem;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary); font-weight: 700; font-size: 1rem;
		border-radius: var(--radius-md); cursor: pointer;
		transition: all var(--transition-normal);
		box-shadow: 0 0 20px rgba(0,255,255,0.15);
	}
	.gameover-btn:hover { box-shadow: 0 0 30px rgba(0,255,255,0.3); transform: translateY(-1px); }
	.gameover-close {
		display: block; width: 100%; margin-top: 0.5rem; padding: 0.5rem;
		color: var(--text-dim); font-size: 0.8rem; cursor: pointer;
		transition: color var(--transition-fast);
	}
	.gameover-close:hover { color: var(--text-secondary); }

	/* ===== Dialog Panels ===== */
	.dialog-panel {
		background: var(--bg-secondary); border: 1px solid var(--border-neon-strong);
		border-radius: var(--radius-xl); padding: 2rem; max-width: 400px; width: 100%;
		animation: scaleIn 0.25s ease;
	}
	.dialog-panel h3 { font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-primary); }
	.dialog-desc { color: var(--text-dim); font-size: 0.82rem; margin-bottom: 1rem; line-height: 1.5; }
	.dialog-panel textarea {
		width: 100%; margin-bottom: 1rem; background: var(--bg-primary);
		color: var(--text-primary); border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm); padding: 0.6rem;
		font-family: var(--font-mono); font-size: 0.72rem; resize: vertical;
	}
	.dialog-panel textarea:focus { border-color: var(--cyan); }
	.dialog-actions { display: flex; gap: 0.5rem; justify-content: center; }
	.btn-dialog-primary, .btn-dialog-secondary, .btn-dialog-danger {
		padding: 0.6rem 1.25rem; border-radius: var(--radius-sm);
		font-weight: 600; font-size: 0.85rem; cursor: pointer;
		transition: all var(--transition-fast);
	}
	.btn-dialog-primary { background: var(--cyan); color: var(--bg-primary); }
	.btn-dialog-primary:hover { box-shadow: 0 0 16px rgba(0,255,255,0.3); }
	.btn-dialog-secondary { background: transparent; border: 1px solid var(--border-neon); color: var(--text-secondary); }
	.btn-dialog-secondary:hover { border-color: var(--text-dim); color: var(--text-primary); }
	.btn-dialog-danger { background: var(--red); color: white; }
	.btn-dialog-danger:hover { box-shadow: 0 0 16px rgba(255,68,68,0.3); }
	.dialog-danger { border-color: rgba(255, 68, 68, 0.3); }

	/* ===== Mobile Nav ===== */
	.mobile-nav {
		display: flex; overflow-x: auto;
		background: rgba(7, 8, 18, 0.95); border-top: 1px solid var(--border-neon);
		flex-shrink: 0; z-index: 100;
	}
	.mobile-nav-btn {
		flex: 1; min-width: 0; display: flex; flex-direction: column;
		align-items: center; padding: 0.35rem 0.1rem;
		font-size: 0.55rem; color: var(--text-dim);
		transition: all var(--transition-fast); gap: 1px;
	}
	.mobile-nav-btn.active { color: var(--cyan); }
	.mobile-nav-btn.active::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: var(--cyan); border-radius: 0 0 2px 2px; }
	.mobile-nav-btn { position: relative; }
	.mobile-nav-icon { font-size: 1.1rem; }
	.mobile-nav-label { font-size: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

	/* ===== Mobile Sheet ===== */
	.mobile-overlay {
		position: fixed; inset: 0; background: rgba(0,0,0,0.5);
		z-index: 150; animation: fadeIn 0.15s ease;
	}
	.mobile-sheet {
		position: fixed; bottom: 0; left: 0; right: 0; max-height: 78vh;
		background: var(--bg-secondary); border-top: 1px solid var(--border-neon);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		z-index: 160; display: flex; flex-direction: column;
		animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.mobile-sheet-handle {
		width: 36px; height: 4px; background: var(--text-dim);
		border-radius: 2px; margin: 0.55rem auto 0.35rem;
	}
	.mobile-sheet-header {
		display: flex; justify-content: space-between; align-items: center;
		padding: 0.25rem 1rem 0.5rem;
	}
	.mobile-sheet-header h3 { color: var(--cyan); font-size: 0.95rem; }
	.mobile-sheet-close { font-size: 1.1rem; color: var(--text-dim); padding: 0.25rem; }
	.mobile-sheet-body { padding: 0 1rem 1.5rem; overflow-y: auto; }

	/* ===== Responsive ===== */
	@media (min-width: 768px) {
		.mobile-nav, .mobile-overlay, .mobile-sheet { display: none; }
	}
	@media (max-width: 767px) {
		.topbar { padding: 0.35rem 0.6rem; gap: 0.4rem; }
		.topbar-brand { font-size: 0.8rem; }
		.topbar-divider { display: none; }
	}
</style>
