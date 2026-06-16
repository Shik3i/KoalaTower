<script lang="ts">
	import { onMount } from 'svelte';
	import { coinsStore } from '$lib/stores/gameUiStore';

	let coins = $state(0);

	onMount(() => {
		const unsub = coinsStore.subscribe(c => coins = c);
		return unsub;
	});

	let stars = Array.from({length: 60}, () => ({
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: 0.5 + Math.random() * 2,
		delay: Math.random() * 5,
	}));
</script>

<div class="home">
	<!-- Animated Background -->
	<div class="bg-grid"></div>
	{#each stars as star}
		<div
			class="star"
			style="left: {star.x}%; top: {star.y}%; width: {star.size}px; height: {star.size}px; animation-delay: {star.delay}s;"
		></div>
	{/each}

	<div class="hero">
		<div class="hero-glow"></div>
		<div class="hero-glow-secondary"></div>
		<div class="hero-content">
			<div class="title-badge">Alpha v0.1</div>
			<h1 class="title">
				<span class="title-emoji">🐨</span>
				<span class="title-text">KoalaTower</span>
			</h1>
			<p class="subtitle">Neon Cyber Idle Tower Defense</p>
			<p class="description">
				Defend the tower against endless waves of digital enemies.
				Upgrade your defenses, research new technologies, and climb the tiers.
			</p>
			<div class="cta-buttons">
				<a href="/play" class="btn-primary">
					<span class="btn-icon">▶</span>
					<span class="btn-label">Play Now</span>
				</a>
				<a href="/privacy" class="btn-secondary">
					<span class="btn-label">Privacy</span>
				</a>
			</div>
			{#if coins > 0}
				<div class="coin-display">
					<span class="coin-icon">🪙</span>
					<span class="coin-amount">{coins.toLocaleString()}</span>
					<span class="coin-label">Coins</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="features">
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(0,255,255,0.15), rgba(68,136,255,0.05));"></div>
				<span class="feature-icon">🏗️</span>
			</div>
			<h3>Build & Upgrade</h3>
			<p>Strengthen your tower with battle upgrades mid-run and permanent workshop upgrades.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(68,255,136,0.15), rgba(0,255,255,0.05));"></div>
				<span class="feature-icon">🌊</span>
			</div>
			<h3>Endless Waves</h3>
			<p>Face increasingly difficult waves with 5 unique enemy types and escalating rewards.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(136,68,255,0.15), rgba(255,68,170,0.05));"></div>
				<span class="feature-icon">🔬</span>
			</div>
			<h3>Research & Progress</h3>
			<p>Unlock labs, tiers, milestones, and challenges as you grow stronger.</p>
		</div>
	</div>

	<footer class="footer">
		<p>All data stored locally in your browser. No tracking, no cookies.</p>
		<a href="/privacy" class="footer-link">Privacy Policy</a>
	</footer>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--bg-primary);
		overflow-y: auto;
		position: relative;
	}

	/* Animated Background */
	.bg-grid {
		position: fixed;
		inset: 0;
		background-image:
			linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		pointer-events: none;
		z-index: 0;
	}

	.star {
		position: fixed;
		border-radius: 50%;
		background: var(--cyan);
		pointer-events: none;
		z-index: 0;
		animation: twinkle 3s ease-in-out infinite;
		opacity: 0;
	}

	@keyframes twinkle {
		0%, 100% { opacity: 0; }
		30% { opacity: 0.4; }
		60% { opacity: 0.8; }
	}

	.hero {
		position: relative;
		width: 100%;
		padding: 5rem 1.5rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		overflow: hidden;
		z-index: 1;
	}

	.hero-glow {
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(0, 255, 255, 0.08) 0%, rgba(68, 136, 255, 0.04) 40%, transparent 70%);
		pointer-events: none;
		animation: pulseGlow 4s ease-in-out infinite;
	}

	.hero-glow-secondary {
		position: absolute;
		top: 60%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, rgba(136, 68, 255, 0.06) 0%, transparent 60%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 600px;
		animation: fadeInUp 0.6s ease;
	}

	.title-badge {
		display: inline-block;
		padding: 0.2rem 0.8rem;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		color: var(--cyan-dim);
		border: 1px solid var(--border-neon);
		border-radius: 100px;
		margin-bottom: 1.25rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.title {
		font-size: 3.5rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.title-emoji {
		font-size: 3.2rem;
		filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.3));
	}

	.title-text {
		background: linear-gradient(135deg, var(--cyan), var(--blue), var(--violet), var(--pink));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		background-size: 200% auto;
		animation: shimmer 4s linear infinite;
	}

	@keyframes shimmer {
		0% { background-position: 0% center; }
		100% { background-position: 200% center; }
	}

	.subtitle {
		font-size: 1rem;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		margin-bottom: 1.5rem;
		letter-spacing: 0.05em;
	}

	.description {
		color: var(--text-dim);
		font-size: 0.9rem;
		line-height: 1.8;
		margin-bottom: 2rem;
		max-width: 480px;
		margin-left: auto;
		margin-right: auto;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.btn-primary, .btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.85rem 2.25rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 1rem;
		transition: all var(--transition-normal);
		text-decoration: none;
		cursor: pointer;
	}

	.btn-primary {
		background: linear-gradient(135deg, var(--cyan), var(--blue));
		color: var(--bg-primary);
		box-shadow: 0 0 24px rgba(0, 255, 255, 0.25);
		position: relative;
		overflow: hidden;
	}

	.btn-primary::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
		opacity: 0;
		transition: opacity var(--transition-normal);
	}

	.btn-primary:hover {
		box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.btn-primary:hover::before {
		opacity: 1;
	}

	.btn-secondary {
		background: rgba(0, 255, 255, 0.05);
		color: var(--text-secondary);
		border: 1px solid var(--border-neon);
	}

	.btn-secondary:hover {
		border-color: var(--cyan);
		color: var(--text-primary);
		background: rgba(0, 255, 255, 0.08);
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
		transform: translateY(-2px);
	}

	.btn-icon {
		font-size: 0.9rem;
	}

	.coin-display {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		background: rgba(255, 221, 68, 0.06);
		border: 1px solid rgba(255, 221, 68, 0.2);
		border-radius: 100px;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		animation: fadeInUp 0.4s ease;
	}

	.coin-icon {
		font-size: 1rem;
	}

	.coin-amount {
		color: var(--yellow);
		font-weight: 600;
	}

	.coin-label {
		color: var(--text-dim);
		font-size: 0.75rem;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		padding: 1rem 1.5rem 3rem;
		max-width: 760px;
		width: 100%;
		z-index: 1;
	}

	.feature-card {
		background: var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		text-align: center;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all var(--transition-normal);
		position: relative;
		overflow: hidden;
	}

	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--cyan), transparent);
		opacity: 0.3;
	}

	.feature-card:hover {
		border-color: var(--border-neon-strong);
		transform: translateY(-3px);
		box-shadow: var(--shadow-neon-md);
	}

	.feature-icon-wrap {
		position: relative;
		width: 56px;
		height: 56px;
		margin: 0 auto 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.feature-icon-bg {
		position: absolute;
		inset: 0;
		border-radius: 16px;
	}

	.feature-icon {
		font-size: 1.6rem;
		position: relative;
		z-index: 1;
	}

	.feature-card h3 {
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
		color: var(--cyan);
	}

	.feature-card p {
		font-size: 0.8rem;
		color: var(--text-dim);
		line-height: 1.6;
	}

	.footer {
		padding: 1.5rem;
		color: var(--text-dim);
		font-size: 0.75rem;
		text-align: center;
		z-index: 1;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: center;
	}

	.footer-link {
		color: var(--cyan-dim);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(0, 255, 255, 0.2);
	}

	@media (max-width: 767px) {
		.title {
			font-size: 2.4rem;
		}
		.title-emoji {
			font-size: 2.2rem;
		}
		.hero {
			padding: 3rem 1rem 2rem;
		}
		.features {
			padding: 1rem 1rem 2rem;
			grid-template-columns: 1fr;
		}
		.description {
			font-size: 0.85rem;
		}
	}
</style>
