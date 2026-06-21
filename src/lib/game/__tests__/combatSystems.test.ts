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
import { damageTower, computeDamageToTower } from '../systems/towerSystem';
import { processEnemyDeath, updateProjectileSystem, updateEnemySystem, updateTowerTargeting } from '../systems/enemySystem';

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
			killsByTypeThisWave: {},
			lastWaveKillsByType: {},
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
		towerDamageTaken: 0,
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
		energySpentThisRun: 0,
		firstTowerDamageWave: 0,
		killstreak: { count: 0, best: 0, lastMilestone: 0 },
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

// ─── Tower HP overkill safety (v0.5.3) ────────────────────────────────────

describe('Tower HP overkill / negative HP safety', () => {
	it('overkill damage clamps HP to 0, not negative', () => {
		const state = makeState();
		state.tower.hp = 10;
		state.tower.alive = true;
		// Raw damage 50 → after defense (0%) → 50 dmg, tower has only 10 HP
		damageTower(state, 50, false);
		expect(state.tower.hp).toBe(0);
		expect(state.towerDamageTaken).toBe(10);
		expect(state.tower.hp).toBeGreaterThanOrEqual(0);
		expect(state.tower.alive).toBe(false);
		expect(state.gameOver).toBe(true);
	});

	it('game over triggers exactly once after death', () => {
		const state = makeState();
		state.tower.hp = 1;
		state.tower.alive = true;
		state.gameOver = false;
		state.runActive = true;

		damageTower(state, 100, false);
		expect(state.gameOver).toBe(true);
		expect(state.runActive).toBe(false);
		expect(state.tower.alive).toBe(false);
		expect(state.tower.hp).toBe(0);

		// Subsequent damage calls must be ignored (guard at top of damageTower)
		const gameOverCount = state.gameOver ? 1 : 0;
		damageTower(state, 100, false);
		damageTower(state, 50, true);
		expect(state.gameOver).toBe(true); // still true, no crash
		expect(state.tower.hp).toBe(0); // still clamped
		expect(state.tower.alive).toBe(false); // still dead
	});

	it('damageTower ignores hits after tower is already dead', () => {
		const state = makeState();
		state.tower.hp = 0;
		state.tower.alive = false;
		state.gameOver = true;
		state.runActive = false;

		// Should be a no-op — no HP change, no crash
		damageTower(state, 999, true);
		expect(state.tower.hp).toBe(0);
		expect(state.tower.alive).toBe(false);
	});

	it('killstreak resets on tower damage', () => {
		const state = makeState();
		state.tower.hp = 200;
		state.tower.alive = true;
		state.killstreak = { count: 25, best: 50, lastMilestone: 25 };

		damageTower(state, 10, false);
		expect(state.killstreak.count).toBe(0);
		expect(state.killstreak.lastMilestone).toBe(0);
		expect(state.towerDamageTaken).toBe(10);
		expect(state.tower.hp).toBe(190); // damage applied but tower alive
	});
});

