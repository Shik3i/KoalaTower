import { building } from '$app/environment';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Handle } from '@sveltejs/kit';

/**
 * # Adapter-node prerender workaround
 *
 * @sveltejs/adapter-node 5.5.5 compiles a `serve_prerendered()` sirv-based
 * middleware that streams prerendered files via `createReadStream` + `pipe`.
 * On Node 20+ on some hosts this pipeline deadlocks — the read stream never
 * emits data, so all HTML routes (`/`, `/play/`, `/help/`, etc.) hang
 * while `/api/*` routes work fine.
 *
 * The Dockerfile removes `serve_prerendered()` from the Polka middleware
 * chain with a sed patch.  This hook then serves prerendered HTML/XML
 * **directly** via synchronous `readFileSync`, which cannot deadlock.
 *
 * ## When to keep
 *
 * This hook is INTENTIONAL and NOT dead code.  When the adapter-node
 * workaround is eventually removed from the Dockerfile, this hook's
 * `existsSync` check will fail (no file at runtime for SSR-fallback
 * routes), it will call `resolve(event)`, and the normal handler takes
 * over.  So the hook is harmless to leave in place permanently.
 *
 * ## During dev / build-time prerendering
 *
 * - **Dev (Vite):** `build/prerendered/` does not exist → fall through.
 * - **Build-time prerendering:** `building` is true → fall through.
 *   SvelteKit's own prerender logic handles file generation at build.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	if (event.url.pathname.startsWith('/api/')) return resolve(event);
	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') return resolve(event);

	const pathname = event.url.pathname;

	// Map URL pathname → prerendered file on disk.
	//   /             → build/prerendered/index.html
	//   /play/        → build/prerendered/play/index.html
	//   /sitemap.xml  → build/prerendered/sitemap.xml
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
