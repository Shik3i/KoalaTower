import { describe, expect, it } from 'vitest';
import {
	SCHEMATIC_CONVERSION_RATE,
	STRANGE_MATTER_DAILY_PICKUP,
	STRANGE_MATTER_WEEKLY_SHIPMENT,
	WEEKLY_SHIPMENT_COOLDOWN_MS,
	canBuyBlackMarketUnlock,
	canClaimDailyStrangeMatter,
	canClaimWeeklyShipment,
	computeBlackMarketSignal,
	convertSchematics,
	getMaxUnlockedSpeed,
	isBlackMarketUnlocked,
	isSupportUrlConfigured,
	normalizeBlackMarketUnlocks,
	normalizeStrangeMatter,
	weeklyShipmentRemainingMs,
} from '../balance/blackMarket';
import { TierId } from '../engine/gameTypes';
import { emptySchematics } from '../balance/schematics';

describe('Black Market economy', () => {
	it('normalizes invalid Strange Matter safely', () => {
		expect(normalizeStrangeMatter(-5)).toBe(0);
		expect(normalizeStrangeMatter('12.9')).toBe(12);
		expect(normalizeStrangeMatter('nope')).toBe(0);
	});

	it('weekly shipment can be claimed only after seven days', () => {
		const now = Date.UTC(2026, 5, 18, 12);
		expect(canClaimWeeklyShipment(0, now)).toBe(true);
		expect(canClaimWeeklyShipment(now, now + WEEKLY_SHIPMENT_COOLDOWN_MS - 1)).toBe(false);
		expect(canClaimWeeklyShipment(now, now + WEEKLY_SHIPMENT_COOLDOWN_MS)).toBe(true);
		expect(weeklyShipmentRemainingMs(now, now + WEEKLY_SHIPMENT_COOLDOWN_MS)).toBe(0);
		expect(STRANGE_MATTER_WEEKLY_SHIPMENT).toBe(3);
	});

	it('daily pickup resets on the next local day without streaks', () => {
		const dayOne = new Date(2026, 5, 18, 10).getTime();
		const sameDay = new Date(2026, 5, 18, 23).getTime();
		const nextDay = new Date(2026, 5, 19, 1).getTime();
		expect(canClaimDailyStrangeMatter(true, 0, dayOne)).toBe(true);
		expect(canClaimDailyStrangeMatter(true, dayOne, sameDay)).toBe(false);
		expect(canClaimDailyStrangeMatter(true, dayOne, nextDay)).toBe(true);
		expect(STRANGE_MATTER_DAILY_PICKUP).toBe(1);
	});

	it('purchases enforce cost, persistence shape, duplicate guard, and x5 prerequisite', () => {
		expect(canBuyBlackMarketUnlock(0, {}, 'gameSpeed3').reason).toBe('insufficient');
		expect(canBuyBlackMarketUnlock(10, {}, 'gameSpeed3').ok).toBe(true);
		expect(canBuyBlackMarketUnlock(50, { gameSpeed3: true }, 'gameSpeed3').reason).toBe('owned');
		expect(canBuyBlackMarketUnlock(50, {}, 'gameSpeed5').reason).toBe('missingRequirement');
		expect(canBuyBlackMarketUnlock(50, { gameSpeed3: true }, 'gameSpeed5').ok).toBe(true);
		expect(canBuyBlackMarketUnlock(100, {}, 'outsourcedResearchLab').reason).toBe('scaffold');
		expect(normalizeBlackMarketUnlocks({ gameSpeed3: true, bogus: true })).toEqual({ gameSpeed3: true });
	});

	it('speed caps default to 2x and unlock upward', () => {
		expect(getMaxUnlockedSpeed({})).toBe(2);
		expect(getMaxUnlockedSpeed({ gameSpeed3: true })).toBe(3);
		expect(getMaxUnlockedSpeed({ gameSpeed3: true, gameSpeed5: true })).toBe(5);
	});

	it('treats placeholder support URLs as unavailable', () => {
		expect(isSupportUrlConfigured('#')).toBe(false);
		expect(isSupportUrlConfigured('')).toBe(false);
		expect(isSupportUrlConfigured('https://support.example.test')).toBe(false);
		expect(isSupportUrlConfigured('https://support.koalastuff.net')).toBe(true);
	});

	it('converts Schematics after unlock logic without charging Strange Matter per conversion', () => {
		const map = emptySchematics();
		map[1] = SCHEMATIC_CONVERSION_RATE;
		const result = convertSchematics(map, 1, 1);
		expect(result.ok).toBe(true);
		expect(result.schematics[1]).toBe(0);
		expect(result.schematics[2]).toBe(1);
	});

	it('refuses invalid Schematic conversion cases', () => {
		const map = emptySchematics();
		map[15] = SCHEMATIC_CONVERSION_RATE;
		expect(convertSchematics(map, 16, 1).reason).toBe('invalidFront');
		expect(convertSchematics(map, 15, 0).reason).toBe('invalidCount');
		expect(convertSchematics(map, 15, 2).reason).toBe('insufficient');
	});
});

