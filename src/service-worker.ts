/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';
import { getFlatlandCacheName, shouldBypassServiceWorkerCache } from '$lib/pwa/serviceWorker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = getFlatlandCacheName(version);
const APP_SHELL = ['/', '/manifest.json', ...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
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

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin || shouldBypassServiceWorkerCache(url.pathname)) return;

	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => caches.match('/').then((cached) => cached ?? Response.error())));
		return;
	}

	event.respondWith(
		fetch(request)
			.then((response) => {
				if (!response || response.status !== 200 || response.type !== 'basic') return response;
				const copy = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
				return response;
			})
			.catch(() => caches.match(request)),
	);
});
