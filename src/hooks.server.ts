import { building, dev } from '$app/environment';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logServerError } from '$lib/server/errorLog';

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
 * - **Dev (Vite):** guarded explicitly via `dev` below. A stale `build/`
 *   directory left over from a previous `npm run build` WOULD otherwise be
 *   picked up here and served instead of the live dev page (its hashed assets
 *   then 404 on the dev server, so nothing hydrates). The `dev` short-circuit
 *   keeps dev always on SvelteKit's live SSR regardless of a leftover build.
 * - **Build-time prerendering:** `building` is true → fall through.
 *   SvelteKit's own prerender logic handles file generation at build.
 */
/**
 * Conservative security headers applied to every response. No Content-Security-Policy
 * is set here on purpose: SvelteKit hydration and Pixi rely on inline styles/scripts,
 * so a hash-less CSP would break the game. CSP, if desired, belongs in
 * svelte.config.js (`kit.csp`) where SvelteKit can emit matching hashes.
 */
function applySecurityHeaders(headers: Headers): void {
	headers.set('x-content-type-options', 'nosniff');
	headers.set('x-frame-options', 'SAMEORIGIN');
	headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	headers.set('permissions-policy', 'geolocation=(), camera=(), microphone=()');
}

export const handle: Handle = async ({ event, resolve }) => {
	// In dev, always use SvelteKit's live SSR — never serve a leftover build/.
	if (dev || building) return resolve(event);

	if (event.url.pathname.startsWith('/api/')) {
		const response = await resolve(event);
		applySecurityHeaders(response.headers);
		return response;
	}

	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		const response = await resolve(event);
		applySecurityHeaders(response.headers);
		return response;
	}

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
			const headers = new Headers({ 'content-type': mime, 'content-length': String(Buffer.byteLength(content)) });
			applySecurityHeaders(headers);
			return new Response(content, { status: 200, headers });
		} catch {
			// Read error — let the SSR handler respond.
		}
	}

	const response = await resolve(event);
	applySecurityHeaders(response.headers);
	return response;
};

/**
 * Persist unexpected server errors into the SQLite error log so the admin panel
 * can surface them. SvelteKit calls this only for *unexpected* errors (thrown
 * exceptions / 500s), not for `error(...)` helper throws like the admin 404
 * guard — so routine auth rejections are never logged. Only safe, truncated
 * fields are stored (see logServerError); never cookies, bodies, or secrets.
 * Logging itself fails safely and cannot crash the response.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	logServerError({
		level: 'error',
		source: 'hooks.handleError',
		message: error instanceof Error ? error.message : String(message ?? error),
		stack: error instanceof Error ? (error.stack ?? null) : null,
		route: event.url?.pathname ?? null,
		method: event.request?.method ?? null,
		status: typeof status === 'number' ? status : 500,
		userAgent: event.request?.headers?.get('user-agent') ?? null
	});
	return { message: message ?? 'Internal Error' };
};
