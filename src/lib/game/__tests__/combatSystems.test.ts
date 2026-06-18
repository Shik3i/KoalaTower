import { describe, expect, it } from 'vitest';
import { EnemyType, type Enemy, type Projectile } from '../engine/gameTypes';
import { calculateEnemyDamage, createProjectileDamageContext } from '../systems/damageSystem';
import { buildEnemyFrameIndex } from '../systems/spatialIndex';

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
