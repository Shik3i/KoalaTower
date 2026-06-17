import type { GameSettings, WorkshopUpgradeId, LabId, MilestoneId, ChallengeId, BlueprintId } from '../engine/gameTypes';

export interface LabResearch {
	level: number;
	researchStart: number; // Date.now() timestamp when research started, 0 = not researching
	duration: number;      // total ms for current level
	complete: boolean;
}

export interface ActiveLabResearch {
	labId: LabId;
	targetLevel: number;
	startedAt: number;   // Date.now() timestamp
	finishesAt: number;  // Date.now() timestamp when complete
}

export interface SaveData {
	schemaVersion: number;
	/** ISO timestamp when this save was first created */
	createdAt: string;
	/** Unix ms timestamp of last write */
	lastUpdated: number;
	/** Locally generated save identifier (not personally identifying) */
	saveId: string;
	totalRuns: number;
	highestWave: number;
	totalCoins: number;
	workshopUpgrades: Partial<Record<WorkshopUpgradeId, number>>;
	labResearch: Partial<Record<LabId, LabResearch>>;
	labLevels: Partial<Record<LabId, number>>;
	blueprints: string[];
	/** v5: Blueprint IDs permanently unlocked via purchase */
	unlockedBlueprints: BlueprintId[];
	/** v5: Currently active lab research (null = no active research) */
	activeLab: ActiveLabResearch | null;
	milestones: Partial<Record<MilestoneId, boolean>>;
	challengeHighScores: Partial<Record<ChallengeId, number>>;
	settings: GameSettings;
}

export const CURRENT_SCHEMA_VERSION = 5;

export function createDefaultSave(): SaveData {
	const now = Date.now();
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		createdAt: new Date(now).toISOString(),
		lastUpdated: now,
		saveId: 'fltd-' + Math.random().toString(36).slice(2, 10),
		totalRuns: 0,
		highestWave: 0,
		totalCoins: 0,
		workshopUpgrades: {},
		labResearch: {},
		labLevels: {},
		blueprints: [],
		unlockedBlueprints: [],
		activeLab: null,
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
