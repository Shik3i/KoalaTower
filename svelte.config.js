import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// Ko-fi sends the webhook as a cross-site form POST without an Origin
			// header. JSON mutation routes retain their application-level CSRF guard.
			trustedOrigins: ['*']
		},
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
