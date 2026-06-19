/**
 * enemies.ts — Enemy creation and wave-composition logic.
 *
 * Uses balanceMath for all stat formulas. This file handles:
 * - Converting balance data into in-game Enemy objects
 * - Wave composition (which types, how many, spawn timing)
 * - Boss spawning logic
 */

import { EnemyType, type Enemy, type EnemyConfig } from '../engine/gameTypes';
import {
	computeEnemyConfig,
	enemiesPerWave,
	availableEnemyTypes,
	spawnIntervalForWave,
	enemyCountMultiplier,
	expectedEnemiesPerWave,
	MAX_ENEMIES_PER_WAVE_SAFETY
} from './balanceMath';

export const MAX_ENEMIES_PER_WAVE = MAX_ENEMIES_PER_WAVE_SAFETY;

/** Apply the Front enemy-count multiplier to a base count, floored + capped. */
export function scaleCountForFront(baseCount: number, front: number): number {
	const scaled = Math.floor(baseCount * enemyCountMultiplier(front));
	return Math.min(MAX_ENEMIES_PER_WAVE_SAFETY, Math.max(1, scaled));
}

let nextEnemyId = 1;

export function resetEnemyIdCounter(): void {
	nextEnemyId = 1;
}

/**
 * Get the total number of enemies for a wave on a given Front.
 * Boss waves return normal expected spawns + 1 Boss.
 * `front` defaults to 1.
 */
export function getEnemyCountForWave(wave: number, front: number = 1): number {
	const isBossWave = wave % 10 === 0;
	const normalSpawns = expectedEnemiesPerWave(wave, front);
	return Math.min(MAX_ENEMIES_PER_WAVE_SAFETY, normalSpawns + (isBossWave ? 1 : 0));
}

/** Boss-wave enemy count for a given wave/Front — used by BossRush challenge. */
export function getBossWaveEnemyCount(wave: number, front: number = 1): number {
	return getEnemyCountForWave(wave, front);
}

/**
 * Get the spawn interval in seconds for a given wave.
 */
export function getSpawnIntervalForWave(wave: number): number {
	return spawnIntervalForWave(wave);
}

/**
 * Pick enemy types available for random spawn in a wave.
 * On boss waves, returns only Boss type.
 */
export function getEnemyTypeForWave(wave: number, front: number = 1): EnemyType[] {
	if (wave % 10 === 0) {
		return [EnemyType.Boss];
	}
	return availableEnemyTypes(wave, front);
}

// ─── Enemy creation ─────────────────────────────────────────────────────────

/**
 * Create an Enemy object from type and wave.
 * Uses computeEnemyConfig from balanceMath for all stats.
 */
export function createEnemy(type: EnemyType, wave: number, spawnX: number, spawnY: number, tier: number = 1, isShiny: boolean = false): Enemy {
	const config = computeEnemyConfig(type, wave, tier, isShiny);
	const id = nextEnemyId++;
	return {
		id,
		type,
		config: {
			type,
			hp: config.hp,
			maxHp: config.maxHp,
			speed: config.speed,
			reward: config.cashReward,
			damage: config.damage,
			armor: config.armor,
			attackRange: config.attackRange,
			attackCooldown: config.attackCooldown,
			size: config.size,
			color: config.color,
			shape: config.shape,
			isShiny,
		},
		position: { x: spawnX, y: spawnY },
		hp: config.hp,
		maxHp: config.maxHp,
		speed: config.speed,
		reward: config.cashReward,
		coinReward: config.coinReward,
		damage: config.damage,
		armor: config.armor,
		attackRange: config.attackRange,
		attackCooldown: config.attackCooldown,
		attackTimer: 0,
		size: config.size,
		color: config.color,
		shape: config.shape,
		angle: 0,
		alive: true,
		hitFlashTimer: 0,
		spawnProgress: 1,
		stopped: false,
		isBoss: type === EnemyType.Boss,
		isShiny,
		wave,
		resistances: config.resistances,
	};
}
