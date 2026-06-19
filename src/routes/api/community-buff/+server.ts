import { ok } from '$lib/server/api';
import { getCommunityBuff } from '$lib/server/communityBuff';
import { openDatabase } from '$lib/server/db';

export const prerender = false;

export function GET(): Response {
	return ok(getCommunityBuff(openDatabase()));
}
