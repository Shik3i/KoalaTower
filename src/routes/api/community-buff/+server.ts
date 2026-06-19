import { ok } from '$lib/server/api';
import { COMMUNITY_BUFF_CAP_PERCENT, getCommunityBuff } from '$lib/server/communityBuff';
import { openDatabase } from '$lib/server/db';

export const prerender = false;

const NEUTRAL_BUFF = {
	activePercent: 0,
	capPercent: COMMUNITY_BUFF_CAP_PERCENT,
	activeUntil: null,
	activeEvents: 0,
	sourceSummary: 'Community boost unavailable offline'
};

export function GET(): Response {
	// If the DB is unavailable, the game keeps working with no buff. Never 500.
	try {
		return ok(getCommunityBuff(openDatabase()));
	} catch {
		return ok(NEUTRAL_BUFF);
	}
}
