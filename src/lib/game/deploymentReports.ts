import { formatCompact } from './balance/balanceMath';
import { EnemyType } from './engine/gameTypes';

export const MAX_DEPLOYMENT_REPORTS = 50;

export interface DeploymentReport {
	id: string;
	createdAt: number;
	front: number;
	finalWave: number;
	realTimeSeconds: number;
	simulationTimeSeconds: number;
	towerLostTo?: string;
	failureReason?: string;
	alloyEarned: number;
	alloyPerHour: number;
	schematicsEarned?: number;
	schematicsPerHour?: number;
	strangeMatterEarned?: number;
	enemiesDestroyed: number;
	bossesDestroyed: number;
	damageDealt: number;
	towerDamageTaken: number;
	bestKillChain?: number;
	alloyPerMinute?: number;
	communityBuffPercent?: number;
	communityBuffBonusAlloy?: number;
}

export interface DeploymentReportInput {
	now?: number;
	front: number;
	finalWave: number;
	realTimeSeconds: number;
	simulationTimeSeconds: number;
	towerLostTo?: string;
	alloyEarned: number;
	schematicsEarned?: number;
	strangeMatterEarned?: number;
	enemiesDestroyed: number;
	bossesDestroyed: number;
	damageDealt: number;
	towerDamageTaken: number;
	bestKillChain?: number;
	communityBuffPercent?: number;
	communityBuffBonusAlloy?: number;
}

const ENEMY_LABELS: Record<EnemyType, string> = {
	[EnemyType.Normal]: 'Basic Shape',
	[EnemyType.Fast]: 'Fast Shape',
	[EnemyType.Tank]: 'Tank Shape',
	[EnemyType.Ranged]: 'Ranged Shape',
	[EnemyType.Boss]: 'Boss Shape',
};

export function enemyTypeToReportLabel(type: EnemyType | string | undefined): string {
	if (!type) return 'Unknown Shape';
	return ENEMY_LABELS[type as EnemyType] ?? 'Unknown Shape';
}

