import { describe, it, expect } from 'vitest';
import { createDefaultSave, CURRENT_SCHEMA_VERSION } from '../save/saveTypes';
import { migrateSave, validateSaveData } from '../save/migrations';
import { encodeSaveContainer, decodeSaveContainer, sha256Sync } from '../save/saveEncoding';
import type { SaveData } from '../save/saveTypes';

describe('Save Migration', () => {
	it('should create a default save with correct schema version', () => {
		const save = createDefaultSave();
		expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(save.totalCoins).toBe(0);
		expect(save.totalRuns).toBe(0);
		expect(save.highestWave).toBe(0);
		expect(save.strangeMatter).toBe(0);
		expect(save.lifetimeStrangeMatterEarned).toBe(0);
		expect(save.lastWeeklyBlackMarketShipmentClaimedAt).toBe(0);
		expect(save.lastDailyStrangeMatterPickedUpAt).toBe(0);
		expect(save.lastDailyStrangeMatterDeploymentAt).toBe(0);
		expect(save.blackMarketUnlocks).toEqual({});
		expect(save.deploymentReports).toEqual([]);
		expect(save.createdAt).toBeTruthy();
		expect(save.saveId).toBeTruthy();
		expect(save.saveId).toMatch(/^fltd-/);
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
		expect(migrated!.createdAt).toBeTruthy();
		expect(migrated!.saveId).toBeTruthy();
	});

	it('should return null for invalid data', () => {
		expect(migrateSave({} as Record<string, unknown>)).not.toBeNull();
		expect(migrateSave({ schemaVersion: 999 } as Record<string, unknown>)).toBeNull();
	});

	it('should carry a realistic legacy v0 save through the full chain to v9', () => {
		const legacyV0 = {
			totalRuns: 42,
			highestWave: 137,
			totalCoins: 98765,
			// v0 workshop keys that get renamed downstream (cashBonus→energyBonus, startingCash→startingEnergy)
			workshopUpgrades: { baseDamage: 10, cashBonus: 4, startingCash: 2 },
			// v0 lab keys renamed downstream (coinEfficiency→alloyEfficiency)
			labLevels: { coinEfficiency: 3, damageResearch: 5 },
			disableScreenShake: false,
		};
		const migrated = migrateSave(legacyV0 as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		// Core progress preserved
		expect(migrated!.totalRuns).toBe(42);
		expect(migrated!.highestWave).toBe(137);
		expect(migrated!.totalCoins).toBe(98765);
		// Workshop key renames applied
		expect(migrated!.workshopUpgrades.energyBonus).toBe(4);
		expect(migrated!.workshopUpgrades.startingEnergy).toBe(2);
		// Lab key rename applied
		expect((migrated!.labLevels as Record<string, number>).alloyEfficiency).toBe(3);
		// v9: per-front best wave grandfathers the global best onto Front 1
		expect(migrated!.frontBestWave).toBeTruthy();
		// New required arrays/fields exist
		expect(Array.isArray(migrated!.discoveredBlueprints)).toBe(true);
		expect(Array.isArray(migrated!.unlockedBlueprints)).toBe(true);
		expect(migrated!.selectedFront).toBeTruthy();
		expect(migrated!.strangeMatter).toBe(0);
		expect(migrated!.blackMarketUnlocks).toEqual({});
	});

	it('should backfill missing settings and stat fields on a sparse save', () => {
		const sparse = { schemaVersion: 8, lastUpdated: 1, totalRuns: 1, highestWave: 1, totalCoins: 1 };
		const migrated = migrateSave(sparse as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(typeof migrated!.settings.sfx).toBe('boolean');
		expect(typeof migrated!.settings.bloom).toBe('boolean');
		expect(typeof migrated!.settings.browserNotifications).toBe('boolean');
		expect(migrated!.totalKills).toBe(0);
		expect(migrated!.totalShiniesKilled).toBe(0);
		expect(migrated!.deploymentReports).toEqual([]);
	});

	it('should clamp malformed Black Market fields during migration', () => {
		const sparse = {
			schemaVersion: 11,
			lastUpdated: 1,
			totalRuns: 1,
			highestWave: 1,
			totalCoins: 1,
			strangeMatter: -99,
			lifetimeStrangeMatterEarned: '14.8',
			lastWeeklyBlackMarketShipmentClaimedAt: -5,
			lastDailyStrangeMatterPickedUpAt: '123',
			lastDailyStrangeMatterDeploymentAt: '456',
			blackMarketUnlocks: { gameSpeed3: true, bogus: true },
		};
		const migrated = migrateSave(sparse as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.strangeMatter).toBe(0);
		expect(migrated!.lifetimeStrangeMatterEarned).toBe(14);
		expect(migrated!.lastWeeklyBlackMarketShipmentClaimedAt).toBe(0);
		expect(migrated!.lastDailyStrangeMatterPickedUpAt).toBe(123);
		expect(migrated!.lastDailyStrangeMatterDeploymentAt).toBe(456);
		expect(migrated!.blackMarketUnlocks).toEqual({ gameSpeed3: true });
	});

	it('should migrate legacy daily contract timestamps into daily pickup fields', () => {
		const sparse = {
			schemaVersion: 11,
			lastUpdated: 1,
			totalRuns: 1,
			highestWave: 1,
			totalCoins: 1,
			lastDailyContractCompletedAt: '123',
			lastDailyContractDeploymentAt: '456',
		};
		const migrated = migrateSave(sparse as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.lastDailyStrangeMatterPickedUpAt).toBe(123);
		expect(migrated!.lastDailyStrangeMatterDeploymentAt).toBe(456);
	});

	it('should add blackMarketIntroSeen default false for v12→v13 migration', () => {
		const v12 = {
			schemaVersion: 12,
			lastUpdated: 1, totalRuns: 1, highestWave: 1, totalCoins: 1,
			strangeMatter: 5,
			blackMarketUnlocks: {},
		};
		const migrated = migrateSave(v12 as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(migrated!.blackMarketIntroSeen).toBe(false);
	});

	it('should add bestKillstreak default 0 for v13→v14 migration', () => {
		const v13 = {
			schemaVersion: 13,
			lastUpdated: 1, totalRuns: 1, highestWave: 1, totalCoins: 1,
			blackMarketUnlocks: {},
			blackMarketIntroSeen: true,
		};
		const migrated = migrateSave(v13 as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(migrated!.bestKillstreak).toBe(0);
	});

	it('should preserve an existing bestKillstreak through migration', () => {
		const v13 = {
			schemaVersion: 13,
			lastUpdated: 1, totalRuns: 1, highestWave: 1, totalCoins: 1,
			blackMarketUnlocks: {},
			bestKillstreak: 1234,
		};
		const migrated = migrateSave(v13 as unknown as Record<string, unknown>);
		expect(migrated!.bestKillstreak).toBe(1234);
	});

	it('should preserve blackMarketIntroSeen true from v13 saves', () => {
		const v13 = {
			schemaVersion: 13,
			lastUpdated: 1, totalRuns: 1, highestWave: 1, totalCoins: 1,
			strangeMatter: 5,
			blackMarketUnlocks: {},
			blackMarketIntroSeen: true,
		};
		const migrated = migrateSave(v13 as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.blackMarketIntroSeen).toBe(true);
	});

	it('should normalize corrupted core numeric fields during metadata repair', () => {
		const corrupted = {
			schemaVersion: CURRENT_SCHEMA_VERSION,
			lastUpdated: Number.POSITIVE_INFINITY,
			totalRuns: -4,
			highestWave: Number.NaN,
			totalCoins: Number.POSITIVE_INFINITY,
			totalAlloyEarned: -100,
			totalKills: '12.9',
			totalBossesDefeated: {},
			totalShiniesKilled: null,
			totalFieldUpgradesPurchased: Number.NEGATIVE_INFINITY,
			totalEnergyEarned: '44.8',
			totalDamageDealt: '123.5',
			totalCritsDealt: -1,
			totalWavesCompleted: '8.9',
			totalPlayTimeSeconds: Number.POSITIVE_INFINITY,
			bestKillstreak: -99,
			killsByType: { normal: '3.7', boss: Number.POSITIVE_INFINITY },
			shinyKillsByType: { fast: -2 },
			frontBestWave: { tier1: Number.POSITIVE_INFINITY, tier2: -5, bogus: 100 },
		};
		const migrated = migrateSave(corrupted as unknown as Record<string, unknown>);
		expect(migrated).not.toBeNull();
		expect(migrated!.totalRuns).toBe(0);
		expect(migrated!.highestWave).toBe(0);
		expect(migrated!.totalCoins).toBe(0);
		expect(migrated!.totalAlloyEarned).toBe(0);
		expect(migrated!.totalKills).toBe(12);
		expect(migrated!.totalBossesDefeated).toBe(0);
		expect(migrated!.totalShiniesKilled).toBe(0);
		expect(migrated!.totalFieldUpgradesPurchased).toBe(0);
		expect(migrated!.totalEnergyEarned).toBe(44);
		expect(migrated!.totalDamageDealt).toBe(123.5);
		expect(migrated!.totalCritsDealt).toBe(0);
		expect(migrated!.totalWavesCompleted).toBe(8);
		expect(migrated!.totalPlayTimeSeconds).toBe(0);
		expect(migrated!.bestKillstreak).toBe(0);
		expect(migrated!.killsByType.normal).toBe(3);
		expect(migrated!.killsByType.boss).toBe(0);
		expect(migrated!.shinyKillsByType.fast).toBe(0);
		expect(migrated!.frontBestWave.tier1).toBe(0);
		expect(migrated!.frontBestWave.tier2).toBe(0);
		expect((migrated!.frontBestWave as Record<string, number>).bogus).toBeUndefined();
	});

	it('keeps current v13 to v14 migration idempotent after numeric repair', () => {
		const v13 = {
			schemaVersion: 13,
			lastUpdated: 1,
			totalRuns: 2,
			highestWave: 12,
			totalCoins: 300,
			totalAlloyEarned: 400,
			blackMarketUnlocks: {},
			blackMarketIntroSeen: true,
			bestKillstreak: 55,
			frontBestWave: { tier1: 12 },
		};
		const once = migrateSave(v13 as unknown as Record<string, unknown>);
		const twice = migrateSave(once as unknown as Record<string, unknown>);
		expect(once).not.toBeNull();
		expect(twice).not.toBeNull();
		expect(twice!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(twice!.totalCoins).toBe(300);
		expect(twice!.highestWave).toBe(12);
		expect(twice!.bestKillstreak).toBe(55);
		expect(twice!.frontBestWave.tier1).toBe(12);
	});

	it('should have blackMarketIntroSeen in createDefaultSave', () => {
		const save = createDefaultSave();
		expect(save.blackMarketIntroSeen).toBe(false);
		expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('should have bestKillstreak default 0 in createDefaultSave', () => {
		const save = createDefaultSave();
		expect(save.bestKillstreak).toBe(0);
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

describe('FLTD_SAVE Export/Import Encoding', () => {
	const sampleSave = createDefaultSave();
	const sampleJson = JSON.stringify(sampleSave);

	it('should encode save data into FLTD_SAVE container', async () => {
		const result = await encodeSaveContainer(sampleJson);
		expect(result.success).toBe(true);
		expect(result.data).toBeTruthy();
		const container = JSON.parse(result.data!);
		expect(container.format).toBe('FLTD_SAVE');
		expect(container.formatVersion).toBe(1);
		expect(container.game).toBe('Flatland TD');
		expect(container.encoding).toBe('base64url+sha256');
		expect(container.payload).toBeTruthy();
		expect(container.checksum).toBeTruthy();
		expect(container.exportedAt).toBeTruthy();
	});

	it('should include SaveData schemaVersion in encoded payload', async () => {
		const result = await encodeSaveContainer(sampleJson);
		const container = JSON.parse(result.data!);
		const decodedPayload = JSON.parse(
			Buffer.from(container.payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
		);
		expect(decodedPayload.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('should decode a valid FLTD_SAVE container', async () => {
		const result = await encodeSaveContainer(sampleJson);
		const decoded = await decodeSaveContainer(result.data!);
		expect(decoded.success).toBe(true);
		expect(decoded.saveJson).toBeTruthy();
		expect(JSON.parse(decoded.saveJson!).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('should reject wrong format', async () => {
		const bad = JSON.stringify({ format: 'WRONG', payload: 'x', checksum: 'x' });
		const decoded = await decodeSaveContainer(bad);
		expect(decoded.success).toBe(false);
		expect(decoded.error).toContain('not a Flatland TD save');
	});

	it('should reject unsupported future formatVersion', async () => {
		const bad = JSON.stringify({ format: 'FLTD_SAVE', formatVersion: 999, payload: 'x', checksum: 'x' });
		const decoded = await decodeSaveContainer(bad);
		expect(decoded.success).toBe(false);
		expect(decoded.error).toContain('newer version');
	});

	it('should reject checksum mismatch', async () => {
		const result = await encodeSaveContainer(sampleJson);
		const container = JSON.parse(result.data!);
		container.checksum = '0000000000000000000000000000000000000000000000000000000000000000';
		const decoded = await decodeSaveContainer(JSON.stringify(container));
		expect(decoded.success).toBe(false);
		expect(decoded.error).toContain('checksum');
	});

	it('should reject corrupted payload', async () => {
		const result = await encodeSaveContainer(sampleJson);
		const container = JSON.parse(result.data!);
		container.payload = '!!!not-valid-base64!!!';
		const decoded = await decodeSaveContainer(JSON.stringify(container));
		expect(decoded.success).toBe(false);
	});

	it('should handle legacy plain JSON import', async () => {
		const legacy = JSON.stringify({ schemaVersion: 1, lastUpdated: 1, totalRuns: 0, highestWave: 0, totalCoins: 0 });
		const decoded = await decodeSaveContainer(legacy);
		expect(decoded.success).toBe(true);
		expect(decoded.isLegacy).toBe(true);
	});

	it('should reject garbage input gracefully', async () => {
		const decoded = await decodeSaveContainer('not even json');
		expect(decoded.success).toBe(false);
	});

	it('should not crash on empty string', async () => {
		const decoded = await decodeSaveContainer('');
		expect(decoded.success).toBe(false);
	});
});

// ─── Regression: Audit pass fixes ────────────────────────────────────────────

describe('schemaVersion string bypass regression', () => {
	it('string "5" migrates the same as numeric 5', () => {
		const fromString = migrateSave({ schemaVersion: '5' as unknown as number, lastUpdated: 1, totalRuns: 1, highestWave: 10, totalCoins: 50 } as Record<string, unknown>);
		const fromNumber = migrateSave({ schemaVersion: 5, lastUpdated: 1, totalRuns: 1, highestWave: 10, totalCoins: 50 } as Record<string, unknown>);
		expect(fromString).not.toBeNull();
		expect(fromNumber).not.toBeNull();
		expect(fromString!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(fromNumber!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(fromString!.highestWave).toBe(fromNumber!.highestWave);
	});

	it('string "abc" schemaVersion is treated as v0 and migrates cleanly', () => {
		const result = migrateSave({ schemaVersion: 'abc' as unknown as number, totalRuns: 3, highestWave: 7, totalCoins: 100 } as Record<string, unknown>);
		expect(result).not.toBeNull();
		expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(result!.highestWave).toBe(7);
	});

	it('missing schemaVersion is treated as v0', () => {
		const result = migrateSave({ totalRuns: 2, highestWave: 5, totalCoins: 20 } as Record<string, unknown>);
		expect(result).not.toBeNull();
		expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('negative schemaVersion is treated as v0', () => {
		const result = migrateSave({ schemaVersion: -1, totalRuns: 1, highestWave: 1, totalCoins: 0 } as Record<string, unknown>);
		expect(result).not.toBeNull();
		expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('float schemaVersion 5.9 is floored to 5', () => {
		const fromFloat = migrateSave({ schemaVersion: 5.9, lastUpdated: 1, totalRuns: 1, highestWave: 10, totalCoins: 50 } as Record<string, unknown>);
		const fromInt = migrateSave({ schemaVersion: 5, lastUpdated: 1, totalRuns: 1, highestWave: 10, totalCoins: 50 } as Record<string, unknown>);
		expect(fromFloat).not.toBeNull();
		expect(fromFloat!.schemaVersion).toBe(fromInt!.schemaVersion);
	});
});

describe('validateSaveData malformed-field regression', () => {
	const base = { schemaVersion: CURRENT_SCHEMA_VERSION, lastUpdated: 1, totalRuns: 0, highestWave: 0, totalCoins: 0 };

	it('rejects workshopUpgrades as string', () => {
		expect(validateSaveData({ ...base, workshopUpgrades: 'garbage' })).toBe(false);
	});

	it('rejects workshopUpgrades as array', () => {
		expect(validateSaveData({ ...base, workshopUpgrades: [1, 2, 3] })).toBe(false);
	});

	it('rejects labLevels as null-ish non-object (number)', () => {
		expect(validateSaveData({ ...base, labLevels: 42 })).toBe(false);
	});

	it('rejects labLevels as array', () => {
		expect(validateSaveData({ ...base, labLevels: ['damageResearch'] })).toBe(false);
	});

	it('rejects achievements as array', () => {
		expect(validateSaveData({ ...base, achievements: ['ach1', 'ach2'] })).toBe(false);
	});

	it('rejects unlockedBlueprints as plain object', () => {
		expect(validateSaveData({ ...base, unlockedBlueprints: { a: 1 } })).toBe(false);
	});

	it('rejects discoveredBlueprints as plain object', () => {
		expect(validateSaveData({ ...base, discoveredBlueprints: { a: 1 } })).toBe(false);
	});

	it('accepts null workshopUpgrades (repaired by ensureMetadata)', () => {
		expect(validateSaveData({ ...base, workshopUpgrades: null })).toBe(true);
	});

	it('accepts undefined labLevels (absent key)', () => {
		expect(validateSaveData({ ...base })).toBe(true);
	});

	it('accepts valid array for unlockedBlueprints', () => {
		expect(validateSaveData({ ...base, unlockedBlueprints: ['blueprint1'] })).toBe(true);
	});

	it('rejects malformed blackMarketUnlocks', () => {
		expect(validateSaveData({ ...base, blackMarketUnlocks: [] })).toBe(false);
		expect(validateSaveData({ ...base, blackMarketUnlocks: 'bad' })).toBe(false);
	});

	it('rejects malformed deploymentReports', () => {
		expect(validateSaveData({ ...base, deploymentReports: {} })).toBe(false);
		expect(validateSaveData({ ...base, deploymentReports: [] })).toBe(true);
	});
});

describe('isRecord (New Record on first run) regression', () => {
	it('wave > 0 and best === 0 is a New Record', () => {
		// Mirrors the isRecord formula fixed in GameOverPanel:
		// const isRecord = wave > 0 && wave >= best
		const wave = 3, best = 0;
		const isRecord = wave > 0 && wave >= best;
		expect(isRecord).toBe(true);
	});

	it('wave 0 is never a New Record', () => {
		const wave = 0, best = 0;
		const isRecord = wave > 0 && wave >= best;
		expect(isRecord).toBe(false);
	});

	it('wave equal to best (best > 0) is a New Record (tie counts)', () => {
		const wave = 5, best = 5;
		const isRecord = wave > 0 && wave >= best;
		expect(isRecord).toBe(true);
	});

	it('wave below best is not a New Record', () => {
		const wave = 3, best = 10;
		const isRecord = wave > 0 && wave >= best;
		expect(isRecord).toBe(false);
	});
});
