<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
	import Tutorial from '$lib/components/Tutorial.svelte';
	import TowerStatsPanel from '$lib/components/TowerStatsPanel.svelte';
	import EnemyStatsPanel from '$lib/components/EnemyStatsPanel.svelte';
	import BossHealthBar from '$lib/components/BossHealthBar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
	import { UpgradeId, type GameSnapshot, type GameSettings, AchievementId, DEFAULT_SETTINGS, ChallengeId, EnemyType } from '$lib/game/engine/gameTypes';
	import { getKillstreakTier } from '$lib/game/systems/enemySystem';
	import { countUp } from '$lib/utils/countUp';
	import { writeClipboardText } from '$lib/utils/clipboard';
	import { tooltip } from '$lib/components/tooltip';
	import { checkMasteryAchievements } from '$lib/game/balance/mastery';
	import { buildBattleUpgradeList } from '$lib/game/balance/battleUpgrades';
	import { seedBattleUpgradesFromForge } from '$lib/game/balance/forgeUpgrades';
	import { applyCounterDeltas, rolloverCommandOrders, commandOrdersWeekKey } from '$lib/game/balance/commandOrders';
	const BATTLE_UPGRADES = buildBattleUpgradeList();
	import { getUnlockedFronts, getTierNumber, getFrontName } from '$lib/game/balance/tiers';
	import { addSchematics, pendingMilestoneSchematics, normalizeSchematics, rollBossSchematicReward } from '$lib/game/balance/schematics';
	import { getMaxUnlockedSpeed, hasBlackMarketUnlock } from '$lib/game/balance/blackMarket';
	import { TierId } from '$lib/game/engine/gameTypes';
	import { isChallengeUnlocked } from '$lib/game/balance/challenges';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { addDeploymentReport, createDeploymentReport, enemyTypeToReportLabel } from '$lib/game/deploymentReports';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { applyCommunityBuff, communityBuffStore } from '$lib/online/communityBuffClient';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';
	import { checkAchievements } from '$lib/game/balance/achievements';
	import { engineStore } from '$lib/stores/gameStore';
	import { audio } from '$lib/game/audio/AudioManager';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';
	import { notifications } from '$lib/stores/notificationStore';
	import { saveStatusStore, type SaveStatus } from '$lib/stores/saveStatusStore';
	import { playForNotification } from '$lib/game/audio/uiSounds';
	import NotificationCenter from '$lib/components/NotificationCenter.svelte';
	import FieldUpgrades from '$lib/components/play/FieldUpgrades.svelte';
	import GameOverPanel from '$lib/components/play/GameOverPanel.svelte';
	import LaunchScreen from '$lib/components/play/LaunchScreen.svelte';
	import KillstreakCounter from '$lib/components/play/KillstreakCounter.svelte';

	let container = $state<HTMLDivElement>();
	let gameView = $state<PixiGameView | null>(null);
	let engine = $state<GameEngine | null>(null);
	let pixiReady = $state(false);
	let pixiError = $state('');

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
	let gameOverKillstreak = $state(0);
	let gameOverSchematics = $state(0);
	let gameOverFrontName = $state('');
	let runStartedAtMs = $state(0);
	let activeRunToken = 0;
	let reportingRunToken = 0;
	let prevWave = $state(0);
	let prevBossCount = $state(0);
	let upgradeCategory = $state<'offense' | 'defense' | 'utility'>('offense');
	let purchasedUpgrade = $state<string | null>(null);
	let showMobileUpgrades = $state(false);
	let buyMultiplier = $state<1 | 5 | 10 | 50 | 'max'>(1);
	let shiftHeld = $state(false);
	let ctrlHeld = $state(false);
	let showMobileSpeed = $state(false);

	const PLAY_TUTORIAL_KEY = 'flatland-td-tutorial-done';
	const playTutorialSteps = [
		{ title: 'Start a Deployment', desc: 'Pick Front 1 and launch. Your tower fires automatically; your job is choosing upgrades before the shapes overwhelm it.', target: '.sc-btn', placement: 'center' as const },
		{ title: 'Energy Now, Alloy Later', desc: 'Kills earn Energy for this deployment and Alloy for permanent upgrades. Energy is spent in the fight. Alloy survives the tower.', target: '.tb-stats', placement: 'bottom' as const },
		{ title: 'Control the Pace', desc: 'Use the speed buttons to accelerate, or Space to pause. Higher speeds are for comfortable runs; pause whenever the upgrade panel gets busy.', target: '.spd-grp, .mob-spd', placement: 'bottom' as const },
		{ title: 'Field Upgrades', desc: 'Spend Energy here on Offense, Defense, and Utility upgrades. These are powerful, but they reset when the tower falls.', target: '.panel.right, .mob-upgrade-drawer, [title="Battle Upgrades panel"]', placement: 'left' as const },
		{ title: 'Permanent Progress', desc: 'After a run, visit Orbital Command. The Forge and Research Deck turn Alloy into upgrades that apply to every future deployment.', target: '.hub-link, [href="/hub"]', placement: 'bottom' as const },
		{ title: 'Ready', desc: 'That is enough to begin: launch, buy field upgrades, bank Alloy, then improve the next run from Orbital Command.', target: '', placement: 'center' as const },
	];

	function updateBuyMultiplier() {
		if (shiftHeld && ctrlHeld) buyMultiplier = 50;
		else if (shiftHeld) buyMultiplier = 5;
		else if (ctrlHeld) buyMultiplier = 'max';
		else if (!shiftHeld && !ctrlHeld) buyMultiplier = 1;
	}

	let snap = $state<GameSnapshot | null>(null);
	let fps = $state(0);
	let lastFpsUpdate = 0;
	let frameCount = 0;

	$effect(() => {
		if (settings.showFps && snap?.runActive && !paused) {
			let frameId: number;
			const tick = () => {
				frameCount++;
				const now = performance.now();
				if (now - lastFpsUpdate >= 1000) {
					fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
					frameCount = 0;
					lastFpsUpdate = now;
				}
				frameId = requestAnimationFrame(tick);
			};
			lastFpsUpdate = performance.now();
			frameCount = 0;
			frameId = requestAnimationFrame(tick);
			return () => {
				cancelAnimationFrame(frameId);
			};
		}
	});
	let saveLoaded = $state(false);
	let coins = $state(0);
	let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });
	let saveStatus = $state<SaveStatus>({
		writeFailed: false,
		message: null,
		loadWarning: null,
		lastSuccessfulWriteAt: null,
		lastFailureAt: null,
	});
	let saveStatusNow = $state(Date.now());
	let systemReducedMotion = $state(false);
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let speed = $state(1);
	let paused = $state(false);
	let selectedFront = $state<TierId>(TierId.Tier1);
	let frontBestWave = $state<Partial<Record<TierId, number>>>({});
	let schematicsByFront = $state<Record<number, number>>({});
	let unlockedFronts = $derived(getUnlockedFronts(frontBestWave));
	/** Set at deploy time — whether this run launched on the highest unlocked Front. */
	let deployedOnHighestFront = false;
	let selectedChallenge = $state<ChallengeId | null>(null);
	let challengeHighScores = $state<Partial<Record<ChallengeId, number>>>({});

	let showSaveMenu = $state(false);
	let showSaveIndicator = $state(false);
	let tutorialReplayKey = $state(0);
	let showSettings = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let importDialogEl = $state<HTMLDivElement | undefined>(undefined);
	let resetDialogEl = $state<HTMLDivElement | undefined>(undefined);
	let coinsAtRunStart = $state(0);
	// Community Alloy Boost — cached from /api/community-buff. 0 when offline.
	let currentBuffPercent = $state(0);
	let autoDeploymentArmed = $state(false);
	let autoDeploymentCountdown = $state(0);
	let autoDeploymentTimer: ReturnType<typeof setInterval> | null = null;
	let saveStatusTimer: ReturnType<typeof setInterval> | null = null;
	let pageVisibilityHandler: (() => void) | null = null;
	let reducedMotionQuery: MediaQueryList | null = null;
	let reducedMotionHandler: ((event: MediaQueryListEvent) => void) | null = null;

	// Cosmetic killstreak state — purely visual HUD chip, no economy / combat tie-in.
	let killstreakCount = $state(0);
	let killstreakTier = $state(-1);
	// Boss-wave intro flash overlay (~0.7s) triggered on wave change.
	let bossIntroWave = $state(0);
	let bossIntroKey = $state(0);

	// HP ratio for the low-HP vignette overlay (driven by snapshot, not engine internals).
	const hpRatio = $derived(snap?.runActive && snap.towerMaxHp > 0 ? snap.towerHp / snap.towerMaxHp : 1);
	const isCriticalHP = $derived(snap?.runActive === true && hpRatio < 0.3);
	const isSevereHP = $derived(snap?.runActive === true && hpRatio < 0.15);

	const toasts = createToastStore(2200);
	const toast = toasts.push;

	onMount(() => {
		const cm = () => { isMobile = window.innerWidth < 900; };
		cm(); window.addEventListener('resize', cm);
		reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		systemReducedMotion = reducedMotionQuery.matches;
		reducedMotionHandler = (event) => {
			systemReducedMotion = event.matches;
			syncSettingsToEngine(settings);
		};
		reducedMotionQuery.addEventListener('change', reducedMotionHandler);
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; syncSettingsToEngine(s); });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		const u6 = loadedStore.subscribe(l => saveLoaded = l);
		const u7 = saveStatusStore.subscribe(status => saveStatus = status);
		// Community buff: subscribe for the live percent and refresh the cache if stale.
		const u5 = communityBuffStore.subscribe(s => { currentBuffPercent = s.percent; });
		void communityBuffStore.refreshIfStale();
		saveStatusTimer = setInterval(() => { saveStatusNow = Date.now(); }, 30000);
		const cachedSave = getCachedSave();
		if (cachedSave?.selectedFront) selectedFront = cachedSave.selectedFront;
		if (cachedSave?.frontBestWave) frontBestWave = { ...cachedSave.frontBestWave };
		if (cachedSave?.schematicsByFront) schematicsByFront = { ...cachedSave.schematicsByFront };
		if (cachedSave?.challengeHighScores) challengeHighScores = { ...cachedSave.challengeHighScores };
		window.addEventListener('keydown', onKey);
		window.addEventListener('keyup', onKeyUp);
		document.addEventListener('visibilitychange', pageVisibilityHandler = () => {
			if (settings.pauseOnHide && document.visibilityState === 'hidden' && engine?.state.runActive && !engine.isPaused()) {
				engine.togglePause();
				refreshSnap();
			}
		});

		// Restore engine if it exists in the store (from previous visit)
		const unsubEngine = engineStore.subscribe(e => {
			if (e && !engine) {
				engine = e;
				if (container && !gameView) {
					pixiReady = false;
					pixiError = '';
					gameView = new PixiGameView(container, e, {
						onReady: () => pixiReady = true,
						onError: (error) => pixiError = error.message,
						onContextRestored: () => { pixiError = ''; pixiReady = true; },
					});
					engine.wireMuzzleFlash(() => gameView?.triggerMuzzleFlash());
					wireAudio();
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
			window.removeEventListener('keyup', onKeyUp);
			u1(); u2(); u3(); u4(); u5(); u6(); u7(); unsubEngine();
		};
	});

	onDestroy(() => {
		clearAutoDeployment();
		if (saveStatusTimer) clearInterval(saveStatusTimer);
		if (pageVisibilityHandler) document.removeEventListener('visibilitychange', pageVisibilityHandler);
		if (reducedMotionQuery && reducedMotionHandler) reducedMotionQuery.removeEventListener('change', reducedMotionHandler);
		if (engine) {
			engine.state.paused = true;
			engine.setCallbacks({});
			engineStore.set(engine);
		}
		gameView?.stop();
		gameView?.destroy();
		gameView = null;
		toasts.clear();
	});

	function onKey(e: KeyboardEvent) {
		audio.unlock();
		if (e.key === 'Shift') { shiftHeld = true; updateBuyMultiplier(); return; }
		if (e.key === 'Control' || e.key === 'Meta') { ctrlHeld = true; updateBuyMultiplier(); return; }
		if (!engine) return;
		if (e.key === ' ') {
			if (shouldIgnoreGameplayShortcut()) return;
			e.preventDefault();
			handleSpeed(0);
		}
		if (e.key === '1') handleSpeed(1);
		if (e.key === '2') handleSpeed(2);
		if (e.key === '3') handleSpeed(3);
		if (e.key === '4') handleSpeed(4);
	}

	function shouldIgnoreGameplayShortcut(): boolean {
		const el = document.activeElement;
		if (!(el instanceof HTMLElement)) return false;
		if (el === document.body) return false;
		const tag = el.tagName.toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a'
			|| el.isContentEditable || el.tabIndex >= 0;
	}

	function trapDialogKeydown(e: KeyboardEvent, close: () => void) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key !== 'Tab') return;
		const root = e.currentTarget;
		if (!(root instanceof HTMLElement)) return;
		const focusable = Array.from(root.querySelectorAll<HTMLElement>(
			'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
		)).filter(el => el.offsetParent !== null);
		if (focusable.length === 0) return;
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (showImportDialog) tick().then(() => importDialogEl?.focus());
		if (showResetConfirm) tick().then(() => resetDialogEl?.focus());
	});

	function onKeyUp(e: KeyboardEvent) {
		if (e.key === 'Shift') { shiftHeld = false; updateBuyMultiplier(); }
		if (e.key === 'Control' || e.key === 'Meta') { ctrlHeld = false; updateBuyMultiplier(); }
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
			bossActive: false, bossHp: 0, bossMaxHp: 0,
			bossesDefeated: st.bossesDefeated,
		};
		const boss = engine.getActiveBoss();
		if (boss) { snap.bossActive = true; snap.bossHp = boss.hp; snap.bossMaxHp = boss.maxHp; }
		speed = engine.speedMultiplier;
		paused = engine.isPaused();
		// Cosmetic killstreak — feed HUD chip from authoritative engine state.
		const ks = st.killstreak;
		if (ks) {
			killstreakCount = ks.count;
			killstreakTier = getKillstreakTier(ks.count);
		}
	}

	function syncSettingsToEngine(s: GameSettings): void {
		// Audio reflects settings even before an engine exists.
		audio.setSfxEnabled(s.sfx);
		audio.setMusicEnabled(s.music);
		if (!engine) return;
		const stateSettings = engine.state.settings;
		stateSettings.reducedMotion = s.reducedMotion || systemReducedMotion;
		stateSettings.screenShake = s.screenShake;
		stateSettings.particles = s.particles;
		stateSettings.damageNumbers = s.damageNumbers;
		stateSettings.lowEffectsMode = s.lowEffectsMode;
		stateSettings.sfx = s.sfx;
		stateSettings.music = s.music;
		stateSettings.bloom = s.bloom;
	}

	/** Connect an engine to the audio system. */
	function wireAudio(): void {
		engine?.setSoundHandler((name) => audio.play(name));
	}

	/** Quick toggle from the top bar; persists like any other setting. */
	function warnIfAudioBlocked(): boolean {
		if (audio.unlock()) return false;
		toast(audio.getLastError() ?? 'Audio is unavailable in this browser.', 'warning', 5000);
		return true;
	}

	function toggleSfx() {
		const blocked = warnIfAudioBlocked();
		updateSetting('sfx', !blocked && !settings.sfx);
	}

	function toggleMusic() {
		const blocked = warnIfAudioBlocked();
		updateSetting('music', !blocked && !settings.music);
	}

	function setSfx(on: boolean) {
		updateSetting('sfx', on && !warnIfAudioBlocked());
	}

	function setMusic(on: boolean) {
		updateSetting('music', on && !warnIfAudioBlocked());
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
						notifications.notify({ kind: 'boss', title: 'Boss sighted', detail: `Wave ${st.wave.currentWave}` });
						audio.play('bossWarning');
						// Brief one-shot boss intro flash overlay (CSS, ~700ms).
						bossIntroWave = st.wave.currentWave;
						bossIntroKey++;
					}
					// Boss defeated detection
					if (st.bossesDefeated > prevBossCount && prevBossCount > 0) {
						const flavor = getOpLogMessage('bossDefeated');
						if (flavor) toast('💥 ' + flavor, 'success');
						notifications.notify({ kind: 'boss', title: 'Boss defeated', detail: flavor ?? undefined, icon: '💥' });
					}
					prevWave = st.wave.currentWave;
					prevBossCount = st.bossesDefeated;
					audio.tick(st);
				}
				refreshSnap();
			},
			onStateChange: () => { refreshSnap(); },
			onGameOver: async (geoCoins: number, _w: number) => {
				const finishedRunToken = reportingRunToken;
				if (finishedRunToken !== activeRunToken) return;
				refreshSnap();
				audio.play('gameOver');
				gameOverCoins = geoCoins;
				gameOverWave = _w;
				gameOverKills = engine?.state.killCount ?? 0;
				gameOverBosses = engine?.state.bossesDefeated ?? 0;
				gameOverCash = engine?.state.cash ?? 0;
				gameOverSchematics = 0;
				gameOverFrontName = '';
				gameOverKillstreak = engine?.state.killstreak?.best ?? 0;
				showGameOver = true;
				const save = getCachedSave();
				if (save && engine) {
					const isNewBest = engine.state.highestWave > save.highestWave;
					const runCoinsEarned = Math.max(0, engine.state.coins - coinsAtRunStart);

					// ── Community Alloy Boost (Ko-fi community buff) ──
					// Applies additively to THIS run's Alloy income only, as a global
					// multiplier. Clamped to 0..100 on the client; server caps at +100%.
					// Energy / Strange Matter / Schematics / Command Orders are untouched.
					const buffedEarned = applyCommunityBuff(runCoinsEarned, currentBuffPercent);
					const communityBuffBonus = buffedEarned - runCoinsEarned;

					save.totalCoins = engine.state.coins + communityBuffBonus;
					save.totalRuns = engine.state.totalRuns;
					save.highestWave = Math.max(save.highestWave, engine.state.highestWave);

					save.totalKills += engine.state.killCount;
					save.totalBossesDefeated += engine.state.bossesDefeated;
					save.totalShiniesKilled += engine.state.shiniesKilled;
					save.totalAlloyEarned += buffedEarned;
					save.bestKillstreak = Math.max(save.bestKillstreak ?? 0, engine.state.killstreak?.best ?? 0);

					if (communityBuffBonus > 0) {
						gameOverCoins += communityBuffBonus;
						coinsStore.set(save.totalCoins);
						toast('🛰️ Community Alloy Boost — +' + communityBuffBonus.toLocaleString() + ' Alloy', 'success');
					}

					// Aggregate per-run kill counts into lifetime save stats
					if (engine.state.killsByType) {
						for (const [type, count] of Object.entries(engine.state.killsByType)) {
							const key = type as EnemyType;
							save.killsByType = save.killsByType ?? {};
							save.killsByType[key] = (save.killsByType[key] ?? 0) + (count ?? 0);
						}
					}
					if (engine.state.shinyKillsByType) {
						for (const [type, count] of Object.entries(engine.state.shinyKillsByType)) {
							const key = type as EnemyType;
							save.shinyKillsByType = save.shinyKillsByType ?? {};
							save.shinyKillsByType[key] = (save.shinyKillsByType[key] ?? 0) + (count ?? 0);
						}
					}
					save.totalEnergyEarned = (save.totalEnergyEarned ?? 0) + (engine.state.totalEnergyEarned ?? 0);
					save.totalDamageDealt = (save.totalDamageDealt ?? 0) + engine.state.totalDamageDealt;
					save.totalCritsDealt = (save.totalCritsDealt ?? 0) + (engine.state.critsDealt ?? 0);
					save.totalWavesCompleted = (save.totalWavesCompleted ?? 0) + Math.max(0, engine.state.wave.currentWave - 1);
					save.totalPlayTimeSeconds = (save.totalPlayTimeSeconds ?? 0) + Math.floor(engine.state.elapsedTime);

					// Check mastery achievements
					const newMasteryRewards = checkMasteryAchievements(save.masteryAchievements ?? {}, save.killsByType ?? {});
					if (newMasteryRewards.length > 0) {
						save.masteryAchievements = save.masteryAchievements ?? {};
						for (const reward of newMasteryRewards) {
							save.masteryAchievements[reward.key] = true;
							save.totalCoins += reward.alloy;
							gameOverCoins += reward.alloy;
							toast('🏅 ' + reward.name + ' — +' + reward.alloy.toLocaleString() + ' Alloy!', 'milestone');
							notifications.notify({ kind: 'achievement', title: reward.name, detail: `+${reward.alloy.toLocaleString()} Alloy`, icon: '🏅' });
						}
						coinsStore.set(save.totalCoins);
					}

					const reachedWave = engine.state.wave.currentWave;
					const runChallenge = engine.state.activeChallenge;
					let schematicsThisRun = 0;

					// Challenge runs track their own high score, not front progression
					if (runChallenge) {
						const prevHs = save.challengeHighScores?.[runChallenge] ?? 0;
						const newHs = Math.max(prevHs, reachedWave);
						save.challengeHighScores = { ...(save.challengeHighScores ?? {}), [runChallenge]: newHs };
						challengeHighScores = { ...save.challengeHighScores };
						if (newHs > prevHs && prevHs > 0) { toast('🏆 New high score on ' + runChallenge + ': Wave ' + newHs, 'milestone'); notifications.notify({ kind: 'bestWave', title: 'New high score', detail: `${runChallenge}: Wave ${newHs}` }); }
					} else {
						// Per-front best wave — gates sequential front unlocks.
						const frontPrev = save.frontBestWave?.[save.selectedFront] ?? 0;
						const newFrontBest = Math.max(frontPrev, reachedWave);
						save.frontBestWave = { ...(save.frontBestWave ?? {}), [save.selectedFront]: newFrontBest };
						const justUnlocked = getUnlockedFronts(save.frontBestWave).length > getUnlockedFronts(frontBestWave).length;
						frontBestWave = { ...save.frontBestWave };
						if (justUnlocked) { toast('🌍 ' + getOpLogMessage('frontUnlocked', { name: getFrontName(save.selectedFront) }), 'milestone'); notifications.notify({ kind: 'frontUnlock', title: 'New Front unlocked', detail: 'Check the Deploy screen' }); }
						else if (newFrontBest > frontPrev && frontPrev > 0) notifications.notify({ kind: 'bestWave', title: 'New best wave', detail: `${getFrontName(save.selectedFront)}: Wave ${newFrontBest}` });

						// ── Schematic rewards (Part 5) — non-challenge runs only ──
						const frontNum = getTierNumber(save.selectedFront);
						gameOverFrontName = getFrontName(save.selectedFront);
						save.schematicsByFront = normalizeSchematics(save.schematicsByFront);
						// Repeatable: each boss has a wave-scaled chance to drop Schematics.
						const bossesThisRun = engine.state.bossesDefeated;
						if (bossesThisRun > 0) {
							for (let bossIndex = 1; bossIndex <= bossesThisRun; bossIndex++) {
								const bossWave = bossIndex * 10;
								const bossReward = rollBossSchematicReward(frontNum, bossWave);
								if (bossReward > 0) {
									schematicsThisRun += bossReward;
									addSchematics(save.schematicsByFront, frontNum, bossReward);
								}
							}
						}
						// One-time: first-time wave milestones on this Front.
						save.claimedSchematicMilestones = Array.isArray(save.claimedSchematicMilestones) ? save.claimedSchematicMilestones : [];
						const milestoneAwards = pendingMilestoneSchematics(frontNum, newFrontBest, save.claimedSchematicMilestones);
						for (const award of milestoneAwards) {
							schematicsThisRun += award.amount;
							addSchematics(save.schematicsByFront, frontNum, award.amount);
							save.claimedSchematicMilestones = [...save.claimedSchematicMilestones, award.key];
							toast('📐 +' + award.amount + ' ' + gameOverFrontName + ' Schematics — Wave ' + award.wave + ' first clear', 'milestone');
						}
						gameOverSchematics = schematicsThisRun;
						schematicsByFront = { ...save.schematicsByFront };
					}

					// Count only the Field upgrades BOUGHT this run, excluding the
					// permanent Forge starting levels seeded at deployment.
					const bLevels = engine.state.battleUpgrades;
					const forgeSeed = seedBattleUpgradesFromForge(save.forgeUpgrades);
					let runTotal = 0;
					for (const v of Object.values(bLevels)) { runTotal += v as number; }
					let seedTotal = 0;
					for (const v of Object.values(forgeSeed)) { seedTotal += v as number; }
					const runFieldUpgrades = Math.max(0, runTotal - seedTotal);
					save.totalFieldUpgradesPurchased += runFieldUpgrades;

					// ── Weekly Orbital Command Order counters (Alloy assignments) ──
					// Roll over to this week first (a run may have crossed the week boundary),
					// then fold this deployment's metrics into the week's counters.
					save.commandOrders = rolloverCommandOrders(save.commandOrders, commandOrdersWeekKey());
					let defenseUpgradesBought = 0;
					for (const u of BATTLE_UPGRADES) {
						if (u.category !== 'defense') continue;
						defenseUpgradesBought += Math.max(0, (bLevels[u.id] ?? 0) - (forgeSeed[u.id] ?? 0));
					}
					const firstDmgWave = engine.state.firstTowerDamageWave;
					const cleanWave = firstDmgWave > 0 ? firstDmgWave - 1 : reachedWave;
					save.commandOrders.counters = applyCounterDeltas(save.commandOrders.counters, {
						deployments: 1,
						maxWave: reachedWave,
						shapesKilled: engine.state.killCount,
						fastKills: engine.state.killsByType?.[EnemyType.Fast] ?? 0,
						tankKills: engine.state.killsByType?.[EnemyType.Tank] ?? 0,
						bossKills: engine.state.bossesDefeated,
						fieldUpgrades: runFieldUpgrades,
						energySpent: engine.state.energySpentThisRun,
						energyEarned: engine.state.totalEnergyEarned,
						alloyEarned: runCoinsEarned,
						bestKillstreak: engine.state.killstreak?.best ?? 0,
						noDamageWave: Math.max(0, cleanWave),
						defenseUpgrades: defenseUpgradesBought,
						highestFrontDeploys: deployedOnHighestFront ? 1 : 0,
					});

					// Check achievements
					const claimedIds = new Set<AchievementId>();
					const ach = save.achievements;
					for (const [id, val] of Object.entries(ach)) {
						if (val) claimedIds.add(id as AchievementId);
					}
					const earned = checkAchievements(claimedIds,
						{
							totalRuns: save.totalRuns,
							bestWave: save.highestWave,
							totalKills: save.totalKills,
							bossesDefeated: save.totalBossesDefeated,
							fieldUpgradesPurchased: save.totalFieldUpgradesPurchased,
							totalAlloyEarned: save.totalAlloyEarned,
							bestKillstreak: save.bestKillstreak,
						},
					);
					let totalReward = 0;
					for (const a of earned) {
						(save.achievements as Record<string, boolean>)[a.id] = true;
						save.totalCoins += a.reward;
						totalReward += a.reward;
						toast('🏆 ' + a.name + ' — +' + a.reward.toLocaleString() + ' Alloy!', 'milestone');
						notifications.notify({ kind: 'achievement', title: a.name, detail: `+${a.reward.toLocaleString()} Alloy` });
						playForNotification('achievement');
					}
					if (totalReward > 0) {
						gameOverCoins += totalReward;
					}

					const realTimeSeconds = runStartedAtMs > 0
						? Math.max(0, (Date.now() - runStartedAtMs) / 1000)
						: Math.max(0, engine.state.elapsedTime);
					const report = createDeploymentReport({
						front: getTierNumber(save.selectedFront),
						finalWave: reachedWave,
						realTimeSeconds,
						simulationTimeSeconds: engine.state.elapsedTime,
						towerLostTo: enemyTypeToReportLabel(engine.state.lastTowerDamageSource),
						alloyEarned: buffedEarned,
						schematicsEarned: schematicsThisRun,
						enemiesDestroyed: engine.state.killCount,
						bossesDestroyed: engine.state.bossesDefeated,
						damageDealt: engine.state.totalDamageDealt,
						towerDamageTaken: engine.state.towerDamageTaken,
						bestKillChain: engine.state.killstreak?.best ?? 0,
						communityBuffPercent: currentBuffPercent,
						communityBuffBonusAlloy: communityBuffBonus,
					});
					save.deploymentReports = addDeploymentReport(save.deploymentReports, report);

					coinsStore.set(save.totalCoins);
					highestWaveStore.set(save.highestWave);
					totalRunsStore.set(save.totalRuns);
					const persisted = await persistSave(save);
					if (finishedRunToken !== activeRunToken) return;
					if (persisted) {
						scheduleAutoDeployment(save.autoDeploymentEnabled === true && hasBlackMarketUnlock(save.blackMarketUnlocks, 'autoDeployment'));
						showSaveIndicator = true;
						setTimeout(() => { showSaveIndicator = false; }, 1500);
					} else {
						toast('Save failed. Deployment Report was not written.', 'error', 6000);
					}
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
				audio.play('milestone');
			},
		});
	}

	function clearAutoDeployment() {
		if (autoDeploymentTimer) clearInterval(autoDeploymentTimer);
		autoDeploymentTimer = null;
		autoDeploymentArmed = false;
		autoDeploymentCountdown = 0;
	}

	function scheduleAutoDeployment(enabled: boolean) {
		clearAutoDeployment();
		if (!enabled || showImportDialog || showResetConfirm || showSettings) return;
		autoDeploymentArmed = true;
		autoDeploymentCountdown = 5;
		autoDeploymentTimer = setInterval(() => {
			autoDeploymentCountdown -= 1;
			if (autoDeploymentCountdown <= 0) {
				clearAutoDeployment();
				if (!showImportDialog && !showResetConfirm && !showSettings) startRun();
			}
		}, 1000);
	}

	function cancelAutoDeployment() {
		clearAutoDeployment();
		toast('Auto Deployment cancelled.', 'info');
	}

	function initEngine() {
		if (engine) engine.cleanup();
		if (gameView) { gameView.destroy(); gameView = null; }
		engine = new GameEngine();
		engineStore.set(engine);
		wireEngineCallbacks();
		// Cosmetic killstreak: on tier cross, spawn a floating "Chain xN" above
		// the tower, colour-escalated to match the chip theme, plus a tactile
		// milestone ping. Purely feedback — no resources, no damage, no multipliers.
		engine.setKillstreakMilestoneHandler((count) => {
			if (!engine) return;
			const tx = engine.state.tower.position.x;
			const ty = engine.state.tower.position.y - 55;
			// Escalation palette tracks the chip's data-tier theme exactly.
			const color =
				count >= 1000 ? 0xFF8A2B :
				count >= 500  ? 0x8844FF :
				count >= 100  ? 0xFF66BB :
				count >= 50   ? GAME_CONFIG.NEON_PINK :
				count >= 25   ? GAME_CONFIG.NEON_YELLOW :
				GAME_CONFIG.NEON_CYAN;
			engine.addDamageNumber(tx, ty, `Chain x${count}`, color, 'chain');
			audio.play('milestone');
		});
		if (!container) return;
		pixiReady = false;
		pixiError = '';
		gameView = new PixiGameView(container, engine, {
			onReady: () => pixiReady = true,
			onError: (error) => pixiError = error.message,
			onContextRestored: () => { pixiError = ''; pixiReady = true; },
		});
		engine.wireMuzzleFlash(() => gameView?.triggerMuzzleFlash());
		wireAudio();
		gameView.start();
	}

	function startRun() {
		if (!saveLoaded) {
			toast('Save still loading. Deployment will be ready in a moment.', 'info');
			return;
		}
		if (!engine) initEngine();
		if (!engine) return;
		// Re-wire callbacks before every run: checkGameOver() sets onGameOver=null
		// after firing, so a reused engine would never trigger the game-over panel
		// on subsequent deployments.
		wireEngineCallbacks();
		clearAutoDeployment();
		showLaunchScreen = false;
		showGameOver = false;
		showMobileUpgrades = false;
		speed = 1; paused = false;
		audio.unlock();
		audio.play('waveStart');
		coinsAtRunStart = coins;
		runStartedAtMs = Date.now();
		activeRunToken++;
		reportingRunToken = activeRunToken;
		const save = getCachedSave();
		// Clamp the chosen front to what's actually unlocked, then persist it.
		if (!unlockedFronts.includes(selectedFront)) selectedFront = TierId.Tier1;
		// Record whether this is the highest unlocked Front (daily-task tracking).
		deployedOnHighestFront = unlockedFronts.length > 0 && selectedFront === unlockedFronts[unlockedFronts.length - 1];
		if (save) { save.selectedFront = selectedFront; persistSave(save); }
		const unlockedBPs = (save?.unlockedBlueprints ?? []) as import('$lib/game/engine/gameTypes').BlueprintId[];
		// Validate challenge is still unlocked (defensive — selection persists across sessions)
		const validChallenge = selectedChallenge && isChallengeUnlocked(selectedChallenge, frontBestWave) ? selectedChallenge : null;
		engine.startRun(save?.workshopUpgrades ?? {}, save?.forgeUpgrades ?? {}, save?.labLevels ?? {}, coins, unlockedBPs, getTierNumber(selectedFront), validChallenge, save?.killsByType ?? {});
		syncSettingsToEngine(save?.settings ?? { ...DEFAULT_SETTINGS });
		gameView?.start();
		refreshSnap();
		toast('▶ ' + getOpLogMessage('deploymentStart'), 'success');
	}

	function handleSpeed(preset: number) {
		if (!engine) return;
		if (preset === 0) {
			engine.togglePause();
			toast(engine.isPaused() ? getOpLogMessage('pauseGame') : getOpLogMessage('resumeGame'), 'info');
		} else {
			const spds = GAME_CONFIG.SPEED_PRESETS;
			const sp = spds[preset - 1] ?? 1;
			const maxSpeed = getMaxUnlockedSpeed(getCachedSave()?.blackMarketUnlocks);
			if (sp > maxSpeed) {
				toast(sp + 'x speed requires Black Market procurement.', 'warning');
				return;
			}
			engine.setSpeed(sp);
			toast(getOpLogMessage('speedChange', { speed: sp }), 'info');
		}
		refreshSnap();
	}

	function isSpeedLocked(sp: number): boolean {
		return sp > getMaxUnlockedSpeed(getCachedSave()?.blackMarketUnlocks);
	}

	function buyBattleUpgrade(id: UpgradeId) {
		if (!engine) return;
		const upgradeDef = BATTLE_UPGRADES.find(u => u.id === id);
		const upgradeName = upgradeDef?.name ?? '';
		const maxLv = upgradeDef?.maxLevel ?? 99;
		const initialLv = engine.state.battleUpgrades[id] ?? 0;
		if (initialLv >= maxLv) { toast(getOpLogMessage('upgradeMaxLevel'), 'warning'); return; }

		let bought = 0;
		const target = buyMultiplier === 'max' ? maxLv : Math.min(initialLv + buyMultiplier, maxLv);

		for (let i = initialLv; i < target; i++) {
			if (engine.buyBattleUpgrade(id)) bought++;
			else break;
		}

		if (bought > 0) {
			audio.play('upgrade');
			refreshSnap();
			purchasedUpgrade = id;
			setTimeout(() => { purchasedUpgrade = null; }, 400);
			const newLv = initialLv + bought;
			toast('⬆ ' + upgradeName + ' → Lv.' + newLv + (bought > 1 ? ' (+' + bought + ')' : ''), 'success');
		} else {
			toast(getOpLogMessage('upgradeNotEnough'), 'error');
		}
	}

	async function handleExportSave() {
		const s = await exportSave();
		const copied = await writeClipboardText(s);
		toast(copied ? getOpLogMessage('saveExported') : 'Save exported, but clipboard access was blocked.', copied ? 'success' : 'warning');
	}

	function handleResetSave() {
		clearAutoDeployment();
		activeRunToken++;
		runStartedAtMs = 0;
		showGameOver = false;
		showLaunchScreen = true;
		gameView?.stop();
		engine?.cleanup();
		engine = null;
		engineStore.set(null);
		if (gameView) { gameView.destroy(); gameView = null; }
		snap = null;
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ ...DEFAULT_SETTINGS });
			toast(getOpLogMessage('saveReset'), 'warning');
		});
	}

	function replayDeploymentTutorial() {
		try {
			localStorage.removeItem(PLAY_TUTORIAL_KEY);
		} catch {
			// Storage may be blocked; remounting still replays this session.
		}
		tutorialReplayKey++;
		toast('Deployment tutorial restarted.', 'info');
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

	function formatRelativeTime(timestamp: number | null): string {
		if (!timestamp) return 'not saved yet';
		const seconds = Math.max(0, Math.floor((saveStatusNow - timestamp) / 1000));
		if (seconds < 5) return 'just now';
		if (seconds < 60) return seconds + 's ago';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return minutes + 'm ago';
		const hours = Math.floor(minutes / 60);
		return hours + 'h ago';
	}

	function saveIndicatorText(): string {
		if (saveStatus.writeFailed) {
			return saveStatus.message ?? 'Save failed. Progress may not be stored.';
		}
		if (saveStatus.lastSuccessfulWriteAt) {
			return 'Last saved ' + formatRelativeTime(saveStatus.lastSuccessfulWriteAt);
		}
		return saveLoaded ? 'Save ready' : 'Save loading';
	}
</script>

<svelte:head>
	<title>Deployment — Flatland TD · FLTD</title>
	<meta name="description" content="Deploy a tower into Flatland. Harvest energy for field upgrades, refine alloy for permanent upgrades." />
	<script type="application/ld+json">{JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'VideoGame',
		name: 'Flatland TD',
		applicationCategory: 'Game',
		operatingSystem: 'Any',
		description: 'Open source neon cyber idle tower defense. Deploy towers, fight endless waves of geometric enemies, and upgrade your arsenal.',
		url: 'https://tower.koalastuff.net/play/',
		author: { '@type': 'Person', name: 'Timo' },
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		playMode: 'SinglePlayer',
		gamePlatform: 'Web Browser',
	})}</script>
