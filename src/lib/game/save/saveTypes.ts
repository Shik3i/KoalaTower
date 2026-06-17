import type { GameSettings, WorkshopUpgradeId, LabId, MilestoneId, ChallengeId } from '../engine/gameTypes';

export interface LabResearch {
	level: number;
	researchStart: number; // Date.now() timestamp when research started, 0 = not researching
	duration: number;      // total ms for current level
}

export interface SaveData {
	schemaVersion: number;
	lastUpdated: number;
	totalRuns: number;
	highestWave: number;
	totalCoins: number;
	workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>;
	labResearch: Partial<Record<LabId, LabResearch>>;
	labLevels: Partial<Record<LabId, number>>;
	milestones: Partial<Record<MilestoneId, boolean>>;
	challengeHighScores: Partial<Record<ChallengeId, number>>;
	settings: GameSettings;
}

export const CURRENT_SCHEMA_VERSION = 3;

export function createDefaultSave(): SaveData {
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		lastUpdated: Date.now(),
		totalRuns: 0,
		highestWave: 0,
		totalCoins: 0,
		workshopUpgrades: {},
		labResearch: {},
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
