import { CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { BlueprintId } from '../engine/gameTypes';
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

		// Ensure metadata fields exist (backfill for any migration path)
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
		schemaVersion: 5,
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
		activeLab: null,
		milestones: (data.milestones as Record<string, boolean>) || {},
		challengeHighScores: (data.challengeHighScores as Record<string, number>) || {},
		settings: {
			reducedMotion: !!(data.reducedMotion as boolean),
			screenShake: !(data.disableScreenShake as boolean),
			particles: true,
			damageNumbers: true,
			lowEffectsMode: false,
		},
	};
}

function migrateV1toV2(save: SaveData): SaveData {
	return {
		...save,
		schemaVersion: 5,
		labResearch: {},
		blueprints: [],
		unlockedBlueprints: [],
		activeLab: null,
	};
}

/** V2→V3: Map old lab IDs to new ones */
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
		schemaVersion: 5,
		labLevels: newLabLevels,
		unlockedBlueprints: [],
		activeLab: null,
	};
}

/** V3→V4: Rename lab, workshop, and battle upgrade enum keys */
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
		schemaVersion: 5,
		labLevels: newLab as Record<string, number>,
		workshopUpgrades: newWs as Record<string, number>,
		blueprints: Array.isArray((save as unknown as Record<string, unknown>).blueprints) ? ((save as unknown as Record<string, unknown>).blueprints as string[]) : [],
		unlockedBlueprints: [],
		activeLab: null,
	};
}

/**
 * V4→V5: Add unlockedBlueprints with grandfathering.
 *
 * If the player already has levels in now-locked workshop upgrades,
 * auto-unlock the corresponding Blueprint so they don't lose access.
 * Lab levels in now-locked labs also trigger grandfathering.
 */
function migrateV4toV5(save: SaveData): SaveData {
	const existingBlueprints: string[] = Array.isArray((save as unknown as Record<string, unknown>).blueprints)
		? ((save as unknown as Record<string, unknown>).blueprints as string[])
		: [];

	// Compute grandfathered blueprints from existing workshop + lab levels
	const grandfathered = computeGrandfatheredBlueprints(
		save.workshopUpgrades,
		{}, // battle levels are not persisted across runs
		save.labLevels,
	);

	// Merge: keep old blueprints + add grandfathered ones (dedup)
	const all = new Set<BlueprintId>([
		...existingBlueprints.filter(Boolean) as BlueprintId[],
		...grandfathered,
	]);

	return {
		...save,
		schemaVersion: 5,
		unlockedBlueprints: Array.from(all),
		activeLab: (save as unknown as Record<string, unknown>).activeLab as SaveData['activeLab'] || null,
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

/** Ensure createdAt and saveId exist, generating defaults if missing from old saves. */
function ensureMetadata(save: SaveData): SaveData {
	const now = Date.now();
	return {
		...save,
		createdAt: save.createdAt || new Date(now).toISOString(),
		saveId: save.saveId || 'fltd-' + Math.random().toString(36).slice(2, 10),
		lastUpdated: save.lastUpdated || now,
	};
}
