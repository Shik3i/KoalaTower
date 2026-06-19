import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { openDatabase } from '$lib/server/db';
import { getRecentErrorLogs, type ErrorLogRow } from '$lib/server/errorLog';

export const load: PageServerLoad = ({ cookies }) => {
	requireAdmin(cookies);
	try {
		return { logs: getRecentErrorLogs(openDatabase(), 250), dbError: false as const };
	} catch {
		return { logs: [] as ErrorLogRow[], dbError: true as const };
	}
};
