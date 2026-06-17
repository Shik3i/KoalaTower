<script lang="ts">
	import { onMount } from 'svelte';
	import { coinsStore } from '$lib/stores/gameUiStore';
	import { APP_VERSION, GITHUB_URL } from '$lib/version';
	import FlatlandNews from '$lib/components/FlatlandNews.svelte';

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Flatland TD',
		applicationCategory: 'GameApplication',
		operatingSystem: 'Any',
		description: 'A neon cyber idle tower defense game. Defend your tower against endless waves of digital enemies.',
		url: GITHUB_URL,
		author: { '@type': 'Person', name: 'Timo' },
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
	};

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

	const subtitles = [
		'Open source neon cyber idle tower defense',
		'Your tax dollars, geometrically allocated',
		'The war against shapes continues. Barely.',
		'Deploy towers. Question nothing. Refine Alloy.',
		'Flatland is flat. The war is not.',
		'Orbital Command has reviewed the situation. It is not great.',
	];

	let subtitleIdx = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			subtitleIdx = (subtitleIdx + 1) % subtitles.length;
		}, 5000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Flatland TD · FLTD — Open Source Neon Cyber Idle Tower Defense</title>
	<meta name="description" content="Deploy towers from orbit into hostile geometric fronts. Research permanent upgrades on your Orbital Command. Open source neon cyber idle tower defense. No tracking." />
	<meta property="og:title" content="Flatland TD — Deploy Now" />
	<meta property="og:description" content="Deploy towers from orbit into hostile geometric fronts. Research permanent upgrades on your Orbital Command." />
	<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
</svelte:head>

<main class="home">
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
			<a href={GITHUB_URL} target="_blank" rel="noopener" class="version-badge" aria-label="View on GitHub">
				<svg class="github-icon" viewBox="0 0 16 16" width="14" height="14"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor"/></svg>
				<span class="version-text">{APP_VERSION}</span>
			</a>
			<h1 class="title">
				<img class="hero-logo" src="/branding/flatland-logo-large.svg" alt="Flatland TD logo" />
			</h1>
			<p class="subtitle">{subtitles[subtitleIdx]}</p>
				<p class="description">
				Flatland is at war. Deploy towers from orbit onto hostile geometric fronts,
				harvest energy from destroyed shapes to overclock your tower,
				and refine alloy for permanent upgrades aboard Orbital Command.
				Each front is a new battlefield — the tower is lost with every drop.
			</p>
			<div class="cta-buttons">
				<a href="/play" class="btn-primary">
					<span class="btn-icon">▶</span>
					<span class="btn-label">Deploy</span>
				</a>
				<a href="/hub" class="btn-primary" style="background:linear-gradient(135deg,var(--violet),var(--pink));box-shadow:0 0 20px rgba(136,68,255,.2);">
					<span class="btn-icon">🛰️</span>
					<span class="btn-label">Orbital Command</span>
				</a>
				<a href="/help" class="btn-secondary">
					<span>❓</span> Help
				</a>
			</div>
			{#if coins > 0}
				<div class="coin-display">
					<span class="coin-icon">🔩</span>
					<span class="coin-amount">{coins.toLocaleString()}</span>
					<span class="coin-label">Alloy</span>
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

	<FlatlandNews />

	<footer class="footer">
		<p>All data stored locally in your browser. No tracking, no cookies. The Shapes remain hostile, flat, and statistically inconvenient.</p>
		<nav class="footer-links" aria-label="Footer navigation">
			<a href="/help" class="footer-link">Help</a>
			<span class="footer-sep" aria-hidden="true">·</span>
			<a href="/privacy" class="footer-link">Privacy</a>
			<span class="footer-sep" aria-hidden="true">·</span>
			<a href="/imprint" class="footer-link">Imprint</a>
		</nav>
	</footer>
</main>

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

	.version-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.8rem;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		color: var(--text-dim);
		border: 1px solid var(--border-neon);
		border-radius: 100px;
		margin-bottom: 1.25rem;
		text-decoration: none;
		transition: all var(--transition-fast);
	}

	.version-badge:hover {
		color: var(--cyan);
		border-color: var(--cyan);
		box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
	}

	.github-icon {
		flex-shrink: 0;
	}

	.version-text {
		letter-spacing: 0.05em;
	}

	.title {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.hero-logo {
		width: 100%;
		max-width: 500px;
		height: auto;
		filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.15));
	}

	.subtitle {
		font-size: 1rem;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		margin-bottom: 1.5rem;
		letter-spacing: 0.05em;
		animation: fadeInUp 0.4s ease;
		transition: opacity 0.3s ease;
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

	.btn-primary {
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
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
	}

	.footer-links {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.footer-sep {
		color: var(--text-dim);
		opacity: 0.3;
	}

	.footer-link {
		color: var(--cyan-dim);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(0, 255, 255, 0.2);
	}

	@media (max-width: 767px) {
		.title {
			margin-bottom: 0.5rem;
		}
		.hero-logo {
			max-width: 340px;
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
