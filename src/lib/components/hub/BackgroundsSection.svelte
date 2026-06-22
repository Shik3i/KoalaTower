<script lang="ts">
	import { BACKGROUNDS, type BackgroundTheme } from '$lib/game/balance/backgrounds';
	import { tooltip } from '$lib/components/tooltip';

	interface Props {
		coins: number;
		selectedBackground: string;
		unlockedBackgrounds: string[];
		onSelectBackground: (id: string) => void;
		onBuyBackground: (id: string, cost: number) => void;
	}

	let {
		coins,
		selectedBackground,
		unlockedBackgrounds,
		onSelectBackground,
		onBuyBackground
	}: Props = $props();

	function isUnlocked(bg: BackgroundTheme): boolean {
		return bg.cost === 0 || unlockedBackgrounds.includes(bg.id);
	}

	function hex(c: number): string {
		return '#' + c.toString(16).padStart(6, '0');
	}
</script>

<div class="bg-container">
	<div class="sec-header">
		<h2>🌌 Battlefield Backgrounds</h2>
		<p class="sec-desc">Swap the deep-space field, glow, grid, and starlight behind the action. Cosmetic only — does not alter visibility of enemies or projectiles.</p>
	</div>

	<div class="bg-grid">
		{#each BACKGROUNDS as bg}
			{@const unlocked = isUnlocked(bg)}
			{@const active = selectedBackground === bg.id}
			<div class="bg-card" class:active class:locked={!unlocked}>
				<div
					class="bg-preview"
					style="background:
						radial-gradient(ellipse at 50% 45%, {hex(bg.colors.glowA)}22 0%, transparent 55%),
						radial-gradient(ellipse at 50% 45%, {hex(bg.colors.glowB)}18 0%, transparent 75%),
						{hex(bg.colors.deepSpace)};"
				>
					<div class="bg-grid-lines" style="background-image:
						linear-gradient({hex(bg.colors.grid)}30 1px, transparent 1px),
						linear-gradient(90deg, {hex(bg.colors.grid)}30 1px, transparent 1px);"></div>
					<div class="bg-star" style="left:24%; top:30%; background:{hex(bg.colors.star)}; box-shadow:0 0 6px {hex(bg.colors.star)}"></div>
					<div class="bg-star sm" style="left:68%; top:58%; background:{hex(bg.colors.star)}"></div>
					<div class="bg-star sm" style="left:42%; top:72%; background:{hex(bg.colors.star)}"></div>
					<div class="bg-star" style="left:78%; top:24%; background:{hex(bg.colors.star)}; box-shadow:0 0 6px {hex(bg.colors.star)}"></div>
				</div>

				<div class="bg-info">
					<div class="bg-meta">
						<span class="bg-name">{bg.name}</span>
						{#if active}
							<span class="badge active-badge">EQUIPPED</span>
						{:else if unlocked}
							<span class="badge unlocked-badge">UNLOCKED</span>
						{/if}
					</div>
					<p class="bg-desc">{bg.description}</p>
				</div>

				<div class="bg-action">
					{#if active}
						<button class="bg-btn active-btn" disabled>Equipped</button>
					{:else if unlocked}
						<button class="bg-btn select-btn" onclick={() => onSelectBackground(bg.id)}>Equip Background</button>
					{:else}
						<button
							class="bg-btn buy-btn"
							class:disabled={coins < bg.cost}
							disabled={coins < bg.cost}
							onclick={() => onBuyBackground(bg.id, bg.cost)}
							use:tooltip={`Buy for 🔩 ${bg.cost.toLocaleString()} Alloy`}
						>
							🔩 {bg.cost.toLocaleString()}
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.bg-container { display:flex; flex-direction:column; gap:1.25rem; animation:secIn 0.25s ease-out; }
	.sec-header { border-bottom:1px solid rgba(0,255,255,0.15); padding-bottom:0.75rem; }
	.sec-header h2 { font-family:var(--font-display); font-size:var(--fs-subheading); font-weight:700; color:var(--text-primary); margin:0 0 0.25rem 0; }
	.sec-desc { color:var(--text-secondary); font-size:var(--fs-body-sm); margin:0; line-height:1.45; }

	.bg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1.2rem; }

	.bg-card { background:var(--bg-secondary); border:1px solid var(--border-neon); border-radius:var(--radius-lg); padding:1.2rem; display:flex; flex-direction:column; gap:1rem; transition:all var(--transition-normal); position:relative; overflow:hidden; }
	.bg-card:hover { border-color:var(--border-neon-strong); box-shadow:0 4px 20px rgba(0,255,255,0.08); }
	.bg-card.active { border-color:var(--cyan); box-shadow:0 0 15px rgba(0,255,255,0.15); }
	.bg-card.locked { border-color:rgba(255,255,255,0.06); background:rgba(7,8,18,0.4); }

	.bg-preview { height:120px; border:1px solid rgba(255,255,255,0.05); border-radius:var(--radius-md); position:relative; overflow:hidden; }
	.bg-grid-lines { position:absolute; inset:0; background-size:20px 20px; opacity:0.5; }
	.bg-star { position:absolute; width:3px; height:3px; border-radius:50%; }
	.bg-star.sm { width:2px; height:2px; opacity:0.7; }

	.bg-info { display:flex; flex-direction:column; gap:0.35rem; flex-grow:1; }
	.bg-meta { display:flex; justify-content:space-between; align-items:center; }
	.bg-name { font-family:var(--font-display); font-weight:700; font-size:var(--fs-body); color:var(--text-primary); }
	.badge { font-size:var(--fs-caption-sm); font-weight:700; padding:0.15rem 0.4rem; border-radius:var(--radius-xs); letter-spacing:0.05em; }
	.active-badge { background:var(--cyan); color:var(--bg-primary); }
	.unlocked-badge { background:rgba(0,255,255,0.1); color:var(--cyan); border:1px solid rgba(0,255,255,0.2); }
	.bg-desc { color:var(--text-secondary); font-size:var(--fs-body-sm); margin:0; line-height:1.35; }

	.bg-action { margin-top:auto; }
	.bg-btn { width:100%; min-height:48px; padding:0.5rem; border-radius:var(--radius-md); font-weight:600; font-size:var(--fs-btn-sm); cursor:pointer; transition:all var(--transition-fast); border:1px solid transparent; }
	.bg-btn:active:not(:disabled) { transform: scale(0.96); }
	.active-btn { background:transparent; border-color:rgba(0,255,255,0.2); color:var(--cyan); cursor:default; }
	.select-btn { background:var(--bg-tertiary); border-color:var(--border-neon); color:var(--text-primary); }
	.select-btn:hover { background:rgba(0,255,255,0.08); border-color:var(--cyan); color:var(--cyan); }
	.buy-btn { background:var(--yellow); color:var(--bg-primary); }
	.buy-btn:hover { box-shadow:0 0 10px rgba(255,210,74,0.4); }
	.buy-btn.disabled { background:rgba(255,255,255,0.05); color:var(--text-dim); cursor:not-allowed; }

	@keyframes secIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
</style>
