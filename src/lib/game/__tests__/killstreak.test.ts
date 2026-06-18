import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { processEnemyDeath, getKillstreakTier } from '../systems/enemySystem';
import { damageTower } from '../systems/towerSystem';
import { GAME_CONFIG } from '../engine/gameConfig';
import { EnemyType, type Enemy } from '../engine/gameTypes';

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
	return {
		id: 1, type: EnemyType.Normal, config: {} as Enemy['config'],
		position: { x: 100, y: 100 }, hp: 0, maxHp: 100, speed: 50, reward: 10,
		coinReward: 0, damage: 5, armor: 0, attackRange: 0, attackCooldown: 1,
		attackTimer: 0, size: 20, color: 0x00ffff, shape: 'square', angle: 0,
		alive: false, hitFlashTimer: 0, spawnProgress: 1, stopped: false,
		isBoss: false, isShiny: false, wave: 1,
		...overrides,
	};
}

/**
 * Fast-forward engine.update() past GAME_CONFIG.CLAMP_DELTA (0.10s).
 * The engine clamps each dt to CLAMP_DELTA, so a single update(seconds)
 * call can't skip the killstreak timer / death-effect lifetime ahead —
 * we have to drive many small steps instead.
 */
function fastForward(engine: GameEngine, seconds: number): void {
	const step = GAME_CONFIG.CLAMP_DELTA;
	let remaining = seconds;
	while (remaining > 0) {
		const dt = Math.min(step, remaining);
		engine.update(dt);
		remaining -= dt;
	}
}

describe('getKillstreakTier — cosmetic tier resolver', () => {
	it('returns -1 below the first tier (no chip yet)', () => {
		expect(getKillstreakTier(0)).toBe(-1);
		expect(getKillstreakTier(1)).toBe(-1);
		expect(getKillstreakTier(4)).toBe(-1);
	});

	it('escalates monotonically across the configured tiers', () => {
		expect(getKillstreakTier(5)).toBe(0);
		expect(getKillstreakTier(9)).toBe(0);
		expect(getKillstreakTier(10)).toBe(1);
		expect(getKillstreakTier(24)).toBe(1);
		expect(getKillstreakTier(25)).toBe(2);
		expect(getKillstreakTier(49)).toBe(2);
		expect(getKillstreakTier(50)).toBe(3);
		expect(getKillstreakTier(99)).toBe(3);
		expect(getKillstreakTier(100)).toBe(4);
		expect(getKillstreakTier(499)).toBe(4);
		expect(getKillstreakTier(500)).toBe(5);
		expect(getKillstreakTier(999)).toBe(5);
		expect(getKillstreakTier(1000)).toBe(6);
		expect(getKillstreakTier(4999)).toBe(6);
		expect(getKillstreakTier(5000)).toBe(7);
		expect(getKillstreakTier(9999)).toBe(7);
		expect(getKillstreakTier(10000)).toBe(8);
		expect(getKillstreakTier(50000)).toBe(8);
	});

	it('mirrors the published KILLSTREAK_TIERS so chip & HUD agree', () => {
		const tiers = GAME_CONFIG.KILLSTREAK_TIERS;
		expect(tiers).toEqual([5, 10, 25, 50, 100, 500, 1000, 5000, 10000]);
	});
});

