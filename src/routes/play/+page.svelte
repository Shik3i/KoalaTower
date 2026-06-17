<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
	import Tutorial from '$lib/components/Tutorial.svelte';
	import TowerStatsPanel from '$lib/components/TowerStatsPanel.svelte';
	import EnemyStatsPanel from '$lib/components/EnemyStatsPanel.svelte';
	import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
	import { UpgradeId, type GameSnapshot, type GameSettings } from '$lib/game/engine/gameTypes';
	import { buildBattleUpgradeList, getBattleUpgradeEffect } from '$lib/game/balance/battleUpgrades';
	import { formatBattleEffect } from '$lib/game/balance/upgradeScaling';
	const BATTLE_UPGRADES = buildBattleUpgradeList();
	import { isFieldUpgradeUnlocked, getBlueprintForFieldUpgrade } from '$lib/game/balance/blueprints';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';
	import { engineStore } from '$lib/stores/gameStore';

	let container = $state<HTMLDivElement>();
	let gameView = $state<PixiGameView | null>(null);
	let engine = $state<GameEngine | null>(null);

	let isMobile = $state(false);
	let leftPanelOpen = $state(false);
	let rightPanelOpen = $state(true);
	let showLaunchScreen = $state(true);
	let showGameOver = $state(false);
	let gameOverCoins = $state(0);
	let gameOverWave = $state(0);
	let gameOverKills = $state(0);
	let gameOverBosses = $state(0);
	let gameOverCash = $state(0);
	let prevWave = $state(0);
	let prevBossCount = $state(0);
	let bossToastCooldown = $state(0);
	let upgradeCategory = $state<'offense' | 'defense' | 'utility'>('offense');
	let purchasedUpgrade = $state<string | null>(null);
	let showMobileUpgrades = $state(false);

	let snap = $state<GameSnapshot>(null!);
	let coins = $state(0);
	let settings = $state<GameSettings>({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let speed = $state(1);
	let paused = $state(false);

	let showSaveMenu = $state(false);
	let showSaveIndicator = $state(false);
	let showSettings = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let goBtn = $state<HTMLButtonElement>();

	$effect(() => {
		if (showGameOver) {
			requestAnimationFrame(() => goBtn?.focus());
		}
	});

	let toasts: { id: number; msg: string; type: string }[] = $state([]);
	let nextToast = 0;
	function toast(msg: string, type: string = 'info') {
		const id = ++nextToast;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 2200);
	}

	onMount(() => {
		const cm = () => { isMobile = window.innerWidth < 900; };
		cm(); window.addEventListener('resize', cm);
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; syncSettingsToEngine(s); });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		window.addEventListener('keydown', onKey);

		// Restore engine if it exists in the store (from previous visit)
		const unsubEngine = engineStore.subscribe(e => {
			if (e && !engine) {
				engine = e;
				if (container && !gameView) {
					gameView = new PixiGameView(container, e);
					engine.wireMuzzleFlash(() => gameView?.triggerMuzzleFlash());
					gameView.start();
				}
				refreshSnap();
				syncSettingsToEngine(settings);
				// Rewire callbacks for the new component instance
				wireEngineCallbacks();
				// If a run is active, hide the launch screen
				if (engine.state.runActive) {
					showLaunchScreen = false;
				}
				// If game over, show the game over panel
				if (engine.state.gameOver) {
					showGameOver = true;
				}
			}
		});

		return () => {
			window.removeEventListener('resize', cm);
			window.removeEventListener('keydown', onKey);
			u1(); u2(); u3(); u4(); unsubEngine();
		};
	});

	onDestroy(() => {
		if (engine) {
			engine.state.paused = true;
			engine.setCallbacks({});
			engineStore.set(engine);
		}
		gameView?.stop();
		gameView?.destroy();
		gameView = null;
	});

	function onKey(e: KeyboardEvent) {
		if (!engine) return;
		if (e.key === ' ') { e.preventDefault(); handleSpeed(0); }
		if (e.key === '1') handleSpeed(1);
		if (e.key === '2') handleSpeed(2);
		if (e.key === '3') handleSpeed(3);
		if (e.key === '4') handleSpeed(4);
	}

	function refreshSnap() {
		if (!engine) return;
		const st = engine.state;
		const t = st.tower;
		const w = st.wave;
		snap = {
			wave: w.currentWave, towerHp: t.hp, towerMaxHp: t.maxHp,
			cash: st.cash, coins: st.coins, killCount: st.killCount,
			elapsedTime: st.elapsedTime, gameOver: st.gameOver, runActive: st.runActive,
			highestWave: st.highestWave, enemyCount: st.enemies.length, speed: engine.speedMultiplier,
			towerDamage: t.stats.damage, towerFireRate: t.stats.fireRate, towerRange: t.stats.range,
			towerMultishotChance: t.stats.multishotChance, towerMultishotCount: t.stats.multishotCount, towerCritChance: t.stats.critChance, towerCritMultiplier: t.stats.critMultiplier,
			towerDefensePercent: t.stats.defensePercent, towerDefenseAbsolute: t.stats.defenseAbsolute, towerRegen: t.stats.regen, towerLifesteal: t.stats.lifesteal, towerThorns: t.stats.thorns,
			upgradeLevels: { ...st.battleUpgrades as Record<string, number> },
			enemiesInWave: w.enemiesInWave, enemiesSpawned: w.enemiesSpawned,
			enemiesKilledThisWave: w.enemiesKilled, waveActive: w.waveActive,
			betweenWaveTimer: w.betweenWaveTimer, spawnInterval: w.spawnInterval,
		};
		speed = engine.speedMultiplier;
		paused = engine.isPaused();
	}

	function syncSettingsToEngine(s: GameSettings): void {
		if (!engine) return;
		const stateSettings = engine.state.settings;
		stateSettings.reducedMotion = s.reducedMotion;
		stateSettings.screenShake = s.screenShake;
		stateSettings.particles = s.particles;
		stateSettings.damageNumbers = s.damageNumbers;
		stateSettings.lowEffectsMode = s.lowEffectsMode;
	}

	function wireEngineCallbacks(): void {
		if (!engine) return;
		engine.setCallbacks({
			onSnapshot: () => {
				const st = engine?.state;
				if (st) {
					// Boss wave start detection
					if (st.wave.currentWave > 0 && st.wave.currentWave % 10 === 0 && st.wave.currentWave !== prevWave && st.runActive) {
						const flavor = getOpLogMessage('bossIncoming');
						if (flavor) toast('👾 ' + flavor, 'info');
					}
					// Boss defeated detection
					if (st.bossesDefeated > prevBossCount && prevBossCount > 0) {
						const flavor = getOpLogMessage('bossDefeated');
						if (flavor) toast('💥 ' + flavor, 'success');
					}
					prevWave = st.wave.currentWave;
					prevBossCount = st.bossesDefeated;
				}
				refreshSnap();
			},
			onStateChange: () => { refreshSnap(); },
			onGameOver: (geoCoins: number, _w: number) => {
				refreshSnap();
				gameOverCoins = geoCoins;
				gameOverWave = _w;
				gameOverKills = engine?.state.killCount ?? 0;
				gameOverBosses = engine?.state.bossesDefeated ?? 0;
				gameOverCash = engine?.state.cash ?? 0;
				showGameOver = true;
				const save = getCachedSave();
				if (save && engine) {
					const isNewBest = engine.state.highestWave > save.highestWave;
					save.totalCoins = engine.state.coins;
					save.totalRuns = engine.state.totalRuns;
					save.highestWave = Math.max(save.highestWave, engine.state.highestWave);
					coinsStore.set(save.totalCoins);
					highestWaveStore.set(save.highestWave);
					totalRunsStore.set(save.totalRuns);
					persistSave(save);
					showSaveIndicator = true;
					setTimeout(() => { showSaveIndicator = false; }, 1500);
					if (isNewBest) {
						const flavor = getOpLogMessage('newBestWave', { wave: save.highestWave });
						if (flavor) toast('🏆 ' + flavor, 'milestone');
					}
				}
				toast('💀 ' + getOpLogMessage('coreLost') + ' (Wave ' + _w + ')', 'warning');
			},
			onMilestone: (text: string) => {
				const wave = engine?.state.wave.currentWave ?? 0;
				const flavor = getOpLogMessage('waveMilestone', { wave });
				toast('🏆 ' + (flavor || text), 'milestone');
			},
		});
	}

	function initEngine() {
		if (engine) engine.cleanup();
		if (gameView) { gameView.destroy(); gameView = null; }
		engine = new GameEngine();
		engineStore.set(engine);
		wireEngineCallbacks();
		if (!container) return;
		gameView = new PixiGameView(container, engine);
		engine.wireMuzzleFlash(() => gameView?.triggerMuzzleFlash());
		gameView.start();
	}

	function startRun() {
		if (!engine) initEngine();
		if (!engine) return;
		showLaunchScreen = false;
		showGameOver = false;
		showMobileUpgrades = false;
		speed = 1; paused = false;
		const save = getCachedSave();
		const unlockedBPs = (save?.unlockedBlueprints ?? []) as import('$lib/game/engine/gameTypes').BlueprintId[];
		engine.startRun(save?.workshopUpgrades ?? {}, save?.labLevels ?? {}, coins, unlockedBPs);
		syncSettingsToEngine(save?.settings ?? { reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
		gameView?.start();
		refreshSnap();
		toast('▶ ' + getOpLogMessage('deploymentStart'), 'success');
	}

	function handleSpeed(preset: number) {
		if (!engine) return;
		if (preset === 0) { engine.togglePause(); toast(engine.isPaused() ? '⏸ Paused' : '▶ Resumed', 'info'); }
		else { const spds = GAME_CONFIG.SPEED_PRESETS; engine.setSpeed(spds[preset - 1] ?? 1); toast('⏩ ' + (spds[preset - 1] ?? 1) + '×', 'info'); }
		refreshSnap();
	}

	/** Show what the upgrade currently gives in readable form */
	function upgradeCurrentValue(id: UpgradeId, lv: number): string {
		if (lv === 0) return '—';
		return formatBattleEffect(id, getBattleUpgradeEffect(id, lv));
	}

	/** Show what the next level gives */
	function upgradeNextValue(id: UpgradeId, lv: number): string {
		const nextLv = Math.min(lv + 1, 999);
		return upgradeCurrentValue(id, nextLv);
	}

	function buyBattleUpgrade(id: UpgradeId) {
		if (!engine) return;
		const lv = engine.state.battleUpgrades[id] ?? 0;
		if (engine.buyBattleUpgrade(id)) {
			refreshSnap();
			purchasedUpgrade = id;
			setTimeout(() => { purchasedUpgrade = null; }, 400);
			toast('⬆ ' + (BATTLE_UPGRADES.find(u => u.id === id)?.name ?? '') + ' Lv.' + (lv + 1), 'success');
		}
		else { toast(lv >= 50 ? '⚠ Max level!' : '⚡ Not enough Energy!', lv >= 50 ? 'warning' : 'error'); }
	}
	function bLv(id: UpgradeId): number { return snap?.upgradeLevels[id] ?? 0; }

	/** Check if a field upgrade is blueprint-locked */
	function isUpgradeLocked(id: UpgradeId): boolean {
		const save = getCachedSave();
		const unlockedBPs = (save?.unlockedBlueprints ?? []) as import('$lib/game/engine/gameTypes').BlueprintId[];
		return !isFieldUpgradeUnlocked(id, unlockedBPs);
	}

	/** Get the blueprint name that locks this upgrade */
	function getLockBlueprintName(id: UpgradeId): string {
		const bp = getBlueprintForFieldUpgrade(id);
		return bp ? bp.name : 'Unknown';
	}

	function handleResetSave() {
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
			toast(getOpLogMessage('saveReset'), 'warning');
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

	function fmt(t: number): string {
		const m = Math.floor(t / 60);
		const s = Math.floor(t % 60);
		return m + ':' + (s < 10 ? '0' : '') + s;
	}
</script>

<svelte:head>
	<title>Deployment — Flatland TD · FLTD</title>
	<meta name="description" content="Deploy a tower into Flatland. Harvest energy for field upgrades, refine alloy for permanent upgrades." />
</svelte:head>

<div class="play-layout" role="main">
	{#if toasts.length}
		<div class="toast-c" aria-live="polite" role="alert">{#each toasts as t}<div class="toast toast-{t.type}">{t.msg}</div>{/each}</div>
	{/if}

	<!-- Top Bar -->
	<header class="topbar">
		<a href="/" class="tb-back" aria-label="Home">←</a>
		<div class="tb-brand">Flatland TD</div>
		<div class="tb-div"></div>
		<div class="tb-stats">
			{#if snap?.runActive}
				<div class="tb-pill wave-pill" title="Current wave number"><span>🌊</span><span>{snap.wave}</span></div>
			{/if}
			<div class="tb-pill coin-pill" title="Alloy — permanent material, spent in Forge & Research"><span>🔩</span><span>{coins.toLocaleString()}</span></div>
			{#if snap?.runActive}
				<div class="tb-pill cash-pill" title="Energy — harvested from destroyed enemies, spent on Field Upgrades"><span>⚡</span><span>{Math.floor(snap.cash).toLocaleString()}</span></div>
				<div class="tb-pill hp-pill" class:low={snap.towerHp / snap.towerMaxHp < 0.3} title="Tower HP — run ends when this reaches 0"><span>❤️</span><span>{Math.ceil(snap.towerHp)}</span><span class="tb-max">/{snap.towerMaxHp}</span></div>
				<div class="tb-pill kill-pill" title="Total enemies killed this run"><span>☠</span><span>{snap.killCount}</span></div>
			{/if}
		</div>
		<div class="tb-actions">
			{#if snap?.runActive}
				<div class="spd-grp" title="Game speed — also: keys 1-4, Space to pause">
					<button class="spd-btn" class:on={paused} onclick={() => handleSpeed(0)} title="Pause (Space)">⏸</button>
					{#each [1,2,3] as s}<button class="spd-btn spd-n" class:on={!paused && speed === s} onclick={() => handleSpeed(s)} title="{s}× speed ({s})">{s}×</button>{/each}
					<button class="spd-btn spd-n" class:on={!paused && speed === 5} onclick={() => handleSpeed(4)} title="5× speed (4)">5×</button>
					<div class="spd-status" class:paused={paused}>{paused ? '⏸' : speed + '×'}</div>
				</div>
			{/if}
			<div class="save-indicator" class:saving={showSaveIndicator} title="Auto-save indicator"></div>
			<div class="sv-wrap">
				<button class="ibtn" onclick={() => showSaveMenu = !showSaveMenu} aria-label="Save menu" title="Export / Import / Reset save data">💾</button>
				{#if showSaveMenu}
					<div class="sv-drop">
						<button onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast(getOpLogMessage('saveExported'), 'success'); showSaveMenu = false; }}>📋 Export</button>
						<button onclick={() => { showImportDialog = true; showSaveMenu = false; }}>📂 Import</button>
						<button onclick={() => { showResetConfirm = true; showSaveMenu = false; }}>🗑 Reset</button>
						<button onclick={() => { showSaveMenu = false; }}>✕ Close</button>
					</div>
				{/if}
			</div>
			<div class="sv-wrap">
				<button class="ibtn" onclick={() => showSettings = !showSettings} aria-label="Settings" title="Visual & performance settings">⚙</button>
				{#if showSettings}
					<div class="sv-drop settings-drop">
						<label class="set-row" title="Minimize animations">
							<span>Reduced Motion</span>
							<input type="checkbox" checked={settings.reducedMotion} onchange={(e) => updateSetting('reducedMotion', (e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Shake on damage">
							<span>Screen Shake</span>
							<input type="checkbox" checked={settings.screenShake} onchange={(e) => updateSetting('screenShake', (e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Death & hit effects">
							<span>Particles</span>
							<input type="checkbox" checked={settings.particles} onchange={(e) => updateSetting('particles', (e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Show floating numbers">
							<span>Damage Numbers</span>
							<input type="checkbox" checked={settings.damageNumbers} onchange={(e) => updateSetting('damageNumbers', (e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Reduce visual effects">
							<span>Low Effects</span>
							<input type="checkbox" checked={settings.lowEffectsMode} onchange={(e) => updateSetting('lowEffectsMode', (e.target as HTMLInputElement).checked)} />
						</label>
					</div>
				{/if}
			</div>
			<a href="/hub" class="hub-link" aria-label="Workshop" title="Workshop — permanent upgrades, lab, tiers">🏪</a>
		</div>
	</header>

	<!-- ===== Tutorial ===== -->
	<Tutorial />

	<!-- Mobile Speed Bar -->
	{#if isMobile && snap?.runActive}
		<div class="mob-spd">
			<button class="spd-btn" class:on={paused} onclick={() => handleSpeed(0)}>⏸</button>
			{#each [1,2,3] as s}<button class="spd-btn spd-n" class:on={!paused && speed === s} onclick={() => handleSpeed(s)}>{s}×</button>{/each}
			<button class="spd-btn spd-n" class:on={!paused && speed === 5} onclick={() => handleSpeed(4)}>5×</button>
			<span class="mob-spd-lbl">{paused ? '⏸' : speed + '×'}</span>
		</div>
	{/if}

	<!-- Game Over -->
	{#if showGameOver}
		<div class="overlay" role="dialog" aria-modal="true">
			<div class="go-panel" class:go-record={gameOverWave >= highestWave && highestWave > 0}>
				<div class="go-glow"></div>
				<div class="go-glow-ring"></div>
				<div class="go-icon">{gameOverWave >= highestWave && highestWave > 0 ? '🏆' : '💀'}</div>
				<h2 class="go-title">{gameOverWave >= highestWave && highestWave > 0 ? 'New Record!' : 'Tower Lost'}</h2>
				<div class="go-wave">Reached <strong>Wave {gameOverWave}</strong></div>
				{#if highestWave > 0 && gameOverWave < highestWave}
					<div class="go-wave-sub">Best: Wave {highestWave} ({(gameOverWave / highestWave * 100).toFixed(0)}%)</div>
				{/if}
				<div class="go-stats">
					<div class="go-s"><span class="go-si">🔩</span><span class="go-sv">+{gameOverCoins.toLocaleString()}</span><span class="go-sl">Alloy</span></div>
					<div class="go-sd"></div>
					<div class="go-s"><span class="go-si">☠</span><span class="go-sv">{gameOverKills.toLocaleString()}</span><span class="go-sl">Kills</span></div>
					<div class="go-sd"></div>
					<div class="go-s"><span class="go-si">👑</span><span class="go-sv">{gameOverBosses}</span><span class="go-sl">Bosses</span></div>
				</div>
				<div class="go-stats-sub">
					<span>⚡ {Math.floor(gameOverCash).toLocaleString()} Energy harvested</span>
					<span>🏆 Best: Wave {highestWave}</span>
				</div>
				<button class="go-btn" bind:this={goBtn} onclick={startRun}>▶ Launch Deployment</button>
				<div class="go-row2">
					<a href="/hub" class="go-btn2">🛰️ Orbital Command</a>
					<button class="go-btn2" onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast(getOpLogMessage('saveExported'), 'success'); }}>💾 Export</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="dialog"><div class="dlg"><h3>📂 Import Save</h3><p class="dlg-d">Paste your save JSON below.</p><textarea bind:value={importText} rows={5}></textarea><div class="dlg-a"><button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); importText = ''; } else { toast(getOpLogMessage('saveImportFailed'), 'error'); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button><button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button></div></div></div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="dialog"><div class="dlg dlg-dng"><h3>🗑 Reset Save?</h3><p class="dlg-d">This will erase all Alloy, Forge upgrades, Blueprints, Research Deck progress, Front progress, and settings. Cannot be undone.</p><div class="dlg-a"><button class="dlg-dng-btn" onclick={handleResetSave}>Reset</button><button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button></div></div></div>
	{/if}

	<div class="game-body">
		<!-- Left Panel -->
		{#if !isMobile}
			<aside class="panel left" class:coll={!leftPanelOpen}>
				<button class="ptog" onclick={() => leftPanelOpen = !leftPanelOpen}>{leftPanelOpen ? '◀' : '▶'}</button>
				{#if leftPanelOpen}
					<div class="pc">
						<div class="ps"><div class="pst">📊 Run Info</div>
							{#if snap?.runActive}
								<div class="ig">
									<div class="ir" title="Current wave number"><span class="il">Wave</span><span class="iv">{snap.wave}</span></div>
									<div class="ir" title="Tower HP — game over at 0"><span class="il">HP</span><span class="iv hp-iv">{Math.ceil(snap.towerHp)}<span class="im">/{snap.towerMaxHp}</span></span></div>
									<div class="ir" title="Total kills this run"><span class="il">Kills</span><span class="iv">{snap.killCount}</span></div>
									<div class="ir" title="Elapsed run time"><span class="il">Time</span><span class="iv">{fmt(snap.elapsedTime)}</span></div>
									<div class="ir" title="Game speed multiplier"><span class="il">Speed</span><span class="iv">{paused ? '⏸' : speed + '×'}</span></div>
									<div class="ir" title="Energy — harvested from enemies, spent on Field Upgrades"><span class="il">Energy</span><span class="iv cash-iv">⚡{Math.floor(snap.cash).toLocaleString()}</span></div>
								</div>
								<div class="psd"></div>
								<div class="pst">🌊 Wave Manager</div>
								<div class="ig">
									<div class="ir" title="Enemies currently alive on screen"><span class="il">Enemies</span><span class="iv">{snap.enemyCount} alive</span></div>
									<div class="ir" title="Total enemies this wave (including boss)"><span class="il">Wave Total</span><span class="iv">{snap.enemiesInWave}</span></div>
									<div class="ir" title="Enemies spawned so far this wave"><span class="il">Spawned</span><span class="iv">{snap.enemiesSpawned}/{snap.enemiesInWave}</span></div>
									<div class="ir" title="Enemies killed so far this wave"><span class="il">Killed</span><span class="iv">{snap.enemiesKilledThisWave}/{snap.enemiesInWave}</span></div>
									<div class="ir" title="Time between enemy spawns"><span class="il">Spawn Rate</span><span class="iv">every {snap.spawnInterval.toFixed(1)}s</span></div>
									<div class="ir" title="Wave status"><span class="il">Status</span><span class="iv">{snap.waveActive ? '⚔ Active' : '⏳ Between waves'}</span></div>
								</div>
							{:else}<div class="pe">Start a run.</div>{/if}
						</div>
						<div class="psd"></div>
						<div class="ps"><div class="pst">⚡ Tower Stats</div>
							{#if snap?.runActive}
								<div class="ig">
									<div class="ir" title="Damage per projectile"><span class="il">Damage</span><span class="iv">{snap.towerDamage.toFixed(1)}</span></div>
									<div class="ir" title="Expected damage per second (with multishot)"><span class="il">DPS</span><span class="iv">{(snap.towerDamage * snap.towerFireRate * (1 + snap.towerMultishotChance * snap.towerMultishotCount)).toFixed(1)}</span></div>
									<div class="ir" title="Attacks per second"><span class="il">Fire Rate</span><span class="iv">{snap.towerFireRate.toFixed(2)}/s</span></div>
									<div class="ir" title="Attack range (pixels)"><span class="il">Range</span><span class="iv">{snap.towerRange.toFixed(0)}</span></div>
									<div class="ir" title="Chance × extra projectiles when triggered"><span class="il">Multishot</span><span class="iv">{(snap.towerMultishotChance * 100).toFixed(0)}% × {snap.towerMultishotCount}</span></div>
									<div class="ir" title="Chance to crit"><span class="il">Crit</span><span class="iv">{(snap.towerCritChance * 100).toFixed(1)}% ×{snap.towerCritMultiplier.toFixed(1)}</span></div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}

		<!-- Game Canvas + HUD -->
		<div class="game-canvas" bind:this={container}>
			{#if snap?.runActive && !leftPanelOpen}
				<div class="hud">
					<div class="hud-row"><span class="hud-wave" title="Current wave">🌊 Wave {snap.wave}</span><span class="hud-enemies" title="Enemies alive on screen">👾 {snap.enemyCount}</span></div>
					<div class="hud-row"><span class="hud-hp" title="Tower HP">❤️ {Math.ceil(snap.towerHp)}/{snap.towerMaxHp}</span><span class="hud-cash" title="Energy — spent on Field Upgrades">⚡ {Math.floor(snap.cash).toLocaleString()}</span></div>
					<div class="hud-row hud-dmg"><span title="Damage per shot">⚔ {snap.towerDamage.toFixed(1)}</span><span title="Attack range">🎯 {snap.towerRange.toFixed(0)}</span><span title="Crit">⚡ {(snap.towerCritChance * 100).toFixed(1)}%×{snap.towerCritMultiplier.toFixed(1)}</span></div>
				</div>
			{/if}
			<TowerStatsPanel {snap} />
			<EnemyStatsPanel {snap} />
			{#if showLaunchScreen}
				<div class="start-ol">
					<div class="start-card">
						<div class="sc-accent"></div>
						<div class="sc-icon"><img class="sc-logo" src="/branding/flatland-logo-medium.svg" alt="Flatland TD" /></div>
						<h2 class="sc-title">Flatland TD</h2>
						<p class="sc-sub">Deploy from orbit. Defend the plane. Field upgrades are lost with the tower — Orbital research endures.</p>
						{#if highestWave > 0}
							<div class="sc-rec">
								<div class="sc-r"><span>🏆</span> Best: Wave {highestWave}</div>
								<div class="sc-r"><span>🪙</span> {coins.toLocaleString()} Coins</div>
								<div class="sc-r"><span>🎮</span> {totalRuns} Runs</div>
							</div>
						{/if}
						<button class="sc-btn" onclick={startRun}><span class="sc-bi"></span><span class="sc-bt">▶ Launch Deployment</span></button>
						<p class="sc-hint"><kbd>Enter</kbd> start · <kbd>Space</kbd> pause · <kbd>1-4</kbd> speed</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Panel: only Battle Upgrades -->
		{#if !isMobile}
			<aside class="panel right" class:coll={!rightPanelOpen}>
				<button class="ptog" onclick={() => rightPanelOpen = !rightPanelOpen}>{rightPanelOpen ? '▶' : '◀'}</button>
				{#if rightPanelOpen}
					<div class="pc">
						<div class="ps"><div class="pst">⚡ Field Upgrades</div>
							{#if snap?.runActive}
								<div class="cat-tabs">
<button class="cat-tab" class:on={upgradeCategory === 'offense'} onclick={() => upgradeCategory = 'offense'} title="Damage, Attack Speed, Range, Multishot, Crit">⚔ Offense</button>
									<button class="cat-tab" class:on={upgradeCategory === 'defense'} onclick={() => upgradeCategory = 'defense'} title="Defense (flat reduction), Max HP">🛡️ Defense</button>
									<button class="cat-tab" class:on={upgradeCategory === 'utility'} onclick={() => upgradeCategory = 'utility'} title="Energy Amp (+% energy per kill)">🔧 Utility</button>
								</div>
								<div class="ug">
									{#each BATTLE_UPGRADES.filter(u => u.category === upgradeCategory) as u}
										{@const lv = bLv(u.id)}
										{@const nl = Math.min(lv + 1, u.maxLevel)}
										{@const cost = u.cost(lv)}
										{@const aff = snap.cash >= cost}
										{@const mx = lv >= u.maxLevel}
										{@const locked = isUpgradeLocked(u.id)}
										{@const justBought = purchasedUpgrade === u.id}
										<button class="uc" class:aff={aff && !mx && !locked} class:mx={mx} class:locked={locked} class:purchased={justBought} disabled={!aff || mx || locked || !snap?.runActive} onclick={() => buyBattleUpgrade(u.id)} title={locked ? 'Locked: requires ' + getLockBlueprintName(u.id) + ' Blueprint' : 'Current: ' + upgradeCurrentValue(u.id, lv) + '\nNext: ' + upgradeNextValue(u.id, lv) + '\nCost: ' + cost + ' Energy'}>
											<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
											{#if !locked}
												<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
												<div class="uc-eff">{upgradeCurrentValue(u.id, lv)}</div>
												<div class="uc-b">	<span class="ucc">⚡{cost}</span><span class="ucnx">{mx ? 'MAXED' : '→ ' + upgradeNextValue(u.id, lv)}</span></div>
											{:else}
												<div class="uc-eff" style="color:var(--text-dim)">🔒 Requires {getLockBlueprintName(u.id)}</div>
											{/if}
										</button>
									{/each}
								</div>
								<div class="hub-shortcut"><a href="/hub">⚙ Forge · Research · Archives →</a></div>
							{:else}<div class="pe">Start a run to buy upgrades.</div>{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- Mobile: battle upgrades drawer + nav -->
	{#if isMobile}
		<nav class="mn">
			<button class="mnb" class:on={!showMobileUpgrades} onclick={() => showMobileUpgrades = false} title="Game canvas view"><span class="mni">🎮</span><span class="mnl">Game</span></button>
			<button class="mnb" class:on={showMobileUpgrades} onclick={() => showMobileUpgrades = !showMobileUpgrades} title="Battle Upgrades panel"><span class="mni">⚔</span><span class="mnl">Upgrades</span></button>
			<a href="/hub" class="mnb" title="Orbital Command — Forge, Research, Archives"><span class="mni">🛰️</span><span class="mnl">Orbital</span></a>
		</nav>
		{#if showMobileUpgrades && snap?.runActive}
			<div class="mob-upgrade-drawer">
				<div class="mob-ug-header">
					<span>⚡ Field Upgrades</span>
					<button class="mob-ug-close" onclick={() => showMobileUpgrades = false}>✕</button>
				</div>
				<div class="cat-tabs">
					<button class="cat-tab" class:on={upgradeCategory === 'offense'} onclick={() => upgradeCategory = 'offense'} title="Damage, Attack Speed, Range, Multishot, Crit">⚔ Offense</button>
					<button class="cat-tab" class:on={upgradeCategory === 'defense'} onclick={() => upgradeCategory = 'defense'} title="Defense, Max HP">🛡️ Defense</button>
					<button class="cat-tab" class:on={upgradeCategory === 'utility'} onclick={() => upgradeCategory = 'utility'} title="Energy Amp">🔧 Utility</button>
				</div>
				<div class="ug mob-ug-list">
					{#each BATTLE_UPGRADES.filter(u => u.category === upgradeCategory) as u}
						{@const lv = bLv(u.id)}
						{@const nl = Math.min(lv + 1, u.maxLevel)}
						{@const cost = u.cost(lv)}
						{@const aff = snap.cash >= cost}
						{@const mx = lv >= u.maxLevel}
						{@const locked = isUpgradeLocked(u.id)}
						{@const justBought = purchasedUpgrade === u.id}
						<button class="uc" class:aff={aff && !mx && !locked} class:mx={mx} class:locked={locked} class:purchased={justBought} disabled={!aff || mx || locked || !snap?.runActive} onclick={() => buyBattleUpgrade(u.id)}>
							<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
							{#if !locked}
								<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
								<div class="uc-eff">{upgradeCurrentValue(u.id, lv)}</div>
								<div class="uc-b">	<span class="ucc">⚡{cost}</span><span class="ucnx">{mx ? 'MAXED' : '→ ' + upgradeNextValue(u.id, lv)}</span></div>
							{:else}
								<div class="uc-eff" style="color:var(--text-dim)">🔒 Requires {getLockBlueprintName(u.id)}</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.play-layout { display:flex; flex-direction:column; height:100vh; height:100dvh; overflow:hidden; background:var(--bg-primary); user-select:none; }
	.toast-c { position:fixed; top:3rem; left:50%; transform:translateX(-50%); z-index:300; display:flex; flex-direction:column; gap:.3rem; pointer-events:none; }
	.toast { padding:.4rem 1rem; font-size:.75rem; border-radius:100px; white-space:nowrap; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:ti .2s ease; box-shadow:0 0 20px rgba(0,0,0,.3); }
	.toast-info { background:rgba(0,255,255,.1); color:var(--cyan); border:1px solid rgba(0,255,255,.25); }
	.toast-success { background:rgba(68,255,136,.1); color:var(--green); border:1px solid rgba(68,255,136,.25); }
	.toast-warning { background:rgba(255,68,68,.1); color:var(--red); border:1px solid rgba(255,68,68,.25); }
	.toast-error { background:rgba(255,68,68,.12); color:#FF6666; border:1px solid rgba(255,68,68,.3); }
	.toast-milestone { background:rgba(255,221,68,.1); color:var(--yellow); border:1px solid rgba(255,221,68,.25); }
	@keyframes ti { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
	.topbar { display:flex; align-items:center; padding:.3rem .65rem; gap:.4rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); z-index:100; flex-shrink:0; position:relative; }
	.tb-back { color:var(--text-dim); font-size:1rem; text-decoration:none; padding:.1rem .3rem; border-radius:var(--radius-sm); transition:all var(--transition-fast); line-height:1; }
	.tb-back:hover { color:var(--cyan); background:rgba(0,255,255,.06); }
	.tb-brand { font-weight:700; font-size:.8rem; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; white-space:nowrap; }
	.tb-div { width:1px; height:16px; background:var(--border-neon); flex-shrink:0; }
	.tb-stats { display:flex; gap:.25rem; align-items:center; margin-left:auto; }
	.tb-pill { display:flex; align-items:center; gap:.15rem; padding:.12rem .4rem; font-size:.65rem; font-family:var(--font-mono); border-radius:100px; background:var(--bg-tertiary); border:1px solid var(--border-neon); }
	.tb-max { color:var(--text-dim); font-size:.55rem; }
	.wave-pill span:last-child { color:var(--cyan); }
	.coin-pill span:last-child { color:var(--yellow); }
	.cash-pill span:last-child { color:var(--green); }
	.hp-pill span:nth-child(2) { color:#FF9988; }
	.hp-pill.low span:nth-child(2) { color:#FF4444; animation:hpDanger 0.5s ease-in-out infinite; }
	@keyframes hpDanger { 0%,100%{opacity:1} 50%{opacity:0.5} }
	.kill-pill span:last-child { color:var(--violet); }
	.spd-grp { display:flex; gap:1px; align-items:center; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:100px; padding:1px; }
	.spd-status { font-size:.5rem; color:var(--cyan); font-family:var(--font-mono); padding:0 .25rem; }
	.spd-status.paused { color:var(--yellow); }
	.save-indicator { width:8px; height:8px; border-radius:50%; background:rgba(68,255,136,0); transition:all .3s ease; flex-shrink:0; }
	.save-indicator.saving { background:rgba(68,255,136,0.6); box-shadow:0 0 6px rgba(68,255,136,0.4); }
	.spd-btn { padding:.15rem .4rem; font-size:.58rem; font-family:var(--font-mono); color:var(--text-dim); border-radius:100px; transition:all var(--transition-fast); line-height:1; cursor:pointer; }
	.spd-btn:hover { color:var(--text-secondary); background:rgba(255,255,255,.04); }
	.spd-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); }
	.spd-n { min-width:1.5rem; text-align:center; }
	.tb-actions { display:flex; gap:.2rem; align-items:center; }
	.ibtn { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); transition:all var(--transition-fast); font-size:.8rem; line-height:1; cursor:pointer; }
	.ibtn:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.sv-wrap { position:relative; }
	.sv-drop { position:absolute; top:calc(100% + 4px); right:0; min-width:150px; background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-md); z-index:200; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.5); animation:fi .12s ease; }
	.sv-drop button { display:block; width:100%; padding:.5rem .8rem; font-size:.72rem; text-align:left; color:var(--text-secondary); transition:all var(--transition-fast); }
	.sv-drop button:hover { background:rgba(0,255,255,.06); color:var(--text-primary); }
	.settings-drop { min-width:200px; padding:.3rem 0; }
	.set-row { display:flex; justify-content:space-between; align-items:center; padding:.45rem .8rem; font-size:.68rem; color:var(--text-secondary); cursor:pointer; }
	.set-row:hover { background:rgba(0,255,255,.04); }
	.set-row input[type=checkbox] { width:14px; height:14px; accent-color:var(--cyan); cursor:pointer; }
	.hub-link { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); font-size:.9rem; text-decoration:none; transition:all var(--transition-fast); }
	.hub-link:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.mob-spd { display:flex; align-items:center; gap:2px; padding:.25rem .65rem; background:rgba(7,8,18,.9); border-bottom:1px solid var(--border-neon); flex-shrink:0; }
	.mob-spd .spd-btn { padding:.25rem .5rem; font-size:.65rem; }
	.mob-spd-lbl { margin-left:auto; font-size:.65rem; color:var(--cyan); font-family:var(--font-mono); }
	.game-body { flex:1; display:flex; overflow:hidden; position:relative; }
	.game-canvas { flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-primary); }
	.hud { position:absolute; top:.5rem; left:.5rem; z-index:8; display:flex; flex-direction:column; gap:.2rem; pointer-events:none; }
	.hud-row { display:flex; gap:.4rem; }
	.hud-row span { padding:.15rem .5rem; background:rgba(7,8,18,.7); border:1px solid var(--border-neon); border-radius:100px; font-size:.62rem; font-family:var(--font-mono); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); color:var(--text-secondary); }
	.hud-wave { color:var(--cyan)!important; } .hud-enemies { color:var(--violet)!important; }
	.hud-hp { color:#FF9988!important; } .hud-cash { color:var(--green)!important; }
	.hud-dmg span { font-size:.55rem; padding:.1rem .4rem; background:rgba(7,8,18,.5); color:var(--text-dim)!important; }
	.start-ol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at center,rgba(7,8,18,.5) 0%,var(--bg-primary) 100%); z-index:10; }
	.start-card { position:relative; text-align:center; padding:2.25rem 2.25rem 1.75rem; background:var(--bg-glass-strong); border:1px solid var(--border-neon); border-radius:var(--radius-xl); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); max-width:340px; width:90%; animation:si .35s ease; box-shadow:0 0 60px rgba(0,255,255,.06); }
	.sc-accent { position:absolute; top:-1px; left:20%; right:20%; height:1px; background:linear-gradient(90deg,transparent,var(--cyan),transparent); opacity:.6; }
	.sc-icon { font-size:2.6rem; display:block; margin-bottom:.5rem; filter:drop-shadow(0 0 20px rgba(0,255,255,.3)); }
	.sc-logo { width:100%; max-width:280px; height:auto; }
	.sc-title { font-size:1.3rem; margin-bottom:.2rem; }
	.sc-sub { font-size:.75rem; color:var(--text-dim); margin-bottom:1.1rem; }
	.sc-rec { display:flex; flex-direction:column; gap:.2rem; margin-bottom:1.1rem; padding:.6rem; background:rgba(0,0,0,.2); border-radius:var(--radius-md); }
	.sc-r { font-size:.68rem; font-family:var(--font-mono); color:var(--text-dim); display:flex; gap:.3rem; align-items:center; }
	.sc-btn { position:relative; display:inline-flex; align-items:center; gap:.4rem; padding:.7rem 2rem; border-radius:var(--radius-md); background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:.95rem; cursor:pointer; overflow:hidden; transition:all var(--transition-normal); box-shadow:0 0 30px rgba(0,255,255,.2); }
	.sc-btn:hover { transform:translateY(-2px); box-shadow:0 0 50px rgba(0,255,255,.35); }
	.sc-bi { position:absolute; inset:0; background:linear-gradient(135deg,transparent,rgba(255,255,255,.12),transparent); transition:opacity var(--transition-normal); opacity:0; }
	.sc-btn:hover .sc-bi { opacity:1; }
	.sc-bt { position:relative; z-index:1; }
	.sc-hint { margin-top:.5rem; font-size:.6rem; color:var(--text-dim); }
	.sc-hint kbd { padding:.05rem .25rem; background:var(--bg-tertiary); border-radius:3px; font-family:var(--font-mono); font-size:.55rem; border:1px solid var(--border-neon); }
	.panel { display:flex; flex-direction:column; background:var(--bg-glass); border-left:1px solid var(--border-neon); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); position:relative; transition:width var(--transition-normal); width:245px; flex-shrink:0; overflow:hidden; z-index:5; }
	.panel.coll { width:24px; }
	.left { border-left:none; border-right:1px solid var(--border-neon); }
	.ptog { position:absolute; top:.3rem; z-index:6; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--text-dim); font-size:.55rem; padding:.12rem .2rem; cursor:pointer; transition:all var(--transition-fast); line-height:1; }
	.left .ptog { right:.15rem; } .right .ptog { left:.15rem; }
	.ptog:hover { background:rgba(0,255,255,.12); color:var(--cyan); }
	.pc { padding:.5rem; overflow-y:auto; flex:1; height:100%; display:flex; flex-direction:column; gap:.1rem; }
	.ps { margin-bottom:.25rem; }
	.pst { display:flex; align-items:center; gap:.25rem; font-size:.6rem; color:var(--cyan); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.35rem; padding-bottom:.25rem; border-bottom:1px solid rgba(0,255,255,.08); }
	.psd { height:1px; background:linear-gradient(90deg,var(--border-neon),transparent); margin:.1rem 0 .3rem; }
	.pe { color:var(--text-dim); font-size:.65rem; font-style:italic; padding:.35rem 0; }
	.ig { display:grid; gap:1px; }
	.ir { display:flex; justify-content:space-between; padding:.12rem .25rem; font-size:.65rem; border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-dim); } .iv { color:var(--text-secondary); font-family:var(--font-mono); font-weight:500; }
	.hp-iv { color:var(--green); } .cash-iv { color:var(--green); } .im { color:var(--text-dim); font-size:.55rem; }
	.ug { display:flex; flex-direction:column; gap:2px; }
	.uc { display:flex; flex-direction:column; gap:.12rem; padding:.3rem .4rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); box-shadow:0 0 8px rgba(0,255,255,.06); }
	.uc.purchased { animation:purchaseGlow .5s ease-out; }
	@keyframes purchaseGlow { 0%{box-shadow:0 0 0 rgba(0,255,255,0);transform:scale(1)} 25%{box-shadow:0 0 25px rgba(0,255,255,.8),0 0 50px rgba(0,255,255,.3);transform:scale(1.03)} 100%{box-shadow:0 0 0 rgba(0,255,255,0);transform:scale(1)} }
	.uc.mx { opacity:.35; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.5; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.2rem; }
	.uci { font-size:.7rem; flex-shrink:0; }
	.ucn { flex:1; font-size:.6rem; font-weight:500; color:var(--text-secondary); }
	.ucl { font-size:.52rem; font-family:var(--font-mono); color:var(--text-dim); }
	.uc-btr { height:2px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-eff { font-size:.58rem; color:var(--text-dim); font-family:var(--font-mono); padding:.05rem 0; }
	.uc.aff .uc-eff { color:var(--green-dim); }
	.uc-b { display:flex; align-items:center; gap:.25rem; font-size:.55rem; }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-dim); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	.cat-tabs { display:flex; gap:2px; margin-bottom:.35rem; padding:2px; background:rgba(0,0,0,.12); border-radius:var(--radius-sm); }
	.cat-tab { flex:1; padding:.2rem .15rem; font-size:.55rem; color:var(--text-dim); border-radius:4px; transition:all var(--transition-fast); text-align:center; cursor:pointer; }
	.cat-tab.on { color:var(--cyan); background:rgba(0,255,255,.08); }
	.cat-tab:hover:not(.on) { color:var(--text-secondary); background:rgba(255,255,255,.02); }
	.hub-shortcut { margin-top:.5rem; text-align:center; font-size:.65rem; }
	.hub-shortcut a { color:var(--text-dim); text-decoration:none; transition:all var(--transition-fast); }
	.hub-shortcut a:hover { color:var(--cyan); }
	.go-panel { position:relative; text-align:center; padding:2rem 1.75rem 1.5rem; background:var(--bg-secondary); border:1px solid rgba(255,68,170,.2); border-radius:var(--radius-xl); max-width:360px; width:90%; overflow:hidden; animation:goAppear .4s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 0 80px rgba(255,68,170,.08),0 0 160px rgba(0,0,0,.4); }
	.go-panel.go-record { border-color:rgba(255,221,68,.3); box-shadow:0 0 80px rgba(255,221,68,.1),0 0 160px rgba(0,0,0,.4); }
	@keyframes goAppear { from{opacity:0;transform:scale(.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
	.go-glow { position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle at center,rgba(255,68,170,.05) 0%,transparent 60%); pointer-events:none; }
	.go-glow-ring { position:absolute; top:50%; left:50%; width:200px; height:200px; transform:translate(-50%,-50%); border-radius:50%; border:1px solid rgba(255,68,170,.06); pointer-events:none; animation:goRingPulse 3s ease-in-out infinite; }
	@keyframes goRingPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.3} 50%{transform:translate(-50%,-50%) scale(1.8);opacity:0} }
	.go-panel.go-record .go-glow-ring { border-color:rgba(255,221,68,.1); }
	.go-icon { font-size:3rem; margin-bottom:.3rem; display:block; filter:drop-shadow(0 0 20px rgba(255,68,170,.3)); }
	.go-panel.go-record .go-icon { filter:drop-shadow(0 0 20px rgba(255,221,68,.4)); }
	.go-title { font-size:1.5rem; color:var(--pink); margin-bottom:.1rem; }
	.go-wave { font-size:.8rem; color:var(--text-dim); margin-bottom:.1rem; font-family:var(--font-mono); }
	.go-wave strong { color:var(--text-primary); }
	.go-wave-sub { font-size:.65rem; color:var(--text-dim); margin-bottom:1rem; font-family:var(--font-mono); }
	.go-stats { display:flex; align-items:center; justify-content:center; gap:.8rem; margin-bottom:.5rem; padding:.6rem .75rem; background:rgba(0,0,0,.12); border-radius:var(--radius-md); }
	.go-stats-sub { display:flex; justify-content:center; gap:1rem; font-size:.55rem; color:var(--text-dim); margin-bottom:1rem; font-family:var(--font-mono); }
	.go-s { text-align:center; min-width:55px; }
	.go-si { font-size:1rem; display:block; margin-bottom:.1rem; }
	.go-sv { font-size:1rem; font-weight:700; font-family:var(--font-mono); color:var(--text-primary); }
	.go-sl { font-size:.5rem; color:var(--text-dim); margin-top:.05rem; text-transform:uppercase; letter-spacing:.05em; }
	.go-sd { width:1px; height:28px; background:var(--border-neon); }
	.go-btn { display:block; width:100%; padding:.65rem; background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:.9rem; border-radius:var(--radius-md); cursor:pointer; transition:all var(--transition-normal); box-shadow:0 0 20px rgba(0,255,255,.1); }
	.go-btn:hover { box-shadow:0 0 30px rgba(0,255,255,.2); transform:translateY(-1px); }
	.go-row2 { display:flex; gap:.4rem; margin-top:.45rem; }
	.go-btn2 { flex:1; padding:.45rem; font-size:.7rem; border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-dim); cursor:pointer; text-decoration:none; display:block; text-align:center; transition:all var(--transition-fast); }
	.go-btn2:hover { border-color:var(--text-dim); color:var(--text-secondary); }
	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.dlg { background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-xl); padding:1.5rem; max-width:360px; width:100%; animation:si .25s ease; }
	.dlg h3 { font-size:1rem; margin-bottom:.35rem; }
	.dlg-d { color:var(--text-dim); font-size:.72rem; margin-bottom:.75rem; }
	.dlg textarea { width:100%; margin-bottom:.75rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.45rem; font-family:var(--font-mono); font-size:.62rem; resize:vertical; }
	.dlg-a { display:flex; gap:.4rem; justify-content:center; }
	.dlg-p,.dlg-s,.dlg-dng-btn { padding:.45rem 1rem; border-radius:var(--radius-sm); font-weight:600; font-size:.75rem; cursor:pointer; transition:all var(--transition-fast); }
	.dlg-p { background:var(--cyan); color:var(--bg-primary); }
	.dlg-s { background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.dlg-dng-btn { background:var(--red); color:white; }
	.dlg-dng { border-color:rgba(255,68,68,.2); }
	.mn { display:flex; background:rgba(7,8,18,.96); border-top:1px solid var(--border-neon); flex-shrink:0; z-index:100; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
	.mnb { flex:1; display:flex; flex-direction:column; align-items:center; padding:.4rem .05rem; font-size:.5rem; color:var(--text-dim); text-decoration:none; gap:2px; position:relative; transition:all .15s ease; }
	.mnb.on { color:var(--cyan); }
	.mnb.on::after { content:''; position:absolute; top:0; left:25%; right:25%; height:2px; background:var(--cyan); border-radius:0 0 2px 2px; box-shadow:0 0 8px rgba(0,255,255,.4); }
	.mni { font-size:1.1rem; } .mnl { font-size:.5rem; font-weight:500; }
	.mob-upgrade-drawer { position:fixed; bottom:var(--mob-nav-h,48px); left:0; right:0; max-height:60vh; background:var(--bg-secondary); border-top:1px solid var(--border-neon-strong); border-radius:var(--radius-xl) var(--radius-xl) 0 0; z-index:150; overflow-y:auto; padding:.5rem .65rem .75rem; animation:mobDrawerIn .25s cubic-bezier(.34,1.56,.64,1); box-shadow:0 -8px 32px rgba(0,0,0,.5); }
	.mob-ug-header { display:flex; justify-content:space-between; align-items:center; font-size:.7rem; color:var(--cyan); font-family:var(--font-mono); margin-bottom:.35rem; }
	.mob-ug-close { color:var(--text-dim); font-size:.8rem; padding:.1rem .3rem; cursor:pointer; }
	.mob-ug-list { max-height:35vh; overflow-y:auto; }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
	@keyframes mobDrawerIn { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
	@media(min-width:900px){ .mn,.mob-spd,.mob-upgrade-drawer{display:none} }
	@media(max-width:899px){
		.topbar{padding:.2rem .3rem;gap:.2rem}
		.tb-brand{font-size:.65rem}
		.tb-div{display:none}
		.tb-pill{padding:.08rem .3rem;font-size:.55rem;gap:.1rem}
		.tb-stats{flex-wrap:wrap;gap:.12rem}
		.tb-max{display:none}
		.spd-grp{display:none}
		.save-indicator{display:none}
		:root{--mob-nav-h:48px}
	}
</style>
