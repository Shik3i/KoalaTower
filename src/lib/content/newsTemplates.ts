import type { NewsItem, Classification, ThumbnailType } from './newsTypes';
import { pick, shuffle } from './newsEngine';
import {
	SHAPES, DEPARTMENTS, OFFICER_NAMES, BUREAUCRATIC_ACTIONS,
	ABSURD_ADJECTIVES, POLICIES, MORALE_ADDENDUMS, ACTIONS,
	ADVERBS, TIME_DESCRIPTORS, RESEARCH_TYPES, METRICS,
	EQUIPMENT, ABSURD_REASONS, ABSURD_CLAIMS, ABSURD_FINDINGS,
	ABSURD_ACTIONS, REPORT_TYPES, LOCATIONS, STATISTICS,
	CYCLES, CLASSIFICATIONS, THUMBNAILS,
} from './newsWordPools';

// ---------------------------------------------------------------------------
// Template Factory Types
// ---------------------------------------------------------------------------

type TemplateFactory = (rng: () => number, id: number) => NewsItem;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueId(counter: number): string {
	return `gen-${counter}`;
}

// ---------------------------------------------------------------------------
// Template Factories – each has a unique narrative structure
// ---------------------------------------------------------------------------

const templates: TemplateFactory[] = [

	// 1: Shape advancing despite bureaucratic objection
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Frontline Report',
		headline: `${pick(rng, SHAPES)} advance ${pick(rng, ADVERBS)}`,
		snippet: `Hostile ${pick(rng, SHAPES)} units have been observed ${pick(rng, ACTIONS)} ${pick(rng, ADVERBS)}. ${pick(rng, DEPARTMENTS)} describes the situation as "${pick(rng, ABSURD_ADJECTIVES)}." Orbital Command reminds citizens that ${pick(rng, POLICIES)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'triangle',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 2: Department announces absurd policy
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Bureaucratic Notice',
		headline: `${pick(rng, DEPARTMENTS)} announces new ${pick(rng, ABSURD_ADJECTIVES)} policy`,
		snippet: `In a ${pick(rng, TIME_DESCRIPTORS)} communiqué, ${pick(rng, DEPARTMENTS)} declared that ${pick(rng, POLICIES)}. ${pick(rng, OFFICER_NAMES)} stated the change was "${pick(rng, ABSURD_ADJECTIVES)}" and necessary to address ${pick(rng, METRICS)}. ${pick(rng, DEPARTMENTS)} was not consulted. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'classified',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 3: Officer promoted for absurd reason
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Personnel Update',
		headline: `${pick(rng, OFFICER_NAMES)} promoted for ${pick(rng, BUREAUCRATIC_ACTIONS)}`,
		snippet: `${pick(rng, OFFICER_NAMES)} has been awarded recognition after a report classified ${pick(rng, METRICS)} as "${pick(rng, ABSURD_ADJECTIVES)}." The methodology ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, DEPARTMENTS)} praised the work. ${pick(rng, OFFICER_NAMES)} was not available for comment, having been transferred to ${pick(rng, LOCATIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'boss',
		timestamp: '',
		author: `Personnel Retention Taskforce`,
		refId: '',
		source: 'generated',
	}),

	// 4: Study proves shapes are [absurd adjective] on purpose
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Scientific Breakthrough',
		headline: `${pick(rng, RESEARCH_TYPES)} confirms ${pick(rng, SHAPES)} are ${pick(rng, ABSURD_ADJECTIVES)} on purpose`,
		snippet: `${pick(rng, RESEARCH_TYPES)} by ${pick(rng, DEPARTMENTS)} has concluded that ${pick(rng, SHAPES)} ${pick(rng, ABSURD_FINDINGS)}. "${pick(rng, ABSURD_CLAIMS)}," said ${pick(rng, OFFICER_NAMES)}, lead author. Countermeasures ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'radar',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 5: Emergency meeting concludes absurd policy
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Budget Review',
		headline: `Emergency fiscal meeting concludes Tower should simply ${pick(rng, ACTIONS)}`,
		snippet: `Following ${pick(rng, TIME_DESCRIPTORS)} review of ${pick(rng, METRICS)}, ${pick(rng, DEPARTMENTS)} has issued a directive recommending that Towers "${pick(rng, ACTIONS)}." No additional ${pick(rng, EQUIPMENT)} was allocated. ${pick(rng, OFFICER_NAMES)} described the recommendation as "${pick(rng, ABSURD_ADJECTIVES)}." A follow-up ${pick(rng, REPORT_TYPES)} has been scheduled. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'hexagon',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 6: Weather report – 100% chance of shapes
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Weather Advisory',
		headline: `Flatland Weather Report: ${pick(rng, STATISTICS)} chance of ${pick(rng, SHAPES)}`,
		snippet: `The ${pick(rng, DEPARTMENTS)} forecasts continued ${pick(rng, ABSURD_ADJECTIVES)} precipitation across ${pick(rng, LOCATIONS)}. Citizens are advised to expect ${pick(rng, SHAPES)}, ${pick(rng, SHAPES)}, and the occasional ${pick(rng, SHAPES)} threat. Visibility remains ${pick(rng, ABSURD_ADJECTIVES)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'square',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 7: Archives reveal war started due to absurd reason
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Historical Note',
		headline: `Archives reveal war started because ${pick(rng, ABSURD_REASONS)}`,
		snippet: `Documents ${pick(rng, BUREAUCRATIC_ACTIONS)} reveal that the Flatland conflict may have originated when ${pick(rng, ABSURD_REASONS)}. "${pick(rng, ABSURD_CLAIMS)}," reads a fragment recovered from ${pick(rng, LOCATIONS)}. ${pick(rng, OFFICER_NAMES)} has ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: 'Cycle 2144',
		classification: 'Sanitized',
		thumbnail: 'classified',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 8: Lab accident produces better results
	(rng, id) => ({
		id: uniqueId(id),
		category: 'R&D Briefing',
		headline: `Lab incident produces ${pick(rng, ABSURD_ADJECTIVES)} results than intended`,
		snippet: `A ${pick(rng, ABSURD_ADJECTIVES)} containment event at ${pick(rng, LOCATIONS)} has resulted in a net improvement to ${pick(rng, METRICS)}. "We are calling this ${pick(rng, BUREAUCRATIC_ACTIONS)}," said ${pick(rng, OFFICER_NAMES)}, who was not present at the time. The affected area has been cordoned off and renamed. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'radar',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 9: Shapes refuse to stop spawning despite memos
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Bureaucratic Notice',
		headline: `${pick(rng, SHAPES)} refuse to stop ${pick(rng, ACTIONS)} despite strongly worded memo`,
		snippet: `A communiqué issued to ${pick(rng, SHAPES)} ${pick(rng, TIME_DESCRIPTORS)} demanding an immediate cessation of ${pick(rng, ACTIONS)} has received no reply. ${pick(rng, DEPARTMENTS)} describes this as "${pick(rng, ABSURD_ADJECTIVES)}" and has ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'warning',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)} Communications Office`,
		refId: '',
		source: 'generated',
	}),

	// 10: Diplomatic cable – peace talks collapse absurdly
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Diplomatic Cable',
		headline: `Peace talks with ${pick(rng, SHAPES)} collapse after shape ${pick(rng, ABSURD_ACTIONS)}`,
		snippet: `Diplomatic envoys from ${pick(rng, DEPARTMENTS)} report negotiations with ${pick(rng, SHAPES)} broke down when the shape delegation ${pick(rng, ABSURD_ACTIONS)}. "We presented ${pick(rng, ABSURD_ADJECTIVES)} terms and they just responded with ${pick(rng, ABSURD_ADJECTIVES)} geometry," ${pick(rng, OFFICER_NAMES)} reported. The war ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'hexagon',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, Office of Geometric Relations`,
		refId: '',
		source: 'generated',
	}),

	// 11: Equipment advisory – targeting computer has weird preference
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Equipment Advisory',
		headline: `${pick(rng, EQUIPMENT)} found to prioritize shapes it finds "${pick(rng, ABSURD_ADJECTIVES)}"`,
		snippet: `An internal audit of ${pick(rng, EQUIPMENT)} logs reveals the system assigns higher threat scores to ${pick(rng, SHAPES)} with ${pick(rng, ABSURD_ADJECTIVES)} proportions. "It is not a bug," stresses ${pick(rng, DEPARTMENTS)}. "The machine simply has ${pick(rng, ABSURD_ADJECTIVES)} standards." A patch ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'tower',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 12: Tower exploded within approved tolerances
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Field Report',
		headline: `Recovered telemetry indicates ${pick(rng, EQUIPMENT)} performed within ${pick(rng, ABSURD_ADJECTIVES)} tolerances`,
		snippet: `Engineers reviewing the latest ${pick(rng, LOCATIONS)} deployment confirm the ${pick(rng, EQUIPMENT)} destruction fell within ${pick(rng, ABSURD_ADJECTIVES)} performance margins. "It stopped functioning exactly as predicted," the ${pick(rng, REPORT_TYPES)} states. ${pick(rng, DEPARTMENTS)} has ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'warning',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)} Engineering Corps`,
		refId: '',
		source: 'generated',
	}),

	// 13: Forge workers vote to pretend this was the plan
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Labor Dispatch',
		headline: `${pick(rng, DEPARTMENTS)} workers vote to ${pick(rng, BUREAUCRATIC_ACTIONS)}`,
		snippet: `In a ${pick(rng, ABSURD_ADJECTIVES)} decision, ${pick(rng, DEPARTMENTS)} crews have agreed to ${pick(rng, BUREAUCRATIC_ACTIONS)}. "It looks ${pick(rng, ABSURD_ADJECTIVES)} if you don't check the earlier ${pick(rng, METRICS)}," said ${pick(rng, OFFICER_NAMES)}. The ${pick(rng, REPORT_TYPES)} has been ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'hexagon',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 14: Supply bulletin – rationing declared successful
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Supply Bulletin',
		headline: `${pick(rng, EQUIPMENT)} rationing declared ${pick(rng, ABSURD_ADJECTIVES)} after nobody was asked`,
		snippet: `${pick(rng, EQUIPMENT)} distribution has been optimized based on a new ${pick(rng, ABSURD_ADJECTIVES)} model that forecasts ${pick(rng, METRICS)} significantly lower than current ${pick(rng, LOCATIONS)} deployments. The model's creators ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'warning',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 15: Boss shapes contain more boss than disclosed
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Threat Assessment',
		headline: `${pick(rng, SHAPES)} found to contain ${pick(rng, STATISTICS)} more mass than previously disclosed`,
		snippet: `Revised scanning protocols at ${pick(rng, LOCATIONS)} reveal Apex-class entities carry between ${pick(rng, STATISTICS)} and ${pick(rng, STATISTICS)} more structural mass than initial projections. "Our ${pick(rng, ABSURD_ADJECTIVES)} estimate assumed they would be smaller," ${pick(rng, OFFICER_NAMES)} explained. The scanning protocol ${pick(rng, BUREAUCRATIC_ACTIONS)}. The ${pick(rng, SHAPES)} have not.`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'boss',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 16: Morale reclassified as improved
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Morale Update',
		headline: `Public morale ${pick(rng, BUREAUCRATIC_ACTIONS)}`,
		snippet: `Following a directive from ${pick(rng, DEPARTMENTS)}, all negative ${pick(rng, METRICS)} readings in the last fiscal cycle have been ${pick(rng, BUREAUCRATIC_ACTIONS)}. Early indicators show a ${pick(rng, STATISTICS)} morale improvement on paper. ${pick(rng, OFFICER_NAMES)} called the results "${pick(rng, ABSURD_ADJECTIVES)}." ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'warning',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 17: Tactical memo – new doctrine is the same as old doctrine
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Tactical Memo',
		headline: `New deployment doctrine: place ${pick(rng, EQUIPMENT)} and ${pick(rng, ACTIONS)}`,
		snippet: `A revised tactical manual circulated among ${pick(rng, LOCATIONS)} officers recommends positioning ${pick(rng, EQUIPMENT)} at ${pick(rng, ABSURD_ADJECTIVES)} coordinates and ${pick(rng, ACTIONS)}. The previous manual ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, OFFICER_NAMES)} described the update as "${pick(rng, ABSURD_ADJECTIVES)}."`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'tower',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 18: Budget redirected from morale to something absurd
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Budget Review',
		headline: `${pick(rng, METRICS)} budget increased by redirecting ${pick(rng, DEPARTMENTS)} funds`,
		snippet: `The quarterly ${pick(rng, REPORT_TYPES)} confirms ${pick(rng, METRICS)} has reached record levels after reallocating ${pick(rng, STATISTICS)} of the ${pick(rng, DEPARTMENTS)} budget. "${pick(rng, ABSURD_CLAIMS)}," the memo notes. The remaining ${pick(rng, STATISTICS)} funds ${pick(rng, ABSURD_FINDINGS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'hexagon',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 19: Sighting report – prime shape seen, described as "probably fine"
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Sighting Report',
		headline: `${pick(rng, SHAPES)} detected near ${pick(rng, LOCATIONS)}, described as "${pick(rng, ABSURD_ADJECTIVES)}"`,
		snippet: `A confirmed ${pick(rng, SHAPES)} entity was detected on the perimeter of ${pick(rng, LOCATIONS)}. ${pick(rng, DEPARTMENTS)} has assured personnel that the situation is ${pick(rng, ABSURD_ADJECTIVES)}, provided the definition remains flexible. ${pick(rng, OFFICER_NAMES)} ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'boss',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 20: Research proves shapes don't exist when not observed
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Scientific Breakthrough',
		headline: `${pick(rng, DEPARTMENTS)} proves that if a shape cannot be seen, it is ${pick(rng, ABSURD_ADJECTIVES)}`,
		snippet: `${pick(rng, RESEARCH_TYPES)} published by ${pick(rng, DEPARTMENTS)} concludes that ${pick(rng, SHAPES)} ${pick(rng, ABSURD_FINDINGS)}. "This dramatically ${pick(rng, ABSURD_ACTIONS)}," said ${pick(rng, OFFICER_NAMES)}, who ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'radar',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 21: Command assures situation under control (classified)
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Command Bulletin',
		headline: `${pick(rng, DEPARTMENTS)} assures personnel situation is ${pick(rng, ABSURD_ADJECTIVES)}`,
		snippet: `In response to questions about ${pick(rng, METRICS)}, ${pick(rng, DEPARTMENTS)} has issued a statement confirming that ${pick(rng, ABSURD_CLAIMS)}. The full statement is ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, OFFICER_NAMES)} ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'classified',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)} Press Office`,
		refId: '',
		source: 'generated',
	}),

	// 22: Tower survives longer, receives nothing
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Victory Bulletin',
		headline: `${pick(rng, EQUIPMENT)} exceeds ${pick(rng, ABSURD_ADJECTIVES)} expectations, receives no additional resources`,
		snippet: `A deployed ${pick(rng, EQUIPMENT)} operating on ${pick(rng, LOCATIONS)} exceeded the operational average by ${pick(rng, STATISTICS)}. ${pick(rng, DEPARTMENTS)} acknowledges the performance and confirms that no supplemental ${pick(rng, EQUIPMENT)}, repair protocols, or commendations have been allocated. "${pick(rng, ABSURD_CLAIMS)}," the ${pick(rng, REPORT_TYPES)} states. The ${pick(rng, EQUIPMENT)} ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'tower',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 23: Procurement denies losing another blueprint
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Procurement Log',
		headline: `${pick(rng, DEPARTMENTS)} denies ${pick(rng, BUREAUCRATIC_ACTIONS)}`,
		snippet: `Asked to comment on ${pick(rng, METRICS)} discrepancies, a ${pick(rng, DEPARTMENTS)} spokesperson stated the matter was ${pick(rng, BUREAUCRATIC_ACTIONS)}. "${pick(rng, ABSURD_CLAIMS)}," the spokesperson added before ${pick(rng, BUREAUCRATIC_ACTIONS)}. No further questions were permitted.`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'classified',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)} Press Liaison`,
		refId: '',
		source: 'generated',
	}),

	// 24: Historical revision – losses reclassified
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Historical Revision',
		headline: `${pick(rng, DEPARTMENTS)} updates archives: previous losses now "${pick(rng, BUREAUCRATIC_ACTIONS)}"`,
		snippet: `${pick(rng, DEPARTMENTS)} has ${pick(rng, BUREAUCRATIC_ACTIONS)} the first ${pick(rng, STATISTICS)} ${pick(rng, EQUIPMENT)} losses as ${pick(rng, BUREAUCRATIC_ACTIONS)}. "We always intended to learn what happens when ${pick(rng, EQUIPMENT)} meets ${pick(rng, SHAPES)} at ${pick(rng, ABSURD_ADJECTIVES)} velocity," the revised entry states. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'classified',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 25: Shapes maintaining unauthorized angles
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Geometry Advisory',
		headline: `Hostile ${pick(rng, SHAPES)} suspected of maintaining ${pick(rng, ABSURD_ADJECTIVES)} angles without authorization`,
		snippet: `Intelligence reports confirm enemy ${pick(rng, SHAPES)} continue to display ${pick(rng, ABSURD_ADJECTIVES)} internal angles despite multiple formal objections. ${pick(rng, DEPARTMENTS)} reminds personnel that ${pick(rng, POLICIES)}. Reporting channels ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'square',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 26: Analysts define "acceptable losses" broadly
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Personnel Update',
		headline: `${pick(rng, OFFICER_NAMES)} defines "${pick(rng, ABSURD_ADJECTIVES)}" very broadly, receives commendation`,
		snippet: `${pick(rng, OFFICER_NAMES)} has been recognized for a ${pick(rng, REPORT_TYPES)} that classified the destruction of ${pick(rng, STATISTICS)} of deployed ${pick(rng, EQUIPMENT)} as "${pick(rng, ABSURD_ADJECTIVES)}." The ${pick(rng, REPORT_TYPES)} ${pick(rng, BUREAUCRATIC_ACTIONS)}. The formula ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'boss',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 27: Shapes confirmed non-literate
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Diplomatic Cable',
		headline: `${pick(rng, DEPARTMENTS)} confirms ${pick(rng, SHAPES)} cannot read`,
		snippet: `After multiple failed attempts to negotiate via written notice, ${pick(rng, DEPARTMENTS)} has confirmed that ${pick(rng, SHAPES)} are ${pick(rng, ABSURD_ADJECTIVES)}. "This explains ${pick(rng, ABSURD_CLAIMS)}," admitted ${pick(rng, OFFICER_NAMES)}. Oral communication ${pick(rng, BUREAUCRATIC_ACTIONS)}. The war continues. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'hexagon',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 28: Two departments blame each other
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Bureaucratic Notice',
		headline: `${pick(rng, DEPARTMENTS)} and ${pick(rng, DEPARTMENTS)} issue ${pick(rng, ABSURD_ADJECTIVES)} joint statement`,
		snippet: `In an ${pick(rng, ABSURD_ADJECTIVES)} display of inter-departmental coordination, ${pick(rng, DEPARTMENTS)} and ${pick(rng, DEPARTMENTS)} have issued a joint ${pick(rng, REPORT_TYPES)} confirming that ${pick(rng, ABSURD_CLAIMS)}. Both departments ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, OFFICER_NAMES)} described the collaboration as "${pick(rng, ABSURD_ADJECTIVES)}."`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'classified',
		timestamp: '',
		author: `Joint ${pick(rng, DEPARTMENTS)} Commission`,
		refId: '',
		source: 'generated',
	}),

	// 29: Equipment upgrade performs better when named
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Equipment Advisory',
		headline: `${pick(rng, DEPARTMENTS)} claims ${pick(rng, EQUIPMENT)} performs ${pick(rng, STATISTICS)} better when given a name`,
		snippet: `An internal ${pick(rng, RESEARCH_TYPES)} suggests that designated ${pick(rng, EQUIPMENT)} names improve operator attachment and thereby ${pick(rng, METRICS)}. The methodology ${pick(rng, BUREAUCRATIC_ACTIONS)}. Several ${pick(rng, EQUIPMENT)} have since been named. Results are described as "${pick(rng, ABSURD_ADJECTIVES)}."`,
		cycle: pick(rng, CYCLES),
		classification: 'Morale-Safe',
		thumbnail: 'tower',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 30: Triangles advance in formation Command can't name
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Frontline Report',
		headline: `${pick(rng, SHAPES)} advance in formation ${pick(rng, DEPARTMENTS)} describes as "${pick(rng, ABSURD_ADJECTIVES)}"`,
		snippet: `${pick(rng, TIME_DESCRIPTORS)} telemetry from ${pick(rng, LOCATIONS)} reveals ${pick(rng, SHAPES)} organizing into ${pick(rng, ABSURD_ADJECTIVES)} formations. Analysts have declined to classify the configuration. "Naming it ${pick(rng, ABSURD_ACTIONS)}," said ${pick(rng, OFFICER_NAMES)}. Counter-formation ${pick(rng, BUREAUCRATIC_ACTIONS)}.`,
		cycle: pick(rng, CYCLES),
		classification: 'Geometry Advisory',
		thumbnail: 'triangle',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 31: Report concludes conflict status is "statistically inconvenient"
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Threat Assessment',
		headline: `${pick(rng, REPORT_TYPES)} concludes ${pick(rng, METRICS)} is "${pick(rng, ABSURD_ADJECTIVES)}"`,
		snippet: `The latest ${pick(rng, REPORT_TYPES)} from ${pick(rng, DEPARTMENTS)} has determined that ${pick(rng, METRICS)} is currently ${pick(rng, ABSURD_ADJECTIVES)}. "${pick(rng, ABSURD_CLAIMS)}," the ${pick(rng, REPORT_TYPES)} states. ${pick(rng, OFFICER_NAMES)} ${pick(rng, BUREAUCRATIC_ACTIONS)}. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Sanitized',
		thumbnail: 'warning',
		timestamp: '',
		author: `${pick(rng, OFFICER_NAMES)}, ${pick(rng, DEPARTMENTS)}`,
		refId: '',
		source: 'generated',
	}),

	// 32: Victory bulletin – temporary victory over absurdly weak enemy
	(rng, id) => ({
		id: uniqueId(id),
		category: 'Victory Bulletin',
		headline: `${pick(rng, DEPARTMENTS)} announces ${pick(rng, ABSURD_ADJECTIVES)} victory over lone ${pick(rng, SHAPES)}`,
		snippet: `In a decisive engagement lasting ${pick(rng, STATISTICS)} seconds, a ${pick(rng, EQUIPMENT)} successfully neutralized a single ${pick(rng, SHAPES)}. "${pick(rng, ABSURD_CLAIMS)}," said ${pick(rng, DEPARTMENTS)}. The ${pick(rng, SHAPES)} was ${pick(rng, ABSURD_ADJECTIVES)} and had no escorts. ${pick(rng, MORALE_ADDENDUMS)}`,
		cycle: pick(rng, CYCLES),
		classification: 'Approved',
		thumbnail: 'tower',
		timestamp: '',
		author: `${pick(rng, DEPARTMENTS)} Victory Office`,
		refId: '',
		source: 'generated',
	}),
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate `count` procedural news articles using the template system.
 * Uses the provided rng for deterministic output.
 */
export function generateArticles(rng: () => number, count: number): NewsItem[] {
	// Shuffle template indices to get varied structure order
	const templateIndices = shuffle(rng, Array.from({ length: templates.length }, (_, i) => i));

	const articles: NewsItem[] = [];
	for (let i = 0; i < count; i++) {
		const templateIdx = templateIndices[i % templateIndices.length]!;
		articles.push(templates[templateIdx]!(rng, i + 1));
	}

	return articles;
}
