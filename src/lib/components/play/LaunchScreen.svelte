<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FrontIcon from '$lib/components/FrontIcon.svelte';
	import { tooltip } from '$lib/components/tooltip';
	import { swipeHintDismissed, dismissSwipeHint } from '$lib/stores/mobileHints';
	import { TierId, ChallengeId } from '$lib/game/engine/gameTypes';
	import { FRONT_META, getFrontName, describeFrontUnlock } from '$lib/game/balance/tiers';
	import { getFrontBandPanels, getSelectedFrontBandIndex, getFrontSelectorStatus } from '$lib/game/balance/frontSelector';
	import { getFrontAlloyMultiplier } from '$lib/game/balance/balanceMath';
	import { getSchematics } from '$lib/game/balance/schematics';
	import { CHALLENGES, CHALLENGE_UNLOCK_REQS, isChallengeUnlocked } from '$lib/game/balance/challenges';

	let {
		highestWave,
		coins,
		totalRuns,
		saveLoaded = true,
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
		saveLoaded?: boolean;
		selectedFront?: TierId;
		selectedChallenge?: ChallengeId | null;
		unlockedFronts: TierId[];
		frontBestWave?: Partial<Record<TierId, number>>;
		schematicsByFront?: Record<number, number>;
		challengeHighScores?: Partial<Record<ChallengeId, number>>;
		onDeploy: () => void;
	} = $props();

	const frontBandPanels = getFrontBandPanels();
	let bandRail = $state<HTMLDivElement | null>(null);
	let activeBandIndex = $state(getSelectedFrontBandIndex(selectedFront));

	function isUnlocked(id: TierId): boolean {
		return unlockedFronts.includes(id);
	}

	function selectBand(index: number) {
		activeBandIndex = Math.max(0, Math.min(frontBandPanels.length - 1, index));
		bandRail?.children[activeBandIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	}

	function onBandTabKeydown(e: KeyboardEvent, index: number) {
		let nextIndex = index;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			nextIndex = (index + 1) % frontBandPanels.length;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			nextIndex = (index - 1 + frontBandPanels.length) % frontBandPanels.length;
		} else if (e.key === 'Home') {
			nextIndex = 0;
		} else if (e.key === 'End') {
			nextIndex = frontBandPanels.length - 1;
		} else {
			return;
		}
		e.preventDefault();
		selectBand(nextIndex);
		requestAnimationFrame(() => {
			document.getElementById('front-band-tab-' + nextIndex)?.focus();
		});
	}

	function selectFront(id: TierId) {
		selectedFront = id;
		selectedChallenge = null;
		activeBandIndex = getSelectedFrontBandIndex(id);
	}

	function handleBandScroll() {
		if (!bandRail) return;
		const width = Math.max(1, bandRail.clientWidth);
		activeBandIndex = Math.max(0, Math.min(frontBandPanels.length - 1, Math.round(bandRail.scrollLeft / width)));
		// First real swipe dismisses the hint — they've clearly got it now.
		if (!$swipeHintDismissed) dismissSwipeHint();
	}

	function toggleChallenge(id: ChallengeId) {
		selectedChallenge = selectedChallenge === id ? null : id;
	}

	function handleGlobalKey(e: KeyboardEvent) {
		if (!saveLoaded) return;
		if (e.key !== 'Enter') return;
		const t = e.target;
		if (t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement
			|| t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
			|| t instanceof HTMLSelectElement) return;
		onDeploy();
	}

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKey);
		requestAnimationFrame(() => selectBand(getSelectedFrontBandIndex(selectedFront)));
	});
	onDestroy(() => window.removeEventListener('keydown', handleGlobalKey));

	const deployLabel = $derived(
		selectedChallenge
			? `Deploy - ${CHALLENGES.find(c => c.id === selectedChallenge)?.name ?? ''}`
			: `Deploy to ${getFrontName(selectedFront)}`
	);
</script>

