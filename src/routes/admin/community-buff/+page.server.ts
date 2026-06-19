import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { openDatabase } from '$lib/server/db';
import { getCommunityBuff, type CommunityBuffSummary } from '$lib/server/communityBuff';
import { getAdminBuffEvents, type AdminBuffEventRow } from '$lib/server/adminData';

export const load: PageServerLoad = ({ cookies }) => {
	requireAdmin(cookies);
	try {
		const db = openDatabase();
		return { summary: getCommunityBuff(db), events: getAdminBuffEvents(db), dbError: false as const };
	} catch {
		return {
			summary: null as CommunityBuffSummary | null,
			events: [] as AdminBuffEventRow[],
			dbError: true as const
		};
	}
};