describe('Black Market unlock gating', () => {
	it('is locked when no Front 2 progress exists', () => {
		expect(isBlackMarketUnlocked({})).toBe(false);
	});

	it('is locked when only Front 1 has any progress', () => {
		expect(isBlackMarketUnlocked({ [TierId.Tier1]: 50 })).toBe(false);
	});

	it('is locked when Front 1 has not reached wave 100', () => {
		expect(isBlackMarketUnlocked({ [TierId.Tier1]: 99 })).toBe(false);
	});

	it('unlocks when Front 1 reaches wave 100 (Front 2 = Perimeter ★)', () => {
		expect(isBlackMarketUnlocked({ [TierId.Tier1]: 100 })).toBe(true);
	});

	it('unlocks when Front 2 already has progress', () => {
		expect(isBlackMarketUnlocked({ [TierId.Tier1]: 100, [TierId.Tier2]: 50 })).toBe(true);
	});

	it('unlocks when all Perimeter Fronts are unlocked', () => {
		expect(isBlackMarketUnlocked({
			[TierId.Tier1]: 100,
			[TierId.Tier2]: 100,
			[TierId.Tier3]: 100,
			[TierId.Tier4]: 200, // unlocks Redline
		})).toBe(true);
	});
});

describe('Black Market signal state', () => {
	it('returns hidden when not unlocked', () => {
		expect(computeBlackMarketSignal({ unlocked: false, introSeen: false, weeklyReady: false, dailyReady: false })).toBe('hidden');
	});

	it('returns glow when newly unlocked and intro not seen', () => {
		expect(computeBlackMarketSignal({ unlocked: true, introSeen: false, weeklyReady: false, dailyReady: false })).toBe('glow');
	});

	it('returns glow when weekly shipment is available', () => {
		expect(computeBlackMarketSignal({ unlocked: true, introSeen: true, weeklyReady: true, dailyReady: false })).toBe('glow');
	});

	it('returns glow when daily pickup is claimable', () => {
		expect(computeBlackMarketSignal({ unlocked: true, introSeen: true, weeklyReady: false, dailyReady: true })).toBe('glow');
	});

	it('returns subtle when unlocked, intro seen, and nothing available', () => {
		expect(computeBlackMarketSignal({ unlocked: true, introSeen: true, weeklyReady: false, dailyReady: false })).toBe('subtle');
	});

	it('returns glow when both weekly and daily are available', () => {
		expect(computeBlackMarketSignal({ unlocked: true, introSeen: true, weeklyReady: true, dailyReady: true })).toBe('glow');
	});
});

describe('daily Strange Matter pickup (Black Market)', () => {
	const day1 = new Date(2024, 0, 1, 12, 0, 0).getTime();
	const day1Late = new Date(2024, 0, 1, 23, 30, 0).getTime();
	const day2 = new Date(2024, 0, 2, 9, 0, 0).getTime();

	it('is unavailable before the Black Market is unlocked', () => {
		expect(canClaimDailyStrangeMatter(false, 0, day1)).toBe(false);
	});

	it('is available once the Black Market is unlocked and never claimed', () => {
		expect(canClaimDailyStrangeMatter(true, 0, day1)).toBe(true);
	});

	it('cannot be claimed twice on the same local day', () => {
		// Claimed at noon → still the same calendar day at 23:30 → blocked.
		expect(canClaimDailyStrangeMatter(true, day1, day1Late)).toBe(false);
	});

	it('can be claimed again the next local day', () => {
		expect(canClaimDailyStrangeMatter(true, day1, day2)).toBe(true);
	});

	it('grants the +1 Strange Matter daily amount', () => {
		expect(STRANGE_MATTER_DAILY_PICKUP).toBe(1);
	});

	it('weekly shipment remains a separate +3 claim on its own cooldown', () => {
		expect(STRANGE_MATTER_WEEKLY_SHIPMENT).toBe(3);
		// A daily claim today does not consume the weekly cooldown.
		expect(canClaimWeeklyShipment(0, day1)).toBe(true);
		expect(canClaimWeeklyShipment(day1, day1 + WEEKLY_SHIPMENT_COOLDOWN_MS)).toBe(true);
	});

	it('does not depend on support-URL configuration', () => {
		// The claim takes no support argument — support state can never block it.
		expect(canClaimDailyStrangeMatter(true, 0, day1)).toBe(true);
	});
});
