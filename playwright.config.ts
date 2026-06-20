import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests live in `e2e/` (outside `src/`) so Vitest never picks them up.
 *
 * We run against the real production build (the adapter-node server), not the
 * dev server: it serves the prerendered HTML + hashed client assets + /api
 * routes exactly like deployment, so hydration and routing behave as in prod.
 * (The dev server's on-demand module loading is unreliable under headless
 * automation.) The runtime crashes we want to catch reproduce here.
 */
const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	timeout: 60_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'list' : 'line',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Use SvelteKit's `vite preview` server (not `node build/index.js`): the
	// adapter-node output relies on a Docker-only sirv patch and deadlocks under
	// Node 20+ when run directly, whereas vite preview serves the built app with
	// correct SSR/hydration + /api routes. Build separately (see test:e2e) so
	// this readiness probe only waits on the fast server start.
	webServer: {
		command: `npm run preview -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
