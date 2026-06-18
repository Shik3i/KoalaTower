import { describe, it, expect, vi, afterEach } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { UpgradeId } from '../engine/gameTypes';
import { getBattleUpgradeCost } from '../balance/battleUpgrades';
import { GAME_CONFIG } from '../engine/gameConfig';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GameEngine — run lifecycle', () => {
	it('startRun activates a fresh run with baseline energy and a living tower', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, 0, [], 1);
		expect(engine.state.runActive).toBe(true);
		expect(engine.state.gameOver).toBe(false);
		expect(engine.state.cash).toBe(100); // getStartingEnergy baseline
		expect(engine.state.tower.hp).toBeGreaterThan(0);
		expect(engine.state.tower.alive).toBe(true);
	});

	it('setSpeed clamps to [0.1, 10] and pauses at 0', () => {
		const engine = new GameEngine();
		engine.setSpeed(50);
		expect(engine.speedMultiplier).toBe(10);
		engine.setSpeed(0);
		expect(engine.isPaused()).toBe(true);
		engine.setSpeed(2);
		expect(engine.speedMultiplier).toBe(2);
		expect(engine.isPaused()).toBe(false);
	});
});

describe('GameEngine — setCallbacks replace/clear semantics', () => {
	it('fires registered callbacks and detaches them when passed an empty object', () => {
		const engine = new GameEngine();
		let stateChanges = 0;
		engine.setCallbacks({ onStateChange: () => stateChanges++ });
		engine.togglePause();
		expect(stateChanges).toBe(1);

		// Empty object must clear all callbacks (component-teardown contract).
		engine.setCallbacks({});
		engine.togglePause();
		expect(stateChanges).toBe(1);
	});
});

describe('GameEngine — battle upgrade purchases', () => {
	it('buys an affordable upgrade, charging energy and raising the level', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, 0, [], 1);
		engine.state.cash = 1_000_000;
		const cost = getBattleUpgradeCost(UpgradeId.Damage, 0);
		const before = engine.state.cash;
		expect(engine.buyBattleUpgrade(UpgradeId.Damage)).toBe(true);
		expect(engine.state.battleUpgrades[UpgradeId.Damage]).toBe(1);
		expect(engine.state.cash).toBe(before - cost);
	});

	it('refuses an unaffordable upgrade and leaves state untouched', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, 0, [], 1);
		engine.state.cash = 0;
		expect(engine.buyBattleUpgrade(UpgradeId.Damage)).toBe(false);
		expect(engine.state.battleUpgrades[UpgradeId.Damage] ?? 0).toBe(0);
	});

	it('refuses a blueprint-locked upgrade unless its blueprint is unlocked', () => {
		const engine = new GameEngine();
		engine.startRun({}, {}, 0, [], 1); // no blueprints
		engine.state.cash = 1_000_000;
		// Multishot requires the SplitBeamGeometry blueprint.
		expect(engine.buyBattleUpgrade(UpgradeId.Multishot)).toBe(false);
	});
});

describe('GameEngine — effect buffers respect settings and caps', () => {
	it('skips particles when the setting is disabled', () => {
		const engine = new GameEngine();
		engine.state.settings.particles = false;
		engine.addParticles(0, 0, 0xffffff, 20);
		expect(engine.particles.length).toBe(0);
	});

	it('never exceeds MAX_PARTICLES', () => {
		const engine = new GameEngine();
		engine.state.settings.particles = true;
		engine.state.settings.lowEffectsMode = false;
		for (let i = 0; i < 50; i++) engine.addParticles(0, 0, 0xffffff, 50);
		expect(engine.particles.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_PARTICLES);
	});

	it('caps damage numbers at MAX_DAMAGE_NUMBERS', () => {
		const engine = new GameEngine();
		engine.state.settings.damageNumbers = true;
		for (let i = 0; i < GAME_CONFIG.MAX_DAMAGE_NUMBERS + 25; i++) {
			engine.addDamageNumber(0, 0, '1', 0xffffff);
		}
		expect(engine.damageNumbers.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_DAMAGE_NUMBERS);
	});
});

describe('GameEngine — enemy spawn placement uses the live viewport', () => {
	it('spawns relative to state.viewWidth/viewHeight, not the 800px fallback', () => {
		// Regression: the renderer used to write __viewW on the engine object while
		// waveSystem read state.viewWidth — so spawns always fell back to 800.
		vi.spyOn(Math, 'random').mockReturnValue(0.3); // side=1 → right edge, non-shiny
		const engine = new GameEngine();
		engine.startRun({}, {}, 0, [], 1);
		engine.state.viewWidth = 2000;
		engine.state.viewHeight = 2000;

		let spawned = false;
		for (let i = 0; i < 500 && !spawned; i++) {
			engine.update(0.1);
			if (engine.state.enemies.length > 0) spawned = true;
		}
		expect(spawned).toBe(true);
		// Right-edge spawn at x≈viewWidth+margin would be impossible (~810) under the bug.
		expect(engine.state.enemies[0]!.position.x).toBeGreaterThan(1500);
	});

	it('preserves viewport dimensions across restarts so spawns use the live canvas size', () => {
		// Regression: startRun() replaced the entire state, dropping viewWidth/viewHeight
		// that initPixi() had written. A second run would fall back to the 800px default.
		const engine = new GameEngine();
		engine.state.viewWidth = 1200;
		engine.state.viewHeight = 900;
		engine.state.tower.position.x = 600;
		engine.state.tower.position.y = 450;

		engine.startRun({}, {}, 0, [], 1);

		expect(engine.state.viewWidth).toBe(1200);
		expect(engine.state.viewHeight).toBe(900);
	});

	it('corrects tower position to viewport centre after restart', () => {
		const engine = new GameEngine();
		engine.state.viewWidth = 1200;
		engine.state.viewHeight = 900;
		engine.state.tower.position.x = 600;
		engine.state.tower.position.y = 450;

		engine.startRun({}, {}, 0, [], 1);

		expect(engine.state.tower.position.x).toBe(600);
		expect(engine.state.tower.position.y).toBe(450);
	});

	it('falls back to GAME_CONFIG defaults when no prior viewport dimensions exist', () => {
		const engine = new GameEngine();
		// No viewWidth/viewHeight set — simulate first-ever launch
		engine.startRun({}, {}, 0, [], 1);

		expect(engine.state.viewWidth).toBeUndefined();
		expect(engine.state.viewHeight).toBeUndefined();
		// Tower defaults to the config constants
		expect(engine.state.tower.position.x).toBe(GAME_CONFIG.VIEW_WIDTH / 2);
		expect(engine.state.tower.position.y).toBe(GAME_CONFIG.VIEW_HEIGHT / 2);
	});
});
