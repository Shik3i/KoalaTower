import { describe, expect, it } from 'vitest';
import {
	MAX_DEPLOYMENT_REPORTS,
	addDeploymentReport,
	buildDeploymentReportSections,
	createDeploymentReport,
	deploymentHistoryEmptyState,
	enemyTypeToReportLabel,
	formatReportDuration,
	normalizeDeploymentReports,
	type DeploymentReport,
} from '../deploymentReports';
import { EnemyType } from '../engine/gameTypes';

describe('Deployment Reports', () => {
	it('creates a sanitized report with separate real and simulation time', () => {
		const report = createDeploymentReport({
			now: 1_700_000_000_000,
			front: 4,
			finalWave: 214,
			realTimeSeconds: 60,
			simulationTimeSeconds: 300,
			towerLostTo: 'Fast Shape',
			alloyEarned: 1200,
			schematicsEarned: 5,
			enemiesDestroyed: 400,
			bossesDestroyed: 21,
			damageDealt: 99_999,
			towerDamageTaken: 150,
			bestKillChain: 88,
			communityBuffPercent: 10,
			communityBuffBonusAlloy: 100,
		});

		expect(report.front).toBe(4);
		expect(report.realTimeSeconds).toBe(60);
		expect(report.simulationTimeSeconds).toBe(300);
		expect(report.alloyPerHour).toBe(72_000);
		expect(report.alloyPerMinute).toBe(1200);
		expect(report.schematicsPerHour).toBe(300);
		expect(report.towerLostTo).toBe('Fast Shape');
	});

	it('handles very short runs without NaN or Infinity rates', () => {
		const report = createDeploymentReport({
			front: 1,
			finalWave: 0,
			realTimeSeconds: 0,
			simulationTimeSeconds: Number.POSITIVE_INFINITY,
			alloyEarned: Number.NaN,
			enemiesDestroyed: Number.POSITIVE_INFINITY,
			bossesDestroyed: -4,
			damageDealt: Number.NaN,
			towerDamageTaken: Number.POSITIVE_INFINITY,
		});

		expect(report.realTimeSeconds).toBe(0);
		expect(report.simulationTimeSeconds).toBe(0);
		expect(report.alloyEarned).toBe(0);
		expect(report.alloyPerHour).toBe(0);
		expect(report.enemiesDestroyed).toBe(0);
		expect(report.bossesDestroyed).toBe(0);
		expect(report.damageDealt).toBe(0);
		expect(report.towerDamageTaken).toBe(0);
	});

	it('caps history newest first', () => {
		let reports: DeploymentReport[] = [];
		for (let i = 0; i < MAX_DEPLOYMENT_REPORTS + 5; i++) {
			reports = addDeploymentReport(reports, createDeploymentReport({
				now: 1_000 + i,
				front: 1,
				finalWave: i,
				realTimeSeconds: 10,
				simulationTimeSeconds: 10,
				alloyEarned: i,
				enemiesDestroyed: i,
				bossesDestroyed: 0,
				damageDealt: 0,
				towerDamageTaken: 0,
			}));
		}

		expect(reports).toHaveLength(MAX_DEPLOYMENT_REPORTS);
		expect(reports[0]?.finalWave).toBe(MAX_DEPLOYMENT_REPORTS + 4);
		expect(reports.at(-1)?.finalWave).toBe(5);
	});

	it('normalizes old or malformed optional report fields without crashing modal data', () => {
		const [report] = normalizeDeploymentReports([{
			id: '',
			createdAt: '2026-06-20T12:00:00.000Z',
			front: '2',
			finalWave: '12',
			realTimeSeconds: '30',
			simulationTimeSeconds: '150',
			alloyEarned: '1000',
			alloyPerHour: Number.POSITIVE_INFINITY,
			enemiesDestroyed: '20',
			bossesDestroyed: null,
			damageDealt: Number.NaN,
			towerDamageTaken: 3,
		}]);

		expect(report).toBeTruthy();
		expect(report!.front).toBe(2);
		expect(report!.finalWave).toBe(12);
		expect(report!.alloyPerHour).toBe(0);
		expect(() => buildDeploymentReportSections(report!)).not.toThrow();
	});

	it('provides Archives empty state and representative modal sections', () => {
		expect(deploymentHistoryEmptyState()).toEqual({
			title: 'No Deployment reports yet.',
			detail: 'Launch a Deployment to create your first report.',
		});

		const report = createDeploymentReport({
			front: 3,
			finalWave: 50,
			realTimeSeconds: 3723,
			simulationTimeSeconds: 5000,
			alloyEarned: 12_400,
			enemiesDestroyed: 100,
			bossesDestroyed: 5,
			damageDealt: 123_456,
			towerDamageTaken: 789,
		});
		const sections = buildDeploymentReportSections(report);

		expect(sections.map((section) => section.title)).toEqual([
			'Deployment Report',
			'Records',
			'Combat / Damage',
		]);
		expect(sections[0]!.rows.some((row) => row.label === 'Real Time' && row.value === '1h 02m 03s')).toBe(true);
		expect(sections[1]!.rows.some((row) => row.label === 'Average Alloy / Hour')).toBe(true);
		expect(sections[2]!.rows.some((row) => row.label === 'Shapes Destroyed')).toBe(true);
	});

	it('formats durations and enemy labels for display', () => {
		expect(formatReportDuration(372)).toBe('6m 12s');
		expect(formatReportDuration(3723)).toBe('1h 02m 03s');
		expect(formatReportDuration(123_174)).toBe('1d 10h 12m 54s');
		expect(enemyTypeToReportLabel(EnemyType.Boss)).toBe('Boss Shape');
		expect(enemyTypeToReportLabel(undefined)).toBe('Unknown Shape');
	});
});