describe('processEnemyDeath — killstreak increments (cosmetic-only)', () => {
	function freshEngine(): GameEngine {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		// wireMuzzleFlash installs the feedback hooks so the milestone callback
		// can actually fire. Pass a no-op muzzle flash.
		engine.wireMuzzleFlash(() => {});
		return engine;
	}

	it('increments the cosmetic counter on each kill', () => {
		const engine = freshEngine();
		expect(engine.state.killstreak.count).toBe(0);
		processEnemyDeath(engine.state, makeEnemy({ id: 1 }));
		expect(engine.state.killstreak.count).toBe(1);
		processEnemyDeath(engine.state, makeEnemy({ id: 2 }));
		expect(engine.state.killstreak.count).toBe(2);
	});

	it('refreshes the timeout window on each kill', () => {
		const engine = freshEngine();
		processEnemyDeath(engine.state, makeEnemy({ id: 1 }));
		expect(engine.state.killstreak.timer).toBeCloseTo(GAME_CONFIG.KILLSTREAK_WINDOW, 5);
		// Drain most of the window.
		engine.state.killstreak.timer = 0.1;
		// Another kill should refresh back to full window.
		processEnemyDeath(engine.state, makeEnemy({ id: 2 }));
		expect(engine.state.killstreak.timer).toBeCloseTo(GAME_CONFIG.KILLSTREAK_WINDOW, 5);
	});

	it('tracks the cosmetic best-count across the run', () => {
		const engine = freshEngine();
		for (let i = 1; i <= 7; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.state.killstreak.best).toBe(7);
	});

	it('does NOT mutate cash / coins / damage / HP when only the killstreak counter advances', () => {
		const engine = freshEngine();
		const beforeCash = engine.state.cash;
		const beforeCoins = engine.state.coins;
		const beforeDamage = engine.state.tower.stats.damage;
		const beforeHp = engine.state.tower.hp;
		const beforeCrit = engine.state.tower.stats.critChance;

		// Drive 50 kills — well past tier 3 — with no milestone handler attached.
		// Energy DOES legitimately accrue from kills (existing behaviour), so we
		// only assert the cosmetic-sensitive fields are untouched: tower stats,
		// alloy, and crit chance.
		for (let i = 1; i <= 50; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));

		expect(engine.state.coins).toBe(beforeCoins);
		expect(engine.state.tower.stats.damage).toBe(beforeDamage);
		expect(engine.state.tower.hp).toBe(beforeHp);
		expect(engine.state.tower.stats.critChance).toBe(beforeCrit);
		// Energy DOES grow — that's pre-existing economy behaviour, not killstreak.
		expect(engine.state.cash).toBeGreaterThanOrEqual(beforeCash);
	});

	it('fires the milestone handler exactly once per tier cross (no economy grant)', () => {
		const engine = freshEngine();
		const fired: number[] = [];
		engine.setKillstreakMilestoneHandler((c) => {
			fired.push(c);
			// Production handler pushes a "Chain xN" floating text — that's it.
			engine.addDamageNumber(0, 0, `Chain x${c}`, 0xffffff, 'chain');
		});

		const beforeCoins = engine.state.coins;
		for (let i = 1; i <= 100; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));

		// Should have fired exactly once per tier, in order, no duplicates.
		// `fired` is the authoritative signal — the floating-text buffer is
		// capped by MAX_DAMAGE_NUMBERS and will evict earlier chain popups.
		expect(fired).toEqual([5, 10, 25, 50, 100]);
		// Test enemies have coinReward=0 and aren't boss/shiny → coins must not move.
		// This is the cosmetic-only contract: the chain itself grants no Alloy.
		expect(engine.state.coins).toBe(beforeCoins);
		// At least the latest chain popup is present in the floating-text buffer.
		expect(engine.damageNumbers.some((n) => n.kind === 'chain')).toBe(true);
	});

	it('resets the chain to 0 when update() lets the timer expire during an active wave with live enemies', () => {
		const engine = freshEngine();
		// Force wave 1 to be active so the killstreak timeout actually ticks.
		// Set high spawn counts/interval so subWaveActive stays true during the test window.
		engine.state.wave.currentWave = 1;
		engine.state.wave.waveActive = true;
		engine.state.wave.subWaveActive = true;
		engine.state.wave.enemiesInWave = 99999;
		engine.state.wave.enemiesInSubWave = 99999;
		engine.state.wave.spawnInterval = 999;
		// Timeout only ticks while there are live enemies on the field —
		// park a healthy dummy enemy so the chain can actually bleed out.
		engine.state.enemies.push(makeEnemy({ id: 999, hp: 1_000_000, maxHp: 1_000_000, alive: true }));
		for (let i = 1; i <= 8; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.state.killstreak.count).toBe(8);
		// Drain the window (4.0s) plus margin. Update dt is clamped to CLAMP_DELTA,
		// so fastForward drives it in small steps.
		fastForward(engine, GAME_CONFIG.KILLSTREAK_WINDOW + 0.05);
		expect(engine.state.killstreak.count).toBe(0);
		expect(engine.state.killstreak.timer).toBe(0);
	});

	it('does NOT reset killstreak during inter-wave downtime', () => {
		const engine = freshEngine();
		for (let i = 1; i <= 8; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.state.killstreak.count).toBe(8);
		// Fast-forward through the full between-wave period (1.5s).
		// The killstreak timeout must NOT tick while no wave is active.
		fastForward(engine, 1.6);
		// Chain must survive the wave transition.
		expect(engine.state.killstreak.count).toBe(8);
		expect(engine.state.killstreak.timer).toBeGreaterThan(0);
	});

	it('does NOT reset killstreak while the field is empty mid-wave (spawn lull)', () => {
		const engine = freshEngine();
		// Active wave + sub-wave, but no live enemies on the field — the chain
		// must survive a slow spawn gap or post-clear lull without bleeding out.
		engine.state.wave.currentWave = 1;
		engine.state.wave.waveActive = true;
		engine.state.wave.subWaveActive = true;
		engine.state.wave.enemiesInWave = 99999;
		engine.state.wave.enemiesInSubWave = 99999;
		engine.state.wave.spawnInterval = 999;
		for (let i = 1; i <= 6; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.state.killstreak.count).toBe(6);
		fastForward(engine, GAME_CONFIG.KILLSTREAK_WINDOW + 1);
		expect(engine.state.killstreak.count).toBe(6);
		expect(engine.state.killstreak.timer).toBeCloseTo(GAME_CONFIG.KILLSTREAK_WINDOW, 5);
	});

	it('keeps best-count intact after the chain times out (vanity metric persists)', () => {
		const engine = freshEngine();
		// Force wave active so timeout ticks during fast-forward.
		engine.state.wave.currentWave = 1;
		engine.state.wave.waveActive = true;
		engine.state.wave.subWaveActive = true;
		engine.state.wave.enemiesInWave = 99999;
		engine.state.wave.enemiesInSubWave = 99999;
		engine.state.wave.spawnInterval = 999;
		// Timeout only ticks with a live enemy on the field.
		engine.state.enemies.push(makeEnemy({ id: 999, hp: 1_000_000, maxHp: 1_000_000, alive: true }));
		for (let i = 1; i <= 12; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		fastForward(engine, GAME_CONFIG.KILLSTREAK_WINDOW + 0.05);
		expect(engine.state.killstreak.count).toBe(0);
		expect(engine.state.killstreak.best).toBe(12);
	});
});

