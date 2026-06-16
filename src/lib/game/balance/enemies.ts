import { EnemyType } from '../engine/gameTypes';
import { ENEMY_BASE_STATS, GAME_CONFIG, WAVE_CONFIG, getWaveHpMultiplier, getWaveDamageMultiplier, getWaveSpeedMultiplier, getWaveRewardMultiplier, getWaveArmor } from '../engine/gameConfig';
import type { Enemy, EnemyConfig, GameState } from '../engine/gameTypes';

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
		[EnemyType.Fast]: 'diamond',
		[EnemyType.Tank]: 'hexagon',
		[EnemyType.Ranged]: 'triangle',
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

/** Track the boss-wave escort spawn separately from the boss itself. */
let _bossEscortRemaining = 0;

export function resetBossEscortCounter(): void {
	_bossEscortRemaining = 0;
}

/** Returns the current wave's enemy composition via weighted random.
 *  Boss waves return [EnemyType.Boss] for the boss, but escort enemies
 *  are spawned separately before the boss via getBossEscortCount().
 */
export function getEnemyTypeForWave(wave: number): EnemyType[] {
	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) {
		// On boss wave, return only boss type (escorts handled separately)
		return [EnemyType.Boss];
	}

	const types: EnemyType[] = [EnemyType.Normal];
	if (wave >= 3) types.push(EnemyType.Fast);
	if (wave >= 5) types.push(EnemyType.Tank);
	if (wave >= 8) types.push(EnemyType.Ranged);
	if (wave >= 15) { types.push(EnemyType.Normal); types.push(EnemyType.Fast); } // more density
	if (wave >= 25) types.push(EnemyType.Tank);
	return types;
}

/** How many escort enemies appear before a boss on boss waves. */
export function getBossEscortCount(wave: number): number {
	return Math.min(3 + Math.floor(wave / 15), WAVE_CONFIG.BOSS_ESCORT_COUNT);
}

/** Whether we still need to spawn boss escorts. */
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

export function getEnemyCountForWave(wave: number): number {
	if (wave % WAVE_CONFIG.BOSS_INTERVAL === 0) {
		const escorts = getBossEscortCount(wave);
		_bossEscortRemaining = escorts;
		// Total enemies: escorts + 1 boss
		return escorts + 1;
	}
	// Gradually increase enemy count, cap at reasonable max
	const base = WAVE_CONFIG.BASE_ENEMIES + Math.floor(wave * WAVE_CONFIG.ENEMIES_PER_WAVE * 0.5);
	return Math.min(base, 200);
}

/** Pick a random enemy type for escorts based on wave. */
export function getEscortTypeForWave(wave: number): EnemyType {
	const escortTypes: EnemyType[] = [EnemyType.Normal];
	if (wave >= 3) escortTypes.push(EnemyType.Fast);
	if (wave >= 5) escortTypes.push(EnemyType.Tank);
	if (wave >= 10) escortTypes.push(EnemyType.Ranged);
	return escortTypes[Math.floor(Math.random() * escortTypes.length)]!;
}

export function getSpawnIntervalForWave(wave: number): number {
	return Math.max(
		WAVE_CONFIG.SPAWN_INTERVAL_MIN,
		WAVE_CONFIG.SPAWN_INTERVAL_BASE * Math.pow(WAVE_CONFIG.SPAWN_INTERVAL_DECAY, wave - 1)
	);
}
