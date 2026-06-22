/**
 * balanceSimulator.ts — Long-tail simulator with Schematic path gating and strategy levels.
 *
 * Strategies:
 *   'confused' — terrible buying (saves too long, buys random upgrades late)
 *   'reasonable' — buys damage/HP when affordable, misses some opportunities
 *   'optimal' — smart priority buying
 *
 * Models: layered defense (%, abs), regen, lifesteal, thorns, and full
 * workshop baseline with the new long-tail upgrade values.
 *
 * Path Gating:
 * The simulator respects Schematic path locks. Fresh accounts only have access
 * to starter upgrades. Scenarios can specify unlockedBlueprints (legacy ID
 * storage) to simulate progression after reconstructing specific paths.
 */

import {
	hybridCost, additiveEffect,
	computeEnemyConfig, expectedEnemiesPerWave, baseSpawnChancePercent, spawnDensityMultiplier, availableEnemyTypes,
	frontEnemyArmor, frontHasResistance, STARTING_TOWER_RANGE,
	calculateEffectiveDamage, getFrontAlloyMultiplier
} from './balanceMath';
import { TOWER_HP_BASE } from '../engine/gameConfig';
import { scaleCountForFront, getEnemyCountForWave } from './enemies';
import { BATTLE_UPGRADE_DEFS, getBattleUpgradeCost, getBattleUpgradeEffect } from './battleUpgrades';
import { WORKSHOP_UPGRADE_DEFS, getWorkshopUpgradeEffect } from './workshopUpgrades';
import { getLabEffect } from './labs';
import { UpgradeId, WorkshopUpgradeId, EnemyType, BlueprintId, LabId } from '../engine/gameTypes';
import { isFieldUpgradeUnlocked } from './blueprints';

export type Strategy = 'confused' | 'reasonable' | 'optimal';

export interface SimResult {
	finalWave: number; totalKills: number;
	totalCashEarned: number; totalAlloyEarned: number;
	battleUpgradesBought: Record<string, number>;
	finalDamage: number; finalFireRate: number; finalRange: number;
	finalMaxHp: number; finalCritChance: number; finalDefense: number;
	dps: number; effectiveHp: number;
	bottleneck: string; diedTo: string;
	tier: number; strategy: Strategy; labLevels: Record<string, number>;
	lockedUpgradesSkipped: number;
	totalShiniesKilled: number;
	/** True if any armored enemy was encountered this run (Front 5+ late, 6+ earlier). */
	armorEncountered: boolean;
	/** True if this Front has damage-type resistance scaffolding (Front 9+). */
	resistanceScaffold: boolean;
	/** Per-wave enemy-count multiplier for this Front. */
	enemyCountMultiplier: number;
}

interface SimState {
	damage: number; fireRate: number; range: number;
	multishotChance: number; multishotCount: number;
	critChance: number; critMultiplier: number;
	maxHp: number; hp: number; defense: number;
	defensePercent: number; regen: number; lifesteal: number; thorns: number;
	cash: number; coins: number; wave: number; kills: number;
	cashEarned: number; coinsEarned: number;
	battleLevels: Record<string, number>;
	tier: number; labLevels: Record<string, number>;
	unlockedBlueprints: BlueprintId[];
	lockedUpgradesSkipped: number;
	strategy: Strategy;
	shiniesKilled: number;
	armorEncountered: boolean;
}

/**
 * v15 model: combat stats come from forge (shared battle-upgrade curve via
 * getBattleUpgradeEffect), economy multipliers remain in workshop.
 */
