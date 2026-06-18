import { GAME_CONFIG } from '../engine/gameConfig';
import { EnemyType, type Enemy, type GameState, type Projectile, type DamageNumberKind } from '../engine/gameTypes';
import { damageTower, applyThorns, applyLifesteal, computeDamageToTower } from './towerSystem';
import { calculateEnergyFromKill, getBossCoinReward } from './economySystem';
import { getFrontAlloyMultiplier } from '../balance/balanceMath';
import { calculateEnemyDamage, createProjectileDamageContext } from './damageSystem';
import type { EnemyFrameIndex } from './spatialIndex';

// Feedback helpers
import type { SoundName } from '../audio/AudioManager';

let _addDmg: ((x: number, y: number, text: string, color: number, kind?: DamageNumberKind) => void) | null = null;
let _addParticles: ((x: number, y: number, color: number, count: number, speed?: number) => void) | null = null;
let _addShake: ((amount: number) => void) | null = null;
let _triggerMuzzleFlash: (() => void) | null = null;
let _playSound: ((name: SoundName) => void) | null = null;
let _hitStop: ((seconds: number) => void) | null = null;
let _addShockwave: ((x: number, y: number, color: number, maxRadius: number, duration: number, width?: number) => void) | null = null;
let _addDeathEffect: ((enemy: Enemy) => void) | null = null;
let _onKillstreakMilestone: ((count: number) => void) | null = null;

export const FLOATING_TEXT_COLORS: Record<DamageNumberKind, number> = {
	damage: 0xF0F4FF,
	crit: GAME_CONFIG.NEON_YELLOW,
	energy: GAME_CONFIG.NEON_CYAN,
	alloy: GAME_CONFIG.NEON_YELLOW,
	strange: 0xCC66FF,
	schematic: 0x66E6FF,
	chain: 0xFFAA44,
	error: 0xFF5577,
};

export function formatFloatingText(kind: DamageNumberKind, amount: number): string {
	const value = formatFloatingAmount(amount);
	switch (kind) {
		case 'crit': return `CRIT ${value}`;
		case 'energy': return `${value} ⚡`;
		case 'alloy': return `${value} ✨`;
		case 'strange': return `${value} ◆`;
		case 'schematic': return `${value} ▣`;
		case 'damage': return value;
		default: return value;
	}
}

function formatFloatingAmount(amount: number): string {
	const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
	return Number.isInteger(safe) ? String(safe) : safe.toFixed(1).replace(/\.0$/, '');
}

export function setFeedbackHooks(hooks: {
	addDmg: (x: number, y: number, text: string, color: number, kind?: DamageNumberKind) => void;
	addParticles: (x: number, y: number, color: number, count: number, speed?: number) => void;
	addShake?: (amount: number) => void;
	triggerMuzzleFlash?: () => void;
	playSound?: (name: SoundName) => void;
	hitStop?: (seconds: number) => void;
	addShockwave?: (x: number, y: number, color: number, maxRadius: number, duration: number, width?: number) => void;
	addDeathEffect?: (enemy: Enemy) => void;
	onKillstreakMilestone?: (count: number) => void;
}): void {
	_addDmg = hooks.addDmg;
	_addParticles = hooks.addParticles;
	_addShake = hooks.addShake ?? null;
	_triggerMuzzleFlash = hooks.triggerMuzzleFlash ?? null;
	_playSound = hooks.playSound ?? null;
	_hitStop = hooks.hitStop ?? null;
	_addShockwave = hooks.addShockwave ?? null;
	_addDeathEffect = hooks.addDeathEffect ?? null;
	_onKillstreakMilestone = hooks.onKillstreakMilestone ?? null;
}

let nextProjectileId = 1;

export function resetProjectileIdCounter(): void {
	nextProjectileId = 1;
}

/**
 * Central enemy-death handler. Must be called exactly once per enemy death,
 * regardless of kill source (projectile, Thorns, future AOE, etc.).
 * Increments all counters, grants rewards, and spawns death effects.
 *
 * @param isCrit - true only for projectile crits (Thorns kills pass false)
 */
