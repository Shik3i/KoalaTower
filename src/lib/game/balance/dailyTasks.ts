/**
 * dailyTasks.ts — Daily Orbital Command assignments (Alloy rewards).
 *
 * Official Command work — distinct from the Black Market (which deals in illegal
 * Strange Matter). Each local day, Command issues a deterministic list of 25
 * assignments. Only 5 are visible at a time; claiming a completed one reveals
 * the next. Every 5 completed assignments unlocks a Command Gift Box (more
 * Alloy). No streaks, no login, no punishment for missing a day.
 *
 * Progress is tracked by daily "session counters" that accumulate from normal
 * play (kills, waves, purchases, …). Because counters are global for the day, a
 * task may already be partly or fully complete the moment it becomes visible.
 *
 * Determinism: the list for a day is a pure function of the local date key, so
 * it survives reloads and never depends on Date.now() at generation time.
 */

import { localDayKey } from './blackMarket';

export const DAILY_TASKS_VISIBLE = 5;
export const DAILY_TASKS_MAX_PER_DAY = 25;
export const DAILY_TASK_MILESTONES = [5, 10, 15, 20, 25] as const;

/** Fixed Alloy contents of each Command Gift Box milestone. */
export const GIFT_BOX_REWARDS: Record<number, number> = {
	5: 40,
	10: 75,
	15: 110,
	20: 150,
	25: 250,
};

/** Counter keys tracked per local day. */
export type DailyMetric =
	| 'deployments'
	| 'maxWave'
	| 'shapesKilled'
	| 'fastKills'
	| 'tankKills'
	| 'bossKills'
	| 'fieldUpgrades'
	| 'energySpent'
	| 'energyEarned'
	| 'alloyEarned'
	| 'bestKillstreak'
	| 'noDamageWave'
	| 'defenseUpgrades'
	| 'highestFrontDeploys'
	| 'researchClaims';

/** How a counter combines new values: sum (accumulate) or max (high-water mark). */
export const METRIC_KIND: Record<DailyMetric, 'sum' | 'max'> = {
	deployments: 'sum',
	maxWave: 'max',
	shapesKilled: 'sum',
	fastKills: 'sum',
	tankKills: 'sum',
	bossKills: 'sum',
	fieldUpgrades: 'sum',
	energySpent: 'sum',
	energyEarned: 'sum',
	alloyEarned: 'sum',
	bestKillstreak: 'max',
	noDamageWave: 'max',
	defenseUpgrades: 'sum',
	highestFrontDeploys: 'sum',
	researchClaims: 'sum',
};

/** Player progress used to filter out tasks that aren't reachable yet. */
export interface DailyTaskContext {
	highestWave: number;
	unlockedFrontCount: number;
}

interface TaskGenerator {
	key: DailyMetric;
	/** Per-tier targets (tier 0 = easy/teaching). */
	targets: number[];
	/** Per-tier Alloy rewards, aligned with `targets`. */
	rewards: number[];
	/** "reach" verb for max metrics, "do" verb for sums — drives the label. */
	label: (target: number) => string;
	/** True when this generator is reachable for the given progress. */
	eligible: (ctx: DailyTaskContext) => boolean;
}

/**
 * The assignment pool. Tier 0 of every generator is fresh-player friendly; later
 * tiers raise the target (and Alloy) so the 25/day ladder stays meaningful.
 */
