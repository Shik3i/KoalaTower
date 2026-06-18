/**
 * App version — injected at build time via VITE_APP_VERSION env var.
 * In local dev            → reads from .env or defaults to 'DEV'.
 * In CI/tag builds        → set to the tag name (e.g. 'v0.1.0').
 * In Docker builds        → passed as build-arg VITE_APP_VERSION.
 */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || 'DEV';

export const SITE_URL = 'https://tower.koalastuff.net';
export const GITHUB_URL = 'https://github.com/Shik3i/KoalaTower';
export const GITHUB_ISSUES_URL = 'https://github.com/Shik3i/KoalaTower/issues';
export const SUPPORT_URL = 'https://support.koalastuff.net';
