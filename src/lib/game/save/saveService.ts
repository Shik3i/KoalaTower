import { get, set, del } from 'idb-keyval';
import { createDefaultSave, CURRENT_SCHEMA_VERSION, type SaveData } from './saveTypes';
import { migrateSave, validateSaveData } from './migrations';

const SAVE_KEY = 'koala-tower-save';

let cachedSave: SaveData | null = null;

export async function loadSave(): Promise<SaveData> {
	if (cachedSave) return cachedSave;

	try {
		const raw = await get(SAVE_KEY);
		if (raw) {
			const migrated = migrateSave(raw as Record<string, unknown>);
			if (migrated && validateSaveData(migrated)) {
				cachedSave = migrated;
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

export async function persistSave(save: SaveData): Promise<void> {
	save.lastUpdated = Date.now();
	save.schemaVersion = CURRENT_SCHEMA_VERSION;
	cachedSave = save;
	try {
		await set(SAVE_KEY, save);
	} catch {
		// Silently fail - IndexedDB may be unavailable
	}
}

export function getCachedSave(): SaveData | null {
	return cachedSave;
}

export async function exportSave(): Promise<string> {
	const save = cachedSave || await loadSave();
	return JSON.stringify(save, null, 2);
}

export async function importSave(json: string): Promise<{ success: boolean; error?: string }> {
	try {
		const parsed = JSON.parse(json);
		if (!validateSaveData(parsed)) {
			return { success: false, error: 'Invalid save data format' };
		}
		const migrated = migrateSave(parsed as unknown as Record<string, unknown>);
		if (!migrated) {
			return { success: false, error: 'Save migration failed' };
		}
		cachedSave = migrated;
		await persistSave(migrated);
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
	}
}

export async function resetSave(): Promise<void> {
	try {
		await del(SAVE_KEY);
	} catch {
		// ignore
	}
	cachedSave = null;
	const defaults = createDefaultSave();
	cachedSave = defaults;
	await persistSave(defaults);
}

export function getSaveExportData(): SaveData | null {
	return cachedSave;
}
