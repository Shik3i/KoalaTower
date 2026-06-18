<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FrontIcon from '$lib/components/FrontIcon.svelte';
	import { TierId, ChallengeId, FrontBand } from '$lib/game/engine/gameTypes';
	import { FRONT_META, FRONT_BANDS, getFrontName, describeFrontUnlock } from '$lib/game/balance/tiers';
	import { getFrontAlloyMultiplier } from '$lib/game/balance/balanceMath';
	import { getSchematics } from '$lib/game/balance/schematics';
	import { CHALLENGES, CHALLENGE_UNLOCK_REQS, isChallengeUnlocked } from '$lib/game/balance/challenges';

	let {
		highestWave,
		coins,
		totalRuns,
		selectedFront = $bindable(TierId.Tier1),
		selectedChallenge = $bindable<ChallengeId | null>(null),
		unlockedFronts,
		frontBestWave = {},
		schematicsByFront = {},
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
		schematicsByFront?: Record<number, number>;
		challengeHighScores?: Partial<Record<ChallengeId, number>>;
		onDeploy: () => void;
	} = $props();

	// Group the 16 Fronts by band for the selector.
	const bandOrder: FrontBand[] = [FrontBand.Perimeter, FrontBand.Redline, FrontBand.Blacksite, FrontBand.Anomaly];
	const frontsByBand = $derived(bandOrder.map(band => ({
		band,
		def: FRONT_BANDS[band],
		fronts: FRONT_META.filter(m => m.band === band),
	})));

	function isUnlocked(id: TierId): boolean {
		return unlockedFronts.includes(id);
	}

	function toggleChallenge(id: ChallengeId) {
		selectedChallenge = selectedChallenge === id ? null : id;
	}

	function handleGlobalKey(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		// Don't intercept Enter on interactive elements that handle it themselves.
		const t = e.target;
		if (t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement
			|| t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
			|| t instanceof HTMLSelectElement) return;
		onDeploy();
	}

	onMount(() => window.addEventListener('keydown', handleGlobalKey));
	onDestroy(() => window.removeEventListener('keydown', handleGlobalKey));

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

		<!-- Front selector — 16 Fronts across 4 bands -->
		<div class="front-sel">
			<div class="front-sel-h"><Icon name="hub" size={13} /> Select Front</div>
			{#each frontsByBand as group}
				{@const anyUnlocked = group.fronts.some(m => isUnlocked(m.id))}
				<div class="band-grp" style="--band:{group.def.color};--accent:{group.def.accent}">
					<div class="band-h">
						<span class="band-dot"></span>{group.def.label}
						{#if !anyUnlocked}<span class="band-lock">classified</span>{/if}
					</div>
					<div class="front-list">
						{#each group.fronts as m}
							{@const unlocked = isUnlocked(m.id)}
							{@const best = frontBestWave[m.id] ?? 0}
							{@const schem = getSchematics(schematicsByFront, m.front)}
							<button
								class="front-opt"
								class:on={selectedFront === m.id && !selectedChallenge}
								class:locked={!unlocked}
								disabled={!unlocked}
								onclick={() => { selectedFront = m.id; selectedChallenge = null; }}
								title={unlocked ? m.displayName : 'Locked — ' + describeFrontUnlock(m.id)}
							>
								<FrontIcon front={m.id} size={30} locked={!unlocked} />
								<div class="front-body">
									<span class="front-n">{m.displayName}</span>
									{#if unlocked}
										<span class="front-meta">×{getFrontAlloyMultiplier(m.front).toFixed(1)} Alloy{#if best > 0} · Best W{best}{/if}{#if schem > 0} · 📐{schem}{/if}</span>
									{:else}
										<span class="front-meta front-lock">🔒 {describeFrontUnlock(m.id)}</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Special Ops -->
		{#if CHALLENGES.some(c => isChallengeUnlocked(c.id, frontBestWave))}
			<div class="ops-sel" style="--band:rgb(255,200,0);--accent:rgb(255,200,0)">
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
								<span class="front-meta ops-hs" style="margin-left:auto">{hs > 0 ? 'Best: W' + hs : 'No record'}</span>
							{:else}
								<span class="front-meta front-lock" style="margin-left:auto">🔒 {req.label.replace('Reach Wave ', 'W').replace(' on Tier ', '·T')}</span>
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

	/* ── Band grouping ─────────────────────────────────────────── */
	.band-grp { margin-bottom:.55rem; }
	.band-h { display:flex; align-items:center; gap:.35rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.05em; text-transform:uppercase; color:var(--band); margin:.25rem 0 .3rem; }
	.band-dot { width:8px; height:8px; border-radius:2px; background:var(--band); box-shadow:0 0 8px var(--band); }
	.band-lock { margin-left:auto; color:var(--text-dim); text-transform:none; letter-spacing:0; font-style:italic; }

	/* ── Front buttons (horizontal row layout) ─────────────────── */
	.front-opt {
		display:flex; flex-direction:row; align-items:center; gap:.55rem;
		width:100%; padding:.45rem .6rem;
		border-radius:var(--radius-sm); background:var(--bg-tertiary);
		border:1px solid color-mix(in srgb, var(--band) 35%, transparent); transition:all var(--transition-fast);
		cursor:pointer; text-align:left;
	}
	.front-opt:hover:not(:disabled) { border-color:var(--band); background:color-mix(in srgb, var(--band) 8%, transparent); }
	.front-opt.on { border-color:var(--band); background:color-mix(in srgb, var(--band) 16%, transparent); box-shadow:0 0 12px color-mix(in srgb, var(--band) 30%, transparent); }
	.front-opt.locked { opacity:.5; cursor:not-allowed; border-color:var(--border-neon); }
	.front-body { display:flex; flex-direction:column; gap:.1rem; min-width:0; }
	.front-n { font-family:var(--font-display); font-weight:700; font-size:var(--fs-body-sm); color:var(--text-primary); white-space:nowrap; }
	.front-meta { font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.front-lock { color:var(--text-secondary); }
	.front-opt.on .front-n { color:var(--band); }

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
