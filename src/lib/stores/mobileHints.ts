/**
 * mobileHints.ts — tiny localStorage-backed flags for one-time mobile hints.
 *
 * These are pure UI nudges (e.g. "swipe to change Front band"). They are not
 * part of the game save — a separate, throwaway concern — so they live in
 * localStorage under their own keys and are SSR-safe.
 */
import { writable, type Writable } from 'svelte/store';

export const SWIPE_HINT_KEY = 'flatland-swipe-hint-dismissed';

/** Read a boolean flag from localStorage, guarding SSR and quota errors. */
export function readHintFlag(key: string): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		return localStorage.getItem(key) === '1';
	} catch {
		return false;
	}
}

/** Persist a boolean flag, swallowing storage errors (private mode, quota). */
export function writeHintFlag(key: string, value: boolean): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (value) localStorage.setItem(key, '1');
		else localStorage.removeItem(key);
	} catch {
		/* ignore */
	}
}

function createHintStore(key: string): Writable<boolean> & { dismiss: () => void } {
	const store = writable<boolean>(readHintFlag(key));
	return {
		...store,
		dismiss() {
			writeHintFlag(key, true);
			store.set(true);
		},
	};
}

const swipeHint = createHintStore(SWIPE_HINT_KEY);

/** True once the user has seen/dismissed the Front-band swipe hint. */
export const swipeHintDismissed = swipeHint;
export const dismissSwipeHint = swipeHint.dismiss;
