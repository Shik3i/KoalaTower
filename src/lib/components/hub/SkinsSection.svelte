<script lang="ts">
	import { TOWER_SKINS, type TowerSkin } from '$lib/game/balance/skins';
	import { tooltip } from '$lib/components/tooltip';
	import Icon from '$lib/components/Icon.svelte';
	import { ChallengeId } from '$lib/game/engine/gameTypes';

	interface Props {
		coins: number;
		selectedSkin: string;
		unlockedSkins: string[];
		challengeHighScores: Partial<Record<string, number>>;
		onSelectSkin: (id: string) => void;
		onBuySkin: (id: string, cost: number) => void;
	}

	let {
		coins,
		selectedSkin,
		unlockedSkins,
		challengeHighScores,
		onSelectSkin,
		onBuySkin
	}: Props = $props();

	function isUnlocked(skin: TowerSkin): boolean {
		if (unlockedSkins.includes(skin.id)) return true;
		if (skin.currency === 'achievement' && skin.achievementId) {
			if (skin.achievementId === 'glass_tower_100') {
				return (challengeHighScores[ChallengeId.GlassTower] ?? 0) >= 100;
			}
		}
		return false;
	}

	function hexToCssColor(hex: number): string {
		return '#' + hex.toString(16).padStart(6, '0');
	}
</script>

