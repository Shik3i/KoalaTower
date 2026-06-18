import type { NewsItem } from './newsTypes';
import { newsItems as handwrittenArticles } from './flatlandNews';
import { generateArticles } from './newsTemplates';

// ---------------------------------------------------------------------------
// Seeded PRNG – mulberry32
// ---------------------------------------------------------------------------

/**
 * Returns a deterministic pseudo-random number generator seeded with a 32-bit integer.
 * Each call returns a float in [0, 1). Same seed always produces the same sequence.
 */
export function createRng(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ---------------------------------------------------------------------------
// Simple string hash → 32-bit integer (djb2 variant)
// ---------------------------------------------------------------------------

export function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
	}
	return hash;
}

// ---------------------------------------------------------------------------
// Pick helpers (deterministic from rng)
// ---------------------------------------------------------------------------

/**
 * Pick a random element from a non-empty array.
 * Throws if the array is empty (caller contract).
 */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
	if (arr.length === 0) {
		throw new Error('pick() called on empty array');
	}
	return arr[Math.floor(rng() * arr.length)]!;
}

/**
 * Pick n random elements (Fisher-Yates partial shuffle).
 * If n > arr.length, returns all elements shuffled (clamped).
 */
export function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
	const clamped = Math.min(n, arr.length);
	if (clamped <= 0) return [];
	const shuffled = arr.slice();
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		if (i === j) continue;
		const tmp = shuffled[i] as T;
		shuffled[i] = shuffled[j] as T;
		shuffled[j] = tmp;
	}
	return shuffled.slice(0, clamped) as T[];
}

/**
 * Fisher-Yates shuffle returning a new array.
 */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
	return pickN(rng, arr, arr.length);
}

/**
 * Random integer in [min, max] inclusive.
 * Swaps min/max if provided in wrong order.
 */
export function rngInt(rng: () => number, min: number, max: number): number {
	const lo = Math.min(min, max);
	const hi = Math.max(min, max);
	return Math.floor(rng() * (hi - lo + 1)) + lo;
}

// ---------------------------------------------------------------------------
// Utility: random hex string
// ---------------------------------------------------------------------------

function randomHex(rng: () => number, length: number): string {
	const chars = '0123456789ABCDEF';
	const safeLen = Math.max(0, length);
	let out = '';
	for (let i = 0; i < safeLen; i++) {
		out += chars[Math.floor(rng() * 16)];
	}
	return out;
}

function randomTimestamp(rng: () => number): string {
	const h = rngInt(rng, 0, 23).toString().padStart(2, '0');
	const m = rngInt(rng, 0, 59).toString().padStart(2, '0');
	return `${h}:${m} OST`;
}

/**
 * Extract cycle number safely. Expects "Cycle NNNN" format.
 * Falls back to using the raw string if the format doesn't match.
 */
function extractCycleNumber(cycle: string): string {
	const match = cycle.match(/^Cycle\s+(\d+)$/);
	return (match ? match[1] : cycle.replace(/\s+/g, '-')) ?? '0';
}

// ---------------------------------------------------------------------------
// Storage abstraction: localStorage → sessionStorage → memory fallback
// ---------------------------------------------------------------------------

const LS_SEED_KEY = 'flatland_news_seed';
const LS_DATE_KEY = 'flatland_news_date';

function getStorage(): Storage | null {
	// Try localStorage first
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.getItem('__probe__');
			return localStorage;
		} catch {
			// inaccessible
		}
	}
	// Fallback to sessionStorage (survives F5 but not tab close)
	if (typeof sessionStorage !== 'undefined') {
		try {
			sessionStorage.getItem('__probe__');
			return sessionStorage;
		} catch {
			// inaccessible
		}
	}
	return null;
}

function storageGet(key: string): string | null {
	const s = getStorage();
	if (!s) return null;
	try {
		return s.getItem(key);
	} catch {
		return null;
	}
}

function storageSet(key: string, value: string): void {
	const s = getStorage();
	if (!s) return;
	try {
		s.setItem(key, value);
	} catch {
		// silently ignore quota or permission errors
	}
}

function generateUUID(rng?: () => number): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Deterministic fallback when rng provided, otherwise Math.random
	const rand = rng || (() => Math.random());
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (rand() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function getOrCreateClientSeed(): string {
	let seed = storageGet(LS_SEED_KEY);
	if (!seed) {
		seed = generateUUID();
		storageSet(LS_SEED_KEY, seed);
	}
	return seed;
}

function getTodayDateString(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Daily article selection
// ---------------------------------------------------------------------------

/**
 * How many generated articles to pre-generate for the pool.
 * 150 ensures enough variety across 32 templates; each template will appear
 * ~4-5 times on average, producing distinct articles via different slot picks.
 */
const GENERATED_POOL_SIZE = 150;

/** How many articles to display in the news grid. */
const DISPLAY_COUNT = 6;

let _cachedArticles: NewsItem[] | null = null;
let _cachedDate: string | null = null;

/**
 * Shallow-clone a NewsItem so mutations don't leak back to source data.
 */
function cloneArticle(item: NewsItem): NewsItem {
	return { ...item };
}

/**
 * Returns the 6 daily news articles for the current client.
 * - Same client + same day = same articles (survives F5).
 * - New day or new client = fresh deterministic selection.
 * - Safe to call during SSR (falls back to empty array).
 */
export function getDailyArticles(): NewsItem[] {
	const today = getTodayDateString();

	// Return cached articles if date hasn't changed
	if (_cachedDate === today && _cachedArticles !== null) {
		return _cachedArticles;
	}

	const clientSeed = getOrCreateClientSeed();
	const storedDate = storageGet(LS_DATE_KEY);
	const shouldRegenerate = storedDate !== today;

	const dailySeed = hashString(clientSeed + '|' + today);
	const rng = createRng(dailySeed);

	// Combine pools: handwritten + generated
	const generatedPool = generateArticles(rng, GENERATED_POOL_SIZE);
	const combinedPool: NewsItem[] = [...handwrittenArticles, ...generatedPool];

	// Select 6 articles deterministically
	const rawSelection = pickN(rng, combinedPool, DISPLAY_COUNT);

	// Deep-clone BEFORE mutating so source data is never modified
	const selected = rawSelection.map(cloneArticle);

	// Assign per-article random details (timestamp, refId) deterministically
	for (const item of selected) {
		const itemRng = createRng(hashString(clientSeed + '|' + today + '|' + String(item.id)));
		item.timestamp = item.timestamp || randomTimestamp(itemRng);
		const cycleNum = extractCycleNumber(item.cycle);
		item.refId = item.refId || `OCD-${cycleNum}-${randomHex(itemRng, 4)}`;
	}

	if (shouldRegenerate) {
		storageSet(LS_DATE_KEY, today);
	}

	_cachedArticles = selected;
	_cachedDate = today;

	return selected;
}

/**
 * Returns the time remaining until the next daily dispatch (local midnight).
 * Used by the countdown indicator.
 */
export function getNextDispatchMs(): number {
	const now = new Date();
	const midnight = new Date(now);
	midnight.setHours(24, 0, 0, 0);
	return midnight.getTime() - now.getTime();
}

/** Exported for testing – clears the in-memory session cache. */
export function clearNewsCache(): void {
	_cachedArticles = null;
	_cachedDate = null;
}
