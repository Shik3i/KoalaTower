import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { openDatabase } from '$lib/server/db';
import { getAdminUsers, type AdminUserRow } from '$lib/server/adminData';

export const load: PageServerLoad = ({ cookies }) => {
	requireAdmin(cookies);
	try {
		return { users: getAdminUsers(openDatabase()), dbError: false as const };
	} catch {
		return { users: [] as AdminUserRow[], dbError: true as const };
	}
};
