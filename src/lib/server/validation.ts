export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
const DISPLAY_NAME_RE = /^[\p{L}\p{N} _.-]{1,32}$/u;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

export function validateUsername(value: unknown): ValidationResult<string> {
	if (typeof value !== 'string') return { ok: false, message: 'Invalid username or password' };
	const username = value.trim();
	if (!USERNAME_RE.test(username)) {
		return { ok: false, message: 'Username must be 3-24 characters using letters, numbers, or underscores' };
	}
	return { ok: true, value: username };
}

export function validatePassword(value: unknown): ValidationResult<string> {
	if (typeof value !== 'string' || value.length < 10 || value.length > 256) {
		return { ok: false, message: 'Password must be at least 10 characters' };
	}
	return { ok: true, value };
}

export function validateDisplayName(value: unknown, fallback = 'Flatland Player'): ValidationResult<string> {
	if (value === undefined || value === null || value === '') return { ok: true, value: fallback };
	if (typeof value !== 'string') return { ok: false, message: 'Display name is invalid' };
	const displayName = value.trim();
	if (!DISPLAY_NAME_RE.test(displayName) || displayName.includes('\n') || displayName.includes('\r')) {
		return { ok: false, message: 'Display name must be 1-32 safe characters' };
	}
	return { ok: true, value: displayName };
}

export function validateLocalPlayerId(value: unknown): ValidationResult<string> {
	if (typeof value !== 'string' || !UUID_RE.test(value)) {
		return { ok: false, message: 'Local player id must be a UUID' };
	}
	return { ok: true, value };
}

export function validatePositiveInt(value: unknown, name: string, min = 1, max = Number.MAX_SAFE_INTEGER): ValidationResult<number> {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
		return { ok: false, message: `${name} is invalid` };
	}
	return { ok: true, value };
}

export function validateOptionalIsoDate(value: unknown): string | null {
	if (value === undefined || value === null || value === '') return null;
	if (typeof value !== 'string') return null;
	const time = Date.parse(value);
	return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
