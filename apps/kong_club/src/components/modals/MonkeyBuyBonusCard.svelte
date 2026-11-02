<script lang="ts">
	import { stateBet } from 'state-shared';
	import { formatMoney } from '../../game/stakeMoney';

	import type { BuyBonusCardDef } from '../../game/buyBonusScreen';
	import { assetUrl } from '../../game/assetUrl';
	import { bonusDescriptionCopy } from '../../game/socialCopy';
	import { onMount } from 'svelte';
	import {
		FEATURE_COIN_SRCS,
		buyBonusCoinTriangleLayout,
		buyBonusScatterLayout,
	} from '../../game/buyBonusScatterLayout';
	import { ensurePrizeNumberFont } from '../../game/introFont';
	import { GOLD_COIN_3CHAR_FONT_RATIO } from '../../game/prizeNumberFont';
	import { volatilityCaps, volatilityStarCount } from '../../game/buyBonusScreen';
	import {
		BUY_BONUS_BODY_COLOR,
		BUY_BONUS_CARD_CONFIRM_W,
		BUY_BONUS_CARD_RADIUS_PX,
		BUY_BONUS_CARD_W,
		BUY_BONUS_HERO_TROPHY_RATIO,
		BUY_BONUS_IMAGE_H,
		BUY_BONUS_PORTRAIT_CARD_W,
		buyBonusCardHeight,
		buyBonusCardStyleVars,
		buyBonusModeCostMultiplier,
		buyBonusPortraitConfirmWidth,
	} from '../../game/buyBonusScreen';

	type Props = {
		card: BuyBonusCardDef;
		confirmed: boolean;
		actionLabel: 'BUY' | 'ACTIVATE' | 'OK';
		compact?: boolean;
		/** Portrait confirm — centered, content-sized card. */
		portraitSheet?: boolean;
		confirmWidth?: number;
		disabled?: boolean;
		onselect?: () => void;
		onaction?: (event: MouseEvent) => void;
		onback?: () => void;
	};

	const props: Props = $props();

	onMount(() => {
		void ensurePrizeNumberFont();
	});

	const width = $derived.by(() => {
		if (props.portraitSheet) {
			return props.confirmWidth ?? buyBonusPortraitConfirmWidth(window.innerWidth);
		}
		if (props.compact) {
			if (props.confirmed) {
				return props.confirmWidth ?? buyBonusPortraitConfirmWidth(window.innerWidth);
			}
			return BUY_BONUS_PORTRAIT_CARD_W;
		}
		return props.confirmed ? BUY_BONUS_CARD_CONFIRM_W : BUY_BONUS_CARD_W;
	});

	const sizeOpts = $derived(
		props.portraitSheet
			? { portraitSheet: true as const, showDescription: true }
			: props.compact
				? { compact: true as const, showDescription: props.confirmed }
				: { showDescription: props.confirmed },
	);
	const height = $derived(buyBonusCardHeight(width, sizeOpts));
	const cardStyle = $derived(
		height != null
			? `width: ${width}px; height: ${height}px;`
			: `width: ${width}px; max-width: 100%;`,
	);
	const styleVars = $derived(
		buyBonusCardStyleVars(width, props.card.buttonColor, sizeOpts),
	);
	const cardScale = $derived(
		props.portraitSheet ? 1 : props.compact ? width / BUY_BONUS_CARD_W : styleVars.scale,
	);
	/** Icon cluster scale — separate from typography on portrait sheet. */
	const artScale = $derived.by(() => {
		if (props.portraitSheet) return styleVars.imageH / BUY_BONUS_IMAGE_H;
		if (props.confirmed || props.compact) return cardScale;
		const cluster =
			props.card.iconLayout.kind === 'scatter'
				? buyBonusScatterLayout(props.card.iconLayout.count as 3 | 4 | 5)
				: props.card.iconLayout.kind === 'featureSpin'
					? buyBonusCoinTriangleLayout()
					: null;
		if (!cluster) return cardScale;
		const box = props.confirmed ? 220 : 168;
		return Math.min(box / cluster.clusterWidth, box / cluster.clusterHeight);
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
	const cardArtSrc = $derived(assetUrl(props.card.imageSrc));
	const featureCoinSrcs = FEATURE_COIN_SRCS.map((src) => assetUrl(src));

	const onCardClick = () => {
		if (props.disabled || props.confirmed) return;
		props.onselect?.();
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="bonus-card summit-ui-type"
	class:confirmed={props.confirmed}
	class:compact={props.compact}
	class:portrait-sheet={props.portraitSheet}
	class:disabled={props.disabled}
	style={`${cardStyle} --card-scale: ${cardScale}; --art-scale: ${artScale}; --card-accent: ${styleVars.accent}; --title-px: ${styleVars.titlePx}px; --body-px: ${styleVars.bodyPx}px; --price-px: ${styleVars.pricePx}px; --btn-px: ${styleVars.btnPx}px; --desc-h: ${styleVars.descH}px; --image-h: ${styleVars.imageH}px; --hero-trophy-ratio: ${BUY_BONUS_HERO_TROPHY_RATIO}; --max-face-ratio: ${GOLD_COIN_3CHAR_FONT_RATIO}; --image-vol-gap: ${styleVars.imageVolGap}px; --body-color: ${BUY_BONUS_BODY_COLOR}; --card-pad: ${styleVars.cardPad}px; --card-pad-top: ${styleVars.cardPadTop}px; --card-radius: ${BUY_BONUS_CARD_RADIUS_PX}px; --section-gap: ${styleVars.sectionGap}px;`}
	data-bonus-card
	onclick={onCardClick}
>
	<div class="bonus-card-inner">
		<h2 class="title bonus-card-title">{bonusDescriptionCopy(props.card.title)}</h2>
		{#if props.confirmed}
			<p class="description bonus-card-description">{bonusDescriptionCopy(props.card.description)}</p>
		{/if}

		<div class="image-wrap">
			{#if scatterLayout}
				<div
					class="icon-cluster icon-cluster--scatter"
					style={`--scatter-t: ${scatterLayout.trophySize}px; --cluster-w: ${scatterLayout.clusterWidth}px; --cluster-h: ${scatterLayout.clusterHeight}px;`}
					aria-hidden="true"
				>
					{#each scatterLayout.slots as slot, i (i)}
						<img
							src={cardArtSrc}
							alt=""
							class="trophy"
							style={`left: calc(${slot.x}px * var(--art-scale)); top: calc(${slot.y}px * var(--art-scale)); z-index: ${slot.zIndex};`}
						/>
					{/each}
				</div>
			{:else if props.card.iconLayout.kind === 'extraChance'}
				<div class="hero-icon-art" aria-hidden="true">
					<div class="hero-trophy-stack">
						<img src={cardArtSrc} alt="" class="hero-trophy" />
					</div>
				</div>
			{:else if coinTriangle}
				<div
					class="icon-cluster icon-cluster--scatter"
					style={`--scatter-t: ${coinTriangle.trophySize}px; --cluster-w: ${coinTriangle.clusterWidth}px; --cluster-h: ${coinTriangle.clusterHeight}px;`}
					aria-hidden="true"
				>
					{#each coinTriangle.slots as slot, i (i)}
						<img
							src={featureCoinSrcs[i]}
							alt=""
							class="trophy"
							style={`left: calc(${slot.x}px * var(--art-scale)); top: calc(${slot.y}px * var(--art-scale)); z-index: ${slot.zIndex};`}
						/>
					{/each}
				</div>
			{:else if props.card.iconLayout.kind === 'summitSpin'}
				<div class="hero-icon-art" aria-hidden="true">
					<div class="hero-trophy-stack">
						<img src={cardArtSrc} alt="" class="hero-trophy" />
						<span class="icon-badge icon-badge--max">MAX</span>
					</div>
				</div>
			{:else if props.card.iconLayout.kind === 'mysteryBonus'}
				<div class="hero-icon-art" aria-hidden="true">
					<div class="hero-trophy-stack">
						<img src={cardArtSrc} alt="" class="hero-trophy mystery-trophy" />
						<span class="mystery-q">?</span>
					</div>
				</div>
			{:else}
				<img src={cardArtSrc} alt="" class="bonus-image" />
			{/if}
		</div>

		<p class="volatility bonus-card-volatility">
			{volatilityCaps(props.card.volatility)}
			<span class="stars" aria-hidden="true">{'★'.repeat(volatilityStarCount(props.card.volatility))}</span>
		</p>
		<div class="btn-accent" aria-hidden="true"></div>

		{#if props.confirmed && props.onback}
			<p class="cost bonus-card-cost">{priceText}</p>
			<div class="btn-row" data-bonus-action>
				<button
					type="button"
					class="action-btn back-btn"
					onclick={(event) => { event.stopPropagation(); props.onback?.(); }}
				>BACK</button>
				<button
					type="button"
					class="action-btn confirm-btn"
					disabled={props.disabled}
					onclick={(event) => { event.stopPropagation(); props.onaction?.(event); }}
				>CONFIRM</button>
			</div>
		{:else}
			<div class="card-foot">
				<p class="cost bonus-card-cost">{priceText}</p>
				<button
					type="button"
					class="action-btn"
					class:buy={props.actionLabel === 'BUY'}
					class:activate={props.actionLabel === 'ACTIVATE'}
					disabled={props.disabled}
					data-bonus-action
					onclick={(event) => {
						event.stopPropagation();
						if (props.confirmed) {
							props.onaction?.(event);
						} else {
							props.onselect?.();
						}
					}}
				>
					{props.actionLabel}
				</button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.bonus-card {
		--art-scale: var(--card-scale);
		font-family: 'Fredoka One', Inter, sans-serif;
		background-color: rgba(28, 28, 28, 0.78);
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: 8px 8px;
		color: #fff;
		box-sizing: border-box;
		flex-shrink: 0;
		cursor: default;
		user-select: none;
		border: 3px solid #fff;
		border-radius: 12px;
		overflow: visible;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		cursor: pointer;
		transition: transform 120ms ease, border-color 120ms ease;

		&:not(.confirmed):not(.disabled):hover {
			transform: translateY(-2px);
			border-color: #fff8e8;
		}

		&.disabled {
			cursor: not-allowed;
		}

		&.confirmed {
			cursor: default;
		}
	}

	.bonus-card-inner {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		height: 100%;
		box-sizing: border-box;
		padding: calc(var(--card-pad) * var(--card-scale));
		padding-top: calc(var(--card-pad-top) * var(--card-scale));
		gap: calc(var(--section-gap) * var(--card-scale));
		text-align: center;
	}

	.title {
		margin: 0;
		font-size: calc(var(--title-px) * var(--card-scale));
		font-weight: 400;
		line-height: 1.05;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.description {
		margin: 0;
		height: calc(var(--desc-h) * var(--card-scale));
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: calc(var(--body-px) * var(--card-scale));
		font-style: normal;
		font-weight: 400;
		line-height: 1.32;
		color: #fff;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		overflow: hidden;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.image-wrap {
		flex: 0 0 auto;
		height: calc(var(--image-h) * var(--card-scale));
		margin-top: calc(4px * var(--card-scale));
		margin-bottom: calc(var(--image-vol-gap) * var(--card-scale));
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.bonus-image {
		max-width: 88%;
		height: calc(var(--image-h) * var(--card-scale));
		width: auto;
		object-fit: contain;
		display: block;
	}

	.hero-icon-art {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.hero-trophy-stack {
		position: relative;
		display: block;
		line-height: 0;
	}

	.hero-trophy {
		width: calc(var(--image-h) * var(--hero-trophy-ratio) * var(--card-scale));
		height: calc(var(--image-h) * var(--hero-trophy-ratio) * var(--card-scale));
		object-fit: contain;
		display: block;
		filter: none;
		pointer-events: none;
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
		font-size: calc(var(--image-h) * var(--hero-trophy-ratio) * var(--max-face-ratio) * var(--card-scale));
		letter-spacing: -0.04em;
		color: transparent;
		background: linear-gradient(to bottom, #fff491 0%, #fbf3c2 42%, #e7ad21 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-stroke: calc(1.15px * var(--card-scale)) #b56a00;
		paint-order: stroke fill;
	}

	.mystery-trophy {
		filter: brightness(0);
	}

	.mystery-q {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-51%, -57%);
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: calc(var(--image-h) * 0.3 * var(--card-scale));
		font-weight: 800;
		line-height: 1;
		color: #ffffff;
		pointer-events: none;
		-webkit-font-smoothing: antialiased;
	}

	.icon-cluster--scatter {
		position: relative;
		flex-shrink: 0;
		width: calc(var(--cluster-w) * var(--art-scale));
		height: calc(var(--cluster-h) * var(--art-scale));
		overflow: visible;
	}

	.icon-cluster--scatter .trophy {
		position: absolute;
		width: calc(var(--scatter-t) * var(--art-scale));
		height: calc(var(--scatter-t) * var(--art-scale));
		object-fit: contain;
		display: block;
		filter: none;
		pointer-events: none;
	}

	.volatility {
		margin: 0;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: calc((var(--body-px) - 1px) * var(--card-scale));
		font-weight: 400;
		line-height: 1.2;
		color: #fff;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.cost {
		margin: 0;
		width: 100%;
		text-align: center;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: calc(var(--price-px) * var(--card-scale));
		font-weight: 400;
		line-height: 1.2;
		color: #fff;
		white-space: nowrap;
		text-overflow: clip;
		overflow: visible;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.btn-accent {
		margin-top: auto;
		height: calc(4px * var(--card-scale));
		background: var(--card-accent, #50be50);
		border-radius: calc(2px * var(--card-scale));
	}

	.btn-row {
		display: flex;
		flex-direction: row;
		gap: calc(8px * var(--card-scale));
		width: 100%;
	}

	.bonus-card.compact .action-btn,
	.bonus-card.portrait-sheet .action-btn {
		min-height: 44px;
	}

	.bonus-card.portrait-sheet {
		height: auto;
		border-radius: 10px;
		border-top-width: 5px;
	}

	.bonus-card.portrait-sheet .bonus-card-inner {
		height: auto;
		padding: var(--card-pad-top) var(--card-pad) var(--card-pad);
		gap: var(--section-gap);
	}

	.bonus-card.portrait-sheet .title {
		font-size: var(--title-px);
	}

	.bonus-card.portrait-sheet .description {
		height: auto;
		min-height: 0;
		font-size: var(--body-px);
	}

	.bonus-card.portrait-sheet .volatility {
		font-size: calc(var(--body-px) - 1px);
	}

	.bonus-card.portrait-sheet .cost {
		font-size: var(--price-px);
	}

	.bonus-card.portrait-sheet .image-wrap {
		height: var(--image-h);
		margin-top: 0;
		margin-bottom: var(--image-vol-gap);
	}

	.bonus-card.portrait-sheet .btn-accent {
		margin-top: 0;
		height: 4px;
	}

	.bonus-card.portrait-sheet .action-btn {
		font-size: var(--btn-px);
		min-height: 44px;
		padding: 10px 8px;
	}

	.bonus-card.portrait-sheet .btn-row {
		gap: 8px;
	}

	.bonus-card.portrait-sheet .hero-trophy {
		width: calc(var(--image-h) * var(--hero-trophy-ratio));
		height: calc(var(--image-h) * var(--hero-trophy-ratio));
	}

	.bonus-card.portrait-sheet .mystery-q {
		font-size: calc(var(--image-h) * 0.34);
	}

	.bonus-card.portrait-sheet .icon-badge--max {
		font-size: calc(var(--image-h) * var(--hero-trophy-ratio) * var(--max-face-ratio));
	}

	.action-btn {
		margin: 0;
		width: 100%;
		min-height: calc(52px * var(--card-scale));
		touch-action: manipulation;
		border: none;
		border-radius: calc(3px * var(--card-scale));
		color: #ffffff;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: calc(var(--btn-px) * var(--card-scale));
		font-weight: 400;
		line-height: 1;
		text-transform: uppercase;
		cursor: pointer;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
		padding: calc(8px * var(--card-scale)) calc(4px * var(--card-scale));
		letter-spacing: 0.04em;

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}
	}

	.back-btn {
		background-color: #2a2a2a;
		color: #fff;
		flex: 0 0 34%;
		border-radius: 12px;
	}

	.bonus-card {
		background: #161616;
		background-image: none;
		border: 2px solid #3a3a3a;
		border-radius: 18px;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
		font-family: Fredoka, Inter, sans-serif;
		overflow: hidden;
		animation: gg-card-in 220ms ease both;
	}

	.title {
		color: var(--card-accent, #ffd500);
		font-weight: 800;
		letter-spacing: 0.02em;
		-webkit-text-stroke: 1px #1a1208;
		paint-order: stroke fill;
		text-shadow: none;
	}

	.description {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #f2f2f2;
		text-shadow: none;
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
	}

	.volatility,
	.cost {
		text-shadow: none;
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
	}

	.volatility {
		color: #b8b8b8;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stars {
		color: #ffd500;
		letter-spacing: 0.12em;
		font-size: 0.85em;
	}

	.btn-accent {
		display: none;
	}

	.action-btn.activate {
		background: transparent;
		color: #ffd500;
		border: 2px solid #ffd500;
		border-radius: 12px;
		text-shadow: none;
		font-weight: 800;
	}

	.action-btn.buy {
		background: #ffd500;
		color: #161616;
		border-radius: 12px;
		text-shadow: none;
		font-weight: 800;
	}

	.confirm-btn {
		background: #fff;
		color: #111;
		border-radius: 12px;
		text-shadow: none;
		font-weight: 800;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .bonus-card-inner {
		display: grid;
		grid-template-columns: 38% minmax(0, 1fr) auto;
		grid-template-areas:
			'art title title'
			'art vol vol'
			'art price btn';
		align-items: center;
		column-gap: 12px;
		row-gap: 4px;
		text-align: left;
		height: 100%;
		box-sizing: border-box;
		padding: 14px 16px 16px 8px;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .image-wrap {
		grid-area: art;
		width: 100%;
		height: 168px;
		margin: 0;
		overflow: hidden;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .title {
		grid-area: title;
		text-align: left;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .volatility {
		grid-area: vol;
		align-items: flex-start;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .card-foot {
		grid-column: 2 / 4;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .card-foot .cost {
		width: auto;
		flex: 1 1 auto;
		min-width: 0;
		margin: 0;
		text-align: left;
		font-size: 22px;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .card-foot .action-btn {
		flex: 0 0 auto;
		width: auto;
		min-width: 118px;
		min-height: 44px;
		margin: 0;
		padding: 0 14px;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .hero-trophy,
	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .bonus-image {
		width: 160px;
		height: 160px;
	}

	.bonus-card:not(.confirmed):not(.compact):not(.portrait-sheet) .icon-cluster--scatter {
		transform: none;
	}

	@keyframes gg-card-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
