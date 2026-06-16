import { describe, it, expect } from 'vitest';
import { getEnemyConfig, getEnemyCountForWave, getEnemyTypeForWave, getSpawnIntervalForWave } from '../balance/enemies';
import { EnemyType } from '../engine/gameTypes';
import { WAVE_CONFIG } from '../engine/gameConfig';

describe('Wave Scaling', () => {
	it('should have increasing enemy counts per wave', () => {
		const count1 = getEnemyCountForWave(1);
		const count5 = getEnemyCountForWave(5);
		const count9 = getEnemyCountForWave(9);
		expect(count5).toBeGreaterThan(count1);
		expect(count9).toBeGreaterThan(count5);
	});

	it('boss waves should include escorts + boss', () => {
		const bossWaveCount = getEnemyCountForWave(10);
		// Boss wave has escorts (3 at wave 10) + 1 boss = 4
		expect(bossWaveCount).toBe(4);
	});

	it('should have decreasing spawn intervals', () => {
		const interval1 = getSpawnIntervalForWave(1);
		const interval10 = getSpawnIntervalForWave(10);
		expect(interval10).toBeLessThan(interval1);
	});

	it('spawn interval should not go below minimum', () => {
		const interval100 = getSpawnIntervalForWave(100);
		expect(interval100).toBeGreaterThanOrEqual(WAVE_CONFIG.SPAWN_INTERVAL_MIN);
	});

	it('should unlock enemy types at specific waves', () => {
		const typesWave1 = getEnemyTypeForWave(1);
		expect(typesWave1).toContain(EnemyType.Normal);
		expect(typesWave1).not.toContain(EnemyType.Fast);

		const typesWave5 = getEnemyTypeForWave(5);
		expect(typesWave5).toContain(EnemyType.Tank);

		const typesWave10 = getEnemyTypeForWave(10);
		expect(typesWave10).toContain(EnemyType.Boss);
		expect(typesWave10.length).toBe(1); // Boss wave only spawns boss
	});
});

describe('Enemy Config', () => {
	it('should scale HP with wave number', () => {
		const normal1 = getEnemyConfig(EnemyType.Normal, 1);
		const normal10 = getEnemyConfig(EnemyType.Normal, 10);
		expect(normal10.hp).toBeGreaterThan(normal1.hp);
	});

	it('boss should have more HP than normal enemy', () => {
		const normal = getEnemyConfig(EnemyType.Normal, 5);
		const boss = getEnemyConfig(EnemyType.Boss, 5);
		expect(boss.hp).toBeGreaterThan(normal.hp);
	});

	it('fast enemy should have lower HP than normal', () => {
		const normal = getEnemyConfig(EnemyType.Normal, 5);
		const fast = getEnemyConfig(EnemyType.Fast, 5);
		expect(fast.hp).toBeLessThan(normal.hp);
	});

	it('should have correct shape assignments', () => {
		expect(getEnemyConfig(EnemyType.Normal, 1).shape).toBe('square');
		expect(getEnemyConfig(EnemyType.Fast, 5).shape).toBe('triangle');
		expect(getEnemyConfig(EnemyType.Tank, 5).shape).toBe('hexagon');
		expect(getEnemyConfig(EnemyType.Ranged, 8).shape).toBe('diamond');
		expect(getEnemyConfig(EnemyType.Boss, 10).shape).toBe('pentagon');
	});
});
