<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
	import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
	import { UpgradeId, type GameSnapshot, type GameSettings } from '$lib/game/engine/gameTypes';
	import { BATTLE_UPGRADES } from '$lib/game/balance/battleUpgrades';
	import { getBattleUpgradeCost, getBattleUpgradeEffect } from '$lib/game/balance/battleUpgrades';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { engineStore } from '$lib/stores/gameStore';

	let container = $state<HTMLDivElement>();
	let gameView = $state<PixiGameView | null>(null);
	let engine = $state<GameEngine | null>(null);

	let isMobile = $state(false);
	let leftPanelOpen = $state(false);
	let rightPanelOpen = $state(true);
	let showGameOver = $state(false);
	let gameOverCoins = $state(0);
	let gameOverWave = $state(0);
	let gameOverKills = $state(0);

	let snap = $state<GameSnapshot>(null!);
	let coins = $state(0);
	let settings = $state<GameSettings>({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let speed = $state(1);
	let paused = $state(false);

	let showSaveMenu = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);

	let toasts: { id: number; msg: string; type: string }[] = $state([]);
	let nextToast = 0;
	function toast(msg: string, type: string = 'info') {
		const id = ++nextToast;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 2200);
	}

	onMount(() => {
		const cm = () => { isMobile = window.innerWidth < 768; };
		cm(); window.addEventListener('resize', cm);
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		window.addEventListener('keydown', onKey);

		// Restore engine if it exists in the store (from previous visit)
		const unsubEngine = engineStore.subscribe(e => {
			if (e && !engine) {
				engine = e;
				if (container && !gameView) {
					gameView = new PixiGameView(container, e);
					gameView.start();
				}
				refreshSnap();
			}
		});

		return () => {
			window.removeEventListener('resize', cm);
			window.removeEventListener('keydown', onKey);
			u1(); u2(); u3(); u4(); unsubEngine();
		};
	});

	onDestroy(() => {
		// Don't destroy engine — save it to store so it persists
		if (engine) {
			engine.state.paused = true;
			engineStore.set(engine);
		}
		gameView?.stop();
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
			towerMultishot: t.stats.multishot, towerCritChance: t.stats.critChance,
			upgradeLevels: { ...st.battleUpgrades as Record<string, number> },
			enemiesInWave: w.enemiesInWave, enemiesSpawned: w.enemiesSpawned,
			enemiesKilledThisWave: w.enemiesKilled, waveActive: w.waveActive,
			betweenWaveTimer: w.betweenWaveTimer, spawnInterval: w.spawnInterval,
		};
		speed = engine.speedMultiplier;
		paused = engine.isPaused();
	}

	function initEngine() {
		if (engine) engine.cleanup();
		if (gameView) { gameView.destroy(); gameView = null; }
		engine = new GameEngine();
		engineStore.set(engine);
		engine.setCallbacks({
			onSnapshot: () => { refreshSnap(); },
			onStateChange: () => { refreshSnap(); },
			onGameOver: (_c: number, _w: number) => {
				refreshSnap();
				gameOverCoins = _c; gameOverWave = _w;
				gameOverKills = engine?.state.killCount ?? 0;
				showGameOver = true;
				const save = getCachedSave();
				if (save && engine) {
					save.totalCoins = engine.state.coins;
					save.totalRuns = engine.state.totalRuns;
					save.highestWave = Math.max(save.highestWave, engine.state.highestWave);
					coinsStore.set(save.totalCoins);
					highestWaveStore.set(save.highestWave);
					totalRunsStore.set(save.totalRuns);
					persistSave(save);
				}
				toast('💀 Game Over — Wave ' + _w, 'warning');
			},
			onMilestone: (text: string) => { toast('🏆 ' + text, 'milestone'); },
		});
		if (!container) return;
		gameView = new PixiGameView(container, engine);
		gameView.start();
	}

	function startRun() {
		if (!engine) initEngine();
		if (!engine) return;
		showGameOver = false;
		speed = 1; paused = false;
		const save = getCachedSave();
		engine.startRun(save?.workshopUpgrades ?? {}, save?.labLevels ?? {}, coins);
		gameView?.start();
		refreshSnap();
		toast('▶ Run started!', 'success');
	}

	function handleSpeed(preset: number) {
		if (!engine) return;
		if (preset === 0) { engine.togglePause(); toast(engine.isPaused() ? '⏸ Paused' : '▶ Resumed', 'info'); }
		else { const spds = GAME_CONFIG.SPEED_PRESETS; engine.setSpeed(spds[preset - 1] ?? 1); toast('⏩ ' + (spds[preset - 1] ?? 1) + '×', 'info'); }
		refreshSnap();
	}

	function buyBattleUpgrade(id: UpgradeId) {
		if (!engine) return;
		const lv = engine.state.battleUpgrades[id] ?? 0;
		if (engine.buyBattleUpgrade(id)) { refreshSnap(); toast('⬆ Upgraded!', 'success'); }
		else { toast(lv >= 50 ? '⚠ Max level!' : '💰 Not enough Cash!', lv >= 50 ? 'warning' : 'error'); }
	}
	function bLv(id: UpgradeId): number { return snap?.upgradeLevels[id] ?? 0; }

	function handleResetSave() {
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
			toast('🗑 Reset!', 'warning');
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

<div class="play-layout">
	{#if toasts.length}
		<div class="toast-c">{#each toasts as t}<div class="toast toast-{t.type}">{t.msg}</div>{/each}</div>
	{/if}

	<!-- Top Bar -->
	<header class="topbar">
		<a href="/" class="tb-back" aria-label="Home">←</a>
		<div class="tb-brand">KoalaTower</div>
		<div class="tb-div"></div>
		<div class="tb-stats">
			{#if snap?.runActive}
				<div class="tb-pill wave-pill"><span>🌊</span><span>{snap.wave}</span></div>
			{/if}
			<div class="tb-pill coin-pill"><span>🪙</span><span>{coins.toLocaleString()}</span></div>
			{#if snap?.runActive}
				<div class="tb-pill cash-pill"><span>💰</span><span>{Math.floor(snap.cash).toLocaleString()}</span></div>
				<div class="tb-pill hp-pill"><span>❤️</span><span>{Math.ceil(snap.towerHp)}</span><span class="tb-max">/{snap.towerMaxHp}</span></div>
			{/if}
		</div>
		<div class="tb-actions">
			{#if snap?.runActive}
				<div class="spd-grp">
					<button class="spd-btn" class:on={paused} onclick={() => handleSpeed(0)} title="Pause (Space)">⏸</button>
					{#each [1,2,3] as s}<button class="spd-btn spd-n" class:on={!paused && speed === s} onclick={() => handleSpeed(s)} title="{s}× ({s})">{s}×</button>{/each}
					<button class="spd-btn spd-n" class:on={!paused && speed === 5} onclick={() => handleSpeed(4)} title="5× (4)">5×</button>
				</div>
			{/if}
			<div class="sv-wrap">
				<button class="ibtn" onclick={() => showSaveMenu = !showSaveMenu} aria-label="Save menu">💾</button>
				{#if showSaveMenu}
					<div class="sv-drop">
						<button onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast('📋 Exported!', 'success'); showSaveMenu = false; }}>📋 Export</button>
						<button onclick={() => { showImportDialog = true; showSaveMenu = false; }}>📂 Import</button>
						<button onclick={() => { showResetConfirm = true; showSaveMenu = false; }}>🗑 Reset</button>
						<button onclick={() => { showSaveMenu = false; }}>✕ Close</button>
					</div>
				{/if}
			</div>
			<a href="/hub" class="hub-link" aria-label="Hub">🏪</a>
		</div>
	</header>

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
			<div class="go-panel">
				<div class="go-glow"></div>
				<div class="go-icon">💀</div>
				<h2 class="go-title">Run Over</h2>
				<div class="go-wave">Reached Wave <strong>{gameOverWave}</strong></div>
				<div class="go-stats">
					<div class="go-s"><span class="go-si">🪙</span><span class="go-sv">+{gameOverCoins.toLocaleString()}</span><span class="go-sl">Coins</span></div>
					<div class="go-sd"></div>
					<div class="go-s"><span class="go-si">💀</span><span class="go-sv">{gameOverKills.toLocaleString()}</span><span class="go-sl">Kills</span></div>
					<div class="go-sd"></div>
					<div class="go-s"><span class="go-si">🏆</span><span class="go-sv">{highestWave}</span><span class="go-sl">Best Wave</span></div>
				</div>
				<button class="go-btn" onclick={startRun}>▶ Play Again</button>
				<div class="go-row2">
					<a href="/hub" class="go-btn2">🏪 Hub</a>
					<button class="go-btn2" onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast('📋 Exported!', 'success'); }}>💾 Export</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="dialog"><div class="dlg"><h3>📂 Import Save</h3><p class="dlg-d">Paste your save JSON below.</p><textarea bind:value={importText} rows={5}></textarea><div class="dlg-a"><button class="dlg-p" onclick={async () => { const r = await importSave(importText); toast(r.success ? '✅ Imported!' : '❌ ' + r.error, r.success ? 'success' : 'error'); showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button><button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button></div></div></div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="dialog"><div class="dlg dlg-dng"><h3>🗑 Reset Save?</h3><p class="dlg-d">All progress will be lost. Cannot be undone.</p><div class="dlg-a"><button class="dlg-dng-btn" onclick={handleResetSave}>Reset</button><button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button></div></div></div>
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
									<div class="ir"><span class="il">Wave</span><span class="iv">{snap.wave}</span></div>
									<div class="ir"><span class="il">HP</span><span class="iv hp-iv">{Math.ceil(snap.towerHp)}<span class="im">/{snap.towerMaxHp}</span></span></div>
									<div class="ir"><span class="il">Kills</span><span class="iv">{snap.killCount}</span></div>
									<div class="ir"><span class="il">Time</span><span class="iv">{fmt(snap.elapsedTime)}</span></div>
									<div class="ir"><span class="il">Speed</span><span class="iv">{paused ? '⏸' : speed + '×'}</span></div>
									<div class="ir"><span class="il">Cash</span><span class="iv cash-iv">💰{Math.floor(snap.cash).toLocaleString()}</span></div>
								</div>
								<div class="psd"></div>
								<div class="pst">🌊 Wave Manager</div>
								<div class="ig">
									<div class="ir"><span class="il">Enemies</span><span class="iv">{snap.enemyCount} alive</span></div>
									<div class="ir"><span class="il">Wave Total</span><span class="iv">{snap.enemiesInWave}</span></div>
									<div class="ir"><span class="il">Spawned</span><span class="iv">{snap.enemiesSpawned}/{snap.enemiesInWave}</span></div>
									<div class="ir"><span class="il">Killed</span><span class="iv">{snap.enemiesKilledThisWave}/{snap.enemiesInWave}</span></div>
									<div class="ir"><span class="il">Spawn Rate</span><span class="iv">every {snap.spawnInterval.toFixed(1)}s</span></div>
									<div class="ir"><span class="il">Status</span><span class="iv">{snap.waveActive ? '⚔ Active' : '⏳ Between waves'}</span></div>
								</div>
							{:else}<div class="pe">Start a run.</div>{/if}
						</div>
						<div class="psd"></div>
						<div class="ps"><div class="pst">⚡ Tower Stats</div>
							{#if snap?.runActive}
								<div class="ig">
									<div class="ir"><span class="il">Damage</span><span class="iv">{snap.towerDamage.toFixed(1)}</span></div>
									<div class="ir"><span class="il">DPS</span><span class="iv">{(snap.towerDamage * snap.towerFireRate * snap.towerMultishot).toFixed(1)}</span></div>
									<div class="ir"><span class="il">Fire Rate</span><span class="iv">{snap.towerFireRate.toFixed(2)}/s</span></div>
									<div class="ir"><span class="il">Range</span><span class="iv">{snap.towerRange.toFixed(0)}</span></div>
									<div class="ir"><span class="il">Multishot</span><span class="iv">×{snap.towerMultishot}</span></div>
									<div class="ir"><span class="il">Crit</span><span class="iv">{(snap.towerCritChance * 100).toFixed(1)}%</span></div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}

		<!-- Game Canvas + HUD -->
		<div class="gcc" bind:this={container}>
			{#if snap?.runActive && !leftPanelOpen}
				<div class="hud">
					<div class="hud-row"><span class="hud-wave">🌊 Wave {snap.wave}</span><span class="hud-enemies">👾 {snap.enemyCount}</span></div>
					<div class="hud-row"><span class="hud-hp">❤️ {Math.ceil(snap.towerHp)}/{snap.towerMaxHp}</span><span class="hud-cash">💰 {Math.floor(snap.cash).toLocaleString()}</span></div>
					<div class="hud-row hud-dmg"><span>⚔ {snap.towerDamage.toFixed(1)}</span><span>🎯 {snap.towerRange.toFixed(0)}</span><span>⚡ {(snap.towerCritChance * 100).toFixed(0)}%</span></div>
				</div>
			{/if}
			{#if !snap?.runActive && !showGameOver}
				<div class="start-ol">
					<div class="start-card">
						<div class="sc-accent"></div>
						<div class="sc-icon">🐨</div>
						<h2 class="sc-title">KoalaTower</h2>
						<p class="sc-sub">Defend the tower. Survive the waves.</p>
						{#if highestWave > 0}
							<div class="sc-rec">
								<div class="sc-r"><span>🏆</span> Best: Wave {highestWave}</div>
								<div class="sc-r"><span>🪙</span> {coins.toLocaleString()} Coins</div>
								<div class="sc-r"><span>🎮</span> {totalRuns} Runs</div>
							</div>
						{/if}
						<button class="sc-btn" onclick={startRun}><span class="sc-bi"></span><span class="sc-bt">▶ Start Run</span></button>
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
						<div class="ps"><div class="pst">⚔ Battle Upgrades</div>
							{#if snap?.runActive}
								<div class="ug">
									{#each BATTLE_UPGRADES as u}
										{@const lv = bLv(u.id)}
										{@const nl = Math.min(lv + 1, u.maxLevel)}
										{@const cost = u.cost(lv)}
										{@const aff = snap.cash >= cost}
										{@const mx = lv >= u.maxLevel}
										<button class="uc" class:aff={aff && !mx} class:mx={mx} disabled={!aff || mx || !snap?.runActive} onclick={() => buyBattleUpgrade(u.id)}>
											<div class="uc-t"><span class="uci">{u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">Lv.{lv}</span></div>
											<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
											<div class="uc-b"><span class="ucc">💰{cost}</span><span class="ucnx">{mx ? 'MAXED' : '→ ' + (lv > 0 ? getBattleUpgradeEffect(u.id, nl).toFixed(1) : 'Lv.1 ' + getBattleUpgradeEffect(u.id, 1).toFixed(1))}</span></div>
										</button>
									{/each}
								</div>
								<div class="hub-shortcut"><a href="/hub">🏪 Workshop · Lab · Stats →</a></div>
							{:else}<div class="pe">Start a run to buy upgrades.</div>{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- Mobile: only battle tab -->
	{#if isMobile}
		<nav class="mn">
			<button class="mnb on"><span class="mni">⚔</span><span class="mnl">Battle</span></button>
			<a href="/hub" class="mnb"><span class="mni">🏪</span><span class="mnl">Hub</span></a>
		</nav>
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
	.spd-grp { display:flex; gap:1px; align-items:center; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:100px; padding:1px; }
	.spd-btn { padding:.15rem .4rem; font-size:.58rem; font-family:var(--font-mono); color:var(--text-dim); border-radius:100px; transition:all var(--transition-fast); line-height:1; cursor:pointer; }
	.spd-btn:hover { color:var(--text-secondary); background:rgba(255,255,255,.04); }
	.spd-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); }
	.spd-n { min-width:1.5rem; text-align:center; }
	.tb-actions { display:flex; gap:.2rem; align-items:center; }
	.ibtn { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); transition:all var(--transition-fast); font-size:.8rem; line-height:1; cursor:pointer; }
	.ibtn:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.sv-wrap { position:relative; }
	.sv-drop { position:absolute; top:calc(100%+4px); right:0; min-width:150px; background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-md); z-index:200; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.5); animation:fi .12s ease; }
	.sv-drop button { display:block; width:100%; padding:.5rem .8rem; font-size:.72rem; text-align:left; color:var(--text-secondary); transition:all var(--transition-fast); }
	.sv-drop button:hover { background:rgba(0,255,255,.06); color:var(--text-primary); }
	.hub-link { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); font-size:.9rem; text-decoration:none; transition:all var(--transition-fast); }
	.hub-link:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.mob-spd { display:flex; align-items:center; gap:2px; padding:.25rem .65rem; background:rgba(7,8,18,.9); border-bottom:1px solid var(--border-neon); flex-shrink:0; }
	.mob-spd .spd-btn { padding:.25rem .5rem; font-size:.65rem; }
	.mob-spd-lbl { margin-left:auto; font-size:.65rem; color:var(--cyan); font-family:var(--font-mono); }
	.game-body { flex:1; display:flex; overflow:hidden; position:relative; }
	.gcc { flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-primary); }
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
	.uc.mx { opacity:.35; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.5; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.2rem; }
	.uci { font-size:.7rem; flex-shrink:0; }
	.ucn { flex:1; font-size:.6rem; font-weight:500; color:var(--text-secondary); }
	.ucl { font-size:.52rem; font-family:var(--font-mono); color:var(--text-dim); }
	.uc-btr { height:2px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-b { display:flex; align-items:center; gap:.25rem; font-size:.55rem; }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-dim); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	.hub-shortcut { margin-top:.5rem; text-align:center; font-size:.65rem; }
	.hub-shortcut a { color:var(--text-dim); text-decoration:none; transition:all var(--transition-fast); }
	.hub-shortcut a:hover { color:var(--cyan); }
	.go-panel { position:relative; text-align:center; padding:2rem 1.75rem 1.5rem; background:var(--bg-secondary); border:1px solid rgba(255,68,170,.2); border-radius:var(--radius-xl); max-width:320px; width:100%; overflow:hidden; animation:si .3s ease; box-shadow:0 0 60px rgba(255,68,170,.06); }
	.go-glow { position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle at center,rgba(255,68,170,.04) 0%,transparent 60%); pointer-events:none; }
	.go-icon { font-size:2.6rem; margin-bottom:.3rem; display:block; }
	.go-title { font-size:1.5rem; color:var(--pink); margin-bottom:.1rem; }
	.go-wave { font-size:.8rem; color:var(--text-dim); margin-bottom:1.1rem; font-family:var(--font-mono); }
	.go-wave strong { color:var(--text-primary); }
	.go-stats { display:flex; align-items:center; justify-content:center; gap:.8rem; margin-bottom:1.1rem; padding:.75rem; background:rgba(0,0,0,.12); border-radius:var(--radius-md); }
	.go-s { text-align:center; min-width:55px; }
	.go-si { font-size:1rem; display:block; margin-bottom:.1rem; }
	.go-sv { font-size:1.1rem; font-weight:700; font-family:var(--font-mono); color:var(--text-primary); }
	.go-sl { font-size:.52rem; color:var(--text-dim); margin-top:.05rem; text-transform:uppercase; letter-spacing:.05em; }
	.go-sd { width:1px; height:30px; background:var(--border-neon); }
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
	.mn { display:flex; background:rgba(7,8,18,.95); border-top:1px solid var(--border-neon); flex-shrink:0; z-index:100; }
	.mnb { flex:1; display:flex; flex-direction:column; align-items:center; padding:.35rem .05rem; font-size:.5rem; color:var(--text-dim); text-decoration:none; gap:1px; position:relative; }
	.mnb.on { color:var(--cyan); }
	.mni { font-size:1rem; } .mnl { font-size:.48rem; }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
	@media(min-width:768px){ .mn,.mob-spd{display:none} }
	@media(max-width:767px){ .topbar{padding:.25rem .4rem;gap:.25rem} .tb-brand{font-size:.7rem} .tb-div{display:none} .spd-grp{display:none} }
</style>
