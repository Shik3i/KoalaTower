// ---------------------------------------------------------------------------
// Word Pools for procedural news generation
//
// Each pool is a readonly array of strings. Templates draw randomly from these
// pools to construct headlines and snippets with massive combinatorial variety.
// ---------------------------------------------------------------------------

// --- Shapes & Enemy Types ---
export const SHAPES = [
	'triangles',
	'squares',
	'pentagons',
	'hexagons',
	'rhombus formations',
	'trapezoid clusters',
	'octagonal entities',
	'dodecahedron-class threats',
	'line segments',
	'acute triangles',
	'obtuse shapes',
	'irregular polygons',
	'apex entities',
	'parallelogram swarms',
	'nonagon battalions',
	'decagon vanguards',
	'isosceles insurgents',
	'equilateral extremists',
	'scalene separatists',
	'circular infiltrators',
	'quadrilateral columns',
	'prismatic projections',
	'polygonal partisans',
	'angular aggressors',
	'right-angle renegades',
	'triangular trespassers',
	'pentagonal provocateurs',
	'hexagonal hordes',
	'rhomboid raiders',
	'geometric guerillas',
] as const;

// --- Orbital Command Departments & Organizations ---
export const DEPARTMENTS = [
	'Procurement',
	'Orbital Command',
	'Forge Assembly Division',
	'Research Deck 7',
	'Morale Bureau',
	'Finance Division',
	'Historical Accuracy Bureau',
	'Office of Geometric Relations',
	'Orbital Institute of Applied Geometry',
	'Orbital Institute of Behavioral Geometry',
	'Division of Strategic Consolidation',
	'Flatland Meteorological Bureau',
	'Deployment Logistics Corps',
	'Alloy Refinement Authority',
	'Threat Assessment Directorate',
	'Communications Oversight Panel',
	'Tactical Doctrine Review Board',
	'Personnel Retention Taskforce',
	'Asset Liquidation Department',
	'Committee for Shape-Related Incidents',
	'Bureau of Statistical Convenience',
	'Office of Acceptable Losses',
	'Department of Retroactive Justification',
	'Sub-Committee on Geometric Etiquette',
	'Tower Survivability Working Group',
	'Office of Unconfirmed Reports',
	'Bureau of Mild Concern',
	'Division of Premature Celebration',
] as const;

// --- Officer / Bureaucrat Names ---
export const OFFICER_NAMES = [
	'Vasquez',
	'Marsh',
	'Chen',
	'Rodriguez',
	'Dr. Okonkwo',
	'Lieutenant-Clerk Park',
	'Sub-Analyst Kowalski',
	'Deputy Envoy Tanaka',
	'Chief Archivist Müller',
	'Captain-Adjunct O\'Brien',
	'Clerk-First-Class Singh',
	'Junior Morale Officer Gupta',
	'Senior Procurement Specialist Andersson',
	'Acting Director Hayes',
	'Chief of Retroactive Justification Díaz',
	'Foreman Nakamura',
	'Lead Auditor Popescu',
	'Dr. Williams',
	'Lieutenant Rossi',
	'Sub-Clerk Johansson',
	'Analyst-Second-Class Petrov',
	'Chief Optimism Officer Delgado',
	'Assistant Deputy Under-Secretary Kim',
	'Morale Compliance Inspector Thorne',
	'Dr. de Souza',
	'Statistical Anomaly Clerk Bergström',
	'Senior Archivist Adeyemi',
	'Sub-Director of Unclear Mandate Fletcher',
] as const;

// --- Bureaucratic Actions ---
export const BUREAUCRATIC_ACTIONS = [
	'reclassified as voluntary research',
	'escalated to a sub-committee',
	'retroactively endorsed',
	'strategically redistributed',
	'filed under "pending review" indefinitely',
	'declared a feature, not a bug',
	'absorbed into a larger department that no longer exists',
	'deemed outside current mandate',
	'forwarded to a closed committee',
	'certified as within acceptable tolerances',
	'marked as "resolved" without action',
	'subjected to a feasibility study of a preliminary review',
	'archived with prejudice',
	'designated as a learning opportunity',
	'referred to a panel that has not met in three cycles',
	'classified at a level above its own classification',
	'outsourced to an undefined external entity',
	'processed through the standard denial pipeline',
	'added to the agenda of a meeting that was cancelled',
	'converted into a morale-positive statistic',
	'deferred until after the current fiscal crisis',
	'declared simultaneously urgent and low-priority',
	'reassigned to a department that was disbanded last cycle',
	'approved in principle, denied in practice',
	'entered into the permanent review queue',
] as const;