describe('Ranged Projectile & Multishot 360', () => {
	it('ranged enemy spawns a projectile on attack, which damages tower on impact', () => {
		const state: GameState = {
			tower: {
				position: { x: 400, y: 300 },
				hp: 100,
				maxHp: 100,
				stats: {
					damage: 10,
					fireRate: 1,
					range: 150,
					multishotChance: 0,
					multishotCount: 1,
					critChance: 0,
					critMultiplier: 1.5,
					defensePercent: 0,
					defenseAbsolute: 0,
					regen: 0,
					lifesteal: 0,
					thorns: 0,
				},
				fireTimer: 0,
				alive: true,
			},
			wave: {
				currentWave: 1,
				enemiesInWave: 10,
				enemiesSpawned: 0,
				enemiesKilled: 0,
				waveActive: true,
				betweenWaveTimer: 0,
				spawnInterval: 1,
				spawnTimer: 0,
				currentSubWave: 0,
				enemiesInSubWave: 10,
				enemiesSpawnedInSubWave: 0,
				subWavePauseTimer: 0,
				subWaveActive: false,
				killsByTypeThisWave: {},
				lastWaveKillsByType: {},
			},
			enemies: [
				{
					id: 1,
					type: EnemyType.Ranged,
					config: {
						type: EnemyType.Ranged,
						hp: 100,
						maxHp: 100,
						speed: 10,
						reward: 10,
						damage: 15,
						armor: 0,
						attackRange: 150,
						attackCooldown: 2,
						size: 15,
						color: 0xff0000,
						shape: 'triangle',
					},
					position: { x: 400, y: 440 }, // distance = 140 <= attackRange (150)
					hp: 100,
					maxHp: 100,
					speed: 10,
					reward: 10,
					coinReward: 0,
					damage: 15,
					armor: 0,
					attackRange: 150,
					attackCooldown: 2,
					attackTimer: 0, // ready to attack!
					size: 15,
					color: 0xff0000,
					shape: 'triangle',
					angle: 0,
					alive: true,
					hitFlashTimer: 0,
					spawnProgress: 1,
					stopped: false,
					isBoss: false,
					isShiny: false,
					wave: 1,
				}
			],
			projectiles: [],
			cash: 100,
			coins: 10,
			battleUpgrades: {} as any,
			workshopUpgrades: {} as any,
			labLevels: {} as any,
			paused: false,
			gameOver: false,
			runActive: true,
			elapsedTime: 0,
			waveStartTime: 0,
			killCount: 0,
			bossesDefeated: 0,
			totalDamageDealt: 0,
			towerDamageTaken: 0,
			totalEnergyEarned: 0,
			highestWave: 1,
			totalRuns: 1,
			settings: { ...DEFAULT_SETTINGS },
			shiniesKilled: 0,
			tier: 1,
			activeChallenge: null,
			killsByType: {},
			shinyKillsByType: {},
			masteryDmgBonus: {},
			critsDealt: 0,
			energySpentThisRun: 0,
			firstTowerDamageWave: 0,
			killstreak: { count: 0, best: 0, lastMilestone: 0 },
		};

		// 1. Ranged enemy should stop and spawn a projectile, not damage tower instantly
		updateEnemySystem(state, 0.1);
		expect(state.enemies[0]!.stopped).toBe(true);
		expect(state.tower.hp).toBe(100); // no damage yet!
		expect(state.projectiles.length).toBe(1);
		expect(state.projectiles[0]!.isEnemy).toBe(true);
		expect(state.projectiles[0]!.damage).toBe(15);
		expect(state.projectiles[0]!.position.x).toBe(400);
		expect(state.projectiles[0]!.position.y).toBe(440);

		// 2. Projectile should move towards the tower and damage it on impact
		// Distance is 140. Speed is 280. It should hit in ~0.5 seconds.
		updateProjectileSystem(state, 0.6);
		expect(state.projectiles.length).toBe(0); // hit and removed
		expect(state.tower.hp).toBe(85); // 100 - 15 = 85
	});

	it('multishot targeting spreads projectiles across multiple enemies in range (360 degrees)', () => {
		const state: GameState = {
			tower: {
				position: { x: 400, y: 300 },
				hp: 100,
				maxHp: 100,
				stats: {
					damage: 10,
					fireRate: 1,
					range: 150,
					multishotChance: 1.0, // 100% multishot chance
					multishotCount: 2,    // 2 extra projectiles (3 total)
					critChance: 0,
					critMultiplier: 1.5,
					defensePercent: 0,
					defenseAbsolute: 0,
					regen: 0,
					lifesteal: 0,
					thorns: 0,
				},
				fireTimer: 0,
				alive: true,
			},
			wave: {
				currentWave: 1,
				enemiesInWave: 10,
				enemiesSpawned: 0,
				enemiesKilled: 0,
				waveActive: true,
				betweenWaveTimer: 0,
				spawnInterval: 1,
				spawnTimer: 0,
				currentSubWave: 0,
				enemiesInSubWave: 10,
				enemiesSpawnedInSubWave: 0,
				subWavePauseTimer: 0,
				subWaveActive: false,
				killsByTypeThisWave: {},
				lastWaveKillsByType: {},
			},
			enemies: [
				{ id: 1, type: EnemyType.Normal, config: {} as any, position: { x: 400, y: 350 }, hp: 10, maxHp: 10, speed: 50, reward: 0, coinReward: 0, damage: 1, armor: 0, attackRange: 10, attackCooldown: 1, attackTimer: 0, size: 10, color: 0, shape: 'square', angle: 0, alive: true, hitFlashTimer: 0, spawnProgress: 1, stopped: false, isBoss: false, isShiny: false, wave: 1 },
				{ id: 2, type: EnemyType.Normal, config: {} as any, position: { x: 450, y: 300 }, hp: 10, maxHp: 10, speed: 50, reward: 0, coinReward: 0, damage: 1, armor: 0, attackRange: 10, attackCooldown: 1, attackTimer: 0, size: 10, color: 0, shape: 'square', angle: 0, alive: true, hitFlashTimer: 0, spawnProgress: 1, stopped: false, isBoss: false, isShiny: false, wave: 1 },
				{ id: 3, type: EnemyType.Normal, config: {} as any, position: { x: 350, y: 300 }, hp: 10, maxHp: 10, speed: 50, reward: 0, coinReward: 0, damage: 1, armor: 0, attackRange: 10, attackCooldown: 1, attackTimer: 0, size: 10, color: 0, shape: 'square', angle: 0, alive: true, hitFlashTimer: 0, spawnProgress: 1, stopped: false, isBoss: false, isShiny: false, wave: 1 },
			],
			projectiles: [],
			cash: 100,
			coins: 10,
			battleUpgrades: {} as any,
			workshopUpgrades: {} as any,
			labLevels: {} as any,
			paused: false,
			gameOver: false,
			runActive: true,
			elapsedTime: 0,
			waveStartTime: 0,
			killCount: 0,
			bossesDefeated: 0,
			totalDamageDealt: 0,
			towerDamageTaken: 0,
			totalEnergyEarned: 0,
			highestWave: 1,
			totalRuns: 1,
			settings: { ...DEFAULT_SETTINGS },
			shiniesKilled: 0,
			tier: 1,
			activeChallenge: null,
			killsByType: {},
			shinyKillsByType: {},
			masteryDmgBonus: {},
			critsDealt: 0,
			energySpentThisRun: 0,
			firstTowerDamageWave: 0,
			killstreak: { count: 0, best: 0, lastMilestone: 0 },
		};

		updateTowerTargeting(state, 0.1);
		expect(state.projectiles.length).toBe(3);
		
		const targetIds = state.projectiles.map(p => p.targetId).sort();
		expect(targetIds).toEqual([1, 2, 3]);
	});
});