function computeBaseline(fg: Record<string, number>, ws: Record<string, number>, lab: Record<string, number>) {
	const f = (id: UpgradeId) => getBattleUpgradeEffect(id, fg[id] ?? 0);
	const w = (id: WorkshopUpgradeId) => ws[id] ?? 0;
	const l = (id: LabId) => lab[id] ?? 0;
	const lDmg = 1 + getLabEffect(LabId.DamageResearch, l(LabId.DamageResearch));
	const lFR = 1 + getLabEffect(LabId.AttackSpeedResearch, l(LabId.AttackSpeedResearch));
	const lHP = 1 + getLabEffect(LabId.HealthResearch, l(LabId.HealthResearch));
	const lCoin = 1 + getLabEffect(LabId.AlloyEfficiency, l(LabId.AlloyEfficiency));
	const lCash = 1 + getLabEffect(LabId.EnergyEfficiency, l(LabId.EnergyEfficiency));
	return {
		damage: f(UpgradeId.Damage) * lDmg,
		fireRate: (1.0 + f(UpgradeId.FireRate)) * lFR,
		range: STARTING_TOWER_RANGE + f(UpgradeId.Range),
		hp: Math.floor((TOWER_HP_BASE + f(UpgradeId.MaxHp)) * lHP),
		critChance: Math.min(0.75, 0.01 + f(UpgradeId.CritChance)),
		cashMult: (1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.EnergyBonus, w(WorkshopUpgradeId.EnergyBonus))) * lCash,
		coinMult: (1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, w(WorkshopUpgradeId.CoinBonus))) * lCoin,
		startingCash: 100 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingEnergy, w(WorkshopUpgradeId.StartingEnergy)),
		defenseAbsolute: f(UpgradeId.Defense),
		defensePercent: Math.min(0.50, f(UpgradeId.DefensePercent)),
		regen: f(UpgradeId.Regen),
		lifesteal: Math.min(0.15, f(UpgradeId.Lifesteal)),
		thorns: f(UpgradeId.Thorns),
		killCoinBonus: Math.floor(w(WorkshopUpgradeId.CoinBonus) * 0.01) * lCoin,
	};
}

function isUpgradeAvailable(defId: UpgradeId, unlockedBlueprints: BlueprintId[]): boolean {
	return isFieldUpgradeUnlocked(defId, unlockedBlueprints);
}

function tryBuyUpgrades(state: SimState, priority: UpgradeId[], threshold: number): void {
	let bought = true;
	for (let a = 0; bought && a < 100; a++) {
		bought = false;
		for (const id of priority) {
			const def = BATTLE_UPGRADE_DEFS.find(d => d.id === id);
			if (!def) continue;
			if (!isUpgradeAvailable(def.id, state.unlockedBlueprints)) {
				state.lockedUpgradesSkipped++;
				continue;
			}
			const lv = state.battleLevels[id] ?? 0;
			if (lv >= def.maxLevel) continue;
			const cost = getBattleUpgradeCost(id, lv);
			if (state.cash >= cost * threshold) {
				state.cash -= cost;
				state.battleLevels[id] = lv + 1;
				bought = true;
				break;
			}
		}
	}
}

/**
 * Recompute combat stats from forge baseline + in-run battle purchases.
 * v15: single shared curve — forge level + battle level → getBattleUpgradeEffect.
 */
