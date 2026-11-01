<script lang="ts">
	import { stateModal } from 'state-shared';

	import { i18nDerived } from 'components-ui-html/src/i18n/i18nDerived';
	import '../ui/summit/summitType.css';
</script>

{#if stateModal.modal?.name === 'insufficientBalance'}
	<section class="stake-modal-overlay summit-ui-type" aria-label={i18nDerived.insufficientFundsTitle()} role="dialog" aria-modal="true">
		<button class="stake-modal-scrim" aria-label="dismiss" onclick={() => (stateModal.modal = null)}></button>
		<div class="stake-modal-card">
			<h2>{i18nDerived.insufficientFundsTitle()}</h2>
			<p>{stateModal.modal.message ?? i18nDerived.insufficientFunds()}</p>
			<button type="button" onclick={() => (stateModal.modal = null)}>OK</button>
		</div>
	</section>
{/if}

<style>
	.stake-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 15000;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	.stake-modal-overlay > .stake-modal-scrim,
	.stake-modal-overlay > .stake-modal-card {
		pointer-events: auto;
	}

	.stake-modal-scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(0, 0, 0, 0.55);
		cursor: pointer;
	}

	.stake-modal-card {
		position: relative;
		z-index: 1;
		width: min(420px, calc(100vw - 32px));
		padding: 28px 24px 22px;
		border-radius: 2px;
		background: #000;
		border: 1px solid #fff;
		color: #fff;
		text-align: center;
		box-shadow: none;
	}

	.stake-modal-card h2 {
		margin: 0 0 12px;
		font-size: 22px;
		letter-spacing: 0.04em;
		color: #fff;
		text-transform: uppercase;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.stake-modal-card p {
		margin: 0 0 18px;
		font-size: 15px;
		line-height: 1.45;
		color: #fff;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.stake-modal-card button {
		min-width: 120px;
		padding: 10px 18px;
		border: 1px solid #fff;
		border-radius: 2px;
		background: #000;
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}
</style>