describe('GameEngine — killstreak reset on tower damage', () => {
	it('clears the chain when the tower takes a damaging hit', () => {
		// damageTower() is the production path; it resets state.killstreak when dmg > 0.
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.state.killstreak.count = 15;
		engine.state.killstreak.timer = GAME_CONFIG.KILLSTREAK_WINDOW;
		engine.state.killstreak.lastMilestone = 10;
		// Route through the real damage path so the reset logic actually executes.
		const tower = engine.state.tower;
		const beforeHp = tower.hp;
		damageTower(engine.state, 5, false);
		expect(tower.hp).toBe(beforeHp - 5); // sanity: damage applied
		expect(engine.state.killstreak.count).toBe(0);
		expect(engine.state.killstreak.timer).toBe(0);
		expect(engine.state.killstreak.lastMilestone).toBe(0);
	});
});

describe('GameEngine — killstreak fresh per run', () => {
	it('startRun resets count / best / timer / lastMilestone', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.wireMuzzleFlash(() => {});
		for (let i = 1; i <= 20; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.state.killstreak.best).toBeGreaterThan(0);

		// Start a brand new run — chain must reset, even on the same engine instance.
		engine.startRun({}, {}, {}, 0, [], 1);
		expect(engine.state.killstreak.count).toBe(0);
		expect(engine.state.killstreak.best).toBe(0);
		expect(engine.state.killstreak.timer).toBe(0);
		expect(engine.state.killstreak.lastMilestone).toBe(0);
	});
});

describe('GameEngine death-effect buffer (separate from wave completion)', () => {
	it('lives in engine.deathEffects, never in state.enemies', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.wireMuzzleFlash(() => {});
		processEnemyDeath(engine.state, makeEnemy({ id: 1 }));
		expect(engine.deathEffects.length).toBe(1);
		expect(engine.state.enemies.length).toBe(0);
	});

	it('caps the proxy count at MAX_DEATH_FX so AoE bursts cannot flood the layer', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.wireMuzzleFlash(() => {});
		for (let i = 0; i < GAME_CONFIG.MAX_DEATH_FX + 30; i++) {
			processEnemyDeath(engine.state, makeEnemy({ id: i + 1 }));
		}
		expect(engine.deathEffects.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_DEATH_FX);
	});

	it('ticks each proxy out within its lifetime', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.wireMuzzleFlash(() => {});
		processEnemyDeath(engine.state, makeEnemy({ id: 1 }));
		expect(engine.deathEffects.length).toBe(1);
		// Default lifetime is 0.2s (DEATH_FX_LIFETIME). Past that → removed.
		// update() clamps dt, so drive in small steps via fastForward.
		fastForward(engine, 0.25);
		expect(engine.deathEffects.length).toBe(0);
	});

	it('respects damageNumbers=false: chain milestones emit no floating text', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, {}, 0, [], 1);
		engine.wireMuzzleFlash(() => {});
		engine.state.settings.damageNumbers = false;
		engine.setKillstreakMilestoneHandler((c) => {
			engine.addDamageNumber(0, 0, `Chain x${c}`, 0xffffff, 'chain');
		});
		// Trigger a milestone directly via the same kill path.
		for (let i = 1; i <= 5; i++) processEnemyDeath(engine.state, makeEnemy({ id: i }));
		expect(engine.damageNumbers.length).toBe(0);
	});
});
