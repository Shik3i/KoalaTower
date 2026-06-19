export type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; offline: true; status?: undefined; message: string }
	| { ok: false; offline: false; status: number; message: string };

export type ApiClientOptions = {
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
};

export async function safeApiJson<T>(path: string, init: RequestInit = {}, options: ApiClientOptions = {}): Promise<ApiResult<T>> {
	const timeoutMs = options.timeoutMs ?? 2500;
	const fetchImpl = options.fetchImpl ?? fetch;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetchImpl(path, {
			...init,
			headers: {
				accept: 'application/json',
				...(init.body ? { 'content-type': 'application/json' } : {}),
				...init.headers
			},
			signal: controller.signal
		});
		const payload = await response.json().catch(() => null) as { error?: { message?: string } } | T | null;
		if (!response.ok) {
			const errorMessage = payload && typeof payload === 'object' && 'error' in payload && payload.error?.message
				? payload.error.message
				: 'Request failed';
			return {
				ok: false,
				offline: false,
				status: response.status,
				message: errorMessage
			};
		}
		return { ok: true, data: payload as T };
	} catch {
		return { ok: false, offline: true, message: 'Online features unavailable' };
	} finally {
		clearTimeout(timeout);
	}
}
