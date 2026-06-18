<script lang="ts">
	import { onMount } from 'svelte';
	import { coinsStore, loadedStore } from '$lib/stores/gameUiStore';
	import { APP_VERSION, GITHUB_URL } from '$lib/version';
	import FlatlandNews from '$lib/components/FlatlandNews.svelte';

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Flatland TD',
		applicationCategory: 'GameApplication',
		operatingSystem: 'Any',
		description: 'A neon cyber idle tower defense game. Defend your tower against endless waves of digital enemies.',
		url: 'https://tower.koalastuff.net',
		author: { '@type': 'Person', name: 'Timo' },
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
	};

	let coins = $state(0);
	let saveLoaded = $state(false);

	onMount(() => {
		const unsub1 = coinsStore.subscribe(c => coins = c);
		const unsub2 = loadedStore.subscribe(l => saveLoaded = l);
		return () => { unsub1(); unsub2(); };
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
		'The shapes have formed a committee. It is not going well.',
		'Every tower loss is a learning opportunity. Command has learned nothing.',
		'Statistics indicate the situation is statistically inconvenient.',
		'Orbital Command regrets to inform you that everything is fine. It is not.',
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
	<div class="bg-grid" aria-hidden="true"></div>
	{#each stars as star}
		<div
			class="star"
			aria-hidden="true"
			style="left: {star.x}%; top: {star.y}%; width: {star.size}px; height: {star.size}px; animation-delay: {star.delay}s;"
		></div>
	{/each}

	<div class="hero">
		<div class="hero-signal" aria-hidden="true"></div>
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
				Each front is a new battlefield. The tower is lost with every drop.
			</p>
			<div class="signal-strip" aria-label="Project values">
				<span><strong>Free</strong> open source</span>
				<span><strong>Zero</strong> tracking</span>
				<span><strong>Local</strong> saves</span>
			</div>
			<div class="cta-buttons">
				<a href="/play" class="btn-primary" class:btn-disabled={!saveLoaded} aria-disabled={!saveLoaded}>
					<span class="btn-icon">{saveLoaded ? '▶' : ''}</span>
					<span class="btn-label">Deploy</span>
					{#if !saveLoaded}<span class="btn-spinner"></span>{/if}
				</a>
				<a href="/hub" class="btn-primary btn-accent" class:btn-disabled={!saveLoaded} aria-disabled={!saveLoaded}>
					<span class="btn-icon">{saveLoaded ? '🛰️' : ''}</span>
					<span class="btn-label">Orbital Command</span>
					{#if !saveLoaded}<span class="btn-spinner"></span>{/if}
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
			<p>Overclock your Tower with temporary Field Upgrades mid-deployment. Permanent Forge improvements between deployments. Procurement approves this spending. Mostly.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(68,255,136,0.15), rgba(0,255,255,0.05));"></div>
				<span class="feature-icon">🌊</span>
			</div>
			<h3>Endless Waves</h3>
			<p>Hostile geometry scales indefinitely. Five shape types, increasing density, and the distinct sensation that the swarm has a plan. It does not. Probably.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon-wrap">
				<div class="feature-icon-bg" style="background: linear-gradient(135deg, rgba(136,68,255,0.15), rgba(255,68,170,0.05));"></div>
				<span class="feature-icon">🔬</span>
			</div>
			<h3>Research & Progress</h3>
			<p>Unlock new Fronts, run orbital Research Deck projects (results sanitized for morale), and attempt Simulations that may not be simulations. The war waits for nobody. Especially not Accounting.</p>
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
		background:
			linear-gradient(180deg, rgba(7, 8, 18, 0.72) 0%, var(--bg-primary) 34rem),
			linear-gradient(115deg, rgba(68, 255, 136, 0.08), transparent 32rem),
			linear-gradient(245deg, rgba(255, 136, 68, 0.07), transparent 28rem),
			var(--bg-primary);
		overflow-y: auto;
		position: relative;
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
		padding: clamp(3rem, 7vh, 5.75rem) clamp(1rem, 3vw, 2rem) clamp(2rem, 5vh, 3.5rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		overflow: hidden;
		z-index: 1;
	}

	.hero-signal {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(100deg, transparent 0 22%, rgba(0, 255, 255, 0.08) 22.2% 22.6%, transparent 22.8% 100%),
			linear-gradient(258deg, transparent 0 63%, rgba(255, 221, 68, 0.08) 63.1% 63.45%, transparent 63.7% 100%),
			repeating-linear-gradient(90deg, transparent 0 5.8rem, rgba(68, 255, 136, 0.03) 5.8rem 5.86rem, transparent 5.86rem 9.4rem);
		mask-image: linear-gradient(180deg, black 0%, transparent 85%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		width: min(var(--content-max), 100%);
		animation: fadeInUp 0.6s ease;
	}

	.version-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.8rem;
		font-size: var(--fs-caption-sm);
		font-family: var(--font-tech);
		font-weight: 700;
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
		letter-spacing: 0;
	}

	.title {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.hero-logo {
		width: 100%;
		max-width: clamp(18rem, 45vw, 40rem);
		height: auto;
		filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.15));
	}

	.subtitle {
		font-size: var(--fs-heading);
		color: var(--text-secondary);
		font-family: var(--font-display);
		font-weight: 600;
		margin: 0 auto 1.35rem;
		max-width: 48rem;
		letter-spacing: 0;
		animation: fadeInUp 0.4s ease;
		transition: opacity 0.3s ease;
	}

	.description {
		color: var(--text-secondary);
		font-size: var(--fs-body);
		line-height: 1.72;
		margin-bottom: 1.15rem;
		max-width: var(--measure);
		margin-left: auto;
		margin-right: auto;
	}

	.signal-strip {
		display: inline-grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		margin: 0 auto 1.6rem;
		border: 1px solid rgba(0, 255, 255, 0.18);
		background: rgba(0, 255, 255, 0.12);
		border-radius: 8px;
		overflow: hidden;
	}

	.signal-strip span {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: clamp(7.5rem, 16vw, 11rem);
		padding: 0.55rem 0.75rem;
		background: rgba(7, 8, 18, 0.76);
		color: var(--text-secondary);
		font-size: var(--fs-caption);
		line-height: 1.2;
	}

	.signal-strip strong {
		color: var(--green);
		font-family: var(--font-display);
		font-size: var(--fs-body);
		line-height: 1;
	}

	.cta-buttons {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.9rem;
		padding: 0.78rem clamp(1.15rem, 2vw, 1.7rem);
		border-radius: 8px;
		font-weight: 700;
		font-size: var(--fs-btn);
		font-family: var(--font-display);
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

	.btn-disabled {
		pointer-events: none;
		opacity: 0.55;
	}

	.btn-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(7,8,18,.4);
		border-top-color: var(--bg-primary);
		border-radius: 50%;
		animation: btnSpin .6s linear infinite;
		margin-left: 4px;
	}

	@keyframes btnSpin {
		to { transform: rotate(360deg); }
	}

	.btn-primary:hover::before {
		opacity: 1;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.9rem;
		padding: 0.78rem clamp(1.15rem, 2vw, 1.7rem);
		border-radius: 8px;
		font-weight: 600;
		font-size: var(--fs-btn);
		font-family: var(--font-display);
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

	.btn-accent { background: linear-gradient(135deg, var(--violet), var(--pink)); box-shadow: 0 0 20px rgba(136, 68, 255, 0.2); }

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
		font-size: var(--fs-body);
		animation: fadeInUp 0.4s ease;
	}

	.coin-icon {
		font-size: var(--fs-icon-md);
	}

	.coin-amount {
		color: var(--yellow);
		font-weight: 600;
	}

	.coin-label {
		color: var(--text-dim);
		font-size: var(--fs-body-sm);
	}

	.features {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		padding: 1rem clamp(1rem, 3vw, 2rem) 3rem;
		max-width: var(--content-max);
		width: 100%;
		z-index: 1;
	}

	.feature-card {
		background: var(--bg-glass);
		border: 1px solid var(--border-neon);
		border-radius: 8px;
		padding: 1.35rem;
		text-align: left;
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
		margin: 0 0 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.feature-icon-bg {
		position: absolute;
		inset: 0;
		border-radius: 8px;
	}

	.feature-icon {
		font-size: var(--fs-icon-xl);
		position: relative;
		z-index: 1;
	}

	.feature-card h3 {
		font-size: var(--fs-subheading);
		margin-bottom: 0.5rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	.feature-card p {
		font-size: var(--fs-body-sm);
		color: var(--text-secondary);
		line-height: 1.62;
	}

	.footer {
		padding: 2rem 1.5rem;
		color: var(--text-dim);
		font-size: var(--fs-caption);
		text-align: center;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
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
		.hero {
			padding: 1.5rem 1rem 1rem;
		}
		.version-badge {
			margin-bottom: 0.8rem;
		}
		.title {
			margin-bottom: 0.5rem;
		}
		.hero-logo {
			max-width: min(15.5rem, 82vw);
		}
		.subtitle {
			margin-bottom: 0.8rem;
		}
		.description {
			line-height: 1.58;
			margin-bottom: 0.85rem;
		}
		.signal-strip {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			width: min(100%, 22rem);
			margin-bottom: 1rem;
		}
		.signal-strip span {
			min-width: 0;
			padding: 0.45rem 0.35rem;
		}
		.cta-buttons {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.55rem;
			margin-bottom: 1rem;
		}
		.btn-primary,
		.btn-secondary {
			justify-content: center;
			min-height: 2.65rem;
			padding: 0.65rem 0.75rem;
		}
		.btn-accent {
			grid-column: 1 / -1;
		}
		.features {
			padding: 1rem 1rem 1.5rem;
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 768px) and (max-width: 1023px) {
		.features {
			grid-template-columns: 1fr;
			max-width: 42rem;
		}
	}
</style>