const TASK_GENERATORS: TaskGenerator[] = [
	{
		key: 'deployments', targets: [1, 3, 6, 10], rewards: [8, 20, 45, 90],
		label: (t) => `Complete ${t} Deployment${t === 1 ? '' : 's'}`,
		eligible: () => true,
	},
	{
		key: 'shapesKilled', targets: [25, 60, 150, 300], rewards: [10, 25, 60, 120],
		label: (t) => `Destroy ${t} Shapes`,
		eligible: () => true,
	},
	{
		key: 'maxWave', targets: [5, 10, 20, 40], rewards: [10, 25, 60, 120],
		label: (t) => `Reach Wave ${t}`,
		eligible: () => true,
	},
	{
		key: 'fieldUpgrades', targets: [5, 10, 20, 40], rewards: [10, 20, 45, 90],
		label: (t) => `Buy ${t} Field Upgrades`,
		eligible: () => true,
	},
	{
		key: 'energyEarned', targets: [50, 150, 400, 1000], rewards: [8, 20, 45, 90],
		label: (t) => `Earn ${t} Energy`,
		eligible: () => true,
	},
	{
		key: 'energySpent', targets: [100, 300, 800, 2000], rewards: [8, 20, 45, 90],
		label: (t) => `Spend ${t} Energy`,
		eligible: () => true,
	},
	{
		key: 'alloyEarned', targets: [25, 75, 200, 500], rewards: [10, 25, 60, 120],
		label: (t) => `Earn ${t} Alloy`,
		eligible: () => true,
	},
	{
		key: 'bestKillstreak', targets: [10, 25, 50, 100], rewards: [10, 25, 60, 120],
		label: (t) => `Hold a Killstreak of ${t}`,
		eligible: () => true,
	},
	{
		key: 'fastKills', targets: [5, 15, 40, 100], rewards: [10, 25, 60, 120],
		label: (t) => `Destroy ${t} Fast Shapes`,
		eligible: (ctx) => ctx.highestWave >= 2,
	},
	{
		key: 'defenseUpgrades', targets: [1, 3, 6, 12], rewards: [12, 30, 60, 120],
		label: (t) => `Buy ${t} Defense upgrade${t === 1 ? '' : 's'}`,
		eligible: () => true,
	},
	{
		key: 'noDamageWave', targets: [3, 5, 10, 20], rewards: [12, 30, 70, 140],
		label: (t) => `Reach Wave ${t} with no tower damage`,
		eligible: () => true,
	},
	{
		key: 'highestFrontDeploys', targets: [1, 2, 4, 8], rewards: [10, 25, 55, 110],
		label: (t) => `Deploy on your highest Front ${t === 1 ? 'once' : t + ' times'}`,
		eligible: (ctx) => ctx.unlockedFrontCount >= 2,
	},
	{
		key: 'tankKills', targets: [3, 10, 25, 60], rewards: [12, 30, 70, 140],
		label: (t) => `Destroy ${t} Tank Shapes`,
		eligible: (ctx) => ctx.highestWave >= 5,
	},
	{
		key: 'researchClaims', targets: [1, 2, 4, 8], rewards: [15, 40, 80, 150],
		label: (t) => `Claim ${t} Research completion${t === 1 ? '' : 's'}`,
		eligible: (ctx) => ctx.highestWave >= 5,
	},
	{
		key: 'bossKills', targets: [1, 3, 8, 20], rewards: [15, 40, 80, 150],
		label: (t) => `Defeat ${t} Boss${t === 1 ? '' : 'es'}`,
		eligible: (ctx) => ctx.highestWave >= 10,
	},
];

/** A concrete assignment in a day's list. */
export interface DailyTaskInstance {
	/** 0-based position in the day's 25-task list. */
	slot: number;
	key: DailyMetric;
	target: number;
	reward: number;
	label: string;
}

/** Persisted daily-tasks state (see saveTypes DailyTasksState). */
export interface DailyTasksState {
	date: string;
	completedCount: number;
	claimedTaskSlots: number[];
	claimedMilestones: number[];
	counters: Partial<Record<DailyMetric, number>>;
}

export function createDefaultDailyTasksState(): DailyTasksState {
	return { date: '', completedCount: 0, claimedTaskSlots: [], claimedMilestones: [], counters: {} };
}

// ─── Deterministic RNG (mulberry32 seeded from the date key) ─────────────────

function hashStringToSeed(s: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Deterministic Fisher–Yates shuffle of a copy of `arr`. */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
	const out = arr.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		const tmp = out[i]!;
		out[i] = out[j]!;
		out[j] = tmp;
	}
	return out;
}

/**
 * Generate the deterministic 25-assignment list for a local day.
 *
 * The eligible generators are shuffled by the date seed, then laid into 25
 * slots round-robin: each reuse of a generator advances its tier (harder target,
 * more Alloy). The first `poolLen` slots are therefore all tier 0 — guaranteeing
 * the first visible assignments are always the easy, teaching ones.
 */
export function generateDailyTasks(dateKey: string, ctx: DailyTaskContext): DailyTaskInstance[] {
	const eligible = TASK_GENERATORS.filter((g) => g.eligible(ctx));
	// Defensive: there are always >5 always-eligible generators, but guard anyway.
	const pool = eligible.length > 0 ? eligible : TASK_GENERATORS;
	const rnd = mulberry32(hashStringToSeed(dateKey));
	const order = shuffle(pool, rnd);

	const list: DailyTaskInstance[] = [];
	for (let slot = 0; slot < DAILY_TASKS_MAX_PER_DAY; slot++) {
		const gen = order[slot % order.length]!;
		const tier = Math.min(Math.floor(slot / order.length), gen.targets.length - 1);
		const target = gen.targets[tier]!;
		const reward = gen.rewards[tier]!;
		list.push({ slot, key: gen.key, target, reward, label: gen.label(target) });
	}
	return list;
}

