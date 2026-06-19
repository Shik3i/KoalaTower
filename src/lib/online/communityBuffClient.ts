import { get, writable } from 'svelte/store';
import { safeApiJson } from './apiClient';

export const COMMUNITY_BUFF_CLIENT_CAP_PERCENT = 100;
/** Reuse a cached community-buff value for this long before re-fetching. */
export const COMMUNITY_BUFF_CACHE_MS = 5 * 60 * 1000;
/** Single background refresh; never an automatic retry loop. */
const COMMUNITY_BUFF_TIMEOUT_MS = 2500;

export type CommunityBuffSummary = {
	activePercent: number;
	capPercent: number;
	activeUntil: string | null;
	activeEvents: number;
	sourceSummary: string;
};

export type CommunityBuffState = {
	percent: number;
	activeUntil: string | null;
	loaded: boolean;
};

const NEUTRAL: CommunityBuffState = { percent: 0, activeUntil: null, loaded: false };

/** Clamp a community-buff percent defensively to 0..100. Bad/offline input → 0. */
export function clampCommunityBuffPercent(percent: unknown): number {
	const n = typeof percent === 'number' ? percent : Number(percent);
	if (!Number.isFinite(n) || n <= 0) return 0;
	if (n > COMMUNITY_BUFF_CLIENT_CAP_PERCENT) return COMMUNITY_BUFF_CLIENT_CAP_PERCENT;
	return n;
}

/**
 * Apply the community buff to an Alloy amount.
 *
 *     finalAlloy = round(baseAlloy * (1 + activePercent / 100))
 *
 * - 0% buff is a pure no-op (returns floor(base)).
 * - Applies to Alloy only — callers must never feed Energy/Strange Matter/etc.
 * - round() (not floor) avoids floating-point underflow like 200 * 1.035.
 */
export function applyCommunityBuff(alloyBefore: unknown, buffPercent: unknown): number {
	const raw = typeof alloyBefore === 'number' ? alloyBefore : Number(alloyBefore ?? 0);
	const base = Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
	const pct = clampCommunityBuffPercent(buffPercent);
	if (pct <= 0) return base;
	return Math.round(base * (1 + pct / 100));
}

function createCommunityBuffStore() {
	const store = writable<CommunityBuffState>({ ...NEUTRAL, loaded: true });
	let lastFetch = 0;
	let inflight: Promise<void> | null = null;

	async function refresh(): Promise<void> {
		if (inflight) return inflight;
		inflight = (async () => {
			const result = await safeApiJson<CommunityBuffSummary>(
				'/api/community-buff',
				{},
				{ timeoutMs: COMMUNITY_BUFF_TIMEOUT_MS }
			);
			lastFetch = Date.now();
			if (result.ok && result.data) {
				// A cached buff must never outlive its own window.
				const untilMs = result.data.activeUntil ? Date.parse(result.data.activeUntil) : NaN;
				const expired = Number.isFinite(untilMs) && untilMs <= Date.now();
				store.set({
					percent: expired ? 0 : clampCommunityBuffPercent(result.data.activePercent),
					activeUntil: result.data.activeUntil,
					loaded: true
				});
			} else {
				// API unavailable/offline/timeout → treated as 0%. No retry loop.
				store.set({ percent: 0, activeUntil: null, loaded: true });
			}
		})()
			.catch(() => {
				// Swallow so callers never see a rejected refresh (no console spam).
				store.set({ percent: 0, activeUntil: null, loaded: true });
			})
			.finally(() => {
				inflight = null;
			});
		return inflight;
	}

	return {
		subscribe: store.subscribe,
		refresh,
		refreshIfStale(): Promise<void> {
			if (Date.now() - lastFetch > COMMUNITY_BUFF_CACHE_MS) return refresh();
			return Promise.resolve();
		},
		stale(): boolean {
			return Date.now() - lastFetch > COMMUNITY_BUFF_CACHE_MS;
		}
	};
}

export const communityBuffStore = createCommunityBuffStore();

/** Synchronous read of the currently-cached buff percent (0 when offline). */
export function getCommunityBuffPercent(): number {
	return clampCommunityBuffPercent(get(communityBuffStore).percent);
}

/** Format a buff percent for display, e.g. 3.5 → "+3.5%". 0 → "0%". */
export function formatCommunityBuffPercent(percent: number): string {
	const clamped = clampCommunityBuffPercent(percent);
	if (clamped <= 0) return '0%';
	const rounded = Math.round(clamped * 10) / 10;
	return `+${rounded}%`;
}
