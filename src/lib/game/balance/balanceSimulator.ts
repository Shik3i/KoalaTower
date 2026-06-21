/**
 * balanceSimulator.ts — Long-tail simulator with blueprint-gating and strategy levels.
 *
 * Strategies:
 *   'confused' — terrible buying (saves too long, buys random upgrades late)
 *   'reasonable' — buys damage/HP when affordable, misses some opportunities
 *   'optimal' — smart priority buying
 *
 * Models: layered defense (%, abs), regen, lifesteal, thorns, and full
 * workshop baseline with the new long-tail upgrade values.
 *
 * Blueprint Gating:
 * The simulator respects blueprint locks. Fresh accounts only have access
 * to starter upgrades. Scenarios can specify unlockedBlueprints to simulate
 * progression after unlocking specific paths.
 */

import {
	hybridCost, additiveEffect, flatlandBaseDamageAtLevel,
	computeEnemyConfig, expectedEnemiesPerWave, baseSpawnChancePercent, spawnDensityMultiplier, availableEnemyTypes,
	frontEnemyArmor, frontHasResistance, STARTING_TOWER_RANGE,
	calculateEffectiveDamage, getFrontAlloyMultiplier
} from './balanceMath';
import { scaleCountForFront, getEnemyCountForWave } from './enemies';
import { BATTLE_UPGRADE_DEFS, getBattleUpgradeCost, getBattleUpgradeEffect } from './battleUpgrades';
import { WORKSHOP_UPGRADE_DEFS, getWorkshopUpgradeEffect } from './workshopUpgrades';
import { getLabEffect } from './labs';
import { UpgradeId, WorkshopUpgradeId, EnemyType, BlueprintId } from '../engine/gameTypes';
import { isFieldUpgradeUnlocked } from './blueprints';

export type Strategy = 'confused' | 'reasonable' | 'optimal';

export interface SimResult {
	finalWave: number; totalKills: number;
	totalCashEarned: number; totalCoinsEarned: number;
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

function computeBaseline(ws: Record<string, number>, lab: Record<string, number>) {
	const g = (id: WorkshopUpgradeId) => ws[id] ?? 0;
	const l = (id: string) => lab[id] ?? 0;
	const lDmg = 1 + getLabEffect('damageResearch' as any, l('damageResearch'));
	const lFR = 1 + getLabEffect('attackSpeedResearch' as any, l('attackSpeedResearch'));
	const lHP = 1 + getLabEffect('healthResearch' as any, l('healthResearch'));
	const lCoin = 1 + getLabEffect('alloyEfficiency' as any, l('alloyEfficiency'));
	const lCash = 1 + getLabEffect('energyEfficiency' as any, l('energyEfficiency'));
	return {
		damage: flatlandBaseDamageAtLevel(g(WorkshopUpgradeId.BaseDamage)) * lDmg,
		fireRate: (1.0 + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseFireRate, g(WorkshopUpgradeId.BaseFireRate))) * lFR,
		range: STARTING_TOWER_RANGE + getWorkshopUpgradeEffect(WorkshopUpgradeId.BaseRange, g(WorkshopUpgradeId.BaseRange)),
		hp: Math.floor((100 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingHp, g(WorkshopUpgradeId.StartingHp))) * lHP),
		critChance: Math.min(0.30, 0.01 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CritBonus, g(WorkshopUpgradeId.CritBonus))),
		cashMult: (1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.EnergyBonus, g(WorkshopUpgradeId.EnergyBonus))) * lCash,
		coinMult: (1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, g(WorkshopUpgradeId.CoinBonus))) * lCoin,
		startingCash: 100 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingEnergy, g(WorkshopUpgradeId.StartingEnergy)),
		wsDefAbs: getWorkshopUpgradeEffect(WorkshopUpgradeId.DefenseAbsolute, g(WorkshopUpgradeId.DefenseAbsolute)),
		wsDefPct: Math.min(0.50, getWorkshopUpgradeEffect(WorkshopUpgradeId.DefensePercent, g(WorkshopUpgradeId.DefensePercent))),
		wsRegen: getWorkshopUpgradeEffect(WorkshopUpgradeId.Regen, g(WorkshopUpgradeId.Regen)),
		wsLifesteal: Math.min(0.10, getWorkshopUpgradeEffect(WorkshopUpgradeId.Lifesteal, g(WorkshopUpgradeId.Lifesteal))),
		wsThorns: getWorkshopUpgradeEffect(WorkshopUpgradeId.Thorns, g(WorkshopUpgradeId.Thorns)),
		killCoinBonus: Math.floor(g(WorkshopUpgradeId.CoinBonus) * 0.01) * lCoin,
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

