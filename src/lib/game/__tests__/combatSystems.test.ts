import { describe, expect, it } from 'vitest';
import {
	EnemyType,
	UpgradeId, WorkshopUpgradeId, LabId,
	type Enemy, type Projectile, type GameState,
	DEFAULT_SETTINGS,
} from '../engine/gameTypes';
import { calculateEnemyDamage, createProjectileDamageContext } from '../systems/damageSystem';
import { buildEnemyFrameIndex } from '../systems/spatialIndex';
import { applyThorns } from '../systems/towerSystem';
import { processEnemyDeath, updateProjectileSystem } from '../systems/enemySystem';

function enemy(id: number, x: number, y: number, armor = 0): Enemy {
	return {
		id,
		type: EnemyType.Normal,
		config: {
			type: EnemyType.Normal,
			hp: 100,
			maxHp: 100,
			speed: 50,
			reward: 10,
			damage: 1,
			armor,
			attackRange: 10,
			attackCooldown: 1,
			size: 12,
			color: 0xffffff,
			shape: 'square',
		},
		position: { x, y },
		hp: 100,
		maxHp: 100,
		speed: 50,
		reward: 10,
		coinReward: 0,
		damage: 1,
		armor,
		attackRange: 10,
		attackCooldown: 1,
		attackTimer: 0,
		size: 12,
		color: 0xffffff,
		shape: 'square',
		angle: 0,
		alive: true,
		hitFlashTimer: 0,
		spawnProgress: 1,
		stopped: false,
		isBoss: false,
		isShiny: false,
		wave: 1,
	};
}

function projectile(baseDamage: number): Projectile {
	return {
		id: 1,
		position: { x: 0, y: 0 },
		targetId: 1,
		speed: 100,
		damage: baseDamage,
		color: 0xffffff,
		alive: true,
		trail: [],
		isCrit: false,
	};
}

describe('damageSystem', () => {
	it('matches the existing armor and mastery projectile formula', () => {
		const target = enemy(1, 0, 0, 0.25);
		const result = calculateEnemyDamage(target, createProjectileDamageContext(projectile(100), target, 0.03, 0));
		expect(result.finalDamage).toBe(77);
		expect(result.armorAfterPierce).toBe(0.25);
		expect(result.masteryMultiplier).toBe(1.03);
	});

	it('supports armor piercing and distance falloff without changing default behavior', () => {
		const target = enemy(1, 0, 0, 0.4);
		const proj = {
			...projectile(100),
			armorPierce: 0.15,
			maxDistance: 100,
			distanceFalloff: 0.5,
			tags: ['beam', 'piercing'],
		};
		const result = calculateEnemyDamage(target, createProjectileDamageContext(proj, target, 0, 50));
		expect(result.armorAfterPierce).toBeCloseTo(0.25);
		expect(result.distanceMultiplier).toBe(0.75);
		expect(result.finalDamage).toBe(56);
		expect(result.tags).toEqual(['beam', 'piercing']);
	});
});

describe('SpatialGrid', () => {
	it('indexes alive enemies by id and returns only nearby enemies in circle queries', () => {
		const near = enemy(1, 10, 10);
		const edge = enemy(2, 70, 10);
		const far = enemy(3, 300, 300);
		const dead = enemy(4, 5, 5);
		dead.alive = false;

		const index = buildEnemyFrameIndex([near, edge, far, dead], 64);
		expect(index.byId.get(1)).toBe(near);
		expect(index.byId.has(4)).toBe(false);
		expect(index.grid.queryCircle(0, 0, 80).map(e => e.id).sort()).toEqual([1, 2]);
	});
});

// ─── Regression: Audit pass fixes ────────────────────────────────────────────

function makeState(overrides: Partial<GameState> = {}): GameState {
	return {
		tower: {
			position: { x: 400, y: 300 },
			hp: 200,
			maxHp: 200,
			alive: true,
			fireTimer: 0,
			stats: {
				damage: 50,
				fireRate: 1,
				range: 180,
				multishotChance: 0,
				multishotCount: 1,
				critChance: 0.05,
				critMultiplier: 1.5,
				defensePercent: 0,
				defenseAbsolute: 0,
				regen: 0,
				lifesteal: 0,
				thorns: 0,
			},
		},
		wave: {
			currentWave: 3,
			enemiesInWave: 5,
			enemiesSpawned: 5,
			enemiesKilled: 4,
			spawnTimer: 0,
			spawnInterval: 1,
			waveActive: true,
			betweenWaveTimer: 0,
			currentSubWave: 1,
			enemiesInSubWave: 5,
			enemiesSpawnedInSubWave: 5,
			subWavePauseTimer: 0,
			subWaveActive: false,
		},
		enemies: [],
		projectiles: [],
		cash: 0,
		coins: 0,
		battleUpgrades: {} as Record<UpgradeId, number>,
		workshopUpgrades: {} as Record<WorkshopUpgradeId, number>,
		labLevels: {} as Record<LabId, number>,
		paused: false,
		gameOver: false,
		runActive: true,
		elapsedTime: 0,
		waveStartTime: 0,
		killCount: 0,
		bossesDefeated: 0,
		shiniesKilled: 0,
		totalDamageDealt: 0,
		totalEnergyEarned: 0,
		highestWave: 0,
		totalRuns: 0,
		settings: { ...DEFAULT_SETTINGS },
		tier: 1,
		activeChallenge: null,
		killsByType: {},
		shinyKillsByType: {},
		masteryDmgBonus: {},
		critsDealt: 0,
		...overrides,
	};
}

