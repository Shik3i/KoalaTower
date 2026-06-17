<script lang="ts">
	let activeFaq = $state<string | null>(null);

	const faqs = [
		{
			id: 'start',
			q: 'How do I start playing?',
			a: 'Go to Deployment and click "Launch Deployment". A GeoCore tower is dropped from orbit. Enemies spawn from the edges and move toward it. The tower fires automatically at the nearest enemy. Spend Energy (⚡) on temporary Field Upgrades during the deployment, and refine Alloy (🔩) for permanent Forge upgrades between deployments.',
		},
		{
			id: 'currencies',
			q: 'What are Energy and Alloy?',
			a: 'Energy (⚡) is harvested from destroyed enemies during a deployment. It powers temporary Field Overclocks and is lost when the GeoCore is destroyed. Alloy (🔩) is refined from enemy remnants and beamed back to Orbital Command. It is permanent — spent in the Forge and Research Deck.',
		},
		{
			id: 'enemies',
			q: 'What enemy types exist?',
			a: 'Five types, each with a unique outline shape: ■ Square = Normal (balanced), ◆ Diamond = Fast (quick, low HP), ⬡ Hexagon = Tank (slow, high HP), ▶ Triangle = Ranged (stops at range, shoots from distance), ⬠ Pentagon = Boss (appears every 10 waves with escorts, high HP and damage). Watch their shapes to identify them instantly.',
		},
		{
			id: 'bosses',
			q: 'How do boss waves work?',
			a: 'Every 10th wave is a boss wave. Escort enemies spawn first, then the boss appears last. Bosses are larger, have a pulsing aura ring, and deal heavy damage. Killing a boss triggers a screen shake and extra particle effects. Boss rewards are much higher.',
		},
		{
			id: 'battle-upgrades',
			q: 'How do Field Upgrades work?',
			a: 'During a deployment, the right panel shows Field Upgrades in three categories: Offense (Damage, Attack Speed, Range, Multishot Chance, Multishot Targets, Crit Chance, Crit Multiplier), Defense (Defense, Max HP), Utility (Energy Amp). Spend Energy (⚡) to overclock your Core. All Field Upgrades are lost when the GeoCore is destroyed.',
		},
		{
			id: 'upgrade-caps',
			q: 'Do Field Upgrades have limits?',
			a: 'Yes. Percentage-based Field Upgrades have hard caps: Multishot Chance at 50%, Crit Chance at 45%. Flat upgrades (Damage, Attack Speed, Range, Defense, HP) have high max levels. The UI shows MAXED at the cap.',
		},
		{
			id: 'workshop',
			q: 'What is the Foundry?',
			a: 'The Forge (⚙) contains permanent pre-installed Core upgrades bought with Alloy (🔩): Base Damage, Base Fire Rate, Base Range, Starting HP, Alloy Bonus, Energy Bonus, Crit Bonus, Starting Energy. These improve the Core schematic and apply to every deployment.',
		},
		{
			id: 'lab',
			q: 'How does the Research Deck work?',
			a: 'The Research Deck runs orbital projects: Damage Research, Attack Speed Research, Health Research, Alloy Research, Energy Research. Purchase a level and it is applied instantly. Each level grants a permanent multiplicative bonus that stacks with the Forge. Higher levels cost more.',
		},
		{
			id: 'speed',
			q: 'How do I change game speed?',
			a: 'Use the speed buttons in the top bar: 1× (normal), 2×, 3×, 5×. Press Space to pause. Keyboard shortcuts: 1-4 for speed levels, Space for pause/resume. The game simulation speeds up internally — higher speeds let you progress faster.',
		},
		{
			id: 'gameover',
			q: 'What happens when the tower dies?',
			a: 'The GeoCore is destroyed. The deployment is over. All Alloy (🔩) harvested is safely transmitted back to Orbital Command. Your highest wave record is saved. The Core Lost screen shows wave reached, kills, bosses defeated, and Energy harvested. Click "Launch Deployment" to drop a new Core.',
		},
		{
			id: 'waves',
			q: 'How do waves scale?',
			a: 'Waves are endless. Enemy HP, damage, and speed increase gradually. Armor (damage reduction) appears after wave 10 and caps at 70%. More enemy types unlock at higher waves: Fast at wave 3, Tank at wave 5, Ranged at wave 8. Keep upgrading to survive.',
		},
		{
			id: 'save',
			q: 'How do I save my progress?',
			a: 'Auto-saved to your browser (IndexedDB). You can also export/import your save as JSON from the 💾 menu. All data is stored locally — no cloud, no backend, no account needed.',
		},
		{
			id: 'privacy',
			q: 'Is my data private?',
			a: 'Yes. GeoCore TD is a static app with no backend. All data is in your browser. No analytics, no cookies, no tracking. See the Privacy page for full details.',
		},
	];