function recompute(state: SimState, core: ReturnType<typeof computeBaseline>, forgeLevels: Record<string, number>): void {
	const bl = (id: UpgradeId) => state.battleLevels[id] ?? 0;
	const fg = (id: UpgradeId) => forgeLevels[id] ?? 0;
	const l = (id: LabId) => state.labLevels[id] ?? 0;
	const lDmg = 1 + getLabEffect(LabId.DamageResearch, l(LabId.DamageResearch));
	const lFR = 1 + getLabEffect(LabId.AttackSpeedResearch, l(LabId.AttackSpeedResearch));
	const lHP = 1 + getLabEffect(LabId.HealthResearch, l(LabId.HealthResearch));

	// Shared curve: forge starting level + in-run battle purchases.
	const totalDamageLvl = fg(UpgradeId.Damage) + bl(UpgradeId.Damage);
	const totalFireRateLvl = fg(UpgradeId.FireRate) + bl(UpgradeId.FireRate);
	const totalRangeLvl = fg(UpgradeId.Range) + bl(UpgradeId.Range);
	const totalCritLvl = fg(UpgradeId.CritChance) + bl(UpgradeId.CritChance);
	const totalMaxHpLvl = fg(UpgradeId.MaxHp) + bl(UpgradeId.MaxHp);
	const totalDefLvl = fg(UpgradeId.Defense) + bl(UpgradeId.Defense);
	const totalDefPctLvl = fg(UpgradeId.DefensePercent) + bl(UpgradeId.DefensePercent);
	const totalRegenLvl = fg(UpgradeId.Regen) + bl(UpgradeId.Regen);
	const totalLifestealLvl = fg(UpgradeId.Lifesteal) + bl(UpgradeId.Lifesteal);
	const totalThornsLvl = fg(UpgradeId.Thorns) + bl(UpgradeId.Thorns);

	state.damage = getBattleUpgradeEffect(UpgradeId.Damage, totalDamageLvl) * lDmg;
	state.fireRate = (1.0 + getBattleUpgradeEffect(UpgradeId.FireRate, totalFireRateLvl)) * lFR;
	state.range = STARTING_TOWER_RANGE + getBattleUpgradeEffect(UpgradeId.Range, totalRangeLvl);
	state.multishotChance = getBattleUpgradeEffect(UpgradeId.Multishot, bl(UpgradeId.Multishot));
	state.multishotCount = 1 + getBattleUpgradeEffect(UpgradeId.MultishotProjectiles, bl(UpgradeId.MultishotProjectiles));
	state.critChance = Math.min(0.75, 0.01 + getBattleUpgradeEffect(UpgradeId.CritChance, totalCritLvl));
	state.critMultiplier = 1.30 + getBattleUpgradeEffect(UpgradeId.CritMultiplier, bl(UpgradeId.CritMultiplier));
	state.defense = getBattleUpgradeEffect(UpgradeId.Defense, totalDefLvl);
	state.defensePercent = Math.min(0.50, getBattleUpgradeEffect(UpgradeId.DefensePercent, totalDefPctLvl));
	state.regen = getBattleUpgradeEffect(UpgradeId.Regen, totalRegenLvl);
	state.lifesteal = Math.min(0.15, getBattleUpgradeEffect(UpgradeId.Lifesteal, totalLifestealLvl));
	state.thorns = getBattleUpgradeEffect(UpgradeId.Thorns, totalThornsLvl);

	const oldMaxHp = state.maxHp;
	state.maxHp = Math.floor((TOWER_HP_BASE + getBattleUpgradeEffect(UpgradeId.MaxHp, totalMaxHpLvl)) * lHP);
	const hpGain = Math.max(0, state.maxHp - oldMaxHp);
	state.hp = Math.min(state.hp + hpGain, state.maxHp);
}

function estimateDps(s: SimState): number {
	const base = s.damage * s.fireRate;
	return base * (1 + s.multishotChance * s.multishotCount) * (1 + s.critChance * (s.critMultiplier - 1));
}

function waveCoinReward(wave: number, coinMult: number, tier: number, alloyWaveBonus: number): number {
	let baseReward = 0;
	if (wave <= 10) {
		baseReward = 3;
	} else if (wave <= 25) {
		baseReward = 4;
	} else {
		baseReward = Math.floor(wave * 0.2);
	}
	const frontMult = getFrontAlloyMultiplier(tier);
	return Math.floor((baseReward + alloyWaveBonus) * coinMult * frontMult);
}

/**
 * Checks if an upgrade path should be auto-unlocked during simulation.
 *
 * IMPORTANT: In the actual game, paths are reconstructed by spending Schematics
 * in the Hub. The simulator does NOT model Hub spending, so it does NOT
 * auto-unlock paths. Paths only come from the unlockedBlueprints parameter
 * (pre-owned).
 */
function tryUnlockPaths(_state: SimState, _bossesDefeated: number): void {
	// Paths are NOT auto-unlocked during simulation.
	// They must be passed via the unlockedBlueprints parameter.
	return;
}

