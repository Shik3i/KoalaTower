<script lang="ts">
	let activeFaq = $state<string | null>(null);

	const faqs = [
		{
			id: 'start',
			q: 'How do I start playing?',
			a: 'Go to Deployment and click "Launch Deployment". A tower is dropped from orbit into Flatland. Enemies spawn from the edges and move toward it. The tower fires automatically at the nearest shape. Spend Energy (⚡) on temporary Field Upgrades during the deployment, and refine Alloy (🔩) for permanent Forge upgrades between deployments. Every deployment ends eventually. Officially, this is called data collection.',
		},
		{
			id: 'currencies',
			q: 'What are Energy and Alloy?',
			a: 'Energy (⚡) is harvested from destroyed shapes during a deployment. It powers temporary Field Overclocks and is lost when the tower is destroyed. Orbital Command regrets to confirm that raw energy transmission remains "budgetarily unfeasible." Alloy (🔩) is refined from shape remnants — dense, stable, and transmits perfectly. It is permanent, spent in the Forge and Research Deck. Alloy survives the deployment. So does the paperwork.',
		},
		{
			id: 'enemies',
			q: 'What enemy types exist?',
			a: 'Five types, each with a unique outline shape: ■ Square = Normal (balanced, confident), ◆ Diamond = Fast (quick, low HP, no patience), ⬡ Hexagon = Tank (slow, high HP, geometrically dense), ▶ Triangle = Ranged (stops at range, shoots from a distance, legally classified as aggressive), ⬠ Pentagon = Boss (appears every 10 waves with escorts, high HP and damage, extremely entitled). Watch their shapes to identify them instantly.',
		},
		{
			id: 'bosses',
			q: 'How do boss waves work?',
			a: 'Every 10th wave is a boss wave. Escort enemies spawn first, then the Prime Shape appears last. Bosses are larger, have a pulsing aura ring, and deal heavy damage. Killing a boss triggers a screen shake and extra particle effects. Boss rewards are significantly higher. The geometric chain of command has been disrupted.',
		},
		{
			id: 'battle-upgrades',
			q: 'How do Field Upgrades work?',
			a: 'During a deployment, the right panel shows Field Upgrades in three categories: Offense (Damage, Attack Speed, Range, Multishot Chance, Multishot Targets, Crit Chance, Crit Multiplier), Defense (Defense, Max HP), Utility (Energy Amp). Spend Energy (⚡) to overclock your tower. All Field Upgrades are lost when the tower is destroyed. Orbital Command describes this as "performance-based incentive architecture."',
		},
		{
			id: 'upgrade-caps',
			q: 'Do Field Upgrades have limits?',
			a: 'Yes. Percentage-based Field Upgrades have hard caps: Multishot Chance at 50%, Crit Chance at 45%. Flat upgrades (Damage, Attack Speed, Range, Defense, HP) have high max levels. The UI shows MAXED at the cap. Even the Tower has limits. It has been informed of this regulation.',
		},
		{
			id: 'workshop',
			q: 'What is the Forge?',
			a: 'The Forge (⚙) contains permanent pre-installed tower upgrades bought with Alloy (🔩): Base Damage, Base Fire Rate, Base Range, Starting HP, Alloy Bonus, Energy Bonus, Crit Bonus, Starting Energy. These improve the tower blueprint and apply to every deployment. Blueprints do not make you stronger by themselves. They authorize new ways to make questionable decisions.',
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
			a: 'Waves are endless. Enemy HP, damage, and speed increase gradually. Armor (damage reduction) appears after wave 10 and caps at 70%. More enemy types unlock at higher waves: Fast at wave 3, Tank at wave 5, Ranged at wave 8. Keep upgrading to survive. The swarm is learning. So is the Tower. One of them is better at it.',
		},
		{
			id: 'save',
			q: 'How do I save my progress?',
			a: 'Auto-saved to your browser (IndexedDB). You can also export/import your save as JSON from the 💾 menu. All data is stored locally — no cloud, no backend, no account needed. Editing saves is technically possible. Orbital Command cannot stop you from rewriting reality. It can only confirm that doing so makes the war considerably less interesting.',
		},
		{
			id: 'privacy',
			q: 'Is my data private?',
			a: 'Yes. Flatland TD is a static app with no backend. All data is in your browser. No analytics, no cookies, no tracking, no external network calls during gameplay. Not even the Shapes know your high score. See the Privacy page for full details.',
		},
	];
</script>

