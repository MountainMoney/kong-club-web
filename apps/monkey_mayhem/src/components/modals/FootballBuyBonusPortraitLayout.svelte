<script lang="ts">
	import type { BuyBonusCardDef } from '../../game/buyBonusScreen';
	import { buyBonusActionLabel } from '../../game/socialCopy';
	import {
		BUY_BONUS_CARDS,
		BUY_BONUS_LIST_ROW_GAP,
		buyBonusCardActionKind,
		buyBonusPortraitListWidth,
	} from '../../game/buyBonusScreen';
	import FootballBuyBonusBetControl from './FootballBuyBonusBetControl.svelte';
	import FootballBuyBonusCard from './FootballBuyBonusCard.svelte';
	import FootballBuyBonusListCard from './FootballBuyBonusListCard.svelte';

	type Props = {
		selectedCard: BuyBonusCardDef | undefined;
		bonusLoading: boolean;
		autoPlayActive: boolean;
		canConfirm: boolean;
		confirmWidth: number;
		onSelectCard: (mode: string) => void;
		isCardDisabled: (mode: string) => boolean;
		onConfirm: (event: MouseEvent) => void;
		onBack: () => void;
	};

	const props: Props = $props();

	const listWidth = $derived(buyBonusPortraitListWidth(window.innerWidth));
</script>

<div class="portrait-layout" class:confirming={!!props.selectedCard}>
	<div class="cards-area" class:loading={props.bonusLoading}>
		{#if props.selectedCard}
			<div class="confirm-stage">
				<FootballBuyBonusCard
					card={props.selectedCard}
					confirmed={true}
					portraitSheet={true}
					confirmWidth={props.confirmWidth}
					actionLabel="OK"
					disabled={!props.canConfirm}
					onaction={props.onConfirm}
					onback={props.onBack}
				/>
			</div>
		{:else}
			<div
				class="list-scroll"
				style={`gap: ${BUY_BONUS_LIST_ROW_GAP}px; max-width: ${listWidth}px;`}
			>
				{#each BUY_BONUS_CARDS as card (card.mode)}
					<FootballBuyBonusListCard
						{card}
						actionLabel={buyBonusActionLabel(buyBonusCardActionKind(card.mode))}
						disabled={props.isCardDisabled(card.mode)}
						onselect={() => props.onSelectCard(card.mode)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	{#if !props.selectedCard}
		<div class="bet-dock">
			<FootballBuyBonusBetControl portrait={true} />
		</div>
	{/if}
</div>

<style lang="scss">
	.portrait-layout {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-end;
		pointer-events: none;
		z-index: 2;
	}

	.portrait-layout.confirming {
		justify-content: center;
	}

	.cards-area {
		pointer-events: none;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 0;
		padding: max(44px, calc(12px + env(safe-area-inset-top))) 16px 6px;
		overflow: hidden;

		&.loading {
			opacity: 0.65;
		}
	}

	.portrait-layout.confirming .cards-area {
		flex: 1;
		justify-content: center;
		padding: max(48px, calc(12px + env(safe-area-inset-top))) 16px
			max(16px, env(safe-area-inset-bottom));
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.confirm-stage {
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: min(352px, calc(100vw - 32px));
	}

	.list-scroll {
		pointer-events: auto;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding: 4px 0 8px;
	}

	.bet-dock {
		pointer-events: auto;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		padding: 6px 16px calc(10px + env(safe-area-inset-bottom));
	}
</style>
