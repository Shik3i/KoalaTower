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
import { getBattleUpgradeEffect } from '../balance/battleUpgrades';
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
	
	let baseReward = 0;
	if (wave <= 10) {
		baseReward = 3;
	} else if (wave <= 25) {
		baseReward = 4;
	} else {
		baseReward = Math.floor(wave * 0.2);
	}
	
	const front = getFrontAlloyMultiplier(state.tier ?? 1);
	return Math.floor(baseReward * wsAlloyMult * lab.alloy * front);
}

/** Alias for getWaveCoinReward to align with player-facing terminology. */
export const getWaveAlloyReward = getWaveCoinReward;

/** Boss kill bonus alloy. */
export function getBossCoinReward(state: GameState): number {
	const wsAlloyLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsAlloyMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsAlloyLv);
	const lab = getLabMultiplier(state.labLevels as Partial<Record<LabId, number>>);
	const front = getFrontAlloyMultiplier(state.tier ?? 1);
	return Math.floor(5 * wsAlloyMult * lab.alloy * front);
}

/** Alias for getBossCoinReward to align with player-facing terminology. */
export const getBossAlloyReward = getBossCoinReward;

/** Starting energy for a deployment. */
export function getStartingEnergy(state: GameState): number {
	const lv = state.workshopUpgrades[WorkshopUpgradeId.StartingEnergy] ?? 0;
	return 100 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingEnergy, lv);
}

/** Energy bonus on wave completion (driven by the Energy/Wave field upgrade). */
export function getWaveCompletionBonus(state: GameState, _wave: number): number {
	const cashWaveLv = state.battleUpgrades[UpgradeId.CashPerWave] ?? 0;
	return Math.floor(getBattleUpgradeEffect(UpgradeId.CashPerWave, cashWaveLv));
}
