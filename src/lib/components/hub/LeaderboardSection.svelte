<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchUnverifiedLeaderboard, type UnverifiedLeaderboardEntry } from '$lib/online/leaderboardClient';

	let entries = $state<UnverifiedLeaderboardEntry[]>([]);
	let loading = $state(false);
	let error = $state('');
	let loaded = $state(false);

	async function refresh() {
		loading = true;
		error = '';
		try {
			const result = await fetchUnverifiedLeaderboard();
			if (result.ok) {
				entries = result.data.entries;
				loaded = true;
			} else {
				error = result.message;
			}
		} finally {
			loading = false;
		}
	}

	function formatDate(value: string): string {
		const date = new Date(value);
		return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : '—';
	}

	onMount(() => { void refresh(); });
</script>

<div class="hs">
	<h2 class="hst">🏆 Community Leaderboard</h2>
	<p class="hsd">Public fun ranking for completed standard deployments. Scores, waves, and run data are client-submitted and <strong>not verified or fair-proof</strong>.</p>
	<div class="board-head">
		<span>{loaded ? `${entries.length} entries` : 'Loading entries…'}</span>
		<button class="hub-action" onclick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
	</div>
	{#if error}
		<div class="board-state error">{error}</div>
	{:else if !loaded}
		<div class="board-state">Loading community runs…</div>
	{:else if entries.length === 0}
		<div class="board-state">No community runs submitted yet. Be the first from the game-over screen.</div>
	{:else}
		<div class="board" role="table" aria-label="Unverified community leaderboard">
			<div class="row header" role="row">
				<span>#</span><span>Commander</span><span>Front</span><span>Wave</span><span>Score</span><span>Date</span>
			</div>
			{#each entries as entry, index}
				<div class="row" role="row">
					<span class="rank">{index + 1}</span>
					<span class="name">{entry.displayName}</span>
					<span>{entry.frontId}</span>
					<span>{entry.wave.toLocaleString()}</span>
					<span class="score">{entry.score.toLocaleString()}</span>
					<span>{formatDate(entry.createdAt)}</span>
				</div>
			{/each}
		</div>
	{/if}
	<p class="board-note">Unverified = community/fun only. The official challenge ranking will require server-side replay validation.</p>
</div>

<style>
	.hs { animation: fi .2s ease; }
	.hst { font-size:var(--fs-heading); color:var(--cyan); margin-bottom:.4rem; }
	.hsd { color:var(--text-secondary); font-size:var(--fs-body); margin-bottom:1rem; line-height:1.6; }
	.hsd strong { color:var(--yellow); }
	.board-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.65rem; color:var(--text-dim); font-family:var(--font-mono); font-size:var(--fs-caption); }
	.hub-action { padding:.45rem .8rem; border:1px solid var(--border-neon); border-radius:var(--radius-sm); background:transparent; color:var(--text-secondary); cursor:pointer; }
	.hub-action:hover { border-color:var(--cyan); color:var(--text-primary); }
	.hub-action:disabled { opacity:.45; cursor:default; }
	.board { overflow-x:auto; border:1px solid var(--border-neon); border-radius:var(--radius-sm); background:var(--bg-tertiary); }
	.row { display:grid; grid-template-columns:2.5rem minmax(9rem,1.5fr) 4rem 5rem 7rem 6.5rem; align-items:center; gap:.5rem; min-width:34rem; padding:.55rem .7rem; color:var(--text-secondary); font-family:var(--font-mono); font-size:var(--fs-caption); }
	.row:nth-child(even) { background:rgba(255,255,255,.025); }
	.row.header { color:var(--text-dim); border-bottom:1px solid var(--border-neon); text-transform:uppercase; letter-spacing:.04em; font-size:var(--fs-caption-sm); }
	.rank { color:var(--cyan); }
	.name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); }
	.score { color:var(--yellow); }
	.board-state { padding:1rem; border:1px dashed var(--border-neon); border-radius:var(--radius-sm); color:var(--text-secondary); }
	.board-state.error { color:var(--red); border-color:rgba(255,68,68,.35); }
	.board-note { margin-top:1rem; color:var(--text-dim); font-size:var(--fs-caption-sm); line-height:1.5; }
	@keyframes fi { from{opacity:0} to{opacity:1} }
</style>
