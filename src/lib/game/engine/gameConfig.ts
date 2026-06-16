import type { GameSettings, TowerStats } from './gameTypes';

export const GAME_CONFIG = {
	VIEW_WIDTH: 800,
	VIEW_HEIGHT: 800,
	TOWER_SIZE: 32,
	ENEMY_SPAWN_MARGIN: 60,
	PROJECTILE_SPEED: 600,
	DAMAGE_NUMBER_LIFETIME: 1.2,
	PARTICLE_LIFETIME: 0.8,
	MAX_PARTICLES: 100,
	MAX_DAMAGE_NUMBERS: 30,
	AUTOSAVE_INTERVAL: 10000,
	UI_SNAPSHOT_INTERVAL: 150,
	CLAMP_DELTA: 0.05,
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
	return { damage: 10, fireRate: 1.0, range: 300, multishot: 1, critChance: 0.05, critMultiplier: 2.0 };
}

export const TOWER_HP_BASE = 100;

export const ENEMY_BASE_STATS = {
	normal: { hp: 20, speed: 60, reward: 5, damage: 5, attackRange: 30, attackCooldown: 1.5, size: 16 },
	fast: { hp: 10, speed: 120, reward: 3, damage: 3, attackRange: 25, attackCooldown: 1.0, size: 12 },
	tank: { hp: 80, speed: 35, reward: 12, damage: 8, attackRange: 30, attackCooldown: 2.0, size: 24 },
	ranged: { hp: 15, speed: 50, reward: 8, damage: 6, attackRange: 200, attackCooldown: 2.5, size: 14 },
	boss: { hp: 500, speed: 30, reward: 100, damage: 20, attackRange: 40, attackCooldown: 1.0, size: 36 },
} as const;

export const WAVE_CONFIG = {
	BASE_ENEMIES: 5,
	ENEMIES_PER_WAVE: 2,
	SPAWN_INTERVAL_BASE: 1.2,
	SPAWN_INTERVAL_MIN: 0.15,
	SPAWN_INTERVAL_DECAY: 0.995,
	BETWEEN_WAVE_TIME: 3.0,
	BOSS_INTERVAL: 10,
	BONUS_CASH_PER_WAVE: 10,
};

/** Compute enemy stat multiplier for a given wave (supports 10k+). */
export function getWaveHpMultiplier(wave: number): number {
	return 1 + wave * 0.04 + wave * wave * 0.00005;
}
export function getWaveDamageMultiplier(wave: number): number {
	return 1 + wave * 0.025;
}
export function getWaveSpeedMultiplier(wave: number): number {
	return 1 + Math.log10(wave + 1) * 0.15;
}
export function getWaveRewardMultiplier(wave: number): number {
	return 1 + wave * 0.03 + wave * wave * 0.00002;
}
/** Enemy armour reduces incoming damage — diminishing returns, approaches 0.85 asymptotically. */
export function getWaveArmor(wave: number): number {
	return 1 - 1 / (1 + wave * 0.003);
}

export function getDefaultSettings(): GameSettings {
	return { reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false };
}
