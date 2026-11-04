<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { BackdropBlurFilter } from 'pixi-filters';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { stateBet, stateConfig, stateModal } from 'state-shared';

	import { getContext } from '../../game/context';
	import { formatMoney } from '../../game/stakeMoney';
	import { isMathBooksLoading } from '../../game/stateMathBooksLoading.svelte';
	import { isBuyFeatureDisabled } from '../../game/jurisdiction';
	import { HUNT_BET_MODE_KEY, isActivateBetMode, isHuntBetMode, setHuntLevel } from '../../game/betModes';
	import { HUNT_LEVELS } from '../../game/stateHunt.svelte';
	import { BONUS_BUY, BONUS_BUY_COLOR, UI_FONT_FAMILY } from '../../game/ggUi/constants';
	import { bonusOffers, slotOf, stackedOffers, type BonusOffer } from '../../game/ggUi/offers';
	import { createPress } from '../../game/ggUi/press.svelte';
	import { autoplayBusy, changeBet, confirmBonusOffer } from '../../game/ggUi/actions';
	import { buyBonusActionLabel } from '../../game/socialCopy';
	import BonusCard from './BonusCard.svelte';
	import UiChip from './UiChip.svelte';

	const context = getContext();
	const canvasSizes = () => context.stateLayoutDerived.canvasSizes();
	const scaleToFit = (design: { width: number; height: number }) => {
		const { width, height } = canvasSizes();
		return Math.min(width / design.width, height / design.height);
	};

	const open = $derived(stateModal.modal?.name === 'buyBonus');
	let confirming = $state<BonusOffer | null>(null);

	$effect(() => {
		if (!open) confirming = null;
	});

	const offers = $derived(bonusOffers());
	const stacked = $derived(stackedOffers(offers));

	const close = () => {
		confirming = null;
		stateModal.modal = null;
	};

	let confirmInFlight = $state(false);
	const confirm = async () => {
		const offer = confirming;
		if (!offer || confirmInFlight) return;
		if (isMathBooksLoading(offer.id)) return;
		confirmInFlight = true;
		try {
			const done = await confirmBonusOffer(offer);
			if (done) {
				confirming = null;
				stateModal.modal = null;
			}
		} finally {
			confirmInFlight = false;
		}
	};

	const blocked = (offer: BonusOffer) => {
		if (autoplayBusy()) return true;
		if (isBuyFeatureDisabled() && offer.kind === 'buy' && !isActivateBetMode(offer.id)) return true;
		return false;
	};

	const fadeTo = (alpha: number) =>
		new PIXI.FillGradient({
			type: 'linear',
			start: { x: 0, y: 0 },
			end: { x: 0, y: 1 },
			textureSpace: 'local',
			colorStops: [
				{ offset: 0, color: 'rgba(0,0,0,0)' },
				{ offset: 1, color: `rgba(0,0,0,${alpha})` },
			],
		});
	const fade = fadeTo(BONUS_BUY.scrim.fade);
	const stepperFade = fadeTo(BONUS_BUY.mobile.fade.alpha);
	const pageBlur = new BackdropBlurFilter({ strength: BONUS_BUY.scrim.blur });

	const bets = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const betIndex = $derived(bets.indexOf(stateBet.betAmount));

	const costOf = (offer: BonusOffer) => offer.price * stateBet.betAmount;
	const priceOf = (offer: BonusOffer) => formatMoney(costOf(offer), 'bet');
	const affordable = (offer: BonusOffer) => costOf(offer) <= stateBet.balanceAmount;
	const isOn = (offer: BonusOffer) => {
		if (offer.id === HUNT_BET_MODE_KEY) return isHuntBetMode(stateBet.activeBetModeKey);
		return isActivateBetMode(offer.id) && stateBet.activeBetModeKey === offer.id;
	};

	const cuts = BONUS_BUY.card;
	const S = BONUS_BUY.stepper;
	const M = BONUS_BUY.mobile;
	const stackedHeight = cuts.mobile.strip.y + cuts.mobile.strip.height;

	const layout = $derived.by(() => {
		const { width, height } = canvasSizes();
		const stage = BONUS_BUY.stage;
		const fit = scaleToFit(stage);
		if (fit >= M.below) {
			const x = (width - stage.width * fit) / 2;
			const y = (height - stage.height * fit) / 2;
			return {
				compact: false,
				scale: fit,
				x,
				y,
				centre: stage.width / 2,
				cardAt: (offer: BonusOffer) => {
					const slot = slotOf(offer);
					return {
						x: (slot.wide ? BONUS_BUY.grid.wideX : BONUS_BUY.grid.x)[slot.column],
						y: BONUS_BUY.grid.y[slot.row],
						cut: (slot.wide ? 'wide' : 'desktop') as const,
					};
				},
				dialog: BONUS_BUY.dialog,
				detail: BONUS_BUY.detail,
				close: { x: x + BONUS_BUY.close.x * fit, y: y + BONUS_BUY.close.y * fit },
				stepper: { x: x + (stage.width / 2) * fit, y: y + S.y * fit, reach: S.reach },
				height: stage.height,
			};
		}
		const columns = confirming || width < M.twoColumnsFrom ? 1 : 2;
		const page = columns * (cuts.mobile.width + M.gap) + M.gap;
		const scale = Math.min(1, width / page);
		const rows = Math.ceil(stacked.length / columns);
		const detailY = M.top + cuts.confirm.height + cuts.confirm.lip + BONUS_BUY.detail.gap;
		return {
			compact: true,
			scale,
			x: (width - page * scale) / 2,
			y: 0,
			centre: page / 2,
			cardAt: (offer: BonusOffer) => {
				const index = stacked.indexOf(offer);
				return {
					x: M.gap + (index % columns) * (cuts.mobile.width + M.gap),
					y: M.top + Math.floor(index / columns) * (stackedHeight + M.rowGap),
					cut: 'mobile' as const,
				};
			},
			dialog: { x: (page - cuts.confirm.width) / 2, y: M.top },
			detail: { ...BONUS_BUY.detail, y: detailY, width: page - M.gap * 2 },
			close: { x: width - (BONUS_BUY.close.size + M.close) * scale, y: M.close * scale },
			stepper: { x: width / 2, y: height - M.stepperBottom * scale, reach: M.reach },
			height: confirming
				? detailY + M.detailRoom
				: M.top + rows * (stackedHeight + M.rowGap) + M.bottom,
		};
	});

	let scroll = $state(0);
	const maxScroll = $derived(
		layout.compact ? Math.max(0, layout.height * layout.scale - canvasSizes().height) : 0,
	);
	const offset = $derived(Math.min(scroll, maxScroll));
	const scrollTo = (to: number) => (scroll = Math.max(0, Math.min(maxScroll, to)));
	$effect(() => {
		void confirming;
		void open;
		scroll = 0;
	});

	let drag: { from: number; scroll: number } | null = null;
	let dragged = false;
	const endDrag = () => {
		drag = null;
		dragged = false;
	};
	const unlessDragged = <T extends unknown[]>(action: (...args: T) => void) => {
		return (...args: T) => {
			if (!dragged) action(...args);
		};
	};

	const amountStyle = {
		fontFamily: UI_FONT_FAMILY,
		fontSize: BONUS_BUY.stepper.amountSize,
		fontWeight: '600' as const,
		fill: BONUS_BUY_COLOR.text,
		align: 'center' as const,
	};

	const presses = { [-1]: createPress(), 1: createPress() };
	const stepBet = (by: -1 | 1) => changeBet(by < 0 ? 'down' : 'up');
