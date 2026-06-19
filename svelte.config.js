import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			entries: ['*']
		},
		// Ko-fi sends application/x-www-form-urlencoded POSTs to /api/kofi/webhook,
		// which SvelteKit 2's default CSRF blocks. All other API POST routes use
		// application/json (CSRF-exempt), and the webhook verifies its own token
		// via verification_token, so disabling the origin check is harmless here.
		csrf: { checkOrigin: false }
	}
};

export default config;
