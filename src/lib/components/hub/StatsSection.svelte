<script lang="ts">
	import { EnemyType } from '$lib/game/engine/gameTypes';
	import { ENEMY_TYPE_LABELS, getMasteryProgress, MASTERY_REWARDS } from '$lib/game/balance/mastery';
	import { getFrontName } from '$lib/game/balance/tiers';
	import { CHALLENGES } from '$lib/game/balance/challenges';
	import { formatCompact } from '$lib/game/balance/balanceMath';
	import {
		buildDeploymentReportSections,
		deploymentHistoryEmptyState,
		formatReportDuration,
		formatReportNumber,
		type DeploymentReport
	} from '$lib/game/deploymentReports';
	import { tooltip } from '$lib/components/tooltip';
	import type { TierId } from '$lib/game/engine/gameTypes';

	let {
		totalRuns,
		highestWave,
		hubStats,
		lifetimeStats,
		killsByType,
		shinyKillsByType,
		masteryAchievements,
		frontBestWave,
		challengeHighScores,
		deploymentReports
	}: {
		totalRuns: number;
		highestWave: number;
		hubStats: {
			bestKillstreak: number;
			totalKills: number;
			totalBossesDefeated: number;
			totalShiniesKilled: number;
			totalAlloyEarned: number;
		};
		lifetimeStats: {
			totalEnergyEarned: number;
			totalDamageDealt: number;
			totalCritsDealt: number;
			totalWavesCompleted: number;
			totalPlayTimeSeconds: number;
		};
		killsByType: Partial<Record<EnemyType, number>>;
		shinyKillsByType: Partial<Record<EnemyType, number>>;
		masteryAchievements: Partial<Record<string, boolean>>;
		frontBestWave: Partial<Record<TierId, number>>;
		challengeHighScores: Partial<Record<string, number>>;
		deploymentReports: DeploymentReport[];
	} = $props();

	let selectedReport = $state<DeploymentReport | null>(null);
	let reportTrigger = $state<HTMLElement | null>(null);
	let reportModal = $state<HTMLDivElement>();
	let reportCloseButton = $state<HTMLButtonElement>();
	const emptyHistory = deploymentHistoryEmptyState();

	const enemyTypes = [
		EnemyType.Normal,
		EnemyType.Fast,
		EnemyType.Tank,
		EnemyType.Ranged,
		EnemyType.Boss
	];

	function getChallengeName(id: string): string {
		return CHALLENGES.find(c => c.id === id)?.name ?? id;
	}

	function formatPlayTime(totalSeconds: number): string {
		if (totalSeconds <= 0) return '0s';
		const h = Math.floor(totalSeconds / 3600);
		const m = Math.floor((totalSeconds % 3600) / 60);
		if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
		if (m > 0) return `${m}m`;
		const s = totalSeconds % 60;
		return `${s}s`;
	}

	function openDeploymentReport(report: DeploymentReport, event: MouseEvent) {
		reportTrigger = event.currentTarget as HTMLElement;
		selectedReport = report;
		requestAnimationFrame(() => reportCloseButton?.focus());
	}

	function closeDeploymentReport() {
		selectedReport = null;
		requestAnimationFrame(() => reportTrigger?.focus());
	}

	function getReportFocusableElements(): HTMLElement[] {
		if (!reportModal) return [];
		return Array.from(reportModal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
			.filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
	}

	function handleReportKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && selectedReport) {
			event.preventDefault();
			closeDeploymentReport();
			return;
		}
		if (event.key === 'Tab' && selectedReport) {
			const focusable = getReportFocusableElements();
			if (focusable.length === 0) return;
			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
	}

	function handleReportBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) closeDeploymentReport();
	}
</script>

<svelte:window onkeydown={handleReportKeydown} />

