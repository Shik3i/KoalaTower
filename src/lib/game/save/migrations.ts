import { CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { BlueprintId, AchievementId, TierId, DEFAULT_SETTINGS, type GameSettings } from '../engine/gameTypes';
import { computeGrandfatheredBlueprints } from '../balance/blueprints';
import { emptySchematics, normalizeSchematics } from '../balance/schematics';
import { normalizeBlackMarketUnlocks, normalizeStrangeMatter, normalizeTimestamp } from '../balance/blackMarket';

export function normalizeNonNegativeInteger(value: unknown, fallback = 0): number {
	const n = Number(value);
	const safeFallback = Number.isFinite(Number(fallback)) ? Math.max(0, Math.floor(Number(fallback))) : 0;
	if (!Number.isFinite(n)) return safeFallback;
	return Math.max(0, Math.floor(n));
}

export function normalizeNonNegativeFiniteNumber(value: unknown, fallback = 0): number {
	const n = Number(value);
	const safeFallback = Number.isFinite(Number(fallback)) ? Math.max(0, Number(fallback)) : 0;
	if (!Number.isFinite(n)) return safeFallback;
	return Math.max(0, n);
}

export function normalizePositiveFiniteNumber(value: unknown, fallback = 1): number {
	const n = Number(value);
	const safeFallback = Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
	if (!Number.isFinite(n) || n <= 0) return safeFallback;
	return n;
}

function generateSaveId(prefix = 'fltd'): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return prefix + '-' + crypto.randomUUID();
	}
	return prefix + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function migrateSave(data: Record<string, unknown>): SaveData | null {
	try {
		// Normalize to a safe integer — a string "5" must not bypass the < checks.
		const version = Number.isFinite(Number(data.schemaVersion)) && Number(data.schemaVersion) >= 0
			? Math.floor(Number(data.schemaVersion))
			: 0;
		let save = data as unknown as SaveData;

		if (version < 1) {
			save = migrateV0toV1(save as unknown as Record<string, unknown>);
		}
		if (version < 2) {
			save = migrateV1toV2(save);
		}
		if (version < 3) {
			save = migrateV2toV3(save);
		}
		if (version < 4) {
			save = migrateV3toV4(save);
		}
		if (version < 5) {
			save = migrateV4toV5(save);
		}
		if (version < 6) {
			save = migrateV5toV6(save);
		}
		if (version < 7) {
			save = migrateV6toV7(save);
		}
		if (version < 8) {
			save = migrateV7toV8(save);
		}
		if (version < 9) {
			save = migrateV8toV9(save);
		}
		if (version < 10) {
			save = migrateV9toV10(save);
		}
		if (version < 11) {
			save = migrateV10toV11(save);
		}
		if (version < 12) {
			save = migrateV11toV12(save);
		}
		if (version < 13) {
			save = migrateV12toV13(save);
		}
		if (version < 14) {
			save = migrateV13toV14(save);
		}

		save = ensureMetadata(save);

		if (save.schemaVersion !== CURRENT_SCHEMA_VERSION) {
			return null;
		}

		return save;
	} catch {
		return null;
	}
}

function migrateV0toV1(data: Record<string, unknown>): SaveData {
	const now = Date.now();
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		createdAt: new Date(now).toISOString(),
		lastUpdated: now,
		saveId: generateSaveId('fltd-legacy'),
		totalRuns: (data.totalRuns as number) || 0,
		highestWave: (data.highestWave as number) || 0,
		totalCoins: (data.totalCoins as number) || 0,
		workshopUpgrades: (data.workshopUpgrades as Record<string, number>) || {},
		labResearch: {},
		labLevels: (data.labLevels as Record<string, number>) || {},
		blueprints: [],
		unlockedBlueprints: [],
		discoveredBlueprints: [],
		selectedFront: TierId.Tier1,
		frontBestWave: {},
		activeLab: null,
		milestones: (data.milestones as Record<string, boolean>) || {},
		challengeHighScores: (data.challengeHighScores as Record<string, number>) || {},
		settings: normalizeSettings({
			reducedMotion: !!(data.reducedMotion as boolean),
			screenShake: !(data.disableScreenShake as boolean),
			particles: true,
			damageNumbers: true,
			lowEffectsMode: false,
		}),
		achievements: {},
		totalKills: 0,
		totalBossesDefeated: 0,
		totalFieldUpgradesPurchased: 0,
		totalAlloyEarned: 0,
		totalShiniesKilled: 0,
		killsByType: {},
		shinyKillsByType: {},
		totalEnergyEarned: 0,
		totalDamageDealt: 0,
		totalCritsDealt: 0,
		totalWavesCompleted: 0,
		totalPlayTimeSeconds: 0,
		masteryAchievements: {},
		schematicsByFront: emptySchematics(),
		claimedSchematicMilestones: [],
		strangeMatter: 0,
		lifetimeStrangeMatterEarned: 0,
		lastWeeklyBlackMarketShipmentClaimedAt: 0,
		lastDailyContractCompletedAt: 0,
		lastDailyContractDeploymentAt: 0,
		blackMarketUnlocks: {},
		autoDeploymentEnabled: false,
		blackMarketIntroSeen: false,
		bestKillstreak: 0,
	};
}

