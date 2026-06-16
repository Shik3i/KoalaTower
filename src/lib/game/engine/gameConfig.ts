import type { GameSettings, TowerStats } from './gameTypes';

export const GAME_CONFIG = {
	VIEW_WIDTH: 800,
	VIEW_HEIGHT: 800,
	TOWER_SIZE: 26,
	ENEMY_SPAWN_MARGIN: 60,
	PROJECTILE_SPEED: 900,
	DAMAGE_NUMBER_LIFETIME: 1.2,
	PARTICLE_LIFETIME: 0.8,
	MAX_PARTICLES: 100,
	MAX_DAMAGE_NUMBERS: 30,
	AUTOSAVE_INTERVAL: 10000,
	UI_SNAPSHOT_INTERVAL: 150,
	CLAMP_DELTA: 0.10,
	BACKGROUND_STARS: 80,
	BACKGROUND_GRID_SIZE: 60,
	CANVAS_BG: 0x070812,
	NEON_CYAN: 0x00FFFF,
	NEON_BLUE: 0x4488FF,
	NEON_VIOLET: 0x8844FF,
	NEON_PINK: 0xFF44AA,
	NEON_GREEN: 0x44FF88,
	NEON_ORANGE: 0xFF8844,
	NEON_RED: 0xFF4444,
	NEON_YELLOW: 0xFFDD44,
	BEAM_COLOR: 0x00FFFF,
	GLOW_ALPHA: 0.3,
	PROJECTILE_TRAIL_LENGTH: 6,
	MIN_SCREEN_SHAKE: 0.5,
	MAX_SCREEN_SHAKE: 8,
	SHAKE_DECAY: 0.85,
	SPEED_PRESETS: [1, 2, 3, 5] as const,
};

export function getDefaultTowerStats(): TowerStats {
	return { damage: 6, fireRate: 0.7, range: 280, multishotChance: 0, multishotCount: 1, critChance: 0.03, critMultiplier: 2.0 };
}

export const TOWER_HP_BASE = 100;

export const ENEMY_BASE_STATS = {
	normal: { hp: 55, speed: 70, reward: 3, damage: 5, attackRange: 30, attackCooldown: 1.5, size: 16 },
	fast:   { hp: 22, speed: 130, reward: 2, damage: 3, attackRange: 25, attackCooldown: 1.0, size: 12 },
	tank:   { hp: 180, speed: 35, reward: 8, damage: 8, attackRange: 30, attackCooldown: 2.0, size: 24 },
	ranged: { hp: 35, speed: 55, reward: 5, damage: 6, attackRange: 200, attackCooldown: 2.5, size: 14 },
	boss:   { hp: 800, speed: 25, reward: 60, damage: 22, attackRange: 40, attackCooldown: 1.2, size: 40 },
} as const;

export const WAVE_CONFIG = {
	BASE_ENEMIES: 3,
	ENEMIES_PER_WAVE: 1.0,
	BOSS_ESCORT_COUNT: 4,
	SPAWN_INTERVAL_BASE: 1.5,
	SPAWN_INTERVAL_MIN: 0.25,
	SPAWN_INTERVAL_DECAY: 0.997,
	BETWEEN_WAVE_TIME: 3.0,
	BOSS_INTERVAL: 10,
	BONUS_CASH_PER_WAVE: 8,
};

/** Enemy HP multiplier — very slow ramp for endless play (500+ waves).
 *  Early waves are gentle so the player can build up.
 */
export function getWaveHpMultiplier(wave: number): number {
	if (wave <= 5)   return 1.00 + wave * 0.02;
	if (wave <= 20)  return 1.10 + (wave - 5) * 0.015;
	if (wave <= 50)  return 1.325 + (wave - 20) * 0.01;
	if (wave <= 100) return 1.625 + (wave - 50) * 0.008;
	if (wave <= 250) return 2.025 + (wave - 100) * 0.005;
	if (wave <= 500) return 2.775 + (wave - 250) * 0.003;
	return 3.525 + (wave - 500) * 0.002;
}

/** Enemy damage multiplier */
export function getWaveDamageMultiplier(wave: number): number {
	if (wave <= 10)  return 1.0 + wave * 0.01;
	if (wave <= 50)  return 1.1 + (wave - 10) * 0.008;
	if (wave <= 150) return 1.42 + (wave - 50) * 0.005;
	return 1.92 + (wave - 150) * 0.003;
}

/** Enemy speed multiplier */
export function getWaveSpeedMultiplier(wave: number): number {
	return 1 + Math.log10(wave + 1) * 0.08;
}

/** Gold reward multiplier — slow growth */
export function getWaveRewardMultiplier(wave: number): number {
	if (wave <= 10)  return 1.0 + wave * 0.04;
	if (wave <= 50)  return 1.4 + (wave - 10) * 0.02;
	if (wave <= 150) return 2.2 + (wave - 50) * 0.01;
	return 3.2 + (wave - 150) * 0.005;
}

/** Enemy armour — appears after wave 10, caps at 70% */
export function getWaveArmor(wave: number): number {
	if (wave <= 10) return 0;
	const raw = 1 - 1 / (1 + (wave - 10) * 0.0015);
	return Math.min(raw, 0.70);
}

export function getDefaultSettings(): GameSettings {
	return { reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false };
}
