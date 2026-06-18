/**
 * dailyTasks.test.ts — Daily Orbital Command tasks (Alloy assignments).
 */

import { describe, it, expect } from 'vitest';
import {
	generateDailyTasks,
	rolloverDailyTasks,
	getVisibleTasks,
	isTaskComplete,
	canClaimTask,
	claimTask,
	claimableMilestones,
	canClaimMilestone,
	claimMilestone,
	applyCounterDeltas,
	createDefaultDailyTasksState,
	DAILY_TASKS_VISIBLE,
	DAILY_TASKS_MAX_PER_DAY,
	DAILY_TASK_MILESTONES,
	GIFT_BOX_REWARDS,
	type DailyTasksState,
	type DailyTaskInstance,
} from '../balance/dailyTasks';

const FRESH = { highestWave: 0, unlockedFrontCount: 1 };
const VETERAN = { highestWave: 200, unlockedFrontCount: 5 };

function freshState(date = '2026-06-18'): DailyTasksState {
	return { ...createDefaultDailyTasksState(), date };
}

/** Drive a list to N claimed tasks by satisfying + claiming the first N. */
function completeN(list: DailyTaskInstance[], n: number): DailyTasksState {
	let state = freshState();
	for (let i = 0; i < n; i++) {
		const visible = getVisibleTasks(list, state);
		const task = visible[0]!;
		// Force-complete the front task's metric.
		state = { ...state, counters: applyCounterDeltas(state.counters, { [task.key]: task.target } as any) };
		const res = claimTask(list, state, task.slot);
		expect(res).not.toBeNull();
		state = res!.state;
	}
	return state;
}

describe('daily task generation', () => {
	it('produces exactly 25 assignments', () => {
		expect(generateDailyTasks('2026-06-18', FRESH)).toHaveLength(DAILY_TASKS_MAX_PER_DAY);
	});

	it('is deterministic for the same date + context', () => {
		const a = generateDailyTasks('2026-06-18', FRESH);
		const b = generateDailyTasks('2026-06-18', FRESH);
		expect(a).toEqual(b);
	});

	it('differs across dates', () => {
		const a = generateDailyTasks('2026-06-18', FRESH).map((t) => t.label);
		const b = generateDailyTasks('2026-06-19', FRESH).map((t) => t.label);
		expect(a).not.toEqual(b);
	});

	it('excludes impossible tasks for a fresh player (no Boss/Tank)', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		expect(list.some((t) => t.key === 'bossKills')).toBe(false);
		expect(list.some((t) => t.key === 'tankKills')).toBe(false);
	});

	it('first five assignments are tier-0 (easy/teaching)', () => {
		// With the round-robin tiering, the opening visible window is all tier 0.
		const list = generateDailyTasks('2026-06-18', FRESH);
		// deployments tier-0 target is 1; shapesKilled tier-0 is 25 — none are the
		// large later-tier targets.
		for (const t of list.slice(0, DAILY_TASKS_VISIBLE)) {
			expect(t.target).toBeLessThanOrEqual(150);
		}
	});

	it('allows Boss/Tank/Research tasks for a veteran', () => {
		const list = generateDailyTasks('2026-06-18', VETERAN);
		expect(list.some((t) => t.key === 'bossKills')).toBe(true);
	});
});

describe('visible queue + claiming', () => {
	it('shows at most 5 tasks at once', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		expect(getVisibleTasks(list, freshState()).length).toBe(DAILY_TASKS_VISIBLE);
	});

	it('claiming a completed task increments completed count and reveals the next', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		let state = freshState();
		const first = getVisibleTasks(list, state)[0]!;
		state = { ...state, counters: applyCounterDeltas(state.counters, { [first.key]: first.target } as any) };
		const res = claimTask(list, state, first.slot);
		expect(res).not.toBeNull();
		state = res!.state;
		expect(state.completedCount).toBe(1);
		const visibleAfter = getVisibleTasks(list, state);
		expect(visibleAfter.some((t) => t.slot === first.slot)).toBe(false);
		expect(visibleAfter.length).toBe(DAILY_TASKS_VISIBLE);
	});

	it('cannot claim an incomplete task', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		const state = freshState();
		const first = getVisibleTasks(list, state)[0]!;
		expect(isTaskComplete(first, state.counters)).toBe(false);
		expect(canClaimTask(list, state, first.slot)).toBe(false);
		expect(claimTask(list, state, first.slot)).toBeNull();
	});

	it('cannot claim a non-visible (far-off) task even if complete', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		const farTask = list[20]!;
		const state = { ...freshState(), counters: applyCounterDeltas({}, { [farTask.key]: 99999 } as any) };
		expect(canClaimTask(list, state, farTask.slot)).toBe(false);
	});

	it('stops at 25 completed tasks per day', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		const state = completeN(list, DAILY_TASKS_MAX_PER_DAY);
		expect(state.completedCount).toBe(DAILY_TASKS_MAX_PER_DAY);
		expect(getVisibleTasks(list, state).length).toBe(0);
	});
});

describe('gift box milestones', () => {
	it('unlock at 5/10/15/20/25 completed tasks', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		for (const m of DAILY_TASK_MILESTONES) {
			const state = completeN(list, m);
			expect(canClaimMilestone(state, m)).toBe(true);
			expect(claimableMilestones(state)).toContain(m);
		}
	});

	it('a gift box cannot be claimed before its milestone', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		const state = completeN(list, 4);
		expect(canClaimMilestone(state, 5)).toBe(false);
		expect(claimMilestone(state, 5)).toBeNull();
	});

	it('a gift box cannot be claimed twice', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		let state = completeN(list, 5);
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

describe('day rollover', () => {
	it('resets list, completed count, claims and counters on a new local day', () => {
		const list = generateDailyTasks('2026-06-18', FRESH);
		const used = completeN(list, 6);
		const counters = applyCounterDeltas(used.counters, { shapesKilled: 500 });
		const stale = { ...used, counters };
		const rolled = rolloverDailyTasks(stale, '2026-06-19');
		expect(rolled.date).toBe('2026-06-19');
		expect(rolled.completedCount).toBe(0);
		expect(rolled.claimedTaskSlots).toEqual([]);
		expect(rolled.claimedMilestones).toEqual([]);
		expect(rolled.counters).toEqual({});
	});

	it('does nothing when the date is unchanged', () => {
		const state = completeN(generateDailyTasks('2026-06-18', FRESH), 3);
		expect(rolloverDailyTasks(state, state.date)).toBe(state);
	});
});

describe('counter combine rules', () => {
	it('sums accumulating metrics and high-water-marks max metrics', () => {
		let c = applyCounterDeltas({}, { shapesKilled: 10, maxWave: 4 });
		c = applyCounterDeltas(c, { shapesKilled: 7, maxWave: 2 });
		expect(c.shapesKilled).toBe(17); // sum
		expect(c.maxWave).toBe(4);       // max (not 6, not 2)
	});

	it('ignores non-finite deltas', () => {
		const c = applyCounterDeltas({ shapesKilled: 5 }, { shapesKilled: NaN } as any);
		expect(c.shapesKilled).toBe(5);
	});
});