</script>

{#snippet step(by: -1 | 1, disabled: boolean)}
	{@const press = presses[by]}
	<Sprite
		key="ggBonusBuyStep"
		x={by * (layout.stepper.reach - S.chip.width / 2)}
		y={S.chip.height / 2}
		anchor={0.5}
		scale={{ x: -by * BONUS_BUY.artScale * press.scale, y: BONUS_BUY.artScale * press.scale }}
		alpha={disabled ? S.disabledAlpha : 1}
		eventMode={disabled ? 'none' : 'static'}
		cursor="pointer"
		onpointerdown={press.down}
		onpointerup={() => {
			press.up();
			stepBet(by);
		}}
		onpointerupoutside={press.up}
		onpointerout={press.up}
	/>
{/snippet}

<Container
	visible={open}
	eventMode="static"
	onpointerdown={(event) => {
		if (layout.compact) drag = { from: event.global.y, scroll: offset };
	}}
	onglobalpointermove={(event) => {
		if (!drag) return;
		const dy = event.global.y - drag.from;
		if (Math.abs(dy) > M.dragSlop) dragged = true;
		if (dragged) scrollTo(drag.scroll - dy);
	}}
	onpointerup={endDrag}
	onpointerupoutside={endDrag}
	onwheel={(event) => scrollTo(offset + event.deltaY)}
>
	{#if open}
		<Container filters={[pageBlur]}>
			<Rectangle
				width={canvasSizes().width}
				height={canvasSizes().height}
				backgroundColor={0x000000}
				backgroundAlpha={BONUS_BUY.scrim.flat}
				eventMode="static"
			/>
			<Graphics
				draw={(graphics) =>
					graphics.rect(0, 0, canvasSizes().width, canvasSizes().height).fill(fade)}
			/>
		</Container>

		<Container x={layout.x} y={layout.y - offset} scale={{ x: layout.scale, y: layout.scale }}>
			{#if confirming}
				<BonusCard
					x={layout.dialog.x}
					y={layout.dialog.y}
					offer={confirming}
					cut="confirm"
					tier={confirming.tier}
					body={confirming.body}
					price={priceOf(confirming)}
					label="CONFIRM"
					kind="confirm"
					onpress={unlessDragged(() => {
						void confirm();
					})}
				/>
				<Text
					text={confirming.detail}
					x={layout.centre}
					y={layout.detail.y}
					anchor={{ x: 0.5, y: 0 }}
					style={{
						fontFamily: UI_FONT_FAMILY,
						fontSize: BONUS_BUY.detail.size,
						fontWeight: '600',
						fill: BONUS_BUY_COLOR.text,
						align: 'center',
						lineHeight: BONUS_BUY.detail.lineHeight,
						wordWrap: true,
						wordWrapWidth: layout.detail.width,
					}}
				/>
			{:else}
				{#each offers as offer (offer.id)}
					{@const at = layout.cardAt(offer)}
					<BonusCard
						x={at.x}
						y={at.y}
						{offer}
						cut={at.cut}
						tier={offer.tier}
						price={priceOf(offer)}
						label={buyBonusActionLabel(offer.kind)}
						kind={offer.kind}
						active={isOn(offer)}
						dimmed={!affordable(offer) || blocked(offer)}
						onslide={
							offer.slider
								? (index) => {
										const level = HUNT_LEVELS[index - 1];
										if (level) setHuntLevel(level);
									}
								: undefined
						}
						onpress={unlessDragged(() => {
							if (blocked(offer)) return;
							confirming = offer;
						})}
					/>
				{/each}
			{/if}
		</Container>

		{#if !confirming}
			{#if layout.compact}
				<Graphics
					draw={(graphics) => {
						const { width, height } = canvasSizes();
						const tall = M.fade.height * layout.scale;
						graphics.rect(0, height - tall, width, tall).fill(stepperFade);
					}}
				/>
			{/if}
			<Container
				x={layout.stepper.x}
				y={layout.stepper.y}
				scale={{ x: layout.scale, y: layout.scale }}
			>
				{@render step(-1, betIndex <= 0)}
				<Text
					text={formatMoney(stateBet.betAmount, 'bet')}
					y={S.amountY}
					anchor={{ x: 0.5, y: 0 }}
					style={amountStyle}
				/>
				{@render step(1, betIndex < 0 || betIndex >= bets.length - 1)}
			</Container>
		{/if}

		<Container x={layout.close.x} y={layout.close.y} scale={{ x: layout.scale, y: layout.scale }}>
			<UiChip
				icon="ggUiIconClose"
				x={0}
				y={0}
				width={BONUS_BUY.close.size}
				iconSize={BONUS_BUY.close.icon}
				radius={BONUS_BUY.close.radius}
				border={BONUS_BUY.close.border}
				plate
				onpress={() => (confirming ? (confirming = null) : close())}
			/>
		</Container>
	{/if}
</Container>