function recompute(state: SimState, ws: ReturnType<typeof computeBaseline>, workshopLevels: Record<string, number>): void {
	const bl = (id: UpgradeId) => state.battleLevels[id] ?? 0;
	const g = (id: WorkshopUpgradeId) => workshopLevels[id] ?? 0;
	const l = (id: string) => state.labLevels[id] ?? 0;
	const lDmg = 1 + getLabEffect('damageResearch' as any, l('damageResearch'));

	state.damage = flatlandBaseDamageAtLevel(g(WorkshopUpgradeId.BaseDamage) + bl(UpgradeId.Damage)) * lDmg;
	state.fireRate = ws.fireRate + getBattleUpgradeEffect(UpgradeId.FireRate, bl(UpgradeId.FireRate));
	state.range = ws.range + getBattleUpgradeEffect(UpgradeId.Range, bl(UpgradeId.Range));
	state.multishotChance = getBattleUpgradeEffect(UpgradeId.Multishot, bl(UpgradeId.Multishot));
	state.multishotCount = 1 + getBattleUpgradeEffect(UpgradeId.MultishotProjectiles, bl(UpgradeId.MultishotProjectiles));
	state.critChance = Math.min(0.75, ws.critChance + getBattleUpgradeEffect(UpgradeId.CritChance, bl(UpgradeId.CritChance)));
	state.critMultiplier = 1.30 + getBattleUpgradeEffect(UpgradeId.CritMultiplier, bl(UpgradeId.CritMultiplier));
	state.defense = ws.wsDefAbs + getBattleUpgradeEffect(UpgradeId.Defense, bl(UpgradeId.Defense));
	state.defensePercent = Math.min(0.50, ws.wsDefPct + getBattleUpgradeEffect(UpgradeId.DefensePercent, bl(UpgradeId.DefensePercent)));
	state.regen = ws.wsRegen + getBattleUpgradeEffect(UpgradeId.Regen, bl(UpgradeId.Regen));
	state.lifesteal = Math.min(0.15, ws.wsLifesteal + getBattleUpgradeEffect(UpgradeId.Lifesteal, bl(UpgradeId.Lifesteal)));
	state.thorns = ws.wsThorns + getBattleUpgradeEffect(UpgradeId.Thorns, bl(UpgradeId.Thorns));
	
	const oldMaxHp = state.maxHp;
	const hpBonus = getBattleUpgradeEffect(UpgradeId.MaxHp, bl(UpgradeId.MaxHp));
	state.maxHp = Math.floor(ws.hp + hpBonus);
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
function tryUnlockBlueprints(_state: SimState, _bossesDefeated: number): void {
	// Paths are NOT auto-unlocked during simulation.
	// They must be passed via the unlockedBlueprints parameter.
	return;
}

export function simulateRun(
	workshopLevels: Record<string, number>,
	labLevels: Record<string, number> = {},
	maxWaves: number = 5000,
	tier: number = 1,
	strategy: Strategy = 'optimal',
	unlockedBlueprints: BlueprintId[] = [],
	randomSeed?: number,
): SimResult {
	// Seeded PRNG for deterministic simulations (uses mulberry32)
	let rngState = randomSeed ?? Math.floor(Math.random() * 2147483647);
	function rng(): number {
		rngState |= 0;
		rngState = rngState + 0x6D2B79F5 | 0;
		let t = Math.imul(rngState ^ rngState >>> 15, 1 | rngState);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
	const ws = computeBaseline(workshopLevels, labLevels);

	const state: SimState = {
		damage: ws.damage, fireRate: ws.fireRate, range: ws.range,
		multishotChance: 0, multishotCount: 1,
		critChance: ws.critChance, critMultiplier: 1.30,
		maxHp: ws.hp, hp: ws.hp,
		defense: ws.wsDefAbs, defensePercent: ws.wsDefPct,
		regen: ws.wsRegen, lifesteal: ws.wsLifesteal, thorns: ws.wsThorns,
		cash: ws.startingCash, coins: 0,
		wave: 0, kills: 0, cashEarned: ws.startingCash, coinsEarned: 0,
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
			// Locked without blueprints, listed for when available:
			UpgradeId.CashPerWave, UpgradeId.Multishot,
			UpgradeId.Defense, UpgradeId.DefensePercent, UpgradeId.Lifesteal,
			UpgradeId.Thorns, UpgradeId.Range, UpgradeId.EnergyAmp,
		];
		threshold = 2;
	}

	tryBuyUpgrades(state, priority, threshold);
	recompute(state, ws, workshopLevels);
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

		// Try to unlock blueprints as we progress
		tryUnlockBlueprints(state, totalBossesDefeated);

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

			const cashReward = config.cashReward * ws.cashMult;
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
				const bossCoins = Math.floor(5 * ws.coinMult * getFrontAlloyMultiplier(tier));
				state.coins += bossCoins;
				state.coinsEarned += bossCoins;
			}
		}
		if (state.hp <= 0) break;

		// Wave completion
		const cashBonus = getBattleUpgradeEffect(UpgradeId.CashPerWave, state.battleLevels[UpgradeId.CashPerWave] ?? 0);
		state.cash += cashBonus;
		state.cashEarned += cashBonus;

		const wc = waveCoinReward(wave, ws.coinMult, tier, getBattleUpgradeEffect(UpgradeId.AlloyPerWave, state.battleLevels[UpgradeId.AlloyPerWave] ?? 0));
		state.coins += wc;
		state.coinsEarned += wc;

		// Apply wave-completion healing: Math.max(30, Math.round(state.maxHp * 0.25))
		const healAfterWave = Math.max(30, Math.round(state.maxHp * 0.25));
		state.hp = Math.min(state.hp + healAfterWave, state.maxHp);

		// Re-check blueprint unlocks
		tryUnlockBlueprints(state, totalBossesDefeated);
		tryBuyUpgrades(state, priority, threshold);
		recompute(state, ws, workshopLevels);
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
		totalCoinsEarned: Math.floor(state.coinsEarned),
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
	workshop: Record<string, number>;
	labs: Record<string, number>;
	tier: number; strategy: Strategy;
	unlockedBlueprints: BlueprintId[];
	desc: string;
}

