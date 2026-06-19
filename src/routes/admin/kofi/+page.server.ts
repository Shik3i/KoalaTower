import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { openDatabase } from '$lib/server/db';
import { getAdminKofiEvents, type AdminKofiRow } from '$lib/server/adminData';

export const load: PageServerLoad = ({ cookies }) => {
	requireAdmin(cookies);
	try {
		return { events: getAdminKofiEvents(openDatabase()), dbError: false as const };
	} catch {
		return { events: [] as AdminKofiRow[], dbError: true as const };
	}
};
