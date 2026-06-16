<script lang="ts">
	let activeFaq = $state<string | null>(null);

	const faqs = [
		{
			id: 'start',
			q: 'How do I start playing?',
			a: 'Go to the Play page and click "Start Run". Enemies spawn from the edges and move toward your tower in the center. Your tower fires automatically at the nearest enemy. Buy Battle Upgrades during the run with Gold, and permanent Workshop upgrades with KoalaCoins between runs.',
		},
		{
			id: 'currencies',
			q: 'What are Gold and KoalaCoins?',
			a: 'Gold (💰) is temporary: earned from kills during a run, spent on Battle Upgrades. Resets when the run ends. KoalaCoins (🪙) are permanent: earned from kills (1 Coin per kill, boosted by Workshop), spent in the Workshop and Lab. Persist forever across all runs.',
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
			q: 'How do Battle Upgrades work?',
			a: 'During a run, the right panel shows Battle Upgrades in three categories: Offense (Damage, Fire Rate, Range, Multishot Chance, Multishot Projectiles, Crit Chance, Piercing), Defense (Defense, Max HP), Utility (Gold Amp). Buy them with Gold. All Battle Upgrades reset when the run ends.',
		},
		{
			id: 'upgrade-caps',
			q: 'Do upgrades have limits?',
			a: 'Yes. Percentage-based upgrades have hard caps: Fire Rate caps at +1.5/s, Multishot Chance at 80%, Crit Chance at 50%, Gold Amp at 75%, Piercing at 40% armor ignore. Flat upgrades (Damage, Range, Defense, HP) are limited only by their max level. The UI shows MAXED when you hit the cap.',
		},
		{
			id: 'workshop',
			q: 'What is the Workshop?',
			a: 'The Workshop (🏪) contains permanent upgrades bought with KoalaCoins: Base Damage, Base Fire Rate, Base Range, Starting HP, Coin Bonus, Cash Bonus, Crit Bonus, Starting Cash. These persist across all runs and make your tower stronger from the start.',
		},
		{
			id: 'lab',
			q: 'How does Lab Research work?',
			a: 'The Lab has real-time research: Damage Research, Coin Efficiency, Tower Durability. Start a project — it progresses even when you close the browser. When complete, you get a permanent bonus. Higher levels take longer. Only one research can be active per lab slot.',
		},
		{
			id: 'speed',
			q: 'How do I change game speed?',
			a: 'Use the speed buttons in the top bar: 1× (normal), 2×, 3×, 5×. Press Space to pause. Keyboard shortcuts: 1-4 for speed levels, Space for pause/resume. The game simulation speeds up internally — higher speeds let you progress faster.',
		},
		{
			id: 'gameover',
			q: 'What happens when the tower dies?',
			a: 'The run ends. You keep all KoalaCoins earned during the run. Your highest wave record is saved. The game over screen shows your wave reached, kills, bosses defeated, and Gold earned. Click "Play Again" to start a new run with your permanent upgrades.',
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
			a: 'Yes. KoalaTower is a static app with no backend. All data is in your browser. No analytics, no cookies, no tracking. See the Privacy page for full details.',
		},
	];
</script>

<svelte:head>
	<title>Help — KoalaTower</title>
	<meta name="description" content="KoalaTower help guide and FAQ. Learn about currencies, enemy types, upgrades, bosses, lab research, and game mechanics." />
</svelte:head>

