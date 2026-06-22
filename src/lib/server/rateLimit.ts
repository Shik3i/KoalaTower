type Bucket = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Periodic cleanup evicts expired entries so the in-memory bucket map cannot
 * grow without bound from one-off IPs that never return.
 */
const CLEANUP_INTERVAL_MS = 60_000;

if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		const now = Date.now();
		for (const [key, bucket] of buckets) {
			if (bucket.resetAt <= now) buckets.delete(key);
		}
	}, CLEANUP_INTERVAL_MS).unref?.();
}

export function isRateLimited(key: string, limit = 8, windowMs = 60_000, now = Date.now()): boolean {
	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return false;
	}
	bucket.count += 1;
	return bucket.count > limit;
}

export function clearRateLimits(): void {
	buckets.clear();
}
