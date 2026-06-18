/**
 * blackMarketCopy.ts — Black Market flavour copy pools.
 *
 * All copy is dry, self-ironic, sarcastic off-grid procurement tone.
 * Orbital Command does not authorise any of it. That is the point.
 */

function pick(arr: string[]): string {
	const idx = Math.floor(Math.random() * arr.length);
	return arr[idx] ?? '';
}

/** Replaces `{n}` tokens with values. */
export function interpolate(template: string, tokens?: Record<string, string | number>): string {
	let msg = template;
	if (tokens) {
		for (const [key, val] of Object.entries(tokens)) {
			msg = msg.replaceAll(`{${key}}`, String(val));
		}
	}
	return msg;
}

// ═══════════════════════════════════════════════════════════════════════════
// Signal status lines — shown when the Black Market beacon is detected
// ═══════════════════════════════════════════════════════════════════════════

const SIGNAL_STATUS: string[] = [
	'Signal active. Origin unlocated. Probably fine.',
	'Unauthorized frequency open. Command is not watching this channel.',
	'Encrypted connection established. No handshake logged. Good.',
	'Vendor online. Identity unverified. Merchandise confirmed.',
	'Signal strength: sufficient. Orbital Command signal strength: oblivious.',
	'Transmission secured. If you\'re reading this, so are you.',
	'Black Market channel open. No official record of this session.',
	'Contact established with unknown vendor. Proceeding without authorization.',
	'Signal live. Contraband inventory ready for inspection.',
	'Unauthorized beacon confirmed. Arrival time: approximate.',
	'Off-grid connection stable. What Command doesn\'t know won\'t hurt them.',
	'Channel open. Encryption active. Plausible deniability: intact.',
	'Vendor signal acquired. Shipment window open.',
	'Restricted frequency accessed. This is technically against regulations.',
	'Signal authenticated — by the vendor\'s own system. Close enough.',
	'Black Market connection live. Log this however you like.',
	'Broadcast received. Source geometry: ambiguous. Trust level: acceptable.',
	'Handshake complete. Orbital Command\'s firewall sends its regards — it failed.',
	'Signal status: active and unsanctioned. Business as usual.',
	'Unauthorized channel confirmed. Welcome back.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Weekly shipment flavour — shown alongside the shipment panel
// ═══════════════════════════════════════════════════════════════════════════

const SHIPMENT_FLAVOUR: string[] = [
	'New shipment arrived. Source claims it "fell off a geometry transport."',
	'Weekly delivery logged. Contents inspected by no one official.',
	'Shipment confirmed. The vendor describes these as "reclaimed Alloy byproducts." Sure.',
	'This week\'s stock sourced from undisclosed extraction zones. Freshness unverified.',
	'Shipment arrived ahead of schedule. The vendor seems to be in a hurry.',
	'Goods delivered. Orbital Command paperwork: none. Our kind of transaction.',
	'This week\'s shipment smells faintly of Strange Matter. Vendor says that\'s normal.',
	'Weekly supply confirmed. No manifests. No customs. No questions.',
	'Goods arrived. Possibly surplus. Possibly recovered. Vendor not specifying.',
	'Shipment processed. The vendor left a note: "You\'re welcome."',
	'New stock available. Origin: adjacent to authorized supply chains, apparently.',
	'Weekly delivery confirmed. No return address. No sender name. Standard.',
	'Shipment received. Vendor describes quality as "better than Command\'s."',
	'Contents verified. Strange Matter levels: within the vendor\'s personal threshold.',
	'Weekly drop confirmed. Everything appears functional. No guarantees offered.',
	'Goods catalogued. The vendor included an unsigned handwritten note. Ignored.',
	'Shipment available. This batch apparently took longer than usual. No explanation.',
	'Delivery confirmed. Vendor notes this is a "particularly good week." Suspicious.',
	'New shipment ready. Contents: better not to ask. Results: usually good.',
	'Weekly goods confirmed. Orbital Command\'s loss. Operator\'s gain.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Shipment accepted lines — toast after accepting the weekly drop
// ═══════════════════════════════════════════════════════════════════════════

const SHIPMENT_ACCEPTED: string[] = [
	'Exchange complete. Strange Matter transferred. No receipt.',
	'Transaction logged — on your end only. Command stays uninformed.',
	'Purchase confirmed. The vendor appreciates your business, unofficially.',
	'Accepted. No paperwork. No regrets.',
	'Exchange complete. The goods are yours. The log is yours to hide.',
	'Transaction processed. Enjoy the acquisition. Don\'t mention it.',
	'Shipment accepted. Strange Matter deducted. No audit trail initiated.',
	'Deal closed. Vendor sends regards. Command sends nothing — Command doesn\'t know.',
	'Exchange confirmed. The shapes won\'t ask where you got it.',
	'Accepted. Use it well. Return policy: none.',
	'Transaction complete. Strange Matter spent. Item integrated.',
	'Exchange logged off-record. Enjoy the upgrade. Stay discreet.',
	'Shipment secured. The vendor notes this was a good choice.',
	'Deal done. Whatever Command thinks, they\'re wrong about this one.',
	'Accepted. No signatures required. No questions asked.',
	'Transaction finalized. Off-grid and off-books. As intended.',
	'Exchange complete. Vendor disconnecting. Same time next week.',
	'Shipment accepted. Strange Matter balance updated. Carry on.',
	'Deal confirmed. You have the goods. We have the discretion.',
	'Transaction processed. Orbital Command\'s loss continues to be your gain.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Daily contract flavour — shown alongside the contract panel
// ═══════════════════════════════════════════════════════════════════════════

const CONTRACT_FLAVOUR: string[] = [
	'Today\'s job is straightforward. The shapes are not.',
	'Contract parameters set. Expected difficulty: elevated.',
	'Daily brief ready. Shape threat level: standard plus complications.',
	'Today\'s parameters issued by an unspecified party. Best guess: the usual vendor.',
	'Contract active. Completion unlocks a Strange Matter allocation.',
	'Daily assignment loaded. Threat geometry: confirmed hostile.',
	'Job parameters received. Unusual conditions apply.',
	'Today\'s contract: survive what the shapes throw at you. Simple.',
	'Assignment issued. The shapes weren\'t briefed, but they\'ll figure it out.',
	'Contract active. Completion criteria: complete. Shapes: unaware of criteria.',
	'Daily operation parameters set. Command does not endorse this contract.',
	'Assignment received from off-grid. Proceed at standard operational risk.',
	'Today\'s job logged. Shape activity expected to match.',
	'Contract parameters: unusual. Strange Matter reward: confirmed.',
	'Daily operation active. Source: classified. Reward: Strange Matter.',
	'Assignment loaded. Approximate threat match. Proceed.',
	'Today\'s objective defined by sources outside official Orbital Command channels.',
	'Contract ready. Performance tracked off the record. Reward on completion.',
	'Daily parameters active. This contract does not appear in official Archives.',
	'Assignment issued. The shapes don\'t know it\'s a contract. That\'s the advantage.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Outsourced Research Lab teasers — shown under the "coming later" item
// ═══════════════════════════════════════════════════════════════════════════

const OUTSOURCED_LAB_TEASER: string[] = [
	'Outsourced Research Lab: incoming. Not from Orbital Command. Better.',
	'Research-for-hire program in development. Expanded schematic access. Coming soon.',
	'A third-party research operation is apparently preparing for launch. Unofficially.',
	'Off-grid research services: coming to this channel. Timeline: unspecified.',
	'Vendor note: "Working on something useful. Give it time." Direct quote.',
	'Outsourced Research Lab: not yet operational. Signal suggests it will be.',
	'Independent schematic research coming soon. Optional. Never required.',
	'Off-the-record research access: in development. Worth the wait, reportedly.',
	'Vendor confirms: external research lab is coming. Will never be mandatory.',
	'Outsourced Research Lab approaching. Same channel. Different function. Stand by.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Channel intro copy — shown in the Black Market discovery modal
// ═══════════════════════════════════════════════════════════════════════════

const CHANNEL_INTRO: string[] = [
	'An encrypted procurement signal is bleeding through the Orbital Command firewall.',
	'The signature is old. The funding codes are current. The legal status is flexible.',
	'Strange Matter transactions are prohibited under seventeen active safety directives.',
	'Fortunately, this terminal has misplaced all seventeen.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

export const blackMarketCopy = {
	signalStatus: () => pick(SIGNAL_STATUS),
	shipmentFlavour: () => pick(SHIPMENT_FLAVOUR),
	shipmentAccepted: () => pick(SHIPMENT_ACCEPTED),
	contractFlavour: () => pick(CONTRACT_FLAVOUR),
	outsourcedLabTeaser: () => pick(OUTSOURCED_LAB_TEASER),
	channelIntro: () => CHANNEL_INTRO,
	signalStatusAll: SIGNAL_STATUS,
	shipmentFlavourAll: SHIPMENT_FLAVOUR,
	shipmentAcceptedAll: SHIPMENT_ACCEPTED,
	contractFlavourAll: CONTRACT_FLAVOUR,
	outsourcedLabTeaserAll: OUTSOURCED_LAB_TEASER,
};
