/**
 * saveEncoding.ts — FLTD_SAVE export container with encoding and checksum.
 *
 * This provides casual edit resistance and corruption detection, NOT real
 * encryption or anti-cheat. Flatland TD is a local-first static game with
 * no server authority. Any client-side key can be extracted.
 *
 * Container format:
 * {
 *   "format": "FLTD_SAVE",
 *   "formatVersion": 1,
 *   "game": "Flatland TD",
 *   "gameVersion": "DEV",
 *   "exportedAt": "2025-01-01T00:00:00.000Z",
 *   "encoding": "base64url+sha256",
 *   "payload": "<base64url encoded SaveData JSON>",
 *   "checksum": "<sha256 hex of static-salt + payload>"
 * }
 */

import { CURRENT_SCHEMA_VERSION } from './saveTypes';
import { APP_VERSION } from '$lib/version';

const FLTD_SAVE_FORMAT = 'FLTD_SAVE';
const FLTD_SAVE_FORMAT_VERSION = 1;
const CHECKSUM_SALT = 'FlatlandTD::save::v1::do-not-cheat::it-ruins-the-fun';

/**
 * Encode a string to base64url (RFC 4648 §5).
 * Uses btoa in browsers, TextEncoder+manual base64 fallback otherwise.
 */
function toBase64Url(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	const b64 = typeof btoa === 'function' ? btoa(binary) : btoaFallback(binary);
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function btoaFallback(str: string): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let result = '';
	for (let i = 0; i < str.length; i += 3) {
		const a = str.charCodeAt(i) ?? 0;
		const b = str.charCodeAt(i + 1) ?? 0;
		const c = str.charCodeAt(i + 2) ?? 0;
		const n = (a << 16) | (b << 8) | c;
		result += chars[(n >> 18) & 63]! + chars[(n >> 12) & 63]!;
		result += i + 1 < str.length ? chars[(n >> 6) & 63]! : '=';
		result += i + 2 < str.length ? chars[n & 63]! : '=';
	}
	return result;
}

/**
 * Decode base64url to string.
 * Uses atob in browsers, TextDecoder + manual base64 fallback otherwise.
 */
function fromBase64Url(b64u: string): string {
	let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
	while (b64.length % 4 !== 0) b64 += '=';
	let binary: string;
	if (typeof atob === 'function') {
		binary = atob(b64);
	} else {
		binary = atobFallback(b64);
	}
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

function atobFallback(str: string): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let result = '';
	for (let i = 0; i < str.length; i += 4) {
		const a = chars.indexOf(str[i] ?? '');
		const b = chars.indexOf(str[i + 1] ?? '');
		const c = str[i + 2] === '=' ? 0 : chars.indexOf(str[i + 2] ?? '');
		const d = str[i + 3] === '=' ? 0 : chars.indexOf(str[i + 3] ?? '');
		// Reject invalid characters (-1 from indexOf) — do not silently produce garbage.
		if (a < 0 || b < 0 || (str[i + 2] !== '=' && c < 0) || (str[i + 3] !== '=' && d < 0)) {
			throw new Error('Invalid base64 input: unexpected character');
		}
		const n = (a << 18) | (b << 12) | (c << 6) | d;
		result += String.fromCharCode((n >> 16) & 255);
		if (str[i + 2] !== '=') result += String.fromCharCode((n >> 8) & 255);
		if (str[i + 3] !== '=') result += String.fromCharCode(n & 255);
	}
	return result;
}

/**
 * Compute SHA-256 hex digest. Uses Web Crypto if available, falls back
 * to a simple hash for test environments.
 */
async function sha256(message: string): Promise<string> {
	// Try Web Crypto first
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		const encoder = new TextEncoder();
		const data = encoder.encode(message);
		const hash = await crypto.subtle.digest('SHA-256', data);
		const arr = Array.from(new Uint8Array(hash));
		return arr.map(b => b.toString(16).padStart(2, '0')).join('');
	}
	// Fallback: simple hash for environments without Web Crypto (Node test runners)
	// This is NOT cryptographically secure — adequate for corruption detection only
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < message.length; i++) {
		const ch = message.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	const result = ((h1 >>> 0) * 0x100000000 + (h2 >>> 0)).toString(16).padStart(16, '0');
	// Pad to 64 chars to mimic SHA-256 length
	return '0'.repeat(48) + result;
}

export interface FltdSaveContainer {
	format: string;
	formatVersion: number;
	game: string;
	gameVersion: string;
	exportedAt: string;
	encoding: string;
	payload: string;
	checksum: string;
}