function migrateV1toV2(save: SaveData): SaveData {
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		labResearch: {},
		blueprints: [],
		unlockedBlueprints: [],
		activeLab: null,
		achievements: save.achievements ?? {},
		totalKills: save.totalKills ?? 0,
		totalBossesDefeated: save.totalBossesDefeated ?? 0,
		totalFieldUpgradesPurchased: save.totalFieldUpgradesPurchased ?? 0,
		totalAlloyEarned: save.totalAlloyEarned ?? 0,
	};
}

function migrateV2toV3(save: SaveData): SaveData {
	const oldLabLevels = save.labLevels as Record<string, number> | undefined;
	const newLabLevels: Record<string, number> = {};

	if (oldLabLevels) {
		if (oldLabLevels['towerDurability'] !== undefined) {
			newLabLevels['healthResearch'] = oldLabLevels['towerDurability'];
		}
		if (oldLabLevels['damageResearch'] !== undefined) {
			newLabLevels['damageResearch'] = oldLabLevels['damageResearch'];
		}
		if (oldLabLevels['coinEfficiency'] !== undefined) {
			newLabLevels['coinEfficiency'] = oldLabLevels['coinEfficiency'];
		}
	}

	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		labLevels: newLabLevels,
		unlockedBlueprints: [],
		activeLab: null,
		achievements: save.achievements ?? {},
		totalKills: save.totalKills ?? 0,
		totalBossesDefeated: save.totalBossesDefeated ?? 0,
		totalFieldUpgradesPurchased: save.totalFieldUpgradesPurchased ?? 0,
		totalAlloyEarned: save.totalAlloyEarned ?? 0,
	};
}

function migrateV3toV4(save: SaveData): SaveData {
	const oldLab = save.labLevels as Record<string, number> | undefined;
	const newLab: Record<string, number> = {};
	if (oldLab) {
		for (const [k, v] of Object.entries(oldLab)) {
			if (k === 'coinEfficiency') newLab['alloyEfficiency'] = v;
			else if (k === 'cashEfficiency') newLab['energyEfficiency'] = v;
			else newLab[k] = v;
		}
	}

	const oldWs = save.workshopUpgrades as Record<string, number> | undefined;
	const newWs: Record<string, number> = {};
	if (oldWs) {
		for (const [k, v] of Object.entries(oldWs)) {
			if (k === 'cashBonus') newWs['energyBonus'] = v;
			else if (k === 'startingCash') newWs['startingEnergy'] = v;
			else newWs[k] = v;
		}
	}

	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		labLevels: newLab as Record<string, number>,
		workshopUpgrades: newWs as Record<string, number>,
		blueprints: Array.isArray((save as unknown as Record<string, unknown>).blueprints) ? ((save as unknown as Record<string, unknown>).blueprints as string[]) : [],
		unlockedBlueprints: [],
		activeLab: null,
		achievements: save.achievements ?? {},
		totalKills: save.totalKills ?? 0,
		totalBossesDefeated: save.totalBossesDefeated ?? 0,
		totalFieldUpgradesPurchased: save.totalFieldUpgradesPurchased ?? 0,
		totalAlloyEarned: save.totalAlloyEarned ?? 0,
	};
}

