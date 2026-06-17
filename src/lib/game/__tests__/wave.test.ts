import { describe, it, expect } from 'vitest';
import { getEnemyCountForWave, getSpawnIntervalForWave, getEnemyTypeForWave, createEnemy } from '../balance/enemies';
import { EnemyType } from '../engine/gameTypes';
import { enemiesPerWave, bossEscortCount, spawnIntervalForWave } from '../balance/balanceMath';

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
		// Boss wave has escorts (floor(3 + 10*0.2) = 5) + 1 boss = 6
		const expectedEscorts = bossEscortCount(10);
		expect(bossWaveCount).toBe(expectedEscorts + 1);
	});

	it('should have decreasing spawn intervals', () => {
		const interval1 = getSpawnIntervalForWave(1);
		const interval10 = getSpawnIntervalForWave(10);
		expect(interval10).toBeLessThan(interval1);
	});

	it('spawn interval should not go below minimum', () => {
		const interval100 = getSpawnIntervalForWave(100);
		expect(interval100).toBeGreaterThanOrEqual(0.08);
	});

	it('should unlock enemy types at specific waves', () => {
		const typesWave1 = getEnemyTypeForWave(1);
		expect(typesWave1).toContain(EnemyType.Normal);
		expect(typesWave1).not.toContain(EnemyType.Fast);

		const typesWave5 = getEnemyTypeForWave(5);
		expect(typesWave5).toContain(EnemyType.Fast);

		const typesWave10 = getEnemyTypeForWave(10);
		expect(typesWave10).toContain(EnemyType.Boss);
		expect(typesWave10.length).toBe(1); // Boss wave only returns boss
	});
});

describe('Enemy Config', () => {
	it('should scale HP with wave number', () => {
		// Create enemies at different waves and check HP
		const e1 = createEnemy(EnemyType.Normal, 1, 0, 0);
		const e10 = createEnemy(EnemyType.Normal, 10, 0, 0);
		expect(e10.hp).toBeGreaterThan(e1.hp);
	});

	it('boss should have more HP than normal enemy', () => {
		const normal = createEnemy(EnemyType.Normal, 10, 0, 0);
		const boss = createEnemy(EnemyType.Boss, 10, 0, 0);
		expect(boss.hp).toBeGreaterThan(normal.hp);
	});

	it('fast enemy should have lower HP than normal', () => {
		const normal = createEnemy(EnemyType.Normal, 10, 0, 0);
		const fast = createEnemy(EnemyType.Fast, 10, 0, 0);
		expect(fast.hp).toBeLessThan(normal.hp);
	});

	it('should have correct shape assignments', () => {
		expect(createEnemy(EnemyType.Normal, 1, 0, 0).shape).toBe('square');
		expect(createEnemy(EnemyType.Fast, 5, 0, 0).shape).toBe('diamond');
		expect(createEnemy(EnemyType.Tank, 5, 0, 0).shape).toBe('hexagon');
		expect(createEnemy(EnemyType.Ranged, 8, 0, 0).shape).toBe('triangle');
		expect(createEnemy(EnemyType.Boss, 10, 0, 0).shape).toBe('pentagon');
	});
});