export function processEnemyDeath(state: GameState, target: Enemy, isCrit = false): void {
	state.killCount++;
	if (target.isBoss) state.bossesDefeated++;
	state.wave.enemiesKilled++;
	state.killsByType = state.killsByType ?? {};
	state.killsByType[target.type] = (state.killsByType[target.type] ?? 0) + 1;
	if (target.isShiny) {
		state.shinyKillsByType = state.shinyKillsByType ?? {};
		state.shinyKillsByType[target.type] = (state.shinyKillsByType[target.type] ?? 0) + 1;
	}

	// ── Spawn render-only death proxy so the body shrinks/fades instead of popping out.
	// Lives in a separate buffer; never affects targeting or wave completion.
	_addDeathEffect?.(target);

	// ── Cosmetic killstreak: increment + refresh timer. No economy/combat effect.
	bumpKillstreak(state);

	// ── Death effects by enemy type ──
	const deathColor = target.isBoss ? GAME_CONFIG.NEON_PINK : target.color;
	let pCount = 6;
	if (target.type === EnemyType.Tank || target.type === EnemyType.Boss) pCount = target.isBoss ? 25 : 12;
	else if (target.type === EnemyType.Fast) pCount = 8;
	else if (target.type === EnemyType.Ranged) pCount = 8;

	_addParticles?.(target.position.x, target.position.y, 0xFFFFFF, target.isBoss ? 12 : 4, 60);
	_addParticles?.(target.position.x, target.position.y, deathColor, pCount, target.isBoss ? 150 : 80);

	// ── Impact feedback (shockwave ring, hit-stop, sound) ──
	if (target.isBoss) {
		_addShake?.(7);
		_addParticles?.(target.position.x, target.position.y, GAME_CONFIG.NEON_CYAN, 8, 200);
		_addParticles?.(target.position.x, target.position.y, GAME_CONFIG.NEON_YELLOW, 6, 180);
		_addShockwave?.(target.position.x, target.position.y, GAME_CONFIG.NEON_PINK, target.size * 6, 0.55, 4);
		_addShockwave?.(target.position.x, target.position.y, GAME_CONFIG.NEON_CYAN, target.size * 4, 0.4, 2.5);
		_hitStop?.(0.09);
		_playSound?.('bossKill');
	} else if (target.isShiny) {
		_addShockwave?.(target.position.x, target.position.y, 0xFFD700, target.size * 3.2, 0.4, 2.5);
		_hitStop?.(0.05);
		_playSound?.('shiny');
	} else {
		if (isCrit) {
			_addShockwave?.(target.position.x, target.position.y, GAME_CONFIG.NEON_YELLOW, target.size * 2.4, 0.3, 2);
		}
		_playSound?.('kill');
	}

	// Energy (temporary field resource)
	const energy = calculateEnergyFromKill(state, target.reward);
	state.cash += energy;
	state.totalEnergyEarned += energy;

	// Alloy (permanent currency) — bosses and shiny enemies only
	if (target.isBoss) {
		const bossCoins = getBossCoinReward(state);
		state.coins += bossCoins;
		_addDmg?.(target.position.x, target.position.y + target.size * 1.1, formatFloatingText('alloy', bossCoins), FLOATING_TEXT_COLORS.alloy, 'alloy');
	}
	if (target.isShiny) {
		state.shiniesKilled++;
		const shinyAlloy = Math.floor(target.coinReward * getFrontAlloyMultiplier(state.tier ?? 1));
		if (shinyAlloy > 0) {
			state.coins += shinyAlloy;
			_addDmg?.(target.position.x, target.position.y + target.size * 1.2, formatFloatingText('alloy', shinyAlloy), FLOATING_TEXT_COLORS.alloy, 'alloy');
		}
	}

	// Feedback popup
	const energyLabel = target.isShiny ? `${formatFloatingText('energy', energy)} ✨` : formatFloatingText('energy', energy);
	_addDmg?.(target.position.x, target.position.y + target.size * 0.6, energyLabel, FLOATING_TEXT_COLORS.energy, 'energy');
}

/**
 * Increment the cosmetic killstreak, refresh its timeout window, and fire the
 * milestone callback whenever a new tier is crossed. Purely visual — grants
 * no resources, no damage, no hidden multipliers.
 */
function bumpKillstreak(state: GameState): void {
	if (!state.killstreak) return;
	state.killstreak.count = Math.min(state.killstreak.count + 1, GAME_CONFIG.KILLSTREAK_MAX);
	state.killstreak.timer = GAME_CONFIG.KILLSTREAK_WINDOW;
	if (state.killstreak.count > state.killstreak.best) {
		state.killstreak.best = state.killstreak.count;
	}
	// Fire the milestone callback only when crossing into a new tier (no per-frame retrigger).
	const tiers = GAME_CONFIG.KILLSTREAK_TIERS;
	for (let i = tiers.length - 1; i >= 0; i--) {
		const t = tiers[i]!;
		if (state.killstreak.count === t && state.killstreak.lastMilestone < t) {
			state.killstreak.lastMilestone = t;
			_onKillstreakMilestone?.(t);
			break;
		}
	}
}

/**
 * Returns the cosmetic killstreak tier index (0..N) for a given count, used
 * by renderer + HUD to pick the escalation colour. Exposed for tests.
 */
