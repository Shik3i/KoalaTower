<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Tutorial, { type TutorialStep } from '$lib/components/Tutorial.svelte';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { persistSave, getCachedSave, exportSave, exportSaveFromData, importSave, resetSave } from '$lib/game/save/saveService';
	import type { SaveData } from '$lib/game/save/saveTypes';
	import { buildWorkshopUpgradeList, getWorkshopUpgradeCost, getWorkshopUpgradeEffect, FORGE_ECONOMY_WORKSHOP_IDS } from '$lib/game/balance/workshopUpgrades';
	// Combat Forge stats use the SHARED Field curve (forgeUpgrades.ts). The
	// Foundry's economy upgrades (Alloy/Energy bonus, Starting Energy) stay as
	// permanent-only WorkshopUpgrades — filtered out of the combat list here.
	const FORGE_ECONOMY_SET = new Set(FORGE_ECONOMY_WORKSHOP_IDS);
	const WORKSHOP_UPGRADES = buildWorkshopUpgradeList().filter(u => FORGE_ECONOMY_SET.has(u.id));
	import { buildForgeUpgradeList, getForgeUpgradeCost, getForgeUpgradeEffect } from '$lib/game/balance/forgeUpgrades';
	import { formatBattleEffect } from '$lib/game/balance/upgradeScaling';
	const FORGE_UPGRADES = buildForgeUpgradeList();
	import { LAB_DEFS, getLabCost, getLabEffect, isLabUnlocked, getLabDuration, formatLabDuration } from '$lib/game/balance/labs';
	import { TIERS, FRONT_META, getUnlockedFronts, getFrontName, describeFrontUnlock, getFrontBandDef } from '$lib/game/balance/tiers';
	import FrontIcon from '$lib/components/FrontIcon.svelte';
	import { CHALLENGES, CHALLENGE_UNLOCK_REQS, isChallengeUnlocked } from '$lib/game/balance/challenges';
	import { formatCompact, TIER_MULTIPLIERS } from '$lib/game/balance/balanceMath';
	import { getSchematics, getPathSchematicCost, tryUnlockPathWithSchematics, normalizeSchematics, SCHEMATICS_FLAVOR } from '$lib/game/balance/schematics';
	import {
		BLACK_MARKET_UNLOCKS,
		SCHEMATIC_CONVERSION_RATE,
		STRANGE_MATTER_DAILY_PICKUP,
		STRANGE_MATTER_WEEKLY_SHIPMENT,
		SUPPORT_URL,
		canBuyBlackMarketUnlock,
		canClaimDailyStrangeMatter,
		canClaimWeeklyShipment,
		computeBlackMarketSignal,
		convertSchematics,
		hasBlackMarketUnlock,
		isBlackMarketUnlocked,
		isSupportUrlConfigured,
		weeklyShipmentRemainingMs,
		type BlackMarketUnlockId,
		type BlackMarketUnlocks,
	} from '$lib/game/balance/blackMarket';
	import { EnemyType, DEFAULT_SETTINGS, type TierId } from '$lib/game/engine/gameTypes';
	import { ENEMY_TYPE_MODIFIERS, computeEnemyConfig, ENEMY_SHAPES } from '$lib/game/balance/balanceMath';
	import { ENEMY_TYPE_LABELS, getMasteryProgress, MASTERY_REWARDS } from '$lib/game/balance/mastery';
	import { BLUEPRINT_DEFS, isFoundryUpgradeUnlocked, isFieldUpgradeUnlocked, getBlueprintForFoundryUpgrade, getBlueprintForFieldUpgrade, getFieldUpgradesUnlockedBy, getFoundryUpgradesUnlockedBy, describeBlueprintDiscovery } from '$lib/game/balance/blueprints';
	import { getBlueprintStatus } from '$lib/game/progression/blueprintDiscovery';
	import {
		generateCommandOrders,
		rolloverCommandOrders,
		getActiveOrders,
		getCompletedOrders,
		isOrderComplete,
		claimOrder,
		claimAllCompletedOrders,
		claimableMilestones,
		claimMilestone,
		nextMilestone,
		commandOrdersWeekKey,
		shouldRefreshBoard,
		refreshBoard,
		boardRefreshRemainingMs,
		formatRefreshCountdown,
		COMMAND_ORDERS_MAX_PER_WEEK,
		GIFT_BOX_REWARDS,
		type CommandOrderInstance,
		type CommandOrdersState,
	} from '$lib/game/balance/commandOrders';
	import type { GameSettings, WorkshopUpgradeId, UpgradeId, BlueprintId } from '$lib/game/engine/gameTypes';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';
	import { blackMarketCopy } from '$lib/game/balance/blackMarketCopy';
	import { audio } from '$lib/game/audio/AudioManager';
	import { playForNotification } from '$lib/game/audio/uiSounds';
	import Toasts from '$lib/components/Toasts.svelte';
	import { createToastStore } from '$lib/stores/toastStore';
	import { tooltip } from '$lib/components/tooltip';
	import { notifications } from '$lib/stores/notificationStore';
	import NotificationCenter from '$lib/components/NotificationCenter.svelte';
	import {
		loadLocalIdentity,
		saveLocalDisplayName,
		syncLocalIdentity,
		type LocalPlayerIdentity
	} from '$lib/online/localIdentity';
	import { communityBuffStore, formatCommunityBuffPercent, type CommunityBuffState } from '$lib/online/communityBuffClient';
	import { accountStore, registerAccount, loginAccount, logoutAccount, type AccountInfo } from '$lib/online/accountClient';
	import { fetchCloudSaveMeta, fetchCloudSaveFull, uploadCloudSave, type CloudSaveMetadata } from '$lib/online/cloudSaveClient';
	import { getSupportCode } from '$lib/online/supportCode';
	import { APP_VERSION } from '$lib/version';
	import { CURRENT_SCHEMA_VERSION } from '$lib/game/save/saveTypes';
	import { page } from '$app/state';
	import { isValidUsername, isValidPassword, isValidDisplayName } from '$lib/online/authValidation';
	import Icon from '$lib/components/Icon.svelte';
	import SettingsSection from '$lib/components/hub/SettingsSection.svelte';
	import SimulationSection from '$lib/components/hub/SimulationSection.svelte';
	import BlueprintsSection from '$lib/components/hub/BlueprintsSection.svelte';
	import StatsSection from '$lib/components/hub/StatsSection.svelte';
	import TiersSection from '$lib/components/hub/TiersSection.svelte';
	import ChallengesSection from '$lib/components/hub/ChallengesSection.svelte';
	import OrdersSection from '$lib/components/hub/OrdersSection.svelte';

	function formatPlayTime(totalSeconds: number): string {
		if (totalSeconds <= 0) return '0s';
		const h = Math.floor(totalSeconds / 3600);
		const m = Math.floor((totalSeconds % 3600) / 60);
		if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
		if (m > 0) return `${m}m`;
		const s = totalSeconds % 60;
		return `${s}s`;
	}

	let coins = $state(0);
	let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let activeSection = $state<'workshop' | 'orders' | 'lab' | 'blueprints' | 'blackMarket' | 'tiers' | 'challenges' | 'simulation' | 'stats' | 'settings' | 'profile'>('workshop');
	let buyMultiplier = $state<1 | 5 | 10 | 50 | 'max'>(1);
	const BUY_MULTIPLIERS = [1, 5, 10, 50, 'max'] as const;
	let workshopLevels = $state<Partial<Record<WorkshopUpgradeId, number>>>({});
	let forgeLevels = $state<Partial<Record<UpgradeId, number>>>({});
	let commandOrdersState = $state<CommandOrdersState>({ week: '', completedCount: 0, claimedOrderSlots: [], claimedMilestones: [], counters: {}, boardRefreshedAt: 0 });
	let commandOrderPool = $state<CommandOrderInstance[]>([]);
	let showCompletedOrders = $state(true);
	let labLevels = $state<Record<string, number>>({});
	let hubStats = $state({ bestKillstreak: 0, totalKills: 0, totalBossesDefeated: 0, totalShiniesKilled: 0, totalAlloyEarned: 0 });

	const HUB_TUTORIAL_KEY = 'flatland-td-hub-tutorial-done';
	const hubTutorialSteps: TutorialStep[] = [
		{ title: 'Orbital Command', desc: 'This is your permanent base. Alloy earned in deployments can be spent here, and those upgrades survive every tower fall.', target: '', placement: 'center' },
		{ title: 'Forge', desc: 'Buy permanent tower stats first. Damage, Fire Rate, and Max HP are simple early upgrades that make the next deployment stronger.', target: '[data-section="workshop"]', placement: 'right' },
		{ title: 'Research Deck', desc: 'Research projects finish in real time, even while you are away. Start one, deploy, and collect the result when you return.', target: '[data-section="lab"]', placement: 'right' },
		{ title: 'Schematics Later', desc: 'After you recover Schematics from a Front, this tab reconstructs new upgrade paths. If it is empty now, that is normal.', target: '[data-section="blueprints"]', placement: 'right' },
		{ title: 'Fronts', desc: 'Front 1 is always open. Push deeper to unlock harder Fronts with better rewards; Special Operations appear after campaign milestones.', target: '[data-section="tiers"]', placement: 'right' },
		{ title: 'Archives', desc: 'Archives track campaign stats, enemy mastery achievements, and telemetry from previous deployments.', target: '[data-section="stats"]', placement: 'right' },
		{ title: 'Profile', desc: 'Set your display name, register an account, and manage cloud backups to protect your progress.', target: '[data-section="profile"]', placement: 'right' },
		{ title: 'Systems', desc: 'Systems holds visual and audio preferences, along with tools to manually export, import, or reset your local save.', target: '[data-section="settings"]', placement: 'right' },
		{ title: 'Deploy Again', desc: 'Spend Alloy, start research, then return to the fight. Field upgrades reset each run; Orbital upgrades do not.', target: '.hub-deploy', placement: 'bottom' },
	];

	let simWave = $state(1);
	let simFront = $state(1);

	let ownedBlueprints = $state<BlueprintId[]>([]);
	let discoveredBlueprints = $state<BlueprintId[]>([]);
	let schematicsByFront = $state<Record<number, number>>({});
	let strangeMatter = $state(0);
	let lifetimeStrangeMatterEarned = $state(0);
	let blackMarketUnlocks = $state<BlackMarketUnlocks>({});
	let lastWeeklyBlackMarketShipmentClaimedAt = $state(0);
	let lastDailyStrangeMatterPickedUpAt = $state(0);
	let autoDeploymentEnabled = $state(false);
	let converterSourceFront = $state(1);
	let nowTick = $state(Date.now());
	let frontBestWave = $state<Partial<Record<TierId, number>>>({});
	let killsByType = $state<Partial<Record<EnemyType, number>>>({});
	let shinyKillsByType = $state<Partial<Record<EnemyType, number>>>({});
	let lifetimeStats = $state({ totalEnergyEarned: 0, totalDamageDealt: 0, totalCritsDealt: 0, totalWavesCompleted: 0, totalPlayTimeSeconds: 0 });
	let masteryAchievements = $state<Partial<Record<string, boolean>>>({});
	let challengeHighScores = $state<Partial<Record<string, number>>>({});
	let unlockedFronts = $derived(getUnlockedFronts(frontBestWave));
	let bmUnlocked = $derived(isBlackMarketUnlocked(frontBestWave));
	let blackMarketIntroSeen = $state(false);
	let bmSignal = $derived(computeBlackMarketSignal({
		unlocked: bmUnlocked,
		introSeen: blackMarketIntroSeen,
		weeklyReady: canClaimWeeklyShipment(lastWeeklyBlackMarketShipmentClaimedAt, nowTick),
		dailyReady: canClaimDailyStrangeMatter(bmUnlocked, lastDailyStrangeMatterPickedUpAt, nowTick),
	}));
	let supportReady = $derived(isSupportUrlConfigured(SUPPORT_URL));
	let showBlackMarketIntro = $state(false);
	let showShipmentModal = $state(false);
	let blackMarketIntroDialogEl = $state<HTMLDivElement | null>(null);
	let shipmentDialogEl = $state<HTMLDivElement | null>(null);
	let bmSignalText = $state(blackMarketCopy.signalStatus());
	let bmShipmentFlavour = $state(blackMarketCopy.shipmentFlavour());
	let bmDailyFlavour = $state(blackMarketCopy.dailyPickup());
	let bmChannelIntro = $state(blackMarketCopy.channelIntro());
	let activeLabId = $state<string | null>(null);
	let activeLabFinish = $state<number>(0);
	let activeLabTarget = $state<number>(0);
	let labProgressPct = $state(0);
	let labProgressTimer: ReturnType<typeof setInterval> | null = null;
	let clockTimer: ReturnType<typeof setInterval> | null = null;

	function refreshBlackMarketState() {
		const save = getCachedSave(); if (!save) return;
		strangeMatter = save.strangeMatter ?? 0;
		lifetimeStrangeMatterEarned = save.lifetimeStrangeMatterEarned ?? 0;
		blackMarketUnlocks = { ...(save.blackMarketUnlocks ?? {}) };
		lastWeeklyBlackMarketShipmentClaimedAt = save.lastWeeklyBlackMarketShipmentClaimedAt ?? 0;
		lastDailyStrangeMatterPickedUpAt = save.lastDailyStrangeMatterPickedUpAt ?? 0;
		autoDeploymentEnabled = save.autoDeploymentEnabled === true;
		blackMarketIntroSeen = save.blackMarketIntroSeen === true;
	}

	function refreshBmCopy() {
		bmSignalText = blackMarketCopy.signalStatus();
		bmShipmentFlavour = blackMarketCopy.shipmentFlavour();
		bmDailyFlavour = blackMarketCopy.dailyPickup();
		bmChannelIntro = blackMarketCopy.channelIntro();
	}

	function formatDuration(ms: number): string {
		const totalMinutes = Math.ceil(Math.max(0, ms) / 60000);
		const days = Math.floor(totalMinutes / 1440);
		const hours = Math.floor((totalMinutes % 1440) / 60);
		const minutes = totalMinutes % 60;
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function grantStrangeMatter(save: NonNullable<ReturnType<typeof getCachedSave>>, amount: number) {
		const grant = Math.max(0, Math.floor(amount));
		save.strangeMatter = Math.max(0, Math.floor(save.strangeMatter ?? 0)) + grant;
		save.lifetimeStrangeMatterEarned = Math.max(0, Math.floor(save.lifetimeStrangeMatterEarned ?? 0)) + grant;
	}

	function openBlackMarketChannel() {
		showBlackMarketIntro = false;
		const save = getCachedSave(); if (!save) return;
		save.blackMarketIntroSeen = true;
		persistSave(save);
		notifications.notify({ kind: 'blackMarket', title: 'Black Market channel open', detail: 'Unauthorized procurements available' });
		playForNotification('blackMarket');
		refreshBlackMarketState();
		refreshBmCopy();
		switchSection('blackMarket');
	}

	function dismissBlackMarketIntro() {
		showBlackMarketIntro = false;
	}

	function openShipmentModal() {
		const save = getCachedSave(); if (!save) return;
		const now = Date.now();
		if (!canClaimWeeklyShipment(save.lastWeeklyBlackMarketShipmentClaimedAt ?? 0, now)) {
			toast('Shipment unavailable. Paperwork remains absent.', 'info');
			return;
		}
		showShipmentModal = true;
	}

	function acceptShipment() {
		const save = getCachedSave(); if (!save) return;
		const now = Date.now();
		grantStrangeMatter(save, STRANGE_MATTER_WEEKLY_SHIPMENT);
		save.lastWeeklyBlackMarketShipmentClaimedAt = now;
		persistSave(save);
		refreshBlackMarketState();
		refreshBmCopy();
		showShipmentModal = false;
		uiSound('upgrade');
		const acceptedMsg = blackMarketCopy.shipmentAccepted();
		toast(acceptedMsg + ' +' + STRANGE_MATTER_WEEKLY_SHIPMENT + ' Strange Matter', 'success');
		toast(getOpLogMessage('blackMarketShipmentClaimed'), 'info');
		notifications.notify({ kind: 'shipment', title: 'Shipment accepted', detail: `+${STRANGE_MATTER_WEEKLY_SHIPMENT} Strange Matter` });
		playForNotification('shipment');
	}

	function claimDailyPickup() {
		const save = getCachedSave(); if (!save) return;
		const now = Date.now();
		if (!isBlackMarketUnlocked(save.frontBestWave ?? {})) {
			toast('No carrier detected. Field exposure insufficient.', 'info');
			return;
		}
		if (!canClaimDailyStrangeMatter(true, save.lastDailyStrangeMatterPickedUpAt ?? 0, now)) {
			toast('Already picked up today. The vendor only slips you so much.', 'info');
			return;
		}
		grantStrangeMatter(save, STRANGE_MATTER_DAILY_PICKUP);
		save.lastDailyStrangeMatterPickedUpAt = now;
		persistSave(save);
		refreshBlackMarketState();
		refreshBmCopy();
		uiSound('upgrade');
		toast(blackMarketCopy.dailyPickup() + ' +' + STRANGE_MATTER_DAILY_PICKUP + ' Strange Matter', 'success');
		toast(getOpLogMessage('blackMarketDailyPickupClaimed'), 'info');
		notifications.notify({ kind: 'pickup', title: 'Strange Matter received', detail: `+${STRANGE_MATTER_DAILY_PICKUP} Strange Matter` });
	}

	function buyBlackMarketUnlock(id: BlackMarketUnlockId) {
		const save = getCachedSave(); if (!save) return;
		const unlocks = { ...(save.blackMarketUnlocks ?? {}) };
		const result = canBuyBlackMarketUnlock(save.strangeMatter ?? 0, unlocks, id);
		if (!result.ok || !result.def) {
			if (result.reason === 'owned') toast('Already procured. The receipt has vanished.', 'info');
			else if (result.reason === 'missingRequirement') toast('Prerequisite missing from the manifest.', 'warning');
			else if (result.reason === 'scaffold') toast('Outsourced Lab procurement is not available yet.', 'info');
			else toast('Not enough Strange Matter.', 'error');
			return;
		}
		save.strangeMatter -= result.def.cost;
		save.blackMarketUnlocks = { ...unlocks, [id]: true };
		persistSave(save);
		refreshBlackMarketState();
		uiSound('upgrade');
		toast(result.def.name + ' unlocked.', 'success');
		toast(getOpLogMessage('blackMarketUnlockPurchased', { name: result.def.name }), 'info');
	}

	function toggleAutoDeployment() {
		const save = getCachedSave(); if (!save) return;
		if (!hasBlackMarketUnlock(save.blackMarketUnlocks, 'autoDeployment')) {
			toast('Auto Deployment must be procured first.', 'warning');
			return;
		}
		save.autoDeploymentEnabled = !save.autoDeploymentEnabled;
		persistSave(save);
		refreshBlackMarketState();
		toast('Auto Deployment ' + (save.autoDeploymentEnabled ? 'armed.' : 'disabled.'), 'info');
	}

	function convertOneSchematic(max = false) {
		const save = getCachedSave(); if (!save) return;
		if (!hasBlackMarketUnlock(save.blackMarketUnlocks, 'schematicConverter')) {
			toast('Schematic Converter locked.', 'warning');
			return;
		}
		const available = getSchematics(save.schematicsByFront, converterSourceFront);
		const count = max ? Math.floor(available / SCHEMATIC_CONVERSION_RATE) : 1;
		const result = convertSchematics(save.schematicsByFront, converterSourceFront, count);
		if (!result.ok) {
			toast('Conversion refused. The numbers were too honest.', 'error');
			return;
		}
		save.schematicsByFront = result.schematics;
		schematicsByFront = { ...save.schematicsByFront };
		persistSave(save);
		toast('Converted ' + result.converted + ' restricted Schematic' + (result.converted === 1 ? '.' : 's.'), 'success');
		toast(getOpLogMessage('blackMarketConverterUsed', { converted: result.converted }), 'info');
	}

	function refreshLabProgress() {
		const save = getCachedSave(); if (!save) return;
		// Sync lab levels and campaign stats so all sections stay current
		labLevels = { ...(save.labLevels ?? {}) } as Record<string, number>;
		hubStats = {
			bestKillstreak: save.bestKillstreak ?? 0,
			totalKills: save.totalKills ?? 0,
			totalBossesDefeated: save.totalBossesDefeated ?? 0,
			totalShiniesKilled: save.totalShiniesKilled ?? 0,
			totalAlloyEarned: save.totalAlloyEarned ?? 0,
		};
		if (save.activeLab) {
			activeLabId = save.activeLab.labId;
			activeLabTarget = save.activeLab.targetLevel;
			activeLabFinish = save.activeLab.finishesAt;
			const now = Date.now();
			const total = save.activeLab.finishesAt - save.activeLab.startedAt;
			const elapsed = now - save.activeLab.startedAt;
			labProgressPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
		} else {
			activeLabId = null;
			activeLabTarget = 0;
			activeLabFinish = 0;
			labProgressPct = 0;
		}
	}

	function isBlueprintOwned(id: BlueprintId): boolean { return ownedBlueprints.includes(id); }
	function isBlueprintDiscovered(id: BlueprintId): boolean { return discoveredBlueprints.includes(id); }
	/** Reconstruct (unlock) an upgrade path by spending its Front's Schematics. */
	function buyBlueprint(id: BlueprintId) {
		const save = getCachedSave(); if (!save) return;
		const bp = BLUEPRINT_DEFS.find(b => b.id === id); if (!bp) return;
		if (ownedBlueprints.includes(id)) { toast(getOpLogMessage('blueprintAlreadyOwned'), 'info'); return; }
		if (!discoveredBlueprints.includes(id)) { toast(getOpLogMessage('blueprintNotYetFound'), 'error'); return; }
		const cost = getPathSchematicCost(id);
		if (!cost) { toast('No Schematic cost defined for this path.', 'error'); return; }
		save.schematicsByFront = normalizeSchematics(save.schematicsByFront);
		if (!tryUnlockPathWithSchematics(save.schematicsByFront, save.unlockedBlueprints ?? [], id)) {
			toast('Not enough ' + getFrontName(FRONT_META[cost.front - 1]!.id) + ' Schematics (need ' + cost.cost + ').', 'error');
			return;
		}
		save.unlockedBlueprints = [...(save.unlockedBlueprints ?? []), id];
		ownedBlueprints = [...ownedBlueprints, id];
		schematicsByFront = { ...save.schematicsByFront };
		persistSave(save);
		toast(bp.name + ' reconstructed!', 'success');
	}

	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let importText = $state('');
	let importTriggerEl = $state<HTMLButtonElement | null>(null);
	let resetTriggerEl = $state<HTMLButtonElement | null>(null);
	let importDialogEl = $state<HTMLDivElement | null>(null);
	let resetDialogEl = $state<HTMLDivElement | null>(null);
	let importTextareaEl = $state<HTMLTextAreaElement | null>(null);
	let resetCancelEl = $state<HTMLButtonElement | null>(null);
	let localProfile = $state<LocalPlayerIdentity | null>(null);
	let localProfileName = $state('');
	let localProfileStatus = $state<'local' | 'synced' | 'offline' | 'rejected'>('local');
	let communityBuff = $state<CommunityBuffState>({ percent: 0, activeUntil: null, loaded: false });

	// ── Optional account / cloud save / support code ──
	let account = $state<AccountInfo | null>(null);
	let accountLoaded = $state(false);
	let authMode = $state<'login' | 'register'>('login');
	let authError = $state<string | null>(null);
	let authBusy = $state(false);
	let loginUsername = $state('');
	let loginPassword = $state('');
	let regUsername = $state('');
	let regDisplayName = $state('');
	let regPassword = $state('');
	let regConfirm = $state('');
	let supportCode = $state<{ code: string; ownerType: 'local_identity' | 'account' } | null>(null);
	let supportCodeCopied = $state(false);
	let cloudMeta = $state<CloudSaveMetadata | null>(null);
	let cloudExists = $state(false);
	let cloudChecked = $state(false);
	let cloudError = $state<string | null>(null);
	let cloudBusy = $state(false);
	let lastCloudConflictNotice = $state('');
	let showUploadConfirm = $state(false);
	let showRestoreConfirm = $state(false);
	let uploadConfirmDialogEl = $state<HTMLDivElement | null>(null);
	let restoreConfirmDialogEl = $state<HTMLDivElement | null>(null);
	const toasts = createToastStore(3000);
	const toast = toasts.push;

	// Visibility states for password inputs
	let showLoginPassword = $state(false);
	let showRegPassword = $state(false);
	let showRegConfirm = $state(false);

	// Success modal states
	let showRegisterSuccess = $state(false);
	let registeredDisplayName = $state('');
	let regSuccessOkBtnEl = $state<HTMLButtonElement | null>(null);
	let regSuccessDialogEl = $state<HTMLDivElement | null>(null);

	// Validation checks
	const regUsernameTrimmed = $derived(regUsername.trim());
	const regUsernameValid = $derived(isValidUsername(regUsername));
	const showRegUsernameWarn = $derived(regUsername.length > 0 && !regUsernameValid);

	const regPasswordValid = $derived(isValidPassword(regPassword));
	const showRegPasswordWarn = $derived(regPassword.length > 0 && !regPasswordValid);

	const regConfirmMatch = $derived(regPassword === regConfirm);
	const showRegConfirmWarn = $derived(regConfirm.length > 0 && !regConfirmMatch);

	const regDisplayNameValid = $derived(isValidDisplayName(regDisplayName));
	const showRegDisplayNameWarn = $derived(regDisplayName.length > 0 && !regDisplayNameValid);

	const canSubmitRegister = $derived(
		regUsernameValid && 
		regPasswordValid && 
		regConfirmMatch && 
		regDisplayNameValid && 
		!authBusy
	);

	const canSubmitLogin = $derived(
		loginUsername.trim().length > 0 &&
		loginPassword.length > 0 &&
		!authBusy
	);

	const localProfileNameValid = $derived(isValidDisplayName(localProfileName));
	const showLocalProfileNameWarn = $derived(localProfileName.length > 0 && !localProfileNameValid);

	// Password strength heuristic
	function getPasswordStrength(p: string): { score: number; label: string; color: string } {
		if (p.length === 0) return { score: 0, label: '', color: '' };
		if (p.length < 10) return { score: 1, label: 'Too short', color: 'var(--red)' };
		
		let score = 2;
		const hasUpper = /[A-Z]/.test(p);
		const hasLower = /[a-z]/.test(p);
		const hasDigit = /[0-9]/.test(p);
		const hasSpecial = /[^A-Za-z0-9]/.test(p);
		
		const varieties = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
		if (varieties >= 3 && p.length >= 12) {
			score = 4;
		} else if (varieties >= 2 || p.length >= 12) {
			score = 3;
		}
		
		if (score === 2) return { score, label: 'Weak', color: 'var(--orange)' };
		if (score === 3) return { score, label: 'Medium', color: 'var(--yellow)' };
		return { score, label: 'Strong', color: 'var(--green)' };
	}
	const regPasswordStrength = $derived(getPasswordStrength(regPassword));

	// Cloud status derived info
	const cloudSyncStatus = $derived.by(() => {
		if (!cloudChecked) return { type: 'info', text: 'Cloud status not checked yet.', icon: '🛰️', color: 'var(--text-dim)' };
		if (!cloudExists) return { type: 'warning', text: 'No cloud backup found. Upload your local save to create one.', icon: 'ℹ️', color: 'var(--yellow)' };
		if (cloudMeta) {
			if (cloudMeta.schemaVersion > CURRENT_SCHEMA_VERSION) {
				return { type: 'error', text: 'Cloud backup is from a newer game version. Please update your game.', icon: '⚠️', color: 'var(--red)' };
			}
			if (isCloudNewerThanLocal()) {
				return { type: 'conflict-cloud', text: 'Cloud backup is newer than your local save. Restore recommended.', icon: '📥', color: 'var(--yellow)' };
			}
			if (isLocalNewerThanCloud()) {
				return { type: 'conflict-local', text: 'Local save is newer than cloud backup. Upload recommended.', icon: '📤', color: 'var(--cyan)' };
			}
			return { type: 'success', text: 'Cloud backup is up-to-date with this device.', icon: '✅', color: 'var(--green)' };
		}
		return { type: 'info', text: 'Cloud status check complete.', icon: '🛰️', color: 'var(--text-secondary)' };
	});

	// Scroll-to-top tracking (D5)
	let showBackToTop = $state(false);
	let hubPageEl = $state<HTMLElement | null>(null);

	function handleScroll(e: Event) {
		const target = e.currentTarget as HTMLElement;
		showBackToTop = target.scrollTop > 300;
	}

	function scrollToTop() {
		hubPageEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Deep-link section selection (C8)
	$effect(() => {
		const sectionParam = page.url.searchParams.get('section');
		if (sectionParam) {
			const validSections = ['workshop', 'orders', 'lab', 'blueprints', 'blackMarket', 'tiers', 'challenges', 'simulation', 'stats', 'settings', 'profile'];
			if (validSections.includes(sectionParam) && activeSection !== sectionParam) {
				activeSection = sectionParam as any;
			}
		}
	});

	function switchAuthMode(mode: 'login' | 'register') {
		authMode = mode;
		authError = null;
		loginUsername = '';
		loginPassword = '';
		regUsername = '';
		regDisplayName = '';
		regPassword = '';
		regConfirm = '';
		showLoginPassword = false;
		showRegPassword = false;
		showRegConfirm = false;
	}

	async function openImportDialog() {
		showImportDialog = true;
		await tick();
		importTextareaEl?.focus();
	}

	function closeImportDialog(restoreFocus = true) {
		showImportDialog = false;
		importText = '';
		if (restoreFocus) queueMicrotask(() => importTriggerEl?.focus());
	}

	async function openResetDialog() {
		showResetConfirm = true;
		await tick();
		resetCancelEl?.focus();
	}

	function closeResetDialog(restoreFocus = true) {
		showResetConfirm = false;
		if (restoreFocus) queueMicrotask(() => resetTriggerEl?.focus());
	}

	async function submitImportDialog() {
		const r = await importSave(importText);
		if (r.success) {
			toast(getOpLogMessage('saveImported'), 'success');
		} else {
			toast(r.error ?? getOpLogMessage('saveImportFailed'), 'error', 6000);
		}
		closeImportDialog();
		if (r.success) {
			const s = getCachedSave();
			if (s) {
				coinsStore.set(s.totalCoins);
				highestWaveStore.set(s.highestWave);
				totalRunsStore.set(s.totalRuns);
			}
		}
	}

	async function confirmResetDialog() {
		await resetSave();
		closeResetDialog();
		coinsStore.set(0);
		highestWaveStore.set(0);
		totalRunsStore.set(0);
		settingsStore.set({ ...DEFAULT_SETTINGS });
		toast(getOpLogMessage('saveReset'), 'warning');
	}

	function onModalKeydown(e: KeyboardEvent, dialog: HTMLDivElement | null, close: () => void) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
		if (focusable.length === 0) {
			e.preventDefault();
			dialog.focus();
			return;
		}
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

	async function refreshLocalProfileSync(identity: LocalPlayerIdentity) {
		const status = await syncLocalIdentity(identity);
		localProfileStatus = status;
	}

	function saveLocalProfile() {
		const updated = saveLocalDisplayName(localProfileName);
		localProfile = updated;
		localProfileName = updated.displayName;
		localProfileStatus = 'local';
		void refreshLocalProfileSync(updated);
		toast('Local Profile updated.', 'success');
	}

	// ── Optional account / cloud save / support code ──
	async function refreshSupportCode() {
		supportCode = await getSupportCode();
	}

	async function handleRegister() {
		authError = null;
		if (regPassword !== regConfirm) { authError = 'Passwords do not match.'; return; }
		authBusy = true;
		try {
			const r = await registerAccount(regUsername, regPassword, regDisplayName || undefined);
			if (r.ok) {
				registeredDisplayName = regDisplayName || regUsername;
				showRegisterSuccess = true;
				regUsername = ''; regDisplayName = ''; regPassword = ''; regConfirm = '';
				toast('Account created successfully!', 'success');
				await tick();
				regSuccessOkBtnEl?.focus();
			}
			else authError = r.message;
		} finally { authBusy = false; }
	}

	async function handleLogin() {
		authError = null;
		authBusy = true;
		try {
			const r = await loginAccount(loginUsername, loginPassword);
			if (r.ok) {
				loginUsername = ''; loginPassword = '';
				toast('Logged in successfully!', 'success');
			}
			else authError = r.message;
		} finally { authBusy = false; }
	}

	async function handleLogout() {
		authBusy = true;
		try {
			await logoutAccount();
			toast('Logged out successfully.', 'success');
		}
		finally { authBusy = false; }
		// Local save is untouched; cloud view clears with the account.
	}

	async function refreshCloudStatus() {
		cloudBusy = true; cloudError = null;
		try {
			const r = await fetchCloudSaveMeta();
			if (r.ok) {
				cloudExists = r.exists;
				cloudMeta = r.metadata;
				cloudChecked = true;
				notifyCloudConflict(r.metadata);
			}
			else { cloudError = r.offline ? 'Cloud status unavailable offline.' : r.message; }
		} finally { cloudBusy = false; }
	}

	function getCloudUpdatedMs(meta: CloudSaveMetadata | null = cloudMeta): number {
		return meta ? new Date(meta.updatedAt).getTime() : 0;
	}

	function isCloudNewerThanLocal(meta: CloudSaveMetadata | null = cloudMeta): boolean {
		const localUpdatedAt = getCachedSave()?.lastUpdated ?? 0;
		const cloudUpdatedAt = getCloudUpdatedMs(meta);
		return cloudUpdatedAt > 0 && localUpdatedAt > 0 && cloudUpdatedAt > localUpdatedAt;
	}

	function isLocalNewerThanCloud(meta: CloudSaveMetadata | null = cloudMeta): boolean {
		const localUpdatedAt = getCachedSave()?.lastUpdated ?? 0;
		const cloudUpdatedAt = getCloudUpdatedMs(meta);
		return cloudUpdatedAt > 0 && localUpdatedAt > cloudUpdatedAt;
	}

	function notifyCloudConflict(meta: CloudSaveMetadata | null) {
		if (!isCloudNewerThanLocal(meta)) return;
		const noticeKey = meta?.updatedAt ?? '';
		if (noticeKey && noticeKey !== lastCloudConflictNotice) {
			lastCloudConflictNotice = noticeKey;
			toast('Cloud backup is newer than this local save. Restore it before uploading if this device is behind.', 'warning', 6000);
		}
	}

	function confirmUploadCloud() {
		// Require explicit confirmation only when a cloud save already exists.
		if (cloudExists) showUploadConfirm = true;
		else void doUploadCloud();
	}

	async function doUploadCloud() {
		showUploadConfirm = false;
		const save = getCachedSave();
		if (!save) { toast('No local save to upload.', 'error'); return; }
		cloudBusy = true; cloudError = null;
		try {
			const r = await uploadCloudSave(save as unknown as Record<string, unknown>, CURRENT_SCHEMA_VERSION, APP_VERSION || 'unknown');
			if (r.ok) { cloudExists = true; cloudMeta = r.metadata; cloudChecked = true; toast('Cloud backup updated.', 'success'); }
			else cloudError = r.offline ? 'Cloud upload unavailable offline.' : r.message;
		} finally { cloudBusy = false; }
	}

	async function doRestoreCloud() {
		showRestoreConfirm = false;
		cloudBusy = true; cloudError = null;
		try {
			const r = await fetchCloudSaveFull();
			if (!r.ok) { cloudError = r.offline ? 'Cloud restore unavailable offline.' : r.message; return; }
			if (!r.exists || !r.saveJson) { cloudError = 'No cloud save to restore.'; return; }
			// Re-encode and run through the standard import pipeline so the cloud
			// payload gets migration + validation + newer-schema rejection. A cloud
			// save can never crash the app this way.
			const exported = await exportSaveFromData(r.saveJson as unknown as SaveData);
			const result = await importSave(exported);
			if (!result.success) { cloudError = result.error ?? 'Cloud restore failed.'; return; }
			toast('Cloud save restored. Reloading…', 'success');
			// Full local-save replace → reload so every section reinitializes safely.
			setTimeout(() => location.reload(), 450);
		} catch {
			cloudError = 'Cloud restore failed.';
		} finally { cloudBusy = false; }
	}

	async function copySupportCode() {
		if (!supportCode) return;
		try {
			await navigator.clipboard?.writeText(supportCode.code);
			supportCodeCopied = true;
			setTimeout(() => { supportCodeCopied = false; }, 1500);
		} catch {
			// Clipboard blocked — the code stays visible to select/copy manually.
		}
	}

	onMount(() => {
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		const u5 = communityBuffStore.subscribe(b => { communityBuff = b; });
		void communityBuffStore.refreshIfStale();
		// Optional account: determine login status via /api/auth/me (httpOnly cookie).
		const u6 = accountStore.subscribe(s => {
			const prev = account;
			account = s.account;
			accountLoaded = s.loaded;
			if (prev?.id !== s.account?.id) {
				void refreshSupportCode();
				if (s.account) void refreshCloudStatus();
				else { cloudMeta = null; cloudExists = false; cloudChecked = false; cloudError = null; }
			}
		});
		void accountStore.refresh();
		void refreshSupportCode();
		const save = getCachedSave();
		if (save?.unlockedBlueprints) ownedBlueprints = [...save.unlockedBlueprints];
		if (save?.discoveredBlueprints) discoveredBlueprints = [...save.discoveredBlueprints];
		if (save?.schematicsByFront) schematicsByFront = { ...save.schematicsByFront };
		workshopLevels = { ...(save?.workshopUpgrades ?? {}) } as Record<WorkshopUpgradeId, number>;
		forgeLevels = { ...(save?.forgeUpgrades ?? {}) } as Record<UpgradeId, number>;
		labLevels = { ...(save?.labLevels ?? {}) } as Record<string, number>;
		hubStats = {
			bestKillstreak: save?.bestKillstreak ?? 0,
			totalKills: save?.totalKills ?? 0,
			totalBossesDefeated: save?.totalBossesDefeated ?? 0,
			totalShiniesKilled: save?.totalShiniesKilled ?? 0,
			totalAlloyEarned: save?.totalAlloyEarned ?? 0,
		};
		refreshBlackMarketState();
		refreshCommandOrders();
		if (save?.frontBestWave) frontBestWave = { ...save.frontBestWave };
		if (save?.killsByType) killsByType = { ...save.killsByType };
		if (save?.shinyKillsByType) shinyKillsByType = { ...save.shinyKillsByType };
		lifetimeStats = {
			totalEnergyEarned: save?.totalEnergyEarned ?? 0,
			totalDamageDealt: save?.totalDamageDealt ?? 0,
			totalCritsDealt: save?.totalCritsDealt ?? 0,
			totalWavesCompleted: save?.totalWavesCompleted ?? 0,
			totalPlayTimeSeconds: save?.totalPlayTimeSeconds ?? 0,
		};
		masteryAchievements = { ...(save?.masteryAchievements ?? {}) };
		challengeHighScores = { ...(save?.challengeHighScores ?? {}) };
		refreshLabProgress();
		labProgressTimer = setInterval(refreshLabProgress, 1000);
		clockTimer = setInterval(() => { nowTick = Date.now(); }, 30000);
		localProfile = loadLocalIdentity();
		localProfileName = localProfile.displayName;
		void refreshLocalProfileSync(localProfile);

		const introSave = getCachedSave();
		if (introSave && isBlackMarketUnlocked(introSave.frontBestWave ?? {}) && !introSave.blackMarketIntroSeen) {
			showBlackMarketIntro = true;
		}

		return () => { u1(); u2(); u3(); u4(); u5(); u6(); if (labProgressTimer) clearInterval(labProgressTimer); if (clockTimer) clearInterval(clockTimer); toasts.clear(); };
	});

	function wLv(id: WorkshopUpgradeId): number { return workshopLevels[id] ?? 0; }
	function buyWorkshopUpgrade(id: WorkshopUpgradeId) {
		const save = getCachedSave(); if (!save) return;
		const upgrade = WORKSHOP_UPGRADES.find(u => u.id === id);
		const maxLv = upgrade?.maxLevel ?? 100;
		const initialLv = save.workshopUpgrades[id] ?? 0;
		if (initialLv >= maxLv) { toast(getOpLogMessage('workshopMaxLevel'), 'warning'); return; }

		let bought = 0;
		for (let i = 0; i < (buyMultiplier === 'max' ? 999999 : buyMultiplier); i++) {
			const lv = save.workshopUpgrades[id] ?? 0;
			if (lv >= maxLv) break;
			const cost = getWorkshopUpgradeCost(id, lv);
			if (save.totalCoins < cost) break;
			save.totalCoins -= cost;
			save.workshopUpgrades[id] = lv + 1;
			bought++;
		}

		if (bought > 0) {
			coinsStore.set(save.totalCoins);
			persistSave(save);
			workshopLevels = { ...save.workshopUpgrades } as Record<WorkshopUpgradeId, number>;
			uiSound('upgrade');
			const newLv = initialLv + bought;
			toast('🔧 ' + (upgrade?.name ?? id) + ' → Lv.' + newLv + (bought > 1 ? ' (+' + bought + ')' : ''), 'success');
		} else {
			toast(getOpLogMessage('workshopNotEnough'), 'error');
		}
	}

	// ─── Combat Forge (shared Field-upgrade curve) ───────────────────────────
	function fLv(id: UpgradeId): number { return forgeLevels[id] ?? 0; }
	/** Permanent value at a Forge level, formatted like the in-run Field card. */
	function forgeValueLabel(id: UpgradeId, level: number): string {
		return formatBattleEffect(id, getForgeUpgradeEffect(id, level));
	}
	function buyForgeUpgrade(id: UpgradeId) {
		const save = getCachedSave(); if (!save) return;
		const upgrade = FORGE_UPGRADES.find(u => u.id === id);
		if (!upgrade) return;
		const maxLv = upgrade.maxLevel;
		if (upgrade.requiredBlueprint && !isFieldUpgradeUnlocked(id, ownedBlueprints)) { return; }
		const initialLv = save.forgeUpgrades[id] ?? 0;
		if (initialLv >= maxLv) { toast(getOpLogMessage('workshopMaxLevel'), 'warning'); return; }

		let bought = 0;
		for (let i = 0; i < (buyMultiplier === 'max' ? 999999 : buyMultiplier); i++) {
			const lv = save.forgeUpgrades[id] ?? 0;
			if (lv >= maxLv) break;
			const cost = getForgeUpgradeCost(id, lv);
			if (save.totalCoins < cost) break;
			save.totalCoins -= cost;
			save.forgeUpgrades[id] = lv + 1;
			bought++;
		}

		if (bought > 0) {
			coinsStore.set(save.totalCoins);
			persistSave(save);
			forgeLevels = { ...save.forgeUpgrades } as Record<UpgradeId, number>;
			uiSound('upgrade');
			const newLv = initialLv + bought;
			toast('🔧 ' + upgrade.name + ' → Lv.' + newLv + (bought > 1 ? ' (+' + bought + ')' : ''), 'success');
		} else {
			toast(getOpLogMessage('workshopNotEnough'), 'error');
		}
	}

	// ─── Weekly Orbital Command Orders ───────────────────────────────────────
	function refreshCommandOrders() {
		const save = getCachedSave(); if (!save) return;
		const weekKey = commandOrdersWeekKey();
		const rolled = rolloverCommandOrders(save.commandOrders, weekKey);
		if (rolled !== save.commandOrders) { save.commandOrders = rolled; persistSave(save); }
		// Refresh the board if cooldown expired
		if (shouldRefreshBoard(save.commandOrders)) {
			save.commandOrders = refreshBoard(save.commandOrders);
			persistSave(save);
		}
		commandOrderPool = generateCommandOrders(weekKey, { highestWave, unlockedFrontCount: unlockedFronts.length });
		commandOrdersState = {
			week: save.commandOrders.week,
			completedCount: save.commandOrders.completedCount,
			claimedOrderSlots: [...save.commandOrders.claimedOrderSlots],
			claimedMilestones: [...save.commandOrders.claimedMilestones],
			counters: { ...save.commandOrders.counters },
			boardRefreshedAt: save.commandOrders.boardRefreshedAt,
		};
	}

	function claimCommandOrder(slot: number) {
		const save = getCachedSave(); if (!save) return;
		const res = claimOrder(commandOrderPool, save.commandOrders, slot);
		if (!res) { toast('Order not complete yet.', 'info'); return; }
		save.commandOrders = res.state;
		save.totalCoins += res.reward;
		coinsStore.set(save.totalCoins);
		persistSave(save);
		refreshCommandOrders();
		uiSound('upgrade');
		toast('🛰 Order complete. +' + res.reward + ' Alloy', 'success');
		notifications.notify({ kind: 'achievement', title: 'Order complete', detail: `+${res.reward} Alloy`, icon: '🛰' });
	}

	function claimGiftBox(milestone: number) {
		const save = getCachedSave(); if (!save) return;
		const res = claimMilestone(save.commandOrders, milestone);
		if (!res) { toast('Command Gift Box not ready.', 'info'); return; }
		save.commandOrders = res.state;
		save.totalCoins += res.reward;
		coinsStore.set(save.totalCoins);
		persistSave(save);
		refreshCommandOrders();
		uiSound('upgrade');
		toast('🎁 Command Gift Box — +' + res.reward + ' Alloy', 'milestone');
		notifications.notify({ kind: 'achievement', title: 'Command Gift Box', detail: `+${res.reward} Alloy`, icon: '🎁' });
	}

	function claimAllCompleted() {
		const save = getCachedSave(); if (!save) return;
		const result = claimAllCompletedOrders(commandOrderPool, save.commandOrders);
		if (!result) { toast('No completed orders to claim.', 'info'); return; }
		save.commandOrders = result.state;
		save.totalCoins += result.totalReward;
		coinsStore.set(save.totalCoins);
		persistSave(save);
		refreshCommandOrders();
		uiSound('upgrade');
		toast('🛰 ' + result.claimedCount + ' orders claimed — +' + result.totalReward + ' Alloy', 'success');
		notifications.notify({ kind: 'achievement', title: 'Orders claimed', detail: `+${result.totalReward} Alloy`, icon: '🛰' });
		// Notify about newly unlocked gift milestones
		for (const m of result.newlyUnlockedMilestones) {
			toast('🎁 Command Gift Box (' + m + ') unlocked!', 'milestone');
		}
	}

	// Time-based lab research
	function startLabResearch(id: string) {
		const save = getCachedSave(); if (!save) return;
		const def = LAB_DEFS.find(l => l.id === id); if (!def) return;
		const lv = (save.labLevels as Record<string, number>)[id] ?? 0;
		if (lv >= def.maxLevel) { toast(getOpLogMessage('labMaxLevel'), 'warning'); return; }
		if (save.activeLab) { toast(getOpLogMessage('labAlreadyActive'), 'warning'); return; }
		const cost = getLabCost(id as any, lv);
		const duration = getLabDuration(id as any, lv);
		if (save.totalCoins < cost) { toast(getOpLogMessage('workshopNotEnough'), 'error'); return; }
		save.totalCoins -= cost;
		const now = Date.now();
		save.activeLab = {
			labId: id as any,
			targetLevel: lv + 1,
			startedAt: now,
			finishesAt: now + duration,
		};
		coinsStore.set(save.totalCoins);
		persistSave(save);
		refreshLabProgress();
		uiSound('upgrade');
		toast('🔬 Started ' + def.name + ' Lv.' + (lv + 1) + ' — ' + formatLabDuration(duration), 'success');
	}

	function lLv(id: string): number { return labLevels[id] ?? 0; }

	/** Toggle a boolean setting and persist it. Used by both click and keyboard. */
	function toggleSetting(key: keyof GameSettings) {
		const save = getCachedSave(); if (!save) return;
		const next = !settings[key];
		save.settings[key] = next;
		settingsStore.set({ ...save.settings });
		persistSave(save);
		// Enabling lab notifications needs OS permission — request it from this
		// user gesture, otherwise the layout's notification check never fires.
		if (key === 'browserNotifications' && next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
			Notification.requestPermission().catch(() => {});
		}
	}

	const settingsList = []; // Kept empty or removed if unused, svelte-check will flag if needed. We will clean up settingsList later.

	const allSections = [
		{ id: 'workshop' as const, label: 'Forge', icon: '⚙' },
		{ id: 'orders' as const, label: 'Command Orders', icon: '🛰' },
		{ id: 'lab' as const, label: 'Research Deck', icon: '🔬' },
		{ id: 'blueprints' as const, label: 'Schematics', icon: '📐' },
		{ id: 'blackMarket' as const, label: 'Black Market', icon: '◈', requiresUnlock: true },
		{ id: 'tiers' as const, label: 'Fronts', icon: '🌍' },
		{ id: 'challenges' as const, label: 'Special Operations', icon: '⚡' },
		{ id: 'simulation' as const, label: 'Simulation', icon: '🧪' },
		{ id: 'stats' as const, label: 'Archives', icon: '📊' },
		{ id: 'profile' as const, label: 'Profile', icon: '👤' },
		{ id: 'settings' as const, label: 'Systems', icon: '⚙' },
	];
	let visibleSections = $derived(allSections.filter(s => !s.requiresUnlock || bmUnlocked));

	function uiSound(name: 'click' | 'upgrade') {
		audio.unlock();
		audio.play(name === 'click' ? 'uiClick' : 'upgrade');
	}

	function switchSection(id: typeof activeSection) {
		if (id !== activeSection) uiSound('click');
		activeSection = id;
		if (id === 'orders') refreshCommandOrders();
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (id === 'workshop') {
				url.searchParams.delete('section');
			} else {
				url.searchParams.set('section', id);
			}
			window.history.replaceState({}, '', url.toString());
		}
	}

	async function onHubNavKeydown(e: KeyboardEvent, id: typeof activeSection) {
		const currentIndex = visibleSections.findIndex(s => s.id === id);
		if (currentIndex < 0) return;

		let nextIndex = currentIndex;
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
			nextIndex = (currentIndex + 1) % visibleSections.length;
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
			nextIndex = (currentIndex - 1 + visibleSections.length) % visibleSections.length;
		} else if (e.key === 'Home') {
			nextIndex = 0;
		} else if (e.key === 'End') {
			nextIndex = visibleSections.length - 1;
		} else {
			return;
		}

		e.preventDefault();
		const nextSection = visibleSections[nextIndex]?.id;
		if (!nextSection) return;
		switchSection(nextSection);
		await tick();
		document.getElementById('hub-tab-' + nextSection)?.focus();
	}

	$effect(() => {
		if (showBlackMarketIntro) tick().then(() => blackMarketIntroDialogEl?.focus());
		if (showShipmentModal) tick().then(() => shipmentDialogEl?.focus());
		if (showUploadConfirm) tick().then(() => uploadConfirmDialogEl?.focus());
		if (showRestoreConfirm) tick().then(() => restoreConfirmDialogEl?.focus());
	});

	function getChallengeName(id: string): string {
		return CHALLENGES.find(c => c.id === id)?.name ?? id;
	}

	$effect(() => {
		if (!bmUnlocked && activeSection === 'blackMarket') {
			activeSection = 'workshop';
		}
		if (activeSection === 'blackMarket') {
			refreshBmCopy();
		}
	});