<div class="skins-container">
	<div class="sec-header">
		<h2>🎨 Customization</h2>
		<p class="sec-desc">Re-tune the visual appearance and color profile of the tower core. Skins recolour the octagon body, inner rings, energy core, range indicator, and muzzle flashes. Cosmetic only — does not alter defensive metrics.</p>
	</div>

	<div class="skins-grid">
		{#each TOWER_SKINS as skin}
			{@const unlocked = isUnlocked(skin)}
			{@const active = selectedSkin === skin.id}
			<div class="skin-card" class:active={active} class:locked={!unlocked}>
				<!-- Visual Preview of Tower Colors -->
				<div class="skin-preview" style="--core-fill: {hexToCssColor(skin.colors.coreFill)}; --core-stroke: {hexToCssColor(skin.colors.coreStroke)}; --inner-stroke: {hexToCssColor(skin.colors.innerStroke1)}; --muzzle: {hexToCssColor(skin.colors.muzzleColor)}">
					<div class="preview-core">
						<div class="preview-inner"></div>
						<div class="preview-center" style="background: {hexToCssColor(skin.colors.centerBright)}; box-shadow: 0 0 10px var(--muzzle), 0 0 4px {hexToCssColor(skin.colors.centerBright)}"></div>
					</div>
				</div>

				<div class="skin-info">
					<div class="skin-meta">
						<span class="skin-name">{skin.name}</span>
						{#if active}
							<span class="badge active-badge">EQUIPPED</span>
						{:else if unlocked}
							<span class="badge unlocked-badge">UNLOCKED</span>
						{:else if skin.currency === 'achievement'}
							<span class="badge challenge-badge">CHALLENGE</span>
						{/if}
					</div>
					<p class="skin-desc">{skin.description}</p>
				</div>

				<div class="skin-action">
					{#if active}
						<button class="skin-btn active-btn" disabled>Equipped</button>
					{:else if unlocked}
						<button class="skin-btn select-btn" onclick={() => onSelectSkin(skin.id)}>Equip Skin</button>
					{:else if skin.currency === 'alloy'}
						<button
							class="skin-btn buy-btn"
							class:disabled={coins < skin.cost}
							disabled={coins < skin.cost}
							onclick={() => onBuySkin(skin.id, skin.cost)}
							use:tooltip={`Buy for 🔩 ${skin.cost.toLocaleString()} Alloy`}
						>
							🔩 {skin.cost.toLocaleString()}
						</button>
					{:else if skin.currency === 'achievement'}
						<div class="achievement-lock" use:tooltip={`Complete Wave 100 on the Glass Tower challenge to unlock this skin.`}>
							<Icon name="lock" size={13} /> Wave 100 on Glass Tower
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.skins-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		animation: secIn 0.25s ease-out;
	}
	.sec-header {
		border-bottom: 1px solid rgba(0, 255, 255, 0.15);
		padding-bottom: 0.75rem;
	}
	.sec-header h2 {
		font-family: var(--font-display);
		font-size: var(--fs-subheading);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
	}
	.sec-desc {
		color: var(--text-secondary);
		font-size: var(--fs-body-sm);
		margin: 0;
		line-height: 1.45;
	}

	.skins-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.2rem;
	}

	.skin-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-neon);
		border-radius: var(--radius-lg);
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		transition: all var(--transition-normal);
		position: relative;
		overflow: hidden;
	}
	.skin-card:hover {
		border-color: var(--border-neon-strong);
		box-shadow: 0 4px 20px rgba(0, 255, 255, 0.08);
	}
	.skin-card.active {
		border-color: var(--cyan);
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
	}
	.skin-card.locked {
		border-color: rgba(255, 255, 255, 0.06);
		background: rgba(7, 8, 18, 0.4);
	}

	/* CSS Tower Preview Graphic */
	.skin-preview {
		height: 120px;
		background: #040508;
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-md);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.preview-core {
		width: 44px;
		height: 44px;
		background: var(--core-fill);
		border: 2px solid var(--core-stroke);
		border-radius: 6px; /* octagon representation */
		transform: rotate(45deg);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 12px var(--core-stroke);
		z-index: 2;
	}
	/* Inner ring — mirrors the real tower's inner octagon stroke. */
	.preview-inner {
		position: absolute;
		inset: 9px;
		border: 1px solid var(--inner-stroke);
		border-radius: 4px;
		opacity: 0.6;
	}
	.preview-center {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		transform: rotate(-45deg);
		z-index: 1;
	}

	.skin-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex-grow: 1;
	}
	.skin-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.skin-name {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: var(--fs-body);
		color: var(--text-primary);
	}
	.badge {
		font-size: var(--fs-caption-sm);
		font-weight: 700;
		padding: 0.15rem 0.4rem;
		border-radius: var(--radius-xs);
		letter-spacing: 0.05em;
	}
	.active-badge {
		background: var(--cyan);
		color: var(--bg-primary);
	}
	.unlocked-badge {
		background: rgba(0, 255, 255, 0.1);
		color: var(--cyan);
		border: 1px solid rgba(0, 255, 255, 0.2);
	}
	.challenge-badge {
		background: rgba(255, 170, 0, 0.1);
		color: #FFAA00;
		border: 1px solid rgba(255, 170, 0, 0.2);
	}

	.skin-desc {
		color: var(--text-secondary);
		font-size: var(--fs-body-sm);
		margin: 0;
		line-height: 1.35;
	}

	.skin-action {
		margin-top: auto;
	}
	.skin-btn {
		width: 100%;
		min-height: 48px;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--fs-btn-sm);
		cursor:pointer;
		transition: all var(--transition-fast);
		border: 1px solid transparent;
	}
	.skin-btn:active:not(:disabled) {
		transform: scale(0.96);
	}
	.active-btn {
		background: transparent;
		border-color: rgba(0, 255, 255, 0.2);
		color: var(--cyan);
		cursor: default;
	}
	.select-btn {
		background: var(--bg-tertiary);
		border-color: var(--border-neon);
		color: var(--text-primary);
	}
	.select-btn:hover {
		background: rgba(0, 255, 255, 0.08);
		border-color: var(--cyan);
		color: var(--cyan);
	}
	.buy-btn {
		background: var(--yellow);
		color: var(--bg-primary);
	}
	.buy-btn:hover {
		box-shadow: 0 0 10px rgba(255, 210, 74, 0.4);
	}
	.buy-btn.disabled {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-dim);
		cursor: not-allowed;
	}

	.achievement-lock {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		font-size: var(--fs-caption-sm);
		color: var(--text-dim);
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		border-radius: var(--radius-md);
		text-align: center;
	}

	@keyframes secIn {
		from { opacity: 0; transform: translateY(5px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
