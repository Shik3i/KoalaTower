import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

// A minimal in-memory localStorage stub so we can test the SSR/browser guard
// and persistence without a DOM.
function installStorage(): Record<string, string> {
	const backing: Record<string, string> = {};
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => (k in backing ? backing[k] : null),
		setItem: (k: string, v: string) => { backing[k] = v; },
		removeItem: (k: string) => { delete backing[k]; },
	});
	return backing;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

describe('mobileHints', () => {
	it('readHintFlag returns false when localStorage is unavailable (SSR)', async () => {
		vi.stubGlobal('localStorage', undefined);
		const { readHintFlag } = await import('../mobileHints');
		expect(readHintFlag('whatever')).toBe(false);
	});

	it('writeHintFlag is a no-op (no throw) without localStorage', async () => {
		vi.stubGlobal('localStorage', undefined);
		const { writeHintFlag } = await import('../mobileHints');
		expect(() => writeHintFlag('k', true)).not.toThrow();
	});

	it('round-trips a flag through localStorage', async () => {
		const backing = installStorage();
		const { readHintFlag, writeHintFlag, SWIPE_HINT_KEY } = await import('../mobileHints');
		expect(readHintFlag(SWIPE_HINT_KEY)).toBe(false);
		writeHintFlag(SWIPE_HINT_KEY, true);
		expect(backing[SWIPE_HINT_KEY]).toBe('1');
		expect(readHintFlag(SWIPE_HINT_KEY)).toBe(true);
	});

	it('dismiss() flips the store to true and persists', async () => {
		installStorage();
		const { swipeHintDismissed, dismissSwipeHint, readHintFlag, SWIPE_HINT_KEY } = await import('../mobileHints');
		expect(get(swipeHintDismissed)).toBe(false);
		dismissSwipeHint();
		expect(get(swipeHintDismissed)).toBe(true);
		expect(readHintFlag(SWIPE_HINT_KEY)).toBe(true);
	});

	it('swallows storage errors when setItem throws', async () => {
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => { throw new Error('quota'); },
			removeItem: () => {},
		});
		const { writeHintFlag } = await import('../mobileHints');
		expect(() => writeHintFlag('k', true)).not.toThrow();
	});
});
