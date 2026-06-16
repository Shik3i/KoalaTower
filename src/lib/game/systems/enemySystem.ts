import { GAME_CONFIG } from '../engine/gameConfig';
import { EnemyType, UpgradeId, type Enemy, type GameState, type Projectile } from '../engine/gameTypes';
import { damageTower } from './towerSystem';
import { calculateGoldFromKill, getKoalaCoinPerKill } from './economySystem';
import { getBattleUpgradeEffect } from '../balance/battleUpgrades';

// Feedback helpers — called by the projectile system to spawn effects.
// These are stored on the GameEngine instance; we provide a way to register them.
let _addDmg: ((x: number, y: number, text: string, color: number) => void) | null = null;
let _addParticles: ((x: number, y: number, color: number, count: number, speed?: number) => void) | null = null;
let _addShake: ((amount: number) => void) | null = null;

export function setFeedbackHooks(
	addDmg: (x: number, y: number, text: string, color: number) => void,
	addParticles: (x: number, y: number, color: number, count: number, speed?: number) => void,
	addShake?: (amount: number) => void,
): void {
	_addDmg = addDmg;
	_addParticles = addParticles;
	_addShake = addShake ?? null;
}

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
			// Piercing reduces effective armor
			const pierceLevel = state.battleUpgrades[UpgradeId.Piercing] ?? 0;
			const pierceBonus = getBattleUpgradeEffect(UpgradeId.Piercing, pierceLevel);
			const effectiveArmor = Math.max(0, target.armor - pierceBonus);
			const effectiveDmg = Math.max(1, Math.floor(proj.damage * (1 - effectiveArmor)));
			target.hp -= effectiveDmg;
			state.totalDamageDealt += effectiveDmg;
			target.hitFlashTimer = 0.1;

			// Damage number popup
			_addDmg?.(target.position.x, target.position.y - target.size * 0.5, '-' + effectiveDmg, proj.isCrit ? GAME_CONFIG.NEON_YELLOW : GAME_CONFIG.NEON_CYAN);

			if (target.hp <= 0) {
				target.alive = false;
				state.killCount++;
				if (target.isBoss) state.bossesDefeated++;
				state.wave.enemiesKilled++;

				// Death particles
				const pCount = target.isBoss ? 20 : 6;
				_addParticles?.(target.position.x, target.position.y, target.color, pCount, target.isBoss ? 120 : 60);
				if (target.isBoss) _addShake?.(6);

				// Gold (temporary run currency) — variable, based on wave + difficulty + GoldAmp
				let gold = calculateGoldFromKill(state, target.reward);
				const goldAmpLevel = state.battleUpgrades[UpgradeId.GoldAmp] ?? 0;
				const goldAmpBonus = getBattleUpgradeEffect(UpgradeId.GoldAmp, goldAmpLevel);
				gold = Math.floor(gold * (1 + goldAmpBonus));
				state.cash += gold;

				// KoalaCoin (permanent currency) — 1 + workshop bonus per kill
				const coin = getKoalaCoinPerKill(state);
				state.coins += coin;

				// Feedback popups
				_addDmg?.(target.position.x, target.position.y + target.size * 0.5, '+' + gold + '💰', GAME_CONFIG.NEON_GREEN);
				if (coin > 0) {
					_addDmg?.(target.position.x, target.position.y + target.size, '+' + coin + '🪙', GAME_CONFIG.NEON_YELLOW);
				}
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
