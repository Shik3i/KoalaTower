<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { TierId, ChallengeId } from '$lib/game/engine/gameTypes';
	import { TIERS, getTierNumber, getFrontName, getPreviousFront, FRONT_UNLOCK_WAVE } from '$lib/game/balance/tiers';
	import { getFrontAlloyMultiplier } from '$lib/game/balance/balanceMath';
	import { CHALLENGES, CHALLENGE_UNLOCK_REQS, isChallengeUnlocked } from '$lib/game/balance/challenges';

	let {
		highestWave,
		coins,
		totalRuns,
		selectedFront = $bindable(TierId.Tier1),
		selectedChallenge = $bindable<ChallengeId | null>(null),
		unlockedFronts,
		frontBestWave = {},
		challengeHighScores = {},
		onDeploy,
	}: {
		highestWave: number;
		coins: number;
		totalRuns: number;
		selectedFront?: TierId;
		selectedChallenge?: ChallengeId | null;
		unlockedFronts: TierId[];
		frontBestWave?: Partial<Record<TierId, number>>;
		challengeHighScores?: Partial<Record<ChallengeId, number>>;
		onDeploy: () => void;
	} = $props();

	function toggleChallenge(id: ChallengeId) {
		selectedChallenge = selectedChallenge === id ? null : id;
	}

	const deployLabel = $derived(
		selectedChallenge
			? `Deploy — ${CHALLENGES.find(c => c.id === selectedChallenge)?.name ?? ''}`
			: `Deploy to ${getFrontName(selectedFront)}`
	);
</script>

