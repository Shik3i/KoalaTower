import { CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { BlueprintId, AchievementId, TierId, DEFAULT_SETTINGS, type GameSettings } from '../engine/gameTypes';
import { computeGrandfatheredBlueprints } from '../balance/blueprints';

export function migrateSave(data: Record<string, unknown>): SaveData | null {
	try {
		const version = (data.schemaVersion as number) || 0;
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
		saveId: 'fltd-legacy-' + Math.random().toString(36).slice(2, 10),
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
	if (typeof d.schemaVersion !== 'number') return false;
	if (typeof d.lastUpdated !== 'number') return false;
	if (typeof d.totalRuns !== 'number') return false;
	if (typeof d.highestWave !== 'number') return false;
	if (typeof d.totalCoins !== 'number') return false;
	return true;
}

function ensureMetadata(save: SaveData): SaveData {
	const now = Date.now();
	return {
		...save,
		createdAt: save.createdAt || new Date(now).toISOString(),
		saveId: save.saveId || 'fltd-' + Math.random().toString(36).slice(2, 10),
		lastUpdated: save.lastUpdated || now,
		settings: normalizeSettings((save as unknown as Record<string, unknown>).settings),
		discoveredBlueprints: Array.from(new Set([...((save as any).discoveredBlueprints ?? []), ...((save as any).unlockedBlueprints ?? [])])),
		selectedFront: (save as any).selectedFront ?? TierId.Tier1,
		frontBestWave: (save as any).frontBestWave ?? { [TierId.Tier1]: (save as any).highestWave ?? 0 },
		achievements: (save as any).achievements ?? {},
		totalKills: (save as any).totalKills ?? 0,
		totalBossesDefeated: (save as any).totalBossesDefeated ?? 0,
		totalFieldUpgradesPurchased: (save as any).totalFieldUpgradesPurchased ?? 0,
		totalAlloyEarned: (save as any).totalAlloyEarned ?? 0,
		totalShiniesKilled: (save as any).totalShiniesKilled ?? 0,
	};
}
