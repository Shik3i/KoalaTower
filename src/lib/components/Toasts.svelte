<script lang="ts">
	import type { ToastController } from '$lib/stores/toastStore';

	let {
		controller,
		vertical = 'top',
		offsetRem = 3,
		zIndex = 300,
	}: {
		controller: ToastController;
		vertical?: 'top' | 'bottom';
		offsetRem?: number;
		zIndex?: number;
	} = $props();
</script>

<!--
  The live region is always in the DOM so that screen reader announcements
  work regardless of whether there are currently visible toasts.
  Error toasts use role="alert" (implicitly assertive); all others are polite.
-->
<div
	class="toast-stack"
	style="{vertical}:{offsetRem}rem; z-index:{zIndex};"
	aria-live="polite"
	aria-atomic="false"
	role="status"
>
	{#each $controller as t (t.id)}
		{#if t.type === 'error'}
			<div class="toast toast-{t.type}" role="alert">{t.msg}</div>
		{:else}
			<div class="toast toast-{t.type}">{t.msg}</div>
		{/if}
	{/each}
</div>

<style>
	.toast-stack {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: .3rem;
		pointer-events: none;
		max-width: min(90vw, 480px);
		width: max-content;
	}
	.toast {
		padding: .4rem 1rem;
		font-size: var(--fs-body-sm);
		border-radius: 100px;
		white-space: normal;
		word-break: break-word;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		animation: toast-in .2s ease;
		box-shadow: 0 0 20px rgba(0, 0, 0, .3);
	}
	.toast-info { background: rgba(0, 255, 255, .1); color: var(--cyan); border: 1px solid rgba(0, 255, 255, .25); }
	.toast-success { background: rgba(68, 255, 136, .1); color: var(--green); border: 1px solid rgba(68, 255, 136, .25); }
	.toast-warning { background: rgba(255, 68, 68, .1); color: var(--red); border: 1px solid rgba(255, 68, 68, .25); }
	.toast-error { background: rgba(255, 68, 68, .12); color: #FF6666; border: 1px solid rgba(255, 68, 68, .3); }
	.toast-milestone { background: rgba(255, 221, 68, .1); color: var(--yellow); border: 1px solid rgba(255, 221, 68, .25); }
	@keyframes toast-in {
		from { opacity: 0; transform: translateY(-8px) scale(.95); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
</style>
