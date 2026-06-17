<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Tutorial, { type TutorialStep } from '$lib/components/Tutorial.svelte';
	import { coinsStore, settingsStore, highestWaveStore, totalRunsStore } from '$lib/stores/gameUiStore';
	import { persistSave, getCachedSave, exportSave, importSave, resetSave } from '$lib/game/save/saveService';
	import { buildWorkshopUpgradeList, getWorkshopUpgradeCost, getWorkshopUpgradeEffect } from '$lib/game/balance/workshopUpgrades';
	const WORKSHOP_UPGRADES = buildWorkshopUpgradeList();
	import { LAB_DEFS, getLabCost, getLabEffect, isLabUnlocked, getLabDuration, formatLabDuration } from '$lib/game/balance/labs';
	import { TIERS, getUnlockedFronts, getPreviousFront, getFrontName, FRONT_UNLOCK_WAVE } from '$lib/game/balance/tiers';
	import { CHALLENGES } from '$lib/game/balance/challenges';
	import { formatCompact, front1EnemyDamage, front1EnemyHp, TIER_MULTIPLIERS } from '$lib/game/balance/balanceMath';
	import { EnemyType, DEFAULT_SETTINGS } from '$lib/game/engine/gameTypes';
	import { ENEMY_TYPE_MODIFIERS, computeEnemyConfig, ENEMY_SHAPES } from '$lib/game/balance/balanceMath';
	import { BLUEPRINT_DEFS, isFoundryUpgradeUnlocked, getBlueprintForFoundryUpgrade, getFieldUpgradesUnlockedBy, getFoundryUpgradesUnlockedBy, describeBlueprintDiscovery } from '$lib/game/balance/blueprints';
	import { getBlueprintStatus } from '$lib/game/progression/blueprintDiscovery';
	import type { GameSettings, WorkshopUpgradeId, BlueprintId } from '$lib/game/engine/gameTypes';
	import { getOpLogMessage } from '$lib/game/balance/operationLog';

	let coins = $state(0);
	let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });
	let highestWave = $state(0);
	let totalRuns = $state(0);
	let activeSection = $state<'workshop' | 'lab' | 'blueprints' | 'tiers' | 'challenges' | 'simulation' | 'stats' | 'settings'>('workshop');
	let buyMultiplier = $state<1 | 5 | 10 | 50 | 'max'>(1);

	const HUB_TUTORIAL_KEY = 'geocore-td-hub-tutorial-done';
	const hubTutorialSteps: TutorialStep[] = [
		{ title: '🛰️ Welcome to Orbital Command', desc: 'This is your permanent base between deployments. Here you spend Alloy (🔩) on permanent upgrades that persist across all runs. The Tower may fall — your research endures.', target: '', placement: 'center' },
		{ title: '⚙ Forge — Permanent Upgrades', desc: 'The Forge pre-installs tower upgrades BEFORE every deployment. Damage, Fire Rate, Range, HP — every level makes every future run stronger. Spend Alloy wisely. Procurement approves this spending. Mostly.', target: '.hub-nav-btn:nth-child(1)', placement: 'right' },
		{ title: '🔬 Research Deck — Time-Based Projects', desc: 'Research runs in real time — even offline! Each level gives a multiplicative bonus that stacks with Forge upgrades. Start a project, come back later. The scientists work while you sleep. Allegedly.', target: '.hub-nav-btn:nth-child(2)', placement: 'right' },
		{ title: '📐 Blueprints — Unlock New Paths', desc: 'New upgrade paths are discovered during deployments. Once a schematic is found, research it here with Alloy to unlock hidden Forge and Field upgrades. Some blueprints were definitely not lost by Procurement.', target: '.hub-nav-btn:nth-child(3)', placement: 'right' },
		{ title: '🌍 Fronts & Special Ops', desc: 'Fronts are difficulty tiers — push deeper to unlock harder planets with better rewards. Special Operations are challenge modes with modified rules. Simulation lets you preview enemy stats at any wave.', target: '.hub-nav-btn:nth-child(4)', placement: 'right' },
		{ title: '📊 Archives & Systems', desc: 'Archives track your campaign statistics. Systems lets you configure visuals, sound, and lab notifications. Everything is saved automatically to your browser. No cloud. No tracking. Not even the Shapes know your high score.', target: '.hub-nav-btn:nth-child(7)', placement: 'right' },
		{ title: '🚀 Ready to Deploy', desc: 'Upgrade your Forge, start some Research, then head to Deployment and drop a Tower. Orbital Command will be here when you return — with more Alloy and fewer questions.', target: '.hub-back', placement: 'bottom' },
	];

	let simWave = $state(1);
	let simFront = $state(1);

	let ownedBlueprints = $state<BlueprintId[]>([]);
	let discoveredBlueprints = $state<BlueprintId[]>([]);
	let frontBestWave = $state<Partial<Record<string, number>>>({});
	let unlockedFronts = $derived(getUnlockedFronts(frontBestWave));
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
	function isBlueprintDiscovered(id: BlueprintId): boolean { return discoveredBlueprints.includes(id); }
	function buyBlueprint(id: BlueprintId) {
		const save = getCachedSave(); if (!save) return;
		const bp = BLUEPRINT_DEFS.find(b => b.id === id); if (!bp) return;
		if (ownedBlueprints.includes(id)) { toast('Already researched.', 'info'); return; }
		if (!discoveredBlueprints.includes(id)) { toast('Not yet discovered — find it in the field first.', 'error'); return; }
		if (save.totalCoins < bp.cost) { toast('Need ' + bp.cost.toLocaleString() + ' Alloy!', 'error'); return; }
		save.totalCoins -= bp.cost;
		save.unlockedBlueprints = [...(save.unlockedBlueprints ?? []), id];
		ownedBlueprints = [...ownedBlueprints, id];
		coinsStore.set(save.totalCoins);
		persistSave(save);
		toast(bp.name + ' researched!', 'success');
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
		if (save?.discoveredBlueprints) discoveredBlueprints = [...save.discoveredBlueprints];
		if (save?.frontBestWave) frontBestWave = { ...save.frontBestWave };
		refreshLabProgress();
		labProgressTimer = setInterval(refreshLabProgress, 1000);
		return () => { u1(); u2(); u3(); u4(); if (labProgressTimer) clearInterval(labProgressTimer); };
	});

	function wLv(id: WorkshopUpgradeId): number { return getCachedSave()?.workshopUpgrades[id] ?? 0; }
	function buyWorkshopUpgrade(id: WorkshopUpgradeId) {
		const save = getCachedSave(); if (!save) return;
		const upgrade = WORKSHOP_UPGRADES.find(u => u.id === id);
		const maxLv = upgrade?.maxLevel ?? 100;
		const initialLv = save.workshopUpgrades[id] ?? 0;
		if (initialLv >= maxLv) { toast('⚠ Max level!', 'warning'); return; }

		let bought = 0;
		const isMax = buyMultiplier === 'max';
		for (let i = 0; i < (isMax ? 999999 : buyMultiplier); i++) {
			const lv = save.workshopUpgrades[id] ?? 0;
			if (lv >= maxLv) break;
			const cost = getWorkshopUpgradeCost(id, lv);
			if (save.totalCoins < cost) break;
			save.totalCoins -= cost;
			save.workshopUpgrades[id] = lv + 1;
			bought++;
		}

		if (bought > 0) {
			coinsStore.set(save.totalCoins);
			persistSave(save);
			const newLv = initialLv + bought;
			toast('🔧 ' + (upgrade?.name ?? id) + ' → Lv.' + newLv + (bought > 1 ? ' (+' + bought + ')' : ''), 'success');
		} else {
			toast('🔩 Not enough Alloy!', 'error');
		}
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
		{ key: 'bloom' as keyof GameSettings, label: 'Neon Bloom', desc: 'Glow post-processing (off for low-end GPUs)' },
		{ key: 'sfx' as keyof GameSettings, label: 'Sound Effects', desc: 'Combat & UI sounds' },
		{ key: 'music' as keyof GameSettings, label: 'Music', desc: 'Ambient background loop' },
		{ key: 'browserNotifications' as keyof GameSettings, label: 'Lab Notifications', desc: 'Browser notification when research finishes' },
	];

	const sections = [
		{ id: 'workshop' as const, label: 'Forge', icon: '⚙' },
		{ id: 'lab' as const, label: 'Research Deck', icon: '🔬' },
		{ id: 'blueprints' as const, label: 'Blueprints', icon: '📐' },
		{ id: 'tiers' as const, label: 'Fronts', icon: '🌍' },
		{ id: 'challenges' as const, label: 'Special Ops', icon: '⚡' },
		{ id: 'simulation' as const, label: 'Simulation', icon: '🧪' },
		{ id: 'stats' as const, label: 'Archives', icon: '📊' },
		{ id: 'settings' as const, label: 'Systems', icon: '⚙' },
	];
