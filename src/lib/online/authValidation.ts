export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
export const DISPLAY_NAME_REGEX = /^[\p{L}\p{N} _.-]{1,32}$/u;

export function isValidUsername(username: string): boolean {
	return USERNAME_REGEX.test(username.trim());
}

export function isValidPassword(password: string): boolean {
	return password.length >= 10 && password.length <= 256;
}

export function isValidDisplayName(displayName: string): boolean {
	const trimmed = displayName.trim();
	if (trimmed === '') return true; // Optional display name can be empty
	return DISPLAY_NAME_REGEX.test(trimmed) && !displayName.includes('\n') && !displayName.includes('\r');
}
