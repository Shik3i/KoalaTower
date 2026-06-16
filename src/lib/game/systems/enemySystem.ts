import { GAME_CONFIG } from '../engine/gameConfig';
import { EnemyType, type Enemy, type GameState, type Projectile } from '../engine/gameTypes';
import { damageTower } from './towerSystem';
import { calculateCashFromKill } from './economySystem';

let nextProjectileId = 1;

export function resetProjectileIdCounter(): void {
	nextProjectileId = 1;
}

export function updateEnemySystem(state: GameState, dt: number): void {
	if (!state.runActive || state.gameOver || state.paused) return;

	const towerPos = state.tower.position;

	for (const enemy of state.enemies) {
		if (!enemy.alive) continue;

		enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);

		const dx = towerPos.x - enemy.position.x;
		const dy = towerPos.y - enemy.position.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= enemy.attackRange) {
			enemy.stopped = true;
			enemy.attackTimer -= dt;
			if (enemy.attackTimer <= 0) {
				enemy.attackTimer = enemy.attackCooldown;
				damageTower(state, enemy.damage);
			}
		} else {
			enemy.stopped = false;
			enemy.attackTimer = 0;
			const angle = Math.atan2(dy, dx);
			enemy.position.x += Math.cos(angle) * enemy.speed * dt;
			enemy.position.y += Math.sin(angle) * enemy.speed * dt;
			enemy.angle = angle;
		}
	}
}

export function createProjectile(
	fromX: number,
	fromY: number,
	targetId: number,
	speed: number,
	damage: number,
	color: number,
	isCrit: boolean
): Projectile {
	return {
		id: nextProjectileId++,
		position: { x: fromX, y: fromY },
		targetId,
		speed,
		damage,
		color,
		alive: true,
		trail: [],
		isCrit,
	};
}

export function updateProjectileSystem(state: GameState, dt: number): void {
	if (!state.runActive || state.gameOver || state.paused) return;

	for (const proj of state.projectiles) {
		if (!proj.alive) continue;

		const target = state.enemies.find(e => e.id === proj.targetId && e.alive);
		if (!target) {
			proj.alive = false;
			continue;
		}

		const dx = target.position.x - proj.position.x;
		const dy = target.position.y - proj.position.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 8) {
			// Armour reduces incoming damage
			const effectiveDmg = Math.max(1, Math.floor(proj.damage * (1 - target.armor)));
			target.hp -= effectiveDmg;
			target.hitFlashTimer = 0.1;
			if (target.hp <= 0) {
				target.alive = false;
				state.killCount++;
				state.cash += calculateCashFromKill(state, target.reward);
			}
			proj.alive = false;
			continue;
		}

		const angle = Math.atan2(dy, dx);
		const moveAmount = proj.speed * dt;
		proj.position.x += Math.cos(angle) * moveAmount;
		proj.position.y += Math.sin(angle) * moveAmount;

		proj.trail.push({ x: proj.position.x, y: proj.position.y });
		if (proj.trail.length > GAME_CONFIG.PROJECTILE_TRAIL_LENGTH) {
			proj.trail.shift();
		}
	}

	state.projectiles = state.projectiles.filter(p => p.alive);
}

export function updateTowerTargeting(state: GameState, dt: number): void {
	if (!state.runActive || state.gameOver || state.paused) return;
	if (!state.tower.alive) return;

	state.tower.fireTimer -= dt;
	if (state.tower.fireTimer > 0) return;

	const range = state.tower.stats.range;
	const towerPos = state.tower.position;
	const target = findNearestEnemy(state, range);

	if (!target) return;

	state.tower.fireTimer = 1.0 / state.tower.stats.fireRate;
	const multishot = Math.floor(state.tower.stats.multishot);

	for (let i = 0; i < multishot; i++) {
		const isCrit = Math.random() < state.tower.stats.critChance;
		const damage = isCrit
			? state.tower.stats.damage * state.tower.stats.critMultiplier
			: state.tower.stats.damage;

		const offsetX = (Math.random() - 0.5) * 10;
		const offsetY = (Math.random() - 0.5) * 10;

		const proj = createProjectile(
			towerPos.x + offsetX,
			towerPos.y + offsetY,
			target.id,
			GAME_CONFIG.PROJECTILE_SPEED,
			damage,
			isCrit ? GAME_CONFIG.NEON_YELLOW : GAME_CONFIG.BEAM_COLOR,
			isCrit
		);
		state.projectiles.push(proj);
	}
}

function findNearestEnemy(state: GameState, range: number): Enemy | null {
	let nearest: Enemy | null = null;
	let nearestDist = range * range;

	for (const enemy of state.enemies) {
		if (!enemy.alive) continue;
		const dx = enemy.position.x - state.tower.position.x;
		const dy = enemy.position.y - state.tower.position.y;
		const dist = dx * dx + dy * dy;
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = enemy;
		}
	}

	return nearest;
}
