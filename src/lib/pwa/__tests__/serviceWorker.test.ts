import { describe, expect, it } from 'vitest';
import {
	FLATLAND_SW_CACHE_PREFIX,
	FLATLAND_SW_REGISTRATION_PATH,
	canRegisterServiceWorker,
	getFlatlandCacheName,
	shouldBypassServiceWorkerCache,
} from '../serviceWorker';

describe('PWA service worker helpers', () => {
	it('has a stable cache name prefix and registration path', () => {
		expect(getFlatlandCacheName('abc123')).toBe(`${FLATLAND_SW_CACHE_PREFIX}-abc123`);
		expect(FLATLAND_SW_REGISTRATION_PATH).toBe('/service-worker.js');
	});

	it('excludes future API routes from app-shell caching', () => {
		expect(shouldBypassServiceWorkerCache('/api/save')).toBe(true);
		expect(shouldBypassServiceWorkerCache('/play')).toBe(false);
	});

	it('guards registration behind production and browser service worker support', () => {
		expect(canRegisterServiceWorker(false, { serviceWorker: {} } as Navigator)).toBe(false);
		expect(canRegisterServiceWorker(true, undefined)).toBe(false);
		expect(canRegisterServiceWorker(true, { serviceWorker: {} } as Navigator)).toBe(true);
	});
});
