import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';

/**
 * Admin guard for the whole `/admin` subtree. requireAdmin throws a 404 for
 * anyone who is not a logged-in configured admin, so non-admins never see the
 * admin shell. Each child +page.server.ts also re-checks defensively before it
 * runs any data query, so admin data can never leak even if load ordering runs
 * a page load before this layout load.
 */
export const load: LayoutServerLoad = ({ cookies }) => {
	const admin = requireAdmin(cookies);
	return { admin: { username: admin.username, displayName: admin.display_name } };
};
