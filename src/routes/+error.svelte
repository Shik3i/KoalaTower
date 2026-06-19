<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	// page.status is the HTTP status (404, 500, ...). page.error?.message carries
	// the rendered reason. Both come straight from SvelteKit's error pipeline.
	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Unknown signal loss');

	const flavor: Record<number, string> = {
		404: 'Telemetry lost. The Front you requested is not on any map.',
		500: 'Orbital Command detected a critical malfunction.',
	};
	const sub = $derived(flavor[status] ?? 'An unexpected error propagated through the network.');
</script>

<svelte:head>
	<title>{status} · Flatland TD</title>
	<meta name="description" content="Flatland TD error — signal degraded. Return to the deployment bay." />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="err">
	<div class="err-panel glass-panel">
		<h1 class="err-status" aria-live="polite">{status}</h1>
		<div class="err-divider"></div>
		<p class="err-msg">{message}</p>
		<p class="err-sub">{sub}</p>

		<nav class="err-actions" aria-label="Recovery navigation">
			<a class="err-btn primary" href="/">
				<Icon name="back" size={16} />
				Home
			</a>
			<a class="err-btn" href="/play">
				<Icon name="range" size={16} />
				Deploy
			</a>
			<a class="err-btn" href="/hub">
				<Icon name="hub" size={16} />
				Orbital Command
			</a>
			<a class="err-btn" href="/help">
				<Icon name="settings" size={16} />
				Help
			</a>
		</nav>

		<button class="err-retry" onclick={() => location.reload()} type="button">
			↻ Retry connection
		</button>
	</div>

	<p class="err-foot">If this keeps happening, report it on the project's GitHub issues.</p>
</main>

<style>
	.err {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		background-image:
			radial-gradient(circle at 20% 30%, rgba(255, 68, 170, 0.06), transparent 40%),
			radial-gradient(circle at 80% 70%, rgba(0, 255, 255, 0.05), transparent 40%);
	}

	.err-panel {
		max-width: 32rem;
		width: 100%;
		padding: 2rem 2.25rem;
		text-align: center;
		animation: errIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.err-status {
		font-family: var(--font-tech);
		font-size: clamp(3rem, 12vw, 5.5rem);
		font-weight: 700;
		line-height: 1;
		background: linear-gradient(135deg, var(--pink), var(--cyan));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 18px rgba(255, 68, 170, 0.35));
	}

	.err-divider {
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--border-neon-strong), transparent);
		margin: 1rem 0;
	}

	.err-msg {
		font-family: var(--font-mono);
		font-size: var(--fs-body-sm);
		color: var(--text-primary);
		margin-bottom: 0.4rem;
	}

	.err-sub {
		font-size: var(--fs-caption);
		color: var(--text-secondary);
		font-style: italic;
		margin-bottom: 1.5rem;
	}

	.err-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.err-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 1rem;
		font-size: var(--fs-body-sm);
		font-weight: 600;
		font-family: var(--font-mono);
		text-decoration: none;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.err-btn:hover {
		color: var(--cyan);
		border-color: var(--border-neon-strong);
		background: rgba(0, 255, 255, 0.06);
	}

	.err-btn.primary {
		background: var(--cyan);
		color: var(--bg-primary);
		border-color: var(--cyan);
	}

	.err-btn.primary:hover {
		background: var(--cyan);
		color: var(--bg-primary);
		filter: brightness(1.1);
		box-shadow: 0 0 14px rgba(0, 255, 255, 0.4);
	}

	.err-retry {
		background: transparent;
		border: none;
		color: var(--text-dim);
		font-size: var(--fs-caption);
		font-family: var(--font-mono);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		transition: color var(--transition-fast);
	}

	.err-retry:hover { color: var(--cyan); }

	.err-foot {
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		opacity: 0.7;
	}

	@keyframes errIn {
		from { opacity: 0; transform: translateY(8px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0)   scale(1); }
	}

	@media (max-width: 600px) {
		.err-panel { padding: 1.5rem 1.25rem; }
		.err-btn { flex: 1; justify-content: center; }
	}
</style>
