<script lang="ts">
	import { EnemyType } from '$lib/game/engine/gameTypes';
	import { FRONT_META } from '$lib/game/balance/tiers';
	import { formatCompact, computeEnemyConfig, ENEMY_SHAPES, TIER_MULTIPLIERS } from '$lib/game/balance/balanceMath';
	import { tooltip } from '$lib/components/tooltip';

	let {
		simWave = $bindable(),
		simFront = $bindable()
	}: {
		simWave: number;
		simFront: number;
	} = $props();

	const enemyTypes = [EnemyType.Normal, EnemyType.Fast, EnemyType.Tank, EnemyType.Ranged, EnemyType.Boss];
</script>

<div class="hs">
	<h2 class="hst">🧪 Simulation — Enemy Stats</h2>
	<p class="hsd">Analyze Shape combat capabilities at any wave and Front. Adjust parameters below to preview enemy health and damage output. Simulated enemies cannot hurt you. Real enemies can. This is the one advantage of bureaucracy.</p>
	<div class="sim-controls">
		<div class="sim-param">
			<label class="sim-label" for="sim-wave">Wave: <strong>{simWave}</strong></label>
			<input id="sim-wave" type="range" min="1" max="10000" bind:value={simWave} class="sim-slider" />
			<input id="sim-wave-num" type="number" inputmode="numeric" min="1" max="10000" bind:value={simWave} class="sim-input" />
		</div>
		<div class="sim-param">
			<label class="sim-label" for="sim-front">Front:</label>
			<select id="sim-front" bind:value={simFront} class="sim-select">
				{#each FRONT_META as m}
					<option value={m.front}>{m.displayName} (×{formatCompact(TIER_MULTIPLIERS[m.front]?.hp ?? 1)} HP)</option>
				{/each}
			</select>
		</div>
	</div>
	<div class="sim-table-wrap">
		<table class="sim-table">
			<thead>
				<tr>
					<th class="sim-th-shape">Shape</th>
					<th class="sim-th-type">Type</th>
					<th class="sim-th-num">HP</th>
					<th class="sim-th-num">Damage</th>
					<th class="sim-th-num">Speed</th>
					<th class="sim-th-num">Armor</th>
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
	<p class="sim-note">Values computed using deterministic piecewise power interpolation. Boss values include boss multipliers (20× HP, up to 8× ATK).</p>
</div>

<style>
	.sim-controls { display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:1rem; padding:.75rem 1rem; background:rgba(0,0,0,.15); border-radius:var(--radius-sm); border:1px solid var(--border-neon); }
	.sim-param { display:flex; align-items:center; gap:.5rem; }
	.sim-label { font-size:var(--fs-body); color:var(--text-secondary); font-family:var(--font-mono); white-space:nowrap; }
	.sim-label strong { color:var(--cyan); }
	.sim-slider { width:140px; accent-color:var(--cyan); cursor:pointer; }
	.sim-input { width:72px; padding:.25rem .4rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:4px; font-family:var(--font-mono); font-size:var(--fs-body); text-align:center; }
	.sim-select { padding:.3rem .5rem; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-neon); border-radius:4px; font-family:var(--font-mono); font-size:var(--fs-body-sm); cursor:pointer; }
	.sim-table-wrap { overflow-x:auto; max-width:680px; border:1px solid var(--border-neon); border-radius:var(--radius-sm); background:rgba(0,0,0,.18); }
	.sim-table { width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:var(--fs-body-sm); }
	.sim-table th { padding:.55rem .7rem; color:var(--cyan); font-size:var(--fs-caption-sm); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border-neon-strong); white-space:nowrap; background:rgba(0,255,255,.04); }
	.sim-table th.sim-th-shape { text-align:center; }
	.sim-table th.sim-th-type { text-align:left; }
	.sim-table th.sim-th-num { text-align:right; }
	.sim-table td { padding:.5rem .7rem; color:var(--text-secondary); border-bottom:1px solid rgba(0,255,255,.05); }
	.sim-table tbody tr:nth-child(even) td { background:rgba(0,0,0,.16); }
	.sim-table tbody tr:last-child td { border-bottom:0; }
	.sim-table tbody tr:hover td { background:rgba(0,255,255,.05); }
	.sim-shape { font-size:var(--fs-icon-md); text-align:center; width:44px; }
	.sim-type { color:var(--text-primary); font-weight:500; white-space:nowrap; }
	.sim-num { text-align:right; color:var(--text-primary); white-space:nowrap; }
	.boss-row td { color:var(--pink)!important; font-weight:600; background:rgba(255,68,170,.06)!important; }
	.boss-row .sim-type { color:var(--pink)!important; }
	.boss-row:hover td { background:rgba(255,68,170,.1)!important; }
	.sim-note { margin-top:.75rem; font-size:var(--fs-caption-sm); color:var(--text-dim); font-style:italic; }
</style>
