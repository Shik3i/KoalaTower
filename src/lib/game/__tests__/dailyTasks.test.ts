/**
 * dailyTasks.test.ts — Weekly Orbital Command Orders (Alloy assignments).
 */

import { describe, it, expect } from 'vitest';
import {
	generateCommandOrders,
	rolloverCommandOrders,
	getActiveOrders,
	getCompletedOrders,
	isOrderComplete,
	isOrderStarted,
	canClaimOrder,
	claimOrder,
	claimAllCompletedOrders,
	claimableMilestones,
	canClaimMilestone,
	claimMilestone,
	applyCounterDeltas,
	createDefaultCommandOrdersState,
	shouldRefreshBoard,
	refreshBoard,
	boardRefreshRemainingMs,
	formatRefreshCountdown,
	COMMAND_ORDERS_VISIBLE,
	COMMAND_ORDERS_MAX_PER_WEEK,
	COMMAND_ORDER_MILESTONES,
	GIFT_BOX_REWARDS,
	ORDER_BOARD_REFRESH_MS,
	type CommandOrdersState,
	type CommandOrderInstance,
} from '../balance/dailyTasks';

const FRESH = { highestWave: 0, unlockedFrontCount: 1 };
const VETERAN = { highestWave: 200, unlockedFrontCount: 5 };

function freshState(week = '2026-W25'): CommandOrdersState {
	return { ...createDefaultCommandOrdersState(), week };
}

/** Drive a pool to N claimed orders by satisfying + claiming the first N. */
function completeN(pool: CommandOrderInstance[], n: number): CommandOrdersState {
	let state = freshState();
	for (let i = 0; i < n; i++) {
		const visible = getActiveOrders(pool, state);
		const order = visible[0]!;
		state = { ...state, counters: applyCounterDeltas(state.counters, { [order.key]: order.target } as any) };
		const res = claimOrder(pool, state, order.slot);
		expect(res).not.toBeNull();
		state = res!.state;
	}
	return state;
}

describe('command order generation', () => {
	it('produces exactly 25 orders per week', () => {
		expect(generateCommandOrders('2026-W25', FRESH)).toHaveLength(COMMAND_ORDERS_MAX_PER_WEEK);
	});

	it('is deterministic for the same week + context', () => {
		const a = generateCommandOrders('2026-W25', FRESH);
		const b = generateCommandOrders('2026-W25', FRESH);
		expect(a).toEqual(b);
	});

	it('differs across weeks', () => {
		const a = generateCommandOrders('2026-W25', FRESH).map((t) => t.label);
		const b = generateCommandOrders('2026-W26', FRESH).map((t) => t.label);
		expect(a).not.toEqual(b);
	});

	it('excludes impossible orders for a fresh player (no Boss/Tank)', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		expect(pool.some((t) => t.key === 'bossKills')).toBe(false);
		expect(pool.some((t) => t.key === 'tankKills')).toBe(false);
	});

	it('first five orders are tier-0 (easy/teaching)', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		for (const t of pool.slice(0, COMMAND_ORDERS_VISIBLE)) {
			expect(t.target).toBeLessThanOrEqual(150);
		}
	});

	it('allows Boss/Tank/Research orders for a veteran', () => {
		const pool = generateCommandOrders('2026-W25', VETERAN);
		expect(pool.some((t) => t.key === 'bossKills')).toBe(true);
	});
});

describe('visible queue + claiming', () => {
	it('shows at most 5 orders at once', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		expect(getActiveOrders(pool, freshState()).length).toBe(COMMAND_ORDERS_VISIBLE);
	});

	it('claiming a completed order increments completed count and reveals the next', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		let state = freshState();
		const first = getActiveOrders(pool, state)[0]!;
		state = { ...state, counters: applyCounterDeltas(state.counters, { [first.key]: first.target } as any) };
		const res = claimOrder(pool, state, first.slot);
		expect(res).not.toBeNull();
		state = res!.state;
		expect(state.completedCount).toBe(1);
		const visibleAfter = getActiveOrders(pool, state);
		expect(visibleAfter.some((t) => t.slot === first.slot)).toBe(false);
		expect(visibleAfter.length).toBe(COMMAND_ORDERS_VISIBLE);
	});

	it('cannot claim an incomplete order', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const state = freshState();
		const first = getActiveOrders(pool, state)[0]!;
		expect(isOrderComplete(first, state.counters)).toBe(false);
		expect(canClaimOrder(pool, state, first.slot)).toBe(false);
		expect(claimOrder(pool, state, first.slot)).toBeNull();
	});

	it('allows claiming any completed order, even if far-off in the pool', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const farOrder = pool[20]!;
		const state = { ...freshState(), counters: applyCounterDeltas({}, { [farOrder.key]: 99999 } as any) };
		// Completed orders are always claimable — they don't need to be in the active visible list.
		expect(canClaimOrder(pool, state, farOrder.slot)).toBe(true);
		const res = claimOrder(pool, state, farOrder.slot);
		expect(res).not.toBeNull();
		expect(res!.reward).toBe(farOrder.reward);
	});

	it('stops at 25 completed orders per week', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const state = completeN(pool, COMMAND_ORDERS_MAX_PER_WEEK);
		expect(state.completedCount).toBe(COMMAND_ORDERS_MAX_PER_WEEK);
		expect(getActiveOrders(pool, state).length).toBe(0);
	});
});