function migrateV4toV5(save: SaveData): SaveData {
	const existingBlueprints: string[] = Array.isArray((save as unknown as Record<string, unknown>).blueprints)
		? ((save as unknown as Record<string, unknown>).blueprints as string[])
		: [];

	const grandfathered = computeGrandfatheredBlueprints(
		save.workshopUpgrades,
		{},
		save.labLevels,
	);

	const all = new Set<BlueprintId>([
		...existingBlueprints.filter(Boolean) as BlueprintId[],
		...grandfathered,
	]);

	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		unlockedBlueprints: Array.from(all),
		activeLab: (save as unknown as Record<string, unknown>).activeLab as SaveData['activeLab'] || null,
		achievements: save.achievements ?? {},
		totalKills: save.totalKills ?? 0,
		totalBossesDefeated: save.totalBossesDefeated ?? 0,
		totalFieldUpgradesPurchased: save.totalFieldUpgradesPurchased ?? 0,
		totalAlloyEarned: save.totalAlloyEarned ?? 0,
	};
}

function migrateV5toV6(save: SaveData): SaveData {
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		achievements: (save as unknown as Record<string, unknown>).achievements as SaveData['achievements'] ?? {},
		totalKills: (save.totalKills as number) ?? 0,
		totalBossesDefeated: (save.totalBossesDefeated as number) ?? 0,
		totalFieldUpgradesPurchased: (save.totalFieldUpgradesPurchased as number) ?? 0,
		totalAlloyEarned: (save.totalAlloyEarned as number) ?? 0,
		totalShiniesKilled: (save as any).totalShiniesKilled ?? 0,
	};
}

function migrateV6toV7(save: SaveData): SaveData {
	// v7 adds audio (sfx/music) and bloom toggles to settings.
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		settings: normalizeSettings((save as unknown as Record<string, unknown>).settings),
	};
}

function migrateV7toV8(save: SaveData): SaveData {
	// v8 adds the blueprint discovery layer + selected front.
	// Owned blueprints are implicitly already discovered.
	const owned = Array.isArray(save.unlockedBlueprints) ? save.unlockedBlueprints : [];
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		discoveredBlueprints: Array.from(new Set([...(save.discoveredBlueprints ?? []), ...owned])),
		selectedFront: save.selectedFront ?? TierId.Tier1,
	};
}

function migrateV9toV10(save: SaveData): SaveData {
	// v10 adds per-enemy kill tracking and extended lifetime stats for the mastery system.
	return {
		...save,
		schemaVersion: 10,
		killsByType: (save as any).killsByType ?? {},
		shinyKillsByType: (save as any).shinyKillsByType ?? {},
		totalEnergyEarned: (save as any).totalEnergyEarned ?? 0,
		totalDamageDealt: (save as any).totalDamageDealt ?? 0,
		totalCritsDealt: (save as any).totalCritsDealt ?? 0,
		totalWavesCompleted: (save as any).totalWavesCompleted ?? 0,
		totalPlayTimeSeconds: (save as any).totalPlayTimeSeconds ?? 0,
		masteryAchievements: (save as any).masteryAchievements ?? {},
		schematicsByFront: normalizeSchematics((save as any).schematicsByFront),
		claimedSchematicMilestones: Array.isArray((save as any).claimedSchematicMilestones)
			? (save as any).claimedSchematicMilestones
			: [],
	};
}

function migrateV10toV11(save: SaveData): SaveData {
	// v11 adds the Schematics currency. Initialize every Front (1–16) to 0 and
	// start with no claimed milestones. Old unlocked upgrade paths
	// (unlockedBlueprints) are untouched — already-owned paths stay owned.
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		schematicsByFront: normalizeSchematics((save as any).schematicsByFront),
		claimedSchematicMilestones: Array.isArray((save as any).claimedSchematicMilestones)
			? (save as any).claimedSchematicMilestones
			: [],
	};
}

function migrateV11toV12(save: SaveData): SaveData {
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		strangeMatter: normalizeStrangeMatter((save as any).strangeMatter),
		lifetimeStrangeMatterEarned: normalizeStrangeMatter((save as any).lifetimeStrangeMatterEarned),
		lastWeeklyBlackMarketShipmentClaimedAt: normalizeTimestamp((save as any).lastWeeklyBlackMarketShipmentClaimedAt),
		lastDailyContractCompletedAt: normalizeTimestamp((save as any).lastDailyContractCompletedAt),
		lastDailyContractDeploymentAt: normalizeTimestamp((save as any).lastDailyContractDeploymentAt),
		blackMarketUnlocks: normalizeBlackMarketUnlocks((save as any).blackMarketUnlocks),
		autoDeploymentEnabled: (save as any).autoDeploymentEnabled === true,
	};
}

