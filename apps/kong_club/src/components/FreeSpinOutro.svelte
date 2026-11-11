<script lang="ts" module>
	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number }
		| { type: 'freeSpinOutroFadeOut' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { DropShadowFilter } from 'pixi-filters';

	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { bookEventAmountToWinCurrencyString } from 'utils-shared/amount';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { BONUS_OUTRO_LABEL_BOUNCE_MS, bonusOutroLayoutForMain } from '../game/bonusOutroLayout';
	import { zIndexes } from '../game/constants';
	import { GG_TOTAL_WIN, ggEaseOutBack, ggEaseOutCubic } from '../game/ggTransitions';
	import { bonusScreenAnimMs, bonusScreenAutoAdvanceMs } from '../game/bonusScreenWait';
	import { isIntroTextureReady } from '../game/introAssets';
	import { stateApp } from '../game/stateApp';
	import { uiDisplaySize, type UiAssetKey } from '../game/uiAssetSizes';
	import {
		endBonusOutroSequence,
		resetBonusOutroPresentation,
		stateBonusOutro,
		tryBeginBonusOutroSequence,
	} from '../game/bonusOutroPresentation.svelte';
	import { clampBonusTier } from '../game/boardGuards';
	import { ensureIntroFredokaFont, ensurePrizeNumberFont } from '../game/introFont';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import { getGameLayoutProfile } from '../game/responsiveProfile.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { capBookAmount } from '../game/winCountTier';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let onDismiss = $state(() => {});
	let fontReady = $state(false);

	const overlayTween = new Tween(0);
	const labelScaleTween = new Tween(0);
	const amountAlphaTween = new Tween(0);
	/** GG `cf`: game layers darken by GG_TOTAL_WIN.scrim while the screen is up. */
	const scrimTween = new Tween(0);
	/** GG `to`: the counted amount. */
	const countTween = new Tween(0);
	/** GG continue prompt (`Tde`): in over continueInMs easeOutBack, out at half. */
	const promptTween = new Tween(0);
	/** 'in' while the label lands and the amount counts; 'waiting' once the prompt is up. */
	let stage = $state<'in' | 'waiting'>('in');

	const main = $derived(context.stateLayoutDerived.mainLayout());
	const profile = $derived(getGameLayoutProfile());
	const layout = $derived(bonusOutroLayoutForMain(main, profile.mode));
	const outroBonusTier = $derived(clampBonusTier(stateGame.sessionBonusTier));
	const labelAssetKey = $derived(
		(outroBonusTier === 3
			? 'label_total_win_tier3'
			: outroBonusTier === 2
				? 'label_total_win_tier2'
				: 'label_total_win_tier1') as UiAssetKey,
	);
	const labelArtReady = $derived(isIntroTextureReady(stateApp.loadedAssets, labelAssetKey));
	const labelArtSize = $derived(uiDisplaySize(labelAssetKey, layout.totalWinW));

	const labelShadow = new DropShadowFilter({
		color: 0x000000,
		alpha: 0.4,
		blur: 4,
		offset: { x: 0, y: 8 },
		quality: 5,
	});

	const textRes = getPixiTextResolution();

	const labelStyle = $derived({
		fontFamily: 'Fredoka',
		fontSize: layout.amountSize * 0.75,
		fontWeight: '700' as const,
		fill: 0xffd700,
		align: 'center' as const,
		letterSpacing: 4,
		stroke: { color: 0x000000, width: Math.max(6, Math.round(layout.amountSize * 0.033)), alpha: 1 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: Math.max(6, Math.round(layout.amountSize * 0.033)),
		},
	});

	const amountStyle = $derived({
		fontFamily: PRIZE_NUMBER_FONT,
		fontSize: layout.amountSize,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: Math.max(5, Math.round(layout.amountSize * 0.025)), alpha: 1 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: Math.max(8, Math.round(layout.amountSize * 0.042)),
		},
	});

	$effect(() => {
		if (!stateBonusOutro.active) return;
		stateBonusOutro.overlayAlpha = overlayTween.current;
	});

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const shownAmount = $derived(Math.min(amount, Math.round(countTween.current)));

	/**
	 * GG total win screen in (live GG build `t4e` + `QNe`, game.pretty.js 66876-66931, 84575-84618):
	 * scrim darkens the game over scrimInMs, the banner lands, the amount counts up from
	 * countStartMs over countUpMs (easeOutCubic), and the prompt comes in once the banner is in
	 * and the count is done. KC art: the KC TOTAL WIN label (with its own bounce) stands in for
	 * GG's total-win spine banner.
	 * KC deviation (darken, never see-through): the board is no longer faded out; it stays and
	 * is darkened under a black overlay at GG's scrim strength (GG tints its symbols and HUD).
	 */
	const playScreenIn = async (winAmount: number) => {
		stateBonusOutro.active = true;
		stateBonusOutro.playfieldAlpha = 1;
		amount = capBookAmount(winAmount);
		stage = 'in';
		labelScaleTween.set(0, { duration: 0 });
		amountAlphaTween.set(0, { duration: 0 });
		countTween.set(0, { duration: 0 });
		promptTween.set(0, { duration: 0 });
		overlayTween.set(0, { duration: 0 });
		const inMs = bonusScreenAnimMs(GG_TOTAL_WIN.scrimInMs);
		scrimTween.set(1, { duration: inMs, easing: ggEaseOutCubic });
		overlayTween.set(1, { duration: inMs, easing: ggEaseOutCubic });
		const label = labelScaleTween.set(1, {
			duration: bonusScreenAnimMs(BONUS_OUTRO_LABEL_BOUNCE_MS),
			easing: backOut,
		});
		const startMs = bonusScreenAnimMs(GG_TOTAL_WIN.countStartMs);
		amountAlphaTween.set(1, { delay: startMs, duration: inMs, easing: ggEaseOutCubic });
		const count = countTween.set(amount, {
			delay: startMs,
			duration: bonusScreenAnimMs(GG_TOTAL_WIN.countUpMs),
			easing: ggEaseOutCubic,
		});
		await Promise.race([Promise.all([label, count]), waitForResolve((resolve) => (onDismiss = resolve))]);
		// A tap during the count finishes it at once (GG `e4e`).
		countTween.set(amount, { duration: 0 });
		labelScaleTween.set(1, { duration: 0 });
		amountAlphaTween.set(1, { duration: 0 });
		stage = 'waiting';
		void promptTween.set(1, {
			duration: bonusScreenAnimMs(GG_TOTAL_WIN.continueInMs),
			easing: ggEaseOutBack,
		});
	};

	/**
	 * GG total win screen out (`ioe` / `$Ne` + `l4e`, game.pretty.js 66850-66853, 67078-67083):
	 * the prompt drops out at half speed, the banner exits, and the scrim lifts
	 * exitToScrimOutMs later over scrimOutMs. The caller closes the curtain at the same time
	 * and swaps back to the base game under it.
	 */
	const playScreenOut = async () => {
		void promptTween.set(0, {
			duration: bonusScreenAnimMs(GG_TOTAL_WIN.continueInMs / 2),
			easing: ggEaseOutBack,
		});
		void overlayTween.set(0, {
			duration: bonusScreenAnimMs(GG_TOTAL_WIN.exitToScrimOutMs + 150),
			easing: ggEaseOutCubic,
		});
		await waitForTimeout(bonusScreenAnimMs(GG_TOTAL_WIN.exitToScrimOutMs));
		await scrimTween.set(0, {
			duration: bonusScreenAnimMs(GG_TOTAL_WIN.scrimOutMs),
			easing: ggEaseOutCubic,
		});
	};

	const resetOutro = () => {
		show = false;
		amount = 0;
		stage = 'in';
		scrimTween.set(0, { duration: 0 });
		promptTween.set(0, { duration: 0 });
		countTween.set(0, { duration: 0 });
		onDismiss = () => {};
		endBonusOutroSequence();
		resetBonusOutroPresentation();
	};

	onMount(() => {
		void Promise.all([ensureIntroFredokaFont(), ensurePrizeNumberFont()]).then(() => {
			fontReady = true;
		});
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			resetOutro();
			show = true;
		},
		freeSpinOutroHide: resetOutro,
		freeSpinOutroCountUp: async (emitterEvent) => {
			if (!tryBeginBonusOutroSequence()) return;
			try {
				await playScreenIn(emitterEvent.amount);
				await Promise.race([
					waitForResolve((resolve) => (onDismiss = resolve)),
					waitForTimeout(bonusScreenAutoAdvanceMs()),
				]);
			} catch (error) {
				endBonusOutroSequence();
				throw error;
			}
		},
		freeSpinOutroFadeOut: playScreenOut,
		winSkip: () => onDismiss(),
		spinSkipPressToContinue: () => {
			if (show) onDismiss();
		},
	});