<svelte:head>
	<title>Help — Flatland TD · FLTD</title>
	<meta name="description" content="Flatland TD help guide and FAQ. Learn about currencies, enemy types, upgrades, bosses, and game mechanics." />
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
						<span>Your permanent base between deployments. The Forge pre-installs upgrades, the Research Deck runs orbital projects (results are sanitized for morale reasons), and Blueprints unlock new capabilities — assuming Procurement has not lost them.</span>
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
						<span>Each Front has different swarm density. From peaceful frontier zones (Front 01) to deep-swarm territory. Fronts 04, 07, and 09 exist but have been omitted from public charts for morale reasons. Deeper fronts offer greater rewards — and more geometry.</span>
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
				<p>Harvested from destroyed shapes during a deployment. Spent on <strong>Field Overclocks</strong> to supercharge the tower. Lost when the tower is destroyed. Boosted by <strong>Energy Amp</strong> and <strong>Energy Bonus</strong> Forge upgrades.</p>
			</div>
			<div class="info-card coin">
				<div class="info-icon">🔩</div>
				<h3>Alloy</h3>
				<span class="info-badge">Permanent</span>
				<p>Refined from shape remnants. Spent at the <strong>Forge</strong> for pre-installed tower upgrades and on the <strong>Research Deck</strong> for orbital projects. Boosted by <strong>Alloy Bonus</strong>. Persists forever across all deployments.</p>
			</div>
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
				<p>High speed, low HP. Appears from wave 3. Diamond outline.</p>
			</div>
			<div class="enemy-card">
				<div class="enemy-shape hexagon">⬡</div>
				<h3>Tank</h3>
				<p>Slow, high HP. Appears from wave 5. Hexagon outline.</p>
			</div>
			<div class="enemy-card">
				<div class="enemy-shape triangle">▶</div>
				<h3>Ranged</h3>
				<p>Stops at distance, shoots at tower. Appears from wave 8. Triangle outline.</p>
			</div>
			<div class="enemy-card boss">
				<div class="enemy-shape pentagon">⬠</div>
				<h3>Boss</h3>
				<p>Large, pulsing aura. Appears every 10 waves with escorts. Pentagon outline.</p>
			</div>
		</div>
	</section>

	<!-- Foundry Upgrades -->
	<section class="help-section">
		<h2>⚙ Forge</h2>
		<p class="section-desc">Permanent pre-installed tower upgrades bought with Alloy (🔩). Each level is built into the tower blueprint before deployment.</p>
		<div class="card-grid">
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Base Damage</h3>
				<p>+5 damage per level. Core scaling stat — invest heavily.</p>
				<span class="card-tag">Max 499</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">🔥</div>
				<h3>Base Fire Rate</h3>
				<p>+0.025 attacks/sec per level. Scales DPS significantly.</p>
				<span class="card-tag">Max 299</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">🎯</div>
				<h3>Base Range</h3>
				<p>+2 range per level. See and target enemies sooner.</p>
				<span class="card-tag">Max 149</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">❤️</div>
				<h3>Starting HP</h3>
				<p>+12 max HP per level. Survive longer each run.</p>
				<span class="card-tag">Max 399</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">🔩</div>
				<h3>Alloy Bonus</h3>
				<p>+1.5% more Alloy per kill per level. Permanent income boost.</p>
				<span class="card-tag">Max 299</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Energy Bonus</h3>
				<p>+1.5% more Energy per kill per level. Faster field upgrades.</p>
				<span class="card-tag">Max 199</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">⭐</div>
				<h3>Crit Bonus</h3>
				<p>+0.5% base crit chance per level. Caps at 30% base.</p>
				<span class="card-tag">Max 59</span>
			</div>
			<div class="help-card ws">
				<div class="help-card-icon">⚡</div>
				<h3>Starting Energy</h3>
				<p>+8 starting Energy per level. Apply early overclocks faster.</p>
				<span class="card-tag">Max 99</span>
			</div>
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
				<p>+3% damage per level. Multiplies all damage sources.</p>
				<span class="card-tag">Max 199</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">⚡</div>
				<h3>Attack Speed Research</h3>
				<p>+2% fire rate per level. Multiplies attack speed.</p>
				<span class="card-tag">Max 149</span>
			</div>
			<div class="help-card lab">
				<div class="help-card-icon">❤️</div>
				<h3>Health Research</h3>
				<p>+3% max HP per level. Multiplies all HP sources.</p>
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
		<h2>🌍 Fronts (Planets)</h2>
		<p class="section-desc">Each Front is a different planet with increasing enemy density. Push deeper waves to unlock harder Fronts with better Alloy rewards.</p>
		<div class="card-grid">
			<div class="help-card tier">
				<div class="help-card-icon">🏗️</div>
				<h3>Tier 1: The Awakening</h3>
				<p>Baseline difficulty (1× HP, 1× ATK). Learn the basics, farm coins, build your workshop. Unlocked from the start.</p>
				<span class="card-tag">Wave 0+</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">🌊</div>
				<h3>Tier 2: Neon Storm</h3>
				<p>3× enemy HP, 2× enemy damage, 2.5× rewards. First real difficulty jump — requires workshop investment.</p>
				<span class="card-tag">Wave 100+</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">💻</div>
				<h3>Tier 3: Digital Onslaught</h3>
				<p>8× enemy HP, 4.5× enemy damage, 5× rewards. Significant workshop and lab required.</p>
				<span class="card-tag">Wave 500+</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">⚛️</div>
				<h3>Tier 4: Quantum Surge</h3>
				<p>22× enemy HP, 10× enemy damage, 12× rewards. Deep progression territory.</p>
				<span class="card-tag">Wave 1500+</span>
			</div>
			<div class="help-card tier">
				<div class="help-card-icon">🌟</div>
				<h3>Tier 5: Geo Ascension</h3>
				<p>55× enemy HP, 22× enemy damage, 25× rewards. Endgame aspirational tier.</p>
				<span class="card-tag">Wave 3000+</span>
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
			<div class="ut-row"><span>⚔️ Offense</span><span>Damage, Attack Speed, Range, Multishot Chance, Multishot Targets, Crit Chance, Crit Multiplier</span><span>% ones capped</span></div>
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
	</section>

	<!-- FAQ -->
	<section class="help-section">
		<h2>❓ Frequently Asked Questions</h2>
		<div class="faq-list">
			{#each faqs as faq}
				<div class="faq-item" class:open={activeFaq === faq.id}>
					<button class="faq-question" onclick={() => activeFaq = activeFaq === faq.id ? null : faq.id}>
						<span>{faq.q}</span>
						<span class="faq-arrow">{activeFaq === faq.id ? '▾' : '▸'}</span>
					</button>
					{#if activeFaq === faq.id}
						<div class="faq-answer"><p>{faq.a}</p></div>
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
		<p>Still have questions? Open an issue on <a href="https://github.com/Shik3i/KoalaTower/issues" target="_blank" rel="noopener">GitHub</a>.</p>
	</footer>
</div>

<style>
	.help-page { min-height:100vh; padding:2rem 1.5rem; max-width:860px; margin:0 auto; overflow-y:auto; position:relative; }
	.bg-grid { position:fixed; inset:0; background-image:linear-gradient(rgba(0,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,.02) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
	.back-link { display:inline-flex; align-items:center; gap:.35rem; color:var(--text-dim); margin-bottom:1.25rem; font-size:.82rem; transition:all var(--transition-fast); position:relative; z-index:1; padding:.3rem .65rem; border-radius:var(--radius-sm); border:1px solid transparent; text-decoration:none; }
	.back-link:hover { color:var(--cyan); border-color:var(--border-neon); background:rgba(0,255,255,.04); }
	.help-header,.help-section { position:relative; z-index:1; margin-bottom:2rem; }
	.help-header { padding:2rem; }
	.help-header h1 { font-size:clamp(1.4rem,2.8vw,2rem); background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:.4rem; }
	.help-header p { color:var(--text-secondary); font-size:clamp(0.85rem,1.2vw,0.95rem); }
	.help-section h2 { font-size:clamp(1rem,1.8vw,1.3rem); color:var(--text-primary); margin-bottom:.45rem; }
	.section-desc { font-size:clamp(0.78rem,1vw,0.88rem); color:var(--text-secondary); margin-bottom:.85rem; padding-bottom:.5rem; border-bottom:1px solid var(--border-neon); line-height:1.6; }
	.help-steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.65rem; }
	.help-step { display:flex; gap:.75rem; padding:1rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.help-step-num { width:28px; height:28px; border-radius:50%; background:rgba(0,255,255,.1); border:1px solid var(--border-neon); display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700; color:var(--cyan); flex-shrink:0; }
	.help-step-content h3 { font-size:clamp(0.82rem,1.1vw,0.92rem); color:var(--text-primary); margin-bottom:.2rem; }
	.help-step-content p { font-size:clamp(0.75rem,1vw,0.85rem); color:var(--text-secondary); line-height:1.6; }
	.help-step-content a { color:var(--cyan); }

	/* Lore */
	.lore-box { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); padding:1.5rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.lore-box p { font-size:clamp(0.82rem,1.1vw,0.92rem); color:var(--text-secondary); line-height:1.7; margin-bottom:.75rem; }
	.lore-box p strong { color:var(--text-primary); }
	.lore-box p:last-of-type { margin-bottom:1.25rem; }
	.lore-mechanics { display:flex; flex-direction:column; gap:.5rem; }
	.lore-m { display:flex; gap:.75rem; align-items:flex-start; padding:.65rem .75rem; background:var(--bg-tertiary); border:1px solid rgba(0,255,255,.06); border-radius:var(--radius-sm); }
	.lore-mi { font-size:1.25rem; flex-shrink:0; margin-top:1px; }
	.lore-icon-img { width:30px; height:30px; }
	.lore-m div { display:flex; flex-direction:column; gap:.1rem; }
	.lore-m strong { font-size:clamp(0.75rem,1vw,0.85rem); color:var(--text-primary); }
	.lore-m span { font-size:clamp(0.68rem,0.9vw,0.78rem); color:var(--text-secondary); line-height:1.5; }

	/* Currencies */
	.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
	.info-card { padding:1.25rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); text-align:center; position:relative; overflow:hidden; }
	.info-card.gold { border-color:rgba(0,255,255,.3); }
	.info-card.coin { border-color:rgba(255,221,68,.3); }
	.info-icon { font-size:2rem; margin-bottom:.3rem; display:block; }
	.info-card h3 { font-size:clamp(0.85rem,1.2vw,1rem); color:var(--text-primary); margin-bottom:.2rem; }
	.info-badge { display:inline-block; font-size:.65rem; font-weight:600; padding:.15rem .5rem; border-radius:100px; background:rgba(0,255,255,.08); color:var(--cyan); margin-bottom:.55rem; text-transform:uppercase; letter-spacing:.05em; font-family:var(--font-mono); }
	.info-card p { font-size:clamp(0.72rem,0.95vw,0.82rem); color:var(--text-secondary); line-height:1.6; }

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
	.enemy-card h3 { font-size:clamp(0.72rem,1vw,0.82rem); color:var(--text-primary); margin-bottom:.2rem; }
	.enemy-card p { font-size:clamp(0.62rem,0.85vw,0.72rem); color:var(--text-secondary); line-height:1.4; }

	/* Generic Card Grid (Workshop, Lab, Tiers, Challenges) */
	.card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:.65rem; }
	.help-card { padding:.9rem .75rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; transition:all var(--transition-fast); position:relative; overflow:hidden; }
	.help-card:hover { border-color:var(--border-neon-strong); transform:translateY(-2px); box-shadow:var(--shadow-neon-sm); }
	.help-card-icon { font-size:1.6rem; margin-bottom:.3rem; display:block; }
	.help-card h3 { font-size:clamp(0.72rem,1vw,0.85rem); color:var(--text-primary); margin-bottom:.25rem; line-height:1.3; }
	.help-card p { font-size:clamp(0.62rem,0.85vw,0.75rem); color:var(--text-secondary); line-height:1.45; }
	.card-tag { display:inline-block; font-size:clamp(0.55rem,0.7vw,0.62rem); font-family:var(--font-mono); color:var(--cyan); background:rgba(0,255,255,.06); padding:.12rem .45rem; border-radius:100px; margin-top:.35rem; }

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
	.ut-header,.ut-row { display:grid; grid-template-columns:120px 1fr 100px; gap:.6rem; padding:.55rem .75rem; font-size:clamp(0.7rem,0.9vw,0.8rem); align-items:center; }
	.ut-header { background:var(--bg-tertiary); color:var(--cyan); font-weight:600; font-family:var(--font-mono); font-size:clamp(0.62rem,0.8vw,0.7rem); text-transform:uppercase; }
	.ut-row { border-top:1px solid rgba(0,255,255,.06); color:var(--text-secondary); }
	.ut-row span:first-child { color:var(--text-primary); font-weight:500; }

	/* Controls */
	.controls-grid { display:flex; flex-wrap:wrap; gap:.5rem; padding:.3rem 0; }
	.control-item { display:flex; align-items:center; gap:.5rem; padding:.4rem .75rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.control-item kbd { padding:.1rem .4rem; background:var(--bg-primary); border-radius:3px; font-family:var(--font-mono); font-size:clamp(0.65rem,0.85vw,0.72rem); border:1px solid var(--border-neon); color:var(--cyan); }
	.control-item span { font-size:clamp(0.72rem,0.95vw,0.82rem); color:var(--text-secondary); }

	/* FAQ */
	.faq-list { display:flex; flex-direction:column; gap:.35rem; }
	.faq-item { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); overflow:hidden; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.faq-item.open { border-color:var(--border-neon-strong); }
	.faq-question { display:flex; justify-content:space-between; align-items:center; width:100%; padding:.9rem 1rem; font-size:clamp(0.78rem,1.1vw,0.9rem); color:var(--text-primary); text-align:left; cursor:pointer; transition:background var(--transition-fast); }
	.faq-question:hover { background:rgba(0,255,255,.03); }
	.faq-arrow { color:var(--text-dim); font-size:.75rem; margin-left:.5rem; flex-shrink:0; }
	.faq-answer { padding:0 1rem .9rem; }
	.faq-answer p { font-size:clamp(0.75rem,1vw,0.85rem); color:var(--text-secondary); line-height:1.6; }
	.help-footer { text-align:center; padding:2rem 0; color:var(--text-dim); font-size:clamp(0.72rem,0.9vw,0.82rem); position:relative; z-index:1; }
	.help-footer a { color:var(--cyan); }

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
