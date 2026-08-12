import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests live in `e2e/` (outside `src/`) so Vitest never picks them up.
 *
 * We run against the real adapter-node production server, not Vite preview or
 * the dev server. The build step applies the same guarded adapter workaround
 * used by the Docker image before this server starts.
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
	webServer: {
		command: 'node build',
		url: `http://localhost:${PORT}`,
		env: {
			PORT: String(PORT),
			NODE_ENV: 'test',
			DATABASE_PATH: resolve(tmpdir(), `flatland-td-e2e-${process.pid}.db`),
			SESSION_SECRET: 'e2e-session-secret',
			AUTH_PASSWORD_PEPPER: 'e2e-password-pepper',
			KOFI_WEBHOOK_SECRET: 'e2e-kofi-secret'
		},
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
