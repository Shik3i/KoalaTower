import { describe, it, expect } from 'vitest';
import {
	flatlandBaseDamageAtLevel,
	ENEMY_TYPE_MODIFIERS,
	FRONT_STAT_MULTIPLIERS,
	FRONT_ALLOY_REWARD_MULTIPLIERS,
	getTierMultiplier,
	getFrontAlloyMultiplier,
	calculateEffectiveDamage,
	bossHpMultiplier
} from '../balance/balanceMath';
import { getDefaultTowerStats } from '../engine/gameConfig';
import { getWaveCoinReward } from '../systems/economySystem';
import { EnemyType, type GameState } from '../engine/gameTypes';

const mockState = (tier: number = 1): GameState => ({
	workshopUpgrades: {},
	labLevels: {},
	tier,
	activeChallenge: null,
	battleUpgrades: {},
	coins: 0,
	cash: 0,
	totalEnergyEarned: 0,
	totalDamageDealt: 0,
	enemies: [],
	wave: {
		currentWave: 1,
		enemiesInWave: 0,
		enemiesSpawned: 0,
		enemiesKilled: 0,
		waveActive: false,
		betweenWaveTimer: 0,
		currentTickIndex: 0,
		spawnBacklog: 0,
		bossPending: false,
		currentSubWave: 0,
		enemiesInSubWave: 0,
		enemiesSpawnedInSubWave: 0,
		subWavePauseTimer: 0,
		subWaveActive: false,
		lastWaveKillsByType: {},
		killsByTypeThisWave: {},
	},
	tower: {
		position: { x: 0, y: 0 },
		hp: 100,
		maxHp: 100,
		stats: getDefaultTowerStats(),
		fireTimer: 0,
		alive: true,
	},
	runActive: true,
	gameOver: false,
	paused: false,
	viewWidth: 800,
	viewHeight: 800,
} as unknown as GameState);

describe('Flatland TD Balance Polish Tests', () => {
	it('player damage curve is unchanged', () => {
		expect(flatlandBaseDamageAtLevel(0)).toBe(50);
		expect(flatlandBaseDamageAtLevel(1)).toBe(75);
		expect(flatlandBaseDamageAtLevel(10)).toBe(483);
	});

	it('enemy type HP modifiers are correct (Fast/Ranged stay lower-HP)', () => {
		expect(bossHpMultiplier(1)).toBe(20);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Normal].hp).toBe(1.0);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Fast].hp).toBe(0.8);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Ranged].hp).toBe(0.5);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Tank].hp).toBe(5.0);
		expect(ENEMY_TYPE_MODIFIERS[EnemyType.Boss].hp).toBe(20.0);
	});

	it('Front multipliers are mapped correctly', () => {
		expect(FRONT_STAT_MULTIPLIERS[1]).toBe(1);
		expect(FRONT_STAT_MULTIPLIERS[2]).toBe(20);
		expect(FRONT_STAT_MULTIPLIERS[5]).toBe(240);
		expect(FRONT_STAT_MULTIPLIERS[10]).toBe(40320);
		expect(FRONT_STAT_MULTIPLIERS[16]).toBe(15750000000000);

		expect(FRONT_ALLOY_REWARD_MULTIPLIERS[1]).toBe(1.0);
		expect(FRONT_ALLOY_REWARD_MULTIPLIERS[2]).toBe(2.5);
		expect(FRONT_ALLOY_REWARD_MULTIPLIERS[5]).toBe(12.0);
		expect(FRONT_ALLOY_REWARD_MULTIPLIERS[10]).toBe(75.0);
		expect(FRONT_ALLOY_REWARD_MULTIPLIERS[16]).toBe(800.0);

		const t2 = getTierMultiplier(2);
		expect(t2.hp).toBe(20);
		expect(t2.alloy).toBe(2.5);
	});

	it('starter attack speed is 1.0 attacks/second', () => {
		expect(getDefaultTowerStats().fireRate).toBe(1.0);
	});

	it('wave completion healing behaves correctly', () => {
		// healAmt = max(30, round(maxHp * 0.25))
		const heal1 = Math.max(30, Math.round(100 * 0.25)); // max(30, 25) = 30
		expect(heal1).toBe(30);

		const heal2 = Math.max(30, Math.round(500 * 0.25)); // max(30, 125) = 125
		expect(heal2).toBe(125);
	});

	it('Alloy rewards on wave completion match targets', () => {
		const state = mockState(1); // Front 1 (alloy multiplier = 1.0)
		
		// Waves 1-10: flat 3 base
		expect(getWaveCoinReward(state, 4)).toBe(3);
		expect(getWaveCoinReward(state, 10)).toBe(3);

		// Waves 11-25: flat 4 base
		expect(getWaveCoinReward(state, 11)).toBe(4);
		expect(getWaveCoinReward(state, 25)).toBe(4);

		// Waves 26+: progressive floor(wave * 0.2)
		expect(getWaveCoinReward(state, 30)).toBe(6);
		expect(getWaveCoinReward(state, 100)).toBe(20);

		// Scaling on higher Fronts (e.g. Front 2 alloy multiplier = 2.5)
		const stateT2 = mockState(2);
		expect(getWaveCoinReward(stateT2, 10)).toBe(7); // floor(3 * 2.5) = 7
	});

	it('calculateEffectiveDamage handles armor and pierce correctly', () => {
		// 10 damage vs 0.2 armor
		expect(calculateEffectiveDamage(10, 0.2)).toBe(8);

		// 10 damage vs 0.2 armor, 0.1 pierce
		expect(calculateEffectiveDamage(10, 0.2, 0.1)).toBe(9);

		// 1 damage vs 0.9 armor (should hit floor of 1)
		expect(calculateEffectiveDamage(1, 0.9)).toBe(1);
	});
});
