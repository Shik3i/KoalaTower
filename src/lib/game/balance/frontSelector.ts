import { TierId, FrontBand } from '../engine/gameTypes';
import {
	FRONT_BANDS,
	FRONT_META,
	describeFrontUnlock,
	getFrontName,
	type FrontBandDef,
	type FrontMeta,
} from './tiers';

export interface FrontBandPanel {
	band: FrontBand;
	def: FrontBandDef;
	description: string;
	fronts: FrontMeta[];
}

export const FRONT_BAND_ORDER: FrontBand[] = [
	FrontBand.Perimeter,
	FrontBand.Redline,
	FrontBand.Blacksite,
	FrontBand.Anomaly,
];

const FRONT_BAND_DESCRIPTIONS: Record<FrontBand, string> = {
	[FrontBand.Perimeter]: 'Outer contact zone. Clean geometry, dirty outcomes.',
	[FrontBand.Redline]: 'The official maps end here. The invoices do not.',
	[FrontBand.Blacksite]: 'Classified combat zone. Officially absent. Repeatedly funded.',
	[FrontBand.Anomaly]: 'Physics has submitted a complaint. Command has rejected it.',
};

export function getFrontBandPanels(): FrontBandPanel[] {
	return FRONT_BAND_ORDER.map((band) => ({
		band,
		def: FRONT_BANDS[band],
		description: FRONT_BAND_DESCRIPTIONS[band],
		fronts: FRONT_META.filter((meta) => meta.band === band),
	}));
}

export function getSelectedFrontBandIndex(selectedFront: TierId): number {
	const meta = FRONT_META.find((front) => front.id === selectedFront);
	if (!meta) return 0;
	return Math.max(0, FRONT_BAND_ORDER.indexOf(meta.band));
}

export function normalizeSelectedFront(selectedFront: TierId, unlockedFronts: TierId[]): TierId {
	return unlockedFronts.includes(selectedFront) ? selectedFront : TierId.Tier1;
}

export function getFrontSelectorStatus(front: FrontMeta, unlockedFronts: TierId[], frontBestWave: Partial<Record<TierId, number>>): string {
	if (!unlockedFronts.includes(front.id)) return describeFrontUnlock(front.id);
	const best = frontBestWave[front.id] ?? 0;
	return best > 0 ? `Best Wave ${best}` : `${getFrontName(front.id)} available`;
}
