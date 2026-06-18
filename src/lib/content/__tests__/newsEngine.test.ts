import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createRng,
	hashString,
	pick,
	pickN,
	shuffle,
	rngInt,
	getDailyArticles,
	clearNewsCache,
} from '$lib/content/newsEngine';
import { generateArticles } from '$lib/content/newsTemplates';
import type { NewsItem } from '$lib/content/newsTypes';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

function mockLocalStorage() {
	const store = new Map<string, string>();
	return {
		getItem: vi.fn((key: string) => store.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
		removeItem: vi.fn((key: string) => { store.delete(key); }),
		_store: store,
	};
}

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------

describe('createRng', () => {
	it('produces deterministic sequences for the same seed', () => {
		const rng1 = createRng(42);
		const rng2 = createRng(42);
		const seq1 = Array.from({ length: 10 }, () => rng1());
		const seq2 = Array.from({ length: 10 }, () => rng2());
		expect(seq1).toEqual(seq2);
	});

	it('produces different sequences for different seeds', () => {
		const rng1 = createRng(42);
		const rng2 = createRng(99);
		const seq1 = Array.from({ length: 10 }, () => rng1());
		const seq2 = Array.from({ length: 10 }, () => rng2());
		expect(seq1).not.toEqual(seq2);
	});

	it('returns values in [0, 1)', () => {
		const rng = createRng(12345);
		for (let i = 0; i < 1000; i++) {
			const val = rng();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThan(1);
		}
	});
});

// ---------------------------------------------------------------------------
// hashString
// ---------------------------------------------------------------------------

describe('hashString', () => {
	it('is deterministic', () => {
		expect(hashString('hello')).toBe(hashString('hello'));
	});

	it('different strings produce different hashes (usually)', () => {
		// It's a hash, collisions are possible but unlikely for small sets
		expect(hashString('hello')).not.toBe(hashString('world'));
	});

	it('handles empty string', () => {
		expect(typeof hashString('')).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// pick / pickN / shuffle
// ---------------------------------------------------------------------------

describe('pick', () => {
	it('returns an element from the array', () => {
		const rng = createRng(42);
		const arr = ['a', 'b', 'c', 'd'];
		const result = pick(rng, arr);
		expect(arr).toContain(result);
	});

	it('is deterministic', () => {
		const rng1 = createRng(42);
		const rng2 = createRng(42);
		expect(pick(rng1, ['x', 'y', 'z'])).toBe(pick(rng2, ['x', 'y', 'z']));
	});
});

describe('pickN', () => {
	it('returns correct number of elements', () => {
		const rng = createRng(42);
		const result = pickN(rng, [1, 2, 3, 4, 5, 6, 7, 8], 3);
		expect(result).toHaveLength(3);
	});

	it('is deterministic', () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const rng1 = createRng(42);
		const rng2 = createRng(42);
		expect(pickN(rng1, arr, 4)).toEqual(pickN(rng2, arr, 4));
	});
});

describe('shuffle', () => {
	it('returns all elements', () => {
		const rng = createRng(42);
		const arr = [1, 2, 3, 4, 5];
		const result = shuffle(rng, arr);
		expect(result).toHaveLength(arr.length);
		expect(result.sort()).toEqual([...arr].sort());
	});
});

describe('rngInt', () => {
	it('returns values within range', () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const val = rngInt(rng, 5, 10);
			expect(val).toBeGreaterThanOrEqual(5);
			expect(val).toBeLessThanOrEqual(10);
		}
	});
});

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

describe('generateArticles', () => {
	it('produces valid news items', () => {
		const rng = createRng(42);
		const articles = generateArticles(rng, 10);

		expect(articles).toHaveLength(10);

		for (const item of articles) {
			expect(item.id).toBeDefined();
			expect(item.category.length).toBeGreaterThan(0);
			expect(item.headline.length).toBeGreaterThan(0);
			expect(item.snippet.length).toBeGreaterThan(0);
			expect(item.cycle.length).toBeGreaterThan(0);
			expect(item.classification.length).toBeGreaterThan(0);
			expect(item.thumbnail.length).toBeGreaterThan(0);
			expect(item.timestamp).toBeTypeOf('string');
			expect(item.author.length).toBeGreaterThan(0);
			expect(item.source).toBe('generated');
			expect(item.refId).toBe('');
		}
	});

	it('is deterministic', () => {
		const rng1 = createRng(42);
		const rng2 = createRng(42);
		const a1 = generateArticles(rng1, 5);
		const a2 = generateArticles(rng2, 5);

		expect(a1).toHaveLength(a2.length);
		for (let i = 0; i < a1.length; i++) {
			expect(a1[i]!.headline).toBe(a2[i]!.headline);
			expect(a1[i]!.snippet).toBe(a2[i]!.snippet);
		}
	});
});

// ---------------------------------------------------------------------------
// Daily article selection (without localStorage)
// ---------------------------------------------------------------------------

describe('getDailyArticles', () => {
	beforeEach(() => {
		clearNewsCache();
	});

	it('returns exactly 6 articles', () => {
		const articles = getDailyArticles();
		expect(articles).toHaveLength(6);
	});

	it('returns valid articles', () => {
		const articles = getDailyArticles();
		for (const item of articles) {
			expect(item.headline.length).toBeGreaterThan(0);
			expect(item.snippet.length).toBeGreaterThan(0);
			expect(item.timestamp).toMatch(/^\d{2}:\d{2} OST$/);
			expect(item.refId).toMatch(/^OCD-/);
			expect(item.author.length).toBeGreaterThan(0);
		}
	});

	it('returns same articles on repeated calls within same session', () => {
		const a1 = getDailyArticles();
		const a2 = getDailyArticles();
		expect(a1.map(i => i.id)).toEqual(a2.map(i => i.id));
	});

	it('every article has a unique id', () => {
		const articles = getDailyArticles();
		const ids = articles.map(a => String(a.id));
		expect(new Set(ids).size).toBe(ids.length);
	});
});