</script>

<svelte:head>
	<title>Help — GeoCore TD</title>
	<meta name="description" content="GeoCore TD help guide and FAQ. Learn about currencies, enemy types, upgrades, bosses, lab research, and game mechanics." />
</svelte:head>

<div class="help-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to Home</a>

	<div class="help-header glass-panel">
		<h1>Help & FAQ</h1>
		<p>Everything you need to know about GeoCore TD.</p>
	</div>

	<!-- Getting Started -->
	<section class="help-section">
		<h2>🚀 Getting Started</h2>
		<div class="help-steps">
			<div class="help-step">
				<div class="help-step-num">1</div>
				<div class="help-step-content">
					<h3>▶ Launch a Deployment</h3>
					<p>Go to <a href="/play">Deployment</a> and click "Launch Deployment". Your GeoCore tower is dropped from orbit and fires automatically at the nearest enemy.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">2</div>
				<div class="help-step-content">
					<h3>⚡ Harvest Energy</h3>
					<p>Kill enemies → harvest <strong>Energy (⚡)</strong> for temporary Field Overclocks and refine <strong>Alloy (🔩)</strong> permanently. Energy resets each deployment, Alloy is saved to Orbital Command.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">3</div>
				<div class="help-step-content">
					<h3>⚡ Apply Field Upgrades</h3>
					<p>Field Upgrades (right panel) with Energy (⚡) during a deployment. Permanent <a href="/hub">Forge</a> upgrades with Alloy (🔩) between deployments.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">4</div>
				<div class="help-step-content">
					<h3>🏆 Advance the Campaign</h3>
					<p>Research on the <a href="/hub">Research Deck</a>, unlock new Fronts by reaching wave milestones, and run Simulations for tactical challenges.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Story / Lore -->
	<section class="help-section">
		<h2>📖 The War in Flatland</h2>
		<div class="lore-box">
			<p><strong>Flatland</strong> is a two-dimensional universe — a vast, infinite plane of digital matter. For centuries, the civilizations of Flatland lived in peace. Then came <strong>The Grid</strong>: a relentless, self-replicating swarm of geometric enemies that consumes everything in its path.</p>
			<p>You command <strong>🛰️ Orbital Command</strong> — a mobile command station in high orbit. From here, you manufacture and deploy <strong>GeoCore towers</strong>: advanced defense platforms that are dropped onto the surface of besieged planets.</p>
			<div class="lore-mechanics">
				<div class="lore-m">
					<span class="lore-mi">🛰️</span>
					<div>
						<strong>Orbital Command</strong>
						<span>Your permanent base between deployments. The Forge pre-installs Core upgrades, the Research Deck runs orbital projects, and Blueprints unlock new capabilities.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">🗼</span>
					<div>
						<strong>Planetary Drop</strong>
						<span>A GeoCore tower is deployed from orbit onto a planet's surface. Once the battle is lost, the tower is destroyed — it cannot be recovered. Each drop is a new installation.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">⚡</span>
					<div>
						<strong>Harvested Energy</strong>
						<span>Energy is harvested from destroyed geometric enemies. It powers temporary Field Overclocks during the deployment — raw energy cannot be transmitted, so it is lost with the Core.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">🔩</span>
					<div>
						<strong>Refined Alloy</strong>
						<span>Alloy is refined from enemy remnants. It is dense, stable, and transmits perfectly — it beams back to Orbital Command before the Core falls. Permanent material for upgrades.</span>
					</div>
				</div>
				<div class="lore-m">
					<span class="lore-mi">🌍</span>
					<div>
						<strong>Planets = Difficulty</strong>
						<span>Each planet has a different atmospheric density and swarm activity. These are your Tiers: from peaceful frontier worlds (Tier 1) to the heart of Grid space (Tier 5). The deeper you go, the greater the rewards — and the stronger the enemy.</span>
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
				<p>Harvested from destroyed enemies during a deployment. Spent on <strong>Field Overclocks</strong> to supercharge the Core. Lost when the GeoCore is destroyed. Boosted by <strong>Energy Amp</strong> and <strong>Energy Bonus</strong> Forge upgrades.</p>
			</div>
			<div class="info-card coin">
				<div class="info-icon">🔩</div>
				<h3>Alloy</h3>
				<span class="info-badge">Permanent</span>
				<p>Refined from enemy remnants. Spent at the <strong>Forge</strong> for pre-installed Core upgrades and on the <strong>Research Deck</strong> for orbital projects. Boosted by <strong>Alloy Bonus</strong>. Persists forever across all deployments.</p>
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
		<p class="section-desc">Permanent pre-installed Core upgrades bought with Alloy (🔩). Each level is built into the GeoCore schematic before deployment.</p>
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

	<!-- Simulations -->
	<section class="help-section">
		<h2>⚡ Simulations</h2>
		<p class="section-desc">Special game modes with unique modifiers. Unlock them by reaching Tier 2 (wave 100). Each challenge has its own high score.</p>
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
		<p class="section-desc">Temporary overclocks powered by Energy (⚡) during a deployment. They expire when the GeoCore is destroyed. Three categories to choose from.</p>
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

	<footer class="help-footer">
		<p>Still have questions? Open an issue on <a href="https://github.com/Shik3i/GeoCoreTD/issues" target="_blank" rel="noopener">GitHub</a>.</p>
	</footer>