function migrateV12toV13(save: SaveData): SaveData {
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		blackMarketIntroSeen: (save as any).blackMarketIntroSeen === true,
	};
}

function migrateV13toV14(save: SaveData): SaveData {
	// v14 adds the persisted best killstreak (cosmetic vanity metric).
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		bestKillstreak: Math.max(0, Math.floor(Number((save as any).bestKillstreak)) || 0),
	};
}

function migrateV8toV9(save: SaveData): SaveData {
	// v9 adds per-front best waves for sequential front unlocking.
	// All prior play happened on Front 1, so grandfather global best there.
	const existing = (save as unknown as Record<string, unknown>).frontBestWave as Partial<Record<TierId, number>> | undefined;
	return {
		...save,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		frontBestWave: existing ?? { [TierId.Tier1]: save.highestWave ?? 0 },
	};
}

/** Backfill any missing settings keys with defaults — safe across all versions. */
function normalizeSettings(raw: unknown): GameSettings {
	const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameSettings>;
	return {
		reducedMotion: s.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
		screenShake: s.screenShake ?? DEFAULT_SETTINGS.screenShake,
		particles: s.particles ?? DEFAULT_SETTINGS.particles,
		damageNumbers: s.damageNumbers ?? DEFAULT_SETTINGS.damageNumbers,
		lowEffectsMode: s.lowEffectsMode ?? DEFAULT_SETTINGS.lowEffectsMode,
		sfx: s.sfx ?? DEFAULT_SETTINGS.sfx,
		music: s.music ?? DEFAULT_SETTINGS.music,
		bloom: s.bloom ?? DEFAULT_SETTINGS.bloom,
		browserNotifications: s.browserNotifications ?? DEFAULT_SETTINGS.browserNotifications,
	};
}

export function validateSaveData(data: unknown): data is SaveData {
	if (!data || typeof data !== 'object') return false;
	const d = data as Record<string, unknown>;
	if (typeof d.schemaVersion !== 'number' || !Number.isFinite(d.schemaVersion)) return false;
	if (typeof d.lastUpdated !== 'number' || !Number.isFinite(d.lastUpdated)) return false;
	if (typeof d.totalRuns !== 'number' || !Number.isFinite(d.totalRuns) || d.totalRuns < 0) return false;
	if (typeof d.highestWave !== 'number' || !Number.isFinite(d.highestWave) || d.highestWave < 0) return false;
	if (typeof d.totalCoins !== 'number' || !Number.isFinite(d.totalCoins) || d.totalCoins < 0) return false;
	// Validate critical collections — wrong types here would crash at runtime.
	// null/undefined is allowed (ensureMetadata repairs those); non-object/non-array types are rejected.
	if (d.workshopUpgrades !== undefined && d.workshopUpgrades !== null) {
		if (typeof d.workshopUpgrades !== 'object' || Array.isArray(d.workshopUpgrades)) return false;
	}
	if (d.labLevels !== undefined && d.labLevels !== null) {
		if (typeof d.labLevels !== 'object' || Array.isArray(d.labLevels)) return false;
	}
	if (d.achievements !== undefined && d.achievements !== null) {
		if (typeof d.achievements !== 'object' || Array.isArray(d.achievements)) return false;
	}
	if (d.unlockedBlueprints !== undefined && d.unlockedBlueprints !== null) {
		if (!Array.isArray(d.unlockedBlueprints)) return false;
	}
	if (d.discoveredBlueprints !== undefined && d.discoveredBlueprints !== null) {
		if (!Array.isArray(d.discoveredBlueprints)) return false;
	}
	if (d.blackMarketUnlocks !== undefined && d.blackMarketUnlocks !== null) {
		if (typeof d.blackMarketUnlocks !== 'object' || Array.isArray(d.blackMarketUnlocks)) return false;
	}
	return true;
}

