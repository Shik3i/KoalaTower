export type ThumbnailType =
	| 'triangle'
	| 'tower'
	| 'warning'
	| 'radar'
	| 'hexagon'
	| 'classified'
	| 'square'
	| 'boss';

export type Classification =
	| 'Approved'
	| 'Sanitized'
	| 'Morale-Safe'
	| 'Geometry Advisory';

export interface NewsItem {
	/** Unique identifier – numeric for handwritten, hash-string for generated */
	id: number | string;
	/** Category badge text, e.g. "Frontline Report" */
	category: string;
	/** Article headline */
	headline: string;
	/** Article body snippet (2–3 sentences) */
	snippet: string;
	/** In-universe cycle number, e.g. "Cycle 2147" */
	cycle: string;
	/** Classification badge text */
	classification: Classification;
	/** SVG icon variant */
	thumbnail: ThumbnailType;
	/** Orbital Standard Time timestamp, e.g. "14:32 OST" */
	timestamp: string;
	/** Bylined author name + department, e.g. "Lt.-Analyst Chen, Morale Bureau" */
	author: string;
	/** Dispatch reference ID, e.g. "OCD-2147-8A3F" */
	refId: string;
	/** Whether this article came from static handwritten data or procedural generation */
	source: 'handwritten' | 'generated';
}
