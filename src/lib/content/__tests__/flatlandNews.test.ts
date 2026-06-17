import { describe, it, expect } from 'vitest';
import { newsItems } from '$lib/content/flatlandNews';

describe('Flatland Wars News', () => {
	it('exports a non-empty array of news items', () => {
		expect(Array.isArray(newsItems)).toBe(true);
		expect(newsItems.length).toBeGreaterThan(0);
	});

	it('every news item has required fields', () => {
		for (const item of newsItems) {
			expect(item.id).toBeTypeOf('number');
			expect(item.category).toBeTypeOf('string');
			expect(item.category.length).toBeGreaterThan(0);
			expect(item.headline).toBeTypeOf('string');
			expect(item.headline.length).toBeGreaterThan(0);
			expect(item.snippet).toBeTypeOf('string');
			expect(item.snippet.length).toBeGreaterThan(0);
			expect(item.cycle).toBeTypeOf('string');
			expect(item.cycle.length).toBeGreaterThan(0);
			expect(item.classification).toBeTypeOf('string');
			expect(item.classification.length).toBeGreaterThan(0);
			expect(item.thumbnail).toBeTypeOf('string');
		}
	});

	it('no duplicate ids', () => {
		const ids = newsItems.map(i => i.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('no empty headlines', () => {
		for (const item of newsItems) {
			expect(item.headline.trim()).not.toBe('');
		}
	});

	it('no duplicate headlines', () => {
		const headlines = newsItems.map(i => i.headline);
		expect(new Set(headlines).size).toBe(headlines.length);
	});
});