</div>

<style>
	.help-page { min-height:100vh; padding:2rem 1.5rem; max-width:760px; margin:0 auto; overflow-y:auto; position:relative; }
	.bg-grid { position:fixed; inset:0; background-image:linear-gradient(rgba(0,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,.02) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
	.back-link { display:inline-flex; align-items:center; gap:.35rem; color:var(--text-dim); margin-bottom:1.25rem; font-size:.82rem; transition:all var(--transition-fast); position:relative; z-index:1; padding:.3rem .65rem; border-radius:var(--radius-sm); border:1px solid transparent; text-decoration:none; }
	.back-link:hover { color:var(--cyan); border-color:var(--border-neon); background:rgba(0,255,255,.04); }
	.help-header,.help-section { position:relative; z-index:1; margin-bottom:2rem; }
	.help-header { padding:2rem; }
	.help-header h1 { font-size:1.6rem; background:linear-gradient(135deg,var(--cyan),var(--blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:.4rem; }
	.help-header p { color:var(--text-dim); font-size:.9rem; }
	.help-section h2 { font-size:1.1rem; color:var(--text-primary); margin-bottom:.35rem; }
	.section-desc { font-size:.72rem; color:var(--text-dim); margin-bottom:.85rem; padding-bottom:.4rem; border-bottom:1px solid var(--border-neon); line-height:1.5; }
	.help-steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.65rem; }
	.help-step { display:flex; gap:.65rem; padding:.85rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.help-step-num { width:26px; height:26px; border-radius:50%; background:rgba(0,255,255,.1); border:1px solid var(--border-neon); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:var(--cyan); flex-shrink:0; }
	.help-step-content h3 { font-size:.82rem; color:var(--text-secondary); margin-bottom:.15rem; }
	.help-step-content p { font-size:.72rem; color:var(--text-dim); line-height:1.5; }
	.help-step-content a { color:var(--cyan-dim); }

	/* Lore */
	.lore-box { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); padding:1.25rem; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.lore-box p { font-size:.78rem; color:var(--text-dim); line-height:1.7; margin-bottom:.65rem; }
	.lore-box p strong { color:var(--text-secondary); }
	.lore-box p:last-of-type { margin-bottom:1rem; }
	.lore-mechanics { display:flex; flex-direction:column; gap:.5rem; }
	.lore-m { display:flex; gap:.65rem; align-items:flex-start; padding:.55rem .65rem; background:var(--bg-tertiary); border:1px solid rgba(0,255,255,.06); border-radius:var(--radius-sm); }
	.lore-mi { font-size:1.15rem; flex-shrink:0; margin-top:1px; }
	.lore-m div { display:flex; flex-direction:column; gap:.08rem; }
	.lore-m strong { font-size:.72rem; color:var(--text-secondary); }
	.lore-m span { font-size:.65rem; color:var(--text-dim); line-height:1.45; }

	/* Currencies */
	.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
	.info-card { padding:1rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); text-align:center; position:relative; overflow:hidden; }
	.info-card.gold { border-color:rgba(0,255,255,.3); }
	.info-card.coin { border-color:rgba(255,221,68,.3); }
	.info-icon { font-size:1.8rem; margin-bottom:.25rem; display:block; }
	.info-card h3 { font-size:.85rem; color:var(--text-secondary); margin-bottom:.15rem; }
	.info-badge { display:inline-block; font-size:.6rem; font-weight:600; padding:.1rem .45rem; border-radius:100px; background:rgba(0,255,255,.08); color:var(--cyan); margin-bottom:.45rem; text-transform:uppercase; letter-spacing:.05em; font-family:var(--font-mono); }
	.info-card p { font-size:.72rem; color:var(--text-dim); line-height:1.6; }

	/* Enemy Types */
	.enemy-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:.5rem; }
	.enemy-card { padding:.75rem .5rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; transition:all var(--transition-fast); }
	.enemy-card:hover { border-color:var(--border-neon-strong); transform:translateY(-2px); box-shadow:var(--shadow-neon-sm); }
	.enemy-card.boss { border-color:rgba(255,68,170,.25); }
	.enemy-shape { font-size:1.6rem; margin-bottom:.25rem; display:block; }
	.enemy-shape.square { color:var(--cyan); }
	.enemy-shape.diamond { color:var(--green); }
	.enemy-shape.hexagon { color:var(--violet); }
	.enemy-shape.triangle { color:var(--orange); }
	.enemy-shape.pentagon { color:var(--pink); }
	.enemy-card h3 { font-size:.72rem; color:var(--text-secondary); margin-bottom:.15rem; }
	.enemy-card p { font-size:.6rem; color:var(--text-dim); line-height:1.4; }

	/* Generic Card Grid (Workshop, Lab, Tiers, Challenges) */
	.card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:.55rem; }
	.help-card { padding:.75rem .65rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; transition:all var(--transition-fast); position:relative; overflow:hidden; }
	.help-card:hover { border-color:var(--border-neon-strong); transform:translateY(-2px); box-shadow:var(--shadow-neon-sm); }
	.help-card-icon { font-size:1.5rem; margin-bottom:.25rem; display:block; }
	.help-card h3 { font-size:.72rem; color:var(--text-secondary); margin-bottom:.2rem; line-height:1.3; }
	.help-card p { font-size:.6rem; color:var(--text-dim); line-height:1.4; }
	.card-tag { display:inline-block; font-size:.55rem; font-family:var(--font-mono); color:var(--cyan-dim); background:rgba(0,255,255,.06); padding:.1rem .4rem; border-radius:100px; margin-top:.3rem; }

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
	.ut-header,.ut-row { display:grid; grid-template-columns:100px 1fr 100px; gap:.5rem; padding:.45rem .65rem; font-size:.68rem; align-items:center; }
	.ut-header { background:var(--bg-tertiary); color:var(--cyan); font-weight:600; font-family:var(--font-mono); font-size:.6rem; text-transform:uppercase; }
	.ut-row { border-top:1px solid rgba(0,255,255,.06); color:var(--text-dim); }
	.ut-row span:first-child { color:var(--text-secondary); font-weight:500; }

	/* Controls */
	.controls-grid { display:flex; flex-wrap:wrap; gap:.45rem; padding:.3rem 0; }
	.control-item { display:flex; align-items:center; gap:.45rem; padding:.35rem .65rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.control-item kbd { padding:.08rem .35rem; background:var(--bg-primary); border-radius:3px; font-family:var(--font-mono); font-size:.65rem; border:1px solid var(--border-neon); color:var(--cyan); }
	.control-item span { font-size:.72rem; color:var(--text-secondary); }

	/* FAQ */
	.faq-list { display:flex; flex-direction:column; gap:.3rem; }
	.faq-item { background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); overflow:hidden; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.faq-item.open { border-color:var(--border-neon-strong); }
	.faq-question { display:flex; justify-content:space-between; align-items:center; width:100%; padding:.75rem .9rem; font-size:.78rem; color:var(--text-secondary); text-align:left; cursor:pointer; transition:background var(--transition-fast); }
	.faq-question:hover { background:rgba(0,255,255,.03); }
	.faq-arrow { color:var(--text-dim); font-size:.7rem; margin-left:.4rem; flex-shrink:0; }
	.faq-answer { padding:0 .9rem .75rem; }
	.faq-answer p { font-size:.74rem; color:var(--text-dim); line-height:1.6; }
	.help-footer { text-align:center; padding:2rem 0; color:var(--text-dim); font-size:.75rem; position:relative; z-index:1; }
	.help-footer a { color:var(--cyan-dim); }

	@media(max-width:767px) {
		.help-page{padding:1rem}
		.help-steps{grid-template-columns:1fr}
		.info-grid{grid-template-columns:1fr}
		.enemy-grid{grid-template-columns:repeat(3,1fr)}
		.card-grid{grid-template-columns:repeat(2,1fr)}
		.upgrade-table{font-size:.6rem}
		.ut-header,.ut-row{grid-template-columns:70px 1fr 70px;padding:.3rem .4rem}
	}
</style>
