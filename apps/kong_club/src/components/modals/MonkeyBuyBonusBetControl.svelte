<script lang="ts">
	import { stateBet, stateConfig } from 'state-shared';
	import { formatMoney } from '../../game/stakeMoney';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { betControlDecreaseAria, betControlIncreaseAria, toolbarLabel } from '../../game/socialCopy';
	import {
		applyToolbarBetAmount,
		isToolbarBetUpBlockedByAffordability,
	} from '../../game/betAmountChange';
	import { showInsufficientBalanceModal } from '../../game/insufficientBalance';
	import { insufficientBetIncreaseMessage } from '../../game/socialCopy';

	type Props = {
		portrait?: boolean;
	};

	const props: Props = $props();

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const betValue = $derived(formatMoney(stateBet.betAmount, 'bet'));

	const biggestBet = $derived(
		stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
	);
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const increaseAtMax = $derived(stateBet.betAmount >= biggestBet);
	const increaseUnaffordable = $derived(isToolbarBetUpBlockedByAffordability());
	const canDecrease = $derived(stateBet.betAmount > smallestBet);

	const changeBet = (direction: 'up' | 'down') => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const options = stateConfig.betAmountOptions;
		if (direction === 'up') {
			if (increaseAtMax) return;
			if (increaseUnaffordable) {
				showInsufficientBalanceModal(insufficientBetIncreaseMessage());
				return;
			}
			const next = [...options]
				.sort((a, b) => a - b)
				.find((o) => o > stateBet.betAmount);
			applyToolbarBetAmount(next ?? biggestBet);
			return;
		}
		const next = [...options]
			.sort((a, b) => b - a)
			.find((o) => o < stateBet.betAmount);
		applyToolbarBetAmount(next ?? smallestBet);
	};
</script>

<div class="bet-block bonus-bet-control summit-ui-type" class:portrait={props.portrait} data-bonus-bet>
	<p class="bet-heading">{toolbarLabel('bet')}</p>
	<div class="bet-controls">
		<button
			type="button"
			class="bet-step"
			aria-label={betControlDecreaseAria()}
			disabled={!canDecrease}
			onclick={() => changeBet('down')}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M5.5 9 L12 15 L18.5 9"
					fill="none"
					stroke="currentColor"
					stroke-width="3.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<span class="bet-amount">{betValue}</span>
		<button
			type="button"
			class="bet-step"
			class:unaffordable={increaseUnaffordable}
			aria-label={betControlIncreaseAria()}
			disabled={increaseAtMax}
			onclick={() => changeBet('up')}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M5.5 15 L12 9 L18.5 15"
					fill="none"
					stroke="currentColor"
					stroke-width="3.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>
</div>

<style lang="scss">
	.bet-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
		user-select: none;
		background-color: transparent;
		background-image: none;
		border: 0;
		border-radius: 0;
		padding: 10px 16px;
		box-shadow: none;
		color: #fff;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.bet-heading {
		margin: 0;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 22px;
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.05em;
		color: #ffffff;
		text-transform: uppercase;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.bet-controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 50px;
	}

	.bet-amount {
		min-width: 7rem;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 32px;
		font-weight: 400;
		line-height: 1;
		color: #ffffff;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.bet-block.portrait {
		padding: 10px 24px 12px;
		width: min(100%, 320px);
	}

	.bet-block.portrait .bet-heading {
		font-size: 18px;
	}

	.bet-block.portrait .bet-amount {
		font-size: 26px;
		min-width: 5.5rem;
	}

	.bet-block.portrait .bet-controls {
		gap: 36px;
	}

	.bet-step {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		color: #ffffff;
		cursor: pointer;
		touch-action: manipulation;

		svg {
			width: 28px;
			height: 28px;
			pointer-events: none;
		}

		&:hover:not(:disabled) {
			background: transparent;
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}

		&.unaffordable:not(:disabled) {
			opacity: 0.35;
			cursor: pointer;
		}
	}
</style>
