/**
 * operationLog.ts — Flavor text for in-game operation log messages.
 *
 * These are short, dry, slightly absurd messages displayed as toast/banner
 * entries during gameplay. They give the game narrative personality without
 * interrupting play.
 *
 * Add new messages to the relevant category arrays. Keep them short.
 */

export interface OpLogCategory {
	deploymentStart: string[];
	waveMilestone: string[];
	bossIncoming: string[];
	bossDefeated: string[];
	newBestWave: string[];
	coreLost: string[];
	tierUnlock: string[];
	labUnlock: string[];
}

const POOLS: OpLogCategory = {
	deploymentStart: [
		'GeoCore deployed. Atmosphere breathable. Enemies: not.',
		'Dropping Core into hostile geometry. Usual drill.',
		'Telemetry online. Core is down. Enemies are... everywhere.',
		'Another planet, another swarm. Command sighs.',
		'Core away. Budget already exceeded. Godspeed.',
		'Deployment logged. No plan survives first contact. Send it.',
	],

	waveMilestone: [
		'Wave {wave} cleared. Command is mildly impressed.',
		'Wave {wave} achieved. Nobody saw that coming.',
		'Core holding at wave {wave}. The coffee is cold.',
		'Wave {wave}. The geometry is getting personal.',
		'Command notes: Core still standing at wave {wave}. Unexpected.',
		'{wave} waves down. The swarm is learning. So is the Core.',
	],

	bossIncoming: [
		'Large polygon detected. It has opinions.',
		'Command confirms: the triangle situation has escalated.',
		'High-value target incoming. Try not to miss.',
		'Boss signature identified. It is notably unpleasant.',
		'Enemy command unit en route. Budget for a replacement Core just in case.',
		'Something big just warped in. Geometry critical.',
	],

	bossDefeated: [
		'Boss neutralized. Debrief: it was very rude.',
		'Command acknowledges the boss removal. Good work.',
		'Enemy command structure disrupted. Temporarily.',
		'Boss down. Telemetry suggests it was as annoying as it looked.',
		'Core successfully argued its point. The boss disagreed permanently.',
		'Hostile shape eliminated. Its math will be missed. (No it will not.)',
	],

	newBestWave: [
		'New best wave: {wave}. Records were made to be broken.',
		'Command logs new record: wave {wave}. Somebody is getting a bonus.',
		'Previous best exceeded. Core performance: acceptable.',
		'Wave {wave} — new personal best. The swarm is not happy.',
		'Telemetry confirms: this is the deepest deployment yet. Barely.',
	],

	coreLost: [
		'Core lost. Salvage: minimal. Morale: also minimal.',
		'GeoCore destroyed. Telemetry recovered. Core: not so much.',
		'The Core has fallen. The swarm sends its regards.',
		'Deployment terminated. Core unrecoverable. Standard outcome.',
		'Command registers the loss of another Core. File: thick.',
		'Core went down fighting. It went down. That is the part that matters.',
		'Telemetry stream ended. The last transmission was mostly static and one curse word.',
	],

	tierUnlock: [
		'New front unlocked. The geometry there is actively offensive.',
		'{tier} available. Enemies are more numerous. And ruder.',
		'Command authorizes advance to {tier}. Expect resistance.',
		'Front opened: {tier}. The swarm is already complaining about us.',
		'Unlocked {tier}. The difficulty is not a suggestion.',
	],

	labUnlock: [
		'Research deck unlocked: {lab}. Science happens. Mostly safely.',
		'{lab} now available. Orbital research initiated. Results: pending.',
		'New research project: {lab}. Papers will be filed. Eventually.',
		'{lab} online. The scientists are excited. This is never good.',
	],
};

function pick(arr: string[]): string {
	const idx = Math.floor(Math.random() * arr.length);
	return arr[idx] ?? '';
}

export function getOpLogMessage(
	category: keyof OpLogCategory,
	tokens?: Record<string, string | number>,
): string {
	const pool = POOLS[category];
	if (!pool || pool.length === 0) return '';
	let msg = pick(pool);
	if (tokens) {
		for (const [key, val] of Object.entries(tokens)) {
			msg = msg.replace(`{${key}}`, String(val));
		}
	}
	return msg;
}
