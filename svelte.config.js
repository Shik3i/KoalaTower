import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Ko-fi sends application/x-www-form-urlencoded POSTs to /api/kofi/webhook,
		// which SvelteKit 2's default CSRF blocks. All other API POST routes use
		// application/json (CSRF-exempt), and the webhook verifies its own token
		// via verification_token, so trusting all origins is harmless here.
		// `trustedOrigins` is the modern replacement for the deprecated
		// `csrf.checkOrigin: false`.
		csrf: {
			trustedOrigins: ['*']
		},
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
