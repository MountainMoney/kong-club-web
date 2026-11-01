<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { quartOut, backOut } from 'svelte/easing';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { bookEventAmountToWinCurrencyString } from 'utils-shared/amount';

	import config from '../game/config';

	import { getContext } from '../game/context';
	import { zIndexes } from '../game/constants';
	import { stateApp } from '../game/stateApp';
	import { ensureIntroFredokaFont, ensurePrizeNumberFont } from '../game/introFont';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';
	import { introCard10000xAnchor, winPopupAssetKey, winPopupDisplaySize } from '../game/uiAssetSizes';
	import { requestSpinSkip } from '../game/spinSkip.svelte';
	import { spinWinOverlay, signalCountUpComplete } from '../game/spinWinOverlay.svelte';
	import { capBookAmount } from '../game/winCountTier';
	import { effectiveWinLayoutMode } from '../game/layoutUi';
	import {
		winCountLayoutForMain,
	} from '../game/winCountLayout';
	import { spinWinDimProgress } from '../game/spinWinDim.svelte';
	import WinCelebrationParticles from './WinCelebrationParticles.svelte';
	import WinAnimation from './WinAnimation.svelte';
	import { winLevelMap } from '../game/winLevelMap';

	const context = getContext();

	let fontReady = $state(false);
	let prizeFontReady = $state(false);
	let glowPhase = $state(0);
	let flashDecayRaf = 0;
	let glowRaf = 0;

	const countUpTween = new Tween(0);
	/** Scale punch applied to the amount text when the count-up lands. */
	const countUpFinishScale = new Tween(1);

	// Main count-up animation.
	// Reading countUpSession ensures this re-runs even when a repeat win has
	// the same targetAmount (e.g. two identical jackpots in a row).
	$effect(() => {
		const target = spinWinOverlay.targetAmount ?? 0;
		const duration = spinWinOverlay.countUpDurationMs ?? 1200;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		spinWinOverlay.countUpSession; // reactive dependency — do not remove

		const capped = capBookAmount(target);
		if (capped > 0) {
			// Snap to 0 first so every count-up always starts clean.
			countUpTween.set(0, { duration: 0 }).then(() => {
				// quartOut: starts fast, decelerates strongly in last 30% — classic slot feel.
				countUpTween.set(capped, { duration, easing: quartOut }).then(() => {
					signalCountUpComplete?.(capped);
				});
			});
		} else {
			countUpTween.set(0, { duration: 0 });
		}
	});

	// Skip: instantly land on final value.
	$effect(() => {
		if (spinWinOverlay.cancelCountUp) {
			const target = capBookAmount(spinWinOverlay.targetAmount ?? 0);
			countUpTween.set(target, { duration: 0 });
			signalCountUpComplete?.(target);
			spinWinOverlay.cancelCountUp = false;
		}
	});

	// Scale pop when the count-up settles — draws the player's eye to the final number.
	let countingWas = false;
	$effect(() => {
		const nowCounting = spinWinOverlay.counting;
		if (countingWas && !nowCounting && spinWinOverlay.show) {
			void countUpFinishScale.set(1.1, { duration: 0 }).then(() =>
				countUpFinishScale.set(1, { duration: 340, easing: backOut }),
			);
		}
		countingWas = nowCounting;
	});

	// Mirror tween progress for tier-threshold detection in PaylineWinHighlight.
	let countUpAmountRaf = 0;
	$effect(() => {
		if (!spinWinOverlay.counting) {
			cancelAnimationFrame(countUpAmountRaf);
			countUpAmountRaf = 0;
			return;
		}

		const sync = () => {
			if (!spinWinOverlay.counting) return;
			spinWinOverlay.displayAmount = Math.round(countUpTween.current);
			countUpAmountRaf = requestAnimationFrame(sync);
		};
		countUpAmountRaf = requestAnimationFrame(sync);

		return () => {
			cancelAnimationFrame(countUpAmountRaf);
			countUpAmountRaf = 0;
		};
	});

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const layoutMode = $derived(
		effectiveWinLayoutMode(
			canvas.width,
			canvas.height,
			context.stateLayoutDerived.layoutType(),
		),
	);
	const winLayout = $derived(winCountLayoutForMain(main, layoutMode, canvas));
	const winAmountX = $derived(winLayout.x);
	const winAmountY = $derived(winLayout.amountY);
	const labelY = $derived(winLayout.labelBottomY - winLayout.amountY);

	/** Bottom edge of popup sprite, in container-local coords (just above amount text). */
	const popupSpriteY = $derived(
		-Math.ceil(winLayout.amountFontSize * 0.55) - Math.round(16 * winLayout.scale),
	);

	const tierLabelText = $derived.by(() => {
		if (spinWinOverlay.tier === 'big') return 'BIG WIN';
		if (spinWinOverlay.tier === 'superwin') return 'SUPER WIN';
		if (spinWinOverlay.tier === 'mega') return 'MEGA WIN';
		if (spinWinOverlay.tier === 'epic') return 'EPIC WIN';
		if (spinWinOverlay.tier === 'max') return 'MAX WIN';
		return null;
	});

	const isMaxWinTier = $derived(spinWinOverlay.tier === 'max');
	const maxWinSpineReady = $derived(Boolean(stateApp.loadedAssets?.bigwin));
	const maxWinAnimation = winLevelMap[10].animation;

	const popupKey = $derived(
		spinWinOverlay.tier ? winPopupAssetKey(spinWinOverlay.tier) : undefined,
	);
	const popupSize = $derived.by(() => {
		const tier = spinWinOverlay.tier;
		if (!tier) return null;
		if (tier === 'max') {
			return winPopupDisplaySize('max', winLayout.maxPopupWidth);
		}
		return { width: winLayout.popupWidth, height: winLayout.popupHeight };
	});
	const popupReady = $derived(
		popupKey != null && Boolean(stateApp.loadedAssets?.[popupKey]),
	);

	const amountScale = new Tween(1);

	const textRes = getPixiTextResolution();

	const amountStyle = $derived({
		fontFamily: prizeFontReady ? PRIZE_NUMBER_FONT : 'Arial',
		fontSize: winLayout.amountFontSize,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill: isMaxWinTier ? 0xffd700 : 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: Math.max(2, Math.round(6 * winLayout.scale)) },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: Math.max(4, Math.round(10 * winLayout.scale)),
		},
	});

	const tierLabelStyle = $derived({
		fontFamily: fontReady ? 'Fredoka' : 'Arial',
		fontSize: Math.round(winLayout.amountFontSize * 0.78),
		fontWeight: '900' as const,
		fill: 0xfff2ff,
		align: 'center' as const,
		stroke: { color: 0x321143, width: Math.max(4, Math.round(12 * winLayout.scale)) },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: Math.max(3, Math.round(8 * winLayout.scale)),
		},
		letterSpacing: Math.max(1, Math.round(3 * winLayout.scale)),
	});

	$effect(() => {
		const targetScale = 0.92 + spinWinOverlay.labelScale * 0.08;
		amountScale.set(targetScale, { duration: spinWinOverlay.labelScale > 0 ? 120 : 0 });
	});

	$effect(() => {
		if (!spinWinOverlay.show || spinWinOverlay.labelScale <= 0) {
			cancelAnimationFrame(glowRaf);
			glowRaf = 0;
			glowPhase = 0;
			return;
		}

		const pulse = () => {
			glowPhase += 0.06;
			glowRaf = requestAnimationFrame(pulse);
		};
		glowRaf = requestAnimationFrame(pulse);
		return () => {
			cancelAnimationFrame(glowRaf);
			glowRaf = 0;
		};
	});

	$effect(() => {
		if (spinWinOverlay.flashAlpha > 0.01) {
			const start = performance.now();
			const from = spinWinOverlay.flashAlpha;
			cancelAnimationFrame(flashDecayRaf);
			const decay = () => {
				const t = Math.min(1, (performance.now() - start) / 280);
				spinWinOverlay.flashAlpha = from * (1 - t);
				if (t < 1) flashDecayRaf = requestAnimationFrame(decay);
			};
			flashDecayRaf = requestAnimationFrame(decay);
		}
	});

	onMount(() => {
		void ensureIntroFredokaFont().then(() => {
			fontReady = true;
		});
		void ensurePrizeNumberFont().then(() => {
			prizeFontReady = true;
		});
		return () => {
			cancelAnimationFrame(glowRaf);
			cancelAnimationFrame(flashDecayRaf);
		};
	});

	/** Semi-transparent playfield dim — read tween in markup so alpha updates during fade. */
	const OVERLAY_DIM_ALPHA = 0.55;

	const countUpIncomplete = $derived(spinWinOverlay.counting);

	/**
	 * During animation: round to whole dollars (prevents decimal flicker and reduces
	 * PIXI texture redraws from every frame → only on each $1 boundary).
	 * Once settled: lock to the exact target so the final value is always precise.
	 */
	const countUpDisplayBookAmount = $derived(
		capBookAmount(
			!spinWinOverlay.counting
				? (spinWinOverlay.targetAmount ?? 0)
				: Math.round(countUpTween.current),
		),
	);
