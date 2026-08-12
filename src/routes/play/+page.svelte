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
	import { alloyStore, settingsStore, highestWaveStore, totalRunsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { applyCommunityBuff, communityBuffStore } from '$lib/online/communityBuffClient';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';
	import { checkAchievements } from '$lib/game/balance/achievements';
	import { engineStore } from '$lib/stores/gameStore';
	import { fieldPanelOpen } from '$lib/stores/uiLayoutPrefs';
	import { audio } from '$lib/game/audio/AudioManager';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';
	import { notifications } from '$lib/stores/notificationStore';
	import { saveStatusStore, type SaveStatus } from '$lib/stores/saveStatusStore';
	import { playForNotification } from '$lib/game/audio/uiSounds';
	import { loadLocalIdentity } from '$lib/online/localIdentity';
	import { submitUnverifiedLeaderboard } from '$lib/online/leaderboardClient';
	import { calculateUnverifiedScore } from '$lib/game/balance/communityLeaderboard';
	import { APP_VERSION } from '$lib/version';
	import NotificationCenter from '$lib/components/NotificationCenter.svelte';
	import FieldUpgrades from '$lib/components/play/FieldUpgrades.svelte';
	import HudOverlays from '$lib/components/play/HudOverlays.svelte';
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
	// Right Field Upgrades panel open/closed — persisted across runs via localStorage.
	let showLaunchScreen = $state(true);
	let showGameOver = $state(false);
	let gameOverAlloy = $state(0);
	let gameOverWave = $state(0);
	let gameOverKills = $state(0);
	let gameOverBosses = $state(0);
	let gameOverCash = $state(0);
	let gameOverKillstreak = $state(0);
	let gameOverCommunityScore = $state(0);
	let communityLeaderboardEligible = $state(false);
	let communityLeaderboardStatus = $state<'idle' | 'submitting' | 'submitted' | 'offline' | 'error'>('idle');
	let communityLeaderboardMessage = $state('');
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
	let showMobileMenu = $state(false);

	let touchStartY = 0;
	let touchEndY = 0;
	let touchStartX = 0;
	let touchEndX = 0;
	let currentTranslateY = $state(0);
	let currentTranslateX = $state(0);
	let drawerElement = $state<HTMLDivElement | null>(null);

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;
		touchStartY = touch.clientY;
		touchEndY = touch.clientY;
		touchStartX = touch.clientX;
		touchEndX = touch.clientX;
		if (drawerElement) {
			drawerElement.style.transition = 'none';
		}
	}

	function handleTouchMove(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;
		touchEndY = touch.clientY;
		touchEndX = touch.clientX;
		const diffY = touchEndY - touchStartY;
		const diffX = touchEndX - touchStartX;

		const isLandscape = window.innerWidth > window.innerHeight;

		if (isLandscape) {
			if (diffX > 0) {
				currentTranslateX = diffX;
				if (drawerElement) {
					drawerElement.style.transform = `translateX(${diffX}px)`;
				}
			}
		} else {
			if (diffY > 0) {
				currentTranslateY = diffY;
				if (drawerElement) {
					drawerElement.style.transform = `translateY(${diffY}px)`;
				}
			}
		}
	}

	function handleTouchEnd() {
		if (drawerElement) {
			drawerElement.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
			const isLandscape = window.innerWidth > window.innerHeight;

			if (isLandscape) {
				const diffX = touchEndX - touchStartX;
				if (diffX > 80) {
					showMobileUpgrades = false;
				} else {
					drawerElement.style.transform = 'translateX(0)';
				}
			} else {
				const diffY = touchEndY - touchStartY;
				if (diffY > 80) {
					showMobileUpgrades = false;
				} else {
					drawerElement.style.transform = 'translateY(0)';
				}
			}
		}
		currentTranslateY = 0;
		currentTranslateX = 0;
	}

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
		if (fpsActive) {
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
	// Stable boolean so the FPS effect isn't torn down every frame (snap is
	// reassigned each frame; depending on it directly reset the counter to 0).
	const fpsActive = $derived(settings.showFps && snap?.runActive === true && !paused);
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
	// True while a live (non-game-over) run is in progress. Used to make the
	// top-right control pause in place rather than navigate away mid-run.
	const inRun = $derived(snap?.runActive === true && snap?.gameOver !== true);

	const toasts = createToastStore(2200);
	const toast = toasts.push;

	onMount(() => {
		const cm = () => { isMobile = window.innerWidth < 900; };
		cm(); window.addEventListener('resize', cm);

		// Keep the renderer's camera centred when the viewport OR the canvas area
		// changes size (window resize, orientation flip, side-panel collapse). A
		// ResizeObserver on the canvas host catches container-only changes that a
		// window 'resize' event would miss; gameView.resize() recentres the world.
		let resizeObserver: ResizeObserver | null = null;
		if (container && typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => gameView?.resize());
			resizeObserver.observe(container);
		}
		reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		systemReducedMotion = reducedMotionQuery.matches;
		reducedMotionHandler = (event) => {
			systemReducedMotion = event.matches;
			syncSettingsToEngine(settings);
		};
		reducedMotionQuery.addEventListener('change', reducedMotionHandler);
		const u1 = alloyStore.subscribe(c => coins = c);
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
					// Resume gameplay music if we're returning to a live (paused) run.
					if (engine.state.runActive && !engine.state.gameOver) audio.setMusicActive(true);
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
			resizeObserver?.disconnect();
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
		audio.setMusicActive(false); // silence gameplay music while away from the play screen
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
		stateSettings.haptics = s.haptics;
		stateSettings.graphicsQuality = s.graphicsQuality;
		stateSettings.colorblind = s.colorblind;
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
						haptic([0, 45, 35, 45]); // double buzz: incoming boss
						// Brief one-shot boss intro flash overlay (CSS, ~700ms).
						bossIntroWave = st.wave.currentWave;
						bossIntroKey++;
					}
					// Boss defeated detection
					if (st.bossesDefeated > prevBossCount && prevBossCount > 0) {
						const flavor = getOpLogMessage('bossDefeated');
						if (flavor) toast('💥 ' + flavor, 'success');
						notifications.notify({ kind: 'boss', title: 'Boss defeated', detail: flavor ?? undefined, icon: '💥' });
						haptic(70); // solid thump: boss down
					}
					prevWave = st.wave.currentWave;
					prevBossCount = st.bossesDefeated;
					audio.tick(st);
				}
				refreshSnap();
			},
			onStateChange: () => { refreshSnap(); },
			onGameOver: async (alloyEarned: number, _w: number) => {
				const finishedRunToken = reportingRunToken;
				if (finishedRunToken !== activeRunToken) return;
				refreshSnap();
				audio.setMusicActive(false); // stop the ambient pad + boss drone when the tower falls
				audio.play('gameOver');
				haptic([0, 90, 50, 140]); // heavy double thump: the tower has fallen
				gameOverAlloy = alloyEarned;
				gameOverWave = _w;
				gameOverKills = engine?.state.killCount ?? 0;
				gameOverBosses = engine?.state.bossesDefeated ?? 0;
				gameOverCash = engine?.state.cash ?? 0;
				gameOverSchematics = 0;
				gameOverFrontName = '';
				gameOverKillstreak = engine?.state.killstreak?.best ?? 0;
				const completedRun = engine?.state;
				communityLeaderboardEligible = completedRun != null && completedRun.activeChallenge === null && _w > 0;
				gameOverCommunityScore = completedRun
					? calculateUnverifiedScore({
						front: getTierNumber(selectedFront),
						wave: _w,
						kills: completedRun.killCount,
						bosses: completedRun.bossesDefeated,
					})
					: 0;
				communityLeaderboardStatus = 'idle';
				communityLeaderboardMessage = '';
				showGameOver = true;
				const save = getCachedSave();
				if (save && engine) {
					const runEngine = engine;
					const isNewBest = engine.state.highestWave > save.highestWave;
					const runCoinsEarned = Math.max(0, engine.state.coins - coinsAtRunStart);

					// ── Community Alloy Boost (Ko-fi community buff) ──
					// Applies additively to THIS run's Alloy income only, as a global
					// multiplier. Clamped to 0..100 on the client; server caps at +100%.
					// Energy / Strange Matter / Schematics / Command Orders are untouched.
					const buffedEarned = applyCommunityBuff(runCoinsEarned, currentBuffPercent);
					const communityBuffBonus = buffedEarned - runCoinsEarned;

					save.totalAlloy = engine.state.coins + communityBuffBonus;
					save.totalRuns = engine.state.totalRuns;
					save.highestWave = Math.max(save.highestWave, engine.state.highestWave);

					save.totalKills += engine.state.killCount;
					save.totalBossesDefeated += engine.state.bossesDefeated;
					save.totalShiniesKilled += engine.state.shiniesKilled;
					save.totalAlloyEarned += buffedEarned;
					save.bestKillstreak = Math.max(save.bestKillstreak ?? 0, engine.state.killstreak?.best ?? 0);

					if (communityBuffBonus > 0) {
						gameOverAlloy += communityBuffBonus;
						alloyStore.set(save.totalAlloy);
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
							save.totalAlloy += reward.alloy;
							gameOverAlloy += reward.alloy;
							toast('🏅 ' + reward.name + ' — +' + reward.alloy.toLocaleString() + ' Alloy!', 'milestone');
							notifications.notify({ kind: 'achievement', title: reward.name, detail: `+${reward.alloy.toLocaleString()} Alloy`, icon: '🏅' });
						}
						alloyStore.set(save.totalAlloy);
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
								const bossReward = rollBossSchematicReward(frontNum, bossWave, () => runEngine.nextRandom());
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
						save.totalAlloy += a.reward;
						totalReward += a.reward;
						toast('🏆 ' + a.name + ' — +' + a.reward.toLocaleString() + ' Alloy!', 'milestone');
						notifications.notify({ kind: 'achievement', title: a.name, detail: `+${a.reward.toLocaleString()} Alloy` });
						playForNotification('achievement');
					}
					if (totalReward > 0) {
						gameOverAlloy += totalReward;
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

					alloyStore.set(save.totalAlloy);
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
				haptic(30); // light tick: wave milestone
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
		// Guard: if a run is already active (e.g. navigating back from hub),
		// just hide the launch screen — don't start a second deployment.
		if (engine.state.runActive && !engine.state.gameOver) {
			showLaunchScreen = false;
			return;
		}

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
		audio.setMusicActive(true); // gameplay music starts with the run
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
		engine.startRun(
			save?.workshopUpgrades ?? {},
			save?.forgeUpgrades ?? {},
			save?.labLevels ?? {},
			coins,
			unlockedBPs,
			getTierNumber(selectedFront),
			validChallenge,
			save?.killsByType ?? {},
			save?.selectedSkin ?? 'classic',
			save?.selectedBackground ?? 'void'
		);
		syncSettingsToEngine(save?.settings ?? { ...DEFAULT_SETTINGS });
		// Re-apply the player's last chosen game speed (clamped to what's unlocked).
		const prefSpeed = save?.preferredSpeed ?? 1;
		const maxSpeed = getMaxUnlockedSpeed(save?.blackMarketUnlocks);
		engine.setSpeed(Math.min(prefSpeed, maxSpeed) || 1);
		gameView?.start();
		refreshSnap();
		toast('▶ ' + getOpLogMessage('deploymentStart'), 'success');
	}

	// Top-right control. During a live run it pauses/resumes IN PLACE instead of
	// navigating to Orbital Command — leaving mid-run felt like an abort. A
	// deliberate exit is still one click away via the Field Upgrades → Orbital
	// Command link. Outside a run the icon navigates normally (anchor default).
	function onHubIconClick(e: MouseEvent) {
		if (inRun) {
			e.preventDefault();
			handleSpeed(0);
		}
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
			// Remember the chosen speed so the next deployment starts at it.
			const save = getCachedSave();
			if (save && save.preferredSpeed !== sp) { save.preferredSpeed = sp; persistSave(save); }
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
			haptic(15); // crisp tick: purchase confirmed
			refreshSnap();
			purchasedUpgrade = id;
			setTimeout(() => { purchasedUpgrade = null; }, 400);
			const newLv = initialLv + bought;
			toast('⬆ ' + upgradeName + ' → Lv.' + newLv + (bought > 1 ? ' (+' + bought + ')' : ''), 'success');
		} else {
			toast(getOpLogMessage('upgradeNotEnough'), 'error');
		}
	}

	async function submitCommunityLeaderboard() {
		if (!engine || !communityLeaderboardEligible || communityLeaderboardStatus === 'submitting' || communityLeaderboardStatus === 'submitted') return;
		const save = getCachedSave();
		if (!save) {
			communityLeaderboardStatus = 'error';
			communityLeaderboardMessage = 'Local save is not ready.';
			return;
		}

		communityLeaderboardStatus = 'submitting';
		communityLeaderboardMessage = '';
		const identity = loadLocalIdentity();
		const result = await submitUnverifiedLeaderboard({
			localPlayerId: identity.localPlayerId,
			displayName: identity.displayName,
			frontId: getTierNumber(save.selectedFront),
			wave: gameOverWave,
			score: gameOverCommunityScore,
			...(runStartedAtMs > 0 ? { runStartedAt: new Date(runStartedAtMs).toISOString() } : {}),
			runEndedAt: new Date().toISOString(),
			gameVersion: APP_VERSION || 'unknown',
		});

		if (result.ok) {
			communityLeaderboardStatus = 'submitted';
			communityLeaderboardMessage = 'Published as an unverified community run.';
		} else {
			communityLeaderboardStatus = result.offline ? 'offline' : 'error';
			communityLeaderboardMessage = result.message;
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
			alloyStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
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

	const QUALITY_KEYS = new Set<keyof GameSettings>(['bloom', 'particles', 'screenShake', 'damageNumbers', 'lowEffectsMode']);

	function updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
		const save = getCachedSave();
		if (!save) return;
		save.settings[key] = value;
		// Toggling any effect by hand drops the preset to 'custom' so the dropdown
		// never claims a preset that no longer matches the actual toggles.
		if (QUALITY_KEYS.has(key)) save.settings.graphicsQuality = 'custom';
		settingsStore.set({ ...save.settings });
		persistSave(save);
		if (engine) {
			engine.state.settings[key] = value;
			engine.state.settings.graphicsQuality = save.settings.graphicsQuality;
		}
	}

	/**
	 * Apply a graphics-quality preset: a macro over the individual effect toggles.
	 * Writes all affected keys + the preset name in one persisted batch so the
	 * dropdown and the underlying toggles stay in sync. 'high' = everything on,
	 * 'low' = bare minimum for weak devices, 'medium' = balanced.
	 */
	function applyQualityPreset(q: 'low' | 'medium' | 'high') {
		const save = getCachedSave();
		if (!save) return;
		const presets = {
			low:    { bloom: false, particles: false, screenShake: false, damageNumbers: true,  lowEffectsMode: true  },
			medium: { bloom: true,  particles: true,  screenShake: true,  damageNumbers: true,  lowEffectsMode: false },
			high:   { bloom: true,  particles: true,  screenShake: true,  damageNumbers: true,  lowEffectsMode: false },
		}[q];
		Object.assign(save.settings, presets, { graphicsQuality: q });
		settingsStore.set({ ...save.settings });
		persistSave(save);
		if (engine) syncSettingsToEngine(save.settings);
	}

	/**
	 * Fire a short vibration if haptics are enabled and the device supports it.
	 * Gracefully no-ops on desktop / unsupported browsers. Patterns are kept
	 * brief so they punctuate rather than distract.
	 */
	function haptic(pattern: number | number[]) {
		if (!settings.haptics) return;
		try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
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
	<Toasts controller={toasts} vertical="top" horizontal="left" offsetRem={3} />

	<!-- Dropdown save menu, settings menu, etc. -->
	<!-- Top Bar -->
	<!-- Handlers are containment guards (stop bubbling to the canvas), not an
	     interactive control — the landmark role is correct as-is. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<header class="topbar" class:mobile={isMobile} onclick={e => e.stopPropagation()} onkeydown={e => e.stopPropagation()} ontouchstart={e => e.stopPropagation()}>
		{#if !isMobile}
			<a href="/" class="tb-back" aria-label="Home" title="Home"><Icon name="back" size={18} /></a>
		{/if}
		<h1 class="tb-brand">Flatland TD</h1>
		<div class="tb-div"></div>
	<div class="tb-stats">
		{#if snap?.runActive}
			<div class="tb-pill wave-pill" title="Current wave number"><Icon name="wave" size={15} /><span use:countUp={snap.wave}>{snap.wave}</span></div>
		{/if}
		<div class="tb-pill alloy-pill" use:tooltip={'Alloy — permanent material.\nKept between runs, spent in the Forge & Research Deck.'}><Icon name="alloy" size={15} />{#if saveLoaded}<span use:countUp={coins}>{coins.toLocaleString()}</span>{:else}<span>Loading</span>{/if}</div>
		{#if snap?.runActive}
			{#if !isMobile}
				<div class="tb-pill cash-pill" use:tooltip={'Energy — this run only.\nHarvested from destroyed enemies, spent on Field Upgrades.\nResets when the tower falls.'}><Icon name="energy" size={15} /><span use:countUp={Math.floor(snap.cash)}>{Math.floor(snap.cash).toLocaleString()}</span></div>
			{/if}
			<div class="tb-pill hp-pill" class:low={snap.towerHp / snap.towerMaxHp < 0.3} use:tooltip={'Tower HP — the run ends when this reaches 0.'}><Icon name="hp" size={15} /><span>{Math.ceil(snap.towerHp)}</span><span class="tb-max">/{snap.towerMaxHp}</span></div>
			<div class="tb-pill kill-pill" title="Total enemies killed this run"><Icon name="kill" size={15} /><span use:countUp={snap.killCount}>{snap.killCount}</span></div>
		{/if}
	</div>
		<div class="tb-actions">
			{#if snap?.runActive && !isMobile}
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
			{#if isMobile && snap?.runActive}
				<div class="mob-spd">
					<button class="mob-spd-main" onclick={() => showMobileSpeed = !showMobileSpeed} aria-label="Speed: {paused ? 'Paused' : speed + '×'}. Tap to change.">
						<Icon name={paused ? 'pause' : 'play'} size={15} />
						<span>{paused ? '❚❚' : speed + '×'}</span>
					</button>
					{#if showMobileSpeed}
						<div class="mob-spd-popup" role="menu">
							<button class="mob-spd-opt" class:on={paused} onclick={() => { handleSpeed(0); showMobileSpeed = false; }} aria-label="Pause">❚❚</button>
							{#each [1,2,3] as s}<button class="mob-spd-opt" class:on={!paused && speed === s} class:locked={isSpeedLocked(s)} onclick={() => { handleSpeed(s); showMobileSpeed = false; }}>{isSpeedLocked(s) ? '🔒' : s + '×'}</button>{/each}
							<button class="mob-spd-opt" class:on={!paused && speed === 5} class:locked={isSpeedLocked(5)} onclick={() => { handleSpeed(4); showMobileSpeed = false; }}>{isSpeedLocked(5) ? '🔒' : '5×'}</button>
						</div>
					{/if}
				</div>
			{/if}
			{#if !isMobile}
				<button class="ibtn" class:off={!settings.sfx} onclick={toggleSfx} aria-label="Toggle sound effects" use:tooltip={`Sound effects: ${settings.sfx ? 'ON' : 'OFF'}\nCombat & UI sounds. Click to toggle.`}><Icon name={settings.sfx ? 'soundOn' : 'soundOff'} size={17} /></button>
				<button class="ibtn" class:off={!settings.music} onclick={toggleMusic} aria-label="Toggle music" use:tooltip={`Music: ${settings.music ? 'ON' : 'OFF'}\nAmbient background loop. Click to toggle.`}><Icon name={settings.music ? 'musicOn' : 'musicOff'} size={17} /></button>
				<button class="ibtn" onclick={replayDeploymentTutorial} aria-label="Replay deployment tutorial" use:tooltip={'Replay the deployment tutorial on this page.'}><Icon name="help" size={17} /></button>
			{/if}
			<div class="save-indicator" class:saving={showSaveIndicator} class:failed={saveStatus.writeFailed} role="status" aria-label={saveIndicatorText()} title={saveIndicatorText()}></div>
			{#if !isMobile}
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
							<label class="set-row set-select" title="Bundle of effect toggles. 'Custom' reflects hand-picked toggles below.">
								<span>Quality</span>
								<select value={settings.graphicsQuality} onchange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v === 'custom') return; applyQualityPreset(v as 'low' | 'medium' | 'high'); }}>
									<option value="custom" disabled={settings.graphicsQuality !== 'custom'}>Custom</option>
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
								</select>
							</label>
							<label class="set-row set-select" title="Colour-blind-safe enemy palette (shapes still differ)">
								<span>Colorblind</span>
								<select value={settings.colorblind} onchange={(e) => updateSetting('colorblind', (e.target as HTMLSelectElement).value as GameSettings['colorblind'])}>
									<option value="off">Off</option>
									<option value="deuteranopia">Deuteranopia</option>
									<option value="protanopia">Protanopia</option>
									<option value="tritanopia">Tritanopia</option>
								</select>
							</label>
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
							<label class="set-row" title="Vibration feedback on mobile devices">
								<span>Haptics</span>
								<input type="checkbox" checked={settings.haptics} onchange={(e) => updateSetting('haptics', (e.target as HTMLInputElement).checked)} />
							</label>
							<label class="set-row" title="Show real-time frames per second (FPS) counter">
								<span>Show FPS</span>
								<input type="checkbox" checked={settings.showFps} onchange={(e) => updateSetting('showFps', (e.target as HTMLInputElement).checked)} />
							</label>
						</div>
					{/if}
				</div>
				<NotificationCenter />
				<a
					href="/hub"
					class="hub-link"
					aria-label={inRun ? (paused ? 'Resume run' : 'Pause run') : 'Orbital Command'}
					use:tooltip={inRun
						? 'Pause / resume the run. To leave for Orbital Command, use the “→ Orbital Command” link under Field Upgrades.'
						: 'Orbital Command — Forge, Research Deck, Schematics, Fronts, Archives.'}
					onclick={onHubIconClick}
				><Icon name={inRun ? (paused ? 'play' : 'pause') : 'hub'} size={18} /></a>
			{/if}
			{#if isMobile}
				<button class="hamburger-btn" class:open={showMobileMenu} onclick={() => showMobileMenu = !showMobileMenu} aria-label={showMobileMenu ? 'Close menu' : 'Open menu'} title="Menu">
					<span class="hamburger-line"></span>
					<span class="hamburger-line"></span>
					<span class="hamburger-line"></span>
				</button>
			{/if}
		</div>
	</header>

	<!-- Mobile hamburger menu overlay -->
	{#if isMobile && showMobileMenu}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="hamburger-overlay" onclick={() => showMobileMenu = false} onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') showMobileMenu = false; }} role="button" tabindex="0" aria-label="Close menu"></div>
		<div class="hamburger-menu" role="menu" tabindex="-1" onclick={e => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') showMobileMenu = false; e.stopPropagation(); }} ontouchstart={e => e.stopPropagation()}>
			<div class="hamburger-menu-header">
				<span class="hamburger-menu-title">Menu</span>
				<button class="hamburger-menu-close" onclick={() => showMobileMenu = false} aria-label="Close menu">✕</button>
			</div>
			<div class="hamburger-menu-items">
				<a href="/" class="hm-item" onclick={() => showMobileMenu = false}><Icon name="back" size={16} /><span>Home</span></a>
				{#if snap?.runActive}
					<div class="hm-item hm-stat">
						<Icon name="energy" size={16} />
						<span>Energy</span>
						<span class="hm-val">{Math.floor(snap.cash).toLocaleString()}</span>
					</div>
				{/if}
				<button class="hm-item" class:off={!settings.sfx} onclick={() => { toggleSfx(); }}>
					<Icon name={settings.sfx ? 'soundOn' : 'soundOff'} size={16} />
					<span>Sound Effects</span>
					<span class="hm-toggle">{settings.sfx ? 'ON' : 'OFF'}</span>
				</button>
				<button class="hm-item" class:off={!settings.music} onclick={() => { toggleMusic(); }}>
					<Icon name={settings.music ? 'musicOn' : 'musicOff'} size={16} />
					<span>Music</span>
					<span class="hm-toggle">{settings.music ? 'ON' : 'OFF'}</span>
				</button>
				<button class="hm-item" onclick={() => { replayDeploymentTutorial(); showMobileMenu = false; }}>
					<Icon name="help" size={16} /><span>Replay Tutorial</span>
				</button>
				<button class="hm-item" onclick={() => { handleExportSave(); showMobileMenu = false; }}>
					<Icon name="export" size={16} /><span>Export Save</span>
				</button>
				<button class="hm-item" onclick={() => { showImportDialog = true; showMobileMenu = false; }}>
					<Icon name="import" size={16} /><span>Import Save</span>
				</button>
				<button class="hm-item hm-danger" onclick={() => { showResetConfirm = true; showMobileMenu = false; }}>
					<Icon name="reset" size={16} /><span>Reset Save</span>
				</button>
				<div class="hm-divider"></div>
				<div class="hm-section-title">Settings</div>
				<label class="hm-item hm-check">
					<span>Reduced Motion</span>
					<input type="checkbox" checked={settings.reducedMotion} onchange={(e) => updateSetting('reducedMotion', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Screen Shake</span>
					<input type="checkbox" checked={settings.screenShake} onchange={(e) => updateSetting('screenShake', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Particles</span>
					<input type="checkbox" checked={settings.particles} onchange={(e) => updateSetting('particles', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Damage Numbers</span>
					<input type="checkbox" checked={settings.damageNumbers} onchange={(e) => updateSetting('damageNumbers', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Low Effects</span>
					<input type="checkbox" checked={settings.lowEffectsMode} onchange={(e) => updateSetting('lowEffectsMode', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Neon Bloom</span>
					<input type="checkbox" checked={settings.bloom} onchange={(e) => updateSetting('bloom', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Sound Effects</span>
					<input type="checkbox" checked={settings.sfx} onchange={(e) => setSfx((e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Music</span>
					<input type="checkbox" checked={settings.music} onchange={(e) => setMusic((e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Haptics</span>
					<input type="checkbox" checked={settings.haptics} onchange={(e) => updateSetting('haptics', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-check">
					<span>Show FPS</span>
					<input type="checkbox" checked={settings.showFps} onchange={(e) => updateSetting('showFps', (e.target as HTMLInputElement).checked)} />
				</label>
				<label class="hm-item hm-select">
					<span>Quality</span>
					<select value={settings.graphicsQuality} onchange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v === 'custom') return; applyQualityPreset(v as 'low' | 'medium' | 'high'); }}>
						<option value="custom" disabled={settings.graphicsQuality !== 'custom'}>Custom</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</label>
				<label class="hm-item hm-select">
					<span>Colorblind</span>
					<select value={settings.colorblind} onchange={(e) => updateSetting('colorblind', (e.target as HTMLSelectElement).value as GameSettings['colorblind'])}>
						<option value="off">Off</option>
						<option value="deuteranopia">Deuteranopia</option>
						<option value="protanopia">Protanopia</option>
						<option value="tritanopia">Tritanopia</option>
					</select>
				</label>
				<div class="hm-divider"></div>
				<div class="hm-item hm-notifications">
					<NotificationCenter />
				</div>
			</div>
		</div>
	{/if}

	<!-- ===== Tutorial ===== -->
	{#key tutorialReplayKey}
		<Tutorial steps={playTutorialSteps} tutorialKey={PLAY_TUTORIAL_KEY} />
	{/key}

	<!-- Game Over -->
	{#if showGameOver}
		<GameOverPanel
			wave={gameOverWave}
			best={highestWave}
			alloy={gameOverAlloy}
			kills={gameOverKills}
			bosses={gameOverBosses}
			cash={gameOverCash}
			schematics={gameOverSchematics}
			frontName={gameOverFrontName}
			killstreak={gameOverKillstreak}
			communityScore={gameOverCommunityScore}
			communityLeaderboardEligible={communityLeaderboardEligible}
			communityLeaderboardStatus={communityLeaderboardStatus}
			communityLeaderboardMessage={communityLeaderboardMessage}
			{autoDeploymentArmed}
			{autoDeploymentCountdown}
			onCancelAutoDeployment={cancelAutoDeployment}
			onRedeploy={startRun}
			onExport={handleExportSave}
			onSubmitLeaderboard={submitCommunityLeaderboard}
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
					<button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); importText = ''; } else { toast(r.error ?? getOpLogMessage('saveImportFailed'), 'error', 6000); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { alloyStore.set(s.totalAlloy); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button>
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
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<aside class="panel left" class:coll={!leftPanelOpen} onclick={e => e.stopPropagation()} onkeydown={e => e.stopPropagation()} ontouchstart={e => e.stopPropagation()}>
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
		<!-- Atmosphere, low-HP vignette, boss-wave flash, and critical-HP chip —
		     all presentational CSS overlays, extracted to keep this file lean. -->
		<HudOverlays
			{settings}
			{isCriticalHP}
			{isSevereHP}
			{bossIntroWave}
			{bossIntroKey}
			runActive={snap?.runActive ?? false}
		/>

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
		<TowerStatsPanel {snap} mobile={isMobile} />
		<EnemyStatsPanel {snap} mobile={isMobile} />
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
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<aside class="panel right" class:coll={!$fieldPanelOpen} onclick={e => e.stopPropagation()} onkeydown={e => e.stopPropagation()} ontouchstart={e => e.stopPropagation()}>
				<button class="ptog" onclick={() => $fieldPanelOpen = !$fieldPanelOpen}>{$fieldPanelOpen ? '▶' : '◀'}</button>
				{#if $fieldPanelOpen}
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
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<nav class="mn" onclick={e => e.stopPropagation()} onkeydown={e => e.stopPropagation()} ontouchstart={e => e.stopPropagation()}>
			<button class="mnb" class:on={!showMobileUpgrades} onclick={() => showMobileUpgrades = false} title="Game canvas view"><span class="mni"><Icon name="range" size={20} /></span><span class="mnl">Game</span></button>
			<button class="mnb" class:on={showMobileUpgrades} onclick={() => showMobileUpgrades = !showMobileUpgrades} title="Battle Upgrades panel"><span class="mni"><Icon name="offense" size={20} /></span><span class="mnl">Upgrades</span></button>
			<a href="/hub" class="mnb" title="Orbital Command — Forge, Research, Archives"><span class="mni"><Icon name="hub" size={20} /></span><span class="mnl">Orbital</span></a>
		</nav>
		{#if showMobileUpgrades && snap?.runActive}
			<div
				class="mob-upgrade-drawer"
				bind:this={drawerElement}
				role="dialog"
				aria-label="Field upgrades"
				aria-modal="false"
				tabindex="-1"
				onclick={e => e.stopPropagation()}
				onkeydown={e => e.stopPropagation()}
				ontouchstart={e => { e.stopPropagation(); handleTouchStart(e); }}
				ontouchmove={handleTouchMove}
				ontouchend={handleTouchEnd}
			>
				<div class="mob-drawer-handle"></div>
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
	.topbar.mobile { overflow:visible; }
	.tb-back { color:var(--text-dim); font-size:var(--fs-icon-md); text-decoration:none; padding:.1rem .3rem; border-radius:var(--radius-sm); transition:all var(--transition-fast); line-height:1; }
	.tb-back:hover { color:var(--cyan); background:rgba(0,255,255,.06); }
	.tb-brand { font-family:var(--font-display); font-weight:700; font-size:var(--fs-icon-md); letter-spacing:.04em; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; white-space:nowrap; margin:0; }
	.tb-div { width:1px; height:16px; background:var(--border-neon); flex-shrink:0; }
	.tb-stats { display:flex; gap:.25rem; align-items:center; margin-left:auto; }
	.tb-pill { display:flex; align-items:center; gap:.2rem; padding:.15rem .5rem; font-size:var(--fs-mono); font-family:var(--font-mono); border-radius:100px; background:var(--bg-tertiary); border:1px solid var(--border-neon); }
	.tb-max { color:var(--text-secondary); font-size:var(--fs-caption-sm); }
	.wave-pill span:last-child { color:var(--cyan); }
	.alloy-pill span:last-child { color:var(--yellow); }
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
	.set-row select { background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.2rem .4rem; font-size:var(--fs-caption-sm); font-family:var(--font-mono); cursor:pointer; }
	.set-select { cursor:default; }
	.hub-link { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); font-size:var(--fs-body); text-decoration:none; transition:all var(--transition-fast); }
	.hub-link:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	/* Lives inline in the top bar (header) on mobile — compact, with a dropdown. */
	.mob-spd { display:inline-flex; align-items:center; flex-shrink:0; position:relative; }
	.mob-spd-main { display:inline-flex; align-items:center; gap:.3rem; padding:.3rem .5rem; min-width:50px; min-height:40px; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--cyan); background:rgba(0,255,255,.08); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; }
	.mob-spd-popup { position:absolute; top:calc(100% + 4px); right:0; display:flex; gap:2px; padding:3px; background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-sm); box-shadow:0 8px 24px rgba(0,0,0,.5); z-index:200; animation:fi .15s ease; }
	.mob-spd-opt { padding:.4rem .3rem; min-width:36px; min-height:44px; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-dim); background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); }
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
	.mob-upgrade-drawer { position:fixed; bottom:var(--mob-nav-h,48px); left:0; right:0; max-height:60vh; background:var(--bg-secondary); border-top:1px solid var(--border-neon-strong); border-radius:var(--radius-xl) var(--radius-xl) 0 0; z-index:150; overflow-y:auto; padding:0 .65rem .75rem; padding-bottom: calc(.75rem + env(safe-area-inset-bottom, 0px)); animation:mobDrawerIn .25s cubic-bezier(.34,1.56,.64,1); box-shadow:0 -8px 32px rgba(0,0,0,.5); will-change:transform; touch-action:pan-y; }
	.mob-drawer-handle { width:40px; height:4px; background:var(--text-dim); opacity:0.3; border-radius:2px; margin:0.35rem auto 0.5rem; flex-shrink:0; }
	.mob-ug-header { display:flex; justify-content:space-between; align-items:center; font-size:var(--fs-caption); color:var(--cyan); font-family:var(--font-mono); margin-bottom:.35rem; }
	.mob-ug-close { color:var(--text-dim); font-size:var(--fs-body-sm); padding:.1rem .3rem; cursor:pointer; }

	@media (max-width: 899px) and (orientation: landscape) {
		.mob-upgrade-drawer {
			top: 0;
			bottom: 0;
			left: auto;
			right: 0;
			width: 320px;
			max-height: 100vh;
			height: 100vh;
			border-top: none;
			border-left: 1px solid var(--border-neon-strong);
			border-radius: 0;
			animation: mobDrawerSideIn 0.25s ease-out;
			padding-top: 1rem;
			touch-action: manipulation;
		}
		.mob-drawer-handle {
			display: none;
		}
		@keyframes mobDrawerSideIn {
			from { transform: translateX(100%); }
			to { transform: translateX(0); }
		}
	}

	/* Atmosphere / low-HP vignette / boss-intro / critical-HP chip styles now
	   live in HudOverlays.svelte alongside their markup. */


	@keyframes fi { from{opacity:0} to{opacity:1} }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
	@keyframes mobDrawerIn { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
	@media(min-width:900px){ .mn,.mob-spd,.mob-upgrade-drawer{display:none} }
	@media(max-width:899px){
		/* Single compact row — items that don't fit move to the ☰ hamburger menu.
		   overflow:visible so the mobile speed popup isn't clipped. */
		.topbar{padding:.25rem .35rem;gap:.25rem;flex-wrap:nowrap;overflow:visible}
		.tb-brand{display:none}
		.tb-div{display:none}
		.tb-stats{flex-wrap:nowrap;gap:.2rem;margin-left:.1rem;min-width:0;overflow-x:auto;scrollbar-width:none;flex-shrink:1}
		.tb-stats::-webkit-scrollbar{display:none}
		.tb-pill{padding:.12rem .35rem;font-size:var(--fs-caption-sm);gap:.12rem;flex-shrink:0}
		.tb-max{display:none}
		.hp-pill,.kill-pill{display:none}
		.spd-grp{display:none}
		.save-indicator{display:none}
		.tb-actions{flex-shrink:0;gap:.1rem}
		.ibtn{min-width:40px;min-height:40px;padding:.35rem}
		.ptog{min-width:44px;min-height:44px}
		:root{--mob-nav-h:48px}

		/* ─── Hamburger button ─────────────────────────────────── */
		.hamburger-btn {
			display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
			gap:3px; width:40px; height:40px; padding:.35rem;
			border-radius:var(--radius-sm); cursor:pointer;
			transition:all var(--transition-fast);
		}
		.hamburger-btn:hover,.hamburger-btn.open { background:rgba(0,255,255,.08); }
		.hamburger-line {
			width:18px; height:2px; background:var(--text-dim); border-radius:1px;
			transition:all var(--transition-fast);
		}
		.hamburger-btn.open .hamburger-line:nth-child(1) { transform:translateY(5px) rotate(45deg); }
		.hamburger-btn.open .hamburger-line:nth-child(2) { opacity:0; }
		.hamburger-btn.open .hamburger-line:nth-child(3) { transform:translateY(-5px) rotate(-45deg); }
		.hamburger-btn:hover .hamburger-line { background:var(--cyan); }

		/* ─── Hamburger overlay ────────────────────────────────── */
		.hamburger-overlay {
			position:fixed; inset:0; z-index:155;
			background:rgba(7,8,18,.65); backdrop-filter:blur(2px);
			-webkit-backdrop-filter:blur(2px);
			animation:fi .15s ease;
		}

		/* ─── Hamburger menu panel ─────────────────────────────── */
		.hamburger-menu {
			position:fixed; top:0; right:0; bottom:0; width:min(300px, 80vw); z-index:156;
			background:var(--bg-secondary); border-left:1px solid var(--border-neon-strong);
			display:flex; flex-direction:column;
			box-shadow:-8px 0 32px rgba(0,0,0,.5);
			animation:hamburgerSlideIn .2s cubic-bezier(.22,1,.36,1);
			overflow-y:auto;
			padding-bottom:env(safe-area-inset-bottom, 0px);
		}
		@keyframes hamburgerSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

		.hamburger-menu-header {
			display:flex; justify-content:space-between; align-items:center;
			padding:.6rem .75rem;
			border-bottom:1px solid var(--border-neon);
		}
		.hamburger-menu-title {
			font-family:var(--font-display); font-size:var(--fs-body); font-weight:700;
			color:var(--cyan); letter-spacing:.04em;
		}
		.hamburger-menu-close {
			color:var(--text-dim); font-size:var(--fs-body); padding:.2rem .4rem;
			border-radius:var(--radius-sm); cursor:pointer; min-width:36px; min-height:36px;
			display:inline-flex; align-items:center; justify-content:center;
		}
		.hamburger-menu-close:hover { color:var(--text-primary); background:rgba(255,255,255,.05); }

		.hamburger-menu-items {
			flex:1; padding:.3rem 0; display:flex; flex-direction:column;
		}

		/* ─── Hamburger menu items ──────────────────────────────── */
		.hm-item {
			display:flex; align-items:center; gap:.5rem;
			width:100%; min-height:44px; padding:.5rem .75rem;
			font-size:var(--fs-body-sm); color:var(--text-secondary);
			text-decoration:none; text-align:left;
			transition:all var(--transition-fast); cursor:pointer;
			border:none; background:none; font-family:inherit;
		}
		.hm-item:hover { background:rgba(0,255,255,.04); color:var(--text-primary); }
		.hm-item.off { color:var(--text-dim); opacity:.6; }
		.hm-item.off:hover { opacity:.85; }
		.hm-stat { cursor:default; }
		.hm-stat:hover { background:transparent; color:var(--text-secondary); }
		.hm-val { margin-left:auto; font-family:var(--font-mono); color:var(--green); font-size:var(--fs-caption-sm); }
		.hm-toggle { margin-left:auto; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--cyan); }
		.hm-item.off .hm-toggle { color:var(--text-dim); }
		.hm-danger { color:var(--red) !important; }
		.hm-danger:hover { background:rgba(255,68,68,.06) !important; }
		.hm-divider { height:1px; background:var(--border-neon); margin:.25rem .75rem; }
		.hm-section-title {
			padding:.35rem .75rem .15rem;
			font-family:var(--font-mono); font-size:var(--fs-caption-sm);
			color:var(--text-dim); text-transform:uppercase; letter-spacing:.06em;
		}
		.hm-check {
			display:flex; justify-content:space-between; align-items:center;
		}
		.hm-check input[type=checkbox] {
			width:16px; height:16px; accent-color:var(--cyan); cursor:pointer; flex-shrink:0;
		}
		.hm-select { display:flex; justify-content:space-between; align-items:center; }
		.hm-select select {
			background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon);
			border-radius:var(--radius-sm); padding:.3rem .5rem; font-size:var(--fs-caption-sm);
			font-family:var(--font-mono); cursor:pointer; flex-shrink:0;
		}
		.hm-notifications {
			padding:.25rem .75rem; min-height:auto; flex-wrap:wrap;
		}
		.hm-notifications:hover { background:transparent; }
	}
</style>
