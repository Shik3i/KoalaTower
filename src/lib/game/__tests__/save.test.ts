import { describe, it, expect } from 'vitest';
import { createDefaultSave, CURRENT_SCHEMA_VERSION } from '../save/saveTypes';
import { migrateSave, validateSaveData } from '../save/migrations';
import type { SaveData } from '../save/saveTypes';

describe('Save Migration', () => {
	it('should create a default save with correct schema version', () => {
		const save = createDefaultSave();
		expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(save.totalCoins).toBe(0);
		expect(save.totalRuns).toBe(0);
		expect(save.highestWave).toBe(0);
	});

	it('should migrate v0 data to v1', () => {
		const v0Data = {
			totalRuns: 5,
			highestWave: 20,
			totalCoins: 1000,
			workshopUpgrades: { baseDamage: 3 },
			disableScreenShake: true,
		};
		const migrated = migrateSave(v0Data as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(migrated!.totalRuns).toBe(5);
		expect(migrated!.highestWave).toBe(20);
		expect(migrated!.totalCoins).toBe(1000);
		expect(migrated!.settings.screenShake).toBe(false);
	});

	it('should pass through v1 data unchanged', () => {
		const v1Data: SaveData = {
			schemaVersion: 1,
			lastUpdated: Date.now(),
			totalRuns: 10,
			highestWave: 50,
			totalCoins: 5000,
			workshopUpgrades: { baseDamage: 5, baseFireRate: 3 },
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
		const migrated = migrateSave(v1Data as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.totalCoins).toBe(5000);
		expect(migrated!.settings.screenShake).toBe(true);
	});

	it('should return null for invalid data', () => {
		expect(migrateSave({} as Record<string, unknown>)).not.toBeNull(); // V0 migration will work on empty
		expect(migrateSave({ schemaVersion: 999 } as Record<string, unknown>)).toBeNull();
	});
});

describe('Save Validation', () => {
	it('should validate a correct save data object', () => {
		const save = createDefaultSave();
		expect(validateSaveData(save)).toBe(true);
	});

	it('should reject null', () => {
		expect(validateSaveData(null)).toBe(false);
	});

	it('should reject non-objects', () => {
		expect(validateSaveData('string')).toBe(false);
		expect(validateSaveData(123)).toBe(false);
	});

	it('should reject missing required fields', () => {
		expect(validateSaveData({})).toBe(false);
		expect(validateSaveData({ schemaVersion: 1 })).toBe(false);
	});
});
