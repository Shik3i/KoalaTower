/**
 * towerSystem.ts — Tower state, layered defense, sustain.
 *
 * Damage: raw → defense% → defenseAbs → minFloor
 * Healing: regen (per sec) + lifesteal (% of dmg dealt) capped at maxHP
 * Thorns: reflect on melee hit
 *
 * SHARED UPGRADE MODEL (v15):
 * Combat stats come from ONE curve — the Field (battle) upgrade curve. The Forge
 * seeds a run's battleUpgrades with its permanent starting levels, then in-run
 * Field purchases increment from there. So a stat's value depends only on its
 * total battle level: there is no separate Forge bonus layer. Lab/Research
 * multipliers compound on top (Damage/FireRate/HP), exactly as before.
 */

import { GAME_CONFIG, TOWER_HP_BASE } from '../engine/gameConfig';
import {
	UpgradeId,
	LabId,
	type Enemy,
	type GameState,
	type TowerState,
	type TowerStats,
} from '../engine/gameTypes';
import { getBattleUpgradeEffect } from '../balance/battleUpgrades';
import { STARTING_TOWER_RANGE } from '../balance/balanceMath';
import { getLabMultiplier, type LabMultipliers } from '../balance/labs';

/**
 * Compute tower stats + maxHp from the run's total battle levels (Forge-seeded
 * + bought this run) on the shared curve, with lab multipliers applied.
 */
function computeTowerStats(state: GameState, lab: LabMultipliers): { stats: TowerStats; maxHp: number } {
	const bu = state.battleUpgrades;
	const b = (id: UpgradeId) => bu[id] ?? 0;
	const fx = (id: UpgradeId) => getBattleUpgradeEffect(id, b(id));

	const stats: TowerStats = {
		damage: fx(UpgradeId.Damage) * lab.dmg,
		fireRate: (1.0 + fx(UpgradeId.FireRate)) * lab.fireRate,
		range: STARTING_TOWER_RANGE + fx(UpgradeId.Range),
		multishotChance: fx(UpgradeId.Multishot),
		multishotCount: 1 + fx(UpgradeId.MultishotProjectiles),
		critChance: Math.min(0.75, 0.01 + fx(UpgradeId.CritChance)),
		critMultiplier: 1.30 + fx(UpgradeId.CritMultiplier),
		defensePercent: Math.min(0.50, fx(UpgradeId.DefensePercent)),
		defenseAbsolute: fx(UpgradeId.Defense),
		regen: fx(UpgradeId.Regen),
		lifesteal: Math.min(0.15, fx(UpgradeId.Lifesteal)),
		thorns: fx(UpgradeId.Thorns),
	};
	const maxHp = Math.floor((TOWER_HP_BASE + fx(UpgradeId.MaxHp)) * lab.hp);
	return { stats, maxHp };
}

export function createTowerState(state: GameState): TowerState {
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const { stats, maxHp } = computeTowerStats(state, lab);
	return {
		position: { x: GAME_CONFIG.VIEW_WIDTH / 2, y: GAME_CONFIG.VIEW_HEIGHT / 2 },
		hp: maxHp,
		maxHp,
		stats,
		fireTimer: 0,
		alive: true,
	};
}

export function applyBattleUpgrades(state: GameState): void {
	const tower = state.tower;
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const { stats, maxHp } = computeTowerStats(state, lab);

	Object.assign(tower.stats, stats);

	const oldMaxHp = tower.maxHp;
	tower.maxHp = maxHp;
	// Heal by the HP gained from the upgrade (minimum 30 for non-MaxHP purchases), capped at new max.
	const hpGain = Math.max(0, tower.maxHp - oldMaxHp);
	tower.hp = Math.min(tower.hp + Math.max(30, hpGain), tower.maxHp);
}

export function applyRegen(state: GameState, dt: number): void {
	const regen = state.tower.stats.regen;
	if (regen > 0 && state.tower.hp < state.tower.maxHp) {
		state.tower.hp = Math.min(state.tower.maxHp, state.tower.hp + regen * dt);
	}
}

export function applyLifesteal(state: GameState, damageDealt: number): void {
	const lifesteal = state.tower.stats.lifesteal;
	if (lifesteal > 0 && damageDealt > 0) {
		const heal = Math.floor(damageDealt * lifesteal);
		if (heal > 0) state.tower.hp = Math.min(state.tower.maxHp, state.tower.hp + heal);
	}
}

/** Returns true if the enemy was killed by Thorns so the caller can handle rewards. */
export function applyThorns(state: GameState, enemy: Enemy): boolean {
	const thorns = state.tower.stats.thorns;
	if (thorns <= 0) return false;
	const thornDmg = enemy.isBoss ? Math.floor(thorns * 0.5) : thorns;
	if (thornDmg <= 0) return false;
	enemy.hp -= thornDmg;
	state.totalDamageDealt += thornDmg;
	if (enemy.hp <= 0) { enemy.alive = false; enemy.hp = 0; return true; }
	return false;
}

/** Layered damage formula: raw → def% → defAbs → minFloor */
export function computeDamageToTower(rawDamage: number, state: GameState, isBoss: boolean): number {
	const defPct = state.tower.stats.defensePercent;
	const defAbs = state.tower.stats.defenseAbsolute;
	const afterPct = Math.max(0, rawDamage * (1 - defPct));
	const wave = state.wave.currentWave;
	const dmgFloor = isBoss ? Math.max(5, Math.floor(wave * 0.5)) : 1;
	return Math.max(dmgFloor, Math.floor(afterPct - defAbs));
}

export function damageTower(state: GameState, rawDamage: number, isBoss: boolean = false): void {
	if (!state.tower.alive) return; // already dead — prevent negative HP and double game-over
	const dmg = computeDamageToTower(rawDamage, state, isBoss);
	const hpBefore = state.tower.hp;
	state.tower.hp = Math.max(0, state.tower.hp - dmg);
	// Record the first wave the tower took damage (daily-task "no damage" tracking).
	if (dmg > 0 && state.firstTowerDamageWave === 0) {
		state.firstTowerDamageWave = Math.max(1, state.wave.currentWave);
	}
	// Any tower hit breaks the cosmetic kill chain — feedback only, no gameplay effect.
	if (dmg > 0 && state.killstreak?.count > 0) {
		state.killstreak.count = 0;
		state.killstreak.timer = 0;
		state.killstreak.lastMilestone = 0;
	}
	if (hpBefore > 0 && state.tower.hp <= 0) {
		state.tower.alive = false;
		state.gameOver = true;
		state.runActive = false;
	}
}
