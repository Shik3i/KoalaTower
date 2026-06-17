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

/** Gold from a kill — scales with wave, workshop, lab, and battle Cash Bonus. */
export function calculateGoldFromKill(state: GameState, baseReward: number): number {
	const wsCashLv = state.workshopUpgrades[WorkshopUpgradeId.CashBonus] ?? 0;
	const wsCashMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CashBonus, wsCashLv);
	const lab = getLabMultiplier(state);
	const battleBonus = (state.battleUpgrades[UpgradeId.GoldAmp] ?? 0) * 0.02;
	return Math.floor(baseReward * wsCashMult * lab.cash * (1 + battleBonus));
}

/**
 * Tiny kill coins — scales with Coin Bonus workshop.
 * baseCoinPerKill = floor(wsCoinLevel * 0.01)
 * At level 0: 0, level 50: 0, level 100: 1, level 1000: 10
 * Multiplied by lab Coin Research.
 */
export function getCoinsPerKill(state: GameState): number {
	const wsCoinLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const base = Math.floor(wsCoinLv * 0.01);
	if (base <= 0) return 0;
	const lab = getLabMultiplier(state);
	return Math.max(0, Math.floor(base * lab.coin));
}

/**
 * Wave completion coins — progressive curve:
 *   Wave 1-10:   wave × 0.4
 *   Wave 11-25:  wave × 0.7
 *   Wave 26+:    wave × 1.0
 * Multiplied by wsCoinMult × lab.coin.
 */
export function getWaveCoinReward(state: GameState, wave: number): number {
	const wsCoinLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsCoinMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsCoinLv);
	const lab = getLabMultiplier(state);
	const mult = wave <= 10 ? 0.5 : wave <= 25 ? 0.8 : 1.2;
	return Math.floor(wave * mult * wsCoinMult * lab.coin);
}

/** Boss kill bonus coins. */
export function getBossCoinReward(state: GameState): number {
	const wsCoinLv = state.workshopUpgrades[WorkshopUpgradeId.CoinBonus] ?? 0;
	const wsCoinMult = 1 + getWorkshopUpgradeEffect(WorkshopUpgradeId.CoinBonus, wsCoinLv);
	const lab = getLabMultiplier(state);
	return Math.floor(5 * wsCoinMult * lab.coin);
}

/** Starting gold for a run. */
export function getStartingGold(state: GameState): number {
	const lv = state.workshopUpgrades[WorkshopUpgradeId.StartingCash] ?? 0;
	return 20 + getWorkshopUpgradeEffect(WorkshopUpgradeId.StartingCash, lv);
}

/** Gold bonus on wave completion. */
export function getWaveCompletionBonus(state: GameState, wave: number): number {
	const base = 5 + wave;
	const cashWaveLv = state.battleUpgrades[UpgradeId.CashPerWave] ?? 0;
	return Math.floor(base + cashWaveLv * 3);
}

/** Legacy — kept for compat, returns 0 base (kill coins now use getCoinsPerKill). */
export function getAlloyPerKill(_state: GameState): number {
	return 0;
}
