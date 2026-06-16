<script lang="ts">
	let activeFaq = $state<string | null>(null);

	const faqs = [
		{
			id: 'start',
			q: 'How do I start playing?',
			a: 'Go to the Play page and click "Start Run". Enemies will spawn from the edges and move toward your tower. Your tower fires automatically — just sit back and watch, or buy upgrades to help it out.',
		},
		{
			id: 'currencies',
			q: 'What are Gold and KoalaCoins?',
			a: 'Gold (💰) is temporary currency earned during a run. Spend it on Battle Upgrades in the right panel. KoalaCoins (🪙) are permanent currency earned from kills. Use them in the Workshop for upgrades that persist forever and in the Lab for research.',
		},
		{
			id: 'battle-upgrades',
			q: 'How do Battle Upgrades work?',
			a: 'During a run, the right panel shows Battle Upgrades sorted into Offense, Defense, and Utility categories. Buy them with Gold to boost your tower. All upgrades reset when the run ends.',
		},
		{
			id: 'workshop',
			q: 'What is the Workshop?',
			a: 'The Workshop contains permanent upgrades bought with KoalaCoins. These persist across all runs and make your tower stronger from the start. Access it via the 🏪 button or the main menu.',
		},
		{
			id: 'lab',
			q: 'How does Lab Research work?',
			a: 'The Lab has real-time research projects. Start a research project — it progresses even when you close the game. When it completes, you get a permanent bonus. Higher levels take exponentially longer.',
		},
		{
			id: 'speed',
			q: 'How do I change game speed?',
			a: 'Use the speed buttons in the top bar: 1x (normal), 2x, 3x, or 5x. Press Space to pause. You can also use keyboard shortcuts: 1-4 for speed, Space for pause.',
		},
		{
			id: 'save',
			q: 'How do I save my progress?',
			a: 'Your progress is automatically saved to your browser (IndexedDB). You can also manually export/import your save as JSON from the 💾 menu. All data is stored locally — no cloud, no backend.',
		},
		{
			id: 'reset',
			q: 'Can I reset my progress?',
			a: 'Yes. Go to Settings and use the Reset Save option. This permanently deletes all local data. Export your save first if you want to keep a backup.',
		},
		{
			id: 'privacy',
			q: 'Is my data private?',
			a: 'Absolutely. KoalaTower is a static app with no backend. All data is stored in your browser. No analytics, no cookies, no tracking. Server logs are deleted after 7 days. See the Privacy page for details.',
		},
		{
			id: 'waves',
			q: 'How do waves work?',
			a: 'Waves are endless and get harder over time. Every 10 waves a boss appears. Enemies gain HP, damage, speed, and armor as waves progress. Armor reduces incoming damage — you need to keep upgrading to keep up.',
		},
	];
</script>

<svelte:head>
	<title>Help — KoalaTower</title>
	<meta name="description" content="KoalaTower help guide and FAQ. Learn how to play, about currencies, upgrades, lab research, and more." />
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
					<p>Go to <a href="/play">the game</a> and click "Start Run". Enemies will spawn from all sides.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">2</div>
				<div class="help-step-content">
					<h3>Earn Currency</h3>
					<p>Kill enemies to earn Gold (💰, temporary) and KoalaCoins (🪙, permanent). Gold appears in the top bar during a run.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">3</div>
				<div class="help-step-content">
					<h3>Buy Upgrades</h3>
					<p>Use Gold on Battle Upgrades (right panel during a run). Use KoalaCoins in the <a href="/hub">Workshop</a> for permanent power.</p>
				</div>
			</div>
			<div class="help-step">
				<div class="help-step-num">4</div>
				<div class="help-step-content">
					<h3>Research & Progress</h3>
					<p>Start <a href="/hub">Lab research</a> projects that progress in real-time. Climb the tiers and unlock challenges.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="help-section">
		<h2>Controls</h2>
		<div class="controls-grid">
			<div class="control-item">
				<kbd>Space</kbd>
				<span>Pause / Resume</span>
			</div>
			<div class="control-item">
				<kbd>1</kbd>
				<span>1x speed</span>
			</div>
			<div class="control-item">
				<kbd>2</kbd>
				<span>2x speed</span>
			</div>
			<div class="control-item">
				<kbd>3</kbd>
				<span>3x speed</span>
			</div>
			<div class="control-item">
				<kbd>4</kbd>
				<span>5x speed</span>
			</div>
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
						<div class="faq-answer">
							<p>{faq.a}</p>
						</div>
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
	.help-page {
		min-height: 100vh;
		padding: 2rem 1.5rem;
		max-width: 720px;
		margin: 0 auto;
		overflow-y: auto;
		position: relative;
	}

	.bg-grid {
		position: fixed;
		inset: 0;
		background-image:
			linear-gradient(rgba(0, 255, 255, 0.02) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.02) 1px, transparent 1px);
		background-size: 60px 60px;
		pointer-events: none;
		z-index: 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-dim);
		margin-bottom: 1.25rem;
		font-size: 0.82rem;
		transition: all var(--transition-fast);
		position: relative;
		z-index: 1;
		padding: 0.3rem 0.65rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--cyan);
		border-color: var(--border-neon);
		background: rgba(0, 255, 255, 0.04);
	}

	.help-header, .help-section {
		position: relative;
		z-index: 1;
		margin-bottom: 2rem;
	}

	.help-header {
		padding: 2rem;
	}

	.help-header h1 {
		font-size: 1.6rem;
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.4rem;
	}

	.help-header p {
		color: var(--text-dim);
		font-size: 0.9rem;
	}

	.help-section h2 {
		font-size: 1.15rem;
		color: var(--text-primary);
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-neon);
	}

	.help-steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.help-step {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.help-step-num {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(0, 255, 255, 0.1);
		border: 1px solid var(--border-neon);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--cyan);
		flex-shrink: 0;
	}

	.help-step-content h3 {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-bottom: 0.2rem;
	}

	.help-step-content p {
		font-size: 0.75rem;
		color: var(--text-dim);
		line-height: 1.5;
	}

	.help-step-content a {
		color: var(--cyan-dim);
	}

	.controls-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.control-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-sm);
	}

	.control-item kbd {
		padding: 0.1rem 0.4rem;
		background: var(--bg-primary);
		border-radius: 3px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		border: 1px solid var(--border-neon);
		color: var(--cyan);
	}

	.control-item span {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.faq-item {
		background: var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		overflow: hidden;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.faq-item.open {
		border-color: var(--border-neon-strong);
	}

	.faq-question {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.85rem 1rem;
		font-size: 0.82rem;
		color: var(--text-secondary);
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.faq-question:hover {
		background: rgba(0, 255, 255, 0.03);
	}

	.faq-arrow {
		color: var(--text-dim);
		font-size: 0.75rem;
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	.faq-answer {
		padding: 0 1rem 0.85rem;
	}

	.faq-answer p {
		font-size: 0.78rem;
		color: var(--text-dim);
		line-height: 1.6;
	}

	.help-footer {
		text-align: center;
		padding: 2rem 0;
		color: var(--text-dim);
		font-size: 0.78rem;
		position: relative;
		z-index: 1;
	}

	.help-footer a {
		color: var(--cyan-dim);
	}

	@media (max-width: 767px) {
		.help-page { padding: 1rem; }
		.help-steps { grid-template-columns: 1fr; }
	}
</style>
