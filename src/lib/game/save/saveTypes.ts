import type { GameSettings, WorkshopUpgradeId, LabId, MilestoneId, ChallengeId, BlueprintId, AchievementId, EnemyType } from '../engine/gameTypes';
import { TierId, DEFAULT_SETTINGS } from '../engine/gameTypes';

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
	/** v5: Blueprint IDs permanently unlocked via purchase (owned) */
	unlockedBlueprints: BlueprintId[];
	/** v8: Blueprint IDs found in the field but not yet acquired */
	discoveredBlueprints: BlueprintId[];
	/** v8: Last front (tier) the player selected for deployment */
	selectedFront: TierId;
	/** v9: Best wave reached on each front — gates sequential front unlocks */
	frontBestWave: Partial<Record<TierId, number>>;
	/** v5: Currently active lab research (null = no active research) */
	activeLab: ActiveLabResearch | null;
	milestones: Partial<Record<MilestoneId, boolean>>;
	challengeHighScores: Partial<Record<ChallengeId, number>>;
	settings: GameSettings;
	/** v6: Achievement IDs that have been claimed */
	achievements: Partial<Record<AchievementId, boolean>>;
	/** v6: Lifetime stats for achievement tracking */
	totalKills: number;
	totalBossesDefeated: number;
	totalFieldUpgradesPurchased: number;
	totalAlloyEarned: number;
	totalShiniesKilled: number;
	// v10: Per-enemy kill tracking for Enemy Mastery system
	killsByType: Partial<Record<EnemyType, number>>;
	shinyKillsByType: Partial<Record<EnemyType, number>>;
	// v10: Extended lifetime stats
	totalEnergyEarned: number;
	totalDamageDealt: number;
	totalCritsDealt: number;
	totalWavesCompleted: number;
	totalPlayTimeSeconds: number;
	// v10: Mastery achievement claims (string keys like "mastery_normal_1")
	masteryAchievements: Partial<Record<string, boolean>>;
}

export const CURRENT_SCHEMA_VERSION = 10;

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
		discoveredBlueprints: [],
		selectedFront: TierId.Tier1,
		frontBestWave: {},
		activeLab: null,
		milestones: {},
		challengeHighScores: {},
		settings: { ...DEFAULT_SETTINGS },
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
	};
}