function safeNonNegative(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function safeInteger(value: unknown): number {
	return Math.floor(safeNonNegative(value));
}

function ratePerHour(amount: number, seconds: number): number {
	const safeSeconds = Math.max(1, safeNonNegative(seconds));
	const rate = safeNonNegative(amount) / safeSeconds * 3600;
	return Number.isFinite(rate) ? rate : 0;
}

function createReportId(now: number): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `dr-${crypto.randomUUID()}`;
	}
	return `dr-${Math.floor(now)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDeploymentReport(input: DeploymentReportInput): DeploymentReport {
	const now = Number.isFinite(input.now) ? input.now! : Date.now();
	const realTimeSeconds = safeNonNegative(input.realTimeSeconds);
	const simulationTimeSeconds = safeNonNegative(input.simulationTimeSeconds);
	const alloyEarned = safeInteger(input.alloyEarned);
	const schematicsEarned = safeInteger(input.schematicsEarned);
	const communityBuffBonusAlloy = safeInteger(input.communityBuffBonusAlloy);
	const towerLostTo = input.towerLostTo?.trim() || 'Unknown Shape';
	const alloyPerHour = ratePerHour(alloyEarned, realTimeSeconds);
	const schematicsPerHour = schematicsEarned > 0 ? ratePerHour(schematicsEarned, realTimeSeconds) : undefined;

	return {
		id: createReportId(now),
		createdAt: now,
		front: Math.max(1, safeInteger(input.front) || 1),
		finalWave: safeInteger(input.finalWave),
		realTimeSeconds,
		simulationTimeSeconds,
		towerLostTo,
		failureReason: `Tower Lost to ${towerLostTo}`,
		alloyEarned,
		alloyPerHour,
		...(schematicsEarned > 0 ? { schematicsEarned, schematicsPerHour } : {}),
		...(safeInteger(input.strangeMatterEarned) > 0 ? { strangeMatterEarned: safeInteger(input.strangeMatterEarned) } : {}),
		enemiesDestroyed: safeInteger(input.enemiesDestroyed),
		bossesDestroyed: safeInteger(input.bossesDestroyed),
		damageDealt: safeNonNegative(input.damageDealt),
		towerDamageTaken: safeNonNegative(input.towerDamageTaken),
		...(safeInteger(input.bestKillChain) > 0 ? { bestKillChain: safeInteger(input.bestKillChain) } : {}),
		alloyPerMinute: alloyPerHour / 60,
		...(safeNonNegative(input.communityBuffPercent) > 0 ? { communityBuffPercent: safeNonNegative(input.communityBuffPercent) } : {}),
		...(communityBuffBonusAlloy > 0 ? { communityBuffBonusAlloy } : {}),
	};
}

export function normalizeDeploymentReports(raw: unknown): DeploymentReport[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.map((item) => normalizeDeploymentReport(item))
		.filter((item): item is DeploymentReport => item !== null)
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, MAX_DEPLOYMENT_REPORTS);
}

function normalizeDeploymentReport(raw: unknown): DeploymentReport | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	const createdAt = typeof r.createdAt === 'string' ? Date.parse(r.createdAt) : Number(r.createdAt);
	const safeCreatedAt = Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now();
	const id = typeof r.id === 'string' && r.id.trim() ? r.id : createReportId(safeCreatedAt);
	return {
		id,
		createdAt: safeCreatedAt,
		front: Math.max(1, safeInteger(r.front) || 1),
		finalWave: safeInteger(r.finalWave),
		realTimeSeconds: safeNonNegative(r.realTimeSeconds),
		simulationTimeSeconds: safeNonNegative(r.simulationTimeSeconds),
		...(typeof r.towerLostTo === 'string' && r.towerLostTo ? { towerLostTo: r.towerLostTo } : {}),
		...(typeof r.failureReason === 'string' && r.failureReason ? { failureReason: r.failureReason } : {}),
		alloyEarned: safeInteger(r.alloyEarned),
		alloyPerHour: safeNonNegative(r.alloyPerHour),
		...(safeInteger(r.schematicsEarned) > 0 ? { schematicsEarned: safeInteger(r.schematicsEarned) } : {}),
		...(safeNonNegative(r.schematicsPerHour) > 0 ? { schematicsPerHour: safeNonNegative(r.schematicsPerHour) } : {}),
		...(safeInteger(r.strangeMatterEarned) > 0 ? { strangeMatterEarned: safeInteger(r.strangeMatterEarned) } : {}),
		enemiesDestroyed: safeInteger(r.enemiesDestroyed),
		bossesDestroyed: safeInteger(r.bossesDestroyed),
		damageDealt: safeNonNegative(r.damageDealt),
		towerDamageTaken: safeNonNegative(r.towerDamageTaken),
		...(safeInteger(r.bestKillChain) > 0 ? { bestKillChain: safeInteger(r.bestKillChain) } : {}),
		...(safeNonNegative(r.alloyPerMinute ?? r.highestAlloyPerMinute) > 0 ? { alloyPerMinute: safeNonNegative(r.alloyPerMinute ?? r.highestAlloyPerMinute) } : {}),
		...(safeNonNegative(r.communityBuffPercent) > 0 ? { communityBuffPercent: safeNonNegative(r.communityBuffPercent) } : {}),
		...(safeInteger(r.communityBuffBonusAlloy) > 0 ? { communityBuffBonusAlloy: safeInteger(r.communityBuffBonusAlloy) } : {}),
	};
}

export function addDeploymentReport(history: DeploymentReport[] | undefined, report: DeploymentReport): DeploymentReport[] {
	return normalizeDeploymentReports([report, ...(history ?? [])]);
}

export function formatReportDuration(totalSeconds: number): string {
	const seconds = safeInteger(totalSeconds);
	if (seconds <= 0) return '0s';
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
	if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

export function formatReportNumber(value: number | undefined): string {
	return formatCompact(safeNonNegative(value));
}

export function deploymentHistoryEmptyState(): { title: string; detail: string } {
	return {
		title: 'No Deployment reports yet.',
		detail: 'Launch a Deployment to create your first report.',
	};
}

export interface ReportRow {
	label: string;
	value: string;
}

export interface ReportSection {
	title: string;
	rows: ReportRow[];
}

export function buildDeploymentReportSections(report: DeploymentReport): ReportSection[] {
	const date = new Date(report.createdAt);
	const deploymentRows: ReportRow[] = [
		{ label: 'Deployment Date', value: Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown' },
		{ label: 'Real Time', value: formatReportDuration(report.realTimeSeconds) },
		{ label: 'Simulation Time', value: formatReportDuration(report.simulationTimeSeconds) },
		{ label: 'Front', value: `Front ${report.front}` },
		{ label: 'Final Wave', value: report.finalWave.toLocaleString('en-US') },
		{ label: 'Tower Lost To', value: report.towerLostTo ?? 'Unknown Shape' },
		{ label: 'Alloy Earned', value: formatReportNumber(report.alloyEarned) },
		{ label: 'Alloy Per Hour', value: formatReportNumber(report.alloyPerHour) },
	];
	if ((report.schematicsEarned ?? 0) > 0) deploymentRows.push({ label: 'Schematics Earned', value: formatReportNumber(report.schematicsEarned) });
	if ((report.schematicsPerHour ?? 0) > 0) deploymentRows.push({ label: 'Schematics Per Hour', value: formatReportNumber(report.schematicsPerHour) });
	if ((report.strangeMatterEarned ?? 0) > 0) deploymentRows.push({ label: 'Strange Matter Earned', value: formatReportNumber(report.strangeMatterEarned) });
	if ((report.communityBuffBonusAlloy ?? 0) > 0) deploymentRows.push({ label: 'Community Buff Bonus', value: `+${formatReportNumber(report.communityBuffBonusAlloy)}` });

	const recordsRows: ReportRow[] = [
		{ label: 'Average Alloy / Minute', value: formatReportNumber(report.alloyPerMinute ?? report.alloyPerHour / 60) },
		{ label: 'Average Alloy / Hour', value: formatReportNumber(report.alloyPerHour) },
		{ label: 'Best Kill Chain', value: formatReportNumber(report.bestKillChain) },
		{ label: 'Highest Wave Reached', value: report.finalWave.toLocaleString('en-US') },
	];

	const combatRows: ReportRow[] = [
		{ label: 'Damage Dealt', value: formatReportNumber(report.damageDealt) },
		{ label: 'Tower Damage Taken', value: formatReportNumber(report.towerDamageTaken) },
		{ label: 'Shapes Destroyed', value: formatReportNumber(report.enemiesDestroyed) },
		{ label: 'Bosses Destroyed', value: formatReportNumber(report.bossesDestroyed) },
	];

	return [
		{ title: 'Deployment Report', rows: deploymentRows },
		{ title: 'Records', rows: recordsRows },
		{ title: 'Combat / Damage', rows: combatRows },
	];
}
