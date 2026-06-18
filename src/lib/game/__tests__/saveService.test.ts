import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSave, CURRENT_SCHEMA_VERSION } from '../save/saveTypes';
import { encodeSaveContainer } from '../save/saveEncoding';

const store = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
	get: vi.fn((key: string) => Promise.resolve(store.get(key))),
	set: vi.fn((key: string, value: unknown) => {
		store.set(key, value);
		return Promise.resolve();
	}),
	del: vi.fn((key: string) => {
		store.delete(key);
		return Promise.resolve();
	}),
}));

describe('saveService import/load parity', () => {
	beforeEach(async () => {
		store.clear();
		vi.resetModules();
	});

	it('imports a structurally repairable pre-v1 legacy save', async () => {
		const { importSave, getCachedSave } = await import('../save/saveService');
		const legacy = JSON.stringify({
			totalRuns: 7,
			highestWave: 22,
			totalCoins: 1500,
			workshopUpgrades: { baseDamage: 2 },
		});

		const result = await importSave(legacy);
		const imported = getCachedSave();
		expect(result.success).toBe(true);
		expect(result.isLegacy).toBe(true);
		expect(imported?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(imported?.totalRuns).toBe(7);
		expect(imported?.highestWave).toBe(22);
		expect(imported?.totalCoins).toBe(1500);
	});

	it('load and import repair equivalent old saves to equivalent modern progress fields', async () => {
		const oldSave = {
			totalRuns: 3,
			highestWave: 18,
			totalCoins: 900,
			labLevels: { coinEfficiency: 2 },
			workshopUpgrades: { cashBonus: 4 },
		};

		store.set('flatland-td-save', oldSave);
		let service = await import('../save/saveService');
		const loaded = await service.loadSave();

		store.clear();
		vi.resetModules();
		service = await import('../save/saveService');
		const importedResult = await service.importSave(JSON.stringify(oldSave));
		const imported = service.getCachedSave();

		expect(importedResult.success).toBe(true);
		expect(imported?.schemaVersion).toBe(loaded.schemaVersion);
		expect(imported?.totalRuns).toBe(loaded.totalRuns);
		expect(imported?.highestWave).toBe(loaded.highestWave);
		expect(imported?.totalCoins).toBe(loaded.totalCoins);
		expect(imported?.workshopUpgrades.energyBonus).toBe(loaded.workshopUpgrades.energyBonus);
		expect(imported?.labLevels.alloyEfficiency).toBe(loaded.labLevels.alloyEfficiency);
	});

	it('copies a legacy browser save key into the new Flatland TD key once', async () => {
		const oldSave = {
			totalRuns: 2,
			highestWave: 12,
			totalCoins: 400,
		};

		store.set('geocore-td-save', oldSave);
		const service = await import('../save/saveService');
		const loaded = await service.loadSave();

		expect(loaded.totalRuns).toBe(2);
		expect(store.has('flatland-td-save')).toBe(true);
		expect((store.get('flatland-td-save') as { totalRuns?: number }).totalRuns).toBe(2);
	});

	it('rejects unrecoverable malformed and future schema imports clearly', async () => {
		const { importSave } = await import('../save/saveService');
		const malformed = await importSave(JSON.stringify(['not', 'a', 'save']));
		const future = await importSave(JSON.stringify({
			schemaVersion: CURRENT_SCHEMA_VERSION + 1,
			lastUpdated: 1,
			totalRuns: 0,
			highestWave: 0,
			totalCoins: 0,
		}));

		expect(malformed.success).toBe(false);
		expect(malformed.error).toContain('not a Flatland TD save');
		expect(future.success).toBe(false);
		expect(future.error).toContain('newer version');
	});

	it('roundtrips a current FLTD_SAVE export container without losing important fields', async () => {
		const { importSave, getCachedSave } = await import('../save/saveService');
		const current = createDefaultSave();
		current.totalCoins = 12345;
		current.highestWave = 77;
		current.totalRuns = 9;
		current.strangeMatter = 6;
		current.schematicsByFront[1] = 14;
		const container = await encodeSaveContainer(JSON.stringify(current));

		const result = await importSave(container.data!);
		const imported = getCachedSave();
		expect(result.success).toBe(true);
		expect(result.isLegacy).not.toBe(true);
		expect(imported?.totalCoins).toBe(12345);
		expect(imported?.highestWave).toBe(77);
		expect(imported?.totalRuns).toBe(9);
		expect(imported?.strangeMatter).toBe(6);
		expect(imported?.schematicsByFront[1]).toBe(14);
	});
});
