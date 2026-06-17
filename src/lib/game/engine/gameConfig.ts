/**
 * gameConfig.ts — Static configuration values for rendering, timing, and visual tuning.
 *
 * All balance-related formulas (enemy stats, costs, effects, wave scaling)
 * now live in src/lib/game/balance/balanceMath.ts.
 *
 * This file only contains rendering/UI/timing constants and defaults.
 */

import type { GameSettings, TowerStats } from './gameTypes';

export const GAME_CONFIG = {
	VIEW_WIDTH: 800,
	VIEW_HEIGHT: 800,
	TOWER_SIZE: 22,
	ENEMY_SPAWN_MARGIN: 0,
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

/**
 * Default tower stats for a fresh run (before workshop/battle upgrades).
 * Workshop upgrades increase these baseline values.
 */
export function getDefaultTowerStats(): TowerStats {
	return {
		damage: 8,
		fireRate: 1.0,
		range: 180,
		multishotChance: 0,
		multishotCount: 1,
		critChance: 0.05,
		critMultiplier: 2.0,
		defensePercent: 0,
		defenseAbsolute: 0,
		regen: 0,
		lifesteal: 0,
		thorns: 0,
	};
}

/** Base HP for the tower before any upgrades. */
export const TOWER_HP_BASE = 80;

/** Cash the player starts with on a fresh run (before Starting Cash workshop). */
export const STARTING_CASH_BASE = 20;

/** Bonus cash awarded per wave cleared. */
export const CASH_PER_WAVE_BASE = 5;

/** How many sub-waves to split each wave into for pacing. */
export const SUB_WAVES = 4;

/** Pause between sub-waves in seconds. */
export const SUB_WAVE_PAUSE = 2.5;

/** Delay before the first wave starts. */
export const INITIAL_WAVE_DELAY = 1.0;

/** Time between wave completions and next wave start. */
export const BETWEEN_WAVE_TIME = 1.5;

/** Interval in waves for boss spawns. */
export const BOSS_INTERVAL = 10;

// Legacy exports kept for backward compat — delegate to balanceMath.
import { waveHpMultiplier, waveAttackMultiplier, waveSpeedMultiplier, waveCashRewardMultiplier, waveArmorBonus } from '../balance/balanceMath';
export {
	waveHpMultiplier as getWaveHpMultiplier,
	waveAttackMultiplier as getWaveDamageMultiplier,
	waveSpeedMultiplier as getWaveSpeedMultiplier,
	waveCashRewardMultiplier as getWaveRewardMultiplier,
};

/**
 * Enemy armor including wave scaling — kept here for backward compat.
 */
export function getWaveArmor(wave: number): number {
	if (wave <= 10) return 0;
	const raw = 1 - 1 / (1 + (wave - 10) * 0.0015);
	return Math.min(raw, 0.70);
}

export function getDefaultSettings(): GameSettings {
	return { reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false };
}