<div class="hs">
	<h2 class="hst">📊 Archives</h2>
	<p class="hsd">Campaign telemetry and historical records. Some data has been revised for clarity. Some has been revised for morale. Some has been revised because we forgot what happened.</p>

	<h3 class="stats-sub">Deployment History</h3>
	{#if deploymentReports.length === 0}
		<div class="history-empty">
			<strong>{emptyHistory.title}</strong>
			<span>{emptyHistory.detail}</span>
		</div>
	{:else}
		<div class="history-list" aria-label="Deployment History">
			{#each deploymentReports as report (report.id)}
				<button class="history-card" type="button" onclick={(event) => openDeploymentReport(report, event)} aria-label={`Open Front ${report.front} Deployment Report from wave ${report.finalWave}`}>
					<span class="history-top">
						<span class="history-title">Front {report.front} - Wave {report.finalWave}</span>
						<span class="history-date">{new Date(report.createdAt).toLocaleDateString()}</span>
					</span>
					<span class="history-metrics">
						<span>Alloy: <strong>{formatReportNumber(report.alloyEarned)}</strong></span>
						<span>Alloy/hour: <strong>{formatReportNumber(report.alloyPerHour)}</strong></span>
						<span>Duration: <strong>{formatReportDuration(report.realTimeSeconds)}</strong></span>
					</span>
					<span class="history-foot">
						<span>{report.towerLostTo ? `Tower Lost to ${report.towerLostTo}` : 'Tower Lost'}</span>
						<span class="history-tag">Report</span>
					</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if totalRuns === 0}
		<p class="hsd" style="color:var(--text-dim);font-style:italic;">No campaign records yet. The Shapes are still waiting for you to make the first move. Deploy a Tower — even a single wave writes history.</p>
	{:else}
		<h3 class="stats-sub">Lifetime Statistics</h3>
		<div class="ig" style="max-width:600px">
			<div class="ir"><span class="il">Total Deployments</span><span class="iv">{totalRuns}</span></div>
			<div class="ir"><span class="il">Highest Wave</span><span class="iv">🏆 {highestWave}</span></div>
			<div class="ir"><span class="il">Best Killstreak</span><span class="iv">⛓ {formatCompact(hubStats.bestKillstreak)}</span></div>
			<div class="ir"><span class="il">Total Kills</span><span class="iv">{formatCompact(hubStats.totalKills)}</span></div>
			<div class="ir"><span class="il">Bosses Defeated</span><span class="iv">{formatCompact(hubStats.totalBossesDefeated)}</span></div>
			<div class="ir"><span class="il">Shinies Collected</span><span class="iv">{formatCompact(hubStats.totalShiniesKilled)}</span></div>
			<div class="ir"><span class="il">Damage Dealt</span><span class="iv">{formatCompact(lifetimeStats.totalDamageDealt)}</span></div>
			<div class="ir"><span class="il">Critical Hits</span><span class="iv">{formatCompact(lifetimeStats.totalCritsDealt)}</span></div>
			<div class="ir"><span class="il">Energy Earned</span><span class="iv">⚡ {formatCompact(lifetimeStats.totalEnergyEarned)}</span></div>
			<div class="ir"><span class="il">Alloy Earned</span><span class="iv">🔩 {formatCompact(hubStats.totalAlloyEarned)}</span></div>
			<div class="ir"><span class="il">Waves Completed</span><span class="iv">{formatCompact(lifetimeStats.totalWavesCompleted)}</span></div>
			<div class="ir"><span class="il">Play Time</span><span class="iv">{formatPlayTime(lifetimeStats.totalPlayTimeSeconds)}</span></div>
		</div>

		<h3 class="stats-sub" style="margin-top:1.5rem">Enemy Mastery</h3>
		<p class="hsd" style="margin-bottom:.75rem">Defeat enemies to earn mastery levels. Each mastery level grants +1% damage against that enemy type, and Alloy bonuses are awarded automatically when thresholds are crossed.</p>
		<div class="mastery-list">
			{#each enemyTypes as et}
				{@const kills = killsByType[et] ?? 0}
				{@const shinies = shinyKillsByType[et] ?? 0}
				{@const prog = getMasteryProgress(kills)}
				{@const dmgBonus = prog.level * 1}
				<div class="mastery-card">
					<div class="mastery-header">
						<span class="mastery-name">{ENEMY_TYPE_LABELS[et]}</span>
						<span class="mastery-level" class:maxed={prog.level >= 5}>Mastery {prog.level}/5</span>
						{#if dmgBonus > 0}<span class="mastery-bonus">+{dmgBonus}% DMG</span>{/if}
					</div>
					<div class="mastery-kills">
						<span class="il">{formatCompact(kills)} kills</span>
						{#if shinies > 0}<span class="mastery-shiny">✨ {formatCompact(shinies)} shiny</span>{/if}
						{#if prog.level < 5}<span class="il" style="margin-left:auto">{formatCompact(prog.next - kills)} to next</span>{/if}
					</div>
					<div class="mastery-bar-track">
						<div class="mastery-bar-fill" style="width:{prog.pct}%"></div>
					</div>
					<div class="mastery-rewards">
						{#each [1,2,3,4,5] as l}
							{@const key = `mastery_${et}_${l}`}
							{@const claimed = !!masteryAchievements[key]}
							{@const earned = prog.level >= l}
							<div class="mastery-pip" class:earned={earned} class:claimed={claimed} use:tooltip={`Mastery ${l} — ${MASTERY_REWARDS[l-1]?.toLocaleString()} Alloy${claimed ? '\nClaimed.' : earned ? '\nEarned — claim it below.' : '\nKeep hunting this enemy type.'}`}>
								{#if claimed}✓{:else if earned}!{:else}{l}{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<h3 class="stats-sub" style="margin-top:1.5rem">Front Progress</h3>
		<div class="ig" style="max-width:600px">
			{#each Object.entries(frontBestWave) as [front, wave]}
				<div class="ir"><span class="il">{getFrontName(front as TierId)}</span><span class="iv">Wave {wave}</span></div>
			{/each}
			{#if Object.keys(frontBestWave).length === 0}
				<div class="ir"><span class="il" style="color:var(--text-dim)">No front data yet — complete a deployment.</span></div>
			{/if}
		</div>

		<h3 class="stats-sub" style="margin-top:1.5rem">Special Operations Records</h3>
		<div class="ig" style="max-width:600px">
			{#each Object.entries(challengeHighScores) as [challenge, score]}
				<div class="ir"><span class="il">{getChallengeName(challenge)}</span><span class="iv">Wave {score}</span></div>
			{/each}
			{#if Object.keys(challengeHighScores).length === 0}
				<div class="ir"><span class="il" style="color:var(--text-dim)">No Special Operations records yet.</span></div>
			{/if}
		</div>
	{/if}
</div>

{#if selectedReport}
	<div class="report-backdrop" role="presentation" onclick={handleReportBackdropClick}>
		<div class="report-modal" role="dialog" aria-modal="true" aria-labelledby="deployment-report-title" bind:this={reportModal} tabindex="-1">
			<div class="report-head">
				<div>
					<p class="report-kicker">Deployment Report</p>
					<h2 id="deployment-report-title">Front {selectedReport.front} Deployment Report</h2>
				</div>
				<button class="report-close" type="button" aria-label="Close Deployment Report" onclick={closeDeploymentReport} bind:this={reportCloseButton}>x</button>
			</div>
			<div class="report-body">
				{#each buildDeploymentReportSections(selectedReport) as section}
					<section class="report-section" aria-label={section.title}>
						<h3>{section.title}</h3>
						<div class="report-rows">
							{#each section.rows as row}
								<div class="report-row">
									<span>{row.label}</span>
									<strong>{row.value}</strong>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.stats-sub { margin:.9rem 0 .45rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }

	.history-empty { display:grid; gap:.25rem; max-width:600px; padding:.75rem .85rem; margin-bottom:1rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); background:rgba(0,0,0,.12); color:var(--text-secondary); }
	.history-empty strong { color:var(--text-primary); font-family:var(--font-display); }
	.history-list { display:grid; gap:.5rem; max-width:760px; margin-bottom:1.25rem; }
	.history-card { width:100%; display:grid; gap:.4rem; padding:.7rem .8rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-secondary); text-align:left; cursor:pointer; transition:border-color var(--transition-fast), transform var(--transition-fast), background var(--transition-fast); }
	.history-card:hover,.history-card:focus-visible { border-color:rgba(0,255,255,.45); background:rgba(0,255,255,.05); transform:translateY(-1px); outline:none; }
	.history-top,.history-metrics,.history-foot { display:flex; gap:.6rem; align-items:center; justify-content:space-between; flex-wrap:wrap; }
	.history-title { color:var(--text-primary); font-family:var(--font-display); font-size:var(--fs-body); }
	.history-date,.history-metrics,.history-foot { font-family:var(--font-mono); font-size:var(--fs-caption); }
	.history-metrics strong { color:var(--cyan); font-weight:700; }
	.history-tag { color:var(--yellow); border:1px solid rgba(255,221,68,.35); border-radius:3px; padding:.08rem .35rem; }
	
	.ig { display:grid; gap:3px; max-width:600px; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); }
	.iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	
	.mastery-list { display:grid; gap:.45rem; max-width:800px; }
	.mastery-card { padding:.65rem .75rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.mastery-header { display:flex; align-items:center; gap:.45rem; flex-wrap:wrap; margin-bottom:.35rem; }
	.mastery-name { color:var(--text-primary); font-weight:600; font-size:var(--fs-body-sm); }
	.mastery-level,.mastery-bonus { font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--text-secondary); padding:.1rem .35rem; border-radius:3px; background:rgba(0,0,0,.16); }
	.mastery-level.maxed,.mastery-bonus { color:var(--cyan); }
	.mastery-kills { display:flex; align-items:center; gap:.55rem; min-height:1.2rem; font-size:var(--fs-caption); }
	.mastery-shiny { color:var(--yellow); font-family:var(--font-mono); }
	.mastery-bar-track { height:5px; margin:.35rem 0; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.mastery-bar-fill { height:100%; background:linear-gradient(90deg,var(--cyan),var(--green)); border-radius:2px; transition:width var(--transition-normal); }
	.mastery-rewards { display:flex; gap:.25rem; }
	.mastery-pip { width:22px; height:22px; display:grid; place-items:center; border:1px solid var(--border-neon); border-radius:3px; color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-caption-sm); }
	.mastery-pip.earned { color:var(--yellow); border-color:rgba(255,221,68,.35); }
	.mastery-pip.claimed { color:var(--green); border-color:rgba(68,255,136,.35); background:rgba(68,255,136,.06); }

	.report-backdrop { position:fixed; inset:0; z-index:700; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(5,7,16,.82); backdrop-filter:blur(5px); animation:fi .16s ease; }
	.report-modal { width:min(760px,100%); max-height:min(86vh,820px); display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(0,255,255,.28); border-radius:var(--radius-md); background:var(--bg-secondary); box-shadow:0 0 90px rgba(0,0,0,.55), 0 0 44px rgba(0,255,255,.08); }
	.report-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding:1rem 1.1rem .85rem; border-bottom:1px solid var(--border-neon); }
	.report-kicker { margin:0 0 .15rem; color:var(--cyan); font-family:var(--font-mono); font-size:var(--fs-caption); text-transform:uppercase; letter-spacing:.08em; }
	.report-head h2 { margin:0; color:var(--text-primary); font-size:var(--fs-heading); }
	.report-close { width:34px; height:34px; display:grid; place-items:center; border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--text-secondary); background:rgba(0,0,0,.16); font-family:var(--font-mono); font-size:var(--fs-body); cursor:pointer; }
	.report-close:hover,.report-close:focus-visible { color:var(--text-primary); border-color:rgba(255,68,170,.55); outline:none; }
	.report-body { overflow:auto; padding:1rem 1.1rem 1.15rem; display:grid; gap:1rem; }
	.report-section h3 { margin:0 0 .45rem; color:var(--cyan); font-family:var(--font-display); font-size:var(--fs-body); }
	.report-rows { display:grid; gap:3px; }
	.report-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.48rem .58rem; border-radius:3px; font-family:var(--font-mono); font-size:var(--fs-body-sm); background:rgba(0,0,0,.12); }
	.report-row span { color:var(--text-secondary); }
	.report-row strong { color:var(--yellow); font-weight:700; text-align:right; overflow-wrap:anywhere; }

	@media(max-width:640px){
		.report-backdrop { align-items:stretch; padding:.65rem; }
		.report-modal { max-height:calc(100vh - 1.3rem); }
		.report-head { padding:.85rem; }
		.report-body { padding:.85rem; }
		.report-row { align-items:flex-start; flex-direction:column; gap:.18rem; }
		.report-row strong { text-align:left; }
	}

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
