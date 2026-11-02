<script lang="ts">
	import { stateBet } from 'state-shared';
	import { formatMoney } from '../../game/stakeMoney';

	import type { BuyBonusCardDef } from '../../game/buyBonusScreen';
	import { assetUrl } from '../../game/assetUrl';
	import { bonusDescriptionCopy } from '../../game/socialCopy';
	import {
		BUY_BONUS_LIST_ICON_BOX_H,
		BUY_BONUS_LIST_ICON_BOX_W,
		buyBonusModeCostMultiplier,
	} from '../../game/buyBonusScreen';
	import { onMount } from 'svelte';
	import {
		FEATURE_COIN_SRCS,
		buyBonusCoinTriangleLayout,
		buyBonusScatterLayout,
	} from '../../game/buyBonusScatterLayout';
	import { ensurePrizeNumberFont } from '../../game/introFont';
	import { GOLD_COIN_3CHAR_FONT_RATIO } from '../../game/prizeNumberFont';

	type Props = {
		card: BuyBonusCardDef;
		actionLabel: 'BUY' | 'ACTIVATE';
		disabled?: boolean;
		onselect?: () => void;
	};

	const props: Props = $props();

	onMount(() => {
		void ensurePrizeNumberFont();
	});

	const priceText = $derived(
		formatMoney(stateBet.betAmount * buyBonusModeCostMultiplier(props.card.mode), 'bet'),
	);

	const scatterLayout = $derived(
		props.card.iconLayout.kind === 'scatter'
			? buyBonusScatterLayout(props.card.iconLayout.count as 3 | 4 | 5)
			: null,
	);
	const coinTriangle = $derived(
		props.card.iconLayout.kind === 'featureSpin' ? buyBonusCoinTriangleLayout() : null,
	);
	const clusterForScale = $derived(scatterLayout ?? coinTriangle);

	const scatterScale = $derived(
		clusterForScale
			? Math.min(
					BUY_BONUS_LIST_ICON_BOX_W / clusterForScale.clusterWidth,
					BUY_BONUS_LIST_ICON_BOX_H / clusterForScale.clusterHeight,
				)
			: 1,
	);

	const heroSize = $derived(Math.round(BUY_BONUS_LIST_ICON_BOX_H * 0.9));
	const cardArtSrc = $derived(assetUrl(props.card.imageSrc));
	const featureCoinSrcs = FEATURE_COIN_SRCS.map((src) => assetUrl(src));

	const selectCard = () => {
		if (props.disabled) return;
		props.onselect?.();
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="list-card summit-ui-type"
	class:disabled={props.disabled}
	style={`--accent: ${props.card.buttonColor};`}
	data-bonus-card
	onclick={selectCard}
>
	<div class="icon-slot" aria-hidden="true">
		{#if scatterLayout}
			<div
				class="scatter-wrap"
				style={`width: ${scatterLayout.clusterWidth * scatterScale}px; height: ${scatterLayout.clusterHeight * scatterScale}px;`}
			>
				<div
					class="scatter-cluster"
					style={`transform: scale(${scatterScale}); width: ${scatterLayout.clusterWidth}px; height: ${scatterLayout.clusterHeight}px;`}
				>
					{#each scatterLayout.slots as slot, i (i)}
						<img
							src={cardArtSrc}
							alt=""
							class="trophy"
							style={`left: ${slot.x}px; top: ${slot.y}px; width: ${scatterLayout.trophySize}px; height: ${scatterLayout.trophySize}px; z-index: ${slot.zIndex};`}
						/>
					{/each}
				</div>
			</div>
		{:else if props.card.iconLayout.kind === 'extraChance'}
			<div class="hero-stack">
				<img
					src={cardArtSrc}
					alt=""
					class="hero-trophy"
					style={`width: ${heroSize}px; height: ${heroSize}px;`}
				/>
			</div>
		{:else if coinTriangle}
			<div
				class="scatter-wrap"
				style={`width: ${coinTriangle.clusterWidth * scatterScale}px; height: ${coinTriangle.clusterHeight * scatterScale}px;`}
			>
				<div
					class="scatter-cluster"
					style={`transform: scale(${scatterScale}); width: ${coinTriangle.clusterWidth}px; height: ${coinTriangle.clusterHeight}px;`}
				>
					{#each coinTriangle.slots as slot, i (i)}
						<img
							src={featureCoinSrcs[i]}
							alt=""
							class="trophy"
							style={`left: ${slot.x}px; top: ${slot.y}px; width: ${coinTriangle.trophySize}px; height: ${coinTriangle.trophySize}px; z-index: ${slot.zIndex};`}
						/>
					{/each}
				</div>
			</div>
		{:else if props.card.iconLayout.kind === 'summitSpin'}
			<div class="hero-stack">
				<img
					src={cardArtSrc}
					alt=""
					class="hero-trophy"
					style={`width: ${heroSize}px; height: ${heroSize}px;`}
				/>
				<span
					class="icon-badge icon-badge--max"
					style={`font-size: ${heroSize * GOLD_COIN_3CHAR_FONT_RATIO}px;`}
				>MAX</span>
			</div>
		{:else if props.card.iconLayout.kind === 'mysteryBonus'}
			<div class="hero-stack">
				<img
					src={cardArtSrc}
					alt=""
					class="hero-trophy mystery"
					style={`width: ${heroSize}px; height: ${heroSize}px;`}
				/>
				<span class="badge-q">?</span>
			</div>
		{/if}
	</div>

	<div class="info">
		<h3 class="title">{bonusDescriptionCopy(props.card.title)}</h3>
		<p class="meta">
			<span class="volatility">{props.card.volatility}</span>
			<span class="price">{priceText}</span>
		</p>
	</div>

	<button
		type="button"
		class="action-btn"
		class:buy={props.actionLabel === 'BUY'}
		class:activate={props.actionLabel === 'ACTIVATE'}
		disabled={props.disabled}
		data-bonus-action
		onclick={(event) => {
			event.stopPropagation();
			selectCard();
		}}
	>
		{props.actionLabel}
	</button>
</div>

<style lang="scss">
	.list-card {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		grid-template-areas:
			'icon info'
			'icon action';
		align-items: center;
		gap: 8px 10px;
		width: 100%;
		min-height: 76px;
		padding: 12px 12px 16px 10px;
		flex-shrink: 0;
		overflow: hidden;
		box-sizing: border-box;
		background-color: #161616;
		background-image: none;
		border-radius: 16px;
		border: 2px solid #3a3a3a;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		touch-action: manipulation;
		transition: transform 120ms ease, border-color 120ms ease;

		&:not(.disabled):hover {
			transform: translateY(-2px);
			border-color: #fff8e8;
		}

		&.disabled {
			cursor: not-allowed;
			opacity: 0.65;
		}
	}

	.icon-slot {
		grid-area: icon;
		flex: 0 0 88px;
		width: 88px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.scatter-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.scatter-cluster {
		position: relative;
		transform-origin: center center;
		flex-shrink: 0;
	}

	.scatter-cluster .trophy {
		position: absolute;
		object-fit: contain;
		display: block;
		filter: none;
		pointer-events: none;
	}

	.hero-stack {
		position: relative;
		line-height: 0;
		overflow: visible;
	}

	.hero-trophy {
		object-fit: contain;
		display: block;
		filter: none;
		pointer-events: none;
	}

	.hero-trophy.mystery {
		filter: brightness(0);
	}

	.icon-badge {
		position: absolute;
		font-family: 'Lilita One', sans-serif;
		font-weight: 400;
		line-height: 1;
		pointer-events: none;
		-webkit-font-smoothing: antialiased;
	}

	.icon-badge--max {
		left: 50%;
		top: 50%;
		transform: translate(-50%, -54%);
		letter-spacing: -0.04em;
		color: transparent;
		background: linear-gradient(to bottom, #fff491 0%, #fbf3c2 42%, #e7ad21 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-stroke: 1px #b56a00;
		paint-order: stroke fill;
	}

	.badge-q {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -55%);
		font-size: 22px;
		font-weight: 800;
		color: #ffffff;
		line-height: 1;
		pointer-events: none;
	}

	.info {
		grid-area: info;
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		text-align: left;
	}

	.title {
		margin: 0;
		font-size: 15px;
		font-weight: 400;
		line-height: 1.15;
		color: #ffffff;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.meta {
		margin: 2px 0 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		font-size: 11px;
		line-height: 1.2;
	}

	.volatility {
		color: #ffffff;
		font-family: 'Fredoka One', Inter, sans-serif;
		white-space: nowrap;
		overflow: visible;
		text-overflow: clip;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.price {
		flex-shrink: 0;
		font-size: 14px;
		font-weight: 400;
		color: #ffffff;
		white-space: nowrap;
		overflow: visible;
		text-overflow: clip;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.action-btn {
		grid-area: action;
		justify-self: end;
		align-self: end;
		margin-bottom: 2px;
		width: auto;
		max-width: 100%;
		min-height: 40px;
		margin: 0;
		padding: 0 14px;
		white-space: nowrap;
		text-shadow: none;
		border: none;
		border-radius: 4px;
		color: #ffffff;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 13px;
		font-weight: 400;
		line-height: 1.1;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		cursor: pointer;
		touch-action: manipulation;

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}

		&.activate {
			background: transparent;
			color: #ffd500;
			border: 2px solid #ffd500;
			border-radius: 12px;
			font-weight: 800;
		}

		&.buy {
			background: #ffd500;
			color: #161616;
			border-radius: 12px;
			font-weight: 800;
		}
	}

	.title {
		color: var(--accent, #ffd500);
		font-weight: 800;
		-webkit-text-stroke: 0.6px #1a1208;
		paint-order: stroke fill;
		text-shadow: none;
	}
</style>
