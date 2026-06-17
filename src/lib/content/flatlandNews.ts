export interface NewsItem {
	id: number;
	category: string;
	headline: string;
	snippet: string;
	cycle: string;
	classification: string;
	thumbnail: 'triangle' | 'tower' | 'warning' | 'radar' | 'hexagon' | 'classified' | 'square' | 'boss';
}

export const newsItems: NewsItem[] = [
	{
		id: 1,
		category: 'Frontline Report',
		headline: 'Triangles Advance With Unauthorized Confidence',
		snippet: 'Hostile triangular units have been observed moving with what analysts describe as "alarming self-assurance." Orbital Command reminds citizens that all angles below 90 degrees are to be reported immediately.',
		cycle: 'Cycle 2147',
		classification: 'Morale-Safe',
		thumbnail: 'triangle',
	},
	{
		id: 2,
		category: 'Procurement Log',
		headline: 'Procurement Denies Losing Another Blueprint',
		snippet: 'Asked to comment on the missing schematic for the Mark-IV targeting array, a Procurement spokesperson stated the document was "strategically redistributed." No further questions were permitted.',
		cycle: 'Cycle 2146',
		classification: 'Approved',
		thumbnail: 'classified',
	},
	{
		id: 3,
		category: 'Victory Bulletin',
		headline: 'Orbital Command Announces Temporary Victory Over Line Segment',
		snippet: 'In a decisive engagement lasting 0.4 seconds, a lone Tower successfully neutralized a hostile Line Segment. "This proves our doctrine works," said Command. The segment was unarmed and had no escorts.',
		cycle: 'Cycle 2146',
		classification: 'Approved',
		thumbnail: 'tower',
	},
	{
		id: 4,
		category: 'Weather Advisory',
		headline: 'Flatland Weather Report: 100% Chance of Shapes',
		snippet: 'The Flatland Meteorological Bureau forecasts continued geometric precipitation across all active Fronts. Citizens are advised to expect angles, edges, and the occasional apex threat.',
		cycle: 'Cycle 2147',
		classification: 'Geometry Advisory',
		thumbnail: 'square',
	},
	{
		id: 5,
		category: 'R&D Briefing',
		headline: 'Research Deck Discovers Slightly More Aggressive Math',
		snippet: 'Orbital researchers have successfully recalibrated the Tower\'s combat algorithms to be "moderately more hostile." Early tests show a 2.3% increase in applied violence. Morale in the lab remains cautious.',
		cycle: 'Cycle 2145',
		classification: 'Sanitized',
		thumbnail: 'radar',
	},
	{
		id: 6,
		category: 'Labor Dispatch',
		headline: 'Forge Workers Vote To Pretend This Was The Plan',
		snippet: 'In a unanimous decision, Forge assembly crews have agreed to retroactively endorse current deployment projections. "It looks fine if you don\'t check the earlier numbers," said a spokesperson.',
		cycle: 'Cycle 2147',
		classification: 'Approved',
		thumbnail: 'hexagon',
	},
	{
		id: 7,
		category: 'Morale Update',
		headline: 'Public Morale Increased By Reclassifying Losses As Data',
		snippet: 'Following a directive from Orbital Command, all Tower losses in the last fiscal cycle have been reclassified as "voluntary field research." Early indicators show a 15% morale improvement on paper.',
		cycle: 'Cycle 2145',
		classification: 'Morale-Safe',
		thumbnail: 'warning',
	},
	{
		id: 8,
		category: 'Sighting Report',
		headline: 'Prime Shape Seen Near Front 01, Described As "Probably Fine"',
		snippet: 'A confirmed Apex-class entity was detected on the perimeter of Front 01. Orbital Command has assured personnel that the situation is stable, provided the definition of stable remains flexible.',
		cycle: 'Cycle 2146',
		classification: 'Geometry Advisory',
		thumbnail: 'boss',
	},
	{
		id: 9,
		category: 'Supply Bulletin',
		headline: 'Alloy Rationing Declared Successful After Nobody Was Asked',
		snippet: 'Alloy distribution has been optimized based on a new predictive model that forecasts requirements significantly lower than current deployments. The model\'s creators were not available for comment.',
		cycle: 'Cycle 2147',
		classification: 'Approved',
		thumbnail: 'warning',
	},
	{
		id: 10,
		category: 'Tactical Memo',
		headline: 'New Tower Deployment Doctrine: Place It In The Middle And Hope',
		snippet: 'A revised tactical manual circulated among deployment officers recommends positioning Towers at the center of Flatland and "trusting the fire arc." The previous manual recommended the same strategy.',
		cycle: 'Cycle 2145',
		classification: 'Approved',
		thumbnail: 'tower',
	},
	{
		id: 11,
		category: 'Historical Note',
		headline: 'Archives Confirm War Started For "Administrative Convenience"',
		snippet: 'Declassified fragments from early Orbital Command records suggest the Flatland Wars may have begun due to a filing error. "The Shapes were informed of the conflict after it started," the document reads.',
		cycle: 'Cycle 2144',
		classification: 'Sanitized',
		thumbnail: 'classified',
	},
	{
		id: 12,
		category: 'Field Report',
		headline: 'Recovered Telemetry Indicates Tower Exploded Within Approved Tolerances',
		snippet: 'Engineers reviewing the latest deployment collapse confirm the Tower\'s destruction fell within acceptable performance margins. "It stopped functioning exactly as predicted," the report states approvingly.',
		cycle: 'Cycle 2146',
		classification: 'Morale-Safe',
		thumbnail: 'warning',
	},
];
