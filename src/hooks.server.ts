import { building } from '$app/environment';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Handle } from '@sveltejs/kit';

/**
 * Serves prerendered HTML/XML directly when the adapter-node
 * serve_prerendered middleware is removed from the Polka chain.
 *
 * During dev: the prerendered dir does not exist, so Vite handles requests.
 * During build-time prerendering: building=true, so fall through.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	if (event.url.pathname.startsWith('/api/')) return resolve(event);
	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') return resolve(event);

	const pathname = event.url.pathname;

	// Map URL pathname -> prerendered file on disk.
	//   /          -> build/prerendered/index.html
	//   /play/     -> build/prerendered/play/index.html
	//   /sitemap.xml -> build/prerendered/sitemap.xml
	let relative = pathname.replace(/^\/+/, '') || 'index.html';
	if (!relative.includes('.')) {
		relative = relative.replace(/\/?$/, '/index.html');
	}
	const filePath = join(process.cwd(), 'build', 'prerendered', relative);

	if (existsSync(filePath)) {
		try {
			const content = readFileSync(filePath, 'utf-8');
			const mime = filePath.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8';
			return new Response(content, {
				status: 200,
				headers: { 'content-type': mime, 'content-length': String(Buffer.byteLength(content)) }
			});
		} catch {
			// Read error — let the SSR handler respond.
		}
	}

	return resolve(event);
};