export const SCENARIOS: SimScenario[] = [
	{
		name: 'Fresh Confused', workshop: {}, labs: {}, tier: 1, strategy: 'confused',
		unlockedBlueprints: [],
		desc: 'First-ever run, confused buying (hoards cash, buys almost nothing). No blueprints.'
	},
	{
		name: 'Fresh Reasonable', workshop: {}, labs: {}, tier: 1, strategy: 'reasonable',
		unlockedBlueprints: [],
		desc: 'First run, reasonable buying (HP, damage, regen). No blueprints.'
	},
	{
		name: 'Fresh Optimal', workshop: {}, labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [],
		desc: 'First run, optimal priority buying. Only starter upgrades available.'
	},
	{
		name: 'Post First Achievement + 1 Forge', workshop: { [WorkshopUpgradeId.BaseDamage]: 1 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [],
		desc: 'After first deployment achievement (50 alloy) + one Forge damage upgrade.'
	},
	{
		name: 'After 3 Deployments / Few Forge', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 2,
			[WorkshopUpgradeId.StartingHp]: 1,
			[WorkshopUpgradeId.BaseFireRate]: 1,
		},
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell],
		desc: 'After a few deployments: 2 damage, 1 HP, 1 fire rate forge. Early blueprints.'
	},
	{
		name: 'First Boss Attempt', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 5,
			[WorkshopUpgradeId.StartingHp]: 3,
			[WorkshopUpgradeId.BaseFireRate]: 2,
			[WorkshopUpgradeId.Regen]: 1,
		},
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting],
		desc: 'Attempting first boss at wave 10. Moderate forge investment.'
	},
	{
		name: '5 Foundry Purchases', workshop: { [WorkshopUpgradeId.BaseDamage]: 3, [WorkshopUpgradeId.StartingHp]: 2 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell],
		desc: 'Minimal foundry: 3 damage, 2 HP. Early blueprints unlocked.'
	},
	{
		name: '25 Foundry Purchases', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 12, [WorkshopUpgradeId.StartingHp]: 5,
			[WorkshopUpgradeId.BaseFireRate]: 3, [WorkshopUpgradeId.Regen]: 3,
			[WorkshopUpgradeId.CoinBonus]: 2 },
		labs: {}, tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction],
		desc: '~25 foundry levels. Mid-game blueprints unlocked.'
	},
	{
		name: '100 Foundry + Early Labs', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 40, [WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 10, [WorkshopUpgradeId.BaseRange]: 5,
			[WorkshopUpgradeId.EnergyBonus]: 10, [WorkshopUpgradeId.CoinBonus]: 5,
			[WorkshopUpgradeId.DefenseAbsolute]: 5, [WorkshopUpgradeId.Regen]: 5 },
		labs: { damageResearch: 5, healthResearch: 3, attackSpeedResearch: 2 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction, BlueprintId.PhaseDampener, BlueprintId.SplitBeamGeometry, BlueprintId.EnergyCondenser, BlueprintId.DeploymentReserves, BlueprintId.ReactiveSurface],
		desc: '~100 foundry + early labs. Most blueprints unlocked.'
	},
	{
		name: '500 Foundry + Labs', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 200, [WorkshopUpgradeId.StartingHp]: 100,
			[WorkshopUpgradeId.BaseFireRate]: 40, [WorkshopUpgradeId.DefenseAbsolute]: 50,
			[WorkshopUpgradeId.BaseRange]: 20, [WorkshopUpgradeId.EnergyBonus]: 30,
			[WorkshopUpgradeId.CoinBonus]: 20, [WorkshopUpgradeId.Regen]: 10,
			[WorkshopUpgradeId.StartingEnergy]: 10, [WorkshopUpgradeId.DefensePercent]: 5,
			[WorkshopUpgradeId.Thorns]: 5, [WorkshopUpgradeId.CritBonus]: 5 },
		labs: { damageResearch: 40, healthResearch: 20, attackSpeedResearch: 15,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: '~500 foundry + 100 labs — meaningful long-term. All blueprints.'
	},
	{
		name: '1000 Foundry + 250 Labs', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 500, [WorkshopUpgradeId.StartingHp]: 300,
			[WorkshopUpgradeId.BaseFireRate]: 70, [WorkshopUpgradeId.DefenseAbsolute]: 100,
			[WorkshopUpgradeId.BaseRange]: 40, [WorkshopUpgradeId.Regen]: 30,
			[WorkshopUpgradeId.EnergyBonus]: 100, [WorkshopUpgradeId.CoinBonus]: 80,
			[WorkshopUpgradeId.StartingEnergy]: 30, [WorkshopUpgradeId.DefensePercent]: 15,
			[WorkshopUpgradeId.Thorns]: 15, [WorkshopUpgradeId.CritBonus]: 15,
			[WorkshopUpgradeId.Lifesteal]: 3 },
		labs: { damageResearch: 100, healthResearch: 80, attackSpeedResearch: 40,
			alloyEfficiency: 30, energyEfficiency: 20 },
		tier: 1, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'Deep veteran: ~1000 foundry + 250 labs. All blueprints.'
	},
	{
		name: 'Tier 2 First Try', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 40, [WorkshopUpgradeId.StartingHp]: 20,
			[WorkshopUpgradeId.BaseFireRate]: 10, [WorkshopUpgradeId.EnergyBonus]: 10,
			[WorkshopUpgradeId.CoinBonus]: 5, [WorkshopUpgradeId.DefenseAbsolute]: 5,
			[WorkshopUpgradeId.BaseRange]: 5 },
		labs: { damageResearch: 5, healthResearch: 3, attackSpeedResearch: 2 },
		tier: 2, strategy: 'optimal',
		unlockedBlueprints: [BlueprintId.ExtendedCoreOptics, BlueprintId.PlatedCoreShell, BlueprintId.CriticalTargeting, BlueprintId.AlloyExtraction, BlueprintId.SplitBeamGeometry, BlueprintId.EnergyCondenser, BlueprintId.DeploymentReserves],
		desc: 'Same as 100 foundry but Tier 2. Should be much harder.'
	},
	{
		name: 'Tier 2 Strong', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 200, [WorkshopUpgradeId.StartingHp]: 100,
			[WorkshopUpgradeId.BaseFireRate]: 40, [WorkshopUpgradeId.DefenseAbsolute]: 50,
			[WorkshopUpgradeId.BaseRange]: 20, [WorkshopUpgradeId.EnergyBonus]: 30,
			[WorkshopUpgradeId.CoinBonus]: 20, [WorkshopUpgradeId.Regen]: 10,
			[WorkshopUpgradeId.DefensePercent]: 5 },
		labs: { damageResearch: 40, healthResearch: 20, attackSpeedResearch: 15,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 2, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: '500 foundry farmer tries Tier 2.'
	},
	// ── 16-Front progression-structure scenarios (Part 11) ──
	{
		name: 'Front 5 Early (Redline opener)', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 200, [WorkshopUpgradeId.StartingHp]: 100,
			[WorkshopUpgradeId.BaseFireRate]: 40, [WorkshopUpgradeId.DefenseAbsolute]: 50,
			[WorkshopUpgradeId.BaseRange]: 20, [WorkshopUpgradeId.EnergyBonus]: 30,
			[WorkshopUpgradeId.CoinBonus]: 20, [WorkshopUpgradeId.Regen]: 10,
			[WorkshopUpgradeId.DefensePercent]: 5 },
		labs: { damageResearch: 60, healthResearch: 40, attackSpeedResearch: 20,
			alloyEfficiency: 15, energyEfficiency: 10 },
		tier: 5, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'First push onto Front 5 (Redline). Armor appears late (~Wave 100); denser waves (2.32×).'
	},
	{
		name: 'Front 9 Resistance Scaffold (Blacksite)', workshop: {
			[WorkshopUpgradeId.BaseDamage]: 500, [WorkshopUpgradeId.StartingHp]: 300,
			[WorkshopUpgradeId.BaseFireRate]: 70, [WorkshopUpgradeId.DefenseAbsolute]: 100,
			[WorkshopUpgradeId.BaseRange]: 40, [WorkshopUpgradeId.Regen]: 30,
			[WorkshopUpgradeId.DefensePercent]: 15, [WorkshopUpgradeId.CritBonus]: 15 },
		labs: { damageResearch: 120, healthResearch: 90, attackSpeedResearch: 50,
			alloyEfficiency: 30, energyEfficiency: 20 },
		tier: 9, strategy: 'optimal',
		unlockedBlueprints: Object.values(BlueprintId),
		desc: 'Front 9 (Blacksite) scaffold check — armor frequent, resistance scaffolding present, ~3.64× density.'
	},
];
