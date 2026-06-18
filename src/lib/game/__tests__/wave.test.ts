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

	it('Front 1 introduces types slowly (Basic only through wave 9)', () => {
		// Front 1 pacing: Wave 1–9 Basic only, Fast at 11+, Tank at 50+, Ranged at 100+.
		for (let w = 1; w <= 9; w++) {
			if (w % 10 === 0) continue;
			const types = getEnemyTypeForWave(w); // default front = 1
			expect(new Set(types)).toEqual(new Set([EnemyType.Normal]));
		}

		// Wave 5 on Front 1 is STILL Basic only (Fast no longer appears this early).
		const typesWave5 = getEnemyTypeForWave(5);
		expect(typesWave5).not.toContain(EnemyType.Fast);

		// Fast/Runner appears from wave 11 on Front 1.
		const typesWave11 = getEnemyTypeForWave(11);
		expect(typesWave11).toContain(EnemyType.Fast);

		const typesWave10 = getEnemyTypeForWave(10);
		expect(typesWave10).toContain(EnemyType.Boss);
		expect(typesWave10.length).toBe(1); // Boss wave only returns boss
	});

	it('higher Fronts introduce known types earlier than Front 1', () => {
		// Front 5 (Redline) fields Fast by wave 5, unlike Front 1.
		const front5Wave5 = getEnemyTypeForWave(5, 5);
		expect(front5Wave5).toContain(EnemyType.Fast);
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