</script>

<svelte:head>
	<title>Orbital Command — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD Orbital Command — Forge upgrades, Research Deck projects, Fronts, Special Operations, Simulation, Archives, and Systems." />
</svelte:head>

<main class="hub-page" bind:this={hubPageEl} onscroll={handleScroll}>
	<div class="bg-grid"></div>

	<Tutorial steps={hubTutorialSteps} tutorialKey={HUB_TUTORIAL_KEY} />

	<Toasts controller={toasts} vertical="top" offsetRem={5} />


	<header class="hub-top">
		<a href="/" class="hub-back">← Home</a>
		<a href="/play" class="hub-deploy">→ Deploy</a>
		<h1 class="hub-title">🛰️ Orbital Command</h1>
		<div class="hub-coins">
			<span use:tooltip={'Alloy — your permanent currency.\nEarned every deployment, spent in the Forge and Research Deck.\nNever lost when a tower falls.'}>🔩 {coins.toLocaleString()}</span>
			<span class="hub-sm" use:tooltip={'Strange Matter — recovered through the Black Market.\nSpent on contraband procurements. Orbital Command does not authorize it.'}>◈ {strangeMatter.toLocaleString()}</span>
			{#if bmUnlocked}
				<button
					class="bm-signal"
					class:bm-signal-glow={bmSignal === 'glow'}
					class:bm-signal-subtle={bmSignal === 'subtle'}
					onclick={() => { if (!blackMarketIntroSeen) { showBlackMarketIntro = true; } else { switchSection('blackMarket'); } }}
					aria-label={bmSignal === 'glow' ? 'Black Market — unauthorized signal active' : 'Black Market === unauthorized channel'}
					use:tooltip={bmSignal === 'glow' ? 'Unauthorized signal active — something is waiting.' : 'Black Market — unauthorized channel.'}
				>
					◈
				</button>
			{/if}
			{#if account}
				<button class="hub-top-account" onclick={() => switchSection('profile')} use:tooltip={`Logged in as ${account.username}.\nClick to manage profile / cloud save.`}>
					<Icon name="user" size={14} /> <span class="hub-top-username">{account.displayName}</span>
				</button>
			{:else}
				<button class="hub-top-account" onclick={() => switchSection('profile')} use:tooltip={'Not logged in.\nClick to log in or register.'}>
					<Icon name="user" size={14} /> <span class="hub-top-username text-dim">Guest</span>
				</button>
			{/if}
			<NotificationCenter />
		</div>
	</header>
	<p class="hub-desc">🛰️ Orbital Command — your permanent base between deployments. Forge, Command Orders, Research, Schematics, Fronts, Special Operations, Simulation, Archives, Profile, and Systems all live here.</p>

	<div class="hub-body">
		<div class="hub-nav" role="tablist" aria-label="Orbital Command sections">
			{#each visibleSections as s}
				<button
					id={'hub-tab-' + s.id}
					class="hub-nav-btn"
					class:on={activeSection === s.id}
					data-section={s.id}
					role="tab"
					aria-selected={activeSection === s.id}
					aria-controls="hub-section-panel"
					tabindex={activeSection === s.id ? 0 : -1}
					onclick={() => switchSection(s.id)}
					onkeydown={(e) => onHubNavKeydown(e, s.id)}
				>
					{s.icon} {s.label}
				</button>
			{/each}
			{#if !bmUnlocked}
				<div class="bm-locked-teaser" aria-label="Unauthorized signal: Black Market channel unavailable">
					<span class="bm-locked-icon">◈</span>
					<span class="bm-locked-text">No carrier detected. Field exposure insufficient.</span>
				</div>
			{/if}
		</div>

		<div class="hub-content" id="hub-section-panel" role="tabpanel" aria-labelledby={'hub-tab-' + activeSection}>
			{#if activeSection === 'workshop'}
				<div class="hs"><h2 class="hst">⚙ Forge</h2><p class="hsd">Permanent pre-installed tower upgrades. Each Forge level sets the <strong>starting level</strong> of the matching Field Upgrade — the same curve continues in deployment, where you buy the next levels with Energy. Locked paths require Schematic reconstruction. The Forge never stops. Neither does the paperwork.</p>
					<div class="buy-mult">
						<span class="mult-label">Buy</span>
						{#each BUY_MULTIPLIERS as m}
							{@const val = m}
							<button class="mult-btn" class:on={buyMultiplier === val} onclick={() => buyMultiplier = val} use:tooltip={val === 'max' ? 'Buy as many levels as you can afford.\nShortcut: hold Ctrl while buying.' : val === 50 ? 'Buy up to 50 levels at once.\nShortcut: Shift + Ctrl.' : val === 10 ? 'Buy up to 10 levels at once.' : val === 5 ? 'Buy up to 5 levels at once.\nShortcut: hold Shift.' : 'Buy a single level.'}>{val === 'max' ? 'Max' : '×' + val}</button>
						{/each}
					</div>
					<h3 class="forge-sub">Combat — starting Field levels</h3>
					<div class="ug">
						{#each FORGE_UPGRADES as u}
							{@const lv = fLv(u.id)}
							{@const nl = Math.min(lv + 1, u.maxLevel)}
							{@const cost = u.cost(lv)}
							{@const aff = coins >= cost}
							{@const mx = lv >= u.maxLevel}
							{@const locked = !!u.requiredBlueprint && !isFieldUpgradeUnlocked(u.id, ownedBlueprints)}
							{@const bpName = u.requiredBlueprint ? (getBlueprintForFieldUpgrade(u.id)?.name ?? '') : ''}
							<button class="uc" class:aff={aff && !mx && !locked} class:mx={mx} class:locked={locked} disabled={!aff || mx || locked} onclick={() => buyForgeUpgrade(u.id)}
								use:tooltip={locked
									? `🔒 ${u.name}\nRequires the ${bpName} Schematic.\nReconstruct it in the Schematics tab to unlock this path.`
									: mx
										? `${u.name} — MAXED at Lv.${lv}\nStarts deployment at: ${forgeValueLabel(u.id, lv)}\nNo further Forge levels available.`
										: `${u.name} — Forge Lv.${lv}\nStarts deployment at: ${forgeValueLabel(u.id, lv)}\nNext (Lv.${nl}): ${forgeValueLabel(u.id, nl)}\nCost: ${cost.toLocaleString()} Alloy${aff ? '' : ' — not enough Alloy yet'}`}>
								<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
								{#if !locked}
									<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
									<div class="uc-val">{forgeValueLabel(u.id, lv)}</div>
									<div class="uc-b"><span class="ucc">🔩{cost.toLocaleString()}</span><span class="ucnx">{mx ? 'MAXED' : '→ ' + forgeValueLabel(u.id, nl)}</span></div>
								{:else}
									<div class="uc-val" style="color:var(--text-dim)">🔒 Requires {bpName}</div>
								{/if}
							</button>
						{/each}
					</div>
					<h3 class="forge-sub">Economy — permanent income</h3>
					<div class="ug">
						{#each WORKSHOP_UPGRADES as u}
							{@const lv = wLv(u.id)}
							{@const nl = Math.min(lv + 1, u.maxLevel)}
							{@const cost = u.cost(lv)}
							{@const aff = coins >= cost}
							{@const mx = lv >= u.maxLevel}
							{@const locked = u.requiredBlueprint && !isFoundryUpgradeUnlocked(u.id, ownedBlueprints)}
							{@const bpName = u.requiredBlueprint ? (getBlueprintForFoundryUpgrade(u.id)?.name ?? '') : ''}
							<button class="uc" class:aff={aff && !mx && !locked} class:mx={mx} class:locked={locked} disabled={!aff || mx || locked} onclick={() => buyWorkshopUpgrade(u.id)}
								use:tooltip={locked
									? `🔒 ${u.name}\nRequires the ${bpName} Schematic.\nReconstruct it in the Schematics tab to unlock this path.`
									: mx
										? `${u.name} — MAXED\nCurrent bonus: +${getWorkshopUpgradeEffect(u.id, lv)}\nNo further levels available.`
										: `${u.name}\nCurrent: ${lv > 0 ? '+' + getWorkshopUpgradeEffect(u.id, lv) : 'not yet installed'}\nNext (Lv.${nl}): +${getWorkshopUpgradeEffect(u.id, nl)}\nCost: ${cost.toLocaleString()} Alloy${aff ? '' : ' — not enough Alloy yet'}`}>
								<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
								{#if !locked}
									<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
									<div class="uc-b"><span class="ucc">🔩{cost.toLocaleString()}</span><span class="ucnx">{mx ? 'MAXED' : lv > 0 ? '→ +' + getWorkshopUpgradeEffect(u.id, nl) : 'Lv.1 +' + getWorkshopUpgradeEffect(u.id, 1)}</span></div>
								{:else}
									<div class="uc-b"><span class="ucc" style="color:var(--text-dim)">🔒 Requires {bpName}</span></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{:else if activeSection === 'orders'}
				<OrdersSection
					{commandOrderPool}
					{commandOrdersState}
					{claimGiftBox}
					{claimCommandOrder}
					{claimAllCompleted}
				/>
			{:else if activeSection === 'lab'}
				<div class="hs"><h2 class="hst">🔬 Research Deck</h2><p class="hsd">Time-based orbital research projects. Each level grants a permanent multiplicative bonus. Research continues offline. Only one project can be active at a time. Research continues offline because the scientists have been locked in. For their own safety.</p>
					{#if !activeLabId}
						<p class="empty-flavor">🔬 Research deck idle. Suspiciously quiet. Start a project below — it keeps running even while you're offline.</p>
					{/if}
					<div class="ug">
						{#each LAB_DEFS as lab}
							{@const unlocked = isLabUnlocked(lab, highestWave)}
							{@const lv = lLv(lab.id)}
							{@const cost = getLabCost(lab.id, lv)}
							{@const duration = getLabDuration(lab.id, lv)}
							{@const aff = coins >= cost}
							{@const mx = lv >= lab.maxLevel}
							{@const isResearching = activeLabId === lab.id}
							{@const currMult = 1 + getLabEffect(lab.id, lv)}
							{@const hasActive = !!activeLabId}
							{@const lockedDisplay = '🔒 Reach Wave ' + lab.unlockWave}
							<div class="uc lc" class:locked={!unlocked} class:researching={isResearching} class:mx={mx && unlocked}
								use:tooltip={!unlocked
									? `🔒 ${lab.name}\nUnlocks at Wave ${lab.unlockWave}.\nReach it on any Front to begin research.`
									: mx
										? `${lab.name} — MAXED\nCurrent: ×${currMult.toFixed(2)} multiplier`
										: isResearching
											? `${lab.name}\nResearching Lv.${activeLabTarget}…\nResearch continues even while you are offline.`
											: `${lab.name}\nCurrent: ×${currMult.toFixed(2)} multiplier\nNext (Lv.${lv + 1}): ×${(1 + getLabEffect(lab.id, lv + 1)).toFixed(2)}\nCost: ${formatCompact(cost)} Alloy · takes ${formatLabDuration(duration)}${hasActive ? '\nAnother project is already running.' : ''}`}>
								<div class="uc-t"><span class="uci">{unlocked ? lab.icon : '🔒'}</span><span class="ucn">{lab.name}</span><span class="ucl">{unlocked ? 'Lv.' + lv : lockedDisplay}</span></div>
								{#if unlocked}
									<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / lab.maxLevel) * 100)}%"></div></div>
									<div class="uc-eff">×{currMult.toFixed(2)} multiplier</div>
									{#if isResearching}
										<div class="rs-bar-track"><div class="rs-bar-fill" style="width:{labProgressPct}%"></div></div>
										<div class="rs-info">Researching Lv.{activeLabTarget} — {labProgressPct.toFixed(0)}%</div>
									{:else if mx}
										<div class="rs-info">MAXED</div>
									{:else}
										<button class="uc-b rs-btn" class:aff={aff && !hasActive} disabled={!aff || hasActive} onclick={() => startLabResearch(lab.id)}>
											<span class="ucc">🔩{formatCompact(cost)}</span>
											<span class="ucnx">{hasActive ? 'BUSY' : '→ ' + formatLabDuration(duration)}</span>
										</button>
									{/if}
								{:else}
									<div class="uc-b"><span class="ucc" style="color:var(--text-dim)">🔒 Requires Wave {lab.unlockWave}</span></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{:else if activeSection === 'blueprints'}
				<BlueprintsSection
					{ownedBlueprints}
					{discoveredBlueprints}
					{schematicsByFront}
					{unlockedFronts}
					{buyBlueprint}
				/>
			{:else if activeSection === 'blackMarket'}
				{@const weeklyReady = canClaimWeeklyShipment(lastWeeklyBlackMarketShipmentClaimedAt, nowTick)}
				{@const dailyReady = canClaimDailyStrangeMatter(bmUnlocked, lastDailyStrangeMatterPickedUpAt, nowTick)}
				{@const sourceBalance = getSchematics(schematicsByFront, converterSourceFront)}
				{@const maxConversions = Math.floor(sourceBalance / SCHEMATIC_CONVERSION_RATE)}
				<div class="hs bm-layout">
					<div class="bm-header-bar">
						<h2 class="hst bm-header-title">◈ BLACK MARKET</h2>
						<span class="bm-header-sub">{bmSignalText}</span>
					</div>
					<p class="hsd bm-copy">Orbital Command does not authorize the possession, trade, study, inhalation, resale, or emotional attachment to Strange Matter. Fortunately, this terminal is not connected to Orbital Command.</p>
					<div class="bm-ledger">
						<div class="ir"><span class="il">Strange Matter</span><span class="iv">◈ {strangeMatter.toLocaleString()}</span></div>
						<div class="ir"><span class="il">Lifetime Recovered</span><span class="iv">◈ {lifetimeStrangeMatterEarned.toLocaleString()}</span></div>
					</div>

					<div class="bm-grid">
						<section class="bm-panel">
							<h3 class="stats-sub">Unmarked Shipment</h3>
							{#if weeklyReady}
								<p class="hsd">{bmShipmentFlavour}</p>
								<div class="bm-actions">
									<button class="hub-action bm-primary" onclick={openShipmentModal}>Inspect Shipment (+{STRANGE_MATTER_WEEKLY_SHIPMENT})</button>
								</div>
							{:else}
								<p class="hsd">Previous shipment accepted. No record exists of the transaction.</p>
								<div class="ccl">Next shipment in {formatDuration(weeklyShipmentRemainingMs(lastWeeklyBlackMarketShipmentClaimedAt, nowTick))}</div>
							{/if}
						</section>

						<section class="bm-panel">
							<h3 class="stats-sub">Daily Pickup</h3>
							<p class="hsd bm-pickup-copy">{bmDailyFlavour}</p>
							<button class="hub-action bm-primary" disabled={!dailyReady} onclick={claimDailyPickup}>Take the Vial (+{STRANGE_MATTER_DAILY_PICKUP})</button>
							{#if !dailyReady}<div class="ccl">Picked up today. Back tomorrow.</div>{:else}<div class="ccl">No deployment needed — just stop by.</div>{/if}
						</section>
					</div>

					<h3 class="stats-sub" style="margin-top:1rem">Contraband Procurement</h3>
					<div class="cl">
						{#each BLACK_MARKET_UNLOCKS as item}
							{@const owned = hasBlackMarketUnlock(blackMarketUnlocks, item.id)}
							{@const reqOk = !item.requirement || hasBlackMarketUnlock(blackMarketUnlocks, item.requirement)}
							{@const aff = strangeMatter >= item.cost}
							<div class="cc" class:lck={!owned && (!reqOk || !aff)}
									use:tooltip={owned
										? `${item.name}\nProcured.${item.status === 'scaffold' ? '\nFull effect arrives in a later update.' : ''}`
										: item.status === 'scaffold'
											? `${item.name}\nComing later — purchasable now, full effect arrives in a future update.\nCost: ◈ ${item.cost} Strange Matter`
											: item.requirement && !reqOk
												? `${item.name}\nLocked — first procure ${BLACK_MARKET_UNLOCKS.find(u => u.id === item.requirement)?.name ?? ''}.\nCost: ◈ ${item.cost} Strange Matter`
												: `${item.name}\nCost: ◈ ${item.cost} Strange Matter${aff ? '' : ' — not enough recovered yet'}`}>
								<div class="cc-h"><span class="cci">{owned ? '✓' : '◈'}</span><div><div class="ccn">{item.name}</div><div class="ccd">{item.description}</div></div></div>
								<div class="uc-b" style="margin-top:.35rem">
									<span class="ucc">◈ {item.cost}</span>
									{#if owned}
										<span class="ucnx">OWNED{item.status === 'scaffold' ? ' · UI/logic pending' : ''}</span>
									{:else if item.status === 'scaffold'}
										<span class="ucnx">COMING LATER</span>
									{:else if item.requirement && !reqOk}
										<span class="ucnx">Requires {BLACK_MARKET_UNLOCKS.find(u => u.id === item.requirement)?.name}</span>
									{:else}
										<button class="hub-action" disabled={!aff} onclick={() => buyBlackMarketUnlock(item.id)}>{aff ? 'Procure' : 'Need more'}</button>
									{/if}
								</div>
								{#if item.id === 'autoDeployment' && owned}
									<button class="hub-action" style="margin-top:.35rem" onclick={toggleAutoDeployment} use:tooltip={`Auto Deployment ${autoDeploymentEnabled ? 'is ARMED' : 'is idle'}.\nWhen armed, deployments relaunch automatically after a tower falls.\nLocal only — runs in this browser, even offline.`}>{autoDeploymentEnabled ? 'Disable Auto Deployment' : 'Arm Auto Deployment'}</button>
								{/if}
							</div>
						{/each}
					</div>

					{#if hasBlackMarketUnlock(blackMarketUnlocks, 'schematicConverter')}
						<section class="bm-panel converter">
							<h3 class="stats-sub">Schematic Converter</h3>
							<p class="hsd">Twenty-five obsolete designs go in. One restricted design comes out. Nobody asks why the ink is still wet.</p>
							<div class="sim-controls">
								<div class="sim-param">
									<label class="sim-label" for="converter-front">Source:</label>
									<select id="converter-front" bind:value={converterSourceFront} class="sim-select">
										{#each FRONT_META.slice(0, 15) as m}
											{@const targetFront = FRONT_META[m.front]}
											<option value={m.front}>{m.displayName} -> {targetFront ? getFrontName(targetFront.id) : 'Front ' + (m.front + 1)}</option>
										{/each}
									</select>
								</div>
							</div>
							<div class="ig" style="max-width:600px">
								<div class="ir"><span class="il">Source Balance</span><span class="iv">{sourceBalance}</span></div>
								<div class="ir"><span class="il">Target Balance</span><span class="iv">{getSchematics(schematicsByFront, converterSourceFront + 1)}</span></div>
								<div class="ir"><span class="il">Rate</span><span class="iv">{SCHEMATIC_CONVERSION_RATE}:1</span></div>
								<div class="ir"><span class="il">Max Conversions</span><span class="iv">{maxConversions}</span></div>
							</div>
							<div class="bm-actions">
								<button class="hub-action bm-primary" disabled={maxConversions < 1} onclick={() => convertOneSchematic(false)}>Convert 1</button>
								<button class="hub-action" disabled={maxConversions < 1} onclick={() => convertOneSchematic(true)}>Convert Max</button>
							</div>
							<div class="ccl">Conversion can prepare future Front Schematics, but it does not unlock the Front itself.</div>
						</section>
					{/if}
				</div>
			{:else if activeSection === 'tiers'}
				<TiersSection
					{unlockedFronts}
					{schematicsByFront}
					{frontBestWave}
				/>
			{:else if activeSection === 'challenges'}
				<ChallengesSection
					{frontBestWave}
					{challengeHighScores}
				/>
			{:else if activeSection === 'simulation'}
				<SimulationSection bind:simWave bind:simFront />
			{:else if activeSection === 'stats'}
				<StatsSection
					{totalRuns}
					{highestWave}
					{hubStats}
					{lifetimeStats}
					{killsByType}
					{shinyKillsByType}
					{masteryAchievements}
					{frontBestWave}
					{challengeHighScores}
				/>
			{:else if activeSection === 'profile'}
				<div class="hs"><h2 class="hst">👤 Profile</h2>
					{#if communityBuff.loaded && communityBuff.percent > 0}
						{@const buffRemaining = communityBuff.activeUntil ? Math.max(0, Date.parse(communityBuff.activeUntil) - nowTick) : 0}
						<div class="community-buff" use:tooltip={'Community Alloy Boost\nFueled by Ko-fi community support. Applies to every player, every deployment.\nOffline? You simply get the base Alloy — nothing breaks.'}>
							<span class="cb-icon">🛰️</span>
							<div class="cb-body">
								<div class="cb-title">Community Alloy Boost <span class="cb-pct">{formatCommunityBuffPercent(communityBuff.percent)}</span></div>
								<div class="cb-desc">Fueled by Ko-fi support. Applies to all players.{#if buffRemaining > 0} Active for {formatDuration(buffRemaining)}.{/if}</div>
							</div>
						</div>
					{/if}
					<div class="local-profile">
						<div class="local-profile-copy">
							<h3>Local Profile</h3>
							<p>Used for local play and unverified online features.</p>
							<p>Register later to keep badges, cloud saves, guilds, and verified challenge scores across devices.</p>
						</div>
						<form class="local-profile-form" onsubmit={(e) => { e.preventDefault(); saveLocalProfile(); }}>
							<label class="local-profile-label" for="local-profile-name">Display name</label>
							<div class="local-profile-row">
								<input id="local-profile-name" bind:value={localProfileName} maxlength="32" autocomplete="nickname" />
								<button class="hub-action" type="submit" disabled={!localProfileNameValid || localProfileName.trim().length === 0}>Save</button>
							</div>
							{#if showLocalProfileNameWarn}
								<span class="auth-hint-err" style="margin-top: 0; margin-bottom: 0.2rem;">Display name must be 1-32 safe characters.</span>
							{/if}
							<div class="local-profile-status">
								<span>{localProfile?.displayName ?? 'Flatland Player'}</span>
								<span>{localProfileStatus === 'synced' ? 'Optional online sync ready' : localProfileStatus === 'offline' ? 'Offline/local only' : localProfileStatus === 'rejected' ? 'Local only' : 'Not logged in'}</span>
							</div>
						</form>
					</div>
					<div class="account-panel">
						{#if account}
							<h3>Account: {account.displayName}</h3>
							<p class="acct-status">Logged in as <strong>{account.username}</strong>. Cloud saves and future verified features use this account. Local play keeps working if you log out or go offline.</p>
							<button class="hub-action" onclick={handleLogout} disabled={authBusy}>{authBusy ? 'Working…' : 'Log out'}</button>
							<div class="cloud-section">
								<h4>Cloud Save</h4>
								<p class="cloud-desc">Manual backup/sync. Cloud save never auto-overwrites your local data — you choose when to upload or restore.</p>
								
								<div class="cloud-status-block" style="border-color: {cloudSyncStatus.color}; background: rgba({cloudSyncStatus.type === 'error' ? '255,68,68' : cloudSyncStatus.type === 'success' ? '68,255,136' : '255,221,68'}, 0.05)">
									<span class="cloud-status-icon">{cloudSyncStatus.icon}</span>
									<span class="cloud-status-text" style="color: {cloudSyncStatus.color}">{cloudSyncStatus.text}</span>
								</div>

								<details class="cloud-details">
									<summary>Technical Details</summary>
									<div class="cloud-meta">
										<div class="ir"><span class="il">Local save</span><span class="iv">Schema v{CURRENT_SCHEMA_VERSION} · {APP_VERSION || 'DEV'}</span></div>
										<div class="ir"><span class="il">Cloud backup</span><span class="iv">{cloudChecked ? (cloudExists ? 'Exists' : 'None') : 'Not checked yet'}</span></div>
										{#if cloudMeta}
											<div class="ir"><span class="il">Cloud updated</span><span class="iv">{new Date(cloudMeta.updatedAt).toLocaleString()}</span></div>
											<div class="ir"><span class="il">Cloud schema</span><span class="iv">v{cloudMeta.schemaVersion} · {cloudMeta.gameVersion}</span></div>
										{/if}
									</div>
								</details>

								{#if cloudError}<p class="cloud-err">{cloudError}</p>{/if}
								<div class="cloud-actions">
									<button class="hub-action" onclick={() => void refreshCloudStatus()} disabled={cloudBusy}>{cloudBusy ? 'Working…' : 'Refresh Status'}</button>
									<button class="btn-primary" onclick={confirmUploadCloud} disabled={cloudBusy}>Upload Local Save</button>
									<button class="hub-action hub-danger" onclick={() => showRestoreConfirm = true} disabled={cloudBusy || !cloudExists}>Restore Cloud Save</button>
								</div>
							</div>
						{:else if accountLoaded}
							<h3>Account (optional)</h3>
							<p class="acct-status">Account login is optional. Normal play stays local-first. Use an account for cloud saves and future verified/guild features.</p>
							<div class="auth-tabs">
								<button class="auth-tab" class:on={authMode === 'login'} onclick={() => switchAuthMode('login')}>Log in</button>
								<button class="auth-tab" class:on={authMode === 'register'} onclick={() => switchAuthMode('register')}>Register</button>
							</div>
							{#if authMode === 'login'}
								<form class="auth-form" onsubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
									<label class="local-profile-label">
										Username
										<div class="auth-input-wrapper">
											<Icon name="user" class="auth-prefix-icon" size={16} />
											<input bind:value={loginUsername} autocomplete="username" placeholder="Username" />
										</div>
									</label>
									<label class="local-profile-label">
										Password
										<div class="auth-input-wrapper">
											<Icon name="lock" class="auth-prefix-icon" size={16} />
											<input type={showLoginPassword ? 'text' : 'password'} bind:value={loginPassword} autocomplete="current-password" placeholder="Password" />
											<button type="button" class="auth-suffix-btn" onclick={() => showLoginPassword = !showLoginPassword} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>
												<Icon name={showLoginPassword ? 'eyeOff' : 'eye'} size={16} />
											</button>
										</div>
									</label>
									<div class="auth-forgot-password-wrap">
										<button type="button" class="auth-forgot-password-btn" use:tooltip={'Password recovery is coming soon!\nContact support if you need immediate assistance.'}>
											Forgot password?
										</button>
									</div>
									{#if authError}<p class="auth-err">{authError}</p>{/if}
									<button class="btn-primary" type="submit" style="margin-top:0.5rem;" disabled={!canSubmitLogin}>{authBusy ? 'Working…' : 'Log in'}</button>
									<p class="auth-session-hint">ℹ️ Stays logged in on this browser (via secure session cookie).</p>
								</form>
							{:else}
								<form class="auth-form" onsubmit={(e) => { e.preventDefault(); void handleRegister(); }}>
									<label class="local-profile-label">
										Username
										<div class="auth-input-wrapper">
											<Icon name="user" class="auth-prefix-icon" size={16} />
											<input bind:value={regUsername} autocomplete="username" placeholder="Username (letters, numbers, underscores)" />
										</div>
										{#if showRegUsernameWarn}
											<span class="auth-hint-err">Username must be 3-24 characters using letters, numbers, or underscores.</span>
										{:else if regUsername.length > 0 && regUsernameValid}
											<span class="auth-hint-ok">Username format valid.</span>
										{/if}
									</label>
									<label class="local-profile-label">
										Display name (optional)
										<div class="auth-input-wrapper">
											<Icon name="user" class="auth-prefix-icon" size={16} />
											<input bind:value={regDisplayName} autocomplete="nickname" maxlength="32" placeholder="Public display name" />
										</div>
										{#if showRegDisplayNameWarn}
											<span class="auth-hint-err">Display name must be 1-32 safe characters.</span>
										{/if}
									</label>
									<label class="local-profile-label">
										Password
										<div class="auth-input-wrapper">
											<Icon name="lock" class="auth-prefix-icon" size={16} />
											<input type={showRegPassword ? 'text' : 'password'} bind:value={regPassword} autocomplete="new-password" placeholder="Password (min 10 characters)" />
											<button type="button" class="auth-suffix-btn" onclick={() => showRegPassword = !showRegPassword} aria-label={showRegPassword ? 'Hide password' : 'Show password'}>
												<Icon name={showRegPassword ? 'eyeOff' : 'eye'} size={16} />
											</button>
										</div>
										{#if regPassword.length > 0 && regPassword.length < 10}
											<span class="auth-hint-err">Password must be at least 10 characters.</span>
										{/if}
										{#if regPassword.length > 0}
											<div class="strength-meter">
												<div class="strength-bar-track">
													<div class="strength-bar-fill" style="width: {regPasswordStrength.score * 25}%; background-color: {regPasswordStrength.color}"></div>
												</div>
												<span class="strength-label" style="color: {regPasswordStrength.color}">{regPasswordStrength.label}</span>
											</div>
										{/if}
									</label>
									<label class="local-profile-label">
										Confirm password
										<div class="auth-input-wrapper">
											<Icon name="lock" class="auth-prefix-icon" size={16} />
											<input type={showRegConfirm ? 'text' : 'password'} bind:value={regConfirm} autocomplete="new-password" placeholder="Confirm password" />
											<button type="button" class="auth-suffix-btn" onclick={() => showRegConfirm = !showRegConfirm} aria-label={showRegConfirm ? 'Hide password' : 'Show password'}>
												<Icon name={showRegConfirm ? 'eyeOff' : 'eye'} size={16} />
											</button>
										</div>
										{#if showRegConfirmWarn}
											<span class="auth-hint-err">Passwords do not match.</span>
										{:else if regConfirm.length > 0 && regConfirmMatch}
											<span class="auth-hint-ok">Passwords match.</span>
										{/if}
									</label>
									{#if authError}<p class="auth-err">{authError}</p>{/if}
									<button class="btn-primary" type="submit" style="margin-top:0.5rem;" disabled={!canSubmitRegister}>{authBusy ? 'Working…' : 'Register'}</button>
								</form>
							{/if}
						{:else}
							<p class="acct-status">Checking account status…</p>
						{/if}
					</div>

					<div class="support-code">
						<h3>Supporter Identity</h3>
						<p class="sc-desc">Paste this code into your Ko-fi message if you support Flatland TD and want future supporter cosmetics or badges linked to your game profile.</p>
						<p class="sc-note">The Community Alloy Boost applies to everyone even without a code. Register first if you want future supporter rewards to survive browser data deletion.</p>
						{#if supportCode}
							<div class="sc-row">
								<code class="sc-code">{supportCode.code}</code>
								<button class="hub-action" onclick={copySupportCode}>{supportCodeCopied ? 'Copied' : 'Copy'}</button>
							</div>
							<p class="sc-owner">{supportCode.ownerType === 'account' ? '✓ Linked to your account.' : 'Local anonymous identity — register above to make it account-linked.'}</p>
						{:else}
							<p class="sc-owner">Generating…</p>
						{/if}
					</div>
				</div>
			{:else if activeSection === 'settings'}
				<SettingsSection
					{settings}
					bind:importTriggerEl
					bind:resetTriggerEl
					onToggleSetting={toggleSetting}
					onExportSave={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast(getOpLogMessage('saveExported'), 'success'); }}
					onOpenImportDialog={openImportDialog}
					onOpenResetDialog={openResetDialog}
				/>
			{/if}
		</div>
	</div>

	<!-- Black Market Discovery Modal -->
	{#if showBlackMarketIntro}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) dismissBlackMarketIntro(); }}>
			<div bind:this={blackMarketIntroDialogEl} class="dlg dlg-bm-intro" role="dialog" aria-modal="true" aria-label="Unauthorized channel detected" tabindex="-1" onkeydown={(e) => onModalKeydown(e, blackMarketIntroDialogEl, dismissBlackMarketIntro)}>
				<h3 class="bm-intro-title">UNAUTHORIZED CHANNEL DETECTED</h3>
				<p class="bm-intro-body">{bmChannelIntro[0]}</p>
				<p class="bm-intro-body">{bmChannelIntro[1]}</p>
				<p class="bm-intro-body bm-intro-warn">{bmChannelIntro[2]}</p>
				<p class="bm-intro-body">{bmChannelIntro[3]}</p>
				<div class="dlg-a" style="gap:1rem">
					<button class="dlg-s" onclick={dismissBlackMarketIntro}>Ignore for now</button>
					<button class="dlg-p bm-intro-open" onclick={openBlackMarketChannel}>Open Channel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Weekly Shipment Storylet Modal -->
	{#if showShipmentModal}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showShipmentModal = false; }}>
			<div bind:this={shipmentDialogEl} class="dlg dlg-bm-shipment" role="dialog" aria-modal="true" aria-label="Unmarked shipment available" tabindex="-1" onkeydown={(e) => onModalKeydown(e, shipmentDialogEl, () => showShipmentModal = false)}>
				<h3 class="bm-intro-title">UNMARKED SHIPMENT AVAILABLE</h3>
				<p class="bm-intro-body">{bmShipmentFlavour}</p>
				<p class="bm-intro-body">It is addressed to someone using your clearance code. It may or may not be humming. The legal status remains unexplored.</p>
				<p class="bm-intro-body bm-intro-support">Flatland TD is free, local-first, and open source. If you want to support development and hosting, you can fund the next shipment.</p>
				<p class="bm-intro-body bm-intro-support">Support is appreciated, never required. Payment is never checked. The shipment is yours either way.</p>
				
				<div class="support-code" style="margin: 0.75rem 0; text-align: left; width: 100%;">
					<h3>Support Code</h3>
					<p class="sc-desc">Paste this into your Ko-fi message if you want future supporter cosmetics or badges to be linked.</p>
					<p class="sc-note">The Community Alloy Boost applies to everyone even without a code. Register first if you want future supporter rewards to survive browser data deletion.</p>
					{#if supportCode}
						<div class="sc-row">
							<code class="sc-code">{supportCode.code}</code>
							<button class="hub-action" onclick={copySupportCode}>{supportCodeCopied ? 'Copied' : 'Copy'}</button>
						</div>
						<p class="sc-owner">{supportCode.ownerType === 'account' ? 'Linked to your account.' : 'Local anonymous identity — register to make it account-linked.'}</p>
					{:else}
						<p class="sc-owner">Generating…</p>
					{/if}
				</div>

				<div class="dlg-a" style="gap:1rem;flex-wrap:wrap">
					{#if supportReady}
						<a class="hub-action" href={SUPPORT_URL} target="_blank" rel="noopener" use:tooltip={'Opens an external support page in a new tab.\nEntirely optional — the game stays free and offline.'}>Fund the next shipment</a>
					{/if}
					<button class="hub-action bm-primary" style="margin:0" onclick={acceptShipment}>Accept Shipment (+{STRANGE_MATTER_WEEKLY_SHIPMENT})</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Register Success Dialog -->
	{#if showRegisterSuccess}
		{@const closeRegModal = () => { showRegisterSuccess = false; }}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeRegModal(); }}>
			<div
				class="dlg"
				role="dialog"
				aria-modal="true"
				aria-labelledby="reg-success-title"
				tabindex="-1"
				bind:this={regSuccessDialogEl}
				onkeydown={(e) => onModalKeydown(e, regSuccessDialogEl, closeRegModal)}
			>
				<h3 id="reg-success-title">🎉 Welcome, {registeredDisplayName}!</h3>
				<p class="dlg-d">Your account has been created successfully. Your secure session is active.</p>
				<p class="dlg-d" style="font-size:var(--fs-caption); color:var(--text-dim); line-height: 1.45;">
					ℹ️ <strong>Your local save is untouched.</strong> Account integration is local-first: your current progress remains in this browser until you manually choose to upload a backup to the cloud.
				</p>
				<div class="dlg-a">
					<button class="dlg-p" bind:this={regSuccessOkBtnEl} onclick={closeRegModal}>Acknowledge</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeImportDialog(); }}>
			<div
				class="dlg"
				role="dialog"
				aria-modal="true"
				aria-labelledby="import-save-title"
				tabindex="-1"
				bind:this={importDialogEl}
				onkeydown={(e) => onModalKeydown(e, importDialogEl, closeImportDialog)}
			>
				<h3 id="import-save-title">📂 Import Save</h3>
				<p class="dlg-d">Paste your exported Flatland TD save archive.</p>
				<textarea bind:this={importTextareaEl} bind:value={importText} rows={5} aria-label="Save archive text"></textarea>
				<div class="dlg-a">
					<button class="dlg-p" onclick={submitImportDialog}>Import</button>
					<button class="dlg-s" onclick={() => closeImportDialog()}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeResetDialog(); }}>
			<div
				class="dlg dlg-dng"
				role="dialog"
				aria-modal="true"
				aria-labelledby="reset-save-title"
				tabindex="-1"
				bind:this={resetDialogEl}
				onkeydown={(e) => onModalKeydown(e, resetDialogEl, closeResetDialog)}
			>
				<h3 id="reset-save-title">🗑 Reset Save?</h3>
				<p class="dlg-d">This will erase all Alloy, Forge upgrades, Schematics, Research Deck progress, Front progress, and settings. This cannot be undone.</p>
				<div class="dlg-a">
					<button class="dlg-s" bind:this={resetCancelEl} onclick={() => closeResetDialog()}>Cancel</button>
					<button class="dlg-dng-btn" onclick={confirmResetDialog}>Reset Save</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showUploadConfirm}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showUploadConfirm = false; }}>
			<div bind:this={uploadConfirmDialogEl} class="dlg" role="dialog" aria-modal="true" aria-labelledby="upload-confirm-title" tabindex="-1" onkeydown={(e) => onModalKeydown(e, uploadConfirmDialogEl, () => showUploadConfirm = false)}>
				<h3 id="upload-confirm-title">Replace cloud backup?</h3>
				<p class="dlg-d">
					{isCloudNewerThanLocal()
						? 'The cloud backup is newer than this local save. Uploading now will replace that newer cloud copy with this device.'
						: 'This will replace your cloud backup with your current local save. Your local save stays intact.'}
				</p>
				<div class="dlg-a">
					<button class="dlg-s" onclick={() => showUploadConfirm = false}>Cancel</button>
					<button class="dlg-p" onclick={() => void doUploadCloud()}>Upload</button>
				</div>
			</div>
		</div>
	{/if}
	{#if showRestoreConfirm}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showRestoreConfirm = false; }}>
			<div bind:this={restoreConfirmDialogEl} class="dlg dlg-dng" role="dialog" aria-modal="true" aria-labelledby="restore-confirm-title" tabindex="-1" onkeydown={(e) => onModalKeydown(e, restoreConfirmDialogEl, () => showRestoreConfirm = false)}>
				<h3 id="restore-confirm-title">Restore cloud save?</h3>
				<p class="dlg-d">This will replace your current local save with the cloud save. Export your local save first if you want a backup.</p>
				<div class="dlg-a" style="flex-wrap:wrap">
					<button class="dlg-s" onclick={() => showRestoreConfirm = false}>Cancel</button>
					<button class="hub-action" onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast(getOpLogMessage('saveExported'), 'success'); }}>Export Local Save First</button>
					<button class="dlg-dng-btn" onclick={() => void doRestoreCloud()}>Restore Cloud Save</button>
				</div>
			</div>
		</div>
	{/if}

	<footer class="hub-footer">
		<span>🛰️ Orbital Command — Flatland TD · FLTD</span>
		<p class="hub-footer-flavor">Geometry is legally classified as aggressive. Angles below 90° must be reported.</p>
		<div class="hub-footer-links">
			<a href="/help">Help</a>
			<span>·</span>
			<a href="/privacy">Privacy</a>
			<span>·</span>
			<a href="/imprint">Imprint</a>
		</div>
		{#if showBackToTop}
			<button class="back-to-top" onclick={scrollToTop} aria-label="Scroll back to top" use:tooltip={'Scroll back to top'}>
				↑
			</button>
		{/if}
	</footer>
</main>

<style>
	.hub-page { min-height:100vh; background:var(--bg-primary); overflow-y:auto; }
	.hub-top { display:flex; align-items:center; gap:.75rem; padding:.75rem 1.5rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); position:sticky; top:0; z-index:10; }
	.hub-back { color:var(--text-secondary); font-size:var(--fs-body); text-decoration:none; padding:.25rem .65rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-back:hover { color:var(--cyan); border-color:var(--cyan); }
	.hub-deploy { color:var(--cyan); font-size:var(--fs-body); font-weight:600; text-decoration:none; padding:.25rem .65rem; border:1px solid rgba(0,255,255,.25); border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-deploy:hover { color:var(--bg-primary); background:var(--cyan); border-color:var(--cyan); }
	.hub-title { font-size:var(--fs-hero); font-weight:700; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
	.hub-coins { margin-left:auto; font-family:var(--font-mono); font-size:var(--fs-mono-lg); color:var(--yellow); }
	.hub-sm { color:var(--violet); margin-left:.5rem; }
	.hub-desc { padding:1.25rem 1.5rem .5rem; text-align:center; color:var(--text-secondary); font-size:var(--fs-body); line-height:1.7; max-width:900px; margin:0 auto; position:relative; z-index:1; }
	.hub-body { display:flex; gap:2rem; padding:1.5rem; max-width:1400px; margin:0 auto; position:relative; z-index:1; min-height:calc(100vh - 64px); }
	.hub-nav { display:flex; flex-direction:column; gap:.35rem; width:200px; flex-shrink:0; }
	.hub-nav-btn { display:block; width:100%; padding:.6rem .9rem; font-size:var(--fs-body); color:var(--text-secondary); text-align:left; border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-nav-btn.on { color:var(--cyan); background:rgba(0,255,255,.06); }
	.hub-nav-btn:hover:not(.on) { color:var(--text-primary); background:rgba(255,255,255,.03); }
	.hub-content { flex:1; min-width:0; max-width:1000px; }
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	.empty-flavor { color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-mono-sm); line-height:1.5; margin:0 0 1rem; padding:.6rem .8rem; border:1px dashed var(--border-neon); border-radius:var(--radius-sm); background:rgba(0,255,255,.03); }
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	.hub-danger:hover { border-color:var(--red); color:var(--red); }
	.bm-ledger { display:grid; gap:3px; max-width:420px; margin-bottom:1rem; }
	.bm-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin-bottom:1rem; }
	.bm-copy { max-width:760px; color:rgba(210,190,255,.78); text-shadow:0 0 14px rgba(136,68,255,.08); }
	.bm-panel { padding:.85rem 1rem; background:linear-gradient(135deg,rgba(136,68,255,.055),rgba(0,0,0,.08)),var(--bg-tertiary); border:1px solid rgba(136,68,255,.22); border-radius:var(--radius-sm); box-shadow:inset 0 0 18px rgba(0,0,0,.18); }
	.bm-actions { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.65rem; }
	.bm-primary { border-color:rgba(0,255,255,.35); color:var(--cyan); }
	.converter { margin-top:1rem; max-width:760px; }

	/* Black Market header styling */
	.bm-layout { border:1px solid rgba(136,68,255,.15); border-radius:var(--radius-md); padding:1.15rem 1.25rem; background:linear-gradient(180deg,rgba(136,68,255,.04),rgba(0,0,0,.06)),var(--bg-secondary); }
	.bm-header-bar { display:flex; align-items:baseline; gap:.65rem; flex-wrap:wrap; margin-bottom:.5rem; }
	.bm-header-title { color:rgba(210,190,255,.85); text-shadow:0 0 18px rgba(136,68,255,.18); }
	.bm-header-sub { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:.65; text-transform:uppercase; letter-spacing:.04em; }
	.bm-pickup-copy { color:var(--text-secondary); font-style:italic; }

	/* Signal icon in header */
	.bm-signal { display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; margin-left:.35rem; padding:0; border:1px solid var(--border-neon); border-radius:50%; background:transparent; color:var(--text-dim); font-size:1.1rem; cursor:pointer; transition:all var(--transition-fast); flex-shrink:0; }
	.bm-signal:hover { border-color:var(--cyan); color:var(--cyan); }
	.bm-signal:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
	.bm-signal-subtle { color:var(--text-dim); border-color:rgba(255,255,255,.08); }
	.bm-signal-glow { color:var(--violet); border-color:rgba(136,68,255,.55); animation:bm-pulse 2s ease-in-out infinite; box-shadow:0 0 14px rgba(136,68,255,.35); }
	.bm-signal-glow:hover { border-color:var(--violet); color:var(--violet); box-shadow:0 0 22px rgba(136,68,255,.5); }

	@keyframes bm-pulse {
		0%, 100% { box-shadow:0 0 14px rgba(136,68,255,.35); }
		50% { box-shadow:0 0 24px rgba(136,68,255,.55); }
	}

	@media (prefers-reduced-motion:reduce) {
		.bm-signal-glow { animation:none; box-shadow:0 0 18px rgba(136,68,255,.4); }
	}

	/* Locked teaser */
	.bm-locked-teaser { padding:.55rem .75rem; margin-top:.75rem; display:flex; align-items:flex-start; gap:.4rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:.45; border:1px dashed rgba(136,68,255,.1); border-radius:var(--radius-sm); width:100%; }
	.bm-locked-icon { color:var(--violet); opacity:.35; font-size:1.1rem; flex-shrink:0; margin-top:1px; }
	.bm-locked-text { overflow-wrap:break-word; word-break:break-word; }

	/* Black Market modals */
	.dlg-bm-intro, .dlg-bm-shipment { border-color:rgba(136,68,255,.35); background:linear-gradient(180deg,rgba(20,15,40,.95),rgba(7,8,18,.98)); max-width:500px; }
	.bm-intro-title { font-family:var(--font-display); font-size:var(--fs-subheading); color:rgba(210,190,255,.9); letter-spacing:.04em; margin-bottom:.65rem; text-shadow:0 0 16px rgba(136,68,255,.2); }
	.bm-intro-body { color:var(--text-secondary); font-size:var(--fs-body-sm); line-height:1.55; margin-bottom:.55rem; }
	.bm-intro-warn { color:rgba(255,200,100,.65); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }
	.bm-intro-support { color:var(--text-dim); font-size:var(--fs-caption-sm); }
	.bm-intro-open { background:linear-gradient(135deg,rgba(136,68,255,.7),rgba(100,30,200,.7)); border-color:rgba(136,68,255,.5); }
	.bm-intro-open:hover { box-shadow:0 0 16px rgba(136,68,255,.4); }
	.buy-mult { display:flex; align-items:center; gap:2px; margin-bottom:.5rem; }
	.mult-label { font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); margin-right:.2rem; }
	.mult-btn { padding:.15rem .4rem; font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:4px; background:rgba(0,0,0,.12); border:1px solid transparent; cursor:pointer; transition:all var(--transition-fast); }
	.mult-btn:hover { color:var(--text-secondary); border-color:var(--border-neon); }
	.mult-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }

	/* Forge/Research upgrade cards */
	.ug { display:flex; flex-direction:column; gap:4px; max-width:800px; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.72rem .8rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.uc.mx { opacity:.5; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.65; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.35rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	.uc-btr { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	/* Forge combat card — prominent current starting value, like the Field card */
	.uc-val { font-size:var(--fs-mono-lg); color:var(--text-primary); font-family:var(--font-mono); font-weight:600; padding:.02rem 0; }
	.uc.aff .uc-val { color:var(--green); }
	.forge-sub { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin:.6rem 0 .3rem; }
	.forge-sub:first-of-type { margin-top:.2rem; }
	.completed-toggle { margin-top:1rem; display:flex; align-items:center; gap:.35rem; width:100%; padding:0; background:transparent; border:0; text-align:left; cursor:pointer; }
	.completed-toggle:focus-visible { outline:2px solid var(--cyan); outline-offset:3px; border-radius:var(--radius-sm); }
	/* Daily Orbital Command tasks */
	.gift-row { display:flex; flex-wrap:wrap; gap:.4rem; margin:.5rem 0; }
	.gift-btn { background:linear-gradient(135deg,var(--yellow),var(--orange)); color:var(--bg-primary); font-weight:600; }
	.task-card.aff { border-color:rgba(68,255,136,.4); background:rgba(68,255,136,.04); }
	.task-claim { padding:.2rem .6rem; margin-left:auto; background:linear-gradient(135deg,var(--green),var(--cyan)); color:var(--bg-primary); font-weight:600; font-size:var(--fs-mono-sm); border-radius:var(--radius-sm); }
	.orders-footer { margin-top:.6rem; font-size:var(--fs-caption-sm); color:var(--text-dim); font-style:italic; }
	.lc { gap:.25rem; }
	.uc.researching { border-color:rgba(255,221,68,.3); background:rgba(255,221,68,.03); }
	.rs-bar-track { height:5px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.rs-bar-fill { height:100%; background:linear-gradient(90deg,var(--yellow),var(--orange)); border-radius:2px; transition:width .5s linear; }
	.rs-info { font-size:var(--fs-caption-sm); color:var(--yellow); font-family:var(--font-mono); text-align:center; }
	.rs-btn { display:block; width:100%; margin-top:.25rem; padding:.4rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); font-weight:600; cursor:pointer; transition:all var(--transition-fast); text-align:center; }
	.rs-btn.aff { background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); }
	.rs-btn:disabled { opacity:.55; background:var(--bg-tertiary); color:var(--text-dim); cursor:default; }
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.tc,.cc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.tc.unl { border-color:rgba(68,255,136,.12); } .cc.lck { opacity:.55; }
	.tc-h,.cc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.cci { font-size:var(--fs-icon-lg); flex-shrink:0; margin-top:2px; }
	.tcn,.ccn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.tcd,.ccd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	.tcr,.ccs,.ccl,.ccl-found { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.ccl-found { color:var(--cyan); background:rgba(0,255,255,.08); }
	.schem-bal { display:flex; flex-wrap:wrap; gap:.4rem; margin:.4rem 0 .8rem; }
	.schem-chip { display:inline-flex; align-items:center; gap:.25rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-secondary); background:rgba(0,0,0,.18); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.15rem .4rem; }
	.tcr-ok { color:var(--green); } .ccs { color:var(--green); }
	.ig { display:grid; gap:3px; max-width:600px; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); } .iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	.local-profile { display:grid; grid-template-columns:minmax(0,1fr) minmax(240px,320px); gap:1rem; max-width:800px; margin-bottom:1rem; padding:.85rem; background:rgba(0,0,0,.14); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.local-profile h3 { margin:0 0 .25rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.local-profile p { margin:.15rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.35; }
	.local-profile-form { display:flex; flex-direction:column; gap:.35rem; }
	.local-profile-label { color:var(--text-secondary); font-size:var(--fs-caption); font-family:var(--font-mono); }
	.local-profile-row { display:flex; gap:.45rem; align-items:center; }
	.local-profile-row input { min-width:0; flex:1; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.45rem .55rem; font:inherit; }
	.local-profile-row .hub-action { margin:0; }
	.local-profile-status { display:flex; justify-content:space-between; gap:.5rem; color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }

	/* Community Alloy Boost widget */
	.community-buff { display:flex; align-items:center; gap:.6rem; max-width:760px; margin-bottom:1rem; padding:.6rem .8rem; background:linear-gradient(135deg,rgba(0,255,136,.05),rgba(0,0,0,.04)); border:1px solid rgba(0,255,136,.22); border-radius:var(--radius-sm); }
	.cb-icon { font-size:var(--fs-mono-lg); }
	.cb-title { font-size:var(--fs-body-sm); color:var(--text-primary); font-family:var(--font-display); }
	.cb-pct { color:var(--green); font-family:var(--font-mono); margin-left:.25rem; }
	.cb-desc { font-size:var(--fs-caption-sm); color:var(--text-secondary); margin-top:.1rem; }

	/* Support code + account + cloud save panels */
	.support-code, .account-panel, .cloud-section { max-width:760px; margin-top:1rem; padding:.85rem 1rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.support-code h3, .account-panel h3, .cloud-section h4 { margin:0 0 .35rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.support-code p, .account-panel p, .cloud-section p { margin:.15rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
	.sc-note, .cloud-desc { color:var(--text-dim); font-size:var(--fs-caption-sm); }
	.sc-row { display:flex; align-items:center; gap:.5rem; margin:.4rem 0 .2rem; }
	.sc-code { font-family:var(--font-mono); font-size:var(--fs-mono); color:var(--cyan); background:rgba(0,0,0,.3); padding:.3rem .55rem; border-radius:var(--radius-sm); border:1px solid var(--border-neon); user-select:all; }
	.sc-owner { color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }
	.acct-status { color:var(--text-secondary); font-size:var(--fs-caption); }
	.auth-tabs { display:flex; gap:.25rem; margin:.5rem 0; }
	.auth-tab { padding:.35rem .9rem; font-size:var(--fs-caption); color:var(--text-secondary); background:transparent; border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; }
	.auth-tab.on { color:var(--cyan); border-color:var(--cyan); background:rgba(0,255,255,.06); }
	.auth-form { display:flex; flex-direction:column; gap:.4rem; max-width:340px; }
	.auth-form .local-profile-label input, .auth-form input { display:block; margin-top:.2rem; width:100%; box-sizing:border-box; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.4rem .55rem; font-family:var(--font-mono); font-size:var(--fs-mono-sm); }
	.auth-err, .cloud-err { color:var(--red); font-size:var(--fs-caption-sm); margin:.25rem 0; }
	.cloud-meta { display:grid; gap:3px; margin:.5rem 0; }
	.cloud-actions { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.35rem; }
	.cloud-actions .hub-action { margin:0; }


	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.dlg { background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-xl); padding:1.75rem; max-width:420px; width:100%; }
	.dlg h3 { font-size:var(--fs-subheading); margin-bottom:.4rem; }
	.dlg-d { color:var(--text-secondary); font-size:var(--fs-body-sm); margin-bottom:.85rem; }
	.dlg textarea { width:100%; margin-bottom:.85rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.5rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); resize:vertical; }
	.dlg-a { display:flex; gap:.5rem; justify-content:center; }
	.dlg-p,.dlg-s,.dlg-dng-btn { padding:.55rem 1.3rem; border-radius:var(--radius-sm); font-weight:600; font-size:var(--fs-btn-sm); cursor:pointer; transition:all var(--transition-fast); }
	.dlg-p { background:var(--cyan); color:var(--bg-primary); }
	.dlg-s { background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.dlg-dng-btn { background:var(--red); color:white; }
	.dlg-dng { border-color:rgba(255,68,68,.2); }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	@media(max-width:767px){ .hub-body{flex-direction:column;padding:1rem;gap:1rem} .hub-nav{display:flex;flex-direction:row;align-items:center;overflow-x:auto;gap:.4rem;width:auto;padding-bottom:.25rem;scrollbar-width:thin;scrollbar-color:rgba(0,255,255,.35) transparent;mask-image: linear-gradient(to right, black 85%, transparent 100%);-webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%)} .hub-nav-btn{flex-shrink:0;width:auto;white-space:nowrap;text-align:center;padding:.55rem .75rem;font-size:var(--fs-body-sm)} .hub-nav .bm-locked-teaser{flex-shrink:0;white-space:nowrap} .hub-top{padding:.6rem 1rem}.hub-desc{padding:1rem 1rem .25rem}.bm-grid{grid-template-columns:1fr}.hub-coins{font-size:var(--fs-mono)} .local-profile{grid-template-columns:1fr}.local-profile-status{flex-direction:column;gap:.25rem} }
	@media(max-width:380px){ .hub-nav-btn{font-size:var(--fs-caption);padding:.5rem .6rem} }
	.hub-footer { text-align:center; padding:1.5rem; color:var(--text-dim); font-size:var(--fs-caption); display:flex; flex-direction:column; gap:.4rem; align-items:center; border-top:1px solid var(--border-neon); margin-top:2rem; }
	.hub-footer-flavor { font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:0.35; margin:0; }
	.hub-footer-links { display:flex; gap:.4rem; align-items:center; }
	.hub-footer-links a { color:var(--cyan); text-decoration:underline; text-underline-offset:3px; text-decoration-color:rgba(0,255,255,.2); }
	/* ── Archives / Mastery ─────────────────────────────── */
	.stats-sub { margin:.9rem 0 .45rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.mastery-list { display:grid; gap:.45rem; max-width:800px; }
	.mastery-card { padding:.65rem .75rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.mastery-header { display:flex; align-items:center; gap:.45rem; flex-wrap:wrap; margin-bottom:.35rem; }
	.mastery-name { color:var(--text-primary); font-weight:600; font-size:var(--fs-body-sm); }
	.mastery-level,.mastery-bonus { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-secondary); padding:.1rem .35rem; border-radius:3px; background:rgba(0,0,0,.16); }
	.mastery-level.maxed,.mastery-bonus { color:var(--cyan); }
	.mastery-kills { display:flex; align-items:center; gap:.55rem; min-height:1.2rem; font-size:var(--fs-caption); }
	.mastery-shiny { color:var(--yellow); font-family:var(--font-mono); }
	.mastery-bar-track { height:5px; margin:.35rem 0; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.mastery-bar-fill { height:100%; background:linear-gradient(90deg,var(--cyan),var(--green)); border-radius:2px; transition:width var(--transition-normal); }
	.mastery-rewards { display:flex; gap:.25rem; }
	.mastery-pip { width:22px; height:22px; display:grid; place-items:center; border:1px solid var(--border-neon); border-radius:3px; color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-caption-sm); }
	.mastery-pip.earned { color:var(--yellow); border-color:rgba(255,221,68,.35); }
	.mastery-pip.claimed { color:var(--green); border-color:rgba(68,255,136,.35); background:rgba(68,255,136,.06); }

	/* Auth input wrappers with prefix icons and visibility toggles */
	.auth-input-wrapper { display:flex; align-items:center; background:var(--bg-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); position:relative; margin-top:.2rem; width:100%; box-sizing:border-box; }
	.auth-input-wrapper:focus-within { border-color:var(--cyan); box-shadow:0 0 8px rgba(0,255,255,.25); }
	:global(.auth-prefix-icon) { margin-left:.6rem; color:var(--text-dim); pointer-events:none; }
	.auth-input-wrapper input { border:none !important; margin-top:0 !important; background:transparent !important; flex:1; min-width:0; padding:.45rem .55rem .45rem .45rem !important; }
	.auth-input-wrapper input:focus { outline:none; }
	.auth-suffix-btn { background:transparent; border:none; color:var(--text-dim); cursor:pointer; padding:0 .6rem; display:flex; align-items:center; justify-content:center; transition:color var(--transition-fast); }
	.auth-suffix-btn:hover { color:var(--cyan); }

	/* Form validation and password strength indicators */
	.auth-hint-err { color:var(--red); font-size:var(--fs-caption-sm); margin-top:.2rem; display:block; line-height:1.3; }
	.auth-hint-ok { color:var(--green); font-size:var(--fs-caption-sm); margin-top:.2rem; display:block; line-height:1.3; }
	.strength-meter { display:flex; align-items:center; gap:.5rem; margin-top:.3rem; }
	.strength-bar-track { flex:1; height:4px; background:rgba(255,255,255,.1); border-radius:2px; overflow:hidden; }
	.strength-bar-fill { height:100%; transition:width var(--transition-fast), background-color var(--transition-fast); }
	.strength-label { font-size:var(--fs-caption-sm); font-family:var(--font-mono); font-weight:600; min-width:65px; text-align:right; }

	/* Forgot password and session hints */
	.auth-forgot-password-wrap { display:flex; justify-content:flex-end; margin-top:.2rem; margin-bottom:.3rem; }
	.auth-forgot-password-btn { background:transparent; border:none; color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); text-decoration:underline; cursor:pointer; padding:0; transition:color var(--transition-fast); }
	.auth-forgot-password-btn:hover { color:var(--cyan); }
	.auth-session-hint { color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); margin-top:.5rem; text-align:center; line-height:1.3; }

	/* Primary action button style */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: .55rem 1.2rem;
		border-radius: var(--radius-sm);
		font-weight: 700;
		font-size: var(--fs-body-sm);
		font-family: var(--font-display);
		transition: all var(--transition-fast);
		text-decoration: none;
		cursor: pointer;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary);
		border: none;
		box-shadow: 0 0 12px rgba(0, 255, 255, 0.25);
	}
	.btn-primary:hover {
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
		transform: translateY(-1px);
	}
	.btn-primary:disabled {
		opacity: .45;
		cursor: default;
		pointer-events: none;
		box-shadow: none;
		transform: none;
	}

	/* Top bar account badge */
	.hub-top-account { display:inline-flex; align-items:center; gap:.35rem; font-family:var(--font-mono); font-size:var(--fs-caption); color:var(--text-secondary); background:rgba(255,255,255,.05); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.25rem .55rem; cursor:pointer; transition:all var(--transition-fast); margin-left:.5rem; }
	.hub-top-account:hover { color:var(--cyan); border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.hub-top-username { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

	/* Cloud status layout and collapsible details */
	.cloud-status-block { display:flex; align-items:center; gap:.5rem; padding:.55rem .75rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); margin-bottom:.75rem; font-size:var(--fs-body-sm); }
	.cloud-status-icon { font-size:var(--fs-body); }
	.cloud-status-text { font-family:var(--font-display); font-weight:500; }
	.cloud-details { border:1px solid var(--border-neon); border-radius:var(--radius-sm); margin-bottom:.75rem; background:rgba(0,0,0,.1); }
	.cloud-details summary { padding:.5rem .75rem; font-size:var(--fs-body-sm); font-family:var(--font-display); cursor:pointer; color:var(--text-secondary); user-select:none; }
	.cloud-details summary:hover { color:var(--cyan); }
	.cloud-details[open] summary { border-bottom:1px solid var(--border-neon); }
	.cloud-details .cloud-meta { margin:0; padding:.3rem 0; }

	/* Back-to-top button */
	.back-to-top {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 1px solid var(--border-neon);
		color: var(--cyan);
		font-size: var(--fs-subheading);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 150;
		box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
		transition: all var(--transition-fast);
	}
	.back-to-top:hover {
		background: var(--cyan);
		color: var(--bg-primary);
		box-shadow: 0 0 18px rgba(0, 255, 255, 0.4);
		transform: translateY(-2px);
	}
</style>
