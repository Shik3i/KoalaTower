import { get, set, del } from 'idb-keyval';
import { createDefaultSave, CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { migrateSave, validateSaveData } from './migrations';
import { encodeSaveContainer, decodeSaveContainer } from './saveEncoding';
import {
	clearSaveLoadWarning,
	reportSaveLoadRecovery,
	reportSaveWriteFailure,
	reportSaveWriteSuccess,
} from '../../stores/saveStatusStore';

const SAVE_KEY = 'flatland-td-save';
const LEGACY_SAVE_KEY = 'geocore-td-save';

let cachedSave: SaveData | null = null;
let cachedSaveId: string | null = null;
let lastLoadCreatedDefault = false;

export async function loadSave(): Promise<SaveData> {
	if (cachedSave && cachedSaveId) {
		// Verify the cache hasn't been invalidated by external IndexedDB clear
		try {
			const onDisk = await get(SAVE_KEY);
			if (onDisk && (onDisk as SaveData).saveId === cachedSaveId) {
				return cachedSave;
			}
		} catch {
			// If we can't verify, reload from disk
		}
		cachedSave = null;
		cachedSaveId = null;
	}

	let hadStoredSave = false;
	let recoveredFromLoadProblem = false;

	try {
		const raw = await get(SAVE_KEY) ?? await get(LEGACY_SAVE_KEY);
		hadStoredSave = !!raw;
		if (raw) {
			const migrated = migrateSave(raw as Record<string, unknown>);
			if (migrated && validateSaveData(migrated)) {
				cachedSave = migrated;
				cachedSaveId = migrated.saveId;
				lastLoadCreatedDefault = false;
				clearSaveLoadWarning();
				await persistSave(migrated);
				return migrated;
			}
			recoveredFromLoadProblem = true;
			reportSaveLoadRecovery('Saved data could not be validated. A fresh session was started without overwriting the stored archive.');
		}
	} catch (e) {
		recoveredFromLoadProblem = true;
		reportSaveLoadRecovery(e instanceof Error
			? 'Saved data could not be loaded: ' + e.message
			: 'Saved data could not be loaded. A fresh session was started.');
	}

	const defaults = createDefaultSave();
	cachedSave = defaults;
	lastLoadCreatedDefault = true;
	if (!hadStoredSave && !recoveredFromLoadProblem) {
		await persistSave(defaults);
	}
	return defaults;
}

export async function persistSave(save: SaveData): Promise<boolean> {
	save.lastUpdated = Date.now();
	save.schemaVersion = CURRENT_SCHEMA_VERSION;
	// Deep-clone to avoid shared-mutable-state races with labInterval
	cachedSave = JSON.parse(JSON.stringify(save)) as SaveData;
	cachedSaveId = cachedSave.saveId;
	try {
		await set(SAVE_KEY, cachedSave);
		reportSaveWriteSuccess();
		return true;
	} catch {
		console.warn('[FlatlandTD] Failed to persist save — IndexedDB may be unavailable');
		reportSaveWriteFailure();
		return false;
	}
}

export function getCachedSave(): SaveData | null {
	return cachedSave;
}

export function didLastLoadCreateDefaultSave(): boolean {
	return lastLoadCreatedDefault;
}

/**
 * Export save as a versioned, encoded, checksummed FLTD_SAVE container.
 */
export async function exportSave(): Promise<string> {
	const save = cachedSave || await loadSave();
	return exportSaveFromData(save);
}

export async function exportSaveFromData(save: SaveData): Promise<string> {
	const saveJson = JSON.stringify(save);
	const result = await encodeSaveContainer(saveJson);
	if (result.success && result.data) {
		return result.data;
	}
	// Fallback: return raw JSON if encoding fails
	return saveJson;
}

/**
 * Import save from an FLTD_SAVE container or legacy plain JSON.
 *
 * Flow:
 * 1. Try FLTD_SAVE container → validate format, checksum, decode payload.
 * 2. If that fails with non-JSON, try legacy plain JSON import.
 * 3. Reject future schema versions before migration.
 * 4. If SaveData schema is newer than supported, reject.
 * 5. Migrate/repair/normalize, then validate the final SaveData.
 */
export async function importSave(input: string): Promise<{ success: boolean; error?: string; isLegacy?: boolean }> {
	// Size limit: 1MB to prevent browser freeze from large imports
	if (input.length > 1_000_000) {
		return { success: false, error: 'Import failed: file too large. Orbital Command archives have a 1 MB limit.' };
	}

	try {
		// Step 1: Decode the container (handles both new and legacy)
		const decoded = await decodeSaveContainer(input);

		if (!decoded.success) {
			return { success: false, error: decoded.error };
		}

		// Step 2: Parse the SaveData JSON
		let saveData: unknown;
		try {
			saveData = JSON.parse(decoded.saveJson!);
		} catch {
			return { success: false, error: 'Import failed: corrupted save data. The file contains suspiciously ambitious geometry.' };
		}

		if (!saveData || typeof saveData !== 'object') {
			return { success: false, error: 'Import failed: invalid save data. Orbital Command cannot parse this archive.' };
		}

		// Step 3: Check schema version before migration — reject if newer than supported.
		const rawSchema = (saveData as Record<string, unknown>).schemaVersion;
		const dataSchema = Number(rawSchema);
		if (Number.isFinite(dataSchema) && Math.floor(dataSchema) > CURRENT_SCHEMA_VERSION) {
			return { success: false, error: 'Import failed: this save is from a newer version of Flatland TD. Please update the game.' };
		}

		// Step 4: Migrate/repair/normalize
		const migrated = migrateSave(saveData as unknown as Record<string, unknown>);
		if (!migrated) {
			return { success: false, error: 'Import failed: save migration failed. The archives could not reconcile this data.' };
		}

		// Step 5: Validate final migrated SaveData shape.
		if (!validateSaveData(migrated)) {
			return { success: false, error: 'Import failed: invalid save data. Orbital Command cannot parse this archive.' };
		}

		// Step 6: Persist
		cachedSave = migrated;
		if (!await persistSave(migrated)) {
			return { success: false, error: 'Import decoded successfully, but the browser refused to store it. Export a backup and check site storage permissions.' };
		}

		const message = decoded.isLegacy
			? 'Legacy save imported and upgraded. The archives have been re-indexed with only minor screaming.'
			: 'Import accepted. The archives have chosen to believe you.';

		return { success: true, isLegacy: decoded.isLegacy };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Import failed: unknown error.' };
	}
}

export async function resetSave(): Promise<void> {
	try {
		await del(SAVE_KEY);
		await del(LEGACY_SAVE_KEY);
	} catch {
		// ignore
	}
	cachedSave = null;
	cachedSaveId = null;
	const defaults = createDefaultSave();
	cachedSave = defaults;
	cachedSaveId = defaults.saveId;
	await persistSave(defaults);
}