</script>

{#if show}
	{#if scrimTween.current > 0.001}
		<!-- GG scrim as a KC darken: under the curtain and the panel, over the game and UI. -->
		<Rectangle
			x={0}
			y={0}
			width={canvas.width}
			height={canvas.height}
			backgroundColor={0x000000}
			alpha={GG_TOTAL_WIN.scrim * scrimTween.current}
			zIndex={zIndexes.blackScreen - 1}
			eventMode="none"
		/>
	{/if}
	{#if fontReady}
		<!-- GG draws the total win screen above its scene curtain, so the banner exit plays over it. -->
		<MainContainer zIndex={zIndexes.blackScreen + 1}>
			<Container
				x={layout.x}
				y={layout.y}
				alpha={stateBonusOutro.overlayAlpha}
				sortableChildren={true}
			>
				<Container y={layout.labelBottomY} scale={labelScaleTween.current}>
					{#if labelArtReady}
						<Sprite
							key={labelAssetKey}
							anchor={{ x: 0.5, y: 1 }}
							width={labelArtSize.width}
							height={labelArtSize.height}
							blendMode="normal"
						/>
					{:else}
						<Text
							anchor={{ x: 0.5, y: 1 }}
							text="TOTAL WIN"
							style={labelStyle}
							filters={[labelShadow]}
							resolution={textRes}
						/>
					{/if}
				</Container>

				<Text
					anchor={0.5}
					x={0}
					y={layout.amountY}
					alpha={amountAlphaTween.current}
					text={bookEventAmountToWinCurrencyString(shownAmount)}
					style={amountStyle}
					resolution={textRes}
				/>
			</Container>
		</MainContainer>
	{/if}

	{#if stage === 'waiting' && promptTween.current > 0.02}
		<Container zIndex={zIndexes.blackScreen + 1} alpha={Math.min(1, promptTween.current)}>
			<PressToContinue variant="intro" onpress={() => onDismiss()} />
		</Container>
	{/if}
{/if}