// --- Absurd Adjectives ---
export const ABSURD_ADJECTIVES = [
	'geometrically insubordinate',
	'statistically suboptimal',
	'aesthetically offensive',
	'administratively inconvenient',
	'bureaucratically unsound',
	'tactically ambiguous',
	'structurally impertinent',
	'procedurally questionable',
	'mathematically discourteous',
	'geometrically passive-aggressive',
	'operationally sarcastic',
	'logistically inconvenient',
	'morally flexible',
	'ethically provisional',
	'temporarily permanent',
	'strategically vague',
	'legally creative',
	'diplomatically unfortunate',
	'technically correct',
	'optimistically described',
	'retrospectively alarming',
	'statistically inconvenient',
	'definitionally problematic',
	'categorically unhelpful',
	'impressively unverified',
	'offensively ambiguous',
	'comfortingly inadequate',
	'aggressively neutral',
] as const;

// --- Ridiculous Policies & Reminders ---
export const POLICIES = [
	'all angles below 90° must be reported immediately',
	'denial of shape is the first line of defense',
	'Triangle Tuesdays are now mandatory',
	'staring directly at a Boss is prohibited (and futile)',
	'morale is mandatory and will be enforced',
	'the situation is under control (the control itself is under review)',
	'shapes cannot read but must be informed anyway',
	'all Tower losses are learning opportunities',
	'the definition of "acceptable" has been temporarily broadened',
	'panic is a reportable offense',
	'unauthorized geometry is a threat vector',
	'questioning deployment doctrine is administratively discouraged',
	'all personnel must complete Form OCD-7B before observing shapes',
	'optimism is the official emotional state',
	'breathing near a classified document requires clearance',
	'every meeting must produce at least three sub-committees',
	'budget reallocation does not require prior notification',
	'facts are provisional until approved by Command',
	'complaints about the complaint process must be filed separately',
	'shapes observed after 22:00 OST are considered a scheduling error',
] as const;

// --- Morale Addendums (sentence-enders) ---
export const MORALE_ADDENDUMS = [
	'Morale remains officially adequate.',
	'The situation is stable, provided the definition remains flexible.',
	'Citizens are advised to continue as if nothing is wrong.',
	'Reminder: sadness is free.',
	'Official position: cautiously optimistic but not accountable.',
	'Questions will be answered after the war.',
	'This statement has been approved by no one in particular.',
	'Morale metrics indicate a statistically insignificant decline.',
	'The Morale Bureau has not been informed of this development.',
	'Personnel are reminded that concern is a reportable emotion.',
	'Early indicators suggest morale improved on paper.',
	'The official stance is confident ambiguity.',
	'Further inquiries have been scheduled for a later, unspecified date.',
	'Command assures personnel that everything is fine. It is not.',
	'Internal polling shows a majority of respondents declined to answer.',
] as const;

// --- Action Verbs (what shapes are doing) ---
export const ACTIONS = [
	'advancing',
	'regrouping',
	'spawning',
	'organizing',
	'proliferating',
	'vibrating menacingly',
	'maintaining formation',
	'ignoring protocol',
	'exceeding projections',
	'defying analysis',
	'refusing to negotiate',
	'persisting despite memos',
	'existing without authorization',
	'clustering suspiciously',
	'multiplying at an inconvenient rate',
	'approaching in a geometrically improbable pattern',
	'performing unsanctioned rotations',
	'emitting unauthorized angles',
	'forming a shape that has not been catalogued',
	'occupying coordinates without permits',
	'migrating toward strategically irrelevant positions',
	'holding a formation Command describes as "probably fine"',
	'executing maneuvers that suggest intent',
	'demonstrating concerning levels of structural integrity',
	'vibrating at a frequency that upsets Procurement',
] as const;