</script>

<svelte:head>
	<title>Orbital Command — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD Orbital Command — Foundry upgrades, Research Deck projects, Fronts, Special Operations, Simulation, Archives, and Systems." />
</svelte:head>

<main class="hub-page">
	<div class="bg-grid"></div>

	<Tutorial steps={hubTutorialSteps} tutorialKey={HUB_TUTORIAL_KEY} />

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
				<div class="hs"><h2 class="hst">⚙ Forge</h2><p class="hsd">Permanent pre-installed tower upgrades. Each level improves the tower blueprint before every deployment. Locked paths require Blueprint unlocks. The Forge never stops. Neither does the paperwork.</p>
					<div class="buy-mult">
						<span class="mult-label">Buy</span>
						{#each [1, 5, 10, 50, 'max'] as m}
							{@const val = m === 'max' ? 'max' as const : m as number}
							<button class="mult-btn" class:on={buyMultiplier === val} onclick={() => buyMultiplier = val} title={val === 'max' ? 'Buy max affordable (Ctrl)' : val === 50 ? 'Buy ×50 (Shift+Ctrl)' : val === 5 ? 'Buy ×5 (Shift)' : 'Buy ×1'}>{val === 'max' ? 'Max' : '×' + val}</button>
						{/each}
					</div>
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
				<div class="hs"><h2 class="hst">🔬 Research Deck</h2><p class="hsd">Time-based orbital research projects. Each level grants a permanent multiplicative bonus. Research continues offline. Only one project can be active at a time. Research continues offline because the scientists have been locked in. For their own safety.</p>
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
				<div class="hs"><h2 class="hst">📐 Blueprints</h2><p class="hsd">New upgrade paths are found in the field. Deploy to the right Front and reach its depth — each run has a chance to recover a schematic. Once discovered, research it here with Alloy to unlock its upgrades. Orbital Command classifies 90% of schematics as \'theoretically recoverable.\' The other 10% we just lost.</p>
					<div class="cl">{#each BLUEPRINT_DEFS as bp}{@const status = getBlueprintStatus(bp.id, ownedBlueprints, discoveredBlueprints)}{@const aff = coins >= bp.cost}{@const fieldCount = getFieldUpgradesUnlockedBy(bp.id).length}{@const foundryCount = getFoundryUpgradesUnlockedBy(bp.id).length}<div class="cc" class:lck={status === 'undiscovered'}><div class="cc-h"><span class="cci">{status === 'owned' ? '✅' : status === 'discovered' ? bp.icon : '🔒'}</span><div><div class="ccn">{status === 'undiscovered' ? '??? Unknown Schematic' : bp.name}</div><div class="ccd">{status === 'undiscovered' ? 'Schematic not yet recovered.' : bp.description}</div></div></div>{#if status === 'owned'}<div class="ccs">✓ Researched — unlocks {fieldCount} field + {foundryCount} foundry upgrade{fieldCount + foundryCount === 1 ? '' : 's'}</div>{:else if status === 'discovered'}<div class="ccl-found">🔍 Discovered — ready to research</div><div class="uc-b" style="margin-top:.3rem"><button class="hub-action" disabled={!aff} onclick={() => buyBlueprint(bp.id)} style={aff ? 'background:linear-gradient(135deg,var(--cyan),var(--blue));color:var(--bg-primary);font-weight:600' : ''}><span class="ucc">🔩{bp.cost.toLocaleString()}</span> Research</button></div>{:else}<div class="ccl">🔒 {describeBlueprintDiscovery(bp)}</div>{/if}</div>{/each}</div>
				</div>
			{:else if activeSection === 'tiers'}
				<div class="hs"><h2 class="hst">🌍 Fronts</h2><p class="hsd">Each front is a planet with increasing enemy density. Reach wave milestones to unlock harder fronts with better rewards. Remember: the enemy is also fighting a war. They are losing. Please continue to help them lose.</p>
					<div class="cl">{#each TIERS as t}{@const unl = unlockedFronts.includes(t.id)}{@const prev = getPreviousFront(t.id)}<div class="tc" class:unl={unl}><div class="tc-h"><span class="tci">{unl ? '🔓' : '🔒'}</span><div><div class="tcn">{t.name}</div><div class="tcd">{t.description}</div></div></div><div class="tcr" class:tcr-ok={unl}>{unl ? '✓ Unlocked · Best Wave ' + (frontBestWave[t.id] ?? 0) : 'Reach Wave ' + FRONT_UNLOCK_WAVE + (prev ? ' on ' + getFrontName(prev) : '')}</div></div>{/each}</div>
				</div>
			{:else if activeSection === 'challenges'}
				<div class="hs"><h2 class="hst">⚡ Special Operations</h2><p class="hsd">Tactical exercises with modified engagement rules. Each operation tests different combat scenarios under special conditions. \'Special conditions\' is military code for \'we broke something and called it a feature.\'</p>
					<div class="cl">{#each CHALLENGES as c}<div class="cc" class:lck={c.locked}><div class="cc-h"><span class="cci">{c.icon}</span><div><div class="ccn">{c.name}</div><div class="ccd">{c.description}</div></div></div>{#if c.highScore > 0}<div class="ccs">Best: Wave {c.highScore}</div>{:else if c.locked}<div class="ccl">🔒 Unlocks at higher waves</div>{/if}</div>{/each}</div>
				</div>
			{:else if activeSection === 'simulation'}
				{@const enemyTypes = [EnemyType.Normal, EnemyType.Fast, EnemyType.Tank, EnemyType.Ranged, EnemyType.Boss]}
				{@const tierLabel = simFront === 1 ? 'Front 1' : simFront === 2 ? 'Front 2' : simFront === 3 ? 'Front 3' : 'Front ' + simFront}
				<div class="hs">
					<h2 class="hst">🧪 Simulation — Enemy Stats</h2>
					<p class="hsd">Analyze Shape combat capabilities at any wave and Front. Adjust parameters below to preview enemy health and damage output. Simulated enemies cannot hurt you. Real enemies can. This is the one advantage of bureaucracy.</p>
					<div class="sim-controls">
						<div class="sim-param">
							<label class="sim-label" for="sim-wave">Wave: <strong>{simWave}</strong></label>
							<input id="sim-wave" type="range" min="1" max="10000" bind:value={simWave} class="sim-slider" />
							<input id="sim-wave-num" type="number" min="1" max="10000" bind:value={simWave} class="sim-input" />
						</div>
						<div class="sim-param">
							<label class="sim-label">Front:</label>
							<select bind:value={simFront} class="sim-select">
								<option value={1}>Front 1 (1×)</option>
								<option value={2}>Front 2 (20×)</option>
								<option value={3}>Front 3 (60×)</option>
							</select>
						</div>
					</div>
					<div class="sim-table-wrap">
						<table class="sim-table">
							<thead>
								<tr>
									<th>Shape</th>
									<th>Type</th>
									<th>HP</th>
									<th>Damage</th>
									<th>Speed</th>
									<th>Armor</th>
								</tr>
							</thead>
							<tbody>
								{#each enemyTypes as et}
									{@const cfg = computeEnemyConfig(et, simWave, simFront, false)}
									{@const shapeIcon = ENEMY_SHAPES[et] === 'square' ? '⬜' : ENEMY_SHAPES[et] === 'diamond' ? '🔷' : ENEMY_SHAPES[et] === 'hexagon' ? '⬡' : ENEMY_SHAPES[et] === 'triangle' ? '🔺' : '⬠'}
									<tr class:boss-row={et === EnemyType.Boss}>
										<td class="sim-shape">{shapeIcon}</td>
										<td class="sim-type">{et === EnemyType.Boss ? 'BOSS' : et.charAt(0).toUpperCase() + et.slice(1)}</td>
										<td class="sim-num">{formatCompact(cfg.hp)}</td>
										<td class="sim-num">{formatCompact(cfg.damage)}</td>
										<td class="sim-num">{cfg.speed.toFixed(0)}</td>
										<td class="sim-num">{(cfg.armor * 100).toFixed(0)}%</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="sim-note">Values computed using deterministic piecewise power interpolation. Front multipliers: 1× / 20× / 60×. Boss values include boss multipliers (capped at 25× HP, 8× ATK).</p>
				</div>
			{:else if activeSection === 'stats'}
				<div class="hs"><h2 class="hst">📊 Archives</h2>
					<p class="hsd">Campaign telemetry and historical records. Some data has been revised for clarity. Some has been revised for morale. Some has been revised because we forgot what happened.</p>
					<div class="ig"><div class="ir"><span class="il">Total Deployments</span><span class="iv">{totalRuns}</span></div><div class="ir"><span class="il">Highest Wave</span><span class="iv">{highestWave}</span></div><div class="ir"><span class="il">Alloy Reserves</span><span class="iv">🔩 {coins.toLocaleString()}</span></div><div class="ir"><span class="il">Peak Performance</span><span class="iv">🏆 Wave {highestWave}</span></div></div>
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
		<div class="overlay" role="dialog"><div class="dlg"><h3>📂 Import Save</h3><p class="dlg-d">Paste your save JSON.</p><textarea bind:value={importText} rows={5}></textarea><div class="dlg-a"><button class="dlg-p" onclick={async () => { const r = await importSave(importText); if (r.success) { toast(getOpLogMessage('saveImported'), 'success'); importText = ''; } else { toast(getOpLogMessage('saveImportFailed'), 'error'); } showImportDialog = false; if (r.success) { const s = getCachedSave(); if (s) { coinsStore.set(s.totalCoins); highestWaveStore.set(s.highestWave); totalRunsStore.set(s.totalRuns); } } }}>Import</button><button class="dlg-s" onclick={() => { showImportDialog = false; importText = ''; }}>Cancel</button></div></div></div>
	{/if}
	{#if showResetConfirm}
		<div class="overlay" role="dialog"><div class="dlg dlg-dng"><h3>🗑 Reset Save?</h3><p class="dlg-d">This will erase all Alloy, Forge upgrades, Blueprints, Research Deck progress, Front progress, and settings. Cannot be undone.</p><div class="dlg-a"><button class="dlg-s" onclick={() => showResetConfirm = false}>Cancel</button><button class="dlg-dng-btn" onclick={async () => { await resetSave(); showResetConfirm = false; coinsStore.set(0); highestWaveStore.set(0); totalRunsStore.set(0); settingsStore.set({ ...DEFAULT_SETTINGS }); toast(getOpLogMessage('saveReset'), 'warning'); }}>Reset</button></div></div></div>
	{/if}

	<footer class="hub-footer">
		<span>🛰️ Orbital Command — Flatland TD · FLTD</span>
		<p class="hub-footer-flavor">Geometry is legally classified as aggressive. Angles below 90° must be reported.</p>
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
	.toast-c { position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:300; display:flex; flex-direction:column; gap:.3rem; pointer-events:none; }
	.toast { padding:.35rem .9rem; font-size:var(--fs-caption); border-radius:100px; white-space:nowrap; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:ti .2s ease; box-shadow:0 0 20px rgba(0,0,0,.3); }
	.toast-info { background:rgba(0,255,255,.1); color:var(--cyan); border:1px solid rgba(0,255,255,.25); }
	.toast-success { background:rgba(68,255,136,.1); color:var(--green); border:1px solid rgba(68,255,136,.25); }
	.toast-warning { background:rgba(255,68,68,.1); color:var(--red); border:1px solid rgba(255,68,68,.25); }
	.toast-error { background:rgba(255,68,68,.12); color:#FF6666; border:1px solid rgba(255,68,68,.3); }
	.toast-milestone { background:rgba(255,221,68,.1); color:var(--yellow); border:1px solid rgba(255,221,68,.25); }
	@keyframes ti { from{opacity:0;transform:translateY(-8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
	.hub-top { display:flex; align-items:center; gap:.75rem; padding:.75rem 1.5rem; background:rgba(7,8,18,.95); border-bottom:1px solid var(--border-neon); position:sticky; top:0; z-index:10; }
	.hub-back { color:var(--text-secondary); font-size:var(--fs-body); text-decoration:none; padding:.25rem .65rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-back:hover { color:var(--cyan); border-color:var(--cyan); }
	.hub-title { font-size:var(--fs-hero); font-weight:700; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
	.hub-coins { margin-left:auto; font-family:var(--font-mono); font-size:var(--fs-mono-lg); color:var(--yellow); }
	.hub-desc { padding:1.25rem 1.5rem .5rem; text-align:center; color:var(--text-secondary); font-size:var(--fs-body); line-height:1.7; max-width:900px; margin:0 auto; position:relative; z-index:1; }
	.hub-body { display:flex; gap:2rem; padding:1.5rem; max-width:1400px; margin:0 auto; position:relative; z-index:1; min-height:calc(100vh - 64px); }
	.hub-nav { display:flex; flex-direction:column; gap:.35rem; width:200px; flex-shrink:0; }
	.hub-nav-btn { display:block; width:100%; padding:.6rem .9rem; font-size:var(--fs-body); color:var(--text-secondary); text-align:left; border-radius:var(--radius-sm); transition:all var(--transition-fast); }
	.hub-nav-btn.on { color:var(--cyan); background:rgba(0,255,255,.06); }
	.hub-nav-btn:hover:not(.on) { color:var(--text-primary); background:rgba(255,255,255,.03); }
	.hub-content { flex:1; min-width:0; max-width:1000px; }
	.hs { animation:fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1.25rem; line-height:1.6; }
	.hub-action { padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); margin-right:.5rem; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-danger:hover { border-color:var(--red); color:var(--red); }
	.buy-mult { display:flex; align-items:center; gap:2px; margin-bottom:.5rem; }
	.mult-label { font-size:var(--fs-caption-sm); color:var(--text-dim); font-family:var(--font-mono); margin-right:.2rem; }
	.mult-btn { padding:.15rem .4rem; font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--text-dim); border-radius:4px; background:rgba(0,0,0,.12); border:1px solid transparent; cursor:pointer; transition:all var(--transition-fast); }
	.mult-btn:hover { color:var(--text-secondary); border-color:var(--border-neon); }
	.mult-btn.on { color:var(--cyan); background:rgba(0,255,255,.1); border-color:rgba(0,255,255,.25); }

	/* Forge/Research upgrade cards */
	.ug { display:flex; flex-direction:column; gap:4px; max-width:800px; }
	.uc { display:flex; flex-direction:column; gap:.15rem; padding:.72rem .8rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast); text-align:left; width:100%; }
	.uc.aff { border-color:rgba(68,255,136,.25); }
	.uc.aff:hover { border-color:var(--cyan); background:rgba(0,255,255,.05); }
	.uc.mx { opacity:.5; cursor:default; }
	.uc:disabled:not(.mx) { opacity:.65; cursor:default; }
	.uc-t { display:flex; align-items:center; gap:.35rem; }
	.uci { font-size:var(--fs-mono-lg); flex-shrink:0; }
	.ucn { flex:1; font-size:var(--fs-mono-lg); font-weight:500; color:var(--text-primary); }
	.ucl { font-size:var(--fs-mono-sm); font-family:var(--font-mono); color:var(--text-secondary); }
	.uc-btr { height:4px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.uc-btf { height:100%; background:linear-gradient(90deg,var(--cyan),var(--blue)); border-radius:2px; transition:width var(--transition-normal); }
	.uc.aff .uc-btf { background:linear-gradient(90deg,var(--green),var(--cyan)); }
	.uc-b { display:flex; align-items:center; gap:.35rem; font-size:var(--fs-mono); }
	.ucc { font-family:var(--font-mono); color:var(--yellow); }
	.ucnx { margin-left:auto; color:var(--text-secondary); font-family:var(--font-mono); }
	.uc.aff .ucnx { color:var(--green); }
	.lc { gap:.25rem; }
	.ld { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.4; }
	.uc.researching { border-color:rgba(255,221,68,.3); background:rgba(255,221,68,.03); }
	.rs-bar-track { height:5px; background:rgba(0,0,0,.3); border-radius:2px; overflow:hidden; }
	.rs-bar-fill { height:100%; background:linear-gradient(90deg,var(--yellow),var(--orange)); border-radius:2px; transition:width .5s linear; }
	.rs-info { font-size:var(--fs-caption-sm); color:var(--yellow); font-family:var(--font-mono); text-align:center; }
	.rs-btn { display:block; width:100%; margin-top:.25rem; padding:.4rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); font-weight:600; cursor:pointer; transition:all var(--transition-fast); text-align:center; }
	.rs-btn.aff { background:linear-gradient(135deg,var(--cyan),var(--blue)); color:var(--bg-primary); }
	.rs-btn:disabled { opacity:.55; background:var(--bg-tertiary); color:var(--text-dim); cursor:default; }
	.cl { display:flex; flex-direction:column; gap:.5rem; max-width:800px; }
	.tc,.cc { padding:.75rem .85rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.tc.unl { border-color:rgba(68,255,136,.12); } .cc.lck { opacity:.55; }
	.tc-h,.cc-h { display:flex; gap:.5rem; align-items:flex-start; }
	.tci,.cci { font-size:var(--fs-icon-lg); flex-shrink:0; margin-top:2px; }
	.tcn,.ccn { font-size:var(--fs-body-sm); color:var(--text-primary); font-weight:500; margin-bottom:.1rem; }
	.tcd,.ccd { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	.tcr,.ccs,.ccl,.ccl-found { font-size:var(--fs-caption-sm); color:var(--text-secondary); font-family:var(--font-mono); margin-top:.25rem; padding:.15rem .4rem; background:rgba(0,0,0,.12); border-radius:3px; display:inline-block; }
	.ccl-found { color:var(--cyan); background:rgba(0,255,255,.08); }
	.tcr-ok { color:var(--green); } .ccs { color:var(--green); }
	.ig { display:grid; gap:3px; max-width:600px; }
	.ir { display:flex; justify-content:space-between; padding:.4rem .55rem; font-size:var(--fs-mono); border-radius:3px; }
	.ir:nth-child(odd) { background:rgba(0,0,0,.1); }
	.il { color:var(--text-secondary); } .iv { color:var(--text-primary); font-family:var(--font-mono); font-weight:500; }
	.sg { display:flex; flex-direction:column; gap:2px; max-width:600px; }
	.sr { display:flex; justify-content:space-between; align-items:center; padding:.55rem .55rem; border-radius:var(--radius-sm); cursor:pointer; }
	.sr:hover { background:rgba(255,255,255,.02); }
	.si { display:flex; flex-direction:column; gap:.08rem; }
	.sl { font-size:var(--fs-body-sm); color:var(--text-primary); } .sd { font-size:var(--fs-caption); color:var(--text-secondary); }
	.tg { width:38px; height:22px; border-radius:11px; background:var(--bg-tertiary); border:1px solid var(--border-neon); position:relative; transition:all var(--transition-fast); flex-shrink:0; cursor:pointer; }
	.tg.on { background:rgba(0,255,255,.12); border-color:var(--cyan); }
	.tgk { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--text-dim); transition:all var(--transition-fast); }
	.tg.on .tgk { left:18px; background:var(--cyan); box-shadow:0 0 6px rgba(0,255,255,.4); }
	.overlay { position:fixed; inset:0; background:rgba(7,8,18,.85); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:fi .2s ease; }
	.dlg { background:var(--bg-secondary); border:1px solid var(--border-neon-strong); border-radius:var(--radius-xl); padding:1.75rem; max-width:420px; width:100%; }
	.dlg h3 { font-size:var(--fs-subheading); margin-bottom:.4rem; }
	.dlg-d { color:var(--text-secondary); font-size:var(--fs-body-sm); margin-bottom:.85rem; }
	.dlg textarea { width:100%; margin-bottom:.85rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); padding:.5rem; font-family:var(--font-mono); font-size:var(--fs-caption-sm); resize:vertical; }
	.dlg-a { display:flex; gap:.5rem; justify-content:center; }
	.dlg-p,.dlg-s,.dlg-dng-btn { padding:.55rem 1.3rem; border-radius:var(--radius-sm); font-weight:600; font-size:var(--fs-btn-sm); cursor:pointer; transition:all var(--transition-fast); }
	.dlg-p { background:var(--cyan); color:var(--bg-primary); }
	.dlg-s { background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); }
	.dlg-dng-btn { background:var(--red); color:white; }
	.dlg-dng { border-color:rgba(255,68,68,.2); }
	@keyframes fi { from{opacity:0} to{opacity:1} }
	.save-note { margin-top:1.25rem; padding:.75rem 1rem; background:rgba(255,221,68,.04); border:1px solid rgba(255,221,68,.12); border-radius:var(--radius-sm); max-width:800px; }
	.save-note-flavor { font-size:var(--fs-caption-sm); color:rgba(255,221,68,.45); font-style:italic; line-height:1.4; margin:0; }
	@media(max-width:767px){ .hub-body{flex-direction:column;padding:1rem;gap:1rem} .hub-nav{display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem;width:auto;flex-direction:initial} .hub-nav-btn{flex-shrink:0;white-space:nowrap;text-align:center;padding:.55rem .5rem;font-size:var(--fs-body-sm)} .hub-top{padding:.6rem 1rem}.hub-desc{padding:1rem 1rem .25rem} }
	@media(max-width:380px){ .hub-nav{grid-template-columns:1fr 1fr} .hub-nav-btn{font-size:var(--fs-caption);padding:.5rem .4rem} }
	.hub-footer { text-align:center; padding:1.5rem; color:var(--text-dim); font-size:var(--fs-caption); display:flex; flex-direction:column; gap:.4rem; align-items:center; border-top:1px solid var(--border-neon); margin-top:2rem; }
	.hub-footer-flavor { font-size:var(--fs-caption-sm); color:var(--text-dim); opacity:0.35; margin:0; }
	.hub-footer-links { display:flex; gap:.4rem; align-items:center; }
	.hub-footer-links a { color:var(--cyan); text-decoration:underline; text-underline-offset:3px; text-decoration-color:rgba(0,255,255,.2); }
	/* ── Simulation Panel ───────────────────────────────── */
	.sim-controls { display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:1rem; padding:.75rem 1rem; background:rgba(0,0,0,.15); border-radius:var(--radius-sm); border:1px solid var(--border-neon); }
	.sim-param { display:flex; align-items:center; gap:.5rem; }
	.sim-label { font-size:var(--fs-body); color:var(--text-secondary); font-family:var(--font-mono); white-space:nowrap; }
	.sim-label strong { color:var(--cyan); }
	.sim-slider { width:140px; accent-color:var(--cyan); cursor:pointer; }
	.sim-input { width:72px; padding:.25rem .4rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:4px; font-family:var(--font-mono); font-size:var(--fs-body); text-align:center; }
	.sim-select { padding:.3rem .5rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:4px; font-family:var(--font-mono); font-size:var(--fs-body-sm); cursor:pointer; }
	.sim-table-wrap { overflow-x:auto; }
	.sim-table { width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:var(--fs-body); }
	.sim-table th { text-align:left; padding:.4rem .6rem; color:var(--cyan); font-size:var(--fs-caption); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border-neon); }
	.sim-table td { padding:.35rem .6rem; color:var(--text-secondary); border-bottom:1px solid rgba(0,255,255,.06); }
	.sim-shape { font-size:var(--fs-icon-md); text-align:center; }
	.sim-type { color:var(--text-primary); font-weight:500; }
	.sim-num { text-align:right; color:var(--text-primary); }
	.boss-row td { color:var(--pink)!important; font-weight:600; }
	.boss-row .sim-type { color:var(--pink)!important; }
	.sim-note { margin-top:.75rem; font-size:var(--fs-caption-sm); color:var(--text-dim); font-style:italic; }
</style>
