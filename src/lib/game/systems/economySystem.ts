/**
 * economySystem.ts — Energy (per-run) and Alloy (permanent) economy.
 *
 * Alloy comes from:
 *   1. Wave completion: primary source, progressive curve (getWaveCoinReward)
 *   2. Boss kills: flat bonus per boss (getBossCoinReward)
 *   3. Shiny enemy kills: flat reward (handled in enemySystem)
 *   4. Milestones & achievements: one-time rewards
 *
 * All Alloy sources are multiplied by the workshop Alloy Bonus, lab Alloy
 * Research, and the per-front Alloy multiplier.
 */

import { WorkshopUpgradeId, LabId, UpgradeId, type GameState } from '../engine/gameTypes';
import { getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';
import { getLabMultiplier } from '../balance/labs';
import { getFrontAlloyMultiplier } from '../balance/balanceMath';

/** Energy from a kill — scales with wave, workshop, lab, and Energy Amp. */
export function calculateEnergyFromKill(state: GameState, baseReward: number): number {
	const wsEnergyLv = state.workshopUpgrades[WorkshopUpgradeId.EnergyBonus] ?? 0;
	const wsEnergyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.EnergyBonus, wsEnergyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const battleBonus = (state.battleUpgrades[UpgradeId.EnergyAmp] ?? 0) * 0.02;
	return Math.floor(baseReward * wsEnergyMult * lab.energy * (1 + battleBonus));
}

/**
 * Wave completion alloy — progressive curve:
 *   Wave 1-10:   wave × 0.5
 *   Wave 11-25:  wave × 0.8
 *   Wave 26+:    wave × 1.2
 * Multiplied by wsAlloyMult × lab.alloy × front multiplier.
 */
export function getWaveCoinReward(state: GameState, wave: number): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsAlloyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsAlloyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const mult = wave <= 10 ? 0.5 : wave <= 25 ? 0.8 : 1.2;
	const front = getFrontAlloyMultiplier(state.tier ?? 1);
	return Math.floor(wave * mult * wsAlloyMult * lab.alloy * front);
}

/** Boss kill bonus alloy. */
export function getBossCoinReward(state: GameState): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsAlloyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsAlloyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const front = getFrontAlloyMultiplier(state.tier ?? 1);
	return Math.floor(5 * wsAlloyMult * lab.alloy * front);
}

/** Starting energy for a deployment. */
export function getStartingEnergy(state: GameState): number {
	const lv = state.workshopUpgrades[WorkshopUpgradeId.StartingEnergy] ?? 0;
	return 100 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingEnergy, lv);
}

/** Energy bonus on wave completion (scales with the Cash-Per-Wave field upgrade). */
export function getWaveCompletionBonus(state: GameState, wave: number): number {
	const base = 5 + wave;
	const cashWaveLv = state.battleUpgrades[UpgradeId.CashPerWave] ?? 0;
	return Math.floor(base + cashWaveLv * 1);
}
