<script lang="ts">
	import { onMount } from 'svelte';

	import { OnHotkey } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import {
		stateBet,
		stateBetDerived,
		stateModal,
		stateUi,
		INFINITY_MARK,
	} from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { getContextXstate } from 'utils-xstate';
	import { stateBonus, stateBonusDerived } from 'components-ui-html/src/stateBonus.svelte';
	import type { EmitterEventModal } from 'components-ui-html/src/types';

	import { getGameLayoutProfile } from '../../game/responsiveProfile.svelte';
	import { unlockGameAudio } from '../../game/audioUnlock.svelte';
	import { startBuyBonusRound } from '../../game/buyBonusEntry';
	import {
		BUY_BONUS_BLUR_PX,
		BUY_BONUS_CARD_GAP,
		BUY_BONUS_CARD_W,
		BUY_BONUS_CARDS,
		BUY_BONUS_CLOSE_INSET,
		BUY_BONUS_CLOSE_SIZE,
		BUY_BONUS_GRID_COLS,
		BUY_BONUS_GROUP_H,
		BUY_BONUS_GROUP_W,
		BUY_BONUS_OVERLAY_OPACITY,
		BUY_BONUS_BET_BLOCK_GAP,
		BUY_BONUS_MENU_PREFETCH,
		buyBonusCardActionKind,
		buyBonusCardByMode,
		buyBonusModeCostMultiplier,
		buyBonusPortraitConfirmWidth,
		isActivateBetMode,
	} from '../../game/buyBonusScreen';
	import { assetSrc } from '../../assets/resolve';
	import { buyBonusActionLabel, insufficientBalanceMessage, autoSpinBeforeBonusMessage } from '../../game/socialCopy';
	import MonkeyBuyBonusBetControl from './MonkeyBuyBonusBetControl.svelte';
	import MonkeyBuyBonusPortraitLayout from './MonkeyBuyBonusPortraitLayout.svelte';
	import {
		isAnyBuyBonusMathLoading,
		isMathBooksLoading,
	} from '../../game/stateMathBooksLoading.svelte';
	import { notifyExtraChanceActivated } from '../../game/extraChancePresentation.svelte';
	import { notifyFeatureSpinActivated } from '../../game/featureSpinPresentation.svelte';
	import { ANTE_BET_MODE_KEY, FEATURE_SPIN_BET_MODE_KEY, activateToggleBetMode, type ActivateBetModeKey, type OneShotBuyModeKey } from '../../game/betModes';
	import { isBuyFeatureDisabled } from '../../game/jurisdiction';
	import MonkeyBuyBonusCard from './MonkeyBuyBonusCard.svelte';

	type Props = {
		onclose: () => void;
	};

	const props: Props = $props();

	const { eventEmitter: modalEventEmitter } = getContextEventEmitter<EmitterEventModal>();
	const { stateXstateDerived } = getContextXstate();

	let selectedModeKey = $state<string | null>(null);
	let confirmInFlight = $state(false);
	let uiScale = $state(1);
	/** Ignore overlay dismiss briefly after open (mobile ghost-click after Pixi tap). */
	let suppressDismissUntil = $state(0);

	const isPortrait = $derived(getGameLayoutProfile().mode === 'portrait');
	const portraitConfirmWidth = $derived(buyBonusPortraitConfirmWidth(window.innerWidth));

	const autoPlayActive = $derived(
		stateXstateDerived.isAutoBetting() ||
			stateBetDerived.isContinuousBet() ||
			stateBet.autoSpinsCounter > 0,
	);
	const buyFeatureDisabled = $derived(isBuyFeatureDisabled());

	const selectedCard = $derived(
		selectedModeKey ? buyBonusCardByMode(selectedModeKey) : undefined,
	);

	const selectedMode = $derived(stateBonusDerived.selectedBetModeData());

	const bonusLoading = $derived(isAnyBuyBonusMathLoading());

	const selectedModeLoading = $derived(
		selectedModeKey != null && isMathBooksLoading(selectedModeKey),
	);

	const modeCost = (mode: string) => stateBet.betAmount * buyBonusModeCostMultiplier(mode);
	const isModeUnaffordable = (mode: string) => modeCost(mode) > stateBet.balanceAmount;

	const selectedTotalCost = $derived(
		selectedMode ? stateBet.betAmount * selectedMode.costMultiplier : 0,
	);
	const insufficientSelectedBalance = $derived(
		Boolean(selectedMode && selectedTotalCost > stateBet.balanceAmount),
	);

	const canConfirm = $derived.by(() => {
		if (confirmInFlight) return false;
		if (autoPlayActive || !selectedMode || !selectedModeKey) return false;
		if (bonusLoading || selectedModeLoading) return false;
		if (selectedMode.type === 'buy' && buyFeatureDisabled) return false;
		if (selectedMode.type === 'buy' || selectedMode.type === 'activate') {
			return stateBet.betAmount > 0 && !insufficientSelectedBalance;
		}
		return true;
	});

	const isCardDisabled = (mode: string) => {
		if (autoPlayActive) return true;
		if (buyFeatureDisabled && !isActivateBetMode(mode)) return true;
		return isModeUnaffordable(mode);
	};

	const updateScale = () => {
		if (getGameLayoutProfile().mode === 'portrait') {
			uiScale = 1;
			return;
		}
		const horizontalPad = 48;
		const widthFit = (window.innerWidth - horizontalPad) / BUY_BONUS_GROUP_W;
		const stackH = BUY_BONUS_GROUP_H + BUY_BONUS_BET_BLOCK_GAP + 72;
		const heightFit = (window.innerHeight - 48) / stackH;
		uiScale = Math.min(1, widthFit, heightFit);
	};

	const selectCard = (mode: string) => {
		if (isCardDisabled(mode)) return;
		selectedModeKey = mode;
		stateBonus.selectedBetModeKey = mode;
		modalEventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const backToSelector = () => {
		selectedModeKey = null;
		stateBonus.selectedBetModeKey = null;
	};

	const closeScreen = () => {
		backToSelector();
		props.onclose();
	};

	const dismissSelection = () => {
		if (selectedModeKey) {
			backToSelector();
			return true;
		}
		return false;
	};

	const dismissOverlay = () => {
		if (performance.now() < suppressDismissUntil) return;
		if (dismissSelection()) return;
		closeScreen();
	};

	const handleConfirm = async (event: MouseEvent) => {
		event.stopPropagation();
		if (confirmInFlight || !canConfirm || !selectedMode || !selectedModeKey) return;
		if (selectedMode.type === 'buy' && buyFeatureDisabled) return;
		if (insufficientSelectedBalance) return;

		confirmInFlight = true;
		try {
			if (isActivateBetMode(selectedModeKey) || selectedMode.type === 'activate') {
				if (
					!activateToggleBetMode(
						selectedModeKey as ActivateBetModeKey,
					)
				) {
					return;
				}
				unlockGameAudio();
				stateUi.autoSpinsLossLimitText = INFINITY_MARK;
				stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
				if (selectedModeKey === ANTE_BET_MODE_KEY) {
					notifyExtraChanceActivated();
				}
				if (selectedModeKey === FEATURE_SPIN_BET_MODE_KEY) {
					notifyFeatureSpinActivated();
				}
				modalEventEmitter.broadcast({ type: 'soundPressGeneral' });
				selectedModeKey = null;
				stateModal.modal = null;
				return;
			}

			if (selectedMode.type === 'buy') {
				const buyModeKey = selectedModeKey as OneShotBuyModeKey;
				unlockGameAudio();
				modalEventEmitter.broadcast({ type: 'soundPressGeneral' });
				selectedModeKey = null;
				stateModal.modal = null;
				await startBuyBonusRound(buyModeKey);
				return;
			}

			modalEventEmitter.broadcast({ type: 'soundPressGeneral' });
			selectedModeKey = null;
			stateModal.modal = null;
		} finally {
			confirmInFlight = false;
		}
	};

	onMount(() => {
		selectedModeKey = null;
		updateScale();
		suppressDismissUntil = performance.now() + 450;
		for (const src of BUY_BONUS_MENU_PREFETCH) {
			const img = new Image();
			img.src = assetSrc(src);
		}
		window.addEventListener('resize', updateScale);
		return () => window.removeEventListener('resize', updateScale);
	});
</script>

<OnHotkey hotkey="Escape" onpress={dismissOverlay} />

<!-- Click on the dimmed area (anywhere not on a card or the close button) closes the screen. -->
<div
	class="buy-bonus-screen bonus-panel summit-ui-type"
	role="dialog"
	aria-modal="true"
	aria-label="Buy bonus"
	style={`z-index: ${zIndex.modal};`}
>
	<button
		type="button"
		class="backdrop"
		aria-label="Close bonus screen"
		style={`background: rgba(0, 0, 0, ${BUY_BONUS_OVERLAY_OPACITY}); backdrop-filter: blur(${BUY_BONUS_BLUR_PX}px); -webkit-backdrop-filter: blur(${BUY_BONUS_BLUR_PX}px);`}
		onclick={dismissOverlay}
	></button>

	<button
		type="button"
		class="close-btn bonus-close"
		class:portrait={isPortrait}
		aria-label="Close bonus screen"
		style={isPortrait
			? undefined
			: `top: calc(${BUY_BONUS_CLOSE_INSET}px * ${uiScale}); right: calc(${BUY_BONUS_CLOSE_INSET}px * ${uiScale}); width: calc(${BUY_BONUS_CLOSE_SIZE}px * ${uiScale}); height: calc(${BUY_BONUS_CLOSE_SIZE}px * ${uiScale});`}
		onclick={dismissOverlay}
	>
		<svg
			class="close-icon"
			viewBox="0 0 34 34"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<line x1="8" y1="8" x2="26" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round" />
			<line x1="26" y1="8" x2="8" y2="26" stroke="white" stroke-width="2.5" stroke-linecap="round" />
		</svg>
	</button>

	{#if bonusLoading}
		<div class="loading" role="status" aria-live="polite" aria-busy="true">
			<div class="spinner" aria-hidden="true"></div>
			<p>Loading bonus…</p>
		</div>
	{/if}

	{#if isPortrait}
		<MonkeyBuyBonusPortraitLayout
			{selectedCard}
			{bonusLoading}
			{autoPlayActive}
			{canConfirm}
			confirmWidth={portraitConfirmWidth}
			onSelectCard={selectCard}
			isCardDisabled={isCardDisabled}
			onConfirm={handleConfirm}
			onBack={backToSelector}
		/>
	{:else}
		<div class="scene" style={`transform: scale(${uiScale});`}>
			<div class="content-stack" style={`gap: ${BUY_BONUS_BET_BLOCK_GAP}px;`}>
				{#if !selectedCard}
					<div class="hit">
						<MonkeyBuyBonusBetControl />
					</div>
				{/if}

				<div class="cards-stage" class:loading={bonusLoading}>
					{#if selectedCard}
						<MonkeyBuyBonusCard
							card={selectedCard}
							confirmed={true}
							actionLabel="OK"
							disabled={!canConfirm}
							onaction={handleConfirm}
							onback={backToSelector}
						/>
					{:else}
						<div
							class="card-row"
							style={`width: ${BUY_BONUS_GROUP_W}px; gap: ${BUY_BONUS_CARD_GAP}px; grid-template-columns: repeat(${BUY_BONUS_GRID_COLS}, ${BUY_BONUS_CARD_W}px);`}
						>
							{#each BUY_BONUS_CARDS as card (card.mode)}
								<MonkeyBuyBonusCard
									{card}
									confirmed={false}
									actionLabel={buyBonusActionLabel(buyBonusCardActionKind(card.mode))}
									disabled={isCardDisabled(card.mode)}
									onselect={() => selectCard(card.mode)}
								/>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if autoPlayActive}
		<p class="autoplay-hint" class:portrait={isPortrait}>{autoSpinBeforeBonusMessage()}</p>
	{:else if insufficientSelectedBalance}
		<p class="autoplay-hint" class:portrait={isPortrait}>
			{insufficientBalanceMessage()}
		</p>
	{/if}
</div>

<style lang="scss">
	.buy-bonus-screen {
		position: fixed;
		inset: 0;
		touch-action: manipulation;
		pointer-events: auto;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
		padding: 0;
		margin: 0;
		border: none;
		cursor: default;
	}

	.bonus-close {
		position: fixed;
		right: max(16px, env(safe-area-inset-right));
		top: max(16px, env(safe-area-inset-top));
		z-index: 3;
		padding: 0;
		margin: 0;
		border: none;
		background: transparent;
		color: #fff;
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: manipulation;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.close-btn.portrait {
		top: calc(16px + env(safe-area-inset-top));
		right: calc(16px + env(safe-area-inset-right));
		width: 40px;
		height: 40px;
	}

	.close-icon {
		width: 100%;
		height: 100%;
	}

	.scene {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transform-origin: center center;
		z-index: 2;
		pointer-events: none;
	}

	.content-stack {
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.hit {
		pointer-events: auto;
	}

	.cards-stage {
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;

		:global([data-bonus-card]) {
			pointer-events: auto;
		}

		&.loading {
			opacity: 0.65;
		}
	}

	.card-row {
		pointer-events: auto;
		display: grid;
		align-items: stretch;
		justify-content: center;
	}

	.loading {
		position: absolute;
		inset: 0;
		z-index: 4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		pointer-events: none;

		p {
			margin: 0;
			font-family: 'Fredoka One', Inter, sans-serif;
			font-size: 1rem;
			font-weight: 700;
			color: #ffffff;
		}
	}

	.spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid rgba(255, 255, 255, 0.25);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: ff-buy-spin 0.85s linear infinite;
	}

	.autoplay-hint.portrait {
		bottom: calc(88px + env(safe-area-inset-bottom));
		z-index: 5;
	}

	.autoplay-hint {
		position: absolute;
		bottom: 12%;
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		background: rgba(255, 82, 82, 0.15);
		border: 1px solid #ff5252;
		color: #ffcdd2;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
		pointer-events: none;
	}

	@keyframes ff-buy-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
