import { safeApiJson, type ApiResult } from './apiClient';

export type CloudSaveMetadata = {
	updatedAt: string;
	schemaVersion: number;
	gameVersion: string;
	saveHash: string;
};

type CloudSaveGetResponse = {
	exists: boolean;
	metadata: CloudSaveMetadata | null;
	saveJson: Record<string, unknown> | null;
};

type CloudSavePutResponse = CloudSaveMetadata;

export type CloudSaveFetchResult =
	| { ok: true; exists: boolean; metadata: CloudSaveMetadata | null; saveJson: Record<string, unknown> | null }
	| { ok: false; offline: boolean; message: string };

export type CloudSaveUploadResult =
	| { ok: true; metadata: CloudSaveMetadata }
	| { ok: false; offline: boolean; message: string };

function unpack<T extends CloudSaveFetchResult | CloudSaveUploadResult>(
	r: ApiResult<unknown>,
	onOk: (data: any) => T
): T {
	if (r.ok) return onOk(r.data);
	return { ok: false, offline: r.offline, message: r.offline ? 'Online features unavailable.' : r.message } as T;
}

/** Fetch cloud-save metadata only (cheap, no payload). */
export async function fetchCloudSaveMeta(): Promise<CloudSaveFetchResult> {
	const r = await safeApiJson<CloudSaveGetResponse>('/api/cloud-save', {}, { timeoutMs: 4000 });
	return unpack(r, (d) => ({
		ok: true,
		exists: !!d?.exists,
		metadata: d?.metadata ?? null,
		saveJson: null
	}));
}

/** Fetch the full cloud save including its JSON payload (for restore). */
export async function fetchCloudSaveFull(): Promise<CloudSaveFetchResult> {
	const r = await safeApiJson<CloudSaveGetResponse>('/api/cloud-save?includeSave=1', {}, { timeoutMs: 6000 });
	return unpack(r, (d) => ({
		ok: true,
		exists: !!d?.exists,
		metadata: d?.metadata ?? null,
		saveJson: d?.saveJson ?? null
	}));
}

/** Upload (PUT) the current local save to the cloud. Overwrites any existing cloud save. */
export async function uploadCloudSave(
	saveJson: Record<string, unknown>,
	schemaVersion: number,
	gameVersion: string
): Promise<CloudSaveUploadResult> {
	const r = await safeApiJson<CloudSavePutResponse>(
		'/api/cloud-save',
		{
			method: 'PUT',
			body: JSON.stringify({ saveJson, schemaVersion, gameVersion })
		},
		{ timeoutMs: 8000 }
	);
	if (!r.ok) {
		return { ok: false, offline: r.offline, message: r.offline ? 'Online features unavailable.' : r.message };
	}
	if (!r.data) {
		return { ok: false, offline: false, message: 'Cloud upload failed.' };
	}
	return {
		ok: true,
		metadata: {
			updatedAt: r.data.updatedAt,
			schemaVersion: r.data.schemaVersion,
			gameVersion: r.data.gameVersion,
			saveHash: r.data.saveHash
		}
	};
}