describe('gift box milestones', () => {
	it('unlock at 5/10/15/20/25 completed orders', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		for (const m of COMMAND_ORDER_MILESTONES) {
			const state = completeN(pool, m);
			expect(canClaimMilestone(state, m)).toBe(true);
			expect(claimableMilestones(state)).toContain(m);
		}
	});

	it('a gift box cannot be claimed before its milestone', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const state = completeN(pool, 4);
		expect(canClaimMilestone(state, 5)).toBe(false);
		expect(claimMilestone(state, 5)).toBeNull();
	});

	it('a gift box cannot be claimed twice', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		let state = completeN(pool, 5);
		const res = claimMilestone(state, 5);
		expect(res).not.toBeNull();
		expect(res!.reward).toBe(GIFT_BOX_REWARDS[5]);
		state = res!.state;
		expect(canClaimMilestone(state, 5)).toBe(false);
		expect(claimMilestone(state, 5)).toBeNull();
	});

	it('gift box rewards are Alloy amounts that escalate', () => {
		expect(GIFT_BOX_REWARDS[5]).toBeLessThan(GIFT_BOX_REWARDS[25]!);
	});
});

describe('week rollover', () => {
	it('resets pool, completed count, claims and counters on a new week', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const used = completeN(pool, 6);
		const counters = applyCounterDeltas(used.counters, { shapesKilled: 500 });
		const stale = { ...used, counters };
		const rolled = rolloverCommandOrders(stale, '2026-W26');
		expect(rolled.week).toBe('2026-W26');
		expect(rolled.completedCount).toBe(0);
		expect(rolled.claimedOrderSlots).toEqual([]);
		expect(rolled.claimedMilestones).toEqual([]);
		expect(rolled.counters).toEqual({});
		expect(rolled.boardRefreshedAt).toBe(0);
	});

	it('does nothing when the week is unchanged', () => {
		const state = completeN(generateCommandOrders('2026-W25', FRESH), 3);
		expect(rolloverCommandOrders(state, state.week)).toBe(state);
	});
});

describe('board refresh / cooldown', () => {
	it('should refresh on first visit (boardRefreshedAt = 0)', () => {
		const state = freshState();
		expect(shouldRefreshBoard(state)).toBe(true);
	});

	it('should not refresh within the cooldown window', () => {
		const now = Date.now();
		const state = { ...freshState(), boardRefreshedAt: now };
		expect(shouldRefreshBoard(state, now + ORDER_BOARD_REFRESH_MS - 1000)).toBe(false);
	});

	it('should refresh after the cooldown expires', () => {
		const now = Date.now();
		const state = { ...freshState(), boardRefreshedAt: now };
		expect(shouldRefreshBoard(state, now + ORDER_BOARD_REFRESH_MS + 1000)).toBe(true);
	});

	it('refreshBoard updates the timestamp', () => {
		const now = Date.now();
		const state = refreshBoard(freshState(), now);
		expect(state.boardRefreshedAt).toBe(now);
	});

	it('boardRefreshRemainingMs returns the correct remaining time', () => {
		const now = Date.now();
		const state = { ...freshState(), boardRefreshedAt: now };
		const rem = boardRefreshRemainingMs(state, now + 1000);
		expect(rem).toBeGreaterThan(0);
		expect(rem).toBeLessThan(ORDER_BOARD_REFRESH_MS);
	});

	it('boardRefreshRemainingMs returns 0 when boardRefreshedAt is 0', () => {
		expect(boardRefreshRemainingMs(freshState())).toBe(0);
	});

	it('formatRefreshCountdown formats ms correctly', () => {
		expect(formatRefreshCountdown(0)).toBe('');
		expect(formatRefreshCountdown(1000)).toBe('00:01');
		expect(formatRefreshCountdown(60000)).toBe('01:00');
		expect(formatRefreshCountdown(3600000)).toBe('1:00:00');
		expect(formatRefreshCountdown(3662000)).toBe('1:01:02');
	});
});

describe('counter combine rules', () => {
	it('sums accumulating metrics and high-water-marks max metrics', () => {
		let c = applyCounterDeltas({}, { shapesKilled: 10, maxWave: 4 });
		c = applyCounterDeltas(c, { shapesKilled: 7, maxWave: 2 });
		expect(c.shapesKilled).toBe(17); // sum
		expect(c.maxWave).toBe(4);       // max
	});

	it('ignores non-finite deltas', () => {
		const c = applyCounterDeltas({ shapesKilled: 5 }, { shapesKilled: NaN } as any);
		expect(c.shapesKilled).toBe(5);
	});
});

