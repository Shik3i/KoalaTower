import { CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';

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

		if (save.schemaVersion !== CURRENT_SCHEMA_VERSION) {
			return null;
		}

		return save;
	} catch {
		return null;
	}
}

function migrateV0toV1(data: Record<string, unknown>): SaveData {
	return {
		schemaVersion: 3,
		lastUpdated: Date.now(),
		totalRuns: (data.totalRuns as number) || 0,
		highestWave: (data.highestWave as number) || 0,
		totalCoins: (data.totalCoins as number) || 0,
		workshopUpgrades: (data.workshopUpgrades as Record<string, number>) || {},
		labResearch: {},
		labLevels: (data.labLevels as Record<string, number>) || {},
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
		schemaVersion: 3,
		labResearch: {},
	};
}

/** V2→V3: Map old lab IDs to new ones */
function migrateV2toV3(save: SaveData): SaveData {
	const oldLabLevels = save.labLevels as Record<string, number> | undefined;
	const newLabLevels: Record<string, number> = {};

	if (oldLabLevels) {
		// Map old towerDurability to healthResearch
		if (oldLabLevels['towerDurability'] !== undefined) {
			newLabLevels['healthResearch'] = oldLabLevels['towerDurability'];
		}
		// Keep existing labs
		if (oldLabLevels['damageResearch'] !== undefined) {
			newLabLevels['damageResearch'] = oldLabLevels['damageResearch'];
		}
		if (oldLabLevels['coinEfficiency'] !== undefined) {
			newLabLevels['coinEfficiency'] = oldLabLevels['coinEfficiency'];
		}
	}

	return {
		...save,
		schemaVersion: 3,
		labLevels: newLabLevels,
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
