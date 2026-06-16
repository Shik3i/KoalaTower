import type { GameSettings, UpgradeId, WorkshopUpgradeId, LabId, MilestoneId, ChallengeId } from '../engine/gameTypes';

export interface SaveData {
	schemaVersion: number;
	lastUpdated: number;
	totalRuns: number;
	highestWave: number;
	totalCoins: number;
	workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>;
	labLevels: Partial<Record<LabId, number>>;
	milestones: Partial<Record<MilestoneId, boolean>>;
	challengeHighScores: Partial<Record<ChallengeId, number>>;
	settings: GameSettings;
}

export const CURRENT_SCHEMA_VERSION = 1;

export function createDefaultSave(): SaveData {
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		lastUpdated: Date.now(),
		totalRuns: 0,
		highestWave: 0,
		totalCoins: 0,
		workshopUpgrades: {},
		labLevels: {},
		milestones: {},
		challengeHighScores: {},
		settings: {
			reducedMotion: false,
			screenShake: true,
			particles: true,
			damageNumbers: true,
			lowEffectsMode: false,
		},
	};
}
