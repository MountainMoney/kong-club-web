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
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { bookEventAmountToWinCurrencyString } from 'utils-shared/amount';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import {
		BONUS_OUTRO_LABEL_BOUNCE_MS,
		BONUS_OUTRO_LABEL_HOLD_MS,
		BONUS_OUTRO_OVERLAY_FADE_MS,
		BONUS_OUTRO_PLAYFIELD_FADE_MS,
		bonusOutroLayoutForMain,
	} from '../game/bonusOutroLayout';
	import { bonusScreenAnimMs, bonusScreenAutoAdvanceMs } from '../game/bonusScreenWait';
	import { isIntroTextureReady } from '../game/introAssets';
	import { stateApp } from '../game/stateApp';
	import { uiDisplaySize, type UiAssetKey } from '../game/uiAssetSizes';
	import {
		beginBonusOutroTransitionCover,
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

	const playfieldTween = new Tween(1);
	const overlayTween = new Tween(0);
	const labelScaleTween = new Tween(0);
	const amountAlphaTween = new Tween(0);

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
		stateBonusOutro.playfieldAlpha = playfieldTween.current;
		stateBonusOutro.overlayAlpha = overlayTween.current;
	});

	const fadePlayfieldOut = async () => {
		if (stateBonusOutro.active && stateBonusOutro.playfieldAlpha <= 0.01) return;
		stateBonusOutro.active = true;
		playfieldTween.set(1, { duration: 0 });
		overlayTween.set(0, { duration: 0 });
		stateBonusOutro.playfieldAlpha = 1;
		stateBonusOutro.overlayAlpha = 0;
		await playfieldTween.set(0, { duration: bonusScreenAnimMs(BONUS_OUTRO_PLAYFIELD_FADE_MS) });
	};

	const presentTotalWinLabel = async () => {
		labelScaleTween.set(0, { duration: 0 });
		amountAlphaTween.set(0, { duration: 0 });
		await overlayTween.set(1, { duration: bonusScreenAnimMs(BONUS_OUTRO_OVERLAY_FADE_MS) });
		await labelScaleTween.set(1, {
			duration: bonusScreenAnimMs(BONUS_OUTRO_LABEL_BOUNCE_MS),
			easing: backOut,
		});
		await waitForTimeout(bonusScreenAnimMs(BONUS_OUTRO_LABEL_HOLD_MS));
	};

	const presentWinAmount = async (winAmount: number) => {
		amount = capBookAmount(winAmount);
		await amountAlphaTween.set(1, { duration: bonusScreenAnimMs(BONUS_OUTRO_OVERLAY_FADE_MS) });
	};

	const fadeOverlayOut = async () => {
		if (stateBonusOutro.holdPlayfieldHidden) return;
		await overlayTween.set(0, { duration: bonusScreenAnimMs(BONUS_OUTRO_OVERLAY_FADE_MS) });
		beginBonusOutroTransitionCover();
	};

	const resetOutro = () => {
		show = false;
		amount = 0;
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
				await fadePlayfieldOut();
				await presentTotalWinLabel();
				await presentWinAmount(emitterEvent.amount);

				await Promise.race([
					waitForResolve((resolve) => (onDismiss = resolve)),
					waitForTimeout(bonusScreenAutoAdvanceMs()),
				]);
			} catch (error) {
				endBonusOutroSequence();
				throw error;
			}
		},
		freeSpinOutroFadeOut: fadeOverlayOut,
		winSkip: () => onDismiss(),
		spinSkipPressToContinue: () => {
			if (show) onDismiss();
		},
	});
</script>

{#if show}
	{#if fontReady}
		<MainContainer zIndex={30}>
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
					text={bookEventAmountToWinCurrencyString(amount)}
					style={amountStyle}
					resolution={textRes}
				/>
			</Container>
		</MainContainer>
	{/if}

	{#if stateBonusOutro.overlayAlpha > 0.02}
		<PressToContinue variant="intro" onpress={() => onDismiss()} />
	{/if}
{/if}
