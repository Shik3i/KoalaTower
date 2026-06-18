import { FRONT_COUNT } from './tiers';
import { addSchematics, getSchematics, normalizeSchematics, spendSchematics, type SchematicsByFront } from './schematics';

export type BlackMarketUnlockId =
	| 'combatTelemetryPlus'
	| 'gameSpeed3'
	| 'autoDeployment'
	| 'schematicConverter'
	| 'gameSpeed5'
	| 'outsourcedResearchLab';

export type BlackMarketUnlocks = Partial<Record<BlackMarketUnlockId, boolean>>;

export interface BlackMarketUnlockDef {
	id: BlackMarketUnlockId;
	name: string;
	cost: number;
	description: string;
	requirement?: BlackMarketUnlockId;
	status?: 'active' | 'scaffold';
}

export const STRANGE_MATTER_WEEKLY_SHIPMENT = 3;
export const STRANGE_MATTER_DAILY_CONTRACT = 1;
export const WEEKLY_SHIPMENT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const SCHEMATIC_CONVERSION_RATE = 25;
export const SUPPORT_URL = '#'; // TODO: replace with the configured project support URL.

export const BLACK_MARKET_UNLOCKS: BlackMarketUnlockDef[] = [
	{
		id: 'combatTelemetryPlus',
		name: 'Combat Telemetry+',
		cost: 8,
		description: 'Expanded stat readouts in Deployment. Purely informational. Suspiciously helpful.',
	},
	{
		id: 'gameSpeed3',
		name: 'Game Speed x3',
		cost: 10,
		description: 'Unlocks illegal temporal compression at 3x speed.',
	},
	{
		id: 'autoDeployment',
		name: 'Auto Deployment',
		cost: 20,
		description: 'Allows a same-Front redeploy after a run ends. Toggle remains fully under your control.',
	},
	{
		id: 'schematicConverter',
		name: 'Schematic Converter',
		cost: 25,
		description: 'Converts 25 Front N Schematics into 1 Front N+1 Schematic. Inefficient. Useful.',
	},
	{
		id: 'gameSpeed5',
		name: 'Game Speed x5',
		cost: 30,
		description: 'Unlocks unstable temporal compression at 5x speed.',
		requirement: 'gameSpeed3',
	},
	{
		id: 'outsourcedResearchLab',
		name: 'Outsourced Research Lab',
		cost: 40,
		description: 'Procures an unofficial second lab channel. Slot logic is pending certification.',
		status: 'scaffold',
	},
];

export function normalizeStrangeMatter(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function normalizeTimestamp(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function normalizeBlackMarketUnlocks(raw: unknown): BlackMarketUnlocks {
	const out: BlackMarketUnlocks = {};
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
	const allowed = new Set(BLACK_MARKET_UNLOCKS.map((u) => u.id));
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (allowed.has(key as BlackMarketUnlockId)) out[key as BlackMarketUnlockId] = value === true;
	}
	return out;
}

export function hasBlackMarketUnlock(unlocks: BlackMarketUnlocks | undefined, id: BlackMarketUnlockId): boolean {
	return unlocks?.[id] === true;
}

export function canClaimWeeklyShipment(lastClaimedAt: number, now = Date.now()): boolean {
	return lastClaimedAt <= 0 || now - lastClaimedAt >= WEEKLY_SHIPMENT_COOLDOWN_MS;
}

export function weeklyShipmentRemainingMs(lastClaimedAt: number, now = Date.now()): number {
	if (canClaimWeeklyShipment(lastClaimedAt, now)) return 0;
	return Math.max(0, WEEKLY_SHIPMENT_COOLDOWN_MS - (now - lastClaimedAt));
}

export function localDayKey(timestamp = Date.now()): string {
	const d = new Date(timestamp);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function canClaimDailyContract(lastCompletedAt: number, now = Date.now()): boolean {
	if (lastCompletedAt <= 0) return true;
	return localDayKey(lastCompletedAt) !== localDayKey(now);
}

export function getMaxUnlockedSpeed(unlocks: BlackMarketUnlocks | undefined): number {
	if (hasBlackMarketUnlock(unlocks, 'gameSpeed5')) return 5;
	if (hasBlackMarketUnlock(unlocks, 'gameSpeed3')) return 3;
	return 2;
}

export function canBuyBlackMarketUnlock(
	strangeMatter: number,
	unlocks: BlackMarketUnlocks,
	id: BlackMarketUnlockId,
): { ok: boolean; reason?: 'owned' | 'missingRequirement' | 'insufficient' | 'unknown'; def?: BlackMarketUnlockDef } {
	const def = BLACK_MARKET_UNLOCKS.find((u) => u.id === id);
	if (!def) return { ok: false, reason: 'unknown' };
	if (hasBlackMarketUnlock(unlocks, id)) return { ok: false, reason: 'owned', def };
	if (def.requirement && !hasBlackMarketUnlock(unlocks, def.requirement)) return { ok: false, reason: 'missingRequirement', def };
	if (normalizeStrangeMatter(strangeMatter) < def.cost) return { ok: false, reason: 'insufficient', def };
	return { ok: true, def };
}

export function convertSchematics(
	rawSchematics: SchematicsByFront,
	sourceFront: number,
	count: number,
): { ok: boolean; schematics: SchematicsByFront; converted: number; reason?: 'invalidFront' | 'invalidCount' | 'insufficient' } {
	if (!Number.isInteger(sourceFront) || sourceFront < 1 || sourceFront >= FRONT_COUNT) {
		return { ok: false, schematics: normalizeSchematics(rawSchematics), converted: 0, reason: 'invalidFront' };
	}
	const requested = Math.floor(count);
	if (!Number.isFinite(requested) || requested <= 0) {
		return { ok: false, schematics: normalizeSchematics(rawSchematics), converted: 0, reason: 'invalidCount' };
	}
	const schematics = normalizeSchematics(rawSchematics);
	const cost = requested * SCHEMATIC_CONVERSION_RATE;
	if (getSchematics(schematics, sourceFront) < cost) {
		return { ok: false, schematics, converted: 0, reason: 'insufficient' };
	}
	if (!spendSchematics(schematics, sourceFront, cost)) {
		return { ok: false, schematics, converted: 0, reason: 'insufficient' };
	}
	addSchematics(schematics, sourceFront + 1, requested);
	return { ok: true, schematics, converted: requested };
}
