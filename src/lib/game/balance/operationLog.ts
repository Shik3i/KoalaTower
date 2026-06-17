/**
 * operationLog.ts — Flatland Wars flavor text for operation log messages.
 *
 * Tone: dry, self-ironic, sarcastic sci-fi command voice. Bureaucratic
 * military absurdity. Orbital Command speaking like it is very confident
 * and slightly useless. Geometric war jokes. Concise, funny, readable.
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
	blueprintUnlocked: string[];
	researchStarted: string[];
	researchCompleted: string[];
	forgeUpgraded: string[];
	saveExported: string[];
	saveImported: string[];
	saveImportFailed: string[];
	saveReset: string[];
	frontUnlocked: string[];
	achievementUnlocked: string[];
}

const POOLS: OpLogCategory = {
	deploymentStart: [
		'Tower deployed. Flatland has noticed.',
		'Dropping tower into hostile geometry. Usual drill.',
		'Telemetry online. Tower is down. Shapes are... everywhere.',
		'Another front, another swarm. Command sighs.',
		'Tower away. Budget already exceeded. Godspeed.',
		'Deployment logged. No plan survives first contact. Send it.',
		'Tower insertion confirmed. Flatland remains extremely two-dimensional.',
		'Deploying tower. The geometry department has been notified.',
		'Tower deployed. Flatland has filed a formal complaint.',
		'Deployment initiated. The Tower has been informed this is voluntary.',
	],

	waveMilestone: [
		'Wave {wave} cleared. Command is mildly impressed.',
		'Wave {wave} achieved. Nobody saw that coming.',
		'Tower holding at wave {wave}. The coffee is cold.',
		'Wave {wave}. The geometry is getting personal.',
		'Command notes: tower still standing at wave {wave}. Unexpected.',
		'{wave} waves down. The swarm is learning. So is the tower.',
		'Wave {wave} telemetry confirms the enemy remains extremely two-dimensional.',
		'Wave {wave}. The shapes have requested reinforcements. Denied.',
		'Wave {wave}. Hostile geometry detected. Negotiations have been pre-declined.',
		'Reached wave {wave}. The swarm is now statistically significant.',
	],

	bossIncoming: [
		'Large polygon detected. It has opinions.',
		'Command confirms: the triangle situation has escalated.',
		'High-value target incoming. Try not to miss.',
		'Prime shape identified. It is notably unpleasant.',
		'Enemy apex unit en route. It looks expensive.',
		'Something big just warped in. Geometry critical.',
		'A larger polygon has entered the argument.',
		'Boss inbound. Orbital Command describes it as "sub-optimal geometry."',
		'Boss incoming. It appears larger, angrier, and more geometrically entitled.',
		'Large hostile shape confirmed. Its angles are considered extremely rude.',
	],

	bossDefeated: [
		'Prime shape neutralized. Debrief: it was very rude.',
		'Command acknowledges the apex removal. Good work.',
		'Enemy command structure disrupted. Temporarily.',
		'Boss down. Telemetry suggests it was as annoying as it looked.',
		'Tower successfully argued its point. The boss disagreed permanently.',
		'Hostile shape eliminated. Its math will be missed. (No it will not.)',
		'Prime Shape defeated. Geometry has filed a complaint.',
		'Boss terminated. The remaining shapes are now considerably less confident.',
		'Prime Shape defeated. Its angles have been informed.',
		'Boss eliminated. Orbital Command reassures everyone this was the plan all along.',
	],

	newBestWave: [
		'New best wave: {wave}. Records were made to be broken.',
		'Command logs new record: wave {wave}. Somebody is getting a bonus.',
		'Previous best exceeded. Tower performance: acceptable.',
		'Wave {wave} — new personal best. The swarm is not happy.',
		'Telemetry confirms: this is the deepest deployment yet. Barely.',
		'New record. Propaganda department notified.',
		'Wave {wave}. Command will now pretend this was always the plan.',
		'New record. Historians have been ordered to sound impressed.',
		'Best wave updated: {wave}. The archives have been revised accordingly.',
	],

	coreLost: [
		'Tower lost. Flatland wins this round.',
		'Tower destroyed. Telemetry recovered. Tower: not so much.',
		'The tower has fallen. The shapes send their regards.',
		'Deployment terminated. Tower unrecoverable. Standard outcome.',
		'Command registers the loss of another tower. File: thick.',
		'Tower went down fighting. It went down. That is the part that matters.',
		'Telemetry stream ended. The last transmission was mostly static and one curse word.',
		'Tower Lost. Orbital Command describes this as an expected delivery outcome.',
		'Deployment failed. Tower lost. Telemetry recovered. Morale has been adjusted upward.',
		'Tower Lost. Orbital Command thanks it for its reusable spirit.',
		'Tower destroyed. The shapes have been politely asked to return it. They declined.',
	],

	tierUnlock: [
		'New front unlocked. The geometry there is actively offensive.',
		'{tier} available. Enemies are more numerous. And ruder.',
		'Command authorizes advance to {tier}. Expect resistance.',
		'Front opened: {tier}. The swarm is already complaining about us.',
		'Unlocked {tier}. The difficulty is not a suggestion.',
		'{tier} unlocked. The difficulty increase has been approved by a committee that has never seen a shape.',
		'Advancing to {tier}. Orbital Command has issued a formal apology to your future self.',
	],

	labUnlock: [
		'Research deck unlocked: {lab}. Science happens. Mostly safely.',
		'{lab} now available. Orbital research initiated. Results: pending.',
		'New research project: {lab}. Papers will be filed. Eventually.',
		'{lab} online. The scientists are excited. This is never good.',
		'{lab} facility online. The safety briefing has been postponed indefinitely.',
		'Research deck {lab} activated. The previous lab team is... unavailable for comment.',
		'{lab} unlocked. Orbital Command reminds all personnel that "lab accident" is not a line item in the budget.',
	],

	blueprintUnlocked: [
		'Blueprint recovered. Procurement denies ever losing it.',
		'Schematic unlocked: {name}. Somebody in R&D is taking credit.',
		'Blueprint {name} added to archives. It was definitely not stolen.',
		'{name} unlocked. Command insists this was always in the budget.',
		'Blueprint recovered. Procurement has stopped sweating. Temporarily.',
		'New schematic: {name}. It was found behind a filing cabinet. Allegedly.',
		'{name} blueprint secured. R&D has already filed three competing patents for it.',
	],

	researchStarted: [
		'Research started: {name}. Scientists have been locked in the bright room.',
		'{name} research initiated. Estimated completion: eventually.',
		'Project {name} underway. The lab smells like ozone and regret.',
		'Research Deck active: {name}. Please do not disturb the scientists. They bite.',
		'{name} research underway. The scientists have requested more coffee and fewer questions.',
		'Project {name} initiated. Command has already started planning the victory parade.',
		'{name} research in progress. The lab whiteboard currently reads "???" followed by "profit."',
	],

	researchCompleted: [
		'Research complete: {name}. The bright room has been reopened.',
		'{name} finished. The scientists insist this was intentional.',
		'Project {name} concluded. Results: promising. Side effects: manageable.',
		'{name} research done. Command is already demanding the next project.',
		'Research complete: {name}. The conclusion has been approved retroactively.',
		'{name} project finished. The scientists have been released back into general population.',
	],

	forgeUpgraded: [
		'Forge upgrade installed: {name}. Future Towers may now fail more impressively.',
		'{name} upgraded. The Forge reports increased humming.',
		'Forge upgrade complete: {name}. Efficiency improved. Marginally.',
		'Forge upgrade installed: {name}. Future losses may now be more expensive.',
		'{name} upgraded. The assembly line has acknowledged the change with moderate enthusiasm.',
		'Forge upgrade {name} installed. The probability of catastrophic failure has been... recalibrated.',
		'{name} forged. Each tower now costs slightly more and is slightly more expendable.',
	],

	saveExported: [
		'Save exported. The archives have been backed up to a questionable location.',
		'Export complete. Your progress now exists in two places. Briefly.',
		'Save data exported. Treat it with the respect it does not deserve.',
		'Export complete. Your data has been wrapped in bureaucratic tape and sent into the void.',
		'Save exported. If it vanishes, Orbital Command will deny all knowledge of its existence.',
	],

	saveImported: [
		'Import accepted. The archives have chosen to believe you.',
		'Save imported. Command is pretending not to notice the discrepancies.',
		'Archives restored. Some records appear... edited. We will not ask.',
		'Import successful. The archives have accepted your data with minimal suspicion.',
		'Save loaded. Command notes several "temporal inconsistencies" but will overlook them.',
	],

	saveImportFailed: [
		'Import rejected. The file contains suspiciously ambitious geometry.',
		'Save import failed. This is not a Flatland TD archive.',
		'Import error. Orbital Command cannot validate this data.',
		'Import rejected. The data appears to have been written by an optimistic committee.',
		'Save import failed. The file contains claims that Orbital Command cannot verify without an investigation it does not want to conduct.',
	],

	saveReset: [
		'Save reset. History has been simplified.',
		'All data cleared. Command describes this as "a fresh strategic posture."',
		'Save wiped. The archives are empty. The war begins again.',
		'Save reset. Orbital Command describes this as a "voluntary strategic recalibration."',
		'All progress erased. The archives are clean. The shapes have not been informed.',
	],

	frontUnlocked: [
		'New front operational: {name}. Enemy geometry density: unacceptable.',
		'{name} front opened. The shapes there are reportedly very rude.',
		'Command authorizes deployment to {name}. Good luck. You will need it.',
		'New front: {name}. Orbital Command has pre-written your condolence letter.',
		'{name} is now open. The geometry there has been described as "aggressively acute."',
	],

	achievementUnlocked: [
		'Achievement unlocked: {name}. Orbital Command is vaguely impressed.',
		'{name} achieved. The archives have been updated accordingly.',
		'Achievement recorded: {name}. Reward approved. Procurement pretends this was budgeted.',
		'{name}. Telemetry confirms: Orbital Command did not expect this so soon.',
		'Achievement: {name}. The coffee machine has been notified.',
		'{name} — logged. The bureaucracy has accepted this with minimum paperwork.',
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