function ensureMetadata(save: SaveData): SaveData {
	const now = Date.now();
	return {
		...save,
		createdAt: save.createdAt || new Date(now).toISOString(),
		saveId: save.saveId || generateSaveId(),
		lastUpdated: normalizeTimestamp((save as any).lastUpdated) || now,
		totalCoins: normalizeNonNegativeInteger((save as any).totalCoins),
		highestWave: normalizeNonNegativeInteger((save as any).highestWave),
		totalRuns: normalizeNonNegativeInteger((save as any).totalRuns),
		totalAlloyEarned: normalizeNonNegativeInteger((save as any).totalAlloyEarned),
		settings: normalizeSettings((save as unknown as Record<string, unknown>).settings),
		discoveredBlueprints: Array.from(new Set([...((save as any).discoveredBlueprints ?? []), ...((save as any).unlockedBlueprints ?? [])])),
		selectedFront: (save as any).selectedFront ?? TierId.Tier1,
		frontBestWave: normalizeFrontBestWave((save as any).frontBestWave, normalizeNonNegativeInteger((save as any).highestWave)),
		achievements: (save as any).achievements ?? {},
		totalKills: normalizeNonNegativeInteger((save as any).totalKills),
		totalBossesDefeated: normalizeNonNegativeInteger((save as any).totalBossesDefeated),
		totalFieldUpgradesPurchased: normalizeNonNegativeInteger((save as any).totalFieldUpgradesPurchased),
		totalShiniesKilled: normalizeNonNegativeInteger((save as any).totalShiniesKilled),
		killsByType: normalizeCounterMap((save as any).killsByType),
		shinyKillsByType: normalizeCounterMap((save as any).shinyKillsByType),
		totalEnergyEarned: normalizeNonNegativeInteger((save as any).totalEnergyEarned),
		totalDamageDealt: normalizeNonNegativeFiniteNumber((save as any).totalDamageDealt),
		totalCritsDealt: normalizeNonNegativeInteger((save as any).totalCritsDealt),
		totalWavesCompleted: normalizeNonNegativeInteger((save as any).totalWavesCompleted),
		totalPlayTimeSeconds: normalizeNonNegativeFiniteNumber((save as any).totalPlayTimeSeconds),
		masteryAchievements: (save as any).masteryAchievements ?? {},
		schematicsByFront: normalizeSchematics((save as any).schematicsByFront),
		claimedSchematicMilestones: Array.isArray((save as any).claimedSchematicMilestones)
			? (save as any).claimedSchematicMilestones
			: [],
		strangeMatter: normalizeStrangeMatter((save as any).strangeMatter),
		lifetimeStrangeMatterEarned: normalizeStrangeMatter((save as any).lifetimeStrangeMatterEarned),
		lastWeeklyBlackMarketShipmentClaimedAt: normalizeTimestamp((save as any).lastWeeklyBlackMarketShipmentClaimedAt),
		lastDailyContractCompletedAt: normalizeTimestamp((save as any).lastDailyContractCompletedAt),
		lastDailyContractDeploymentAt: normalizeTimestamp((save as any).lastDailyContractDeploymentAt),
		blackMarketUnlocks: normalizeBlackMarketUnlocks((save as any).blackMarketUnlocks),
		autoDeploymentEnabled: (save as any).autoDeploymentEnabled === true,
		blackMarketIntroSeen: (save as any).blackMarketIntroSeen === true,
		bestKillstreak: normalizeNonNegativeInteger((save as any).bestKillstreak),
	};
}

function normalizeFrontBestWave(raw: unknown, highestWave = 0): Partial<Record<TierId, number>> {
	const fallback = { [TierId.Tier1]: normalizeNonNegativeInteger(highestWave) };
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
	const out: Partial<Record<TierId, number>> = {};
	const allowed = new Set(Object.values(TierId));
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (allowed.has(key as TierId)) out[key as TierId] = normalizeNonNegativeInteger(value);
	}
	return Object.keys(out).length > 0 ? out : fallback;
}

function normalizeCounterMap<T extends string>(raw: unknown): Partial<Record<T, number>> {
	const out: Partial<Record<T, number>> = {};
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
	for (const [key, value] of Object.entries(raw as Record<T, unknown>)) {
		out[key as T] = normalizeNonNegativeInteger(value);
	}
	return out;
}