// --- Adverbs (how shapes are doing it) ---
export const ADVERBS = [
	'with alarming confidence',
	'without proper clearance',
	'in geometrically improbable ways',
	'despite multiple formal objections',
	'at statistically unlikely rates',
	'with what analysts describe as "concerning enthusiasm"',
	'as if they have a plan',
	'inexplicably',
	'bureaucratically incorrectly',
	'in direct violation of the Shape Accords',
	'without filing the required movement permits',
	'at a tactically inconvenient velocity',
	'while maintaining unsettling eye contact',
	'in patterns that technically should not be possible',
	'at a rate that has been reclassified',
	'with a confidence that suggests they know something we do not',
] as const;

// --- Time Descriptors ---
export const TIME_DESCRIPTORS = [
	'early this cycle',
	'late last cycle',
	'at oh-four-hundred OST',
	'during the mandatory morale session',
	'shortly before the budget meeting',
	'moments after Procurement denied everything',
	'simultaneously',
	'at a time that has since been reclassified',
	'during an unscheduled systems outage',
	'approximately three hours before anyone noticed',
	'right after the coffee supply ran out on Deck 4',
	'during the weekly optimism briefing',
	'at a statistically improbable hour',
	'shortly after the previous statement was retracted',
	'during a routine audit that became anything but routine',
] as const;

// --- Research / Report Types ---
export const RESEARCH_TYPES = [
	'a peer-reviewed study',
	'a non-peer-reviewed internal memo',
	'a hastily assembled briefing',
	'a leaked draft',
	'a statistically significant survey of three personnel',
	'an informal poll conducted in the break room',
	'a comprehensive analysis of incomplete data',
	'a preliminary review of a feasibility study',
	'a three-cycle longitudinal investigation',
	'a report commissioned by a department that has since been dissolved',
	'an emergency audit triggered by an accounting discrepancy',
	'a study funded by the remaining 6% of the Morale budget',
	'a cross-departmental task force summary',
	'an anonymous tip escalated to formal inquiry',
	'a retrospective analysis of forward-looking projections',
] as const;

// --- Metrics / Things Being Measured ---
export const METRICS = [
	'Tower survival expectancy',
	'shape hostility coefficients',
	'Alloy refinement efficiency',
	'morale index readings',
	'deployment success probability',
	'inter-shape aggression metrics',
	'budget compliance ratios',
	'geometric threat saturation',
	'Procurement denial frequency',
	'command decision latency',
	'personnel retention rates',
	'shape spawning density',
	'fire-arc coverage variance',
	'retroactive justification throughput',
	'acceptable loss margins',
] as const;

// --- Equipment / Hardware ---
export const EQUIPMENT = [
	'Mark-IV targeting array',
	'Mk-V fire control system',
	'Standard Issue Deployable Tower',
	'Alloy-plated morale booster',
	'experimental geometry destabilizer',
	'budget-friendly defense matrix',
	'the thing Research Deck built last Tuesday',
	'refurbished previous-generation hardware',
	'a Tower that someone named',
	'emergency fiscal countermeasures',
	'the prototype that was not supposed to leave the lab',
	'a combat algorithm that passed peer review on the second attempt',
	'the Mk-VII predictive threat estimator',
	'an overclocked sensor package Procurement forgot to inventory',
	'a field-modified deployment rig of questionable origin',
] as const;

// --- Absurd Reasons (why something happened) ---
export const ABSURD_REASONS = [
	'a filing error in the Cycle 2144 budget annex',
	'Procurement filled out the wrong form',
	'someone in Accounting rounded down instead of up',
	'a misplaced decimal point in the threat assessment spreadsheet',
	'the shapes received our diplomatic cable and took it personally',
	'a miscommunication between decks that nobody will take credit for',
	'an overly optimistic projection from three cycles ago',
	'Command assumed the problem would solve itself',
	'a clerk misinterpreted "ceasefire" as "increase fire"',
	'the definition of "shape" was briefly expanded to include furniture',
	'a subroutine that was marked "TODO: fix this" three cycles ago',
	'Finance classified the entire incident as a rounding error',
	'no one remembered to cancel the automated deployment protocol',
	'the original plan was lost in a filing cabinet relocation',
] as const;

