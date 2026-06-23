/**
 * uiLayoutPrefs.ts — localStorage-backed UI layout preferences.
 *
 * Small, SSR-safe persisted writables for in-game HUD layout choices that
 * should survive across runs and reloads (panel collapse states, etc.).
 * Each key lives under its own `fltd.ui.*` localStorage entry — deliberately
 * separate from the game save so layout prefs persist even offline / when the
 * save fails to load, mirroring mobileHints.ts and whatsNew.ts.
 *
 * To persist a new sensible bit of UI state, add one `persistedBool` (or a
 * typed variant) here and bind the component to it.
 */
import { writable, type Writable } from 'svelte/store';

const PREFIX = 'fltd.ui.';

/** A writable<boolean> that mirrors itself to localStorage under `fltd.ui.<key>`. */
function persistedBool(key: string, initial: boolean): Writable<boolean> {
	const storageKey = PREFIX + key;
	let start = initial;
	if (typeof localStorage !== 'undefined') {
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw === '1') start = true;
			else if (raw === '0') start = false;
		} catch {
			// Storage blocked (private mode / quota) — fall back to the default.
		}
	}
	const store = writable<boolean>(start);
	if (typeof localStorage !== 'undefined') {
		store.subscribe((v) => {
			try {
				localStorage.setItem(storageKey, v ? '1' : '0');
			} catch {
				// Ignore write failures; the in-memory value still drives the UI.
			}
		});
	}
	return store;
}

/** Tower stats panel collapsed (compact) state. Persists across runs. */
export const towerStatsCompact = persistedBool('towerStatsCompact', false);
/** Enemy stats panel collapsed (compact) state. Persists across runs. */
export const enemyStatsCompact = persistedBool('enemyStatsCompact', false);
/** Right-hand Field Upgrades panel open/closed. Persists across runs. */
export const fieldPanelOpen = persistedBool('fieldPanelOpen', true);