// ─── Pure state helpers ──────────────────────────────────────────────────────

/** Return state reset to a fresh day if `dateKey` differs; otherwise unchanged. */
export function rolloverDailyTasks(state: DailyTasksState, dateKey: string): DailyTasksState {
	if (state.date === dateKey) return state;
	return { date: dateKey, completedCount: 0, claimedTaskSlots: [], claimedMilestones: [], counters: {} };
}

export function isTaskComplete(task: DailyTaskInstance, counters: Partial<Record<DailyMetric, number>>): boolean {
	return (counters[task.key] ?? 0) >= task.target;
}

export function isTaskClaimed(state: DailyTasksState, slot: number): boolean {
	return state.claimedTaskSlots.includes(slot);
}

/** The up-to-5 currently-visible assignments: the first unclaimed slots. */
export function getVisibleTasks(list: DailyTaskInstance[], state: DailyTasksState): DailyTaskInstance[] {
	const visible: DailyTaskInstance[] = [];
	for (const task of list) {
		if (visible.length >= DAILY_TASKS_VISIBLE) break;
		if (!isTaskClaimed(state, task.slot)) visible.push(task);
	}
	return visible;
}

/** Whether a visible, completed, unclaimed task can be claimed right now. */
export function canClaimTask(list: DailyTaskInstance[], state: DailyTasksState, slot: number): boolean {
	if (state.completedCount >= DAILY_TASKS_MAX_PER_DAY) return false;
	if (isTaskClaimed(state, slot)) return false;
	const task = list.find((t) => t.slot === slot);
	if (!task) return false;
	if (!getVisibleTasks(list, state).some((t) => t.slot === slot)) return false;
	return isTaskComplete(task, state.counters);
}

/**
 * Claim a completed visible task. Returns the new state and the Alloy granted, or
 * null when the claim is not currently valid.
 */
export function claimTask(list: DailyTaskInstance[], state: DailyTasksState, slot: number): { state: DailyTasksState; reward: number } | null {
	if (!canClaimTask(list, state, slot)) return null;
	const task = list.find((t) => t.slot === slot)!;
	const next: DailyTasksState = {
		...state,
		claimedTaskSlots: [...state.claimedTaskSlots, slot],
		completedCount: Math.min(DAILY_TASKS_MAX_PER_DAY, state.completedCount + 1),
	};
	return { state: next, reward: task.reward };
}

/** Milestones whose gift box is unlocked but not yet claimed. */
export function claimableMilestones(state: DailyTasksState): number[] {
	return DAILY_TASK_MILESTONES.filter((m) => state.completedCount >= m && !state.claimedMilestones.includes(m));
}

export function canClaimMilestone(state: DailyTasksState, milestone: number): boolean {
	if (!DAILY_TASK_MILESTONES.includes(milestone as 5 | 10 | 15 | 20 | 25)) return false;
	return state.completedCount >= milestone && !state.claimedMilestones.includes(milestone);
}

/** Claim a Command Gift Box. Returns new state + Alloy, or null if not valid. */
export function claimMilestone(state: DailyTasksState, milestone: number): { state: DailyTasksState; reward: number } | null {
	if (!canClaimMilestone(state, milestone)) return null;
	const reward = GIFT_BOX_REWARDS[milestone] ?? 0;
	return {
		state: { ...state, claimedMilestones: [...state.claimedMilestones, milestone] },
		reward,
	};
}

/** Next gift-box milestone not yet reached (for the "3/5 until box" hint). */
export function nextMilestone(state: DailyTasksState): number | null {
	for (const m of DAILY_TASK_MILESTONES) {
		if (state.completedCount < m) return m;
	}
	return null;
}

/**
 * Fold a batch of metric deltas into the day's counters using each metric's
 * combine rule (sum vs max). Mutates and returns a NEW counters object.
 */
export function applyCounterDeltas(
	counters: Partial<Record<DailyMetric, number>>,
	deltas: Partial<Record<DailyMetric, number>>,
): Partial<Record<DailyMetric, number>> {
	const out: Partial<Record<DailyMetric, number>> = { ...counters };
	for (const [k, v] of Object.entries(deltas) as [DailyMetric, number][]) {
		if (v == null || !Number.isFinite(v)) continue;
		const kind = METRIC_KIND[k];
		const cur = out[k] ?? 0;
		out[k] = kind === 'max' ? Math.max(cur, v) : cur + Math.max(0, v);
	}
	return out;
}

/** Convenience: today's date key (delegates to the shared local-day helper). */
export function dailyTasksDateKey(now = Date.now()): string {
	return localDayKey(now);
}