<div class="help-page">
	<div class="bg-grid"></div>
	<a href="/" class="back-link">← Back to Home</a>

	<div class="help-header glass-panel">
		<h1>Help & FAQ</h1>
		<p>Everything you need to know about KoalaTower.</p>
	</div>

	<section class="help-section">
		<h2>Getting Started</h2>
		<div class="help-steps">
			<div class="help-step">
				<div class="help-step-num">1</div>
				<div class="help-step-content">
					<h3>Start a Run</h3>
					<p>Go to <a href="/play">the game</a> and click "Start Run". Your tower sits in the center and shoots automatically.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">2</div>
				<div class="help-step-content">
					<h3>Earn Currency</h3>
					<p>Kill enemies → earn <strong>Gold (💰)</strong> for the current run and <strong>KoalaCoins (🪙)</strong> permanently.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">3</div>
				<div class="help-step-content">
					<h3>Buy Upgrades</h3>
					<p>Battle Upgrades (right panel) with Gold during runs. <a href="/hub">Workshop</a> upgrades with KoalaCoins between runs.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">4</div>
				<div class="help-step-content">
					<h3>Progress</h3>
					<p>Research in the <a href="/hub">Lab</a>, climb Tiers by reaching wave milestones, unlock Challenges.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="help-section">
		<h2>Currencies</h2>
		<div class="info-grid">
			<div class="info-card gold">
				<div class="info-icon">💰</div>
				<h3>Gold</h3>
				<p>Temporary run currency. Earned per kill. Spent on <strong>Battle Upgrades</strong> during the run. Resets when the tower dies. Boosted by Gold Amp upgrade.</p>
			</div>
			<div class="info-card coin">
				<div class="info-icon">🪙</div>
				<h3>KoalaCoins</h3>
				<p>Permanent currency. Earned per kill (1 base, boosted by Workshop Coin Bonus). Spent on <strong>Workshop upgrades</strong> and <strong>Lab research</strong>. Never lost.</p>
			</div>
		</div>
	</section>

	<section class="help-section">
		<h2>Enemy Types</h2>
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

	<section class="help-section">
		<h2>Upgrade Categories</h2>
		<div class="upgrade-table">
			<div class="ut-header"><span>Category</span><span>Upgrades</span><span>Has Cap?</span></div>
			<div class="ut-row"><span>⚔ Offense</span><span>Damage, Fire Rate, Range, Multishot Chance, Multishot Proj., Crit Chance, Piercing</span><span>% ones: yes</span></div>
			<div class="ut-row"><span>🛡 Defense</span><span>Defense (flat reduction), Max HP</span><span>No (max level)</span></div>
			<div class="ut-row"><span>🔧 Utility</span><span>Gold Amp (+% per kill)</span><span>Yes (75%)</span></div>
		</div>
	</section>

	<section class="help-section">
		<h2>Controls</h2>
		<div class="controls-grid">
			<div class="control-item"><kbd>Space</kbd><span>Pause / Resume</span></div>
			<div class="control-item"><kbd>1</kbd><span>Speed 1×</span></div>
			<div class="control-item"><kbd>2</kbd><span>Speed 2×</span></div>
			<div class="control-item"><kbd>3</kbd><span>Speed 3×</span></div>
			<div class="control-item"><kbd>4</kbd><span>Speed 5×</span></div>
		</div>
	</section>

	<section class="help-section">
		<h2>Frequently Asked Questions</h2>
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
		<p>Still have questions? Open an issue on <a href="https://github.com/Shik3i/KoalaTower/issues" target="_blank" rel="noopener">GitHub</a>.</p>
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
	.help-section h2 { font-size:1.1rem; color:var(--text-primary); margin-bottom:.85rem; padding-bottom:.4rem; border-bottom:1px solid var(--border-neon); }
	.help-steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.65rem; }
	.help-step { display:flex; gap:.65rem; padding:.85rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
	.help-step-num { width:26px; height:26px; border-radius:50%; background:rgba(0,255,255,.1); border:1px solid var(--border-neon); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:var(--cyan); flex-shrink:0; }
	.help-step-content h3 { font-size:.82rem; color:var(--text-secondary); margin-bottom:.15rem; }
	.help-step-content p { font-size:.72rem; color:var(--text-dim); line-height:1.5; }
	.help-step-content a { color:var(--cyan-dim); }
	.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
	.info-card { padding:1rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-md); text-align:center; }
	.info-card.gold { border-color:rgba(68,255,136,.2); }
	.info-card.coin { border-color:rgba(255,221,68,.2); }
	.info-icon { font-size:1.5rem; margin-bottom:.25rem; }
	.info-card h3 { font-size:.85rem; color:var(--text-secondary); margin-bottom:.3rem; }
	.info-card p { font-size:.72rem; color:var(--text-dim); line-height:1.5; }
	.enemy-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:.5rem; }
	.enemy-card { padding:.75rem .5rem; background:var(--bg-glass); border:1px solid var(--border-neon); border-radius:var(--radius-sm); text-align:center; }
	.enemy-card.boss { border-color:rgba(255,68,170,.25); }
	.enemy-shape { font-size:1.6rem; margin-bottom:.25rem; }
	.enemy-shape.square { color:var(--cyan); }
	.enemy-shape.diamond { color:var(--green); }
	.enemy-shape.hexagon { color:var(--violet); }
	.enemy-shape.triangle { color:var(--orange); }
	.enemy-shape.pentagon { color:var(--pink); }
	.enemy-card h3 { font-size:.72rem; color:var(--text-secondary); margin-bottom:.15rem; }
	.enemy-card p { font-size:.6rem; color:var(--text-dim); line-height:1.4; }
	.upgrade-table { border:1px solid var(--border-neon); border-radius:var(--radius-md); overflow:hidden; }
	.ut-header,.ut-row { display:grid; grid-template-columns:100px 1fr 90px; gap:.5rem; padding:.45rem .65rem; font-size:.68rem; align-items:center; }
	.ut-header { background:var(--bg-tertiary); color:var(--cyan); font-weight:600; font-family:var(--font-mono); font-size:.6rem; text-transform:uppercase; }
	.ut-row { border-top:1px solid rgba(0,255,255,.06); color:var(--text-dim); }
	.ut-row span:first-child { color:var(--text-secondary); font-weight:500; }
	.controls-grid { display:flex; flex-wrap:wrap; gap:.45rem; padding:.3rem 0; }
	.control-item { display:flex; align-items:center; gap:.45rem; padding:.35rem .65rem; background:var(--bg-tertiary); border:1px solid var(--border-neon); border-radius:var(--radius-sm); }
	.control-item kbd { padding:.08rem .35rem; background:var(--bg-primary); border-radius:3px; font-family:var(--font-mono); font-size:.65rem; border:1px solid var(--border-neon); color:var(--cyan); }
	.control-item span { font-size:.72rem; color:var(--text-secondary); }
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
		.upgrade-table{font-size:.6rem}
		.ut-header,.ut-row{grid-template-columns:70px 1fr 60px;padding:.3rem .4rem}
	}
</style>