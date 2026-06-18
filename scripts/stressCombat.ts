/**
 * Combat hot-path smoke benchmark.
 * Run with: node --experimental-strip-types scripts/stressCombat.ts
 */

import { buildEnemyFrameIndex } from '../src/lib/game/systems/spatialIndex.ts';
import { calculateEnemyDamage, createProjectileDamageContext } from '../src/lib/game/systems/damageSystem.ts';
import type { Enemy } from '../src/lib/game/engine/gameTypes.ts';

const sizes = [500, 1000, 2000, 5000];
const queryCount = 1000;

console.log('Flatland TD combat stress smoke');
console.log('enemies,indexMs,queryMs,avgNearby,damageMs');

for (const count of sizes) {
	const enemies: Enemy[] = Array.from({ length: count }, (_, i) => {
		const x = (i * 37) % 1600;
		const y = (i * 91) % 900;
		const type = i % 10 === 0 ? 'tank' : i % 7 === 0 ? 'fast' : 'normal';
		return {
			id: i + 1,
			type,
			config: {
				type,
				hp: 100,
				maxHp: 100,
				speed: 50,
				reward: 10,
				damage: 1,
				armor: type === 'tank' ? 0.25 : 0,
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
			armor: type === 'tank' ? 0.25 : 0,
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
			wave: 100,
		} as Enemy;
	});

	const indexStart = performance.now();
	const index = buildEnemyFrameIndex(enemies);
	const indexMs = performance.now() - indexStart;

	let nearby = 0;
	const queryStart = performance.now();
	for (let i = 0; i < queryCount; i++) {
		const x = (i * 53) % 1600;
		const y = (i * 29) % 900;
		nearby += index.grid.queryCircle(x, y, 140).length;
	}
	const queryMs = performance.now() - queryStart;

	const projectile = {
		id: 1,
		position: { x: 0, y: 0 },
		targetId: 1,
		speed: 800,
		damage: 100,
		color: 0xffffff,
		alive: true,
		trail: [],
		isCrit: false,
	};
	const damageStart = performance.now();
	for (const enemy of enemies) {
		calculateEnemyDamage(enemy, createProjectileDamageContext(projectile, enemy, 0.02, 0));
	}
	const damageMs = performance.now() - damageStart;

	console.log(`${count},${indexMs.toFixed(3)},${queryMs.toFixed(3)},${(nearby / queryCount).toFixed(1)},${damageMs.toFixed(3)}`);
}