</svelte:head>

<div class="play-layout" role="main">
	<Toasts controller={toasts} vertical="top" offsetRem={3} />

	<!-- Top Bar -->
	<header class="topbar">
		<a href="/" class="tb-back" aria-label="Home" title="Home"><Icon name="back" size={18} /></a>
		<h1 class="tb-brand">Flatland TD</h1>
		<div class="tb-div"></div>
	<div class="tb-stats">
		{#if snap?.runActive}
			<div class="tb-pill wave-pill" title="Current wave number"><Icon name="wave" size={15} /><span use:countUp={snap.wave}>{snap.wave}</span></div>
		{/if}
		<div class="tb-pill coin-pill" use:tooltip={'Alloy — permanent material.\nKept between runs, spent in the Forge & Research Deck.'}><Icon name="alloy" size={15} />{#if saveLoaded}<span use:countUp={coins}>{coins.toLocaleString()}</span>{:else}<span>Loading</span>{/if}</div>
		{#if snap?.runActive}
			<div class="tb-pill cash-pill" use:tooltip={'Energy — this run only.\nHarvested from destroyed enemies, spent on Field Upgrades.\nResets when the tower falls.'}><Icon name="energy" size={15} /><span use:countUp={Math.floor(snap.cash)}>{Math.floor(snap.cash).toLocaleString()}</span></div>
			<div class="tb-pill hp-pill" class:low={snap.towerHp / snap.towerMaxHp < 0.3} use:tooltip={'Tower HP — the run ends when this reaches 0.'}><Icon name="hp" size={15} /><span>{Math.ceil(snap.towerHp)}</span><span class="tb-max">/{snap.towerMaxHp}</span></div>
			<div class="tb-pill kill-pill" title="Total enemies killed this run"><Icon name="kill" size={15} /><span use:countUp={snap.killCount}>{snap.killCount}</span></div>
		{/if}
	</div>
		<div class="tb-actions">
			{#if snap?.runActive}
				<div class="spd-grp" title="Game speed — also: keys 1-4, Space to pause">
					<div class="spd-col">
						<button class="spd-btn spd-icon" class:on={paused} onclick={() => handleSpeed(0)} title="Pause (Space)" aria-label="Pause"><Icon name={paused ? 'play' : 'pause'} size={13} /></button>
						<kbd class="hud-kbd">Space</kbd>
					</div>
					{#each [1,2,3] as s}
						<div class="spd-col">
							<button class="spd-btn spd-n" class:on={!paused && speed === s} class:locked={isSpeedLocked(s)} onclick={() => handleSpeed(s)} use:tooltip={isSpeedLocked(s) ? `🔒 ${s}× speed\nUnlocked via a Black Market procurement.\nVisit Orbital Command → Black Market.` : `${s}× game speed\nShortcut: press ${s}`}>{isSpeedLocked(s) ? '🔒' : s + '×'}</button>
							<kbd class="hud-kbd">{s}</kbd>
						</div>
					{/each}
					<div class="spd-col">
						<button class="spd-btn spd-n" class:on={!paused && speed === 5} class:locked={isSpeedLocked(5)} onclick={() => handleSpeed(4)} use:tooltip={isSpeedLocked(5) ? '🔒 5× speed\nUnlocked via a Black Market procurement.\nVisit Orbital Command → Black Market.' : '5× game speed\nShortcut: press 4'}>{isSpeedLocked(5) ? '🔒' : '5×'}</button>
						<kbd class="hud-kbd">4</kbd>
					</div>
					<div class="spd-status" class:paused={paused}>{paused ? '❚❚' : speed + '×'}</div>
				</div>
			{/if}
			<button class="ibtn" class:off={!settings.sfx} onclick={toggleSfx} aria-label="Toggle sound effects" use:tooltip={`Sound effects: ${settings.sfx ? 'ON' : 'OFF'}\nCombat & UI sounds. Click to toggle.`}><Icon name={settings.sfx ? 'soundOn' : 'soundOff'} size={17} /></button>
			<button class="ibtn" class:off={!settings.music} onclick={toggleMusic} aria-label="Toggle music" use:tooltip={`Music: ${settings.music ? 'ON' : 'OFF'}\nAmbient background loop. Click to toggle.`}><Icon name={settings.music ? 'musicOn' : 'musicOff'} size={17} /></button>
			<button class="ibtn" onclick={replayDeploymentTutorial} aria-label="Replay deployment tutorial" use:tooltip={'Replay the deployment tutorial on this page.'}><Icon name="help" size={17} /></button>
			<div class="save-indicator" class:saving={showSaveIndicator} class:failed={saveStatus.writeFailed} role="status" aria-label={saveIndicatorText()} title={saveIndicatorText()}></div>
			<div class="sv-wrap">
				<button class="ibtn" onclick={() => showSaveMenu = !showSaveMenu} aria-label="Save menu" title="Export / Import / Reset save data"><Icon name="save" size={17} /></button>
				{#if showSaveMenu}
					<div class="sv-drop">
						<button onclick={() => { handleExportSave(); showSaveMenu = false; }}><Icon name="export" size={15} /> Export</button>
						<button onclick={() => { showImportDialog = true; showSaveMenu = false; }}><Icon name="import" size={15} /> Import</button>
						<button onclick={() => { showResetConfirm = true; showSaveMenu = false; }}><Icon name="reset" size={15} /> Reset</button>
						<button onclick={() => { showSaveMenu = false; }}><Icon name="close" size={15} /> Close</button>
					</div>
				{/if}
			</div>
			<div class="sv-wrap">
				<button class="ibtn" onclick={() => showSettings = !showSettings} aria-label="Settings" title="Visual & performance settings"><Icon name="settings" size={17} /></button>
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
						<label class="set-row" title="Neon glow post-processing">
							<span>Neon Bloom</span>
							<input type="checkbox" checked={settings.bloom} onchange={(e) => updateSetting('bloom', (e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Combat & UI sounds">
							<span>Sound Effects</span>
							<input type="checkbox" checked={settings.sfx} onchange={(e) => setSfx((e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Ambient background loop">
							<span>Music</span>
							<input type="checkbox" checked={settings.music} onchange={(e) => setMusic((e.target as HTMLInputElement).checked)} />
						</label>
						<label class="set-row" title="Show real-time frames per second (FPS) counter">
							<span>Show FPS</span>
							<input type="checkbox" checked={settings.showFps} onchange={(e) => updateSetting('showFps', (e.target as HTMLInputElement).checked)} />
						</label>
					</div>
				{/if}
			</div>
			<NotificationCenter />
			<a href="/hub" class="hub-link" aria-label="Orbital Command" use:tooltip={'Orbital Command — Forge, Research Deck, Schematics, Fronts, Archives.'}><Icon name="hub" size={18} /></a>
		</div>
	</header>

	<!-- ===== Tutorial ===== -->
	{#key tutorialReplayKey}
		<Tutorial steps={playTutorialSteps} tutorialKey={PLAY_TUTORIAL_KEY} />
	{/key}

	<!-- Mobile Speed Bar -->
	{#if isMobile && snap?.runActive}
		<div class="mob-spd">
			<button class="mob-spd-main" onclick={() => showMobileSpeed = !showMobileSpeed} aria-label="Speed: {paused ? 'Paused' : speed + '×'}. Tap to change.">
				<Icon name={paused ? 'pause' : 'play'} size={15} />
				<span>{paused ? '❚❚' : speed + '×'}</span>
			</button>
			{#if showMobileSpeed}
				<div class="mob-spd-popup" role="menu">
					<button class="mob-spd-opt" class:on={paused} onclick={() => { handleSpeed(0); showMobileSpeed = false; }}>⏸ Pause</button>
					{#each [1,2,3] as s}<button class="mob-spd-opt" class:on={!paused && speed === s} class:locked={isSpeedLocked(s)} onclick={() => { handleSpeed(s); showMobileSpeed = false; }}>{isSpeedLocked(s) ? '🔒' : s + '×'}</button>{/each}
					<button class="mob-spd-opt" class:on={!paused && speed === 5} class:locked={isSpeedLocked(5)} onclick={() => { handleSpeed(4); showMobileSpeed = false; }}>{isSpeedLocked(5) ? '🔒' : '5×'}</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Game Over -->
	{#if showGameOver}
		<GameOverPanel
			wave={gameOverWave}
			best={highestWave}
			coins={gameOverCoins}
			kills={gameOverKills}
			bosses={gameOverBosses}
			cash={gameOverCash}
			schematics={gameOverSchematics}
			frontName={gameOverFrontName}
			killstreak={gameOverKillstreak}
			{autoDeploymentArmed}
			{autoDeploymentCountdown}
			onCancelAutoDeployment={cancelAutoDeployment}
			onRedeploy={startRun}
			onExport={handleExportSave}
		/>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay">
			<div bind:this={importDialogEl} class="dlg" role="dialog" aria-modal="true" aria-label="Import save" tabindex="-1" onkeydown={(e) => trapDialogKeydown(e, () => { showImportDialog = false; importText = ''; })}>
				<h3>📂 Import Save</h3>
				<p class="dlg-d">Paste your save JSON below.</p>
				<textarea bind:value={importText} rows={5}></textarea>
				<div class="dlg-a">
					<button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); importText = ''; } else { toast(r.error ?? getOpLogMessage('saveImportFailed'), 'error', 6000); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button>
					<button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay">
			<div bind:this={resetDialogEl} class="dlg dlg-dng" role="dialog" aria-modal="true" aria-label="Reset save" tabindex="-1" onkeydown={(e) => trapDialogKeydown(e, () => showResetConfirm = false)}>
				<h3>🗑 Reset Save?</h3>
				<p class="dlg-d">This will erase all Alloy, Forge upgrades, Schematics, Research Deck progress, Front progress, and settings. Cannot be undone.</p>
				<div class="dlg-a">
					<button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button>
					<button class="dlg-dng-btn" onclick={handleResetSave}>Reset</button>
				</div>
			</div>
		</div>
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
							{:else}<div class="pe">Start a run. The war waits for nobody. Especially not Accounting.</div>{/if}
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

	<!-- Game Canvas -->
	<div class="game-canvas" bind:this={container} role="img" aria-label="Flatland TD — game viewport showing Tower defense against hostile geometric shapes">
		{#if pixiError}
			<div class="pixi-status pixi-error" role="alert">
				<strong>Renderer unavailable</strong>
				<span>{pixiError}</span>
			</div>
		{:else if !pixiReady && !showLaunchScreen}
			<div class="pixi-status loading-screen" role="status" aria-live="polite">
				<div class="loading-scanner"></div>
				<span class="pixi-spinner-neon"></span>
				<span class="loading-title">INITIALIZING QUANTUM CORE</span>
				<span class="loading-subtitle">Establishing secure link to Flatland...</span>
			</div>
		{/if}
		{#if settings.showFps && snap?.runActive}
			<div class="fps-counter" role="status" aria-live="off">
				{fps} FPS
			</div>
		{/if}
		<!-- Low-HP vignette overlay (CSS — above canvas, below HUD panels). Pulses
		     red when tower HP < 30%, stronger + faster when < 15%. -->
		<div
			class="vignette"
			class:critical={isCriticalHP}
			class:severe={isSevereHP}
			class:reduced={settings.reducedMotion || settings.lowEffectsMode}
			aria-hidden="true"
		></div>

		<!-- Boss wave intro flash. {#key} re-triggers the CSS animation each time
		     bossIntroKey increments so back-to-back boss waves re-play cleanly. -->
		{#if bossIntroWave > 0}
			<div class="boss-intro-host" aria-hidden="true">
				{#key bossIntroKey}
					<div class="boss-intro" class:reduced={settings.reducedMotion || settings.lowEffectsMode}>
						<div class="boss-intro-label">⚠ BOSS WAVE ⚠</div>
						<div class="boss-intro-wave">// Wave {bossIntroWave}</div>
					</div>
				{/key}
			</div>
		{/if}

		<!-- Critical HP warning chip — small, lives above vignette so it isn't washed out. -->
		{#if isCriticalHP && snap?.runActive}
			<div class="hp-warn" class:flicker={isSevereHP && !settings.reducedMotion} aria-live="polite">
				<span class="hp-warn-dot"></span>
				Tower integrity critical
			</div>
		{/if}

		<!-- Cosmetic killstreak counter — top-right, appears at chain ≥ 5.
		     2.5D comic / cell-shaded badge with a smoothly counting number, a
		     tier-up "POW" burst at each milestone (10/25/50/100/500/1k/5k/10k),
		     and escalating fire from tier 6 (1000+). Never grants anything; the
		     best streak is saved for achievements. -->
		{#if killstreakCount >= 5 && snap?.runActive}
			<KillstreakCounter
				count={killstreakCount}
				tier={killstreakTier}
				reduced={settings.reducedMotion || settings.lowEffectsMode}
			/>
		{/if}

		<!-- Live run info lives in the bottom-left (Tower) / bottom-right (Shapes) panels
		     and the top bar — the canvas itself is kept clear. -->
		{#if snap?.bossActive && snap.bossMaxHp > 0}
			<BossHealthBar hp={snap.bossHp} maxHp={snap.bossMaxHp} wave={snap.wave} />
		{/if}
		{#if paused && snap?.runActive}
			<div class="pause-overlay" aria-live="polite">
				<span class="pause-icon">❚❚</span>
				<span>PAUSED</span>
			</div>
		{/if}
		<TowerStatsPanel {snap} />
		<EnemyStatsPanel {snap} />
		{#if showLaunchScreen}
			<LaunchScreen
				{saveLoaded}
				{highestWave}
				{coins}
				{totalRuns}
				bind:selectedFront
				bind:selectedChallenge
				{unlockedFronts}
				{frontBestWave}
				{schematicsByFront}
				{challengeHighScores}
				onDeploy={startRun}
			/>
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
								<FieldUpgrades {snap} bind:upgradeCategory bind:buyMultiplier purchasedId={purchasedUpgrade} onBuy={buyBattleUpgrade} />
								<div class="hub-shortcut"><a href="/hub">⚙ Forge · Research · Archives →</a></div>
							{:else}<div class="pe">Start a run to buy upgrades. The tower arrives pre-configured with mild disappointment.</div>{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- Mobile: battle upgrades drawer + nav -->
	{#if isMobile}
		<nav class="mn">
			<button class="mnb" class:on={!showMobileUpgrades} onclick={() => showMobileUpgrades = false} title="Game canvas view"><span class="mni"><Icon name="range" size={20} /></span><span class="mnl">Game</span></button>
			<button class="mnb" class:on={showMobileUpgrades} onclick={() => showMobileUpgrades = !showMobileUpgrades} title="Battle Upgrades panel"><span class="mni"><Icon name="offense" size={20} /></span><span class="mnl">Upgrades</span></button>
			<a href="/hub" class="mnb" title="Orbital Command — Forge, Research, Archives"><span class="mni"><Icon name="hub" size={20} /></span><span class="mnl">Orbital</span></a>
		</nav>
		{#if showMobileUpgrades && snap?.runActive}
			<div class="mob-upgrade-drawer">
				<div class="mob-ug-header">
					<span>⚡ Field Upgrades</span>
					<button class="mob-ug-close" onclick={() => showMobileUpgrades = false}>✕</button>
				</div>
				<FieldUpgrades {snap} bind:upgradeCategory bind:buyMultiplier scrollList purchasedId={purchasedUpgrade} onBuy={buyBattleUpgrade} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.play-layout { display:flex; flex-direction:column; height:100vh; height:100dvh; overflow:hidden; background:var(--bg-primary); user-select:none; }
	.fps-counter { position:absolute; top:12px; left:12px; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--cyan); background:rgba(0,0,0,0.6); border:1px solid var(--border-neon); padding:2px 6px; border-radius:var(--radius-xs); z-index:10; pointer-events:none; text-shadow:0 0 4px rgba(0,255,255,0.4); }
	.topbar { display:flex; align-items:center; padding:.3rem .65rem; gap:.4rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); z-index:100; flex-shrink:0; position:relative; }
	.tb-back { color:var(--text-dim); font-size:var(--fs-icon-md); text-decoration:none; padding:.1rem .3rem; border-radius:var(--radius-sm); transition:all var(--transition-fast); line-height:1; }
	.tb-back:hover { color:var(--cyan); background:rgba(0,255,255,.06); }
	.tb-brand { font-family:var(--font-display); font-weight:700; font-size:var(--fs-icon-md); letter-spacing:.04em; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; white-space:nowrap; margin:0; }
	.tb-div { width:1px; height:16px; background:var(--border-neon); flex-shrink:0; }
	.tb-stats { display:flex; gap:.25rem; align-items:center; margin-left:auto; }
	.tb-pill { display:flex; align-items:center; gap:.2rem; padding:.15rem .5rem; font-size:var(--fs-mono); font-family:var(--font-mono); border-radius:100px; background:var(--bg-tertiary); border:1px solid var(--border-neon); }
	.tb-max { color:var(--text-secondary); font-size:var(--fs-caption-sm); }
	.wave-pill span:last-child { color:var(--cyan); }
	.coin-pill span:last-child { color:var(--yellow); }
	.cash-pill span:last-child { color:var(--green); }
	.hp-pill span:nth-child(2) { color:#FF9988; }
	.hp-pill.low span:nth-child(2) { color:#FF4444; animation:hpDanger 0.5s ease-in-out infinite; }
	@keyframes hpDanger { 0%,100%{opacity:1} 50%{opacity:0.5} }
	.kill-pill span:last-child { color:var(--violet); }
	.spd-grp { display:flex; gap:1px; align-items:flex-start; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:12px; padding:2px; }
	.spd-status { font-size:var(--fs-caption); color:var(--cyan); font-family:var(--font-mono); padding:0 .25rem; align-self:center; }
	.spd-status.paused { color:var(--yellow); }
	.spd-col { display:flex; flex-direction:column; align-items:center; gap:2px; }
	.hud-kbd { font-family:var(--font-mono); font-size:7px; color:var(--text-dim); background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-bottom:1.5px solid rgba(255,255,255,.12); border-radius:2px; padding:0 2px; text-transform:uppercase; pointer-events:none; }
	.save-indicator { width:8px; height:8px; border-radius:50%; background:rgba(68,255,136,0); transition:all .3s ease; flex-shrink:0; }
	.save-indicator.saving { background:rgba(68,255,136,0.6); box-shadow:0 0 6px rgba(68,255,136,0.4); }
	.save-indicator.failed { background:rgba(255,68,68,.75); box-shadow:0 0 8px rgba(255,68,68,.55); }
	.spd-btn { padding:.15rem .4rem; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:100px; transition:all var(--transition-fast); line-height:1; cursor:pointer; }
	.spd-btn:hover { color:var(--text-secondary); background:rgba(255,255,255,.04); }
	.spd-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); }
	.spd-btn.locked,.mob-spd-opt.locked { color:var(--text-dim); opacity:.7; }
	.spd-n { min-width:1.5rem; text-align:center; }
	.tb-actions { display:flex; gap:.2rem; align-items:center; }
	.pause-overlay { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:82; display:flex; align-items:center; gap:.55rem; padding:.7rem 1rem; border:1px solid rgba(255,221,68,.45); border-radius:var(--radius-md); background:rgba(7,8,18,.72); color:var(--yellow); font-family:var(--font-display); font-size:var(--fs-icon-md); font-weight:800; letter-spacing:.08em; box-shadow:0 0 28px rgba(255,221,68,.14); pointer-events:none; }
	.pause-icon { font-family:var(--font-mono); font-size:var(--fs-icon-lg); line-height:1; }
	.ibtn { display:inline-flex; align-items:center; justify-content:center; padding:.25rem; border-radius:var(--radius-sm); color:var(--text-secondary); transition:all var(--transition-fast); font-size:var(--fs-icon-md); line-height:1; cursor:pointer; }
	.ibtn:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.ibtn.off { color:var(--text-dim); opacity:.55; }
	.spd-icon { display:inline-flex; align-items:center; justify-content:center; }
	.tb-pill :global(.icon) { opacity:.75; }
	.sv-wrap { position:relative; }
	.sv-drop { position:absolute; top:calc(100% + 4px); right:0; min-width:150px; background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-md); z-index:200; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.5); animation:fi .12s ease; }
	.sv-drop button { display:block; width:100%; min-height:44px; padding:.55rem .9rem; font-size:var(--fs-body); text-align:left; color:var(--text-secondary); transition:all var(--transition-fast); }
	.sv-drop button:hover { background:rgba(0,255,255,.06); color:var(--text-primary); }
	.settings-drop { min-width:220px; padding:.3rem 0; }
	.set-row { display:flex; justify-content:space-between; align-items:center; min-height:44px; padding:.5rem .9rem; font-size:var(--fs-body-sm); color:var(--text-secondary); cursor:pointer; }
	.set-row:hover { background:rgba(0,255,255,.04); }
	.set-row input[type=checkbox] { width:16px; height:16px; accent-color:var(--cyan); cursor:pointer; }
	.hub-link { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); font-size:var(--fs-body); text-decoration:none; transition:all var(--transition-fast); }
	.hub-link:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.mob-spd { display:flex; align-items:center; gap:2px; padding:.3rem .4rem; background:rgba(7,8,18,.9); border-bottom:1px solid var(--border-neon); flex-shrink:0; position:relative; }
	.mob-spd-main { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .75rem; min-width:64px; min-height:44px; font-size:var(--fs-body); font-family:var(--font-mono); color:var(--cyan); background:rgba(0,255,255,.08); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; }
	.mob-spd-popup { display:flex; gap:3px; margin-left:.3rem; animation:fi .15s ease; }
	.mob-spd-opt { padding:.4rem .55rem; min-width:44px; min-height:44px; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-dim); background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); }
	.mob-spd-opt.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }
	.mob-spd-opt:hover { color:var(--text-primary); }
	.game-body { flex:1; display:flex; overflow:hidden; position:relative; }
	.game-canvas { flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-primary); }
	.pixi-status { position:absolute; inset:0; z-index:4; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.6rem; color:var(--text-secondary); font-family:var(--font-display); background:radial-gradient(circle at center, rgba(0,255,255,.05), transparent 45%); pointer-events:none; text-align:center; padding:1rem; }
	.pixi-status strong { color:var(--red); text-transform:uppercase; letter-spacing:.06em; }
	.pixi-error { z-index:90; background:rgba(38,8,12,.86); color:var(--text-primary); }
	@keyframes pixiSpin { to { transform:rotate(360deg); } }

	/* High-fidelity neon loading screen overlay */
	.loading-screen {
		position: absolute;
		inset: 0;
		/* Stay below the launch screen (z-index:10) so it can never cover or
		   trap clicks on the Deploy button. The overlay is purely a status
		   display while Pixi initialises — it must not intercept pointer input. */
		z-index: 4;
		background: radial-gradient(circle at center, #0F143A, #050610);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		pointer-events: none;
	}
	.loading-title {
		font-family: var(--font-tech);
		font-size: var(--fs-body);
		font-weight: 700;
		color: var(--cyan);
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
		letter-spacing: 0.1em;
		animation: pulse-glow 1.5s ease-in-out infinite alternate;
	}
	.loading-subtitle {
		font-family: var(--font-mono);
		font-size: var(--fs-caption);
		color: var(--text-dim);
	}
	.pixi-spinner-neon {
		width: 48px;
		height: 48px;
		border: 2px solid rgba(0, 255, 255, 0.05);
		border-left-color: var(--cyan);
		border-right-color: var(--blue);
		border-radius: 50%;
		animation: pixiSpin 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
	}
	.loading-scanner {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: linear-gradient(to right, transparent, var(--cyan), transparent);
		box-shadow: 0 0 8px var(--cyan);
		animation: scan-line 2.5s ease-in-out infinite;
	}
	@keyframes pulse-glow {
		from { opacity: 0.7; text-shadow: 0 0 8px rgba(0, 255, 255, 0.3); }
		to { opacity: 1; text-shadow: 0 0 20px rgba(0, 255, 255, 0.7); }
	}
	@keyframes scan-line {
		0% { top: 0%; opacity: 0; }
		10% { opacity: 1; }
		90% { opacity: 1; }
		100% { top: 100%; opacity: 0; }
	}
	.game-body { --safe-edge-gap: max(.45rem, env(safe-area-inset-left, 0px)); --drawer-handle-offset:.35rem; }
	.panel { display:flex; flex-direction:column; background:var(--bg-glass); border-left:1px solid var(--border-neon); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); position:relative; transition:width var(--transition-normal); width:265px; flex-shrink:0; overflow:visible; z-index:5; }
	.panel.coll { width:calc(42px + var(--safe-edge-gap)); }
	.left { border-left:none; border-right:1px solid var(--border-neon); }
	.ptog { position:absolute; top:var(--drawer-handle-offset); z-index:6; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--text-dim); font-size:var(--fs-caption); padding:.3rem .4rem; min-width:40px; min-height:40px; cursor:pointer; transition:all var(--transition-fast); line-height:1; display:inline-flex; align-items:center; justify-content:center; }
	.left .ptog { right:var(--drawer-handle-offset); } .right .ptog { left:var(--drawer-handle-offset); }
	.panel.coll.left .ptog { right:var(--safe-edge-gap); }
	.panel.coll.right .ptog { left:var(--safe-edge-gap); }
	.ptog:hover { background:rgba(0,255,255,.12); color:var(--cyan); }
	.ptog:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
	.pc { padding:.6rem; overflow-y:auto; flex:1; height:100%; display:flex; flex-direction:column; gap:.15rem; }
	.ps { margin-bottom:.3rem; }
	.pst { display:flex; align-items:center; gap:.25rem; font-size:var(--fs-mono); color:var(--cyan); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.35rem; padding-bottom:.25rem; border-bottom:1px solid rgba(0,255,255,.08); }
	.right .ps:first-child .pst { padding-left:3rem; }
	.left  .ps:first-child .pst { padding-right:3rem; }
	.psd { height:1px; background:linear-gradient(90deg,var(--border-neon),transparent); margin:.15rem 0 .35rem; }
	.pe { color:var(--text-secondary); font-size:var(--fs-body); font-style:italic; padding:.35rem 0; }
	.ig { display:grid; gap:1px; }
	.ir { display:flex; justify-content:space-between; padding:.14rem .3rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); } .iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	.hp-iv { color:var(--green); } .cash-iv { color:var(--green); } .im { color:var(--text-dim); font-size:var(--fs-caption); }
	.hub-shortcut { margin-top:.5rem; text-align:center; font-size:var(--fs-caption); }
	.hub-shortcut a { color:var(--text-secondary); text-decoration:none; transition:all var(--transition-fast); }
	.hub-shortcut a:hover { color:var(--cyan); }
	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.dlg { background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-xl); padding:1.75rem; max-width:400px; width:100%; animation:si .25s ease; }
	.dlg h3 { font-size:var(--fs-subheading); margin-bottom:.4rem; }
	.dlg-d { color:var(--text-secondary); font-size:var(--fs-body-sm); margin-bottom:.85rem; }
	.dlg textarea { width:100%; margin-bottom:.85rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.5rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); resize:vertical; }
	.dlg-a { display:flex; gap:.5rem; justify-content:center; }
	.dlg-p,.dlg-s,.dlg-dng-btn { padding:.5rem 1.2rem; border-radius:var(--radius-sm); font-weight:600; font-size:var(--fs-btn-sm); cursor:pointer; transition:all var(--transition-fast); }
	.dlg-p { background:var(--cyan); color:var(--bg-primary); }
	.dlg-s { background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.dlg-dng-btn { background:var(--red); color:white; }
	.dlg-dng { border-color:rgba(255,68,68,.2); }
	.mn { display:flex; background:rgba(7,8,18,.96); border-top:1px solid var(--border-neon); flex-shrink:0; z-index:100; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); padding-bottom: env(safe-area-inset-bottom, 0px); }
	.mnb { flex:1; display:flex; flex-direction:column; align-items:center; padding:.5rem .05rem; font-size:var(--fs-caption-sm); color:var(--text-secondary); text-decoration:none; gap:3px; position:relative; transition:all .15s ease; min-height:44px; }
	.mnb.on { color:var(--cyan); }
	.mnb.on::after { content:''; position:absolute; top:0; left:25%; right:25%; height:2px; background:var(--cyan); border-radius:0 0 2px 2px; box-shadow:0 0 8px rgba(0,255,255,.4); }
	.mni { font-size:var(--fs-icon-lg); } .mnl { font-size:var(--fs-caption-sm); font-weight:500; }
	.mob-upgrade-drawer { position:fixed; bottom:var(--mob-nav-h,48px); left:0; right:0; max-height:60vh; background:var(--bg-secondary); border-top:1px solid var(--border-neon-strong); border-radius:var(--radius-xl) var(--radius-xl) 0 0; z-index:150; overflow-y:auto; padding:.5rem .65rem .75rem; padding-bottom: calc(.75rem + env(safe-area-inset-bottom, 0px)); animation:mobDrawerIn .25s cubic-bezier(.34,1.56,.64,1); box-shadow:0 -8px 32px rgba(0,0,0,.5); }
	.mob-ug-header { display:flex; justify-content:space-between; align-items:center; font-size:var(--fs-caption); color:var(--cyan); font-family:var(--font-mono); margin-bottom:.35rem; }
	.mob-ug-close { color:var(--text-dim); font-size:var(--fs-body-sm); padding:.1rem .3rem; cursor:pointer; }

	/* ─── Low-HP vignette ───────────────────────────────────────────────── */
	/* Red radial-gradient overlay on the canvas. Pulses while HP < 30%,
	   pulses faster + brighter while < 15%. Disabled (opacity 0) otherwise.
	   `pointer-events:none` so it never blocks interaction. */
	.vignette { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .35s ease; z-index:6;
		background:radial-gradient(ellipse at center, transparent 35%, rgba(255,40,80,0.18) 80%, rgba(255,40,80,0.35) 100%);
		mix-blend-mode:screen; }
	.vignette.critical { opacity:1; animation:vignettePulse 1.4s ease-in-out infinite; }
	.vignette.severe   { opacity:1; animation:vignettePulse .7s  ease-in-out infinite; background:radial-gradient(ellipse at center, transparent 25%, rgba(255,40,80,0.30) 70%, rgba(255,40,80,0.55) 100%); }
	.vignette.reduced.critical, .vignette.reduced.severe { animation:none; opacity:.7; }
	@keyframes vignettePulse { 0%,100%{opacity:.55} 50%{opacity:1} }

	/* ─── Boss-wave intro flash ─────────────────────────────────────────── */
	/* One-shot centered overlay shown for ~700ms when a boss wave starts.
	   Purely additive — does not block input (pointer-events:none). */
	.boss-intro-host { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:7; }
	.boss-intro { text-align:center; font-family:var(--font-tech); text-transform:uppercase; letter-spacing:.18em;
		color:var(--pink); text-shadow:0 0 16px rgba(255,68,170,.7), 0 0 36px rgba(255,68,170,.4);
		animation:bossIntro .85s cubic-bezier(.22,1,.36,1) forwards; }
	.boss-intro.reduced { animation:bossIntroReduced .5s ease forwards; }
	.boss-intro-label { font-size:clamp(1.2rem, 3vw, 2rem); font-weight:700; }
	.boss-intro-wave { font-size:clamp(.9rem, 2vw, 1.25rem); color:var(--text-secondary); margin-top:.35rem; letter-spacing:.25em; }
	@keyframes bossIntro {
		0%   { opacity:0; transform:scale(.85); }
		15%  { opacity:1; transform:scale(1.05); }
		25%  { transform:scale(1); }
		75%  { opacity:1; }
		100% { opacity:0; transform:scale(1.02); }
	}
	@keyframes bossIntroReduced { from{opacity:0} 30%{opacity:1} to{opacity:0} }

	/* ─── Critical HP warning chip ──────────────────────────────────────── */
	.hp-warn { position:absolute; top:18%; left:50%; transform:translateX(-50%);
		display:inline-flex; align-items:center; gap:.4rem; padding:.3rem .75rem;
		font-family:var(--font-mono); font-size:var(--fs-caption); font-weight:600;
		color:var(--red); background:rgba(7,8,18,.85); border:1px solid rgba(255,68,68,.45);
		border-radius:100px; z-index:8; pointer-events:none;
		box-shadow:0 0 14px rgba(255,68,68,.25);
		animation:hpWarnIn .25s ease; }
	.hp-warn.flicker { animation:hpWarnFlicker .55s ease-in-out infinite; }
	.hp-warn-dot { width:8px; height:8px; border-radius:50%; background:var(--red); box-shadow:0 0 8px var(--red); }
	@keyframes hpWarnIn { from{opacity:0; transform:translate(-50%,-6px)} to{opacity:1; transform:translate(-50%,0)} }
	@keyframes hpWarnFlicker { 0%,100%{opacity:1} 50%{opacity:.55} }


	@keyframes fi { from{opacity:0} to{opacity:1} }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
	@keyframes mobDrawerIn { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
	@media(min-width:900px){ .mn,.mob-spd,.mob-upgrade-drawer{display:none} }
	@media(max-width:899px){
		.topbar{padding:.2rem .3rem;gap:.2rem}
		.tb-brand{font-size:var(--fs-caption)}
		.tb-div{display:none}
		.tb-pill{padding:.1rem .35rem;font-size:var(--fs-caption-sm);gap:.12rem}
		.tb-stats{flex-wrap:wrap;gap:.12rem}
		.tb-max{display:none}
		.spd-grp{display:none}
		.save-indicator{display:none}
		.ibtn{min-width:44px;min-height:44px;padding:.4rem}
		.ptog{min-width:44px;min-height:44px}
		:root{--mob-nav-h:48px}
	}
</style>
