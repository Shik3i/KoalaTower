<script lang="ts">
	import { GITHUB_ISSUES_URL } from '$lib/version';
	let activeFaq = $state<string | null>(null);
	let replayMsg = $state('');

	function replayTutorial(key: string, name: string) {
		localStorage.removeItem(key);
		replayMsg = name + ' tutorial will replay on next visit.';
		setTimeout(() => { replayMsg = ''; }, 3000);
	}

	const faqs = [
		{
			id: 'start',
			q: 'How do I start playing?',
			a: 'Go to Deployment and click "Launch Deployment". A tower is dropped from orbit into Flatland. Enemies spawn from the edges and move toward it. The tower fires automatically at the nearest shape. Spend Energy (⚡) on temporary Field Upgrades during the deployment, and refine Alloy (🔩) for permanent Forge upgrades between deployments. Every deployment ends eventually. Officially, this is called data collection.',
		},
		{
			id: 'currencies',
			q: 'What are Energy and Alloy?',
			a: 'Energy (⚡) is harvested from destroyed shapes during a deployment. It powers temporary Field Overclocks and is lost when the tower is destroyed. Alloy (🔩) is official permanent progression, spent in the Forge and Research Deck. Strange Matter (◈) is not sold. It is recovered, smuggled, misplaced, and occasionally delivered in containers nobody signed for.',
		},
		{
			id: 'black-market',
			q: 'What is the Black Market?',
			a: 'The Black Market is an unofficial Orbital Command terminal for Strange Matter (◈) quality-of-life systems. Once unlocked, you can quietly pick up +1 Strange Matter once per local day — no deployment needed, just stop by — and a separate Weekly Shipment delivers +3 on its own cooldown. Both are local-first pacing tools with no streaks and no punishment for missing days. This is entirely separate from the official Command Orders (which pay Alloy). Support is appreciated and never required; nothing is gated by payment. Black Market unlocks are infrastructure and convenience, not raw combat power.',
		},
		{
			id: 'enemies',
			q: 'What enemy types exist?',
			a: 'Five types, each with a unique outline shape: ■ Square = Normal (baseline), ◆ Diamond = Fast (1.8× Normal speed), ⬡ Hexagon = Tank (5× HP, larger, slower), ▶ Triangle = Ranged (stops just inside starter tower range and fires), ⬠ Pentagon = Boss (every 10 waves with escorts, 20× HP, very large). Watch their shapes to identify them instantly.',
		},
		{
			id: 'bosses',
			q: 'How do boss waves work?',
			a: 'Every 10th wave is a boss wave. Escort enemies spawn first, then the Prime Shape appears last. Bosses are larger, have a pulsing aura ring, and deal heavy damage. Killing a boss triggers a screen shake and extra particle effects. Boss rewards are significantly higher. The geometric chain of command has been disrupted.',
		},
		{
			id: 'battle-upgrades',
			q: 'How do Field Upgrades work?',
			a: 'During a deployment, the right panel shows Field Upgrades in three categories: Offense (Damage, Attack Speed, Range, Multishot Chance, Multishot Targets, Crit Chance, Crit Multiplier), Defense (Defense, Max HP), Utility (Energy Amp). Spend Energy (⚡) to overclock your tower. Each deployment STARTS at your permanent Forge level for that stat and continues the same curve from there — the card shows the current effective value, and the cost picks up where the Forge left off. All Field levels bought with Energy are lost when the tower is destroyed (the Forge starting levels are permanent). Orbital Command describes this as "performance-based incentive architecture."',
		},
		{
			id: 'upgrade-caps',
			q: 'Do Field Upgrades have limits?',
			a: 'Yes. Percentage-based Field Upgrades have hard caps: Multishot Chance at 50%, combined Crit Chance at 75%. Flat upgrades have high or practical caps; Damage is treated as long-tail progression rather than a normal early max. The UI shows MAXED when a real cap is reached. Even the Tower has limits. It has been informed of this regulation.',
		},
		{
			id: 'workshop',
			q: 'What is the Forge?',
			a: 'The Forge (⚙) sets the permanent starting level of your Field Upgrades, bought with Alloy (🔩). Combat stats (Damage, Max HP, Attack Speed, Range, Crit Chance, Crit Multiplier, Defense, etc.) share ONE curve with the in-deployment Field Upgrades: a Forge level equals that many Field levels — same value — and the next in-run purchase continues from where the Forge left off (cost included). For example, Forge Max HP Lv.1 starts you at 200 HP, exactly like buying one Max HP in deployment. Research multiplies on top of that. A few economy upgrades (Alloy Bonus, Energy Bonus, Starting Energy) have no Field equivalent and stay permanent-only.',
		},
		{
			id: 'lab',
			q: 'How does the Research Deck work?',
			a: 'The Research Deck runs orbital projects: Damage Research, Attack Speed Research, Health Research, Alloy Research, Energy Research. Purchase a level — research takes real time (it continues offline). Each level grants a permanent multiplicative bonus that stacks with the Forge. Higher levels cost more. The Research Deck turns time, Alloy, and suspicious optimism into small permanent improvements. Results are reviewed for morale compliance before release.',
		},
		{
			id: 'speed',
			q: 'How do I change game speed?',
			a: 'Use the speed buttons in the top bar: 1× (normal), 2×, 3×, 5×. Press Space to pause. Keyboard shortcuts: 1-4 for speed levels, Space for pause/resume. The game simulation speeds up internally — higher speeds let you progress faster. Warning: 5× may cause Shapes to appear statistically more aggressive.',
		},
		{
			id: 'gameover',
			q: 'What happens when the tower dies?',
			a: 'The tower is destroyed. The deployment is over. All Alloy (🔩) harvested is safely transmitted back to Orbital Command. Your highest wave record is saved. The Tower Lost screen shows wave reached, kills, bosses defeated, and Energy harvested. Click "Launch Deployment" to deploy a new tower. The Tower is reusable in spirit. In practice, it is a fresh install every time.',
		},
		{
			id: 'waves',
			q: 'How do waves scale?',
			a: 'Waves are endless. Enemy HP, damage, and speed increase gradually. Front 1 introduces enemies slowly: Fast after the first boss at Wave 11, Tank at Wave 50, and Ranged at Wave 100. Later Fronts introduce the roster earlier. Armor appears only on higher Fronts, not in early Perimeter deployments. Keep upgrading to survive. The swarm is learning. So is the Tower. One of them is better at it.',
		},
		{
			id: 'save',
			q: 'How do I save my progress?',
			a: 'Auto-saved to your browser (IndexedDB). You can also export/import your save as JSON from the 💾 menu. Local saves are primary: no cloud, backend, or account is needed for normal play. Editing saves is technically possible. Orbital Command cannot stop you from rewriting reality. It can only confirm that doing so makes the war considerably less interesting.',
		},
		{
			id: 'privacy',
			q: 'Is my data private?',
			a: 'Yes. Flatland TD is local-first. Normal gameplay data lives in your browser, with no analytics, tracking, or external network calls during gameplay. Optional online features may use a session cookie only if you register or log in. Not even the Shapes know your high score. See the Privacy page for full details.',
		},
	];

	const jsonLdFaq = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(f => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	};
