/**
 * Long-tail simulation runner with 3 strategies.
 * Run with: npx tsx scripts/simulate.ts
 */

import { simulateRun, totalWSLevels, totalLabLevels, SCENARIOS } from '../src/lib/game/balance/balanceSimulator';

console.log('='.repeat(110));
console.log('  GeoCore TD — Simulator (Confused / Reasonable / Optimal)');
console.log('  Tests progression with proper long-tail workshop scaling.');
console.log('='.repeat(110));

for (const sc of SCENARIOS) {
	const wsTot = totalWSLevels(sc.workshop);
	const labTot = totalLabLevels(sc.labs);
	const runs: ReturnType<typeof simulateRun>[] = [];
	for (let i = 0; i < 3; i++) runs.push(simulateRun(sc.workshop, sc.labs, 5000, sc.tier, sc.strategy));
	const avg = (f: keyof typeof runs[0]) => {
		const v = runs.map(r => typeof r[f] === 'number' ? r[f] as number : 0);
		return v.reduce((a, b) => a + b, 0) / v.length;
	};
	const r0 = runs[0];
	console.log('\n' + '─'.repeat(110));
	console.log(`  ${sc.name} (Tier ${sc.tier}, ${sc.strategy})`);
	console.log(`  ${sc.desc}`);
	console.log(`  WS: ${wsTot}  Labs: ${labTot}`);
	console.log('─'.repeat(110));
	console.log(`  Wave:      ${avg('finalWave').toFixed(0)} (avg 3)`);
	console.log(`  Kills:     ${avg('totalKills').toFixed(0)}`);
	console.log(`  Cash:      ${Math.floor(avg('totalCashEarned')).toLocaleString()}`);
	console.log(`  Coins:     ${Math.floor(avg('totalCoinsEarned')).toLocaleString()}`);
	console.log(`  Dmg:${r0.finalDamage.toFixed(0)}  Rate:${r0.finalFireRate.toFixed(2)}  HP:${r0.finalMaxHp}  Def:${r0.finalDefense.toFixed(0)}`);
	console.log(`  DPS:${r0.dps.toFixed(0)}  Bottleneck: ${r0.bottleneck}`);
	console.log(`  Died to:   ${r0.diedTo}`);
}

console.log('\n' + '='.repeat(110));
console.log('  Done.');
console.log('='.repeat(110));