export function simulateRun(
	forgeLevels: Record<string, number>,
	workshopLevels: Record<string, number>,
	labLevels: Record<string, number> = {},
	maxWaves: number = 5000,
	tier: number = 1,
	strategy: Strategy = 'optimal',
	unlockedBlueprints: BlueprintId[] = [],
	randomSeed?: number,
): SimResult {
	// Backward compat: if no forge levels were provided but workshop contains
	// legacy combat keys, migrate them to forge so existing test/script code
	// continues to produce meaningful combat predictions.
	if (Object.keys(forgeLevels).length === 0) {
		const legacyCombatMap: [string, UpgradeId][] = [
			[WorkshopUpgradeId.BaseDamage, UpgradeId.Damage],
			[WorkshopUpgradeId.BaseFireRate, UpgradeId.FireRate],
			[WorkshopUpgradeId.StartingHp, UpgradeId.MaxHp],
			[WorkshopUpgradeId.BaseRange, UpgradeId.Range],
			[WorkshopUpgradeId.DefenseAbsolute, UpgradeId.Defense],
			[WorkshopUpgradeId.DefensePercent, UpgradeId.DefensePercent],
			[WorkshopUpgradeId.Regen, UpgradeId.Regen],
			[WorkshopUpgradeId.Lifesteal, UpgradeId.Lifesteal],
			[WorkshopUpgradeId.Thorns, UpgradeId.Thorns],
			[WorkshopUpgradeId.CritBonus, UpgradeId.CritChance],
		];
		for (const [wsKey, upKey] of legacyCombatMap) {
			const v = workshopLevels[wsKey];
			if (v) forgeLevels[upKey] = (forgeLevels[upKey] ?? 0) + v;
		}
	}

	// Seeded PRNG for deterministic simulations (uses mulberry32)
	let rngState = randomSeed ?? Math.floor(Math.random() * 2147483647);
	function rng(): number {
		rngState |= 0;
		rngState = rngState + 0x6D2B79F5 | 0;
		let t = Math.imul(rngState ^ rngState >>> 15, 1 | rngState);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
	const core = computeBaseline(forgeLevels, workshopLevels, labLevels);

	const state: SimState = {
		damage: core.damage, fireRate: core.fireRate, range: core.range,
		multishotChance: 0, multishotCount: 1,
		critChance: core.critChance, critMultiplier: 1.30,
		maxHp: core.hp, hp: core.hp,
		defense: core.defenseAbsolute, defensePercent: core.defensePercent,
		regen: core.regen, lifesteal: core.lifesteal, thorns: core.thorns,
		cash: core.startingCash, coins: 0,
		wave: 0, kills: 0, cashEarned: core.startingCash, coinsEarned: 0,
		battleLevels: {}, tier, labLevels,
		unlockedBlueprints: [...unlockedBlueprints],
		lockedUpgradesSkipped: 0,
		strategy,
		shiniesKilled: 0,
		armorEncountered: false,
	};

	// Define strategy buy priorities and thresholds
	let priority: UpgradeId[];
	let threshold: number;
	if (strategy === 'confused') {
		// Confused: extreme hoarding, buys almost nothing
		priority = [UpgradeId.MaxHp];
		threshold = 20;
	} else if (strategy === 'reasonable') {
		// Reasonable: buys HP then damage, moderate hoarding
		priority = [UpgradeId.MaxHp, UpgradeId.Damage, UpgradeId.Regen];
		threshold = 4;
	} else {
		// Optimal: balanced buying, priorities damage and HP
		priority = [
			UpgradeId.MaxHp, UpgradeId.Damage, UpgradeId.Regen,
			UpgradeId.FireRate, UpgradeId.CritChance, UpgradeId.CritMultiplier,
			// Locked without reconstructed paths, listed for when available:
			UpgradeId.CashPerWave, UpgradeId.Multishot,
			UpgradeId.Defense, UpgradeId.DefensePercent, UpgradeId.Lifesteal,
			UpgradeId.Thorns, UpgradeId.Range, UpgradeId.EnergyAmp,
		];
		threshold = 2;
	}

	tryBuyUpgrades(state, priority, threshold);
	recompute(state, core, forgeLevels);
	// Tower starts each run at full HP — the +30 heal in recompute is for mid-run purchases
	state.hp = state.maxHp;
	let diedTo = 'unknown';

	let totalBossesDefeated = 0;

	for (let wave = 1; wave <= maxWaves; wave++) {
		state.wave = wave;
		const isBossWave = wave % 10 === 0;
		// Spawn-tick count of enemies
		const count = getEnemyCountForWave(wave, tier);

		// ── Wave-level combat summary ──────────────────────────────────
		// Model the battle as a continuous process:
		// - Tower kills at fireRate/hitsToKill enemies per second
		// - Enemies arrive at tick-rate (8/s) * chance * density per second
		// - If kill rate >= arrival rate, tower stays ahead (minimal damage)
		// - If kill rate < arrival rate, enemies pile up and deal damage

		// Hub Schematic spending is not modeled, so this remains a no-op.
		tryUnlockPaths(state, totalBossesDefeated);

		// Front-aware roster (delayed type introduction; Front 1 drips slowly).
		const frontTypes = availableEnemyTypes(wave, tier);
		for (let e = 0; e < count; e++) {
			let type: EnemyType;
			if (isBossWave && e === count - 1) {
				type = EnemyType.Boss;
			} else {
				type = frontTypes[Math.floor(rng() * frontTypes.length)]!;
			}
			const isBoss = type === EnemyType.Boss;
			// 5% shiny chance, exclude bosses for safety
			const isShiny = !isBoss && rng() < 0.05;
			const config = computeEnemyConfig(type, wave, tier, isShiny);
			if (config.armor > 0) state.armorEncountered = true;

			const multAvg = 1 + state.multishotChance * state.multishotCount;
			const critAvg = 1 + state.critChance * (state.critMultiplier - 1);
			const effDmg = state.damage * multAvg * critAvg;
			const effDmgAfterArmor = calculateEffectiveDamage(effDmg, config.armor);
			const hits = Math.ceil(config.hp / effDmgAfterArmor);
			const ttk = hits / Math.max(0.1, state.fireRate);

			// Regen during engagement
			if (state.regen > 0 && state.hp < state.maxHp) {
				state.hp = Math.min(state.maxHp, state.hp + state.regen * ttk);
			}

			// Layered defense
			const afterPct = Math.max(0, config.damage * (1 - state.defensePercent));
			const dmgFloor = isBoss ? Math.max(5, Math.floor(wave * 0.5)) : 1;
			const dmgPerHit = Math.max(dmgFloor, Math.floor(afterPct - state.defense));

			// ── Rate-based contact model ────────────────────────────────
			// Tower kill rate: enemies killed per second
			const killRate = state.fireRate / hits;
			// Enemy arrival rate: expected enemies spawned per second (8 ticks/s * chance * density)
			const arrivalRate = 8 * (baseSpawnChancePercent(wave) / 100) * spawnDensityMultiplier(tier);

			// Approach time: seconds for enemy to cross from spawn to range edge
			const approachDist = 220; // px from viewport edge to tower range (400 - 180)
			const approachTime = Math.max(0.5, approachDist / Math.max(1, config.speed));

			// Time enemy spends alive and in attack range
			// If one-shot: enemy dies before or right at range edge
			// If multi-hit: enemy may survive into range
			const surviveInRange = Math.max(0, ttk - approachTime);
			const attackTime = surviveInRange;

			// Base hits: time in range / attack cooldown
			let hitsFromEnemy = attackTime / Math.max(0.1, config.attackCooldown);

			// Overflow damage: when enemies arrive faster than tower kills,
			// some enemies reach the tower while tower is busy
			if (killRate < arrivalRate) {
				const overflowRate = arrivalRate - killRate;
				const overflowTime = count / arrivalRate; // approximate wave duration
				const overflowEnemies = Math.min(count, overflowRate * overflowTime);
				// Each overflow enemy gets roughly 1 additional attack window
				const extraHitsPerOverflow = Math.min(1.0, approachTime / config.attackCooldown);
				hitsFromEnemy += (overflowEnemies / count) * extraHitsPerOverflow;
			}

			// Tiny leak floor for edge cases — but NOT a flat 0.20 per enemy
			// Only applies if the enemy type could theoretically slip through
			const leakFloor = hits <= 1 ? 0 : 0.02;
			hitsFromEnemy = Math.max(leakFloor, hitsFromEnemy);

			const totalDmg = hitsFromEnemy * dmgPerHit;

			// ── End contact model ──────────────────────────────────────

			// Lifesteal from damage dealt
			if (state.lifesteal > 0) {
				const dealt = Math.min(config.hp, effDmg * hits);
				const heal = Math.floor(dealt * state.lifesteal);
				if (heal > 0) state.hp = Math.min(state.maxHp, state.hp + heal);
			}

			state.hp -= totalDmg;

			if (state.hp <= 0) {
				diedTo = `Wave ${wave} — ${type}`;
				state.hp = 0;
				break;
			}

			state.kills++;
			if (isShiny) state.shiniesKilled++;

			const cashReward = config.cashReward * core.cashMult;
			state.cash += cashReward;
			state.cashEarned += cashReward;

			// Alloy from shiny enemies or boss
			if (isShiny) {
				const shinyAlloy = Math.floor(config.coinReward * getFrontAlloyMultiplier(tier));
				state.coins += shinyAlloy;
				state.coinsEarned += shinyAlloy;
			}
			if (isBoss) {
				totalBossesDefeated++;
				const bossCoins = Math.floor(5 * core.coinMult * getFrontAlloyMultiplier(tier));
				state.coins += bossCoins;
				state.coinsEarned += bossCoins;
			}
		}
		if (state.hp <= 0) break;

		// Wave completion
		const cashBonus = getBattleUpgradeEffect(UpgradeId.CashPerWave, state.battleLevels[UpgradeId.CashPerWave] ?? 0);
		state.cash += cashBonus;
		state.cashEarned += cashBonus;

		const wc = waveCoinReward(wave, core.coinMult, tier, getBattleUpgradeEffect(UpgradeId.AlloyPerWave, state.battleLevels[UpgradeId.AlloyPerWave] ?? 0));
		state.coins += wc;
		state.coinsEarned += wc;

		// Apply wave-completion healing: Math.max(30, Math.round(state.maxHp * 0.25))
		const healAfterWave = Math.max(30, Math.round(state.maxHp * 0.25));
		state.hp = Math.min(state.hp + healAfterWave, state.maxHp);

		// Re-check path unlocks (no-op unless the simulator models Hub spending later).
		tryUnlockPaths(state, totalBossesDefeated);
		tryBuyUpgrades(state, priority, threshold);
		recompute(state, core, forgeLevels);
	}

	const dps = estimateDps(state);
	const effHp = state.maxHp;
	let bottleneck = 'unknown';
	if (state.wave <= 3) bottleneck = 'very early: tower overwhelmed';
	else if (state.wave <= 8) bottleneck = 'early: need more damage/hp';
	else if (state.wave <= 18) bottleneck = 'first boss: need more damage/hp';
	else if (state.wave <= 35) bottleneck = 'mid-game: damage vs enemy HP';
	else if (state.wave <= 70) bottleneck = 'progression: DPS vs tank scaling';
	else if (state.wave <= 180) bottleneck = 'deep push: multishot/crit efficiency';
	else if (state.wave <= 500) bottleneck = 'long run: workshop depth matters';
	else if (state.wave <= 1200) bottleneck = 'extended: scaling mastery';
	else bottleneck = 'deep scaling: future systems needed';

	return {
		finalWave: state.wave, totalKills: state.kills,
		totalCashEarned: Math.floor(state.cashEarned),
		totalAlloyEarned: Math.floor(state.coinsEarned),
		battleUpgradesBought: { ...state.battleLevels },
		finalDamage: state.damage, finalFireRate: state.fireRate,
		finalRange: state.range, finalMaxHp: state.maxHp,
		finalCritChance: state.critChance, finalDefense: state.defense,
		dps, effectiveHp: effHp, bottleneck, diedTo,
		tier, strategy, labLevels,
		lockedUpgradesSkipped: state.lockedUpgradesSkipped,
		totalShiniesKilled: state.shiniesKilled,
		armorEncountered: state.armorEncountered,
		resistanceScaffold: frontHasResistance(tier),
		enemyCountMultiplier: 1 + 0.33 * (tier - 1),
	};
}

export function totalWSLevels(ws: Record<string, number>): number {
	return Object.values(ws).reduce((a, b) => a + b, 0);
}
export function totalLabLevels(lab: Record<string, number>): number {
	return Object.values(lab).reduce((a, b) => a + b, 0);
}

export interface SimScenario {
	name: string;
	/** Economy-only workshop levels (Alloy/Energy bonus, Starting Energy). */
	workshop: Record<string, number>;
	/** v15: Combat Forge starting levels keyed by UpgradeId (damage, fireRate, etc.). */
	forge?: Record<string, number>;
	labs: Record<string, number>;
	tier: number; strategy: Strategy;
	unlockedBlueprints: BlueprintId[];
	desc: string;
}

export const SCENARIOS: SimScenario[] = [
	{
		name: 'Fresh Confused', workshop: {}, forge: {}, labs: {}, tier: 1, strategy: 'confused',
		unlockedBlueprints: [],
		desc: 'First-ever run, confused buying (hoards cash, buys almost nothing). No reconstructed paths.'
	},
	{
		name: 'Fresh Reasonable', workshop: {}, forge: {}, labs: {}, tier: 1, strategy: 'reasonable',
		unlockedBlueprints: [],
		desc: 'First run, reasonable buying (HP, damage, regen). No reconstructed paths.'
	},
	{
		name: 'Fresh Optimal', workshop: {}, forge: {}, labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [],
		desc: 'First run, optimal priority buying. Only starter upgrades available.'
	},
	{
		name: 'Post First Achievement + 1 Forge', workshop: {}, forge: { [UpgradeId.Damage]: 1 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [],
		desc: 'After first deployment achievement (50 alloy) + one Forge damage upgrade.'
	},
	{
		name: 'After 3 Deployments / Few Forge', workshop: {}, forge: {
			[UpgradeId.Damage]: 2,
			[UpgradeId.MaxHp]: 1,
			[UpgradeId.FireRate]: 1,
		},
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell],
		desc: 'After a few deployments: 2 damage, 1 HP, 1 fire rate forge. Early paths reconstructed.'
	},
	{
		name: 'First Boss Attempt', workshop: {}, forge: {
			[UpgradeId.Damage]: 5,
			[UpgradeId.MaxHp]: 3,
			[UpgradeId.FireRate]: 2,
			[UpgradeId.Regen]: 1,
		},
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting],
		desc: 'Attempting first boss at wave 10. Moderate forge investment.'
	},
	{
		name: '5 Foundry Purchases', workshop: {}, forge: { [UpgradeId.Damage]: 3, [UpgradeId.MaxHp]: 2 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell],
		desc: 'Minimal foundry: 3 damage, 2 HP. Early paths reconstructed.'
	},
	{
		name: '25 Foundry Purchases', workshop: { [WorkshopUpgradeId.CoinBonus]: 2 }, forge: {
			[UpgradeId.Damage]: 12, [UpgradeId.MaxHp]: 5,
			[UpgradeId.FireRate]: 3, [UpgradeId.Regen]: 3 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction],
		desc: '~25 foundry levels. Mid-game paths reconstructed.'
	},
	{
		name: '100 Foundry + Early Labs', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 10, [WorkshopUpgradeId.CoinBonus]: 5 },
		forge: {
			[UpgradeId.Damage]: 40, [UpgradeId.MaxHp]: 20,
			[UpgradeId.FireRate]: 10, [UpgradeId.Range]: 5,
			[UpgradeId.Defense]: 5, [UpgradeId.Regen]: 5 },
		labs: { damageResearch: 5, healthResearch: 3, attackSpeedResearch: 2 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction, BlueprintId.PhaseDampener, BlueprintId.SplitBeamGeometry, BlueprintId.EnergyCondenser, BlueprintId.DeploymentReserves, BlueprintId.ReactiveSurface],
		desc: '~100 foundry + early labs. Most paths reconstructed.'
	},
	{
		name: '500 Foundry + Labs', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 30, [WorkshopUpgradeId.CoinBonus]: 20,
			[WorkshopUpgradeId.StartingEnergy]: 10 },
		forge: {
			[UpgradeId.Damage]: 200, [UpgradeId.MaxHp]: 100,
			[UpgradeId.FireRate]: 40, [UpgradeId.Defense]: 50,
			[UpgradeId.Range]: 20, [UpgradeId.Regen]: 10,
			[UpgradeId.DefensePercent]: 5, [UpgradeId.Thorns]: 5,
			[UpgradeId.CritChance]: 5 },
		labs: { damageResearch: 40, healthResearch: 20, attackSpeedResearch: 15,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: '~500 foundry + 100 labs — meaningful long-term. All paths reconstructed.'
	},
	{
		name: '1000 Foundry + 250 Labs', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 100, [WorkshopUpgradeId.CoinBonus]: 80,
			[WorkshopUpgradeId.StartingEnergy]: 30 },
		forge: {
			[UpgradeId.Damage]: 500, [UpgradeId.MaxHp]: 300,
			[UpgradeId.FireRate]: 70, [UpgradeId.Defense]: 100,
			[UpgradeId.Range]: 40, [UpgradeId.Regen]: 30,
			[UpgradeId.DefensePercent]: 15, [UpgradeId.Thorns]: 15,
			[UpgradeId.CritChance]: 15, [UpgradeId.Lifesteal]: 3 },
		labs: { damageResearch: 100, healthResearch: 80, attackSpeedResearch: 40,
			alloyEfficiency: 30, energyEfficiency: 20 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'Deep veteran: ~1000 foundry + 250 labs. All paths reconstructed.'
	},
	{
		name: 'Tier 2 First Try', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 10, [WorkshopUpgradeId.CoinBonus]: 5 },
		forge: {
			[UpgradeId.Damage]: 40, [UpgradeId.MaxHp]: 20,
			[UpgradeId.FireRate]: 10, [UpgradeId.Defense]: 5,
			[UpgradeId.Range]: 5 },
		labs: { damageResearch: 5, healthResearch: 3, attackSpeedResearch: 2 },
		tier: 2, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction, BlueprintId.SplitBeamGeometry, BlueprintId.EnergyCondenser, BlueprintId.DeploymentReserves],
		desc: 'Same as 100 foundry but Tier 2. Should be much harder.'
	},
	{
		name: 'Tier 2 Strong', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 30, [WorkshopUpgradeId.CoinBonus]: 20 },
		forge: {
			[UpgradeId.Damage]: 200, [UpgradeId.MaxHp]: 100,
			[UpgradeId.FireRate]: 40, [UpgradeId.Defense]: 50,
			[UpgradeId.Range]: 20, [UpgradeId.Regen]: 10,
			[UpgradeId.DefensePercent]: 5 },
		labs: { damageResearch: 40, healthResearch: 20, attackSpeedResearch: 15,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 2, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: '500 foundry farmer tries Tier 2.'
	},
	// ── 16-Front progression-structure scenarios (Part 11) ──
	{
		name: 'Front 5 Early (Redline opener)', workshop: {
			[WorkshopUpgradeId.EnergyBonus]: 30, [WorkshopUpgradeId.CoinBonus]: 20 },
		forge: {
			[UpgradeId.Damage]: 200, [UpgradeId.MaxHp]: 100,
			[UpgradeId.FireRate]: 40, [UpgradeId.Defense]: 50,
			[UpgradeId.Range]: 20, [UpgradeId.Regen]: 10,
			[UpgradeId.DefensePercent]: 5 },
		labs: { damageResearch: 60, healthResearch: 40, attackSpeedResearch: 20,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 5, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'First push onto Front 5 (Redline). Armor appears late (~Wave 100); denser waves (2.32×).'
	},
	{
		name: 'Front 9 Resistance Scaffold (Blacksite)', workshop: {}, forge: {
			[UpgradeId.Damage]: 500, [UpgradeId.MaxHp]: 300,
			[UpgradeId.FireRate]: 70, [UpgradeId.Defense]: 100,
			[UpgradeId.Range]: 40, [UpgradeId.Regen]: 30,
			[UpgradeId.DefensePercent]: 15, [UpgradeId.CritChance]: 15 },
		labs: { damageResearch: 120, healthResearch: 90, attackSpeedResearch: 50,
			alloyEfficiency: 30, energyEfficiency: 20 },
		tier: 9, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'Front 9 (Blacksite) scaffold check — armor frequent, resistance scaffolding present, ~3.64× density.'
	},
];
