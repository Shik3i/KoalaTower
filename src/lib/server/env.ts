import { dev } from '$app/environment';

export const SESSION_COOKIE_NAME = 'flatland_td_session';
export const SESSION_TTL_DAYS = 30;
export const BCRYPT_COST = 12;

export function getSessionSecret(): string {
	return process.env.SESSION_SECRET || (dev ? 'dev-session-secret-change-before-production' : '');
}

export function getPasswordPepper(): string {
	return process.env.AUTH_PASSWORD_PEPPER || (dev ? 'dev-password-pepper-change-before-production' : '');
}

export function requireAuthSecrets(): void {
	if (!getSessionSecret()) throw new Error('SESSION_SECRET is required in production');
	if (!getPasswordPepper()) throw new Error('AUTH_PASSWORD_PEPPER is required in production');
}

export function onlineFeaturesEnabled(): boolean {
	const value = process.env.PUBLIC_ONLINE_FEATURES_ENABLED;
	return value !== 'false' && value !== '0';
}

export function getKofiWebhookSecret(): string | null {
	return process.env.KOFI_WEBHOOK_SECRET || null;
}

/**
 * Whether the Ko-fi webhook is allowed to process at all.
 *
 * In production a missing KOFI_WEBHOOK_SECRET must disable the endpoint so it
 * can never become an open event/buff sink. Only dev/test tolerates a missing
 * secret, purely for local testing.
 */
export function isKofiWebhookEnabled(): boolean {
	return !!getKofiWebhookSecret() || dev;
}
