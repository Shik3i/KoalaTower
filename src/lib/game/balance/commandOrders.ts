/**
 * commandOrders.ts — Weekly Orbital Command Orders (Alloy rewards).
 *
 * Official Command assignments — distinct from the Black Market (which deals in
 * illegal Strange Matter). Each local week, Command issues a deterministic pool
 * of 25 orders. Up to 5 active orders are shown; orders the player has started
 * remain visible until claimed. Completed-but-unclaimed orders move to a
 * separate "Completed" section with a Claim All button. The order board
 * refreshes every 4 hours, but only fills empty slots — it never removes
 * started or completed orders. Weekly Command Favor increments on claim, not
 * on completion. No streaks, no FOMO, no punishment for missing a day.
 */

// ─── Week key ───────────────────────────────────────────────────────────────

export function localWeekKey(timestamp = Date.now()): string {
	const d = new Date(timestamp);
	const day = d.getDay();
	const monday = new Date(d);
	monday.setDate(d.getDate() - ((day + 6) % 7));
	const y = monday.getFullYear();
	const jan4 = new Date(y, 0, 4);
	const jan4Day = jan4.getDay();
	const firstMonday = new Date(jan4);
	firstMonday.setDate(jan4.getDate() - ((jan4Day + 6) % 7));
	const weekNum = Math.floor((monday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
	return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const COMMAND_ORDERS_VISIBLE = 5;
export const COMMAND_ORDERS_MAX_PER_WEEK = 25;
export const COMMAND_ORDER_MILESTONES = [5, 10, 15, 20, 25] as const;

export const ORDER_BOARD_REFRESH_MS = 4 * 60 * 60 * 1000;

export const GIFT_BOX_REWARDS: Record<number, number> = {
	5: 40,
	10: 75,
	15: 110,
	20: 150,
	25: 250,
};

export type CommandMetric =
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

export const METRIC_KIND: Record<CommandMetric, 'sum' | 'max'> = {
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

export interface CommandOrderContext {
	highestWave: number;
	unlockedFrontCount: number;
}

interface OrderGenerator {
	key: CommandMetric;
	targets: number[];
	rewards: number[];
	label: (target: number) => string;
	eligible: (ctx: CommandOrderContext) => boolean;
}

const ORDER_GENERATORS: OrderGenerator[] = [
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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CommandOrderInstance {
	slot: number;
	key: CommandMetric;
	target: number;
	reward: number;
	label: string;
}

/** Persisted Command Orders state. */
export interface CommandOrdersState {
	week: string;
	completedCount: number;
	claimedOrderSlots: number[];
	claimedMilestones: number[];
	counters: Partial<Record<CommandMetric, number>>;
	boardRefreshedAt: number;
	/**
	 * Slots currently admitted to the visible Active board. Completing or claiming
	 * an order leaves its slot empty; empty slots are only refilled when the board
	 * refresh timer (ORDER_BOARD_REFRESH_MS) elapses — never instantly. Undefined
	 * on legacy saves; `ensureBoard` seeds it on first load.
	 */
	boardSlots?: number[];
}

export function createDefaultCommandOrdersState(): CommandOrdersState {
	return { week: '', completedCount: 0, claimedOrderSlots: [], claimedMilestones: [], counters: {}, boardRefreshedAt: 0 };
}

// ─── RNG ────────────────────────────────────────────────────────────────────

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

export function generateCommandOrders(weekKey: string, ctx: CommandOrderContext): CommandOrderInstance[] {
	const eligible = ORDER_GENERATORS.filter((g) => g.eligible(ctx));
	const pool = eligible.length > 0 ? eligible : ORDER_GENERATORS;
	const rnd = mulberry32(hashStringToSeed(weekKey));
	const order = shuffle(pool, rnd);

	const list: CommandOrderInstance[] = [];
	for (let slot = 0; slot < COMMAND_ORDERS_MAX_PER_WEEK; slot++) {
		const gen = order[slot % order.length]!;
		const tier = Math.min(Math.floor(slot / order.length), gen.targets.length - 1);
		const target = gen.targets[tier]!;
		const reward = gen.rewards[tier]!;
		list.push({ slot, key: gen.key, target, reward, label: gen.label(target) });
	}
	return list;
}

// ─── Week rollover ──────────────────────────────────────────────────────────

export function rolloverCommandOrders(state: CommandOrdersState, weekKey: string): CommandOrdersState {
	if (state.week === weekKey) return state;
	return { week: weekKey, completedCount: 0, claimedOrderSlots: [], claimedMilestones: [], counters: {}, boardRefreshedAt: 0 };
}

// ─── Board refresh ──────────────────────────────────────────────────────────

export function shouldRefreshBoard(state: CommandOrdersState, now = Date.now()): boolean {
	if (state.boardRefreshedAt <= 0) return true;
	return now - state.boardRefreshedAt >= ORDER_BOARD_REFRESH_MS;
}

export function refreshBoard(state: CommandOrdersState, now = Date.now()): CommandOrdersState {
	return { ...state, boardRefreshedAt: now };
}

/** Whether a slot still belongs on the Active board (not claimed, not completed). */
function slotIsActive(slot: number, pool: CommandOrderInstance[], state: CommandOrdersState): boolean {
	const o = pool.find(p => p.slot === slot);
	if (!o) return false;
	if (isOrderClaimed(state, slot)) return false;
	if (isOrderComplete(o, state.counters)) return false;
	return true;
}

/** Append the next available (unclaimed, incomplete, off-board) slots up to the cap. */
function fillBoard(board: number[], pool: CommandOrderInstance[], state: CommandOrdersState): number[] {
	const next = [...board];
	for (const o of pool) {
		if (next.length >= COMMAND_ORDERS_VISIBLE) break;
		if (next.includes(o.slot)) continue;
		if (isOrderClaimed(state, o.slot)) continue;
		if (isOrderComplete(o, state.counters)) continue;
		next.push(o.slot);
	}
	return next;
}

/**
 * Seed `boardSlots` for legacy/new states that don't have it yet, WITHOUT
 * resetting the refresh timer. Started orders are kept on the board first, then
 * the board is topped up — i.e. it mirrors the old instant-fill once, after
 * which refills only happen on the timer.
 */
export function ensureBoard(state: CommandOrdersState, pool: CommandOrderInstance[]): CommandOrdersState {
	if (state.boardSlots !== undefined) return state;
	const started: number[] = [];
	for (const o of pool) {
		if (started.length >= COMMAND_ORDERS_VISIBLE) break;
		if (!slotIsActive(o.slot, pool, state)) continue;
		if (isOrderStarted(o, state.counters)) started.push(o.slot);
	}
	return { ...state, boardSlots: fillBoard(started, pool, state) };
}

/**
 * Board refresh: drop claimed/completed slots, then top up to the cap with new
 * orders and stamp the refresh time. This is the ONLY path that introduces fresh
 * orders — completing one mid-cycle just leaves a gap until the next refresh.
 */
export function applyBoardRefresh(state: CommandOrdersState, pool: CommandOrderInstance[], now = Date.now()): CommandOrdersState {
	const kept = (state.boardSlots ?? []).filter(slot => slotIsActive(slot, pool, state));
	return { ...state, boardSlots: fillBoard(kept, pool, state), boardRefreshedAt: now };
}

export function boardRefreshRemainingMs(state: CommandOrdersState, now = Date.now()): number {
	if (state.boardRefreshedAt <= 0) return 0;
	return Math.max(0, ORDER_BOARD_REFRESH_MS - (now - state.boardRefreshedAt));
}

export function formatRefreshCountdown(ms: number): string {
	if (ms <= 0) return '';
	const totalSec = Math.ceil(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Order state helpers ────────────────────────────────────────────────────

export function isOrderComplete(order: CommandOrderInstance, counters: Partial<Record<CommandMetric, number>>): boolean {
	return (counters[order.key] ?? 0) >= order.target;
}

export const isTaskComplete = isOrderComplete;

export function isOrderClaimed(state: CommandOrdersState, slot: number): boolean {
	return state.claimedOrderSlots.includes(slot);
}

export const isTaskClaimed = isOrderClaimed;

/** Whether the player has any progress on this order (>0 but not yet complete). */
export function isOrderStarted(order: CommandOrderInstance, counters: Partial<Record<CommandMetric, number>>): boolean {
	const prog = counters[order.key] ?? 0;
	return prog > 0 && prog < order.target;
}

// ─── Active (visible) orders — board-refresh-safe ───────────────────────────

/**
 * Get the currently active (visible) orders — up to COMMAND_ORDERS_VISIBLE.
 *
 * Rules (board-refresh-safe):
 * 1. All started-but-incomplete orders remain visible until claimed.
 * 2. Completed-but-unclaimed orders move to the Completed section.
 * 3. Remaining slots (up to 5) are filled from the next unclaimed, unstarted
 *    orders in the pool.
 * 4. Board refresh never removes started or completed orders — it only fills
 *    empty slots.
 */
export function getActiveOrders(pool: CommandOrderInstance[], state: CommandOrdersState): CommandOrderInstance[] {
	if (state.completedCount >= COMMAND_ORDERS_MAX_PER_WEEK) return [];

	// Board-slot model: show exactly the slots admitted to the board (minus any
	// since claimed/completed). Empty gaps persist until the refresh timer tops
	// the board up again — completing an order never refills instantly.
	if (state.boardSlots !== undefined) {
		const result: CommandOrderInstance[] = [];
		for (const slot of state.boardSlots) {
			const o = pool.find(p => p.slot === slot);
			if (!o || !slotIsActive(slot, pool, state)) continue;
			result.push(o);
		}
		return result.slice(0, COMMAND_ORDERS_VISIBLE);
	}

	// ── Legacy path (no persisted board) — instant-fill, kept for old saves. ──
	// 1. Collect all started-but-incomplete orders.
	const started: CommandOrderInstance[] = [];
	for (const o of pool) {
		if (isOrderClaimed(state, o.slot)) continue;
		if (isOrderComplete(o, state.counters)) continue; // completed → separate section
		if (isOrderStarted(o, state.counters)) started.push(o);
	}

	// 2. Fill remaining slots from the pool (unclaimed, unstarted, incomplete).
	const fresh: CommandOrderInstance[] = [];
	for (const o of pool) {
		if (isOrderClaimed(state, o.slot)) continue;
		if (isOrderComplete(o, state.counters)) continue;
		if (isOrderStarted(o, state.counters)) continue;
		fresh.push(o);
	}

	// 3. Combine: started first, then fill with fresh.
	const result = [...started];
	for (const o of fresh) {
		if (result.length >= COMMAND_ORDERS_VISIBLE) break;
		result.push(o);
	}

	return result.slice(0, COMMAND_ORDERS_VISIBLE);
}

/** Legacy alias — now returns the new active-orders logic. */
export const getVisibleOrders = getActiveOrders;
export const getVisibleTasks = getActiveOrders;

// ─── Completed orders section ───────────────────────────────────────────────

/**
 * Get all completed-but-unclaimed orders (the Completed section).
 * These orders are claimable and survive board refresh + reload.
 */
export function getCompletedOrders(pool: CommandOrderInstance[], state: CommandOrdersState): CommandOrderInstance[] {
	const result: CommandOrderInstance[] = [];
	for (const o of pool) {
		if (isOrderClaimed(state, o.slot)) continue;
		if (isOrderComplete(o, state.counters)) result.push(o);
	}
	return result;
}

// ─── Claiming ───────────────────────────────────────────────────────────────

/**
 * Whether an order can be claimed. Completed orders are always claimable
 * regardless of whether they appear in the active visible list.
 */
export function canClaimOrder(pool: CommandOrderInstance[], state: CommandOrdersState, slot: number): boolean {
	if (state.completedCount >= COMMAND_ORDERS_MAX_PER_WEEK) return false;
	if (isOrderClaimed(state, slot)) return false;
	const order = pool.find((t) => t.slot === slot);
	if (!order) return false;
	return isOrderComplete(order, state.counters);
}

export const canClaimTask = canClaimOrder;

export function claimOrder(pool: CommandOrderInstance[], state: CommandOrdersState, slot: number): { state: CommandOrdersState; reward: number } | null {
	if (!canClaimOrder(pool, state, slot)) return null;
	const order = pool.find((t) => t.slot === slot)!;
	const next: CommandOrdersState = {
		...state,
		claimedOrderSlots: [...state.claimedOrderSlots, slot],
		completedCount: Math.min(COMMAND_ORDERS_MAX_PER_WEEK, state.completedCount + 1),
	};
	return { state: next, reward: order.reward };
}

export const claimTask = claimOrder;

// ─── Claim All ──────────────────────────────────────────────────────────────

/**
 * Claim all currently completed-but-unclaimed orders at once.
 * Returns the new state, total Alloy, and the count of orders claimed.
 * Respects weekly max: only claims up to the remaining slots.
 */
export function claimAllCompletedOrders(
	pool: CommandOrderInstance[],
	state: CommandOrdersState,
): { state: CommandOrdersState; totalReward: number; claimedCount: number; newlyUnlockedMilestones: number[] } | null {
	const completed = getCompletedOrders(pool, state);
	if (completed.length === 0) return null;

	const remaining = COMMAND_ORDERS_MAX_PER_WEEK - state.completedCount;
	const toClaim = completed.slice(0, Math.max(0, remaining));
	if (toClaim.length === 0) return null;

	let next = { ...state };
	let totalReward = 0;
	const prevCount = state.completedCount;

	for (const order of toClaim) {
		const res = claimOrder(pool, next, order.slot);
		if (!res) break;
		next = res.state;
		totalReward += res.reward;
	}

	const claimedCount = next.completedCount - prevCount;

	// Check for newly unlocked gift milestones.
	const newlyUnlockedMilestones: number[] = [];
	for (const m of COMMAND_ORDER_MILESTONES) {
		if (prevCount < m && next.completedCount >= m && !next.claimedMilestones.includes(m)) {
			newlyUnlockedMilestones.push(m);
		}
	}

	return { state: next, totalReward, claimedCount, newlyUnlockedMilestones };
}

// ─── Gift milestones ────────────────────────────────────────────────────────

export function claimableMilestones(state: CommandOrdersState): number[] {
	return COMMAND_ORDER_MILESTONES.filter((m) => state.completedCount >= m && !state.claimedMilestones.includes(m));
}

export function canClaimMilestone(state: CommandOrdersState, milestone: number): boolean {
	if (!COMMAND_ORDER_MILESTONES.includes(milestone as 5 | 10 | 15 | 20 | 25)) return false;
	return state.completedCount >= milestone && !state.claimedMilestones.includes(milestone);
}

export function claimMilestone(state: CommandOrdersState, milestone: number): { state: CommandOrdersState; reward: number } | null {
	if (!canClaimMilestone(state, milestone)) return null;
	const reward = GIFT_BOX_REWARDS[milestone] ?? 0;
	return {
		state: { ...state, claimedMilestones: [...state.claimedMilestones, milestone] },
		reward,
	};
}

export function nextMilestone(state: CommandOrdersState): number | null {
	for (const m of COMMAND_ORDER_MILESTONES) {
		if (state.completedCount < m) return m;
	}
	return null;
}

// ─── Counters ───────────────────────────────────────────────────────────────

export function applyCounterDeltas(
	counters: Partial<Record<CommandMetric, number>>,
	deltas: Partial<Record<CommandMetric, number>>,
): Partial<Record<CommandMetric, number>> {
	const out: Partial<Record<CommandMetric, number>> = { ...counters };
	for (const [k, v] of Object.entries(deltas) as [CommandMetric, number][]) {
		if (v == null || !Number.isFinite(v)) continue;
		const kind = METRIC_KIND[k];
		const cur = out[k] ?? 0;
		out[k] = kind === 'max' ? Math.max(cur, v) : cur + Math.max(0, v);
	}
	return out;
}

// ─── Convenience ────────────────────────────────────────────────────────────

export function commandOrdersWeekKey(now = Date.now()): string {
	return localWeekKey(now);
}
