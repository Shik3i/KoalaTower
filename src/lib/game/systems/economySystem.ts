/**
 * economySystem.ts — Gold and Coin economy.
 *
 * Coins come from three sources:
 *   1. Kill coins: tiny per-kill amount, scales with Coin Bonus workshop
 *   2. Wave completion: primary early source, progressive curve
 *   3. Boss kills: bonus coins per boss
 *   4. Milestones: one-time rewards (from milestones.ts)
 *
 * All coin sources are multiplied by workshop Coin Bonus + lab Coin Research.
 */

import { WorkshopUpgradeId, LabId, UpgradeId, type GameState } from '../engine/gameTypes';
import { getWorkshopUpgradeEffect } from '../balance/workshopUpgrades';
import { getLabMultiplier } from '../balance/labs';

/** Energy from a kill — scales with wave, workshop, lab, and Energy Amp. */
export function calculateEnergyFromKill(state: GameState, baseReward: number): number {
	const wsEnergyLv = state.workshopUpgrades[WorkshopUpgradeId.EnergyBonus] ?? 0;
	const wsEnergyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.EnergyBonus, wsEnergyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const battleBonus = (state.battleUpgrades[UpgradeId.EnergyAmp] ?? 0) * 0.02;
	return Math.floor(baseReward * wsEnergyMult * lab.energy * (1 + battleBonus));
}

/**
 * Tiny kill alloy — scales with Alloy Bonus workshop.
 * baseAlloyPerKill = floor(wsAlloyLevel * 0.01)
 * At level 0: 0, level 50: 0, level 100: 1, level 1000: 10
 * Multiplied by lab Alloy Research.
 */
export function getCoinsPerKill(state: GameState): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const base = Math.floor(wsAlloyLv * 0.01);
	if (base <= 0) return 0;
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	return Math.max(0, Math.floor(base * lab.alloy));
}

/**
 * Wave completion alloy — progressive curve:
 *   Wave 1-10:   wave × 0.4
 *   Wave 11-25:  wave × 0.7
 *   Wave 26+:    wave × 1.0
 * Multiplied by wsAlloyMult × lab.alloy.
 */
export function getWaveCoinReward(state: GameState, wave: number): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsAlloyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsAlloyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const mult = wave <= 10 ? 0.5 : wave <= 25 ? 0.8 : 1.2;
	return Math.floor(wave * mult * wsAlloyMult * lab.alloy);
}

/** Boss kill bonus alloy. */
export function getBossCoinReward(state: GameState): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsAlloyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsAlloyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	return Math.floor(5 * wsAlloyMult * lab.alloy);
}

/** Starting energy for a deployment. */
export function getStartingEnergy(state: GameState): number {
	const lv = state.workshopUpgrades[WorkshopUpgradeId.StartingEnergy] ?? 0;
	return 20 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingEnergy, lv);
}

/** Gold bonus on wave completion. */
export function getWaveCompletionBonus(state: GameState, wave: number): number {
	const base = 5 + wave;
	const cashWaveLv = state.battleUpgrades[UpgradeId.CashPerWave] ?? 0;
	return Math.floor(base + cashWaveLv * 1);
}

/** Legacy — kept for compat, returns 0 base (kill coins now use getCoinsPerKill). */
export function getAlloyPerKill(_state: GameState): number {
	return 0;
}