</script>

{#if spinWinOverlay.show}
	<Container zIndex={zIndexes.spinWinOverlay} sortableChildren={true}>
		<Container zIndex={0} sortableChildren={true} eventMode="none">
			<Rectangle
				zIndex={0}
				width={canvas.width}
				height={canvas.height}
				backgroundColor={0x000000}
				backgroundAlpha={OVERLAY_DIM_ALPHA * spinWinDimProgress.current}
			/>

			{#if spinWinOverlay.flashAlpha > 0.01}
				<Rectangle
					zIndex={2}
					width={canvas.width}
					height={canvas.height}
					backgroundColor={0xffffff}
					backgroundAlpha={spinWinOverlay.flashAlpha}
				/>
			{/if}
		</Container>

		<Container
			zIndex={10}
			sortableChildren={true}
			x={spinWinOverlay.shakeX}
			y={spinWinOverlay.shakeY}
		>
			<WinCelebrationParticles />

			<MainContainer>
				<Container
					x={winAmountX}
					y={winAmountY}
					alpha={spinWinOverlay.contentAlpha}
					scale={amountScale.current}
					sortableChildren={true}
				>
				{#if isMaxWinTier && maxWinSpineReady}
					{#key spinWinOverlay.countUpSession}
						<Container
							zIndex={1}
							y={popupSpriteY}
							alpha={spinWinOverlay.labelScale}
							eventMode="none"
						>
							<WinAnimation
								width={winLayout.maxPopupWidth}
								anchor={0.5}
								animationMap={maxWinAnimation}
							/>
						</Container>
					{/key}
				{:else if popupReady && popupKey && popupSize}
					{#key popupKey}
						<Sprite
							zIndex={1}
							key={popupKey}
							anchor={isMaxWinTier ? introCard10000xAnchor : { x: 0.5, y: 1 }}
							y={popupSpriteY}
							width={popupSize.width}
							height={popupSize.height}
							alpha={spinWinOverlay.labelScale}
							blendMode="normal"
						/>
					{/key}
				{:else if isMaxWinTier && spinWinOverlay.labelScale > 0.01}
					<Text
						zIndex={1}
						anchor={{ x: 0.5, y: 1 }}
						y={labelY - winLayout.amountFontSize * 0.12}
						text={`${config.betModes.base.max_win.toLocaleString('en-US')}×`}
						style={{
							...tierLabelStyle,
							fontSize: winLayout.amountFontSize * 0.42,
							fill: 0xffee58,
							letterSpacing: Math.max(2, Math.round(6 * winLayout.scale)),
						}}
						resolution={textRes}
						scale={spinWinOverlay.labelScale}
					/>
					<Text
						zIndex={2}
						anchor={{ x: 0.5, y: 1 }}
						y={labelY}
						text={tierLabelText}
						style={tierLabelStyle}
						resolution={textRes}
						scale={spinWinOverlay.labelScale}
					/>
				{:else if tierLabelText && spinWinOverlay.labelScale > 0.01}
					<Graphics
						zIndex={0}
						draw={(g) => {
							g.clear();
							const w = winLayout.labelWidth * 1.05;
							const h = winLayout.amountFontSize * 1.05;
							g.ellipse(0, labelY - h * 0.35, w * 0.5, h * 0.45);
							g.fill({ color: 0xffd700, alpha: 0.12 + spinWinOverlay.glowPulse * 0.08 });
						}}
					/>
					<Text
						zIndex={1}
						anchor={{ x: 0.5, y: 1 }}
						y={labelY}
						text={tierLabelText}
						style={tierLabelStyle}
						resolution={textRes}
						scale={spinWinOverlay.labelScale}
					/>
				{/if}

		{#if spinWinOverlay.show}
			{#key countUpDisplayBookAmount}
				<Text
					zIndex={30}
					anchor={0.5}
					x={0}
					y={0}
					alpha={countUpDisplayBookAmount > 0 ? 1 : 0}
					scale={countUpFinishScale.current}
					text={bookEventAmountToWinCurrencyString(countUpDisplayBookAmount)}
					style={amountStyle}
					resolution={textRes}
				/>
			{/key}
		{/if}
				</Container>
			</MainContainer>

			{#if countUpIncomplete}
				<CanvasSizeRectangle
					zIndex={20}
					eventMode="static"
					cursor="pointer"
					backgroundColor={0xffffff}
					backgroundAlpha={0.001}
					onpointertap={() => requestSpinSkip()}
				/>
			{/if}
		</Container>
	</Container>
	{#if countUpIncomplete}
		<OnHotkey hotkey="Space" onpress={() => requestSpinSkip()} />
	{/if}
{/if}