describe('completed orders section', () => {
	it('getCompletedOrders returns completed-but-unclaimed orders', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999, deployments: 999 });
		const state = { ...freshState(), counters };
		const completed = getCompletedOrders(pool, state);
		expect(completed.length).toBeGreaterThan(0);
		for (const o of completed) {
			expect(isOrderComplete(o, state.counters)).toBe(true);
			expect(state.claimedOrderSlots.includes(o.slot)).toBe(false);
		}
	});

	it('completed orders are not in the active list', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999 });
		const state = { ...freshState(), counters };
		const active = getActiveOrders(pool, state);
		for (const o of active) {
			expect(isOrderComplete(o, state.counters)).toBe(false);
		}
	});

	it('claiming a completed order moves it out of completed and into claimed', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999 });
		let state = { ...freshState(), counters };
		const completed = getCompletedOrders(pool, state);
		expect(completed.length).toBeGreaterThan(0);
		const first = completed[0]!;
		const res = claimOrder(pool, state, first.slot);
		expect(res).not.toBeNull();
		state = res!.state;
		expect(state.claimedOrderSlots.includes(first.slot)).toBe(true);
		expect(getCompletedOrders(pool, state).some((o) => o.slot === first.slot)).toBe(false);
	});
});

describe('claim all', () => {
	it('claimAllCompletedOrders claims all completed orders at once', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999, deployments: 999, maxWave: 999 });
		const state = { ...freshState(), counters };
		const before = getCompletedOrders(pool, state);
		expect(before.length).toBeGreaterThan(1);
		const result = claimAllCompletedOrders(pool, state);
		expect(result).not.toBeNull();
		expect(result!.claimedCount).toBe(before.length);
		expect(result!.totalReward).toBeGreaterThan(0);
		expect(getCompletedOrders(pool, result!.state).length).toBe(0);
	});

	it('claimAllCompletedOrders cannot double-claim', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999, deployments: 999 });
		const state = { ...freshState(), counters };
		const result = claimAllCompletedOrders(pool, state);
		expect(result).not.toBeNull();
		const result2 = claimAllCompletedOrders(pool, result!.state);
		expect(result2).toBeNull();
	});

	it('claimAllCompletedOrders respects weekly max', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		// Complete 24 orders first
		let state = completeN(pool, 24);
		// Make every possible metric complete so remaining unclaimed orders are all done
		const maxAll: any = {};
		for (const o of pool) maxAll[o.key] = 99999;
		const counters = applyCounterDeltas(state.counters, maxAll);
		state = { ...state, counters };
		const completed = getCompletedOrders(pool, state);
		expect(completed.length).toBeGreaterThan(0);
		const result = claimAllCompletedOrders(pool, state);
		expect(result).not.toBeNull();
		// Should only claim 1 (the remaining slot to reach 25)
		expect(result!.claimedCount).toBe(1);
		expect(result!.state.completedCount).toBe(25);
	});

	it('claimAllCompletedOrders returns newly unlocked milestones', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		// Complete exactly 4 then make lots of orders complete so claimAll crosses 5
		let state = completeN(pool, 4);
		const counters = applyCounterDeltas(state.counters, { shapesKilled: 999, deployments: 999 });
		state = { ...state, counters };
		const result = claimAllCompletedOrders(pool, state);
		expect(result).not.toBeNull();
		expect(result!.state.completedCount).toBeGreaterThanOrEqual(5);
		expect(result!.newlyUnlockedMilestones).toContain(5);
	});
});

describe('board refresh safety', () => {
	it('started orders remain in active list after refresh', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 5 }); // partial progress
		const state = { ...freshState(), counters, boardRefreshedAt: Date.now() - ORDER_BOARD_REFRESH_MS - 1 };
		// After refresh (boardRefreshedAt expired), started orders should still be visible
		expect(shouldRefreshBoard(state)).toBe(true);
		const active = getActiveOrders(pool, state);
		const started = pool.filter((o) => isOrderStarted(o, state.counters));
		for (const s of started) {
			expect(active.some((a) => a.slot === s.slot)).toBe(true);
		}
	});

	it('completed-but-unclaimed orders survive board refresh', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const counters = applyCounterDeltas({}, { shapesKilled: 999 });
		const state = { ...freshState(), counters, boardRefreshedAt: Date.now() - ORDER_BOARD_REFRESH_MS - 1 };
		expect(shouldRefreshBoard(state)).toBe(true);
		const completed = getCompletedOrders(pool, state);
		expect(completed.length).toBeGreaterThan(0);
	});

	it('empty slots are filled on refresh', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const state = freshState();
		const active = getActiveOrders(pool, state);
		expect(active.length).toBe(COMMAND_ORDERS_VISIBLE);
		// All should be unstarted fresh orders
		for (const o of active) {
			expect(isOrderStarted(o, state.counters)).toBe(false);
		}
	});

	it('isOrderStarted detects partial progress correctly', () => {
		const pool = generateCommandOrders('2026-W25', FRESH);
		const order = pool[0]!;
		const counters = applyCounterDeltas({}, { [order.key]: 1 });
		expect(isOrderStarted(order, counters)).toBe(order.target > 1);
		// Complete: no longer "started"
		const full = applyCounterDeltas({}, { [order.key]: order.target + 1 });
		expect(isOrderStarted(order, full)).toBe(false);
		// Zero: not started
		expect(isOrderStarted(order, {})).toBe(false);
	});
});
