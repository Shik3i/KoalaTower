import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import {
	calculateEnergyFromKill,
	getWaveCoinReward,
	getBossCoinReward,
	getStartingEnergy,
	getWaveCompletionBonus,
} from '../systems/economySystem';
import { getFrontAlloyMultiplier } from '../balance/balanceMath';
import type { GameState } from '../engine/gameTypes';

/** A fresh, valid GameState for economy unit tests. */
function freshState(): GameState {
	return new GameEngine().state;
}

describe('Economy — Alloy (permanent currency)', () => {
	it('wave alloy reward is never negative across a wide wave range', () => {
		const state = freshState();
		for (const wave of [1, 5, 10, 11, 25, 26, 100, 1000, 10000]) {
			expect(getWaveCoinReward(state, wave)).toBeGreaterThanOrEqual(0);
		}
	});

	it('wave alloy reward stays finite at extreme waves (no overflow/NaN)', () => {
		const state = freshState();
		for (const tier of [1, 2, 3, 4, 5]) {
			state.tier = tier;
			const reward = getWaveCoinReward(state, 100000);
			expect(Number.isFinite(reward)).toBe(true);
			expect(reward).toBeGreaterThanOrEqual(0);
		}
	});

	it('progressive wave curve is monotonic at the tier boundaries', () => {
		const state = freshState();
		// Curve steps up at 10→11 and 25→26; rewards should not decrease.
		expect(getWaveCoinReward(state, 11)).toBeGreaterThanOrEqual(getWaveCoinReward(state, 10));
		expect(getWaveCoinReward(state, 26)).toBeGreaterThanOrEqual(getWaveCoinReward(state, 25));
	});

	it('higher fronts award more alloy via the front multiplier', () => {
		const s1 = freshState(); s1.tier = 1;
		const s5 = freshState(); s5.tier = 5;
		expect(getFrontAlloyMultiplier(5)).toBeGreaterThan(getFrontAlloyMultiplier(1));
		expect(getWaveCoinReward(s5, 50)).toBeGreaterThan(getWaveCoinReward(s1, 50));
	});

	it('boss alloy reward is positive and finite', () => {
		const state = freshState();
		const reward = getBossCoinReward(state);
		expect(reward).toBeGreaterThan(0);
		expect(Number.isFinite(reward)).toBe(true);
	});
});

describe('Economy — Energy (per-run currency)', () => {
	it('energy from a kill is never negative', () => {
		const state = freshState();
		for (const base of [0, 1, 2, 5, 20]) {
			expect(calculateEnergyFromKill(state, base)).toBeGreaterThanOrEqual(0);
		}
	});

	it('starting energy is the documented baseline before workshop upgrades', () => {
		const state = freshState();
		expect(getStartingEnergy(state)).toBe(100);
	});

	it('wave completion bonus grows with wave number', () => {
		const state = freshState();
		expect(getWaveCompletionBonus(state, 50)).toBeGreaterThan(getWaveCompletionBonus(state, 1));
	});
});