// --- Absurd Claims (what departments assert) ---
export const ABSURD_CLAIMS = [
	'the situation is procedurally normal',
	'current threat levels fall within expected parameters',
	'the deployment schedule has not changed since last cycle',
	'no shapes were harmed during the budget review',
	'all missing Alloy has been accounted for on paper',
	'the new doctrine is identical to the old doctrine but with a new name',
	'personnel morale has never been higher, on the forms',
	'the shapes are retreating, if you define retreating broadly',
	'all Tower losses were anticipated in Appendix C',
	'the research deck has not had an unsupervised experiment in at least two cycles',
	'Procurement has never lost a blueprint it could not later deny having lost',
] as const;

// --- Absurd Findings (what research discovered) ---
export const ABSURD_FINDINGS = [
	'shapes are significantly more shape-like than previously documented',
	'Tower targeting algorithms develop preferences for aesthetically pleasing angles',
	'the presence of a clipboard increases compliance by 47% regardless of content',
	'shapes communicate via vibrations that roughly translate to "go away"',
	'personnel work 23% faster when they believe someone from Command is watching',
	'morale is inversely proportional to the number of budget meetings attended',
	'shapes do not respond to written warnings regardless of font size',
	'Alloy refined on a Tuesday exhibits 3% more structural integrity for no discernible reason',
	'Procurement forms filled out in triplicate are 40% more likely to be ignored',
	'the war would be 12% shorter if meetings started on time',
] as const;

// --- Absurd Actions (nonsensical activities) ---
export const ABSURD_ACTIONS = [
	'refuse to be intimidated by paperwork',
	'vibrate at the resonant frequency of bureaucratic inefficiency',
	'conduct unsanctioned geometry in a restricted zone',
	'form a sub-committee of their own',
	'file a counter-memo',
	'appeal their classification status',
	'request a formal review of the definition of "hostile"',
	'occupy coordinates that were reserved for a morale retreat',
	'achieve a level of organization that Command finds suspicious',
	'display angles that have not been approved by the Angle Review Board',
] as const;

// --- Report Types ---
export const REPORT_TYPES = [
	'fiscal review',
	'threat assessment',
	'deployment audit',
	'morale survey',
	'efficiency report',
	'Procurement reconciliation',
	'geometric census',
	'Alloy expenditure summary',
	'personnel satisfaction index',
	'combat effectiveness review',
	'strategic outlook memorandum',
	'inter-departmental blame allocation summary',
] as const;

// --- Locations ---
export const LOCATIONS = [
	'Front 01',
	'Front 03',
	'Front 07',
	'Front 12',
	'Research Deck 7',
	'Forge Assembly Bay 4',
	'Procurement Records Vault',
	'Orbital Command Briefing Room C',
	'Sector 9-Gamma',
	'Perimeter Station Delta',
	'Deployment Silo 6',
	'Morale Bureau Cafeteria',
	'Finance Division Archive Sub-Level 2',
	'Communications Relay 14',
	'Tactical Operations Center (Temporary)',
] as const;

// --- Numbers & Statistics (fun with numbers) ---
export const STATISTICS = [
	'2.3%',
	'94%',
	'312%',
	'0.4%',
	'approximately seventeen',
	'a number that has been classified',
	'statistically indistinguishable from random chance',
	'roughly the same as last time',
	'6%',
	'between zero and unacceptable',
	'three, but that includes a rounding error',
	'an amount described as "technically measurable"',
	'fewer than projected but more than hoped',
	'precisely the number that Procurement predicted (after the prediction was adjusted)',
	'a margin that has been retroactively widened',
] as const;

// --- Cycle Numbers ---
export const CYCLES = [
	'Cycle 2144',
	'Cycle 2145',
	'Cycle 2146',
	'Cycle 2147',
	'Cycle 2148',
	'Cycle 2149',
	'Cycle 2150',
	'Cycle 2151',
	'Cycle 2152',
] as const;

// --- Classifications ---
export const CLASSIFICATIONS = [
	'Approved',
	'Sanitized',
	'Morale-Safe',
	'Geometry Advisory',
] as const;

// --- Thumbnails ---
export const THUMBNAILS = [
	'triangle',
	'tower',
	'warning',
	'radar',
	'hexagon',
	'classified',
	'square',
	'boss',
] as const;