export interface ExportResult {
	success: boolean;
	data?: string;
	error?: string;
}

export interface ImportResult {
	success: boolean;
	saveJson?: string;  // The raw SaveData JSON string
	error?: string;
	isLegacy?: boolean;
}

/**
 * Export: encode SaveData JSON into a FLTD_SAVE container.
 */
export async function encodeSaveContainer(saveJson: string): Promise<ExportResult> {
	try {
		const payload = toBase64Url(saveJson);
		const checksumMessage = CHECKSUM_SALT + ':' + payload;
		const checksum = await sha256(checksumMessage);

		const container: FltdSaveContainer = {
			format: FLTD_SAVE_FORMAT,
			formatVersion: FLTD_SAVE_FORMAT_VERSION,
			game: 'Flatland TD',
			gameVersion: APP_VERSION,
			exportedAt: new Date().toISOString(),
			encoding: 'base64url+sha256',
			payload,
			checksum,
		};

		return { success: true, data: JSON.stringify(container, null, 2) };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Encoding failed' };
	}
}

/**
 * Import: decode and validate a FLTD_SAVE container.
 *
 * Returns the decoded SaveData JSON string on success.
 * If the container is valid but the SaveData schema is newer than supported,
 * returns an error.
 */
export async function decodeSaveContainer(input: string): Promise<ImportResult> {
	// Try FLTD_SAVE container first
	try {
		const container = JSON.parse(input) as Partial<FltdSaveContainer>;

		// Validate container shape
		if (container.format !== FLTD_SAVE_FORMAT) {
			if (typeof container.format === 'string') {
				return { success: false, error: 'Import failed: this is not a Flatland TD save.' };
			}
			// Not a FLTD_SAVE container — try legacy plain JSON import
			return tryLegacyImport(input);
		}

		if (typeof container.formatVersion !== 'number' || container.formatVersion > FLTD_SAVE_FORMAT_VERSION) {
			return { success: false, error: 'Import failed: this save is from a newer version of Flatland TD.' };
		}

		if (container.encoding !== 'base64url+sha256') {
			return { success: false, error: 'Import failed: unknown encoding. Orbital Command cannot decode this format.' };
		}

		if (!container.payload || !container.checksum) {
			return { success: false, error: 'Import failed: save container is missing payload or checksum.' };
		}

		// Validate checksum
		const checksumMessage = CHECKSUM_SALT + ':' + container.payload;
		const expectedChecksum = await sha256(checksumMessage);
		if (expectedChecksum !== container.checksum) {
			return { success: false, error: 'Import failed: checksum mismatch. Orbital Command suspects unauthorized geometry.' };
		}

		// Decode payload
		let saveJson: string;
		try {
			saveJson = fromBase64Url(container.payload);
			// Validate it's parseable JSON
			JSON.parse(saveJson);
		} catch {
			return { success: false, error: 'Import failed: payload is corrupted. The file contains suspiciously ambitious geometry.' };
		}

		return { success: true, saveJson };
	} catch (e) {
		if (e instanceof SyntaxError) {
			// Not valid JSON at all — try legacy plain JSON import
			return tryLegacyImport(input);
		}
		return { success: false, error: e instanceof Error ? e.message : 'Import failed: unknown error.' };
	}
}

/**
 * Try to import legacy plain JSON save (pre-FLTD_SAVE format).
 */
function tryLegacyImport(input: string): ImportResult {
	try {
		const parsed = JSON.parse(input);
		// Legacy/pre-v1 saves may not have schemaVersion yet. They still need
		// to be plain objects so migration can safely repair them.
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { success: false, error: 'Import failed: this is not a Flatland TD save.' };
		}
		// Accept it — the caller will handle migration
		return { success: true, saveJson: input, isLegacy: true };
	} catch {
		return { success: false, error: 'Import failed: the file contains suspiciously ambitious geometry.' };
	}
}

/**
 * Synchronous version of sha256 for environments where async is not possible.
 * Uses the fallback hash. Adequate for corruption detection, NOT crypto.
 */
export function sha256Sync(message: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < message.length; i++) {
		const ch = message.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	const result = ((h1 >>> 0) * 0x100000000 + (h2 >>> 0)).toString(16).padStart(16, '0');
	return '0'.repeat(48) + result;
}

export { FLTD_SAVE_FORMAT, FLTD_SAVE_FORMAT_VERSION };