<div class="start-ol">
	<div class="start-card">
		<div class="sc-accent"></div>
		<div class="sc-icon"><img class="sc-logo" src="/branding/flatland-logo-medium.svg" alt="Flatland TD" /></div>
		<h2 class="sc-title">Flatland TD</h2>
		<p class="sc-sub">Deploy from orbit. Defend the plane. Field upgrades are lost with the tower — Orbital research endures.</p>
		{#if highestWave > 0}
			<div class="sc-rec">
				<div class="sc-r"><Icon name="crit" size={15} /> Best: Wave {highestWave}</div>
				<div class="sc-r"><Icon name="alloy" size={15} /> {coins.toLocaleString()} Alloy</div>
				<div class="sc-r"><Icon name="play" size={15} /> {totalRuns} Runs</div>
			</div>
		{/if}

		<!-- Front (tier) selector -->
		<div class="front-sel">
			<div class="front-sel-h"><Icon name="hub" size={13} /> Select Front</div>
			<div class="front-list">
				{#each TIERS as t}
					{@const unlocked = unlockedFronts.includes(t.id)}
					{@const tierNum = getTierNumber(t.id)}
					<button
						class="front-opt"
						class:on={selectedFront === t.id && !selectedChallenge}
						class:locked={!unlocked}
						disabled={!unlocked}
						onclick={() => { selectedFront = t.id; selectedChallenge = null; }}
						title={unlocked ? t.name : 'Locked — reach Wave ' + FRONT_UNLOCK_WAVE + ' on ' + (getPreviousFront(t.id) ? getFrontName(getPreviousFront(t.id)!) : '')}
					>
						<span class="front-n">{getFrontName(t.id)}</span>
						{#if unlocked}
							<span class="front-sub">
								{tierNum === 1 ? 'Baseline' : '×' + tierNum + ' difficulty'} · ×{getFrontAlloyMultiplier(tierNum).toFixed(1)} Alloy
							</span>
						{:else}
							<span class="front-sub front-lock">🔒 W{FRONT_UNLOCK_WAVE} on T{getPreviousFront(t.id) ? getTierNumber(getPreviousFront(t.id)!) : 1}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Special Ops -->
		{#if CHALLENGES.some(c => isChallengeUnlocked(c.id, frontBestWave))}
			<div class="ops-sel">
				<div class="front-sel-h">⚡ Special Ops</div>
				<div class="front-list">
					{#each CHALLENGES as c}
						{@const unlocked = isChallengeUnlocked(c.id, frontBestWave)}
						{@const req = CHALLENGE_UNLOCK_REQS[c.id]}
						{@const hs = challengeHighScores[c.id] ?? 0}
						<button
							class="front-opt ops-opt"
							class:on={selectedChallenge === c.id}
							class:locked={!unlocked}
							disabled={!unlocked}
							onclick={() => toggleChallenge(c.id)}
							title={unlocked ? c.description : req.label}
						>
							<span class="ops-icon">{c.icon}</span>
							<span class="front-n">{c.name}</span>
							{#if unlocked}
								<span class="front-sub ops-hs">{hs > 0 ? 'Best: W' + hs : 'No record'}</span>
							{:else}
								<span class="front-sub front-lock">🔒 {req.label.replace('Reach Wave ', 'W').replace(' on Tier ', '·T')}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<button class="sc-btn" class:sc-btn-ops={!!selectedChallenge} onclick={onDeploy}>
			<span class="sc-bi"></span>
			<span class="sc-bt"><Icon name="play" size={16} /> {deployLabel}</span>
		</button>
		<p class="sc-hint"><kbd>Enter</kbd> start · <kbd>Space</kbd> pause · <kbd>1-4</kbd> speed</p>
	</div>
</div>

<style>
	.start-ol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at center,rgba(7,8,18,.5) 0%,var(--bg-primary) 100%); z-index:10; overflow-y:auto; padding:1rem 0; }
	.start-card { position:relative; text-align:center; padding:2rem 1.5rem 1.5rem; background:var(--bg-glass-strong); border:1px solid var(--border-neon); border-radius:var(--radius-xl); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); max-width:420px; width:94%; animation:si .35s ease; box-shadow:0 0 60px rgba(0,255,255,.06); }
	.sc-accent { position:absolute; top:-1px; left:20%; right:20%; height:1px; background:linear-gradient(90deg,transparent,var(--cyan),transparent); opacity:.6; }
	.sc-icon { font-size:var(--fs-icon-2xl); display:block; margin-bottom:.5rem; filter:drop-shadow(0 0 20px rgba(0,255,255,.3)); }
	.sc-logo { width:100%; max-width:260px; height:auto; }
	.sc-title { font-size:var(--fs-icon-lg); margin-bottom:.2rem; }
	.sc-sub { font-size:var(--fs-body-sm); color:var(--text-secondary); margin-bottom:1rem; }
	.sc-rec { display:flex; flex-direction:column; gap:.2rem; margin-bottom:1rem; padding:.6rem; background:rgba(0,0,0,.2); border-radius:var(--radius-md); }
	.sc-r { font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-secondary); display:flex; gap:.3rem; align-items:center; }

	/* ── Shared list layout ─────────────────────────────────────── */
	.front-sel, .ops-sel { margin-bottom:1rem; width:100%; }
	.front-sel-h { display:flex; align-items:center; gap:.3rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.06em; text-transform:uppercase; color:var(--text-dim); margin-bottom:.4rem; }
	/* Vertical stack — each button is full-width and tall */
	.front-list { display:flex; flex-direction:column; gap:.3rem; }

	/* ── Front buttons (horizontal row layout) ─────────────────── */
	.front-opt {
		display:flex; flex-direction:row; align-items:center; gap:.5rem;
		width:100%; padding:.55rem .75rem;
		border-radius:var(--radius-sm); background:var(--bg-tertiary);
		border:1px solid var(--border-neon); transition:all var(--transition-fast);
		cursor:pointer; text-align:left;
	}
	.front-opt:hover:not(:disabled) { border-color:var(--cyan); background:rgba(0,255,255,.06); }
	.front-opt.on { border-color:var(--cyan); background:rgba(0,255,255,.12); box-shadow:0 0 12px rgba(0,255,255,.18); }
	.front-opt.locked { opacity:.4; cursor:not-allowed; }
	.front-n { font-family:var(--font-display); font-weight:700; font-size:var(--fs-body-sm); color:var(--text-primary); white-space:nowrap; }
	.front-sub { font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); margin-left:auto; white-space:nowrap; flex-shrink:0; }
	.front-lock { color:var(--text-secondary); }
	.front-opt.on .front-n { color:var(--cyan); }

	/* ── Ops-specific additions ─────────────────────────────────── */
	.ops-opt { border-color:rgba(255,200,0,.25); }
	.ops-opt:hover:not(:disabled) { border-color:rgba(255,200,0,.6); background:rgba(255,200,0,.06); }
	.ops-opt.on { border-color:rgba(255,200,0,.8); background:rgba(255,200,0,.1); box-shadow:0 0 12px rgba(255,200,0,.18); }
	.ops-opt.on .front-n { color:rgb(255,220,60); }
	.ops-icon { font-size:1.1em; flex-shrink:0; }
	.ops-hs { color:var(--text-secondary); }

	/* ── Deploy button ──────────────────────────────────────────── */
	.sc-btn { position:relative; display:inline-flex; align-items:center; gap:.4rem; padding:.7rem 2rem; border-radius:var(--radius-md); background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:var(--fs-btn); cursor:pointer; overflow:hidden; transition:all var(--transition-normal); box-shadow:0 0 30px rgba(0,255,255,.2); width:100%; justify-content:center; }
	.sc-btn:hover { transform:translateY(-2px); box-shadow:0 0 50px rgba(0,255,255,.35); }
	.sc-btn-ops { background:linear-gradient(135deg,rgb(220,170,0),rgb(200,120,0)); box-shadow:0 0 30px rgba(255,200,0,.2); }
	.sc-btn-ops:hover { box-shadow:0 0 50px rgba(255,200,0,.35); }
	.sc-bi { position:absolute; inset:0; background:linear-gradient(135deg,transparent,rgba(255,255,255,.12),transparent); transition:opacity var(--transition-normal); opacity:0; }
	.sc-btn:hover .sc-bi { opacity:1; }
	.sc-bt { position:relative; z-index:1; }
	.sc-hint { margin-top:.5rem; font-size:var(--fs-caption-sm); color:var(--text-secondary); }
	.sc-hint kbd { padding:.08rem .3rem; background:var(--bg-tertiary); border-radius:3px; font-family:var(--font-mono); font-size:var(--fs-caption-sm); border:1px solid var(--border-neon); }
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
</style>
