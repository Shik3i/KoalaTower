import { test, expect } from '@playwright/test';

/**
 * Smoke test for the Orbital Command (hub) tabs.
 *
 * Regression guard for the class of bug where opening a tab throws at runtime
 * (e.g. the Fronts tab once crashed with "Cannot read properties of undefined
 * (reading 'coin')"). We click every visible tab and fail on any uncaught
 * exception. `tsc --noEmit` never type-checks .svelte templates, so this is the
 * net that catches template/runtime mistakes there.
 */
test('every Orbital Command tab opens without a runtime error', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (err) => pageErrors.push(err.message));
	page.on('console', (msg) => {
		if (msg.type() === 'error' && /TypeError|is not defined|Cannot read properties/i.test(msg.text())) {
			pageErrors.push(msg.text());
		}
	});

	await page.goto('/hub');
	await page.waitForLoadState('networkidle');

	// The hub page is prerendered (empty SSR shell) and the nav only appears after
	// client hydration — which can take a while on the dev server's first compile.
	const tabs = page.locator('[id^="hub-tab-"]');
	await expect(tabs.first()).toBeVisible({ timeout: 30_000 });

	// Dismiss the first-run tutorial overlay if it appears (it can intercept clicks).
	const skip = page.getByRole('button', { name: /^skip$/i });
	if (await skip.isVisible().catch(() => false)) await skip.click();

	const ids = await tabs.evaluateAll((els) => els.map((e) => e.id));
	expect(ids.length).toBeGreaterThan(0);

	for (const id of ids) {
		await page.locator(`#${id}`).click();
		// Let the section render and any derived state settle.
		await page.waitForTimeout(120);
		expect(pageErrors, `error after opening ${id}`).toEqual([]);
	}

	// Explicitly exercise the tab that previously crashed.
	if (ids.includes('hub-tab-tiers')) {
		await page.locator('#hub-tab-tiers').click();
		await expect(page.getByRole('heading', { name: /Fronts/i })).toBeVisible();
	}

	expect(pageErrors).toEqual([]);
});
