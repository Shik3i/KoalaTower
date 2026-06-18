export const FLATLAND_SW_CACHE_PREFIX = 'flatland-td-shell';
export const FLATLAND_SW_REGISTRATION_PATH = '/service-worker.js';

export function getFlatlandCacheName(version: string): string {
	return `${FLATLAND_SW_CACHE_PREFIX}-${version}`;
}

export function shouldBypassServiceWorkerCache(pathname: string): boolean {
	return pathname.startsWith('/api/');
}

export function canRegisterServiceWorker(prod: boolean, nav: Pick<Navigator, 'serviceWorker'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
	return prod && !!nav && 'serviceWorker' in nav;
}

export async function registerFlatlandServiceWorker(prod = import.meta.env.PROD): Promise<ServiceWorkerRegistration | null> {
	if (!canRegisterServiceWorker(prod)) return null;
	return navigator.serviceWorker.register(FLATLAND_SW_REGISTRATION_PATH);
}
