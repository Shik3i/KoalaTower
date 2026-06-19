import { describe, it, expect } from 'vitest';
import { getEnemyCountForWave, getSpawnIntervalForWave, getEnemyTypeForWave, createEnemy } from '../balance/enemies';
import { EnemyType } from '../engine/gameTypes';
import { expectedEnemiesPerWave } from '../balance/balanceMath';

describe('Wave Scaling', () => {
	it('should have increasing enemy counts per wave', () => {
		const count1 = getEnemyCountForWave(1);
		const count5 = getEnemyCountForWave(5);
		const count9 = getEnemyCountForWave(9);
		expect(count5).toBeGreaterThan(count1);
		expect(count9).toBeGreaterThan(count5);
	});

	it('boss waves should include normal spawns + boss', () => {
		const bossWaveCount = getEnemyCountForWave(10);
		// Boss wave has expected normal spawns (61) + 1 boss = 62
		expect(bossWaveCount).toBe(expectedEnemiesPerWave(10, 1) + 1);
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

	it('fast enemy should have same HP as normal', () => {
		const normal = createEnemy(EnemyType.Normal, 10, 0, 0);
		const fast = createEnemy(EnemyType.Fast, 10, 0, 0);
		expect(fast.hp).toBe(normal.hp);
	});

	it('should have correct shape assignments', () => {
		expect(createEnemy(EnemyType.Normal, 1, 0, 0).shape).toBe('square');
		expect(createEnemy(EnemyType.Fast, 5, 0, 0).shape).toBe('diamond');
		expect(createEnemy(EnemyType.Tank, 5, 0, 0).shape).toBe('hexagon');
		expect(createEnemy(EnemyType.Ranged, 8, 0, 0).shape).toBe('triangle');
		expect(createEnemy(EnemyType.Boss, 10, 0, 0).shape).toBe('pentagon');
	});
});

import { startNewWave, updateWaveSystem } from '../systems/waveSystem';
import { MAX_ACTIVE_ENEMIES } from '../balance/balanceMath';

describe('Spawner Integration & Pacing', () => {
	it('game speed or step size dt does not alter total spawned count', () => {
		// Run wave 100 on Front 1 (expects 103 normal spawns + 1 boss = 104)
		const runSim = (dtStep: number) => {
			const state = {
				runActive: true,
				gameOver: false,
				paused: false,
				tier: 1,
				enemies: [] as any[],
				wave: {
					currentWave: 99, // startNewWave will increment to 100
					killsByTypeThisWave: {},
					lastWaveKillsByType: {}
				} as any
			};
			startNewWave(state as any);

			// Simulate 35 seconds of wave time
			let elapsed = 0;
			while (elapsed < 35) {
				updateWaveSystem(state as any, dtStep);
				elapsed += dtStep;
			}
			return state.wave.enemiesSpawned;
		};

		// 1x speed (dt = 0.016s) vs 5x speed (dt = 0.08s) vs coarse ticks (dt = 0.5s)
		const countNormal = runSim(0.016);
		const countFast = runSim(0.08);
		const countCoarse = runSim(0.5);

		expect(countNormal).toBe(104); // 103 normal + 1 boss
		expect(countFast).toBe(104);
		expect(countCoarse).toBe(104);
	});

	it('active cap backlogs planned spawns instead of deleting them', () => {
		// Front 16 Wave 100 has 614 normal spawns
		const state = {
			runActive: true,
			gameOver: false,
			paused: false,
			tier: 16,
			enemies: [] as any[],
			wave: {
				currentWave: 99, // startNewWave will increment to 100
				killsByTypeThisWave: {},
				lastWaveKillsByType: {}
			} as any
		};
		startNewWave(state as any);

		// Simulate 35 seconds of wave spawning without killing any enemies
		let elapsed = 0;
		while (elapsed < 35) {
			updateWaveSystem(state as any, 0.125);
			elapsed += 0.125;
		}

		// Because enemies were not killed, they should hit the active cap
		expect(state.enemies.length).toBe(MAX_ACTIVE_ENEMIES); // capped at 150
		expect(state.wave.spawnBacklog).toBeGreaterThan(0);
		// Check that no spawns were lost or deleted from enemiesInWave
		expect(state.wave.enemiesInWave).toBe(615); // 614 normal + 1 boss

		// Now kill all alive enemies on screen
		state.enemies = [];

		// Run update loop further
		let furtherTime = 0;
		while (furtherTime < 35 && state.wave.enemiesSpawned < state.wave.enemiesInWave) {
			updateWaveSystem(state as any, 0.125);
			// Simulate immediate kills to prevent recapping
			state.wave.enemiesKilled += state.enemies.length;
			state.enemies = [];
			furtherTime += 0.125;
		}

		// Verify that all scheduled enemies eventually spawned
		expect(state.wave.enemiesSpawned).toBe(615);
		expect(state.wave.spawnBacklog).toBe(0);
	});
});
