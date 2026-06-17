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
