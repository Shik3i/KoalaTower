<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { buildWorkshopUpgradeList, getWorkshopUpgradeCost, getWorkshopUpgradeEffect } from '$lib/game/balance/workshopUpgrades';
	const WORKSHOP_UPGRADES = buildWorkshopUpgradeList();
	import { LAB_DEFS, getLabCost, getLabEffect, isLabUnlocked, getLabDuration, formatLabDuration } from '$lib/game/balance/labs';
	import { TIERS } from '$lib/game/balance/tiers';
	import { CHALLENGES } from '$lib/game/balance/challenges';
	import { formatCompact } from '$lib/game/balance/balanceMath';
	import { BLUEPRINT_DEFS, isBlueprintUnlockable, isFoundryUpgradeUnlocked, getBlueprintForFoundryUpgrade } from '$lib/game/balance/blueprints';
	import type { GameSettings, WorkshopUpgradeId, BlueprintId } from '$lib/game/engine/gameTypes';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';

	let coins = $state(0);
	let settings = $state<GameSettings>({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let activeSection = $state<'workshop' | 'lab' | 'blueprints' | 'tiers' | 'challenges' | 'stats' | 'settings'>('workshop');

	let ownedBlueprints = $state<BlueprintId[]>([]);
	let activeLabId = $state<string | null>(null);
	let activeLabFinish = $state<number>(0);
	let activeLabTarget = $state<number>(0);
	let labProgressPct = $state(0);
	let labProgressTimer: ReturnType<typeof setInterval> | null = null;

	function refreshLabProgress() {
		const save = getCachedSave(); if (!save) return;
		if (save.activeLab) {
			activeLabId = save.activeLab.labId;
			activeLabTarget = save.activeLab.targetLevel;
			activeLabFinish = save.activeLab.finishesAt;
			const now = Date.now();
			const total = save.activeLab.finishesAt - save.activeLab.startedAt;
			const elapsed = now - save.activeLab.startedAt;
			labProgressPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
		} else {
			activeLabId = null;
			activeLabTarget = 0;
			activeLabFinish = 0;
			labProgressPct = 0;
		}
	}

	function isBlueprintOwned(id: BlueprintId): boolean { return ownedBlueprints.includes(id); }
	function buyBlueprint(id: BlueprintId) {
		const save = getCachedSave(); if (!save) return;
		const bp = BLUEPRINT_DEFS.find(b => b.id === id); if (!bp) return;
		if (ownedBlueprints.includes(id)) { toast('✅ Already unlocked!', 'info'); return; }
		if (save.totalCoins < bp.cost) { toast('🔩 Need ' + bp.cost.toLocaleString() + ' Alloy!', 'error'); return; }
		save.totalCoins -= bp.cost;
		save.unlockedBlueprints = [...(save.unlockedBlueprints ?? []), id];
		ownedBlueprints = [...ownedBlueprints, id];
		coinsStore.set(save.totalCoins);
		persistSave(save);
		toast('📐 ' + bp.name + ' unlocked!', 'success');
	}

	let showImportDialog = $state(false);
	let showResetConfirm = $state(false);
	let importText = $state('');
	let toasts: { id: number; msg: string; type: string }[] = $state([]);
	let nextToast = 0;
	function toast(msg: string, type: string = 'info') {
		const id = ++nextToast;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 2500);
	}

	onMount(() => {
		const u1 = coinsStore.subscribe(c => coins = c);
		const u2 = settingsStore.subscribe(s => { settings = s; });
		const u3 = highestWaveStore.subscribe(w => highestWave = w);
		const u4 = totalRunsStore.subscribe(r => totalRuns = r);
		const save = getCachedSave();
		if (save?.unlockedBlueprints) ownedBlueprints = [...save.unlockedBlueprints];
		refreshLabProgress();
		labProgressTimer = setInterval(refreshLabProgress, 1000);
		return () => { u1(); u2(); u3(); u4(); if (labProgressTimer) clearInterval(labProgressTimer); };
	});

	function wLv(id: WorkshopUpgradeId): number { return getCachedSave()?.workshopUpgrades[id] ?? 0; }
	function buyWorkshopUpgrade(id: WorkshopUpgradeId) {
		const save = getCachedSave(); if (!save) return;
		const lv = save.workshopUpgrades[id] ?? 0;
		const cost = getWorkshopUpgradeCost(id, lv);
		const upgrade = WORKSHOP_UPGRADES.find(u => u.id === id);
		const maxLv = upgrade?.maxLevel ?? 100;
		if (save.totalCoins >= cost && lv < maxLv) {
			save.totalCoins -= cost;
			save.workshopUpgrades[id] = lv + 1;
			coinsStore.set(save.totalCoins);
			persistSave(save);
			toast('🔧 Upgraded!', 'success');
		} else { toast('🔩 Not enough Alloy!', 'error'); }
	}

	// Time-based lab research
	function startLabResearch(id: string) {
		const save = getCachedSave(); if (!save) return;
		const def = LAB_DEFS.find(l => l.id === id); if (!def) return;
		const lv = (save.labLevels as Record<string, number>)[id] ?? 0;
		if (lv >= def.maxLevel) { toast('⚠ Max level!', 'warning'); return; }
		if (save.activeLab) { toast('⚠ A research project is already active!', 'warning'); return; }
		const cost = getLabCost(id as any, lv);
		const duration = getLabDuration(id as any, lv);
		if (save.totalCoins < cost) { toast('🔩 Need ' + formatCompact(cost) + ' Alloy!', 'error'); return; }
		save.totalCoins -= cost;
		const now = Date.now();
		save.activeLab = {
			labId: id as any,
			targetLevel: lv + 1,
			startedAt: now,
			finishesAt: now + duration,
		};
		coinsStore.set(save.totalCoins);
		persistSave(save);
		refreshLabProgress();
		toast('🔬 Started ' + def.name + ' Lv.' + (lv + 1) + ' — ' + formatLabDuration(duration), 'success');
	}

	function lLv(id: string): number { return (getCachedSave()?.labLevels as Record<string, number>)[id] ?? 0; }

	const settingsList = [
		{ key: 'reducedMotion' as keyof GameSettings, label: 'Reduced Motion', desc: 'Minimize animations' },
		{ key: 'screenShake' as keyof GameSettings, label: 'Screen Shake', desc: 'Shake on damage' },
		{ key: 'particles' as keyof GameSettings, label: 'Particles', desc: 'Death & hit effects' },
		{ key: 'damageNumbers' as keyof GameSettings, label: 'Damage Numbers', desc: 'Show floating numbers' },
		{ key: 'lowEffectsMode' as keyof GameSettings, label: 'Low Effects Mode', desc: 'Reduce visual effects' },
	];

	const sections = [
		{ id: 'workshop' as const, label: 'Forge', icon: '⚙' },
		{ id: 'lab' as const, label: 'Research Deck', icon: '🔬' },
		{ id: 'blueprints' as const, label: 'Blueprints', icon: '📐' },
		{ id: 'tiers' as const, label: 'Fronts', icon: '🌍' },
		{ id: 'challenges' as const, label: 'Simulations', icon: '⚡' },
		{ id: 'stats' as const, label: 'Archives', icon: '📊' },
		{ id: 'settings' as const, label: 'Systems', icon: '⚙' },
	];
</script>

<svelte:head>
	<title>Orbital Command — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD Orbital Command — Foundry upgrades, Research Deck projects, Fronts, Simulations, Archives, and Systems." />
</svelte:head>

<main class="hub-page">
	<div class="bg-grid"></div>

	{#if toasts.length}
		<div class="toast-c" aria-live="polite" role="alert">{#each toasts as t}<div class="toast toast-{t.type}">{t.msg}</div>{/each}</div>
	{/if}

	<header class="hub-top">
		<a href="/" class="hub-back">← Home</a>
		<h1 class="hub-title">🛰️ Orbital Command</h1>
		<div class="hub-coins">🔩 {coins.toLocaleString()}</div>
	</header>
	<p class="hub-desc">🛰️ Orbital Command — your permanent base between deployments. The Forge pre-installs permanent tower upgrades, the Research Deck runs orbital projects, and Blueprints unlock new capabilities. Archives track campaign telemetry.</p>

	<div class="hub-body">
		<nav class="hub-nav">
			{#each sections as s}
				<button class="hub-nav-btn" class:on={activeSection === s.id} onclick={() => activeSection = s.id}>
					{s.icon} {s.label}
				</button>
			{/each}
		</nav>

		<div class="hub-content">
			{#if activeSection === 'workshop'}
				<div class="hs"><h2 class="hst">⚙ Forge</h2><p class="hsd">Permanent pre-installed tower upgrades. Each level improves the tower blueprint before every deployment. Locked paths require Blueprint unlocks.</p>
					<div class="ug">
						{#each WORKSHOP_UPGRADES as u}
							{@const lv = wLv(u.id)}
							{@const nl = Math.min(lv + 1, u.maxLevel)}
							{@const cost = u.cost(lv)}
							{@const aff = coins >= cost}
							{@const mx = lv >= u.maxLevel}
							{@const locked = u.requiredBlueprint && !isFoundryUpgradeUnlocked(u.id, ownedBlueprints)}
							{@const bpName = u.requiredBlueprint ? (getBlueprintForFoundryUpgrade(u.id)?.name ?? '') : ''}
							<button class="uc" class:aff={aff && !mx && !locked} class:mx={mx} class:locked={locked} disabled={!aff || mx || locked} onclick={() => buyWorkshopUpgrade(u.id)}>
								<div class="uc-t"><span class="uci">{locked ? '🔒' : u.icon}</span><span class="ucn">{u.name}</span><span class="ucl">{locked ? 'LOCKED' : 'Lv.' + lv}</span></div>
								{#if !locked}
									<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / u.maxLevel) * 100)}%"></div></div>
									<div class="uc-b"><span class="ucc">🔩{cost.toLocaleString()}</span><span class="ucnx">{mx ? 'MAXED' : lv > 0 ? '→ +' + getWorkshopUpgradeEffect(u.id, nl) : 'Lv.1 +' + getWorkshopUpgradeEffect(u.id, 1)}</span></div>
								{:else}
									<div class="uc-b"><span class="ucc" style="color:var(--text-dim)">🔒 Requires {bpName}</span></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{:else if activeSection === 'lab'}
				<div class="hs"><h2 class="hst">🔬 Research Deck</h2><p class="hsd">Time-based orbital research projects. Each level grants a permanent multiplicative bonus. Research continues offline. Only one project can be active at a time.</p>
					<div class="ug">
						{#each LAB_DEFS as lab}
							{@const unlocked = isLabUnlocked(lab, highestWave)}
							{@const lv = lLv(lab.id)}
							{@const cost = getLabCost(lab.id, lv)}
							{@const duration = getLabDuration(lab.id, lv)}
							{@const aff = coins >= cost}
							{@const mx = lv >= lab.maxLevel}
							{@const isResearching = activeLabId === lab.id}
							{@const currMult = 1 + getLabEffect(lab.id, lv)}
							{@const hasActive = !!getCachedSave()?.activeLab}
							{@const lockedDisplay = '🔒 Reach Wave ' + lab.unlockWave}
							<div class="uc lc" class:locked={!unlocked} class:researching={isResearching} class:mx={mx && unlocked}>
								<div class="uc-t"><span class="uci">{unlocked ? lab.icon : '🔒'}</span><span class="ucn">{lab.name}</span><span class="ucl">{unlocked ? 'Lv.' + lv : lockedDisplay}</span></div>
								{#if unlocked}
									<div class="uc-btr"><div class="uc-btf" style="width:{Math.min(100, (lv / lab.maxLevel) * 100)}%"></div></div>
									<div class="uc-eff">×{currMult.toFixed(2)} multiplier</div>
									{#if isResearching}
										<div class="rs-bar-track"><div class="rs-bar-fill" style="width:{labProgressPct}%"></div></div>
										<div class="rs-info">Researching Lv.{activeLabTarget} — {labProgressPct.toFixed(0)}%</div>
									{:else if mx}
										<div class="rs-info">MAXED</div>
									{:else}
										<button class="uc-b rs-btn" class:aff={aff && !hasActive} disabled={!aff || hasActive} onclick={() => startLabResearch(lab.id)}>
											<span class="ucc">🔩{formatCompact(cost)}</span>
											<span class="ucnx">{hasActive ? 'BUSY' : '→ ' + formatLabDuration(duration)}</span>
										</button>
									{/if}
								{:else}
									<div class="uc-b"><span class="ucc" style="color:var(--text-dim)">🔒 Requires Wave {lab.unlockWave}</span></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{:else if activeSection === 'blueprints'}
				<div class="hs"><h2 class="hst">📐 Blueprints</h2><p class="hsd">Permanently unlock new upgrade paths for Field Upgrades and the Foundry. Blueprints are discovered by reaching wave milestones and purchased with Alloy.</p>
					<div class="cl">{#each BLUEPRINT_DEFS as bp}{@const owned = isBlueprintOwned(bp.id)}{@const unlocked = isBlueprintUnlockable(bp, highestWave, 0)}{@const aff = coins >= bp.cost && unlocked && !owned}<div class="cc" class:lck={!unlocked && !owned}><div class="cc-h"><span class="cci">{owned ? '✅' : unlocked ? bp.icon : '🔒'}</span><div><div class="ccn">{bp.name}</div><div class="ccd">{bp.description}</div></div></div>{#if owned}<div class="ccs">✓ Installed — unlocks {bp.unlocksFieldUpgrades.length} field + {bp.unlocksFoundryUpgrades.length} foundry upgrades</div>{:else if !unlocked}<div class="ccl">🔒 {bp.unlockCondition}</div>{:else}<div class="uc-b" style="margin-top:.3rem"><button class="hub-action" disabled={!aff} onclick={() => buyBlueprint(bp.id)} style={aff ? 'background:linear-gradient(135deg,var(--cyan),var(--blue));color:var(--bg-primary);font-weight:600' : ''}><span class="ucc">🔩{bp.cost.toLocaleString()}</span> Unlock</button></div>{/if}</div>{/each}</div>
				</div>
			{:else if activeSection === 'tiers'}
				<div class="hs"><h2 class="hst">🌍 Fronts</h2><p class="hsd">Each front is a planet with increasing enemy density. Reach wave milestones to unlock harder fronts with better rewards.</p>
					<div class="cl">{#each TIERS as t}<div class="tc" class:unl={t.unlocked}><div class="tc-h"><span class="tci">{t.unlocked ? '🔓' : '🔒'}</span><div><div class="tcn">{t.name}</div><div class="tcd">{t.description}</div></div></div><div class="tcr" class:tcr-ok={t.unlocked}>{t.unlocked ? '✓ Unlocked' : 'Reach Wave ' + t.waveRequirement}</div></div>{/each}</div>
				</div>
			{:else if activeSection === 'challenges'}
				<div class="hs"><h2 class="hst">⚡ Simulations</h2><p class="hsd">Tactical simulation exercises with modified engagement rules. Each simulation tests different combat scenarios.</p>
					<div class="cl">{#each CHALLENGES as c}<div class="cc" class:lck={c.locked}><div class="cc-h"><span class="cci">{c.icon}</span><div><div class="ccn">{c.name}</div><div class="ccd">{c.description}</div></div></div>{#if c.highScore > 0}<div class="ccs">Best: Wave {c.highScore}</div>{:else if c.locked}<div class="ccl">🔒 Locked</div>{/if}</div>{/each}</div>
				</div>
			{:else if activeSection === 'stats'}
				<div class="hs"><h2 class="hst">📊 Archives</h2>
					<div class="ig"><div class="ir"><span class="il">Total Runs</span><span class="iv">{totalRuns}</span></div><div class="ir"><span class="il">Highest Wave</span><span class="iv">{highestWave}</span></div><div class="ir"><span class="il">Alloy Reserves</span><span class="iv">🔩 {coins.toLocaleString()}</span></div><div class="ir"><span class="il">Highscore</span><span class="iv">🏆 Wave {highestWave}</span></div></div>
				</div>
			{:else if activeSection === 'settings'}
				<div class="hs"><h2 class="hst">⚙ Systems</h2>
					<div class="sg">
						{#each settingsList as s}
							<div class="sr" role="group" aria-label={s.label}><div class="si"><span class="sl">{s.label}</span><span class="sd">{s.desc}</span></div>
								<div class="tg" class:on={settings[s.key]} role="switch" aria-checked={settings[s.key]} tabindex="0" onclick={() => { const save = getCachedSave(); if (!save) return; save.settings[s.key] = !settings[s.key]; settingsStore.set({...save.settings}); persistSave(save); }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const save = getCachedSave(); if (!save) return; save.settings[s.key] = !settings[s.key]; settingsStore.set({...save.settings}); persistSave(save); } }}>
									<div class="tgk"></div>
								</div>
							</div>
						{/each}
					</div>
					<div class="hsd" style="margin-top:1rem;">
						<button class="hub-action" onclick={async () => { const s = await exportSave(); navigator.clipboard?.writeText(s); toast(getOpLogMessage('saveExported'), 'success'); }}>📋 Export Save</button>
						<button class="hub-action" onclick={() => showImportDialog = true}>📂 Import Save</button>
						<button class="hub-action hub-danger" onclick={() => showResetConfirm = true}>🗑 Reset Save</button>
					</div>
					<div class="save-note">
						<p class="save-note-flavor">Orbital Command cannot stop you from rewriting reality. It can only confirm that doing so makes the war considerably less interesting.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Import Dialog -->
	{#if showImportDialog}
		<div class="overlay" role="dialog"><div class="dlg"><h3>📂 Import Save</h3><p class="dlg-d">Paste your save JSON.</p><textarea bind:value={importText} rows={5}></textarea><div class="dlg-a"><button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); } else { toast(getOpLogMessage('saveImportFailed'), 'error'); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button><button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button></div></div></div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="dialog"><div class="dlg dlg-dng"><h3>🗑 Reset Save?</h3><p class="dlg-d">This will erase all Alloy, Forge upgrades, Blueprints, Research Deck progress, Front progress, and settings. Cannot be undone.</p><div class="dlg-a"><button class="dlg-dng-btn" onclick={async () => { await resetSave(); showResetConfirm = false; coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0); settingsStore.set({ reducedMotion: false, screenShake: true, particles: true, damageNumbers: true, lowEffectsMode: false }); toast(getOpLogMessage('saveReset'), 'warning'); }}>Reset</button><button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button></div></div></div>
	{/if}

	<footer class="hub-footer">
		<span>🛰️ Orbital Command — Flatland TD · FLTD</span>
		<div class="hub-footer-links">
			<a href="/help">Help</a>
			<span>·</span>
			<a href="/privacy">Privacy</a>
			<span>·</span>
			<a href="/imprint">Imprint</a>
		</div>
	</footer>
</main>

<style>
	.hub-page { min-height:100vh; background:var(--bg-primary); overflow-y:auto; }
	.bg-grid { position:fixed; inset:0; background-image:linear-gradient(rgba(0,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,.02) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
	.toast-c { position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:300; display:flex; flex-direction:column; gap:.3rem; pointer-events:none; }
	.toast { padding:.35rem .9rem; font-size:.7rem; border-radius:100px; white-space:nowrap; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:ti .2s ease; box-shadow:0 0 20px rgba(0,0,0,.3); }
	.toast-info { background:rgba(0,255,255,.1); color:var(--cyan); border:1px solid rgba(0,255,255,.25); }
	.toast-success { background:rgba(68,255,136,.1); color:var(--green); border:1px solid rgba(68,255,136,.25); }
	.toast-warning { background:rgba(255,68,68,.1); color:var(--red); border:1px solid rgba(255,68,68,.25); }
	.toast-error { background:rgba(255,68,68,.12); color:#FF6666; border:1px solid rgba(255,68,68,.3); }
	.toast-milestone { background:rgba(255,221,68,.1); color:var(--yellow); border:1px solid rgba(255,221,68,.25); }
	@keyframes ti { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
	.hub-top { display:flex; align-items:center; gap:.75rem; padding:.75rem 1.5rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); position:sticky; top:0; z-index:10; }
	.hub-back { color:var(--text-dim); font-size:.85rem; text-decoration:none; padding:.2rem .5rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-back:hover { color:var(--cyan); border-color:var(--cyan); }
	.hub-title { font-size:1.2rem; font-weight:700; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
	.hub-coins { margin-left:auto; font-family:var(--font-mono); font-size:.85rem; color:var(--yellow); }
	.hub-body { display:flex; gap:1.25rem; padding:1.5rem; max-width:1000px; margin:0 auto; position:relative; z-index:1; min-height:calc(100vh - 64px); }
	.hub-nav { display:flex; flex-direction:column; gap:.25rem; min-width:140px; flex-shrink:0; }
	.hub-nav-btn { padding:.5rem .75rem; font-size:.8rem; color:var(--text-dim); text-align:left; border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-nav-btn.on { color:var(--cyan); background:rgba(0,255,255,.06); }
	.hub-nav-btn:hover:not(.on) { color:var(--text-secondary); background:rgba(255,255,255,.03); }
	.hub-content { flex:1; }
	.hs { animation:fi .2s ease; }
	.hst { font-size:1.1rem; color:var(--cyan); margin-bottom:.25rem; }
	.hsd { color:var(--text-dim); font-size:.78rem; margin-bottom:1rem; line-height:1.5; }
	.hub-action { padding:.45rem 1rem; font-size:.78rem; border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-danger:hover { border-color:var(--red); color:var(--red); }

	/* Re-use play page styles */
	.ug { display:flex; flex-direction:column; gap:3px; max-width:500px; }
	.uc { display:flex; flex-direction:column; gap:.12rem; padding:.4rem .5rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.uc.mx { opacity:.35; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.5; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.25rem; }
	.uci { font-size:.8rem; flex-shrink:0; }
	.ucn { flex:1; font-size:.7rem; font-weight:500; color:var(--text-secondary); }
	.ucl { font-size:.6rem; font-family:var(--font-mono); color:var(--text-dim); }
	.uc-btr { height:3px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-b { display:flex; align-items:center; gap:.3rem; font-size:.62rem; }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-dim); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	.lc { gap:.2rem; }
	.ld { font-size:.58rem; color:var(--text-dim); line-height:1.3; }
	.uc.researching { border-color:rgba(255,221,68,.3); background:rgba(255,221,68,.03); }
	.rs-bar-track { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.rs-bar-fill { height:100%; background:linear-gradient(90deg,var(--yellow),var(--orange)); border-radius:2px; transition:width .5s linear; }
	.rs-info { font-size:.55rem; color:var(--yellow); font-family:var(--font-mono); text-align:center; }
	.rs-btn { display:block; width:100%; margin-top:.2rem; padding:.3rem; font-size:.65rem; border-radius:var(--radius-sm); font-weight:600; cursor:pointer; transition:all var(--transition-fast); text-align:center; }
	.rs-btn.aff { background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); }
	.rs-btn:disabled { opacity:.5; background:var(--bg-tertiary); color:var(--text-dim); cursor:default; }
	.cl { display:flex; flex-direction:column; gap:.4rem; max-width:500px; }
	.tc,.cc { padding:.55rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.tc.unl { border-color:rgba(68,255,136,.12); } .cc.lck { opacity:.5; }
	.tc-h,.cc-h { display:flex; gap:.4rem; align-items:flex-start; }
	.tci,.cci { font-size:.95rem; flex-shrink:0; margin-top:1px; }
	.tcn,.ccn { font-size:.72rem; color:var(--text-secondary); font-weight:500; margin-bottom:.05rem; }
	.tcd,.ccd { font-size:.62rem; color:var(--text-dim); line-height:1.35; }
	.tcr,.ccs,.ccl { font-size:.58rem; color:var(--text-dim); font-family:var(--font-mono); margin-top:.2rem; padding:.12rem .3rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.tcr-ok { color:var(--green); } .ccs { color:var(--green); }
	.ig { display:grid; gap:2px; max-width:400px; }
	.ir { display:flex; justify-content:space-between; padding:.25rem .4rem; font-size:.78rem; border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-dim); } .iv { color:var(--text-secondary); font-family:var(--font-mono); font-weight:500; }
	.sg { display:flex; flex-direction:column; gap:1px; max-width:400px; }
	.sr { display:flex; justify-content:space-between; align-items:center; padding:.45rem .4rem; border-radius:var(--radius-sm); cursor:pointer; }
	.sr:hover { background:rgba(255,255,255,.02); }
	.si { display:flex; flex-direction:column; gap:.05rem; }
	.sl { font-size:.75rem; color:var(--text-secondary); } .sd { font-size:.6rem; color:var(--text-dim); }
	.tg { width:34px; height:20px; border-radius:10px; background:var(--bg-tertiary); border:1px solid var(--border-neon); position:relative; transition:all var(--transition-fast); flex-shrink:0; cursor:pointer; }
	.tg.on { background:rgba(0,255,255,.12); border-color:var(--cyan); }
	.tgk { position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:var(--text-dim); transition:all var(--transition-fast); }
	.tg.on .tgk { left:16px; background:var(--cyan); box-shadow:0 0 6px rgba(0,255,255,.4); }
	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.dlg { background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-xl); padding:1.5rem; max-width:360px; width:100%; }
	.dlg h3 { font-size:1rem; margin-bottom:.35rem; }
	.dlg-d { color:var(--text-dim); font-size:.72rem; margin-bottom:.75rem; }
	.dlg textarea { width:100%; margin-bottom:.75rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.45rem; font-family:var(--font-mono); font-size:.62rem; resize:vertical; }
	.dlg-a { display:flex; gap:.4rem; justify-content:center; }
	.dlg-p,.dlg-s,.dlg-dng-btn { padding:.45rem 1rem; border-radius:var(--radius-sm); font-weight:600; font-size:.75rem; cursor:pointer; transition:all var(--transition-fast); }
	.dlg-p { background:var(--cyan); color:var(--bg-primary); }
	.dlg-s { background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.dlg-dng-btn { background:var(--red); color:white; }
	.dlg-dng { border-color:rgba(255,68,68,.2); }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	.save-note { margin-top:1.25rem; padding:.5rem .8rem; background:rgba(255,221,68,.04); border:1px solid rgba(255,221,68,.12); border-radius:var(--radius-sm); max-width:500px; }
	.save-note-flavor { font-size:.58rem; color:rgba(255,221,68,.35); font-style:italic; line-height:1.3; margin:0; }
	@media(max-width:767px){ .hub-body{flex-direction:column;padding:1rem} .hub-nav{flex-direction:row;overflow-x:auto;min-width:0} .hub-nav-btn{flex-shrink:0;white-space:nowrap} }
	.hub-desc { padding:0 1.5rem 1rem; text-align:center; color:var(--text-dim); font-size:.78rem; line-height:1.6; max-width:600px; margin:0 auto; position:relative; z-index:1; }
	.hub-footer { text-align:center; padding:1.5rem; color:var(--text-dim); font-size:.7rem; display:flex; flex-direction:column; gap:.35rem; align-items:center; border-top:1px solid var(--border-neon); margin-top:2rem; }
	.hub-footer-links { display:flex; gap:.35rem; align-items:center; }
	.hub-footer-links a { color:var(--cyan-dim); text-decoration:underline; text-underline-offset:3px; text-decoration-color:rgba(0,255,255,.2); }
</style>
