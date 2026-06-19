import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { openDatabase } from '$lib/server/db';
import { getAdminOverview, type AdminOverview } from '$lib/server/adminData';

export const load: PageServerLoad = ({ cookies }) => {
	// Defense in depth: re-check admin before touching any data.
	requireAdmin(cookies);
	try {
		const overview = getAdminOverview(openDatabase());
		return { overview, dbError: false as const };
	} catch {
		// DB unavailable: render an error state instead of crashing the server.
		return { overview: null as AdminOverview | null, dbError: true as const };
	}
};
