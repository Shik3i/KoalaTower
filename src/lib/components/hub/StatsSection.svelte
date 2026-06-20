<script lang="ts">
	import { EnemyType } from '$lib/game/engine/gameTypes';
	import { ENEMY_TYPE_LABELS, getMasteryProgress, MASTERY_REWARDS } from '$lib/game/balance/mastery';
	import { getFrontName } from '$lib/game/balance/tiers';
	import { CHALLENGES } from '$lib/game/balance/challenges';
	import { formatCompact } from '$lib/game/balance/balanceMath';
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
		challengeHighScores
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
	} = $props();

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
</script>

<div class="hs">
	<h2 class="hst">📊 Archives</h2>
	<p class="hsd">Campaign telemetry and historical records. Some data has been revised for clarity. Some has been revised for morale. Some has been revised because we forgot what happened.</p>

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

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.stats-sub { margin:.9rem 0 .45rem; font-size:var(--fs-body); color:var(--text-primary); font-family:var(--font-display); }
	
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

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
