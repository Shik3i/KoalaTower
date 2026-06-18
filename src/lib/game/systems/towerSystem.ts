/**
 * towerSystem.ts — Tower state, layered defense, sustain.
 *
 * Damage: raw → defense% → defenseAbs → minFloor
 * Healing: regen (per sec) + lifesteal (% of dmg dealt) capped at maxHP
 * Thorns: reflect on melee hit
 *
 * Workshop provides permanent base (long-tail, small per-level).
 * Battle upgrades provide run-specific bonus (larger per-level).
 * Lab multipliers compound on top.
 */

import { GAME_CONFIG, TOWER_HP_BASE } from '../engine/gameConfig';
import {
	UpgradeId,
	WorkshopUpgradeId,
	LabId,
	type Enemy,
	type GameState,
	type TowerState,
} from '../engine/gameTypes';
import { getBattleUpgradeEffect } from '../balance/battleUpgrades';
import { getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';
import { getLabMultiplier } from '../balance/labs';

export function createTowerState(state: GameState): TowerState {
	const ws = state.workshopUpgrades;
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);

	const w = (id: WorkshopUpgradeId) => ws[id] ?? 0;

	const baseDamage = (50 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, w(WorkshopUpgradeId.BaseDamage))) * lab.dmg;
	const baseFireRate = (1.0 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, w(WorkshopUpgradeId.BaseFireRate))) * lab.fireRate;
	const baseRange = 180 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, w(WorkshopUpgradeId.BaseRange));
	const baseHp = Math.floor((TOWER_HP_BASE + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, w(WorkshopUpgradeId.StartingHp))) * lab.hp);
	const baseCrit = Math.min(0.30, 0.01 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, w(WorkshopUpgradeId.CritBonus)));

	return {
		position: { x: GAME_CONFIG.VIEW_WIDTH / 2, y: GAME_CONFIG.VIEW_HEIGHT / 2 },
		hp: baseHp,
		maxHp: baseHp,
		stats: {
			damage: baseDamage,
			fireRate: baseFireRate,
			range: baseRange,
			multishotChance: 0,
			multishotCount: 1,
			critChance: baseCrit,
			critMultiplier: 1.20,
			defensePercent: Math.min(0.50, getWorkshopUpgradeEffect(WorkshopUpgradeId.DefensePercent, w(WorkshopUpgradeId.DefensePercent))),
			defenseAbsolute: getWorkshopUpgradeEffect(WorkshopUpgradeId.DefenseAbsolute, w(WorkshopUpgradeId.DefenseAbsolute)),
			regen: getWorkshopUpgradeEffect(WorkshopUpgradeId.Regen, w(WorkshopUpgradeId.Regen)),
			lifesteal: Math.min(0.10, getWorkshopUpgradeEffect(WorkshopUpgradeId.Lifesteal, w(WorkshopUpgradeId.Lifesteal))),
			thorns: getWorkshopUpgradeEffect(WorkshopUpgradeId.Thorns, w(WorkshopUpgradeId.Thorns)),
		},
		fireTimer: 0,
		alive: true,
	};
}

export function applyBattleUpgrades(state: GameState): void {
	const tower = state.tower;
	const bu = state.battleUpgrades;
	const ws = state.workshopUpgrades;
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);

	const w = (id: WorkshopUpgradeId) => ws[id] ?? 0;
	const b = (id: UpgradeId) => bu[id] ?? 0;

	// Workshop + lab baseline
	const wsDmg = getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseDamage, w(WorkshopUpgradeId.BaseDamage));
	const wsFR = getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, w(WorkshopUpgradeId.BaseFireRate));
	const wsRange = getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, w(WorkshopUpgradeId.BaseRange));
	const wsHP = getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, w(WorkshopUpgradeId.StartingHp));
	const wsCrit = getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, w(WorkshopUpgradeId.CritBonus));
	const wsDefAbs = getWorkshopUpgradeEffect(WorkshopUpgradeId.DefenseAbsolute, w(WorkshopUpgradeId.DefenseAbsolute));
	const wsDefPct = getWorkshopUpgradeEffect(WorkshopUpgradeId.DefensePercent, w(WorkshopUpgradeId.DefensePercent));
	const wsRegen = getWorkshopUpgradeEffect(WorkshopUpgradeId.Regen, w(WorkshopUpgradeId.Regen));
	const wsLifesteal = getWorkshopUpgradeEffect(WorkshopUpgradeId.Lifesteal, w(WorkshopUpgradeId.Lifesteal));
	const wsThorns = getWorkshopUpgradeEffect(WorkshopUpgradeId.Thorns, w(WorkshopUpgradeId.Thorns));

	// Effective = base × lab + battle
	tower.stats.damage = (50 + wsDmg) * lab.dmg + getBattleUpgradeEffect(UpgradeId.Damage, b(UpgradeId.Damage));
	tower.stats.fireRate = (1.0 + wsFR) * lab.fireRate + getBattleUpgradeEffect(UpgradeId.FireRate, b(UpgradeId.FireRate));
	tower.stats.range = 180 + wsRange + getBattleUpgradeEffect(UpgradeId.Range, b(UpgradeId.Range));
	tower.stats.multishotChance = getBattleUpgradeEffect(UpgradeId.Multishot, b(UpgradeId.Multishot));
	tower.stats.multishotCount = 1 + getBattleUpgradeEffect(UpgradeId.MultishotProjectiles, b(UpgradeId.MultishotProjectiles));
	tower.stats.critChance = Math.min(0.45, 0.01 + wsCrit + getBattleUpgradeEffect(UpgradeId.CritChance, b(UpgradeId.CritChance)));
	tower.stats.critMultiplier = 1.20 + getBattleUpgradeEffect(UpgradeId.CritMultiplier, b(UpgradeId.CritMultiplier));
	tower.stats.defensePercent = Math.min(0.50, wsDefPct + getBattleUpgradeEffect(UpgradeId.DefensePercent, b(UpgradeId.DefensePercent)));
	tower.stats.defenseAbsolute = wsDefAbs + getBattleUpgradeEffect(UpgradeId.Defense, b(UpgradeId.Defense));
	tower.stats.regen = wsRegen + getBattleUpgradeEffect(UpgradeId.Regen, b(UpgradeId.Regen));
	tower.stats.lifesteal = Math.min(0.15, wsLifesteal + getBattleUpgradeEffect(UpgradeId.Lifesteal, b(UpgradeId.Lifesteal)));
	tower.stats.thorns = wsThorns + getBattleUpgradeEffect(UpgradeId.Thorns, b(UpgradeId.Thorns));

	// Max HP: base + workshop × lab + battle
	tower.maxHp = Math.floor((TOWER_HP_BASE + wsHP) * lab.hp) + getBattleUpgradeEffect(UpgradeId.MaxHp, b(UpgradeId.MaxHp));
	// Small flat heal (+30 HP) on upgrade + keep existing HP (capped at new max)
	tower.hp = Math.min(tower.hp + 30, tower.maxHp);
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
	const dmg = computeDamageToTower(rawDamage, state, isBoss);
	state.tower.hp -= dmg;
	if (state.tower.hp <= 0) {
		state.tower.hp = 0;
		state.tower.alive = false;
		state.gameOver = true;
		state.runActive = false;
	}
}
