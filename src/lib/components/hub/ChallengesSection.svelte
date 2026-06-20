<script lang="ts">
	import { CHALLENGES, CHALLENGE_UNLOCK_REQS, isChallengeUnlocked } from '$lib/game/balance/challenges';
	import { tooltip } from '$lib/components/tooltip';
	import type { TierId } from '$lib/game/engine/gameTypes';

	let {
		frontBestWave,
		challengeHighScores
	}: {
		frontBestWave: Partial<Record<TierId, number>>;
		challengeHighScores: Partial<Record<string, number>>;
	} = $props();
</script>

<div class="hs">
	<h2 class="hst">⚡ Special Operations</h2>
	<p class="hsd">Tactical exercises with modified engagement rules. Each operation tests different combat scenarios under special conditions. 'Special conditions' is military code for 'we broke something and called it a feature.'</p>
	<div class="cl">
		{#each CHALLENGES as c}
			{@const unlocked = isChallengeUnlocked(c.id, frontBestWave)}
			{@const highScore = challengeHighScores[c.id] ?? 0}
			
			<div class="cc" class:lck={!unlocked}>
				<div class="cc-h">
					<span class="cci">{c.icon}</span>
					<div>
						<div class="ccn">{c.name}</div>
						<div class="ccd">{c.description}</div>
					</div>
				</div>
				{#if highScore > 0}
					<div class="ccs">Best: Wave {highScore}</div>
				{:else if !unlocked}
					<div class="ccl">🔒 {CHALLENGE_UNLOCK_REQS[c.id].label}</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.cc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.cc.lck { opacity:.55; }
	.cc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.cci { font-size:var(--fs-icon-lg); flex-shrink:0; margin-top:2px; }
	.ccn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.ccd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	.ccs,.ccl { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.ccs { color:var(--green); }

	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