export function getKillstreakTier(count: number): number {
	const tiers = GAME_CONFIG.KILLSTREAK_TIERS;
	let tier = -1;
	for (let i = 0; i < tiers.length; i++) {
		if (count >= tiers[i]!) tier = i;
	}
	return tier;
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
				// Apply thorns before tower takes damage (enemy may die from Thorns).
				// If it does, route through processEnemyDeath to increment all counters.
				if (applyThorns(state, enemy)) {
					processEnemyDeath(state, enemy);
				}
				// Tower still takes the hit even if enemy died — the attack already landed.
				damageTower(state, enemy.damage, enemy.isBoss);
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

export function updateProjectileSystem(state: GameState, dt: number, enemyIndex?: EnemyFrameIndex): void {
	if (!state.runActive || state.gameOver || state.paused) return;

	for (const proj of state.projectiles) {
		if (!proj.alive) continue;

		// byId lookup does not recheck alive (index was built before this frame's kills).
		// Explicitly guard so a projectile never double-damages an enemy killed earlier
		// in the same frame by another projectile.
		const byIdTarget = enemyIndex?.byId.get(proj.targetId);
		const target = (byIdTarget?.alive ? byIdTarget : null)
			?? state.enemies.find(e => e.id === proj.targetId && e.alive);
		if (!target) {
			proj.alive = false;
			continue;
		}

		const dx = target.position.x - proj.position.x;
		const dy = target.position.y - proj.position.y;
		const distSq = dx * dx + dy * dy;

		if (distSq < 64) {
			const hitDistance = Math.sqrt(distSq);
			const damage = calculateEnemyDamage(
				target,
				createProjectileDamageContext(proj, target, state.masteryDmgBonus?.[target.type] ?? 0, hitDistance),
			);
			const effectiveDmg = damage.finalDamage;
			// Track crits
			if (damage.isCrit) state.critsDealt = (state.critsDealt ?? 0) + 1;
			// Lifesteal heals based on damage dealt
			applyLifesteal(state, effectiveDmg);
			target.hp -= effectiveDmg;
			state.totalDamageDealt += effectiveDmg;
			target.hitFlashTimer = 0.12;

			// Impact burst particles (sparks at hit point)
			const impactColor = proj.isCrit ? GAME_CONFIG.NEON_YELLOW : proj.color;
			_addParticles?.(target.position.x, target.position.y, impactColor, proj.isCrit ? 5 : 3, 120);

		// Damage number popup
		const textKind: DamageNumberKind = proj.isCrit ? 'crit' : 'damage';
		_addDmg?.(
			target.position.x,
			target.position.y - target.size * 0.5,
			formatFloatingText(textKind, effectiveDmg),
			FLOATING_TEXT_COLORS[textKind],
			textKind,
		);

			if (target.hp <= 0) {
				target.alive = false;
				target.hp = 0;
				processEnemyDeath(state, target, proj.isCrit);
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

	// Swap-remove dead projectiles in-place to avoid a per-frame allocation.
	let i = state.projectiles.length - 1;
	while (i >= 0) {
		if (!state.projectiles[i]!.alive) {
			state.projectiles[i] = state.projectiles[state.projectiles.length - 1]!;
			state.projectiles.pop();
		}
		i--;
	}
}

export function updateTowerTargeting(state: GameState, dt: number, enemyIndex?: EnemyFrameIndex): void {
	if (!state.runActive || state.gameOver || state.paused) return;
	if (!state.tower.alive) return;

	state.tower.fireTimer -= dt;
	if (state.tower.fireTimer > 0) return;

	const range = state.tower.stats.range;
	const towerPos = state.tower.position;
	const target = findNearestEnemy(state, range, enemyIndex);

	if (!target) return;

	state.tower.fireTimer = 1.0 / state.tower.stats.fireRate;

	// ── Muzzle flash + shot sound ──
	_triggerMuzzleFlash?.();
	_playSound?.('shoot');

	// ── Muzzle flash particles at tower edge ──
	const angleToTarget = Math.atan2(target.position.y - towerPos.y, target.position.x - towerPos.x);
	const towerEdgeX = towerPos.x + Math.cos(angleToTarget) * GAME_CONFIG.TOWER_SIZE * 0.9;
	const towerEdgeY = towerPos.y + Math.sin(angleToTarget) * GAME_CONFIG.TOWER_SIZE * 0.9;
	_addParticles?.(towerEdgeX, towerEdgeY, GAME_CONFIG.NEON_CYAN, 4, 60);

	// Always fire one main projectile
	const mainIsCrit = Math.random() < state.tower.stats.critChance;
	const mainDamage = mainIsCrit
		? state.tower.stats.damage * state.tower.stats.critMultiplier
		: state.tower.stats.damage;
	const mainProj = createProjectile(
		towerPos.x, towerPos.y, target.id,
		GAME_CONFIG.PROJECTILE_SPEED,
		mainDamage,
		mainIsCrit ? GAME_CONFIG.NEON_YELLOW : GAME_CONFIG.BEAM_COLOR,
		mainIsCrit
	);
	state.projectiles.push(mainProj);

	// Roll for multishot: fire extra projectiles on success
	if (Math.random() < state.tower.stats.multishotChance) {
		const extraCount = Math.floor(state.tower.stats.multishotCount);
		for (let i = 0; i < extraCount; i++) {
			const isCrit = Math.random() < state.tower.stats.critChance;
			const damage = isCrit
				? state.tower.stats.damage * state.tower.stats.critMultiplier
				: state.tower.stats.damage;

			const offsetX = (Math.random() - 0.5) * 14;
			const offsetY = (Math.random() - 0.5) * 14;

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
}

function findNearestEnemy(state: GameState, range: number, enemyIndex?: EnemyFrameIndex): Enemy | null {
	let nearest: Enemy | null = null;
	let nearestDist = range * range;
	const candidates = enemyIndex?.grid.queryCircle(state.tower.position.x, state.tower.position.y, range) ?? state.enemies;

	for (const enemy of candidates) {
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
