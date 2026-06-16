import { EnemyType } from '../engine/gameTypes';
import { ENEMY_BASE_STATS, GAME_CONFIG, WAVE_CONFIG, getWaveHpMultiplier, getWaveDamageMultiplier, getWaveSpeedMultiplier, getWaveRewardMultiplier, getWaveArmor } from '../engine/gameConfig';
import type { Enemy, EnemyConfig } from '../engine/gameTypes';

let nextEnemyId = 1;

export function resetEnemyIdCounter(): void {
	nextEnemyId = 1;
}

export function getEnemyConfig(type: EnemyType, wave: number): EnemyConfig {
	const base = ENEMY_BASE_STATS[type];
	const hpMul = getWaveHpMultiplier(wave);
	const dmgMul = getWaveDamageMultiplier(wave);
	const spdMul = getWaveSpeedMultiplier(wave);
	const rewMul = getWaveRewardMultiplier(wave);
	const armor = getWaveArmor(wave);

	const bossHpBonus = type === EnemyType.Boss ? 5 : 1;

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
		hp: Math.floor(base.hp * hpMul * bossHpBonus),
		maxHp: Math.floor(base.hp * hpMul * bossHpBonus),
		speed: base.speed * spdMul,
		reward: Math.floor(base.reward * rewMul),
		damage: Math.floor(base.damage * dmgMul),
		armor,
		attackRange: base.attackRange,
		attackCooldown: base.attackCooldown,
		size: type === EnemyType.Boss ? Math.min(60, base.size + Math.floor(wave * 0.02)) : base.size,
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
		spawnProgress: 0,
		stopped: false,
		isBoss: type === EnemyType.Boss,
		wave,
	};
}

export function getEnemyTypeForWave(wave: number): EnemyType[] {
	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) return [EnemyType.Boss];

	const types: EnemyType[] = [EnemyType.Normal];
	if (wave >= 3) types.push(EnemyType.Fast);
	if (wave >= 5) types.push(EnemyType.Tank);
	if (wave >= 8) types.push(EnemyType.Ranged);

	// Later waves get heavier compositions
	// After wave 50, sometimes spawn multiple types per wave (handled by spawner via weighted random)
	return types;
}

export function getEnemyCountForWave(wave: number): number {
	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) return 1;
	// Gradually increase enemy count, cap at reasonable max
	const base = WAVE_CONFIG.BASE_ENEMIES + Math.floor(wave * WAVE_CONFIG.ENEMIES_PER_WAVE * 0.5);
	return Math.min(base, 200);
}

export function getSpawnIntervalForWave(wave: number): number {
	return Math.max(
		WAVE_CONFIG.SPAWN_INTERVAL_MIN,
		WAVE_CONFIG.SPAWN_INTERVAL_BASE * Math.pow(WAVE_CONFIG.SPAWN_INTERVAL_DECAY, wave - 1)
	);
}
