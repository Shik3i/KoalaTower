/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';
import { buildAppShellUrls, getFlatlandCacheName, shouldBypassServiceWorkerCache } from '$lib/pwa/serviceWorker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = getFlatlandCacheName(version);
const APP_SHELL = buildAppShellUrls(['/', '/manifest.json'], build, files);

// Content-hashed build assets + bundled static files never change for a given
// URL, so they're safe to serve cache-first. Looked up as a Set for O(1) checks.
const PRECACHED = new Set<string>([...build, ...files]);

// ── Install: precache the app shell resiliently ─────────────────────────────
// `cache.addAll` is atomic — a single failing URL aborts the WHOLE precache and
// leaves the cache empty, which then makes every offline fallback resolve to
// `undefined`. Use allSettled so one bad asset can't wipe out the cache.
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys
				.filter((key) => key.startsWith('flatland-td-shell-') && key !== CACHE_NAME)
				.map((key) => caches.delete(key)),
			))
			.then(() => sw.clients.claim()),
	);
});

/**
 * Resolve to a cached match for `request`, the cached app-shell index, or a
 * synthetic offline Response — but NEVER `undefined`/`Response.error()`. Passing
 * either of those to `event.respondWith()` throws ("Failed to convert value to
 * 'Response'") or yields a network-error response that breaks navigation.
 */
async function cacheFallback(request: Request, status = 504): Promise<Response> {
	const cache = await caches.open(CACHE_NAME);
	const cached = (await cache.match(request)) ?? (request.mode === 'navigate' ? await cache.match('/') : undefined);
	return cached ?? new Response('Offline — Flatland TD could not reach the network.', {
		status,
		statusText: status === 503 ? 'Service Unavailable' : 'Gateway Timeout',
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin || shouldBypassServiceWorkerCache(url.pathname)) return;

	// Navigations: network-first for fresh SSR HTML (so new deploys' chunk hashes
	// resolve), falling back to the cached shell when offline — never an error.
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => cacheFallback(request, 503)));
		return;
	}

	// Content-hashed assets: cache-first. They're immutable per URL, so this is
	// fast and offline-safe, and avoids re-fetching on every load.
	if (PRECACHED.has(url.pathname)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(request);
				if (cached) return cached;
				try {
					const response = await fetch(request);
					if (response.ok) cache.put(request, response.clone());
					return response;
				} catch {
					return cacheFallback(request);
				}
			}),
		);
		return;
	}

	// Everything else: network-first, cache successful basic responses, and fall
	// back to cache (or a synthetic Response) on failure — always a real Response.
	event.respondWith(
		fetch(request)
			.then((response) => {
				if (response && response.status === 200 && response.type === 'basic') {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
				}
				return response;
			})
			.catch(() => cacheFallback(request)),
	);
});