<div class="start-ol">
	<div class="start-card">
		<div class="sc-accent"></div>
		<div class="sc-icon"><img class="sc-logo" src="/branding/flatland-logo-medium.svg" alt="Flatland TD" /></div>
		<h2 class="sc-title">Flatland TD</h2>
		<p class="sc-sub">Deploy from orbit. Defend the plane. Field upgrades are lost with the tower; Orbital research endures.</p>
		{#if totalRuns === 0}
			<p class="sc-first-run">Start on Front 1. Locked bands are future fronts, not setup errors.</p>
		{/if}
		{#if highestWave > 0}
			<div class="sc-rec">
				<div class="sc-r"><Icon name="crit" size={15} /> Best: Wave {highestWave}</div>
				<div class="sc-r"><Icon name="alloy" size={15} /> {coins.toLocaleString()} Alloy</div>
				<div class="sc-r"><Icon name="play" size={15} /> {totalRuns} Runs</div>
			</div>
		{/if}

		<div class="front-sel">
			<div class="front-sel-h">
				<span><Icon name="hub" size={13} /> Select Front</span>
				<span class="front-band-count">{activeBandIndex + 1}/{frontBandPanels.length}</span>
			</div>
			<div class="band-nav" aria-label="Front band navigation">
				<button class="band-arrow" disabled={activeBandIndex === 0} onclick={() => selectBand(activeBandIndex - 1)} aria-label="Previous Front band">‹</button>
				<div class="band-tabs" role="tablist" aria-label="Front bands">
					{#each frontBandPanels as group, index}
						<button
							id={'front-band-tab-' + index}
							class="band-tab"
							class:on={activeBandIndex === index}
							style="--band:{group.def.color};--accent:{group.def.accent}"
							role="tab"
							aria-selected={activeBandIndex === index}
							tabindex={activeBandIndex === index ? 0 : -1}
							onclick={() => selectBand(index)}
							onkeydown={(e) => onBandTabKeydown(e, index)}
						>
							{group.def.label}
						</button>
					{/each}
				</div>
				<button class="band-arrow" disabled={activeBandIndex === frontBandPanels.length - 1} onclick={() => selectBand(activeBandIndex + 1)} aria-label="Next Front band">›</button>
			</div>

			{#if !$swipeHintDismissed && frontBandPanels.length > 1}
				<p class="swipe-hint" aria-hidden="true">‹ Swipe to change Front band ›</p>
			{/if}

			<div class="band-rail" bind:this={bandRail} onscroll={handleBandScroll} role="region" aria-label="Scrollable Front band panels">
				{#each frontBandPanels as group}
					{@const unlockedCount = group.fronts.filter(m => isUnlocked(m.id)).length}
					{@const bandBest = Math.max(0, ...group.fronts.map(m => frontBestWave[m.id] ?? 0))}
					<section class="band-panel" style="--band:{group.def.color};--accent:{group.def.accent}" aria-label="{group.def.label} Front band">
						<div class="band-hero">
							<div class="band-emblem" aria-hidden="true">
								<FrontIcon front={group.fronts[0]!.id} size={52} locked={unlockedCount === 0} />
							</div>
							<div class="band-copy">
								<div class="band-kicker">Front Band</div>
								<h3>{group.def.label}</h3>
								<p>{group.description}</p>
								<div class="band-status">
									<span>{unlockedCount}/4 Fronts available</span>
									{#if bandBest > 0}<span>Best Wave {bandBest}</span>{/if}
								</div>
							</div>
						</div>
						<div class="front-grid">
							{#each group.fronts as m}
								{@const unlocked = isUnlocked(m.id)}
								{@const schem = getSchematics(schematicsByFront, m.front)}
								<button
									class="front-opt"
									class:on={selectedFront === m.id && !selectedChallenge}
									class:locked={!unlocked}
									disabled={!unlocked}
									aria-pressed={selectedFront === m.id && !selectedChallenge}
									onclick={() => selectFront(m.id)}
									use:tooltip={unlocked
										? `${m.displayName}\n×${getFrontAlloyMultiplier(m.front).toFixed(1)} Alloy reward${getSchematics(schematicsByFront, m.front) > 0 ? `\n${getSchematics(schematicsByFront, m.front)} Schematics recovered` : ''}`
										: `🔒 ${m.displayName}\nLocked — ${describeFrontUnlock(m.id)}`}
								>
									<FrontIcon front={m.id} size={28} locked={!unlocked} />
									<div class="front-body">
										<span class="front-n">{m.displayName}</span>
										{#if unlocked}
											<span class="front-meta">x{getFrontAlloyMultiplier(m.front).toFixed(1)} Alloy{#if schem > 0} · {schem} Schematics{/if}</span>
										{:else}
											<span class="front-meta front-lock">{getFrontSelectorStatus(m, unlockedFronts, frontBestWave)}</span>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</div>

		{#if CHALLENGES.some(c => isChallengeUnlocked(c.id, frontBestWave))}
			<div class="ops-sel" style="--band:rgb(255,200,0);--accent:rgb(255,200,0)">
				<div class="front-sel-h"><span>Special Ops</span></div>
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
							use:tooltip={unlocked ? `${c.name}\n${c.description}` : `🔒 ${c.name}\nLocked — ${req.label}`}
						>
							<span class="ops-icon">{c.icon}</span>
							<span class="front-n">{c.name}</span>
							{#if unlocked}
								<span class="front-meta ops-hs">{hs > 0 ? 'Best: W' + hs : 'No record'}</span>
							{:else}
								<span class="front-meta front-lock">{req.label}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<button class="sc-btn" class:sc-btn-ops={!!selectedChallenge} disabled={!saveLoaded} onclick={onDeploy}>
			<span class="sc-bi"></span>
			<span class="sc-bt"><Icon name="play" size={16} /> {saveLoaded ? deployLabel : 'Loading save...'}</span>
		</button>
		<p class="sc-hint">{saveLoaded ? 'Enter start · Space pause · 1-4 speed' : 'Loading local save...'}</p>
	</div>
</div>

<style>
	.start-ol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at center,rgba(7,8,18,.5) 0%,var(--bg-primary) 100%); z-index:10; overflow:hidden; padding:1rem; }
	.start-card { position:relative; text-align:center; padding:1.25rem 1.2rem 1rem; background:var(--bg-glass-strong); border:1px solid var(--border-neon); border-radius:var(--radius-xl); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); max-width:min(880px,96vw); width:100%; max-height:min(94vh,780px); overflow-y:auto; animation:si .35s ease; box-shadow:0 0 60px rgba(0,255,255,.06); }
	.sc-accent { position:absolute; top:-1px; left:20%; right:20%; height:1px; background:linear-gradient(90deg,transparent,var(--cyan),transparent); opacity:.6; }
	.sc-icon { font-size:var(--fs-icon-2xl); display:block; margin-bottom:.3rem; filter:drop-shadow(0 0 20px rgba(0,255,255,.3)); }
	.sc-logo { width:100%; max-width:220px; height:auto; }
	.sc-title { font-size:var(--fs-icon-lg); margin-bottom:.2rem; }
	.sc-sub { font-size:var(--fs-body-sm); color:var(--text-secondary); margin:0 auto .85rem; max-width:42rem; }
	.sc-first-run { color:var(--cyan-dim); font-family:var(--font-mono); font-size:var(--fs-caption); line-height:1.35; margin:-.35rem auto .85rem; }
	.sc-rec { display:flex; flex-direction:row; flex-wrap:wrap; justify-content:center; gap:.35rem; margin-bottom:.85rem; padding:.5rem; background:rgba(0,0,0,.2); border-radius:var(--radius-md); }
	.sc-r { font-size:var(--fs-body-sm); font-family:var(--font-mono); color:var(--text-secondary); display:flex; gap:.3rem; align-items:center; }

	.front-sel, .ops-sel { margin-bottom:1rem; width:100%; }
	.front-sel-h { display:flex; align-items:center; justify-content:space-between; gap:.5rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.06em; text-transform:uppercase; color:var(--text-dim); margin-bottom:.45rem; }
	.front-sel-h span:first-child { display:inline-flex; align-items:center; gap:.3rem; }
	.front-band-count { color:var(--cyan); }
	.front-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(12rem,1fr)); gap:.35rem; }

	.band-nav { display:grid; grid-template-columns:2.5rem minmax(0,1fr) 2.5rem; gap:.45rem; align-items:center; margin-bottom:.55rem; }
	.band-arrow { min-width:40px; min-height:40px; border:1px solid var(--border-neon); border-radius:var(--radius-sm); color:var(--cyan); background:rgba(0,255,255,.05); font-size:1.4rem; line-height:1; cursor:pointer; transition:all var(--transition-fast); }
	.band-arrow:hover:not(:disabled) { border-color:var(--cyan); background:rgba(0,255,255,.1); }
	.band-arrow:disabled { opacity:.35; cursor:default; }
	.band-tabs { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.25rem; min-width:0; }
	.band-tab { min-height:40px; padding:.35rem .45rem; border-radius:var(--radius-sm); border:1px solid color-mix(in srgb, var(--band) 30%, transparent); color:var(--text-secondary); background:rgba(255,255,255,.02); font-family:var(--font-mono); font-size:var(--fs-caption-sm); cursor:pointer; transition:all var(--transition-fast); }
	.band-tab.on { color:var(--band); background:color-mix(in srgb, var(--band) 11%, transparent); border-color:var(--band); box-shadow:0 0 12px color-mix(in srgb, var(--band) 22%, transparent); }

	.swipe-hint { display:none; text-align:center; margin:0 0 .5rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); color:var(--cyan-dim); letter-spacing:.04em; animation:swipePulse 2.4s ease-in-out infinite; }
	@media (prefers-reduced-motion: reduce) { .swipe-hint { animation:none; } }
	@keyframes swipePulse { 0%,100%{opacity:.45} 50%{opacity:.85} }
	.band-rail { display:flex; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; scroll-behavior:smooth; gap:.75rem; border-radius:var(--radius-md); scrollbar-width:thin; scrollbar-color:rgba(0,255,255,.35) transparent; }
	.band-panel { scroll-snap-align:center; flex:0 0 100%; min-width:0; padding:.85rem; border:1px solid color-mix(in srgb, var(--band) 32%, transparent); border-radius:var(--radius-md); background:linear-gradient(135deg,color-mix(in srgb,var(--band) 9%, transparent),rgba(255,255,255,.015)); text-align:left; }
	.band-hero { display:grid; grid-template-columns:auto minmax(0,1fr); gap:.75rem; align-items:center; margin-bottom:.75rem; }
	.band-emblem { width:72px; height:72px; display:grid; place-items:center; border-radius:8px; border:1px solid color-mix(in srgb,var(--band) 30%, transparent); background:radial-gradient(circle,color-mix(in srgb,var(--band) 16%, transparent),rgba(0,0,0,.14)); box-shadow:inset 0 0 20px rgba(0,0,0,.22); }
	.band-copy { min-width:0; }
	.band-kicker { color:var(--band); font-family:var(--font-mono); font-size:var(--fs-caption-sm); letter-spacing:.08em; text-transform:uppercase; margin-bottom:.1rem; }
	.band-copy h3 { color:var(--text-primary); font-size:var(--fs-subheading); margin:0 .35rem .15rem 0; font-family:var(--font-display); }
	.band-copy p { color:var(--text-secondary); font-size:var(--fs-body-sm); line-height:1.42; margin:0; }
	.band-status { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.45rem; }
	.band-status span { color:var(--text-secondary); font-family:var(--font-mono); font-size:var(--fs-caption-sm); padding:.12rem .4rem; border-radius:3px; background:rgba(0,0,0,.18); }
	.front-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.45rem; }

	.front-opt { display:flex; flex-direction:column; align-items:center; gap:.35rem; width:100%; min-height:7rem; padding:.55rem .45rem; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid color-mix(in srgb, var(--band) 35%, transparent); transition:all var(--transition-fast); cursor:pointer; text-align:center; }
	.front-opt:hover:not(:disabled) { border-color:var(--band); background:color-mix(in srgb, var(--band) 8%, transparent); }
	.front-opt.on { border-color:var(--band); background:color-mix(in srgb, var(--band) 16%, transparent); box-shadow:0 0 12px color-mix(in srgb, var(--band) 30%, transparent); }
	.front-opt.locked { opacity:.55; cursor:not-allowed; border-color:var(--border-neon); }
	.front-opt:focus-visible, .band-arrow:focus-visible, .band-tab:focus-visible, .sc-btn:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
	.front-body { display:flex; flex-direction:column; gap:.15rem; min-width:0; width:100%; }
	.front-n { font-family:var(--font-display); font-weight:700; font-size:var(--fs-body-sm); color:var(--text-primary); line-height:1.15; }
	.front-meta { font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
	.front-lock { color:var(--text-secondary); }
	.front-opt.on .front-n { color:var(--band); }

	.ops-opt { border-color:rgba(255,200,0,.25); min-height:5.5rem; }
	.ops-opt:hover:not(:disabled) { border-color:rgba(255,200,0,.6); background:rgba(255,200,0,.06); }
	.ops-opt.on { border-color:rgba(255,200,0,.8); background:rgba(255,200,0,.1); box-shadow:0 0 12px rgba(255,200,0,.18); }
	.ops-opt.on .front-n { color:rgb(255,220,60); }
	.ops-icon { font-size:1.1em; flex-shrink:0; }
	.ops-hs { color:var(--text-secondary); }

	.sc-btn { position:relative; display:inline-flex; align-items:center; gap:.4rem; padding:.7rem 2rem; border-radius:var(--radius-md); background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); font-weight:700; font-size:var(--fs-btn); cursor:pointer; overflow:hidden; transition:all var(--transition-normal); box-shadow:0 0 30px rgba(0,255,255,.2); width:100%; justify-content:center; }
	.sc-btn:disabled { opacity:.65; cursor:wait; box-shadow:none; }
	.sc-btn:hover { transform:translateY(-2px); box-shadow:0 0 50px rgba(0,255,255,.35); }
	.sc-btn-ops { background:linear-gradient(135deg,rgb(220,170,0),rgb(200,120,0)); box-shadow:0 0 30px rgba(255,200,0,.2); }
	.sc-btn-ops:hover { box-shadow:0 0 50px rgba(255,200,0,.35); }
	.sc-bi { position:absolute; inset:0; background:linear-gradient(135deg,transparent,rgba(255,255,255,.12),transparent); transition:opacity var(--transition-normal); opacity:0; }
	.sc-btn:hover .sc-bi { opacity:1; }
	.sc-bt { position:relative; z-index:1; display:inline-flex; align-items:center; gap:.35rem; }
	.sc-hint { margin-top:.5rem; font-size:var(--fs-caption-sm); color:var(--text-secondary); }
	.sc-hint kbd { padding:.08rem .3rem; background:var(--bg-tertiary); border-radius:3px; font-family:var(--font-mono); font-size:var(--fs-caption-sm); border:1px solid var(--border-neon); }
	@media (max-width:720px) {
		.start-ol { padding:.5rem; align-items:flex-start; }
		.start-card { max-height:calc(100vh - 1rem); padding:1rem .75rem .85rem; }
		.sc-logo { max-width:170px; }
		.band-tabs { display:none; }
		.swipe-hint { display:block; }
		.band-panel { padding:.65rem; }
		.band-hero { grid-template-columns:1fr; text-align:center; justify-items:center; gap:.45rem; }
		.band-emblem { width:58px; height:58px; }
		.front-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
		.front-opt { min-height:6.4rem; }
		.front-list { grid-template-columns:1fr; }
	}
	@keyframes si { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
</style>
