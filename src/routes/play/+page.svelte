<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PixiGameView } from '$lib/game/render/PixiGameView';
	import { GameEngine } from '$lib/game/engine/GameEngine';
	import Tutorial from '$lib/components/Tutorial.svelte';
	import TowerStatsPanel from '$lib/components/TowerStatsPanel.svelte';
	import EnemyStatsPanel from '$lib/components/EnemyStatsPanel.svelte';
	import BossHealthBar from '$lib/components/BossHealthBar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { GAME_CONFIG } from '$lib/game/engine/gameConfig';
	import { UpgradeId, type GameSnapshot, type GameSettings, AchievementId, DEFAULT_SETTINGS, ChallengeId, EnemyType } from '$lib/game/engine/gameTypes';
	import { checkMasteryAchievements } from '$lib/game/balance/mastery';
	import { buildBattleUpgradeList } from '$lib/game/balance/battleUpgrades';
	const BATTLE_UPGRADES = buildBattleUpgradeList();
	import { getBlueprintDef } from '$lib/game/balance/blueprints';
	import { getUnlockedFronts, getTierNumber, getFrontName } from '$lib/game/balance/tiers';
	import { addSchematics, getBossSchematicReward, pendingMilestoneSchematics, normalizeSchematics } from '$lib/game/balance/schematics';
	import { rollBlueprintDiscovery } from '$lib/game/progression/blueprintDiscovery';
	import { TierId } from '$lib/game/engine/gameTypes';
	import { isChallengeUnlocked } from '$lib/game/balance/challenges';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';
	import { checkAchievements } from '$lib/game/balance/achievements';
	import { engineStore } from '$lib/stores/gameStore';
	import { audio } from '$lib/game/audio/AudioManager';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';
	import FieldUpgrades from '$lib/components/play/FieldUpgrades.svelte';
	import GameOverPanel from '$lib/components/play/GameOverPanel.svelte';
	import LaunchScreen from '$lib/components/play/LaunchScreen.svelte';

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
	let gameOverSchematics = $state(0);
	let gameOverFrontName = $state('');
	let prevWave = $state(0);
	let prevBossCount = $state(0);
	let upgradeCategory = $state<'offense' | 'defense' | 'utility'>('offense');
	let purchasedUpgrade = $state<string | null>(null);
	let showMobileUpgrades = $state(false);
	let buyMultiplier = $state<1 | 5 | 10 | 50 | 'max'>(1);
	let shiftHeld = $state(false);
	let ctrlHeld = $state(false);
	let showMobileSpeed = $state(false);

	const PLAY_TUTORIAL_KEY = 'geocore-td-tutorial-done';
	const playTutorialSteps = [
		{ title: 'Welcome to Flatland TD!', desc: 'This is an open source neon cyber idle tower defense. Your tower automatically shoots enemies. Click "Launch Deployment" to begin. Orbital Command has prepared a brief orientation. It is brief because nobody read the long version.', target: '.sc-btn, .start-btn, .btn-start', placement: 'center' as const },
		{ title: 'Energy & Alloy', desc: 'Kill enemies to harvest Energy (⚡, temporary) and refine Alloy (🔩, permanent). Energy overclocks your Tower during the deployment. Alloy unlocks permanent upgrades. Energy is temporary — like enthusiasm. Alloy is permanent — like paperwork.', target: '.tb-stats', placement: 'bottom' as const },
		{ title: 'Speed Controls', desc: 'Speed up the action! Use 1x-5x buttons or press Space to pause. Keys 1-4 switch speed instantly. Warning: 5× speed may cause shapes to appear statistically more aggressive.', target: '.spd-grp', placement: 'bottom' as const },
		{ title: 'Battle Upgrades', desc: 'The right panel has Field Upgrades split into Offense, Defense, and Utility. Spend Energy to overclock your tower during a deployment. Field Upgrades are lost when the tower falls. Orbital Command calls this \'performance-based incentive architecture.\'', target: '.panel.right', placement: 'left' as const },
		{ title: 'Workshop & Lab', desc: 'The Forge has permanent pre-installed tower upgrades using Alloy. The Research Deck runs orbital projects for multiplicative bonuses. The Forge never sleeps. The Research Deck never finishes. Both demand Alloy.', target: '.hub-link, [href="/hub"]', placement: 'bottom' as const },
		{ title: 'Ready!', desc: 'That is all you need. Start a run, upgrade your tower, and see how far you can get. Good luck, commander! Orbital Command has reviewed your file. It is... acceptable.', target: '', placement: 'center' as const },
	];

	function updateBuyMultiplier() {
		if (shiftHeld && ctrlHeld) buyMultiplier = 50;
		else if (shiftHeld) buyMultiplier = 5;
		else if (ctrlHeld) buyMultiplier = 'max';
		else if (!shiftHeld && !ctrlHeld) buyMultiplier = 1;
	}

	let snap = $state<GameSnapshot | null>(null);
	let coins = $state(0);
	let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let speed = $state(1);
	let paused = $state(false);
	let selectedFront = $state<TierId>(TierId.Tier1);
	let frontBestWave = $state<Partial<Record<TierId, number>>>({});
	let schematicsByFront = $state<Record<number, number>>({});
	let unlockedFronts = $derived(getUnlockedFronts(frontBestWave));
	let selectedChallenge = $state<ChallengeId | null>(null);
	let challengeHighScores = $state<Partial<Record<ChallengeId, number>>>({});

	let showSaveMenu = $state(false);
	let showSaveIndicator = $state(false);
	let showSettings = $state(false);
	let importText = $state('');
	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let coinsAtRunStart = $state(0);

	const toasts = createToastStore(2200);
	const toast = toasts.push;

	onMount(() => {
		const cm = () => { isMobile = window.innerWidth < 900; };
		cm(); window.addEventListener('resize', cm);
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; syncSettingsToEngine(s); });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		const cachedSave = getCachedSave();
		if (cachedSave?.selectedFront) selectedFront = cachedSave.selectedFront;
		if (cachedSave?.frontBestWave) frontBestWave = { ...cachedSave.frontBestWave };
		if (cachedSave?.schematicsByFront) schematicsByFront = { ...cachedSave.schematicsByFront };
		if (cachedSave?.challengeHighScores) challengeHighScores = { ...cachedSave.challengeHighScores };
		window.addEventListener('keydown', onKey);
		window.addEventListener('keyup', onKeyUp);

		// Restore engine if it exists in the store (from previous visit)
		const unsubEngine = engineStore.subscribe(e => {
			if (e && !engine) {
				engine = e;
				if (container && !gameView) {
					gameView = new PixiGameView(container, e);
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
		toasts.clear();
	});

	function onKey(e: KeyboardEvent) {
		audio.unlock();
		if (e.key === 'Shift') { shiftHeld = true; updateBuyMultiplier(); return; }
		if (e.key === 'Control' || e.key === 'Meta') { ctrlHeld = true; updateBuyMultiplier(); return; }
		if (!engine) return;
		if (e.key === ' ') { e.preventDefault(); handleSpeed(0); }
		if (e.key === '1') handleSpeed(1);
		if (e.key === '2') handleSpeed(2);
		if (e.key === '3') handleSpeed(3);
		if (e.key === '4') handleSpeed(4);
	}

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
		};
		const boss = engine.getActiveBoss();
		if (boss) { snap.bossActive = true; snap.bossHp = boss.hp; snap.bossMaxHp = boss.maxHp; }
		speed = engine.speedMultiplier;
		paused = engine.isPaused();
	}

	function syncSettingsToEngine(s: GameSettings): void {
		// Audio reflects settings even before an engine exists.
		audio.setSfxEnabled(s.sfx);
		audio.setMusicEnabled(s.music);
		if (!engine) return;
		const stateSettings = engine.state.settings;
		stateSettings.reducedMotion = s.reducedMotion;
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
	function toggleSfx() { audio.unlock(); updateSetting('sfx', !settings.sfx); }
	function toggleMusic() { audio.unlock(); updateSetting('music', !settings.music); }

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
						audio.play('bossWarning');
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
				audio.play('gameOver');
				gameOverCoins = geoCoins;
				gameOverWave = _w;
				gameOverKills = engine?.state.killCount ?? 0;
				gameOverBosses = engine?.state.bossesDefeated ?? 0;
				gameOverCash = engine?.state.cash ?? 0;
				gameOverSchematics = 0;
				gameOverFrontName = '';
				showGameOver = true;
				const save = getCachedSave();
				if (save && engine) {
					const isNewBest = engine.state.highestWave > save.highestWave;
					const runCoinsEarned = Math.max(0, engine.state.coins - coinsAtRunStart);

					save.totalCoins = engine.state.coins;
					save.totalRuns = engine.state.totalRuns;
					save.highestWave = Math.max(save.highestWave, engine.state.highestWave);

					save.totalKills += engine.state.killCount;
					save.totalBossesDefeated += engine.state.bossesDefeated;
					save.totalShiniesKilled += engine.state.shiniesKilled;
					save.totalAlloyEarned += runCoinsEarned;

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
						}
						coinsStore.set(save.totalCoins);
					}

					const reachedWave = engine.state.wave.currentWave;
					const runChallenge = engine.state.activeChallenge;

					// Challenge runs track their own high score, not front progression
					if (runChallenge) {
						const prevHs = save.challengeHighScores?.[runChallenge] ?? 0;
						const newHs = Math.max(prevHs, reachedWave);
						save.challengeHighScores = { ...(save.challengeHighScores ?? {}), [runChallenge]: newHs };
						challengeHighScores = { ...save.challengeHighScores };
						if (newHs > prevHs && prevHs > 0) toast('🏆 New high score on ' + runChallenge + ': Wave ' + newHs, 'milestone');
					} else {
						// Per-front best wave — gates sequential front unlocks.
						const frontPrev = save.frontBestWave?.[save.selectedFront] ?? 0;
						const newFrontBest = Math.max(frontPrev, reachedWave);
						save.frontBestWave = { ...(save.frontBestWave ?? {}), [save.selectedFront]: newFrontBest };
						const justUnlocked = getUnlockedFronts(save.frontBestWave).length > getUnlockedFronts(frontBestWave).length;
						frontBestWave = { ...save.frontBestWave };
						if (justUnlocked) toast('🌍 ' + getOpLogMessage('frontUnlocked', { name: getFrontName(save.selectedFront) }), 'milestone');

						// ── Schematic rewards (Part 5) — non-challenge runs only ──
						const frontNum = getTierNumber(save.selectedFront);
						gameOverFrontName = getFrontName(save.selectedFront);
						save.schematicsByFront = normalizeSchematics(save.schematicsByFront);
						let schematicsThisRun = 0;
						// Repeatable: one grant per boss killed this deployment.
						const bossesThisRun = engine.state.bossesDefeated;
						if (bossesThisRun > 0) {
							const perBoss = getBossSchematicReward(frontNum);
							schematicsThisRun += bossesThisRun * perBoss;
							addSchematics(save.schematicsByFront, frontNum, bossesThisRun * perBoss);
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

					const bLevels = engine.state.battleUpgrades;
					let runFieldUpgrades = 0;
					for (const v of Object.values(bLevels)) { runFieldUpgrades += v as number; }
					save.totalFieldUpgradesPurchased += runFieldUpgrades;

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
						},
					);
					let totalReward = 0;
					for (const a of earned) {
						(save.achievements as Record<string, boolean>)[a.id] = true;
						save.totalCoins += a.reward;
						totalReward += a.reward;
						toast('🏆 ' + a.name + ' — +' + a.reward.toLocaleString() + ' Alloy!', 'milestone');
					}
					if (totalReward > 0) {
						gameOverCoins += totalReward;
					}

					// ── Blueprint discovery roll (RNG, once per deployment) ──
					// Depth is measured on the CURRENT front (per-front best wave).
					const found = rollBlueprintDiscovery({
						front: save.selectedFront,
						progress: {
							highestWave: save.frontBestWave?.[save.selectedFront] ?? 0,
							bossesDefeated: save.totalBossesDefeated,
							ownedBlueprints: save.unlockedBlueprints ?? [],
							unlockedFronts: getUnlockedFronts(save.frontBestWave ?? {}),
						},
						discovered: save.discoveredBlueprints ?? [],
						owned: save.unlockedBlueprints ?? [],
					});
					if (found.length) {
						save.discoveredBlueprints = [...(save.discoveredBlueprints ?? []), ...found];
						for (const id of found) {
							const def = getBlueprintDef(id);
							toast('🔍 ' + getOpLogMessage('blueprintDiscovered', { name: def?.name ?? id }), 'milestone');
						}
						audio.play('milestone');
					}

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
				audio.play('milestone');
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
		wireAudio();
		gameView.start();
	}

	function startRun() {
		if (!engine) initEngine();
		if (!engine) return;
		showLaunchScreen = false;
		showGameOver = false;
		showMobileUpgrades = false;
		speed = 1; paused = false;
		audio.unlock();
		audio.play('waveStart');
		coinsAtRunStart = coins;
		const save = getCachedSave();
		// Clamp the chosen front to what's actually unlocked, then persist it.
		if (!unlockedFronts.includes(selectedFront)) selectedFront = TierId.Tier1;
		if (save) { save.selectedFront = selectedFront; persistSave(save); }
		const unlockedBPs = (save?.unlockedBlueprints ?? []) as import('$lib/game/engine/gameTypes').BlueprintId[];
		// Validate challenge is still unlocked (defensive — selection persists across sessions)
		const validChallenge = selectedChallenge && isChallengeUnlocked(selectedChallenge, frontBestWave) ? selectedChallenge : null;
		engine.startRun(save?.workshopUpgrades ?? {}, save?.labLevels ?? {}, coins, unlockedBPs, getTierNumber(selectedFront), validChallenge, save?.killsByType ?? {});
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
			engine.setSpeed(sp);
			toast(getOpLogMessage('speedChange', { speed: sp }), 'info');
		}
		refreshSnap();
	}

	function buyBattleUpgrade(id: UpgradeId) {
		if (!engine) return;
		const upgradeDef = BATTLE_UPGRADES.find(u => u.id === id);
		const upgradeName = upgradeDef?.name ?? '';
		const maxLv = upgradeDef?.maxLevel ?? 99;
		const initialLv = engine.state.battleUpgrades[id] ?? 0;
		if (initialLv >= maxLv) { toast(getOpLogMessage('upgradeMaxLevel'), 'warning'); return; }

		let bought = 0;
		const isMax = buyMultiplier === 'max';
		const target = isMax ? maxLv : Math.min(initialLv + buyMultiplier, maxLv);

		for (let i = 0; i < (isMax ? 999999 : buyMultiplier); i++) {
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
		navigator.clipboard?.writeText(s);
		toast(getOpLogMessage('saveExported'), 'success');
	}

	function handleResetSave() {
		resetSave().then(() => {
			showResetConfirm = false;
			coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0);
			settingsStore.set({ ...DEFAULT_SETTINGS });
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
	<Toasts controller={toasts} vertical="top" offsetRem={3} />

	<!-- Top Bar -->
	<header class="topbar">
		<a href="/" class="tb-back" aria-label="Home" title="Home"><Icon name="back" size={18} /></a>
		<div class="tb-brand">Flatland TD</div>
		<div class="tb-div"></div>
		<div class="tb-stats">
			{#if snap?.runActive}
				<div class="tb-pill wave-pill" title="Current wave number"><Icon name="wave" size={15} /><span>{snap.wave}</span></div>
			{/if}
			<div class="tb-pill coin-pill" title="Alloy — permanent material, spent in Forge & Research"><Icon name="alloy" size={15} /><span>{coins.toLocaleString()}</span></div>
			{#if snap?.runActive}
				<div class="tb-pill cash-pill" title="Energy — harvested from destroyed enemies, spent on Field Upgrades"><Icon name="energy" size={15} /><span>{Math.floor(snap.cash).toLocaleString()}</span></div>
				<div class="tb-pill hp-pill" class:low={snap.towerHp / snap.towerMaxHp < 0.3} title="Tower HP — run ends when this reaches 0"><Icon name="hp" size={15} /><span>{Math.ceil(snap.towerHp)}</span><span class="tb-max">/{snap.towerMaxHp}</span></div>
				<div class="tb-pill kill-pill" title="Total enemies killed this run"><Icon name="kill" size={15} /><span>{snap.killCount}</span></div>
			{/if}
		</div>
		<div class="tb-actions">
			{#if snap?.runActive}
				<div class="spd-grp" title="Game speed — also: keys 1-4, Space to pause">
					<button class="spd-btn spd-icon" class:on={paused} onclick={() => handleSpeed(0)} title="Pause (Space)" aria-label="Pause"><Icon name={paused ? 'play' : 'pause'} size={13} /></button>
					{#each [1,2,3] as s}<button class="spd-btn spd-n" class:on={!paused && speed === s} onclick={() => handleSpeed(s)} title="{s}× speed ({s})">{s}×</button>{/each}
					<button class="spd-btn spd-n" class:on={!paused && speed === 5} onclick={() => handleSpeed(4)} title="5× speed (4)">5×</button>
					<div class="spd-status" class:paused={paused}>{paused ? '❚❚' : speed + '×'}</div>
				</div>
			{/if}
			<button class="ibtn" class:off={!settings.sfx} onclick={toggleSfx} aria-label="Toggle sound effects" title="Sound effects {settings.sfx ? 'on' : 'off'}"><Icon name={settings.sfx ? 'soundOn' : 'soundOff'} size={17} /></button>
			<button class="ibtn" class:off={!settings.music} onclick={toggleMusic} aria-label="Toggle music" title="Music {settings.music ? 'on' : 'off'}"><Icon name={settings.music ? 'musicOn' : 'musicOff'} size={17} /></button>
			<div class="save-indicator" class:saving={showSaveIndicator} title="Auto-save indicator"></div>
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
							<input type="checkbox" checked={settings.sfx} onchange={(e) => { audio.unlock(); updateSetting('sfx', (e.target as HTMLInputElement).checked); }} />
						</label>
						<label class="set-row" title="Ambient background loop">
							<span>Music</span>
							<input type="checkbox" checked={settings.music} onchange={(e) => { audio.unlock(); updateSetting('music', (e.target as HTMLInputElement).checked); }} />
						</label>
					</div>
				{/if}
			</div>
			<a href="/hub" class="hub-link" aria-label="Orbital Command" title="Orbital Command — Forge, Research Deck, Blueprints, Fronts, Archives"><Icon name="hub" size={18} /></a>
		</div>
	</header>

	<!-- ===== Tutorial ===== -->
	<Tutorial steps={playTutorialSteps} tutorialKey={PLAY_TUTORIAL_KEY} />

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
					{#each [1,2,3] as s}<button class="mob-spd-opt" class:on={!paused && speed === s} onclick={() => { handleSpeed(s); showMobileSpeed = false; }}>{s}×</button>{/each}
					<button class="mob-spd-opt" class:on={!paused && speed === 5} onclick={() => { handleSpeed(4); showMobileSpeed = false; }}>5×</button>
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
			onRedeploy={startRun}
			onExport={handleExportSave}
		/>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Import save"><div class="dlg"><h3>📂 Import Save</h3><p class="dlg-d">Paste your save JSON below.</p><textarea bind:value={importText} rows={5}></textarea><div class="dlg-a"><button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); importText = ''; } else { toast(getOpLogMessage('saveImportFailed'), 'error'); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button><button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button></div></div></div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="dialog" aria-modal="true" aria-label="Reset save"><div class="dlg dlg-dng"><h3>🗑 Reset Save?</h3><p class="dlg-d">This will erase all Alloy, Forge upgrades, Schematics, Research Deck progress, Front progress, and settings. Cannot be undone.</p><div class="dlg-a"><button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button><button class="dlg-dng-btn" onclick={handleResetSave}>Reset</button></div></div></div>
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
			<!-- Live run info lives in the bottom-left (Tower) / bottom-right (Shapes) panels
			     and the top bar — the canvas itself is kept clear. -->
			{#if snap?.bossActive && snap.bossMaxHp > 0}
				<BossHealthBar hp={snap.bossHp} maxHp={snap.bossMaxHp} wave={snap.wave} />
			{/if}
			<TowerStatsPanel {snap} />
			<EnemyStatsPanel {snap} />
			{#if showLaunchScreen}
				<LaunchScreen
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
				<FieldUpgrades {snap} bind:upgradeCategory bind:buyMultiplier showBuyMultiplier={false} scrollList purchasedId={purchasedUpgrade} onBuy={buyBattleUpgrade} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.play-layout { display:flex; flex-direction:column; height:100vh; height:100dvh; overflow:hidden; background:var(--bg-primary); user-select:none; }
	.topbar { display:flex; align-items:center; padding:.3rem .65rem; gap:.4rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); z-index:100; flex-shrink:0; position:relative; }
	.tb-back { color:var(--text-dim); font-size:var(--fs-icon-md); text-decoration:none; padding:.1rem .3rem; border-radius:var(--radius-sm); transition:all var(--transition-fast); line-height:1; }
	.tb-back:hover { color:var(--cyan); background:rgba(0,255,255,.06); }
	.tb-brand { font-family:var(--font-display); font-weight:700; font-size:var(--fs-icon-md); letter-spacing:.04em; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; white-space:nowrap; }
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
	.spd-grp { display:flex; gap:1px; align-items:center; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:100px; padding:1px; }
	.spd-status { font-size:var(--fs-caption); color:var(--cyan); font-family:var(--font-mono); padding:0 .25rem; }
	.spd-status.paused { color:var(--yellow); }
	.save-indicator { width:8px; height:8px; border-radius:50%; background:rgba(68,255,136,0); transition:all .3s ease; flex-shrink:0; }
	.save-indicator.saving { background:rgba(68,255,136,0.6); box-shadow:0 0 6px rgba(68,255,136,0.4); }
	.spd-btn { padding:.15rem .4rem; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:100px; transition:all var(--transition-fast); line-height:1; cursor:pointer; }
	.spd-btn:hover { color:var(--text-secondary); background:rgba(255,255,255,.04); }
	.spd-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); }
	.spd-n { min-width:1.5rem; text-align:center; }
	.tb-actions { display:flex; gap:.2rem; align-items:center; }
	.ibtn { display:inline-flex; align-items:center; justify-content:center; padding:.25rem; border-radius:var(--radius-sm); color:var(--text-secondary); transition:all var(--transition-fast); font-size:var(--fs-icon-md); line-height:1; cursor:pointer; }
	.ibtn:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.ibtn.off { color:var(--text-dim); opacity:.55; }
	.spd-icon { display:inline-flex; align-items:center; justify-content:center; }
	.tb-pill :global(.icon) { opacity:.75; }
	.sv-wrap { position:relative; }
	.sv-drop { position:absolute; top:calc(100% + 4px); right:0; min-width:150px; background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-md); z-index:200; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.5); animation:fi .12s ease; }
	.sv-drop button { display:block; width:100%; padding:.55rem .9rem; font-size:var(--fs-body); text-align:left; color:var(--text-secondary); transition:all var(--transition-fast); }
	.sv-drop button:hover { background:rgba(0,255,255,.06); color:var(--text-primary); }
	.settings-drop { min-width:220px; padding:.3rem 0; }
	.set-row { display:flex; justify-content:space-between; align-items:center; padding:.5rem .9rem; font-size:var(--fs-body-sm); color:var(--text-secondary); cursor:pointer; }
	.set-row:hover { background:rgba(0,255,255,.04); }
	.set-row input[type=checkbox] { width:16px; height:16px; accent-color:var(--cyan); cursor:pointer; }
	.hub-link { padding:.25rem; border-radius:var(--radius-sm); color:var(--text-dim); font-size:var(--fs-body); text-decoration:none; transition:all var(--transition-fast); }
	.hub-link:hover { color:var(--cyan); background:rgba(0,255,255,.08); }
	.mob-spd { display:flex; align-items:center; gap:2px; padding:.3rem .4rem; background:rgba(7,8,18,.9); border-bottom:1px solid var(--border-neon); flex-shrink:0; position:relative; }
	.mob-spd-main { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .75rem; min-width:64px; min-height:44px; font-size:var(--fs-body); font-family:var(--font-mono); color:var(--cyan); background:rgba(0,255,255,.08); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; }
	.mob-spd-popup { display:flex; gap:3px; margin-left:.3rem; animation:fi .15s ease; }
	.mob-spd-opt { padding:.4rem .55rem; min-width:40px; min-height:40px; font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-dim); background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); }
	.mob-spd-opt.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }
	.mob-spd-opt:hover { color:var(--text-primary); }
	.game-body { flex:1; display:flex; overflow:hidden; position:relative; }
	.game-canvas { flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--bg-primary); }
	.panel { display:flex; flex-direction:column; background:var(--bg-glass); border-left:1px solid var(--border-neon); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); position:relative; transition:width var(--transition-normal); width:265px; flex-shrink:0; overflow:hidden; z-index:5; }
	.panel.coll { width:24px; }
	.left { border-left:none; border-right:1px solid var(--border-neon); }
	.ptog { position:absolute; top:.3rem; z-index:6; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--text-dim); font-size:var(--fs-caption); padding:.3rem .4rem; min-width:32px; min-height:32px; cursor:pointer; transition:all var(--transition-fast); line-height:1; display:inline-flex; align-items:center; justify-content:center; }
	.left .ptog { right:.15rem; } .right .ptog { left:.15rem; }
	.ptog:hover { background:rgba(0,255,255,.12); color:var(--cyan); }
	.pc { padding:.6rem; overflow-y:auto; flex:1; height:100%; display:flex; flex-direction:column; gap:.15rem; }
	.ps { margin-bottom:.3rem; }
	.pst { display:flex; align-items:center; gap:.25rem; font-size:var(--fs-mono); color:var(--cyan); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.35rem; padding-bottom:.25rem; border-bottom:1px solid rgba(0,255,255,.08); }
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
		.ibtn{min-width:40px;min-height:40px;padding:.4rem}
		.ptog{min-width:36px;min-height:36px}
		:root{--mob-nav-h:48px}
	}
</style>
