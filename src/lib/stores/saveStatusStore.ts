import { writable } from 'svelte/store';

export interface SaveStatus {
	writeFailed: boolean;
	message: string | null;
	loadWarning: string | null;
	lastSuccessfulWriteAt: number | null;
	lastFailureAt: number | null;
}

const DEFAULT_SAVE_STATUS: SaveStatus = {
	writeFailed: false,
	message: null,
	loadWarning: null,
	lastSuccessfulWriteAt: null,
	lastFailureAt: null,
};

export const saveStatusStore = writable<SaveStatus>({ ...DEFAULT_SAVE_STATUS });

export function reportSaveWriteSuccess(): void {
	saveStatusStore.update(status => ({
		...status,
		writeFailed: false,
		message: null,
		lastSuccessfulWriteAt: Date.now(),
	}));
}

export function reportSaveWriteFailure(message = 'Save failed. Progress may not be stored until browser storage is available again.'): void {
	saveStatusStore.update(status => ({
		...status,
		writeFailed: true,
		message,
		lastFailureAt: Date.now(),
	}));
}

export function reportSaveLoadRecovery(message: string): void {
	saveStatusStore.update(status => ({
		...status,
		loadWarning: message,
		lastFailureAt: Date.now(),
	}));
}

export function clearSaveLoadWarning(): void {
	saveStatusStore.update(status => ({ ...status, loadWarning: null }));
}
