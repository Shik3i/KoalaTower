<script lang="ts">
	let { data } = $props();

	function fmtDate(value: string | null): string {
		if (!value) return '—';
		const t = Date.parse(value);
		return Number.isFinite(t) ? new Date(t).toLocaleString() : value;
	}
</script>

<h2 class="admin-section-title">Community buff</h2>

{#if data.dbError || !data.summary}
	<div class="admin-error">Database unavailable — community buff state cannot be loaded right now.</div>
{:else}
	{@const s = data.summary}
	<div class="admin-cards">
		<div class="admin-card">
			<span class="label">Active buff</span>
			<span class="value">{s.activePercent}%</span>
			<span class="sub">cap {s.capPercent}%</span>
		</div>
		<div class="admin-card">
			<span class="label">Active events</span>
			<span class="value">{s.activeEvents}</span>
		</div>
		<div class="admin-card">
			<span class="label">Active until</span>
			<span class="value" style="font-size:1rem">{fmtDate(s.activeUntil)}</span>
		</div>
	</div>

	<h2 class="admin-section-title">Recent buff events ({data.events.length})</h2>
	{#if data.events.length === 0}
		<div class="admin-empty">No community buff events recorded.</div>
	{:else}
		<div class="admin-table-wrap">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Created</th>
						<th>Source</th>
						<th>Ko-fi message id</th>
						<th>Percent</th>
						<th>Amount</th>
						<th>Currency</th>
						<th>Starts</th>
						<th>Expires</th>
					</tr>
				</thead>
				<tbody>
					{#each data.events as e (e.id)}
						<tr>
							<td>{fmtDate(e.created_at)}</td>
							<td>{e.source}</td>
							<td>{e.source_ref}</td>
							<td>{e.percent}%</td>
							<td>{e.amount ?? '—'}</td>
							<td>{e.currency ?? '—'}</td>
							<td>{fmtDate(e.starts_at)}</td>
							<td>{fmtDate(e.expires_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}
