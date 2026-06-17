/**
 * enemies.ts — Enemy creation and wave-composition logic.
 *
 * Uses balanceMath for all stat formulas. This file handles:
 * - Converting balance data into in-game Enemy objects
 * - Wave composition (which types, how many, spawn timing)
 * - Boss escort spawning logic
 */

import { EnemyType, type Enemy, type EnemyConfig } from '../engine/gameTypes';
import {
	computeEnemyConfig,
	enemiesPerWave,
	bossEscortCount,
	availableEnemyTypes,
	spawnIntervalForWave,
} from './balanceMath';

let nextEnemyId = 1;

export function resetEnemyIdCounter(): void {
	nextEnemyId = 1;
}

/**
 * Get the total number of enemies for a wave.
 * Boss waves return escort count + 1 (the boss itself).
 */
export function getEnemyCountForWave(wave: number): number {
	if (wave % 10 === 0) {
		return bossEscortCount(wave) + 1;
	}
	return enemiesPerWave(wave);
}

/**
 * Get the spawn interval in seconds for a given wave.
 */
export function getSpawnIntervalForWave(wave: number): number {
	return spawnIntervalForWave(wave);
}

/**
 * Pick enemy types available for random spawn in a wave.
 * On boss waves, returns only Boss type (escorts handled separately).
 */
export function getEnemyTypeForWave(wave: number): EnemyType[] {
	if (wave % 10 === 0) {
		return [EnemyType.Boss];
	}
	return availableEnemyTypes(wave);
}

/**
 * Pick an escort type for the pre-boss phase of a boss wave.
 */
export function getEscortTypeForWave(wave: number): EnemyType {
	const types = availableEnemyTypes(wave);
	return types[Math.floor(Math.random() * types.length)]!;
}

// ─── Boss escort counter ────────────────────────────────────────────────────

let _bossEscortRemaining = 0;

export function resetBossEscortCounter(): void {
	_bossEscortRemaining = 0;
}

export function getBossEscortCount(wave: number): number {
	return bossEscortCount(wave);
}

export function setupBossEscorts(wave: number): void {
	_bossEscortRemaining = bossEscortCount(wave);
}

export function hasBossEscortsRemaining(): boolean {
	return _bossEscortRemaining > 0;
}

export function consumeBossEscort(): boolean {
	if (_bossEscortRemaining > 0) {
		_bossEscortRemaining--;
		return true;
	}
	return false;
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
	};
}