</script>

<svelte:head>
	<title>Help — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD help guide and FAQ. Learn about currencies, enemy types, upgrades, bosses, and game mechanics." />
	<script type="application/ld+json">{JSON.stringify(jsonLdFaq)}</script>
</svelte:head>

<div class="help-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to Home</a>

	<div class="help-header glass-panel">
		<h1>Orbital Command Field Manual</h1>
		<p>Everything you need to know about the Flatland Wars. Read carefully. There will not be a test. Unless the Shapes decide otherwise.</p>
	</div>

	<!-- Getting Started -->
	<section class="help-section">
		<h2>🚀 Deployment Protocol</h2>
		<div class="help-steps">
			<div class="help-step">
				<div class="help-step-num">1</div>
				<div class="help-step-content">
					<h3>▶ Launch a Deployment</h3>
					<p>Go to <a href="/play">Deployment</a> and click "Launch Deployment". Your tower is dropped from orbit into Flatland and fires automatically at the nearest hostile shape. The Tower understands its purpose. It does not understand mercy.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">2</div>
				<div class="help-step-content">
					<h3>⚡ Harvest Resources</h3>
					<p>Destroyed shapes yield <strong>Energy (⚡)</strong> for temporary Field Overclocks and <strong>Alloy (🔩)</strong> for permanent upgrades. Energy disappears when the Tower falls — Accounting insisted. Alloy is beamed safely to Orbital Command before impact.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">3</div>
				<div class="help-step-content">
					<h3>⚡ Apply Field Upgrades</h3>
					<p>Spend Energy (⚡) on the right panel to overclock the Tower mid-deployment. Permanent upgrades are bought with Alloy (🔩) at the <a href="/hub">Forge</a> between deployments. One is temporary excitement. The other is bureaucracy. Both are essential.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">4</div>
				<div class="help-step-content">
					<h3>🏆 Advance the Campaign</h3>
					<p>Research on the <a href="/hub">Research Deck</a>, unlock new Fronts by reaching wave milestones, and run Special Operations — which may or may not be simulations. Orbital Command is not at liberty to clarify.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Story / Lore -->
	<section class="help-section">
		<h2>📖 The War in Flatland</h2>
		<div class="lore-box">
			<p><strong>Flatland</strong> is a two-dimensional universe — a vast, infinite plane of digital matter. For centuries, the civilizations of Flatland lived in peace. Then came <strong>The Swarm</strong>: a relentless proliferation of geometric hostiles that consumes everything in its path. <em>Or so Orbital Command reports. Some archived fragments suggest the first shots may have been administrative in nature. These records have been sealed.</em></p>
			<p>You command <strong>🛰️ Orbital Command</strong> — a mobile command station in high orbit that manufactures and deploys <strong>Towers</strong>: advanced platforms dropped into hostile Flatland fronts. The Tower is reusable in spirit. In practice, it is replaced every deployment. Procurement has strong feelings about this.</p>
			<div class="lore-mechanics">
				<div class="lore-m">
					<span class="lore-mi">🛰️</span>
					<div>
						<strong>Orbital Command</strong>
						<span>Your permanent base between deployments. The Forge pre-installs upgrades, the Research Deck runs orbital projects (results are sanitized for morale reasons), and Schematics reconstruct new capabilities — assuming Procurement has not lost them.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi"><img src="/branding/flatland-logo-small.svg" alt="Tower" class="lore-icon-img" /></span>
					<div>
						<strong>Front Deployment</strong>
						<span>A Tower is dropped from orbit into a hostile Flatland front. When the battle is lost, the Tower is destroyed — it cannot be recovered. Each deployment is a new installation. Orbital Command has considered parachutes. The idea was rejected on principle.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">⚡</span>
					<div>
						<strong>Harvested Energy</strong>
						<span>Energy is harvested from destroyed geometric enemies. It powers temporary Field Overclocks but cannot be transmitted to orbit. Accounting has deemed transmission "financially irresponsible." It is lost with the Tower.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">🔩</span>
					<div>
						<strong>Refined Alloy</strong>
						<span>Alloy is refined from shape remnants. It is dense, stable, and transmits perfectly — it beams back before the Tower falls. Permanent material for upgrades. Also used as a low-orbit currency. Morale is calibrated in Alloy-equivalent units.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">🌍</span>
					<div>
						<strong>Fronts = Difficulty</strong>
						<span>Each Front has different swarm density. Sixteen Fronts are charted across Perimeter, Redline, Blacksite, and Anomaly bands. Deeper Fronts offer greater rewards — and more geometry. High-end Blacksite and Anomaly mechanics are still under active calibration.</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Currencies -->
	<section class="help-section">
		<h2>💎 Resources</h2>
		<div class="info-grid">
			<div class="info-card gold">
				<div class="info-icon">⚡</div>
				<h3>Energy</h3>
				<span class="info-badge">Temporary</span>
				<p>Harvested from destroyed shapes during a deployment. Spent on <strong>Field Upgrades</strong> to supercharge the tower. Lost when the tower is destroyed. Boosted by <strong>Energy Amp</strong> and <strong>Energy Bonus</strong> Forge upgrades.</p>
			</div>
			<div class="info-card coin">
				<div class="info-icon">🔩</div>
				<h3>Alloy</h3>
				<span class="info-badge">Permanent</span>
				<p>Official permanent progression. Refined from shape remnants. Spent at the <strong>Forge</strong> for pre-installed tower upgrades and on the <strong>Research Deck</strong> for orbital projects. Boosted by <strong>Alloy Bonus</strong>. Persists forever across all deployments.</p>
			</div>
			<div class="info-card">
				<div class="info-icon">📐</div>
				<h3>Schematics</h3>
				<span class="info-badge">Per Front</span>
				<p>Recovered design fragments — used to <strong>reconstruct upgrade paths</strong>. Collected separately for each Front. Boss kills are repeatable; first-time wave milestones are one-time. The Black Market converter can trade 25 Front N Schematics for 1 Front N+1 Schematic after it is unlocked.</p>
			</div>
			<div class="info-card">
				<div class="info-icon">◈</div>
				<h3>Strange Matter</h3>
				<span class="info-badge">Contraband QoL</span>
				<p>Rare local-first currency from the Black Market: a +1 daily pickup and a +3 weekly shipment. It is not sold and not checked against support payments. Spent on Black Market quality-of-life systems like speed options, Auto Deployment, and the Schematic Converter. (Official weekly Command Orders pay Alloy, not Strange Matter — see Command Orders.)</p>
			</div>
		</div>
	</section>

	<section class="help-section">
		<h2>BLACK MARKET</h2>
		<p class="section-desc">Unauthorized Procurement Channel. Black Market upgrades are unofficial quality-of-life systems. Orbital Command denies using them. Orbital Command is lying.</p>
		<div class="lore-box">
			<p><strong>Strange Matter</strong> is unstable contraband recovered from anomalies, off-grid handoffs, and containers nobody signed for. It is not sold.</p>
			<p>The <strong>Daily Pickup</strong> slips you +1 Strange Matter once per local day — no deployment required, just visit the channel. The separate <strong>Weekly Shipment</strong> delivers +3 on its own cooldown. Both grant Strange Matter whether or not you support the project, with no streaks and no punishment for missing days.</p>
			<p>Timers are local pacing tools, not secure enforcement. The Black Market improves convenience and infrastructure; it does not buy raw damage, Alloy piles, or Front clears. For official Alloy assignments, see Command Orders.</p>
		</div>
	</section>

	<!-- Enemy Types -->
	<section class="help-section">
		<h2>👾 Enemy Types</h2>
		<div class="enemy-grid">
			<div class="enemy-card">
				<div class="enemy-shape square">■</div>
				<h3>Normal</h3>
				<p>Balanced stats. Most common enemy. Square outline.</p>
			</div>
			<div class="enemy-card">
				<div class="enemy-shape diamond">◆</div>
				<h3>Fast</h3>
				<p>1.8× Normal speed, half HP. Front 1: appears from wave 11. Diamond outline.</p>
			</div>
			<div class="enemy-card">
				<div class="enemy-shape hexagon">⬡</div>
				<h3>Tank</h3>
				<p>5× Normal HP, larger, 0.55× Normal speed. Front 1: appears from wave 50.</p>
			</div>
			<div class="enemy-card">
				<div class="enemy-shape triangle">▶</div>
				<h3>Ranged</h3>
				<p>Stops at 179 range, just inside starter tower range, and fires at the tower. Front 1: appears from wave 100.</p>
			</div>
			<div class="enemy-card boss">
				<div class="enemy-shape pentagon">⬠</div>
				<h3>Boss</h3>
				<p>20× Normal HP, larger than Tanks, pulsing aura. Every 10 waves with escorts.</p>
			</div>
		</div>
	</section>

	<!-- Foundry Upgrades -->
	<section class="help-section">
		<h2>⚙ Forge</h2>
		<p class="section-desc">The Forge sets the <strong>permanent starting level</strong> of your Field Upgrades, bought with Alloy (🔩). Combat upgrades share one curve with the in-deployment Field Upgrades: a Forge level is exactly the same as buying that many Field levels — same value, and the next in-run purchase continues from where the Forge left off. Research multiplies on top. Economy upgrades have no Field equivalent and stay permanent-only.</p>
		<h3 class="section-desc" style="margin-top:.5rem">Combat — starting Field levels (shared curve)</h3>
		<div class="card-grid">
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Damage</h3>
				<p>Seeds permanent starting level for in-run Damage Field Upgrade. Follows a Tower-like progression curve.</p>
				<span class="card-tag">Shared curve</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">❤️</div>
				<h3>Max HP</h3>
				<p>+100 max HP per level. Forge Lv.1 starts at 200 HP — exactly one in-run Max HP level.</p>
				<span class="card-tag">Shared curve</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">🔥</div>
				<h3>Attack Speed</h3>
				<p>+0.1 attacks/sec per level. Continues from the Forge level when you buy more in deployment.</p>
				<span class="card-tag">Shared curve</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">🎯</div>
				<h3>Range / Crit / Defense / …</h3>
				<p>Every shared combat stat (Range, Crit Chance, Crit Multiplier ×1.30 base, Defense, Regen, Lifesteal, Thorns) works the same way. Schematic-gated paths must be reconstructed first.</p>
				<span class="card-tag">Shared curve</span>
			</div>
		</div>
		<h3 class="section-desc" style="margin-top:.75rem">Economy — permanent income (Forge-only)</h3>
		<div class="card-grid">
			<div class="help-card ws">
				<div class="help-card-icon">🔩</div>
				<h3>Alloy Bonus</h3>
				<p>+1% more Alloy per kill per level. Permanent income boost.</p>
				<span class="card-tag">Max 1000</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Energy Bonus</h3>
				<p>+1% more Energy per kill per level. Faster field upgrades.</p>
				<span class="card-tag">Max 1000</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Starting Energy</h3>
				<p>+4 starting Energy per level. Apply early overclocks faster.</p>
				<span class="card-tag">Max 99</span>
			</div>
		</div>
	</section>

	<!-- Weekly Orbital Command Orders -->
	<section class="help-section">
		<h2>🛰 Command Orders</h2>
		<p class="section-desc">Official weekly assignments that reward Alloy (🔩) — separate from the Black Market. Find them under <strong>Command Orders</strong> in Orbital Command.</p>
		<div class="lore-box">
			<p>Each local week, Command issues a deterministic pool of assignments. <strong>5 are visible at a time</strong> on the order board; claim a completed one and the next is revealed. You can complete up to <strong>25 per week</strong>, and they progress through normal play (kills, waves, purchases, …).</p>
			<p>The order board refreshes every <strong>4 hours</strong>, but only fills empty slots — started orders (with partial progress) and completed-but-unclaimed orders are never removed. This means you do not need to complete all 25 in one sitting — spread them across the week at your own pace.</p>
			<p>Completed orders move to a separate <strong>Completed</strong> section where they can be claimed individually or all at once via <strong>Claim All</strong>. Claiming an order increases your weekly Command Favor and may unlock a Gift Box.</p>
			<p>Every <strong>5 completed orders</strong> unlocks a <strong>Command Gift Box</strong> (more Alloy) — at 5, 10, 15, 20, and 25. Rewards are Alloy only; no Strange Matter, no premium currency.</p>
			<p>Command favor resets weekly. Missed days are not prosecuted. Usually. No streaks, no FOMO, no punishment for skipping a day.</p>
		</div>
	</section>

	<!-- Research Deck -->
	<section class="help-section">
		<h2>🔬 Research Deck</h2>
		<p class="section-desc">Long-term orbital research projects bought with Alloy (🔩). Each level gives a permanent % bonus that stacks with Forge upgrades.</p>
		<div class="card-grid">
			<div class="help-card lab">
				<div class="help-card-icon">🔬</div>
				<h3>Damage Research</h3>
				<p>+5% damage per level. Multiplies all damage sources.</p>
				<span class="card-tag">Max 199</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">⚡</div>
				<h3>Attack Speed Research</h3>
				<p>+3% fire rate per level. Multiplies attack speed.</p>
				<span class="card-tag">Max 149</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">❤️</div>
				<h3>Health Research</h3>
				<p>+5% max HP per level. Multiplies all HP sources.</p>
				<span class="card-tag">Max 199</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">🔩</div>
				<h3>Alloy Research</h3>
				<p>+3% alloy gain per level. More alloy from all sources.</p>
				<span class="card-tag">Max 199</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">⚡</div>
				<h3>Energy Research</h3>
				<p>+3% energy gain per level. More energy from kills and waves.</p>
				<span class="card-tag">Max 199</span>
			</div>
		</div>
	</section>

	<!-- Fronts -->
	<section class="help-section">
		<h2>🌍 Fronts (16 across 4 bands)</h2>
		<p class="section-desc">Sixteen Fronts, grouped into four bands of four. Each Front spawns denser waves (more enemies, more Energy, more shiny chances) and drops its own <strong>Schematics</strong>. Most Fronts unlock at <strong>Wave 100</strong> on the previous one; crossing into a new band is the hard wall — <strong>Wave 200</strong> into Redline, <strong>Wave 300</strong> into Blacksite, <strong>Wave 400</strong> into Anomaly.</p>
		<div class="card-grid">
			<div class="help-card tier">
				<div class="help-card-icon">🛡️</div>
				<h3>Perimeter · Fronts 1–4</h3>
				<p>Entry combat zone — clean military blue/cyan. Mechanics arrive slowly: Basic only through Wave 9, then Runner, Bulwark, Needle. No Armor, no Resistance.</p>
				<span class="card-tag">★ 0–3</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">🔥</div>
				<h3>Redline · Fronts 5–8</h3>
				<p>Harsher war zone — red/orange. <strong>Armor</strong> first appears late on Front 5 (~Wave 100 / Boss 10), then grows more frequent from Front 6 onward.</p>
				<span class="card-tag">★ 0–3</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">🟣</div>
				<h3>Blacksite · Fronts 9–12</h3>
				<p>Classified — purple/magenta. Armor and <strong>Resistance</strong> scaffolding become part of the Front identity. Damage types begin to matter from Front 10.</p>
				<span class="card-tag">★ 0–3</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">🌟</div>
				<h3>Anomaly · Fronts 13–16</h3>
				<p>Unstable endgame — white/prismatic/crimson. Immunities and extreme modifiers may appear. Balance here is aspirational and still being tuned.</p>
				<span class="card-tag">★ 0–3</span>
			</div>
		</div>
	</section>

	<!-- Special Operations -->
	<section class="help-section">
		<h2>⚡ Special Operations</h2>
		<p class="section-desc">Tactical exercises with modified engagement rules. Unlock them by reaching Tier 2 (wave 100). Each operation has its own high score.</p>
		<div class="card-grid">
			<div class="help-card challenge">
				<div class="help-card-icon">🌪️</div>
				<h3>Fast Swarm</h3>
				<p>All enemies are Fast type. Double speed. Triple spawn rate. Pure chaos — survive as long as you can.</p>
			</div>
			<div class="help-card challenge">
				<div class="help-card-icon">🔮</div>
				<h3>Glass Tower</h3>
				<p>Tower has only 1 HP. Enemies are 50% weaker. Double coin rewards. High risk, high reward.</p>
			</div>
			<div class="help-card challenge">
				<div class="help-card-icon">👑</div>
				<h3>Boss Rush</h3>
				<p>Every wave is a boss wave. Increased boss rewards. Test your single-target damage.</p>
			</div>
		</div>
	</section>

	<!-- Field Upgrades -->
	<section class="help-section">
		<h2>⚡ Field Upgrades (Overclocks)</h2>
		<p class="section-desc">Temporary overclocks powered by Energy (⚡) during a deployment. They expire when the tower is destroyed. Three categories to choose from.</p>
		<div class="upgrade-table">
			<div class="ut-header"><span>Category</span><span>Upgrades</span><span>Cap</span></div>
			<div class="ut-row"><span>⚔️ Offense</span><span>Damage, Attack Speed, Range, Multishot Chance, Multishot Targets, Crit Chance, Crit Multiplier</span><span>Crit 75%</span></div>
			<div class="ut-row"><span>🛡️ Defense</span><span>Defense (flat damage reduction), Max HP</span><span>Max level only</span></div>
			<div class="ut-row"><span>🔧 Utility</span><span>Energy Amp (+% energy per kill)</span><span>75% cap</span></div>
		</div>
	</section>

	<!-- Controls -->
	<section class="help-section">
		<h2>🎮 Controls</h2>
		<div class="controls-grid">
			<div class="control-item"><kbd>Space</kbd><span>⏸ Pause / Resume</span></div>
			<div class="control-item"><kbd>1</kbd><span>🐢 Speed 1×</span></div>
			<div class="control-item"><kbd>2</kbd><span>🏃 Speed 2×</span></div>
			<div class="control-item"><kbd>3</kbd><span>🚀 Speed 3×</span></div>
			<div class="control-item"><kbd>4</kbd><span>⚡ Speed 5×</span></div>
		</div>
		<button class="replay-tutorial-btn" onclick={() => replayTutorial('flatland-td-tutorial-done', 'Deployment')}>🔄 Replay Deployment Tutorial</button>
		<button class="replay-tutorial-btn" onclick={() => replayTutorial('flatland-td-hub-tutorial-done', 'Orbital Command')}>🛰️ Replay Hub Tutorial</button>
		{#if replayMsg}<p class="replay-msg">{replayMsg}</p>{/if}
	</section>

	<!-- FAQ -->
	<section class="help-section">
		<h2>❓ Frequently Asked Questions</h2>
		<div class="faq-list">
			{#each faqs as faq}
				<div class="faq-item" class:open={activeFaq === faq.id}>
					<button
						id="faq-btn-{faq.id}"
						class="faq-question"
						aria-expanded={activeFaq === faq.id}
						aria-controls="faq-panel-{faq.id}"
						onclick={() => activeFaq = activeFaq === faq.id ? null : faq.id}
					>
						<span>{faq.q}</span>
						<span class="faq-arrow" aria-hidden="true">{activeFaq === faq.id ? '▾' : '▸'}</span>
					</button>
					{#if activeFaq === faq.id}
						<div
							id="faq-panel-{faq.id}"
							class="faq-answer"
							role="region"
							aria-labelledby="faq-btn-{faq.id}"
						><p>{faq.a}</p></div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Lore easter egg -->
	<section class="help-section">
		<div class="lore-egg">
			<p><strong>🔒 Orbital Command Internal Memo — EYES ONLY</strong></p>
			<p>Field report FR-2144-D suggests the first hostile Shape may have been responding to a misrouted supply beacon. The Geometry Liaison Office was dissolved shortly after the incident. All related records have been reclassified as "simulation data."</p>
			<p>Additionally, Front 04 was never opened for deployment. Orbital Command maintains this is a navigation hazard. Independent analysts note the Front's coordinates correspond precisely to a former Procurement audit office.</p>
			<p class="lore-egg-class">Classification: Redacted · Clearance: None · This memo does not exist.</p>
		</div>
	</section>

	<footer class="help-footer">
		<p>Still have questions? Open an issue on <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener">GitHub</a>.</p>
	</footer>
</div>

<style>
	.help-page { min-height:100vh; padding:2rem 1.5rem; max-width:860px; margin:0 auto; overflow-y:auto; position:relative; }
	.back-link { display:inline-flex; align-items:center; gap:.35rem; color:var(--text-dim); margin-bottom:1.25rem; font-size:var(--fs-body-sm); transition:all var(--transition-fast); position:relative; z-index:1; padding:.3rem .65rem; border-radius:var(--radius-sm); border:1px solid transparent; text-decoration:none; }
	.back-link:hover { color:var(--cyan); border-color:var(--border-neon); background:rgba(0,255,255,.04); }
	.help-header,.help-section { position:relative; z-index:1; margin-bottom:2rem; }
	.help-header { padding:2rem; }
	.help-header h1 { font-size:var(--fs-hero); background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:.4rem; }
	.help-header p { color:var(--text-secondary); font-size:var(--fs-body); }
	.help-section h2 { font-size:var(--fs-heading); color:var(--text-primary); margin-bottom:.45rem; }
	.section-desc { font-size:var(--fs-body-sm); color:var(--text-secondary); margin-bottom:.85rem; padding-bottom:.5rem; border-bottom:1px solid var(--border-neon); line-height:1.6; }
	.help-steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.65rem; }
	.help-step { display:flex; gap:.75rem; padding:1rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.help-step-num { width:28px; height:28px; border-radius:50%; background:rgba(0,255,255,.1); border:1px solid var(--border-neon); display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700; color:var(--cyan); flex-shrink:0; }
	.help-step-content h3 { font-size:var(--fs-body-sm); color:var(--text-primary); margin-bottom:.2rem; }
	.help-step-content p { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.6; }
	.help-step-content a { color:var(--cyan); }

	/* Lore */
	.lore-box { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); padding:1.5rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.lore-box p { font-size:var(--fs-body); color:var(--text-secondary); line-height:1.7; margin-bottom:.75rem; }
	.lore-box p strong { color:var(--text-primary); }
	.lore-box p:last-of-type { margin-bottom:1.25rem; }
	.lore-mechanics { display:flex; flex-direction:column; gap:.5rem; }
	.lore-m { display:flex; gap:.75rem; align-items:flex-start; padding:.65rem .75rem; background:var(--bg-tertiary); border:1px solid rgba(0,255,255,.06); border-radius:var(--radius-sm); }
	.lore-mi { font-size:1.25rem; flex-shrink:0; margin-top:1px; }
	.lore-icon-img { width:30px; height:30px; }
	.lore-m div { display:flex; flex-direction:column; gap:.1rem; }
	.lore-m strong { font-size:var(--fs-body-sm); color:var(--text-primary); }
	.lore-m span { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.5; }

	/* Currencies */
	.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
	.info-card { padding:1.25rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); text-align:center; position:relative; overflow:hidden; }
	.info-card.gold { border-color:rgba(0,255,255,.3); }
	.info-card.coin { border-color:rgba(255,221,68,.3); }
	.info-icon { font-size:2rem; margin-bottom:.3rem; display:block; }
	.info-card h3 { font-size:var(--fs-subheading); color:var(--text-primary); margin-bottom:.2rem; }
	.info-badge { display:inline-block; font-size:var(--fs-caption-sm); font-weight:600; padding:.15rem .5rem; border-radius:100px; background:rgba(0,255,255,.08); color:var(--cyan); margin-bottom:.55rem; text-transform:uppercase; letter-spacing:.05em; font-family:var(--font-mono); }
	.info-card p { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.6; }

	/* Enemy Types */
	.enemy-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:.6rem; }
	.enemy-card { padding:.85rem .6rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; transition:all var(--transition-fast); }
	.enemy-card:hover { border-color:var(--border-neon-strong); transform:translateY(-2px); box-shadow:var(--shadow-neon-sm); }
	.enemy-card.boss { border-color:rgba(255,68,170,.25); }
	.enemy-shape { font-size:1.8rem; margin-bottom:.3rem; display:block; }
	.enemy-shape.square { color:var(--cyan); }
	.enemy-shape.diamond { color:var(--green); }
	.enemy-shape.hexagon { color:var(--violet); }
	.enemy-shape.triangle { color:var(--orange); }
	.enemy-shape.pentagon { color:var(--pink); }
	.enemy-card h3 { font-size:var(--fs-body-sm); color:var(--text-primary); margin-bottom:.2rem; }
	.enemy-card p { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.4; }

	/* Generic Card Grid (Workshop, Lab, Tiers, Challenges) */
	.card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:.65rem; }
	.help-card { padding:.9rem .75rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; transition:all var(--transition-fast); position:relative; overflow:hidden; }
	.help-card:hover { border-color:var(--border-neon-strong); transform:translateY(-2px); box-shadow:var(--shadow-neon-sm); }
	.help-card-icon { font-size:1.6rem; margin-bottom:.3rem; display:block; }
	.help-card h3 { font-size:var(--fs-body-sm); color:var(--text-primary); margin-bottom:.25rem; line-height:1.3; }
	.help-card p { font-size:var(--fs-caption); color:var(--text-secondary); line-height:1.45; }
	.card-tag { display:inline-block; font-size:var(--fs-caption-sm); font-family:var(--font-mono); color:var(--cyan); background:rgba(0,255,255,.06); padding:.12rem .45rem; border-radius:100px; margin-top:.35rem; }

	/* Card color variants */
	.help-card.ws { border-color:rgba(0,255,255,.15); }
	.help-card.ws:hover { border-color:rgba(0,255,255,.4); }
	.help-card.lab { border-color:rgba(136,68,255,.2); }
	.help-card.lab:hover { border-color:rgba(136,68,255,.45); }
	.help-card.tier { border-color:rgba(255,221,68,.15); }
	.help-card.tier:hover { border-color:rgba(255,221,68,.4); }
	.help-card.challenge { border-color:rgba(255,68,170,.2); }
	.help-card.challenge:hover { border-color:rgba(255,68,170,.45); }

	/* Upgrade Table */
	.upgrade-table { border:1px solid var(--border-neon); border-radius:var(--radius-md); overflow:hidden; }
	.ut-header,.ut-row { display:grid; grid-template-columns:120px 1fr 100px; gap:.6rem; padding:.55rem .75rem; font-size:var(--fs-caption); align-items:center; }
	.ut-header { background:var(--bg-tertiary); color:var(--cyan); font-weight:600; font-family:var(--font-mono); font-size:var(--fs-caption-sm); text-transform:uppercase; }
	.ut-row { border-top:1px solid rgba(0,255,255,.06); color:var(--text-secondary); }
	.ut-row span:first-child { color:var(--text-primary); font-weight:500; }

	/* Controls */
	.controls-grid { display:flex; flex-wrap:wrap; gap:.5rem; padding:.3rem 0; }
	.control-item { display:flex; align-items:center; gap:.5rem; padding:.4rem .75rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.control-item kbd { padding:.1rem .4rem; background:var(--bg-primary); border-radius:3px; font-family:var(--font-mono); font-size:var(--fs-caption); border:1px solid var(--border-neon); color:var(--cyan); }
	.control-item span { font-size:var(--fs-body-sm); color:var(--text-secondary); }

	/* FAQ */
	.faq-list { display:flex; flex-direction:column; gap:.35rem; }
	.faq-item { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); overflow:hidden; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.faq-item.open { border-color:var(--border-neon-strong); }
	.faq-question { display:flex; justify-content:space-between; align-items:center; width:100%; padding:.9rem 1rem; font-size:var(--fs-body); color:var(--text-primary); text-align:left; cursor:pointer; transition:background var(--transition-fast); }
	.faq-question:hover { background:rgba(0,255,255,.03); }
	.faq-arrow { color:var(--text-dim); font-size:var(--fs-caption); margin-left:.5rem; flex-shrink:0; }
	.faq-answer { padding:0 1rem .9rem; }
	.faq-answer p { font-size:var(--fs-body-sm); color:var(--text-secondary); line-height:1.6; }
	.help-footer { text-align:center; padding:2rem 0; color:var(--text-dim); font-size:var(--fs-caption); position:relative; z-index:1; }
	.help-footer a { color:var(--cyan); }

	.replay-tutorial-btn { margin-top:.75rem; margin-right:.5rem; padding:.55rem 1.2rem; font-size:var(--fs-body-sm); border-radius:var(--radius-sm); background:transparent; border:1px solid var(--border-neon); color:var(--text-secondary); cursor:pointer; transition:all var(--transition-fast); }
	.replay-tutorial-btn:hover { border-color:var(--cyan); color:var(--text-primary); }
	.replay-msg { margin-top:.4rem; font-size:var(--fs-caption); color:var(--green); }

	.lore-egg {
		padding: 1rem 1.25rem;
		background: rgba(255, 68, 68, 0.03);
		border: 1px solid rgba(255, 68, 68, 0.1);
		border-radius: var(--radius-sm);
		font-size: clamp(0.68rem,0.85vw,0.75rem);
		color: rgba(255, 68, 68, 0.55);
		line-height: 1.6;
	}

	.lore-egg p {
		margin-bottom: 0.4rem;
	}

	.lore-egg p strong {
		color: rgba(255, 68, 68, 0.65);
	}

	.lore-egg-class {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: rgba(255, 68, 68, 0.35);
		margin-top: 0.4rem;
	}

	@media(max-width:767px) {
		.help-page{padding:1rem;max-width:100%}
		.help-steps{grid-template-columns:1fr}
		.info-grid{grid-template-columns:1fr}
		.enemy-grid{grid-template-columns:repeat(3,1fr)}
		.card-grid{grid-template-columns:repeat(2,1fr)}
		.upgrade-table{font-size:.65rem}
		.ut-header,.ut-row{grid-template-columns:80px 1fr 70px;padding:.35rem .45rem}
	}
</style>
