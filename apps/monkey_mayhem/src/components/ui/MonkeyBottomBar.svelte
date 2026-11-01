<script lang="ts">
	import { onMount } from 'svelte';
	import { CanvasTextMetrics, TextStyle } from 'pixi.js';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { Button } from 'components-pixi';
	import { getContext } from 'components-ui-pixi/src/context';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateUi, AUTO_SPINS_TEXT_OPTION_MAP } from 'state-shared';
	import { bookEventAmountToWinCurrencyString, numberToBetCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

	import MonkeySpinButton from './MonkeySpinButton.svelte';
	import MonkeyTurboButton from './MonkeyTurboButton.svelte';
	import ToolbarHamburgerIcon from './ToolbarHamburgerIcon.svelte';
	import ToolbarCloseIcon from './ToolbarCloseIcon.svelte';
	import ToolbarSettingsMenu from './ToolbarSettingsMenu.svelte';
	import BetChevronIcon from './BetChevronIcon.svelte';
import { TOOLBAR_CLOSE_SIZE, TOOLBAR_MENU_W } from '../../game/toolbarMenuTheme';
	import MonkeyAutoplayPopup from './MonkeyAutoplayPopup.svelte';
	import { AUTO_POPUP_ABOVE_BTN } from '../../game/autoplayPopupTheme';
	import { uiDisplaySize } from '../../game/uiAssetSizes';
	import { isGameplayInputAllowed } from '../../game/gameplayLock.svelte';
	import { requestAutoBet } from '../../game/commitWager';
	import { invalidateWinPresentation } from '../../game/spinWinOverlay.svelte';
	import { isToolbarBetUpBlockedByAffordability, stepToolbarBetAmount } from '../../game/betAmountChange';
	import { showInsufficientBalanceModal } from '../../game/insufficientBalance';
	import { insufficientBetIncreaseMessage } from '../../game/socialCopy';
	import { stateFxLab } from '../../game/fxLab.svelte';
	import { stateGame } from '../../game/stateGame.svelte';
	import { FOOTBALL_DEFAULT_BET_MODE_KEY, ANTE_BET_MODE_KEY, FEATURE_SPIN_BET_MODE_KEY, PEAK_SPIN_BET_MODE_KEY, GAMBLE_BET_MODE_KEY, deactivateToggleBetModes } from '../../game/betModes';
	import {
		isAutoplayDisabled,
		isBuyFeatureDisabled,
		isSpinSpeedControlDisabled,
	} from '../../game/jurisdiction';
	import { FS_TOOLBAR_CLUSTER_W, getBottomBarLayout } from '../../game/layoutScene';
	import {
		ANTE_VALUE_FILL,
		FEATURE_SPIN_VALUE_FILL,
		PEAK_SPIN_VALUE_FILL,
		PILL_BORDER_RADIUS,
		PILL_FILL,
		PILL_FILL_ALPHA,
		PILL_STROKE,
		PILL_STROKE_ALPHA,
		PILL_STROKE_WIDTH,
		AUTOPLAY_ARMED_RING,
		AUTOPLAY_ARMED_TINT,
		TOOLBAR_BUTTON_HOVER_ALPHA,
		TOOLBAR_WIN_FLASH_PEAK_SCALE,
	} from '../../game/uiBarTheme';
	import { toolbarLabel, freeSpinProgressLabel, freeSpinsToolbarLabel } from '../../game/socialCopy';
	import { capBookAmount, winPresentationSpeedScale } from '../../game/winCountTier';
	import { ensureAileronFont, isAileronFontReady } from '../../game/introFont';
	import { UI_FONT } from '../../game/uiFont';
	import { getPixiTextResolution, roundFontSize, roundPix } from '../../game/pixiTextCrisp';

	const FONT = UI_FONT;
	let aileronReady = $state(isAileronFontReady());

	type Props = {
		layoutWidth: number;
		layoutHeight: number;
		replayMode?: boolean;
	};

	const props: Props = $props();
	const uiContext = getContext();

	const balanceTween = new Tween(stateBet.balanceAmount);
	const winTween = new Tween(stateBet.winBookEventAmount);
	const winValueScale = new Tween(1);
	let lastWinFlashAmount = 0;
	const balanceValue = $derived(numberToCurrencyString(balanceTween.current));
	// In free spins show the base bet denomination, not the buy-bonus cost multiplier
	const betValue = $derived(
		inFreegame
			? numberToCurrencyString(stateBet.wageredBetAmount || stateBet.betAmount)
			: numberToCurrencyString(stateBetDerived.betCost()),
	);
	const inFreegame = $derived(stateGame.gameType === 'freegame');
	const anteActive = $derived(stateBet.activeBetModeKey === ANTE_BET_MODE_KEY);
	const featureSpinActive = $derived(stateBet.activeBetModeKey === FEATURE_SPIN_BET_MODE_KEY);
	const peakSpinActive = $derived(stateBet.activeBetModeKey === PEAK_SPIN_BET_MODE_KEY);
	const gambleActive = $derived(stateBet.activeBetModeKey === GAMBLE_BET_MODE_KEY);
	const featureToggleActive = $derived(anteActive || featureSpinActive || peakSpinActive || gambleActive);
	const totalWinValue = $derived(bookEventAmountToWinCurrencyString(capBookAmount(winTween.current)));
	const spinsProgress = $derived(
		freeSpinProgressLabel(stateUi.freeSpinCounterCurrent || 0, stateUi.freeSpinCounterTotal || 0),
	);

	$effect(() => {
		balanceTween.set(stateBet.balanceAmount, { duration: 0 });
	});

	const toolbarTotalWinCountMs = () => Math.round(480 * winPresentationSpeedScale());

	$effect(() => {
		const amount = capBookAmount(stateBet.winBookEventAmount);
		const inFs = stateGame.gameType === 'freegame';
		if (amount === 0) {
			winTween.set(0, { duration: 0 });
			return;
		}
		if (inFs && amount > winTween.current) {
			winTween.set(amount, { duration: toolbarTotalWinCountMs() });
			return;
		}
		winTween.set(amount, { duration: 0 });
	});

	$effect(() => {
		const amount = stateBet.winBookEventAmount;
		if (amount === 0) {
			lastWinFlashAmount = 0;
			winValueScale.set(1, { duration: 0 });
			return;
		}
		if (amount <= lastWinFlashAmount) return;
		lastWinFlashAmount = amount;
		winValueScale.set(TOOLBAR_WIN_FLASH_PEAK_SCALE, { duration: 70 });
		const settle = setTimeout(() => winValueScale.set(1, { duration: 150 }), 70);
		return () => clearTimeout(settle);
	});

	const bar = $derived(getBottomBarLayout(props.layoutWidth, props.layoutHeight));
	const sx = $derived(props.layoutWidth / 1920);
	const uiScale = $derived(bar.uiScale);

	const toolbarX = $derived(bar.toolbarLeftX);
	const toolbarY = $derived(bar.toolbarTopY);
	const toolbarW = $derived(bar.toolbarWidth);
	const toolbarRightX = $derived(toolbarX + toolbarW);
	const toolbarH = $derived(bar.toolbarHeight);
	const toolbarCenterY = $derived(bar.toolbarCenterY);
	const labelSize = $derived(bar.labelSize);
	const valueSize = $derived(bar.valueSize);
	/** 30px more gap between up/down bet chevrons (15px per side at 1920 ref). */
	const chevronYOffset = $derived(26 * uiScale);
	const chevronHitW = $derived(60 * uiScale);
	const chevronHitH = $derived(44 * uiScale);
	const spinX = $derived(bar.spinCenterX);
	const spinY = $derived(toolbarCenterY);
	const spinW = $derived(bar.spinDiameter);
	const spinH = $derived(bar.spinDiameter);
	const fsSpinW = $derived(inFreegame ? spinW * 0.88 : spinW);
	const fsSpinH = $derived(inFreegame ? spinH * 0.88 : spinH);

	const bonusY = $derived(bar.bonusCenterY ?? toolbarCenterY);
	const bonusW = $derived(bar.bonusDiameter);
	const bonusH = $derived(bar.bonusDiameter);
	const bonusSpriteKey = $derived(featureToggleActive ? 'btn_disable' : 'bonus_button');
	const bonusSpriteSize = $derived(uiDisplaySize(bonusSpriteKey, bonusW));
	const bonusX = $derived(bar.bonusCenterX);

	const autoX = $derived(bar.autoCenterX);
	const autoY = $derived(bar.autoCenterY);
	const autoW = $derived(bar.autoDiameter);
	const autoH = $derived(bar.autoDiameter);
	const autoSpriteSize = $derived(uiDisplaySize('btn_autospin', autoW));

	const turboW = $derived(bar.turboDiameter);
	const turboH = $derived(bar.turboDiameter);
	const turboX = $derived(inFreegame ? bar.fsTurboCenterX : bar.turboCenterX);
	const turboY = $derived(inFreegame ? toolbarCenterY : bar.turboCenterY);

	const menuW = $derived(bar.menuW);
	const menuH = $derived(bar.menuH);
	const menuCenterX = $derived(bar.menuCenterX);

	const balanceLeftX = $derived(bar.balanceLeftX ?? bar.balanceCenterX);
	const betLeftX = $derived(bar.betLeftX ?? bar.betRightX ?? bar.betCenterX);
	const balanceClusterW = $derived(bar.balanceClusterW ?? FS_TOOLBAR_CLUSTER_W.balance * uiScale);
	const betClusterW = $derived(bar.betClusterW ?? FS_TOOLBAR_CLUSTER_W.bet * uiScale);
	const balanceClusterCenterX = $derived(bar.balanceCenterX ?? balanceLeftX + balanceClusterW / 2);
	const betClusterCenterX = $derived(bar.betCenterX ?? betLeftX + betClusterW / 2);
	const isPortraitBar = $derived(bar.showWinCluster === false);
	const showFsBalance = $derived(!props.replayMode && !(inFreegame && isPortraitBar));
	const auxInMenu = $derived(bar.auxInMenu ?? false);
	const buyFeatureDisabled = $derived(isBuyFeatureDisabled());
	const autoplayDisabledByJurisdiction = $derived(
		isAutoplayDisabled(),
	);
	const spinSpeedDisabledByJurisdiction = $derived(isSpinSpeedControlDisabled());
	const showBonusButton = $derived(
		(bar.showBonusButton ?? true) && (!buyFeatureDisabled || featureToggleActive),
	);
	const arrowX = $derived(bar.arrowsCenterX);
	const menuPopupAnchorX = $derived(
		Math.max(menuCenterX, toolbarX + (TOOLBAR_MENU_W * sx) / 2),
	);


	/** Label above value — gap scales with band on portrait. */
	const textStackGap = $derived(Math.max(4, labelSize * 0.12));
	/** Match devicePixelRatio exactly — over-sampling (×2) causes downsampling blur. */
	const textRes = getPixiTextResolution();

	/** Show the WIN cluster in base game only when there is a non-zero win. */
	const showBaseWin = $derived(
		!inFreegame &&
			stateBet.winBookEventAmount > 0 &&
			(stateFxLab.forceToolbarWinPreview || (bar.showWinCluster ?? true)),
	);

	/** Center of the WIN cluster in the gap between BALANCE and BET (base game only). */
	const winCenterX = $derived(
		balanceLeftX + balanceClusterW + (betLeftX - (balanceLeftX + balanceClusterW)) / 2,
	);

	const valueMeasureStyle = (fontSize: number) =>
		new TextStyle({ fontFamily: FONT, fontSize, fontWeight: '900' });

	const measureValueWidth = (text: string, fontSize: number) =>
		CanvasTextMetrics.measureText(text, valueMeasureStyle(fontSize)).width;

	/**
	 * Auto-shrinks a value's font size so long currency strings don't overflow.
	 * Full size up to 7 chars ("$999.00"), then shrink ~2 px per extra digit.
	 * Floor at 60 % of the base size so text always remains readable.
	 */
	const autoValueFontSize = (text: string, baseSize: number): number => {
		const extra = Math.max(0, text.length - 7);
		return Math.max(baseSize * 0.6, baseSize - extra * (baseSize / 17));
	};

	/** Width-aware shrink — keeps paired values the same size while fitting cluster boxes. */
	const fitValueFontSize = (texts: string[], maxWidths: number[], baseSize: number): number => {
		let size = baseSize;
		const floor = baseSize * 0.55;
		while (size > floor) {
			const fits = texts.every(
				(text, index) => measureValueWidth(text, size) <= maxWidths[index] * 0.92,
			);
			if (fits) return size;
			size -= 1;
		}
		return floor;
	};

	/** Pick one font size from the longest string so paired amounts stay visually matched. */
	const sharedValueFontSize = (texts: string[]) => {
		const longest = texts.reduce((a, b) => (a.length >= b.length ? a : b), '');
		return autoValueFontSize(longest, valueSize);
	};

	/** Base game: balance/win/bet share one size so their two-line stacks center identically. */
	const baseValueSize = $derived(
		sharedValueFontSize(showBaseWin ? [balanceValue, betValue, totalWinValue] : [balanceValue, betValue]),
	);
	const baseToolbarValueSize = $derived(
		roundFontSize(
			isPortraitBar
				? fitValueFontSize(
						[balanceValue, betValue],
						[balanceClusterW, betClusterW],
						valueSize,
					)
				: baseValueSize,
		),
	);

	/**
	 * Two-line label+value stacks look heavy-bottomed when geometrically centred.
	 * Nudge up so BALANCE/BET align optically with spin, menu, and turbo icons.
	 */
	const toolbarTextOpticalShift = $derived(-(baseToolbarValueSize - labelSize) * 0.32);
	const textGroupY = $derived(roundPix(toolbarCenterY + toolbarTextOpticalShift));
	const fsTextGroupY = $derived(roundPix(toolbarCenterY + toolbarTextOpticalShift));

	/** Free spins: all numeric/currency clusters share one scale. */
	const fsToolbarValueSize = $derived(
		roundFontSize(
			isPortraitBar
				? fitValueFontSize(
						showFsBalance
							? [balanceValue, betValue, spinsProgress, totalWinValue]
							: [betValue, spinsProgress, totalWinValue],
						showFsBalance
							? [balanceClusterW, betClusterW, FS_TOOLBAR_CLUSTER_W.freeSpins * uiScale, FS_TOOLBAR_CLUSTER_W.totalWin * uiScale]
							: [betClusterW, FS_TOOLBAR_CLUSTER_W.freeSpins * uiScale, FS_TOOLBAR_CLUSTER_W.totalWin * uiScale],
						valueSize,
					)
				: sharedValueFontSize([balanceValue, betValue, spinsProgress, totalWinValue]),
		),
	);

	/**
	 * Positions for label+value rows relative to a container anchored at `textGroupY`.
	 * Uses the shared value font size so balance/bet baselines stay aligned.
	 */
	const toolbarStackY = (valueFontSize: number) => {
		const blockH = labelSize + textStackGap * 2 + valueFontSize;
		const top = -blockH / 2;
		return {
			labelY: roundPix(top + labelSize / 2),
			valueY: roundPix(top + labelSize + textStackGap * 2 + valueFontSize / 2),
		};
	};

	const baseStack = $derived(toolbarStackY(baseToolbarValueSize));
	const fsStack = $derived(toolbarStackY(fsToolbarValueSize));

	const labelStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: roundFontSize(labelSize),
		fontWeight: 'bold' as const,
		fill: 0xffffff,
		letterSpacing: 1,
	});
	const valueStyle = $derived({
		fontFamily: aileronReady ? FONT : 'Arial',
		fontSize: roundFontSize(valueSize),
		fontWeight: '900' as const,
		fill: 0xffffff,
	});
	const betValueStyle = $derived({
		...valueStyle,
		fill: peakSpinActive
			? PEAK_SPIN_VALUE_FILL
			: featureSpinActive
				? FEATURE_SPIN_VALUE_FILL
				: anteActive
					? ANTE_VALUE_FILL
					: 0xffffff,
		fontSize: roundFontSize(baseToolbarValueSize),
	});

	const controlsDisabled = $derived(
		!uiContext.stateXstateDerived.isIdle() || !isGameplayInputAllowed(),
	);

	const turboDisabled = $derived(stateBet.isSpaceHold || spinSpeedDisabledByJurisdiction);

	const openBuyBonus = () => {
		if (buyFeatureDisabled) return;
		if (controlsDisabled) return;
		hamburgerOpen = false;
		stateModal.modal = { name: 'buyBonus' };
	};

	const onBonusPress = () => {
		if (controlsDisabled) return;
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (featureToggleActive) {
			deactivateToggleBetModes();
		} else {
			if (buyFeatureDisabled) return;
			openBuyBonus();
		}
	};

	const biggestBet = $derived(
		stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
	);
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const betIncreaseAtMax = $derived(stateBet.betAmount === biggestBet);
	const betIncreaseUnaffordable = $derived(isToolbarBetUpBlockedByAffordability());
	const betIncreaseHardDisabled = $derived(
		!uiContext.stateXstateDerived.isIdle() || betIncreaseAtMax,
	);
	const betIncreaseVisuallyDisabled = $derived(
		betIncreaseHardDisabled || betIncreaseUnaffordable,
	);
	const betDecreaseDisabled = $derived(
		!uiContext.stateXstateDerived.isIdle() || stateBet.betAmount === smallestBet,
	);

	const onBetIncreasePress = () => {
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (betIncreaseHardDisabled) return;
		if (betIncreaseUnaffordable) {
			showInsufficientBalanceModal(insufficientBetIncreaseMessage());
			return;
		}
		stepToolbarBetAmount('up');
	};

	let hamburgerOpen = $state(false);
	let autoPopupOpen = $state(false);

	onMount(() => {
		void ensureAileronFont().then(() => {
			aileronReady = true;
		});
	});

	const toggleHamburger = () => {
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		autoPopupOpen = false;
		hamburgerOpen = !hamburgerOpen;
	};

	const toggleAutoPopup = () => {
		if (autoplayDisabledByJurisdiction) return;
		if (controlsDisabled) return;
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		hamburgerOpen = false;
		autoPopupOpen = !autoPopupOpen;
	};

	const closeBtnSize = $derived(TOOLBAR_CLOSE_SIZE * sx);

	const autoPopupX = $derived(auxInMenu ? menuCenterX + menuW * 0.5 : toolbarRightX);
	const autoPopupY = $derived(toolbarY - AUTO_POPUP_ABOVE_BTN * (auxInMenu ? uiScale : sx));

	/**
	 * Arm the autoplay counter — does NOT start the autoplay loop. Spin and autospin
	 * show armed chrome; the next spin click starts autospin.
	 */
	const armAutoSpin = (option: string) => {
		if (autoplayDisabledByJurisdiction) return;
		const count = AUTO_SPINS_TEXT_OPTION_MAP[option as keyof typeof AUTO_SPINS_TEXT_OPTION_MAP];
		if (count === undefined) return;
		autoPopupOpen = false;
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.autoSpinsText = option as any;
		stateBet.autoSpinsCounter = count;
		if (stateBetDerived.activeBetMode().type === 'buy') {
			stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
		}
		if (!uiContext.stateXstateDerived.isIdle()) return;
		if (!stateBetDerived.isBetCostAvailable()) {
			showInsufficientBalanceModal();
			return;
		}
		invalidateWinPresentation();
		uiContext.eventEmitter.broadcast({ type: 'paylineWinHide' });
		requestAutoBet();
	};

	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());
	const autoPlayRunning = $derived(uiContext.stateXstateDerived.isAutoBetting());
	const autoPlayArmed = $derived(autoActive && !autoPlayRunning);
	const autoDisabled = $derived.by(() => {
		if (autoplayDisabledByJurisdiction) return true;
		if (stateBet.isSpaceHold) return true;
		if (
			!uiContext.stateXstateDerived.isIdle() &&
			!stateBetDerived.hasAutoBetCounter() &&
			!uiContext.stateXstateDerived.isAutoBetting()
		) {
			return true;
		}
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const onAutoPress = () => {
		if (autoDisabled) return;
		if (
			stateBetDerived.hasAutoBetCounter() ||
			uiContext.stateXstateDerived.isAutoBetting()
		) {
			stateBet.autoSpinsCounter = 0;
			autoPopupOpen = false;
		} else {
			toggleAutoPopup();
		}
	};

	$effect(() => {
		if (!autoplayDisabledByJurisdiction) return;
		stateBet.autoSpinsCounter = 0;
		autoPopupOpen = false;
	});
</script>

<Container sortableChildren={true}>
	<!-- Toolbar background (screen-centered; bonus is separate) -->
	<Rectangle
		x={toolbarX}
		y={toolbarY}
		width={toolbarW}
		height={toolbarH}
		borderRadius={PILL_BORDER_RADIUS}
		backgroundColor={PILL_FILL}
		backgroundAlpha={PILL_FILL_ALPHA}
		borderColor={PILL_STROKE}
		borderAlpha={PILL_STROKE_ALPHA}
		borderWidth={PILL_STROKE_WIDTH}
	/>

	{#if inFreegame}
		<!-- In-bonus: ≡ | BET ··· FREE SPINS | TOTAL WIN | turbo (portrait hides balance to fit) -->
		{@const hamburgerHit = Math.max(menuW, menuH, 44 * uiScale)}
		<!-- Hamburger is an icon: center it on the toolbar's geometric middle, not the text optical line. -->
		<Container x={menuCenterX} y={toolbarCenterY} zIndex={20}>
			<Button
				anchor={0.5}
				sizes={{ width: hamburgerHit, height: hamburgerHit }}
				onpress={toggleHamburger}
			>
				{#snippet children({ center, hovered })}
					<Container {...center}>
						<Rectangle
							anchor={0.5}
							width={hamburgerHit}
							height={hamburgerHit}
							backgroundColor={0xffffff}
							backgroundAlpha={0.001}
						/>
						{#if hamburgerOpen}
							<ToolbarCloseIcon scale={uiScale} />
						{:else}
							<ToolbarHamburgerIcon scale={uiScale} />
						{/if}
						{#if hovered}
							<Rectangle
								anchor={0.5}
								width={hamburgerHit}
								height={hamburgerHit}
								borderRadius={4}
								backgroundColor={0xffffff}
								backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
								eventMode="none"
							/>
						{/if}
					</Container>
				{/snippet}
			</Button>
		</Container>

		<!-- Left: label stacks left-aligned over values -->
		{#if aileronReady}
		{#if showFsBalance}
			<Container x={roundPix(isPortraitBar ? bar.fsBalanceCenterX : bar.fsBalanceX)} y={fsTextGroupY}>
				<Text
					anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
					y={fsStack.labelY}
					text={toolbarLabel('balance')}
					eventMode="none"
					style={labelStyle}
					resolution={textRes}
				/>
				<Text
					anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
					y={fsStack.valueY}
					text={balanceValue}
					eventMode="none"
					style={{ ...valueStyle, fontSize: fsToolbarValueSize }}
					resolution={textRes}
				/>
			</Container>
		{/if}

		<Container x={roundPix(isPortraitBar ? bar.fsBetCenterX : bar.fsBetX)} y={fsTextGroupY}>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={fsStack.labelY}
				text={toolbarLabel('bet')}
				eventMode="none"
				style={labelStyle}
				resolution={textRes}
			/>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={fsStack.valueY}
				text={betValue}
				eventMode="none"
				style={{ ...valueStyle, fontSize: fsToolbarValueSize }}
				resolution={textRes}
			/>
		</Container>

		<!-- Right: center-aligned label stacks (LTR: free spins · total win · turbo) -->
		<Container x={roundPix(bar.fsFreeSpinsCenterX)} y={fsTextGroupY}>
			<Text anchor={{ x: 0.5, y: 0.5 }} y={fsStack.labelY} text={freeSpinsToolbarLabel()} eventMode="none" style={labelStyle} resolution={textRes} />
			<Text anchor={{ x: 0.5, y: 0.5 }} y={fsStack.valueY} text={spinsProgress} eventMode="none"
				style={{ ...valueStyle, fontSize: fsToolbarValueSize }} resolution={textRes} />
		</Container>

		<Container x={roundPix(bar.fsTotalWinCenterX)} y={fsTextGroupY}>
			<Text anchor={{ x: 0.5, y: 0.5 }} y={fsStack.labelY} text={toolbarLabel('totalWin')} eventMode="none" style={labelStyle} resolution={textRes} />
			<Container y={fsStack.valueY} scale={winValueScale.current}>
				<Text anchor={{ x: 0.5, y: 0.5 }} text={totalWinValue} eventMode="none"
					style={{ ...valueStyle, fill: 0xffd700, fontSize: fsToolbarValueSize }}
					resolution={textRes} />
			</Container>
		</Container>
		{/if}
	{:else}
		<!-- Hamburger / close (transparent hit-area covers the full row height) -->
		{@const hamburgerHit = Math.max(menuW, menuH, 44 * uiScale)}
		<Container x={menuCenterX} y={toolbarCenterY} zIndex={20}>
			<Button
				anchor={0.5}
				sizes={{ width: hamburgerHit, height: hamburgerHit }}
				onpress={toggleHamburger}
			>
				{#snippet children({ center, hovered })}
					<Container {...center}>
						<Rectangle
							anchor={0.5}
							width={hamburgerHit}
							height={hamburgerHit}
							backgroundColor={0xffffff}
							backgroundAlpha={0.001}
						/>
						{#if hamburgerOpen}
							<ToolbarCloseIcon scale={uiScale} />
						{:else}
							<ToolbarHamburgerIcon scale={uiScale} />
						{/if}
						{#if hovered}
							<Rectangle
								anchor={0.5}
								width={hamburgerHit}
								height={hamburgerHit}
								borderRadius={4}
								backgroundColor={0xffffff}
								backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
								eventMode="none"
							/>
						{/if}
					</Container>
				{/snippet}
			</Button>
		</Container>

		<!-- BALANCE: portrait centers in cluster box; desktop left-aligns -->
		{#if aileronReady}
		<Container x={roundPix(isPortraitBar ? balanceClusterCenterX : balanceLeftX)} y={textGroupY} zIndex={8}>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={baseStack.labelY}
				text={toolbarLabel('balance')}
				eventMode="none"
				style={labelStyle}
				resolution={textRes}
			/>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={baseStack.valueY}
				text={balanceValue}
				eventMode="none"
				style={{ ...valueStyle, fontSize: baseToolbarValueSize }}
				resolution={textRes}
			/>
		</Container>

		<!-- WIN: centered between BALANCE and BET; visible only when there is a win -->
		{#if showBaseWin}
			<Container x={roundPix(winCenterX)} y={textGroupY}>
				<Text anchor={{ x: 0.5, y: 0.5 }} y={baseStack.labelY} text={toolbarLabel('win')} eventMode="none" style={labelStyle} resolution={textRes} />
				<Container y={baseStack.valueY} scale={winValueScale.current}>
					<Text anchor={{ x: 0.5, y: 0.5 }} text={totalWinValue} eventMode="none"
						style={{ ...valueStyle, fill: 0xffd700, fontSize: baseToolbarValueSize }}
						resolution={textRes} />
				</Container>
			</Container>
		{/if}

		<!-- BET: portrait centers in cluster box; gold value when Extra Chance is on -->
		<Container x={roundPix(isPortraitBar ? betClusterCenterX : betLeftX)} y={textGroupY} zIndex={8}>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={baseStack.labelY}
				text={toolbarLabel('bet')}
				eventMode="none"
				style={labelStyle}
				resolution={textRes}
			/>
			<Text
				anchor={{ x: isPortraitBar ? 0.5 : 0, y: 0.5 }}
				y={baseStack.valueY}
				text={betValue}
				eventMode="none"
				style={{ ...betValueStyle, fontSize: baseToolbarValueSize }}
				resolution={textRes}
			/>
		</Container>
		{/if}

		<!-- Bet chevrons (stroke V-shapes, 27px stack) -->
		<Container x={arrowX} y={toolbarCenterY} zIndex={6}>
			<Container y={-chevronYOffset}>
				<Button anchor={0.5} sizes={{ width: chevronHitW, height: chevronHitH }} disabled={betIncreaseHardDisabled}
					onpress={onBetIncreasePress}>
					{#snippet children({ center, hovered })}
						<Container {...center}>
							<BetChevronIcon direction="up" scale={uiScale} disabled={betIncreaseVisuallyDisabled} />
							{#if hovered && !betIncreaseVisuallyDisabled}
								<Rectangle
									anchor={0.5}
									width={chevronHitW}
									height={chevronHitH}
									borderRadius={4}
									backgroundColor={0xffffff}
									backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
								/>
							{/if}
						</Container>
					{/snippet}
				</Button>
			</Container>
			<Container y={chevronYOffset}>
				<Button anchor={0.5} sizes={{ width: chevronHitW, height: chevronHitH }} disabled={betDecreaseDisabled}
					onpress={() => {
						uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
						stepToolbarBetAmount('down');
					}}>
					{#snippet children({ center, hovered })}
						<Container {...center}>
							<BetChevronIcon direction="down" scale={uiScale} disabled={betDecreaseDisabled} />
							{#if hovered && !betDecreaseDisabled}
								<Rectangle
									anchor={0.5}
									width={chevronHitW}
									height={chevronHitH}
									borderRadius={4}
									backgroundColor={0xffffff}
									backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
								/>
							{/if}
						</Container>
					{/snippet}
				</Button>
			</Container>
		</Container>

	{/if}

	<!-- BONUS / DISABLE (ante or feature spin) — portrait: floats above toolbar pill -->
	{#if !inFreegame && showBonusButton}
		{@const bonusHit = Math.max(bonusW, bonusH, isPortraitBar ? 52 * uiScale : 0)}
		<Container x={bonusX} y={bonusY} zIndex={25}>
			<Button
				anchor={0.5}
				sizes={{ width: bonusHit, height: bonusHit }}
				disabled={controlsDisabled}
				onpress={onBonusPress}
			>
				{#snippet children({ center, hovered })}
					<Container {...center}>
						<Sprite
							key={bonusSpriteKey}
							anchor={0.5}
							width={bonusSpriteSize.width}
							height={bonusSpriteSize.height}
							alpha={controlsDisabled ? 0.45 : 1}
						/>
						{#if hovered && !controlsDisabled}
							<Rectangle
								anchor={0.5}
								width={bonusW}
								height={bonusH}
								borderRadius={bonusW / 2}
								backgroundColor={0xffffff}
								backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
							/>
						{/if}
					</Container>
				{/snippet}
			</Button>
		</Container>
	{/if}

	<!-- Autoplay picker above spin/auto so number clicks hit cells, not the spin button -->
	{#if autoPopupOpen && !inFreegame && !autoplayDisabledByJurisdiction}
		<MonkeyAutoplayPopup
			scale={auxInMenu ? uiScale : sx}
			x={autoPopupX}
			y={autoPopupY}
			onSelect={(opt) => armAutoSpin(opt)}
		/>
	{/if}

	<!-- Spin button (hidden during bonus) -->
	{#if !inFreegame}
		<Container x={spinX} y={spinY} zIndex={4}>
			<MonkeySpinButton anchor={0.5} width={fsSpinW} height={fsSpinH} />
		</Container>
	{/if}

	<!-- Auto spin (inline popup) — portrait: hamburger menu -->
	{#if !inFreegame && !auxInMenu && !autoplayDisabledByJurisdiction}
		<Container x={autoX} y={autoY} zIndex={5}>
			<Button anchor={0.5} sizes={{ width: autoW, height: autoH }} disabled={autoDisabled} onpress={onAutoPress}>
				{#snippet children({ center, hovered })}
					<Container {...center}>
						{#if autoActive}
							<Graphics
								eventMode="none"
								draw={(g) => {
									const r = (autoW / 2) * AUTOPLAY_ARMED_RING.radiusScale;
									g.clear();
									g.circle(0, 0, r);
									g.stroke({
										width: AUTOPLAY_ARMED_RING.width,
										color: 0xffd700,
										alpha: autoPlayArmed ? AUTOPLAY_ARMED_RING.alpha : 0.32,
									});
								}}
							/>
						{/if}
						<Sprite
							key="btn_autospin"
							anchor={0.5}
							width={autoSpriteSize.width}
							height={autoSpriteSize.height}
							alpha={autoDisabled ? 0.45 : 1}
							tint={autoActive ? AUTOPLAY_ARMED_TINT : 0xffffff}
						/>
						{#if hovered && !autoDisabled}
							<Rectangle
								anchor={0.5}
								width={autoW}
								height={autoH}
								borderRadius={autoW / 2}
								backgroundColor={0xffffff}
								backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
							/>
						{/if}
					</Container>
				{/snippet}
			</Button>
		</Container>
	{/if}

	<!-- Turbo — portrait: hamburger menu -->
	{#if !auxInMenu && !spinSpeedDisabledByJurisdiction}
		<Container x={turboX} y={turboY} zIndex={5}>
			<MonkeyTurboButton anchor={0.5} width={turboW} height={turboH} disabled={turboDisabled} />
		</Container>
	{/if}

	{#if hamburgerOpen}
		<ToolbarSettingsMenu
			scale={auxInMenu ? uiScale : sx}
			anchorX={menuPopupAnchorX}
			y={toolbarY}
			showBonusRow={auxInMenu && !inFreegame && showBonusButton}
			onBonusPress={onBonusPress}
			bonusDisabled={controlsDisabled}
			bonusAnteActive={anteActive}
			bonusFeatureSpinActive={featureSpinActive}
			bonusPeakSpinActive={peakSpinActive}
			showAutoSpinRow={auxInMenu && !inFreegame && !autoplayDisabledByJurisdiction}
			showSpeedRow={auxInMenu && !spinSpeedDisabledByJurisdiction}
			onAutoSpin={onAutoPress}
			autoSpinDisabled={autoDisabled}
			onClose={() => {
				hamburgerOpen = false;
			}}
		/>
	{/if}

</Container>
