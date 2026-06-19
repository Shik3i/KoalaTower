type Bucket = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, Bucket>();

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
