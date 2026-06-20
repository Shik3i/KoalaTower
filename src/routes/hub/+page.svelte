<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Tutorial, { type TutorialStep } from '$lib/components/Tutorial.svelte';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { persistSave, getCachedSave, exportSave, exportSaveFromData, importSave, resetSave } from '$lib/game/save/saveService';
	import type { SaveData } from '$lib/game/save/saveTypes';
	import { buildWorkshopUpgradeList, getWorkshopUpgradeCost, FORGE_ECONOMY_WORKSHOP_IDS } from '$lib/game/balance/workshopUpgrades';
	// Combat Forge stats use the SHARED Field curve (forgeUpgrades.ts). The
	// Foundry's economy upgrades (Alloy/Energy bonus, Starting Energy) stay as
	// permanent-only WorkshopUpgrades — filtered out of the combat list here.
	const FORGE_ECONOMY_SET = new Set(FORGE_ECONOMY_WORKSHOP_IDS);
	const WORKSHOP_UPGRADES = buildWorkshopUpgradeList().filter(u => FORGE_ECONOMY_SET.has(u.id));
	import { buildForgeUpgradeList, getForgeUpgradeCost } from '$lib/game/balance/forgeUpgrades';
	const FORGE_UPGRADES = buildForgeUpgradeList();
	import { LAB_DEFS, getLabCost, getLabDuration, formatLabDuration } from '$lib/game/balance/labs';
	import { FRONT_META, getUnlockedFronts, getFrontName } from '$lib/game/balance/tiers';
	import { getSchematics, getPathSchematicCost, tryUnlockPathWithSchematics, normalizeSchematics } from '$lib/game/balance/schematics';
	import {
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
		type BlackMarketUnlockId,
		type BlackMarketUnlocks,
	} from '$lib/game/balance/blackMarket';
	import { EnemyType, DEFAULT_SETTINGS, type TierId } from '$lib/game/engine/gameTypes';
	import { BLUEPRINT_DEFS, isFieldUpgradeUnlocked } from '$lib/game/balance/blueprints';
	import {
		generateCommandOrders,
		rolloverCommandOrders,
		claimOrder,
		claimAllCompletedOrders,
		claimMilestone,
		commandOrdersWeekKey,
		shouldRefreshBoard,
		refreshBoard,
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
	import { communityBuffStore, type CommunityBuffState } from '$lib/online/communityBuffClient';
	import { accountStore, registerAccount, loginAccount, logoutAccount, type AccountInfo } from '$lib/online/accountClient';
	import { fetchCloudSaveMeta, fetchCloudSaveFull, uploadCloudSave, type CloudSaveMetadata } from '$lib/online/cloudSaveClient';
	import { getSupportCode } from '$lib/online/supportCode';
	import { APP_VERSION } from '$lib/version';
	import { CURRENT_SCHEMA_VERSION } from '$lib/game/save/saveTypes';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import SettingsSection from '$lib/components/hub/SettingsSection.svelte';
	import SimulationSection from '$lib/components/hub/SimulationSection.svelte';
	import BlueprintsSection from '$lib/components/hub/BlueprintsSection.svelte';
	import StatsSection from '$lib/components/hub/StatsSection.svelte';
	import TiersSection from '$lib/components/hub/TiersSection.svelte';
	import ChallengesSection from '$lib/components/hub/ChallengesSection.svelte';
	import OrdersSection from '$lib/components/hub/OrdersSection.svelte';
	import WorkshopSection from '$lib/components/hub/WorkshopSection.svelte';
	import LabSection from '$lib/components/hub/LabSection.svelte';
	import BlackMarketSection from '$lib/components/hub/BlackMarketSection.svelte';
	import ProfileSection from '$lib/components/hub/ProfileSection.svelte';

	let coins = $state(0);
	let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let activeSection = $state<'workshop' | 'orders' | 'lab' | 'blueprints' | 'blackMarket' | 'tiers' | 'challenges' | 'simulation' | 'stats' | 'settings' | 'profile'>('workshop');
	let buyMultiplier = $state<1 | 5 | 10 | 50 | 'max'>(1);
	let workshopLevels = $state<Partial<Record<WorkshopUpgradeId, number>>>({});
	let forgeLevels = $state<Partial<Record<UpgradeId, number>>>({});
	let commandOrdersState = $state<CommandOrdersState>({ week: '', completedCount: 0, claimedOrderSlots: [], claimedMilestones: [], counters: {}, boardRefreshedAt: 0 });
	let commandOrderPool = $state<CommandOrderInstance[]>([]);
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
			const now = Date.now();
			const total = save.activeLab.finishesAt - save.activeLab.startedAt;
			const elapsed = now - save.activeLab.startedAt;
			labProgressPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
		} else {
			activeLabId = null;
			activeLabTarget = 0;
			labProgressPct = 0;
		}
	}

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
				<WorkshopSection
					bind:buyMultiplier
					{coins}
					{forgeLevels}
					{workshopLevels}
					{ownedBlueprints}
					{buyForgeUpgrade}
					{buyWorkshopUpgrade}
				/>
			{:else if activeSection === 'orders'}
				<OrdersSection
					{commandOrderPool}
					{commandOrdersState}
					{claimGiftBox}
					{claimCommandOrder}
					{claimAllCompleted}
				/>
			{:else if activeSection === 'lab'}
				<LabSection
					{coins}
					{highestWave}
					{labLevels}
					{activeLabId}
					{activeLabTarget}
					{labProgressPct}
					{startLabResearch}
				/>
			{:else if activeSection === 'blueprints'}
				<BlueprintsSection
					{ownedBlueprints}
					{discoveredBlueprints}
					{schematicsByFront}
					{unlockedFronts}
					{buyBlueprint}
				/>
			{:else if activeSection === 'blackMarket'}
				<BlackMarketSection
					bind:converterSourceFront
					{lastWeeklyBlackMarketShipmentClaimedAt}
					{lastDailyStrangeMatterPickedUpAt}
					{bmUnlocked}
					{schematicsByFront}
					{strangeMatter}
					{lifetimeStrangeMatterEarned}
					{blackMarketUnlocks}
					{autoDeploymentEnabled}
					{nowTick}
					{bmSignalText}
					{bmShipmentFlavour}
					{bmDailyFlavour}
					{openShipmentModal}
					{claimDailyPickup}
					{buyBlackMarketUnlock}
					{toggleAutoDeployment}
					{convertOneSchematic}
				/>
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
				<ProfileSection
					bind:localProfileName
					bind:loginUsername
					bind:loginPassword
					bind:regUsername
					bind:regDisplayName
					bind:regPassword
					bind:regConfirm
					bind:authMode
					bind:showLoginPassword
					bind:showRegPassword
					bind:showRegConfirm
					bind:showRestoreConfirm
					bind:authError

					{communityBuff}
					{nowTick}
					{localProfile}
					{localProfileStatus}
					{account}
					{accountLoaded}
					{authBusy}
					{cloudChecked}
					{cloudExists}
					{cloudMeta}
					{cloudError}
					{cloudBusy}
					{cloudSyncStatus}
					{supportCode}
					{supportCodeCopied}

					saveLocalProfile={saveLocalProfile}
					handleLogout={handleLogout}
					refreshCloudStatus={refreshCloudStatus}
					confirmUploadCloud={confirmUploadCloud}
					handleLogin={handleLogin}
					handleRegister={handleRegister}
					copySupportCode={copySupportCode}
				/>
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
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; pointer-events:none; }
	.bm-primary { border-color:rgba(0,255,255,.35); color:var(--cyan); }

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

	/* Support code + account + cloud save panels */
	.support-code { max-width:760px; margin-top:1rem; padding:.85rem 1rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.support-code h3 { margin:0 0 .35rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	.support-code p { margin:.15rem 0; color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
	.sc-note { color:var(--text-dim); font-size:var(--fs-caption-sm); }
	.sc-row { display:flex; align-items:center; gap:.5rem; margin:.4rem 0 .2rem; }
	.sc-code { font-family:var(--font-mono); font-size:var(--fs-mono); color:var(--cyan); background:rgba(0,0,0,.3); padding:.3rem .55rem; border-radius:var(--radius-sm); border:1px solid var(--border-neon); user-select:all; }
	.sc-owner { color:var(--text-dim); font-size:var(--fs-caption-sm); font-family:var(--font-mono); }


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
	@media(max-width:767px){ .hub-body{flex-direction:column;padding:1rem;gap:1rem} .hub-nav{display:flex;flex-direction:row;align-items:center;overflow-x:auto;gap:.4rem;width:auto;padding-bottom:.25rem;scrollbar-width:thin;scrollbar-color:rgba(0,255,255,.35) transparent;mask-image: linear-gradient(to right, black 85%, transparent 100%);-webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%)} .hub-nav-btn{flex-shrink:0;width:auto;white-space:nowrap;text-align:center;padding:.55rem .75rem;font-size:var(--fs-body-sm)} .hub-nav .bm-locked-teaser{flex-shrink:0;white-space:nowrap} .hub-top{padding:.6rem 1rem}.hub-desc{padding:1rem 1rem .25rem}.hub-coins{font-size:var(--fs-mono)} }
	@media(max-width:380px){ .hub-nav-btn{font-size:var(--fs-caption);padding:.5rem .6rem} }
	.hub-footer { text-align:center; padding:1.5rem; color:var(--text-dim); font-size:var(--fs-caption); display:flex; flex-direction:column; gap:.4rem; align-items:center; border-top:1px solid var(--border-neon); margin-top:2rem; }
	.hub-footer-flavor { font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:0.35; margin:0; }
	.hub-footer-links { display:flex; gap:.4rem; align-items:center; }
	.hub-footer-links a { color:var(--cyan); text-decoration:underline; text-underline-offset:3px; text-decoration-color:rgba(0,255,255,.2); }
	/* Top bar account badge */
	.hub-top-account { display:inline-flex; align-items:center; gap:.35rem; font-family:var(--font-mono); font-size:var(--fs-caption); color:var(--text-secondary); background:rgba(255,255,255,.05); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.25rem .55rem; cursor:pointer; transition:all var(--transition-fast); margin-left:.5rem; }
	.hub-top-account:hover { color:var(--cyan); border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.hub-top-username { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

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
