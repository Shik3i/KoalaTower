import { APP_VERSION } from '$lib/version';
import { fail, ok } from '$lib/server/api';
import { isDatabaseReachable, openDatabase } from '$lib/server/db';

export const prerender = false;

export function GET(): Response {
	let dbReachable = false;
	try {
		openDatabase();
		dbReachable = isDatabaseReachable();
	} catch {
		dbReachable = false;
	}
	return ok({
		dbReachable,
		version: APP_VERSION,
		environment: process.env.NODE_ENV || 'development'
	}, dbReachable ? undefined : { status: 503 });
}
