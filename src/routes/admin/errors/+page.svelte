<script lang="ts">
	let { data } = $props();

	function fmtDate(value: string | null): string {
		if (!value) return '—';
		const t = Date.parse(value);
		return Number.isFinite(t) ? new Date(t).toLocaleString() : value;
	}
</script>

<h2 class="admin-section-title">Error log ({data.logs.length})</h2>

{#if data.dbError}
	<div class="admin-error">Database unavailable — error log cannot be loaded right now.</div>
{:else if data.logs.length === 0}
	<div class="admin-empty">No errors logged.</div>
{:else}
	<div class="admin-table-wrap">
		<table class="admin-table">
			<thead>
				<tr>
					<th>Time</th>
					<th>Level</th>
					<th>Source</th>
					<th>Route</th>
					<th>Method</th>
					<th>Status</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				{#each data.logs as log (log.id)}
					<tr>
						<td>{fmtDate(log.created_at)}</td>
						<td>{log.level}</td>
						<td>{log.source}</td>
						<td>{log.route ?? '—'}</td>
						<td>{log.method ?? '—'}</td>
						<td>{log.status ?? '—'}</td>
						<td class="wrap">
							{#if log.stack}
								<details class="admin-details">
									<summary>{log.message}</summary>
									<pre>{log.stack}</pre>
								</details>
							{:else}
								{log.message}
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
