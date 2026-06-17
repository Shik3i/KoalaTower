import { get, set, del } from 'idb-keyval';
import { createDefaultSave, CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { migrateSave, validateSaveData } from './migrations';
import { encodeSaveContainer, decodeSaveContainer } from './saveEncoding';

const SAVE_KEY = 'geocore-td-save';

let cachedSave: SaveData | null = null;
let cachedSaveId: string | null = null;

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

	try {
		const raw = await get(SAVE_KEY);
		if (raw) {
			const migrated = migrateSave(raw as Record<string, unknown>);
			if (migrated && validateSaveData(migrated)) {
				cachedSave = migrated;
				cachedSaveId = migrated.saveId;
				return migrated;
			}
		}
	} catch {
		// Fall through to default
	}

	const defaults = createDefaultSave();
	cachedSave = defaults;
	await persistSave(defaults);
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
		return true;
	} catch {
		console.warn('[FlatlandTD] Failed to persist save — IndexedDB may be unavailable');
		return false;
	}
}

export function getCachedSave(): SaveData | null {
	return cachedSave;
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
 * 3. Validate and migrate the decoded SaveData.
 * 4. If SaveData schema is newer than supported, reject.
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

		// Step 3: Validate SaveData shape
		if (!validateSaveData(saveData)) {
			return { success: false, error: 'Import failed: invalid save data. Orbital Command cannot parse this archive.' };
		}

		// Step 4: Check schema version — reject if newer than supported
		const dataSchema = (saveData as unknown as Record<string, unknown>).schemaVersion as number;
		if (dataSchema > CURRENT_SCHEMA_VERSION) {
			return { success: false, error: 'Import failed: this save is from a newer version of Flatland TD. Please update the game.' };
		}

		// Step 5: Migrate
		const migrated = migrateSave(saveData as unknown as Record<string, unknown>);
		if (!migrated) {
			return { success: false, error: 'Import failed: save migration failed. The archives could not reconcile this data.' };
		}

		// Step 6: Persist
		cachedSave = migrated;
		await persistSave(migrated);

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

export function getSaveExportData(): SaveData | null {
	return cachedSave;
}