describe('Thorns softlock regression', () => {
	it('last-hit by Thorns increments wave.enemiesKilled and killCount exactly once', () => {
		const state = makeState();
		const e = enemy(1, 405, 300); // within attackRange(10) of tower at 400,300
		e.hp = 1;
		state.enemies.push(e);
		state.tower.stats.thorns = 50; // enough to kill any 1-hp enemy

		// Simulate the exact code path in updateEnemySystem
		const killed = applyThorns(state, e);
		expect(killed).toBe(true);
		expect(e.alive).toBe(false);

		processEnemyDeath(state, e);

		expect(state.killCount).toBe(1);
		expect(state.wave.enemiesKilled).toBe(5); // was 4, now 5
	});

	it('Thorns non-lethal hit does not increment kill counters', () => {
		const state = makeState();
		const e = enemy(2, 405, 300);
		e.hp = 999;
		state.enemies.push(e);
		state.tower.stats.thorns = 10;

		const killed = applyThorns(state, e);
		expect(killed).toBe(false);
		expect(e.alive).toBe(true);
		expect(state.killCount).toBe(0);
		expect(state.wave.enemiesKilled).toBe(4); // unchanged
	});

	it('boss Thorns kill uses 50% thorns damage', () => {
		const state = makeState();
		const boss = enemy(3, 405, 300);
		boss.isBoss = true;
		boss.hp = 15;
		state.enemies.push(boss);
		state.tower.stats.thorns = 20; // boss gets 10 dmg

		// hp=15, boss thornsDmg=10: should survive
		const killed1 = applyThorns(state, boss);
		expect(killed1).toBe(false);
		expect(boss.hp).toBe(5);

		// Next hit kills it
		const killed2 = applyThorns(state, boss);
		expect(killed2).toBe(true);
		expect(boss.alive).toBe(false);

		processEnemyDeath(state, boss);
		expect(state.killCount).toBe(1);
		expect(state.bossesDefeated).toBe(1);
	});
});

describe('Projectile dead-target regression', () => {
	it('projectile targeting a dead enemy does not apply damage', () => {
		const state = makeState();
		const e = enemy(10, 5, 5);
		e.alive = false; // already dead
		const hpBefore = e.hp;
		state.enemies.push(e);

		const proj: Projectile = {
			id: 1,
			position: { x: 5, y: 5 }, // at the enemy's location
			targetId: 10,
			speed: 100,
			damage: 999,
			color: 0xffffff,
			alive: true,
			trail: [],
			isCrit: false,
		};
		state.projectiles.push(proj);

		updateProjectileSystem(state, 0.016);

		// Projectile should be cleaned up but enemy HP should not change
		expect(e.hp).toBe(hpBefore);
		expect(state.projectiles.length).toBe(0); // dead-miss projectile removed
	});

	it('projectile kills a living enemy and marks it dead', () => {
		const state = makeState();
		const e = enemy(11, 5, 5);
		e.hp = 1;
		state.enemies.push(e);

		const proj: Projectile = {
			id: 2,
			position: { x: 5, y: 5 },
			targetId: 11,
			speed: 100,
			damage: 999,
			color: 0xffffff,
			alive: true,
			trail: [],
			isCrit: false,
		};
		state.projectiles.push(proj);

		updateProjectileSystem(state, 0.016);

		expect(e.alive).toBe(false);
		expect(state.killCount).toBe(1);
		expect(state.wave.enemiesKilled).toBe(5);
	});

	it('byId dead-alive guard: dead entry in index does not get damaged', () => {
		const state = makeState();
		const e = enemy(20, 5, 5);
		e.alive = false;
		state.enemies.push(e);

		// Build an index that contains only alive enemies — dead enemy 20 is excluded
		const index = buildEnemyFrameIndex(state.enemies, 64);
		expect(index.byId.has(20)).toBe(false);

		const proj: Projectile = {
			id: 3,
			position: { x: 5, y: 5 },
			targetId: 20,
			speed: 100,
			damage: 999,
			color: 0xffffff,
			alive: true,
			trail: [],
			isCrit: false,
		};
		state.projectiles.push(proj);

		updateProjectileSystem(state, 0.016, index);

		expect(e.hp).toBe(100); // untouched
		expect(state.killCount).toBe(0);
	});
});
