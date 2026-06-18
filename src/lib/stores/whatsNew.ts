/**
 * whatsNew.ts — "show the What's New panel once per version" logic.
 *
 * Uses its own localStorage key (NOT the game save) so it works offline and
 * never touches gameplay data. All functions are SSR/browser-guarded and the
 * decision logic is a pure function for easy testing.
 */

export const WHATS_NEW_KEY = 'flatland-whatsnew-seen-version';

/**
 * Whether the What's New panel should be shown.
 *
 * Shows when the current version differs from the last version the user
 * dismissed (including the first time, when nothing is stored). Never shows for
 * an empty/unknown current version.
 */
export function shouldShowWhatsNew(current: string, stored: string | null): boolean {
	if (!current) return false;
	return current !== stored;
}

/** Read the last dismissed version, guarding SSR and storage errors. */
export function readSeenVersion(): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(WHATS_NEW_KEY);
	} catch {
		return null;
	}
}

/** Persist the dismissed version so the panel stays hidden until next release. */
export function writeSeenVersion(version: string): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(WHATS_NEW_KEY, version);
	} catch {
		/* ignore quota/private-mode errors */
	}
}
