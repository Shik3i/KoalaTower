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
	// In-run interaction
	pauseGame: string[];
	resumeGame: string[];
	speedChange: string[];
	upgradeMaxLevel: string[];
	upgradeNotEnough: string[];
	// Blueprint
	blueprintDiscovered: string[];
	blueprintAlreadyOwned: string[];
	blueprintNotYetFound: string[];
	// Hub: Forge
	workshopMaxLevel: string[];
	workshopNotEnough: string[];
	// Hub: Lab
	labAlreadyActive: string[];
	labMaxLevel: string[];
	// Black Market
	blackMarketShipmentClaimed: string[];
	blackMarketContractClaimed: string[];
	blackMarketUnlockPurchased: string[];
	blackMarketConverterUsed: string[];
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
		'Tower down. The swarm has been updated on our arrival.',
		'Deployment confirmed. The shapes are aware. They always are.',
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
		'Wave {wave}. Command files this under Slightly Impressive.',
		'Wave {wave} achieved. The shapes are recalibrating. The tower is not listening.',
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
		'Apex-class entity inbound. Orbital Command is pretending to be calm.',
		'Prime shape en route. It has more HP than originally budgeted.',
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
		'Boss down. The swarm is reconsidering its options. Briefly.',
		'Apex unit destroyed. Command presses its palms together and says nothing useful.',
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
		'Wave {wave} — new all-time depth. The shapes have been informed of their inadequacy.',
		'Record: {wave}. Orbital Command stamps this with exactly the right level of enthusiasm.',
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
		'Core breach confirmed. The tower has been reclassified as field research.',
		'Deployment concluded. Involuntarily. The Forge has already started the next one.',
	],

	tierUnlock: [
		'New front unlocked. The geometry there is actively offensive.',
		'{tier} available. Enemies are more numerous. And ruder.',
		'Command authorizes advance to {tier}. Expect resistance.',
		'Front opened: {tier}. The swarm is already complaining about us.',
		'Unlocked {tier}. The difficulty is not a suggestion.',
		'{tier} unlocked. The difficulty increase has been approved by a committee that has never seen a shape.',
		'Advancing to {tier}. Orbital Command has issued a formal apology to your future self.',
		'New front authorized: {tier}. Orbital Command describes it as "technically survivable."',
		'{tier} unlocked. The shapes there have already scheduled a complaint.',
		'Advance to {tier} authorized. The geometry there is reportedly worse in every measurable way.',
		'Command notes: {tier} is now open. Command does not recommend it. Godspeed.',
		'{tier} online. The enemy there has been briefed. They appear confident.',
	],

	labUnlock: [
		'Research deck unlocked: {lab}. Science happens. Mostly safely.',
		'{lab} now available. Orbital research initiated. Results: pending.',
		'New research project: {lab}. Papers will be filed. Eventually.',
		'{lab} online. The scientists are excited. This is never good.',
		'{lab} facility online. The safety briefing has been postponed indefinitely.',
		'Research deck {lab} activated. The previous lab team is... unavailable for comment.',
		'{lab} unlocked. Orbital Command reminds all personnel that "lab accident" is not a line item in the budget.',
		'{lab} research project now available. The scientists are already arguing about methodology.',
		'New research deck: {lab}. Orbital Command has pre-approved the hypothesis. Sight unseen.',
		'{lab} project opened. Funding has been secured from somewhere unspecified.',
		'Research deck unlocked: {lab}. The scientists have been given more coffee and fewer choices.',
		'{lab} online. Results will be classified as soon as anyone understands them.',
	],

	blueprintUnlocked: [
		'Blueprint recovered. Procurement denies ever losing it.',
		'Schematic unlocked: {name}. Somebody in R&D is taking credit.',
		'Blueprint {name} added to archives. It was definitely not stolen.',
		'{name} unlocked. Command insists this was always in the budget.',
		'Blueprint recovered. Procurement has stopped sweating. Temporarily.',
		'New schematic: {name}. It was found behind a filing cabinet. Allegedly.',
		'{name} blueprint secured. R&D has already filed three competing patents for it.',
		'{name} schematic secured. Someone is already taking credit and nobody is surprised.',
		'Blueprint added to archives: {name}. No further questions are being accepted.',
		'{name} committed to design archives. Procurement claims this was planned from the start.',
		'Schematic approved: {name}. The review process took three working days and one heated argument.',
		'{name} unlocked. The previous version of this blueprint has been quietly retired from history.',
	],

	researchStarted: [
		'Research started: {name}. Scientists have been locked in the bright room.',
		'{name} research initiated. Estimated completion: eventually.',
		'Project {name} underway. The lab smells like ozone and regret.',
		'Research Deck active: {name}. Please do not disturb the scientists. They bite.',
		'{name} research underway. The scientists have requested more coffee and fewer questions.',
		'Project {name} initiated. Command has already started planning the victory parade.',
		'{name} research in progress. The lab whiteboard currently reads "???" followed by "profit."',
		'Research initiated: {name}. The bright room has been sealed for everyone\'s protection.',
		'{name} project active. Estimated timeline: somewhere between soon and eventually.',
	],

	researchCompleted: [
		'Research complete: {name}. The bright room has been reopened.',
		'{name} finished. The scientists insist this was intentional.',
		'Project {name} concluded. Results: promising. Side effects: manageable.',
		'{name} research done. Command is already demanding the next project.',
		'Research complete: {name}. The conclusion has been approved retroactively.',
		'{name} project finished. The scientists have been released back into general population.',
		'{name} research concluded. Results: approved. Side effects: deniable.',
		'Project {name} complete. The scientists have exited the bright room under their own power.',
		'{name} done. The lab has been decontaminated. Mostly. The smell will pass.',
		'{name} finished. Orbital Command has pre-written the press release. It is flattering.',
	],

	forgeUpgraded: [
		'Forge upgrade installed: {name}. Future Towers may now fail more impressively.',
		'{name} upgraded. The Forge reports increased humming.',
		'Forge upgrade complete: {name}. Efficiency improved. Marginally.',
		'Forge upgrade installed: {name}. Future losses may now be more expensive.',
		'{name} upgraded. The assembly line has acknowledged the change with moderate enthusiasm.',
		'Forge upgrade {name} installed. The probability of catastrophic failure has been... recalibrated.',
		'{name} forged. Each tower now costs slightly more and is slightly more expendable.',
		'{name} installed. The Forge has filed this under "acceptable expenditure."',
		'Forge modification complete: {name}. The change is imperceptible but officially documented.',
		'{name} — Forge log updated. The assembly line declines to elaborate.',
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
		'{name} front now accessible. The shapes there were not consulted on this decision.',
		'Deployment to {name} authorized. Proceed with caution and geometry.',
		'{name} operational. The front is ready. The front does not care.',
		'New front opened: {name}. The difficulty has been classified as "extremely personal."',
		'{name} added to deployment options. Orbital Command has pre-filed the paperwork. Both copies.',
	],

	achievementUnlocked: [
		'Achievement unlocked: {name}. Orbital Command is vaguely impressed.',
		'{name} achieved. The archives have been updated accordingly.',
		'Achievement recorded: {name}. Reward approved. Procurement pretends this was budgeted.',
		'{name}. Telemetry confirms: Orbital Command did not expect this so soon.',
		'Achievement: {name}. The coffee machine has been notified.',
		'{name} — logged. The bureaucracy has accepted this with minimum paperwork.',
		'{name} — logged. Orbital Command is only slightly surprised by the timing.',
		'Achievement: {name}. The record has been updated. Reluctantly, but officially.',
		'{name} cleared. The appropriate form has been submitted, stamped, and filed.',
		'Milestone reached: {name}. Reward authorized after brief bureaucratic review.',
		'{name} — Orbital Command presses its palms together and nods very slowly.',
	],

	// ── In-run interaction ───────────────────────────────────────────────────

	pauseGame: [
		'Orbital Command does not pause wars. And yet.',
		'Simulation suspended. The shapes are also waiting. Politely.',
		'Paused. Flatland stares. The tower stares back.',
		'Temporal hold engaged. The geometry has been informed.',
		'Simulation paused. The swarm files this under "suspicious."',
		'Hold issued. The tower stands. The shapes contemplate their angles.',
		'Pause confirmed. Orbital Command describes this as "strategic deliberation."',
	],

	resumeGame: [
		'Simulation resumed. The shapes are not pleased.',
		'Resuming. The geometry was getting impatient.',
		'Temporal hold released. Engagement continues.',
		'Back to it. The swarm had been waiting with alarming patience.',
		'Resume confirmed. The shapes were confused. Now they are angry.',
		'Simulation restored. Orbital Command claims this was intentional.',
		'Re-engaging. The shapes have been informed. They were ready.',
	],

	speedChange: [
		'⏩ {speed}× — command says: acceptable.',
		'⏩ {speed}× — time negotiated downward.',
		'⏩ {speed}× — the shapes remain unaware of the adjustment.',
		'⏩ {speed}× — telemetry compressed. Accuracy: maintained.',
		'⏩ {speed}× — temporal override logged by Orbital Command.',
		'⏩ {speed}× — the engineers decline to comment on the physics.',
		'⏩ {speed}× — Orbital Command approves this, informally.',
	],

	upgradeMaxLevel: [
		'Upgrade ceiling reached. The tower is content. Suspiciously.',
		'Maximum efficiency. Further improvement would be irresponsible.',
		'This system is at theoretical peak. The theory is holding.',
		'Max level. Orbital Command stamps this with something vague and approving.',
		'This upgrade can go no further. Neither can this form.',
		'Ceiling achieved. The Forge has been notified and is pleased.',
		'Upgrade limit reached. The tower has accepted its final form.',
	],

	upgradeNotEnough: [
		'Insufficient Energy. The upgrade has been added to the waiting list.',
		'Energy reserves depleted. The upgrade queue thanks you for your interest.',
		'Not enough Energy. Collect more from the field first.',
		'Energy deficit. The tower is aware of its own limitations.',
		'Upgrade denied. Perhaps destroy more shapes first.',
		'Energy shortage. The tower files this under Expected.',
		'Insufficient Energy. The upgrade remains pending. Indefinitely.',
	],

	blueprintDiscovered: [
		'Schematic recovered: {name}. Procurement insists they knew where it was.',
		'Field recovery confirmed: {name}. R&D is already arguing over who gets credit.',
		'{name} blueprint found. Its chain of custody is unclear. Gloriously.',
		'New schematic: {name}. Orbital Command has pre-filed the success report.',
		'Schematic secured in the field: {name}. Research it at Orbital Command.',
		'{name} recovered. The shapes had it. They no longer do.',
		'Blueprint fragment retrieved: {name}. Origins classified. Even from us.',
	],

	blueprintAlreadyOwned: [
		'Already researched. The archives are not a recycle bin.',
		'Schematic already committed to the Tower design. Permanently.',
		'Research complete. Repeating it would change nothing. Probably.',
		'This blueprint is in active deployment. The bureaucracy notes: redundant.',
		'Already in service. Procurement has this filed under Done.',
	],

	blueprintNotYetFound: [
		'Schematic not yet recovered. Deploy and search the field first.',
		'Blueprint classified: field discovery required before research.',
		'R&D needs the physical schematic before research can begin. Deploy to find it.',
		'No blueprint recovered yet. The field does not yield schematics willingly.',
		'Discovery required first. Check the blueprint\'s conditions and deploy accordingly.',
	],

	workshopMaxLevel: [
		'Forge upgrade maxed. The assembly line declines to improve further.',
		'Maximum calibration achieved. The Forge is satisfied. A first.',
		'This upgrade path has reached its installed ceiling.',
		'Fully committed to the design. The Forge engineers have moved on.',
		'Max level. The permanent record has been marked accordingly.',
		'Ceiling: reached. The Forge has closed this line and moved to other problems.',
	],

	workshopNotEnough: [
		'Insufficient Alloy. The Forge raises an eyebrow diplomatically.',
		'Not enough Alloy. Procurement has filed this under Expected Shortfalls.',
		'Alloy deficit. Collect more in the field and return.',
		'Forge purchase denied. Alloy reserves below required threshold.',
		'The Forge cannot process what it has not been given.',
		'Alloy short. The Forge is patient. Marginally.',
	],

	labAlreadyActive: [
		'Research in progress. The scientists are not available.',
		'One project at a time. The lab supports sequential brilliance only.',
		'Active research detected. The bright room is occupied.',
		'Lab busy. Adding more projects does not make science faster. Allegedly.',
		'A project is running. The scientists cannot be interrupted mid-result.',
	],

	labMaxLevel: [
		'Research project maxed. The scientists have run out of improvements to make.',
		'Maximum level reached. The lab has been officially sealed.',
		'This project is fully concluded. The results have been classified.',
		'No further research possible on this project. The scientists are relieved.',
		'Maxed. The research team has been reassigned to something equally vague.',
	],

	// ── Black Market ────────────────────────────────────────────────────────

	blackMarketShipmentClaimed: [
		'Shipment accepted. The container stopped humming. That is probably fine.',
		'Weekly contraband processed. Orbital Command\'s supply ledger grows more fictional by the week.',
		'Shipment secured. No manifest. No customs. No record. No problem.',
		'Weekly delivery claimed. The vendor has been notified. Command has not.',
	],
	blackMarketContractClaimed: [
		'Daily contract filed. The shapes never knew they were part of a transaction.',
		'Contract complete. Strange Matter allocated. Paper trail: none.',
		'Daily assignment fulfilled. The off-grid ledger has been updated. The official one has not.',
		'Contract claimed. The vendor acknowledges your contribution to the unofficial economy.',
	],
	blackMarketUnlockPurchased: [
		'Contraband procured: {name}. The receipt has already been shredded.',
		'{name} acquired. Strange Matter well spent. Command well uninformed.',
		'Black Market unlock secured: {name}. Operates outside seventeen safety directives.',
		'{name} procured. Orbital Command\'s ledger will not reflect this transaction.',
	],
	blackMarketConverterUsed: [
		'Schematics converted. {converted} designs returned to the void. One emerged.',
		'Converter cycle complete. {converted} obsolete blueprints. One restricted one. Fair trade.',
		'{converted} Schematics fed to the converter. It hummed. It delivered.',
		'Conversion finished. The converter thanks you for your geometric sacrifice.',
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
			msg = msg.replaceAll(`{${key}}`, String(val));
		}
	}
	return msg;
}
