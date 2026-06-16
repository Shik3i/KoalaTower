import { EnemyType } from '../engine/gameTypes';
import { ENEMY_BASE_STATS, GAME_CONFIG, WAVE_CONFIG } from '../engine/gameConfig';
import type { Enemy, EnemyConfig } from '../engine/gameTypes';

let nextEnemyId = 1;

export function resetEnemyIdCounter(): void {
	nextEnemyId = 1;
}

export function getEnemyConfig(type: EnemyType, wave: number): EnemyConfig {
	const base = ENEMY_BASE_STATS[type];
	const scaleFactor = Math.pow(WAVE_CONFIG.HP_SCALE, wave - 1);
	const speedScale = Math.pow(WAVE_CONFIG.SPEED_SCALE, wave - 1);
	const rewardScale = Math.pow(WAVE_CONFIG.REWARD_SCALE, wave - 1);

	const hpMultiplier = type === EnemyType.Boss ? 1 : 1;

	const colors: Record<EnemyType, number> = {
		[EnemyType.Normal]: GAME_CONFIG.NEON_CYAN,
		[EnemyType.Fast]: GAME_CONFIG.NEON_GREEN,
		[EnemyType.Tank]: GAME_CONFIG.NEON_VIOLET,
		[EnemyType.Ranged]: GAME_CONFIG.NEON_ORANGE,
		[EnemyType.Boss]: GAME_CONFIG.NEON_PINK,
	};

	const shapes: Record<EnemyType, EnemyConfig['shape']> = {
		[EnemyType.Normal]: 'square',
		[EnemyType.Fast]: 'triangle',
		[EnemyType.Tank]: 'hexagon',
		[EnemyType.Ranged]: 'diamond',
		[EnemyType.Boss]: 'pentagon',
	};

	return {
		type,
		hp: Math.floor(base.hp * scaleFactor * hpMultiplier),
		maxHp: Math.floor(base.hp * scaleFactor * hpMultiplier),
		speed: base.speed * speedScale,
		reward: Math.floor(base.reward * rewardScale),
		damage: Math.floor(base.damage * (1 + (wave - 1) * 0.05)),
		attackRange: base.attackRange,
		attackCooldown: base.attackCooldown,
		size: base.size,
		color: colors[type],
		shape: shapes[type],
	};
}

export function createEnemy(type: EnemyType, wave: number, spawnX: number, spawnY: number): Enemy {
	const config = getEnemyConfig(type, wave);
	const id = nextEnemyId++;
	return {
		id,
		type,
		config,
		position: { x: spawnX, y: spawnY },
		hp: config.hp,
		maxHp: config.maxHp,
		speed: config.speed,
		reward: config.reward,
		damage: config.damage,
		attackRange: config.attackRange,
		attackCooldown: config.attackCooldown,
		attackTimer: 0,
		size: config.size,
		color: config.color,
		shape: config.shape,
		angle: 0,
		alive: true,
		hitFlashTimer: 0,
		spawnProgress: 0,
		stopped: false,
		isBoss: type === EnemyType.Boss,
		wave,
	};
}

export function getEnemyTypeForWave(wave: number): EnemyType[] {
	const types: EnemyType[] = [EnemyType.Normal];

	if (wave >= 3) types.push(EnemyType.Fast);
	if (wave >= 5) types.push(EnemyType.Tank);
	if (wave >= 8) types.push(EnemyType.Ranged);

	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) {
		return [EnemyType.Boss];
	}

	return types;
}

export function getEnemyCountForWave(wave: number): number {
	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) return 1;
	return WAVE_CONFIG.BASE_ENEMIES + (wave - 1) * WAVE_CONFIG.ENEMIES_PER_WAVE;
}

export function getSpawnIntervalForWave(wave: number): number {
	return Math.max(
		WAVE_CONFIG.SPAWN_INTERVAL_MIN,
		WAVE_CONFIG.SPAWN_INTERVAL_BASE * Math.pow(WAVE_CONFIG.SPAWN_INTERVAL_DECAY, wave - 1)
	);
}
