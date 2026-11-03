<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import {
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateSound,
		stateUi,
	} from 'state-shared';
	import { bookEventAmountToNormalisedAmount } from 'utils-shared/amount';
	import { getContext } from '../../game/context';
	import { assetSrc } from '../../assets/resolve';
	import { isGameplayInputAllowed } from '../../game/gameplayLock.svelte';
	import { requestAutoBet, requestBet } from '../../game/commitWager';
	import { invalidateWinPresentation, spinWinOverlay } from '../../game/spinWinOverlay.svelte';
	import { canRequestSpinSkip, requestSpinSkip, stateSpinSkip } from '../../game/spinSkip.svelte';
	import { isToolbarBetUpBlockedByAffordability, stepToolbarBetAmount } from '../../game/betAmountChange';
	import { showInsufficientBalanceModal } from '../../game/insufficientBalance';
	import { insufficientBetIncreaseMessage } from '../../game/socialCopy';
	import { stateGame } from '../../game/stateGame.svelte';
	import { stateCoinFeatureCover } from '../../game/coinFeatureCover.svelte';
	import { stateBonusOutro } from '../../game/bonusOutroPresentation.svelte';
	import { formatBoardWin, formatMoney } from '../../game/stakeMoney';
	import { fitValueFontSize, roundFitFontSize } from '../../game/moneyFitters';
	import { isPhonePlayHost } from '../../game/layoutUi';
	import {
		ANTE_BET_MODE_KEY,
		FEATURE_SPIN_BET_MODE_KEY,
		FOOTBALL_DEFAULT_BET_MODE_KEY,
		PEAK_SPIN_BET_MODE_KEY,
		GAMBLE_BET_MODE_KEY,
		deactivateToggleBetModes,
	} from '../../game/betModes';
	import {
		isAutoplayDisabled,
		isBuyFeatureDisabled,
		isSpinSpeedControlDisabled,
	} from '../../game/jurisdiction';
	import { ensureFredokaOneFont } from '../../game/introFont';
	import { getSummitToolbarLayout, isShortLandscape } from '../../game/summitToolbarLayout';
	import { readCanvasSize } from '../../game/desktopLayout';
	import {
		autoSpinsMenuLabel,
		betControlDecreaseAria,
		betControlIncreaseAria,
		freeSpinProgressLabel,
		freeSpinsToolbarLabel,
		isSocialMode,
		toolbarLabel,
	} from '../../game/socialCopy';
	import {
		capBookAmount,
		getWinMultiplier,
		isMaxWinMultiplier,
		shouldShowCenterWinCountUp,
		winPresentationSpeedScale,
	} from '../../game/winCountTier';
	import {
		cycleSpinSpeedTier,
		getSpinSpeedDisplayTier,
		spinSpeedLabel,
	} from '../../game/spinSpeed.svelte';
	import { syncMonkeyBgmVolume } from '../../game/MonkeyBgm';
	import { syncMonkeySfxVolume } from '../../game/MonkeySoundPlayer';
	import ToolbarSettingsMenu from './summit/ToolbarSettingsMenu.svelte';

	type Props = {
		replayMode?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	let viewport = $state(readCanvasSize());
	let summitFontReady = $state(false);
	const pixiCanvas = $derived(context.stateLayoutDerived.canvasSizes());
	const canvas = $derived({
		width: viewport.width || pixiCanvas.width,
		height: viewport.height || pixiCanvas.height,
	});
	const forcePortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');

	const summitSrc = (name: 'sound' | 'music') =>
		assetSrc(name === 'sound' ? 'ui_summit_sound' : 'ui_summit_music');

	const inFreegame = $derived(stateGame.gameType === 'freegame');
	const layout = $derived(
		getSummitToolbarLayout(canvas.width, canvas.height, inFreegame, forcePortrait),
	);
	const phonePlayHost = $derived(isPhonePlayHost());
	const shortLandscape = $derived(isShortLandscape(canvas.width, canvas.height));

	const anteActive = $derived(stateBet.activeBetModeKey === ANTE_BET_MODE_KEY);
	const featureSpinActive = $derived(stateBet.activeBetModeKey === FEATURE_SPIN_BET_MODE_KEY);
	const peakSpinActive = $derived(stateBet.activeBetModeKey === PEAK_SPIN_BET_MODE_KEY);
	const gambleActive = $derived(stateBet.activeBetModeKey === GAMBLE_BET_MODE_KEY);
	const featureToggleActive = $derived(anteActive || featureSpinActive || peakSpinActive || gambleActive);

	const balanceTween = new Tween(stateBet.balanceAmount);
	const winTween = new Tween(stateBet.winBookEventAmount);
	const balanceValue = $derived(formatMoney(balanceTween.current, 'balance'));
	const betValue = $derived(
		formatMoney(
			inFreegame ? stateBet.wageredBetAmount || stateBet.betAmount : stateBetDerived.betCost(),
			'bet',
		),
	);
	const lastWinBook = $derived(capBookAmount(winTween.current));
	const lastWinCash = $derived(bookEventAmountToNormalisedAmount(lastWinBook));
	const totalWinValue = $derived(formatBoardWin(lastWinCash));
	const winPopupAmount = $derived(totalWinValue);
	let holdHudWinForCenterPopup = $state(false);
	let holdHudWinForOutro = $state(false);
	const lastWin = $derived(lastWinBook);
	const featOrSummitActive = $derived(featureSpinActive || peakSpinActive);
	const idle = $derived(context.stateXstateDerived.isIdle());
	const coinGameHidesBonusWin = $derived(
		inFreegame &&
			(stateCoinFeatureCover.preCoinShrinkActive || stateCoinFeatureCover.dimActive),
	);
	const winPopupOpen = $derived(
		lastWin > 0 &&
			!spinWinOverlay.show &&
			!holdHudWinForOutro &&
			!coinGameHidesBonusWin &&
			(inFreegame || !holdHudWinForCenterPopup) &&
			!(featOrSummitActive && !idle),
	);
	const toolbarLabelSize = $derived(layout.labelSize);
	const balanceFitValueSize = $derived(
		roundFitFontSize(fitValueFontSize(balanceValue, layout.balanceW, layout.valueSize)),
	);
	const betFitValueSize = $derived(
		roundFitFontSize(fitValueFontSize(betValue, layout.betW, layout.valueSize)),
	);
	const winChipLabel = $derived(inFreegame ? toolbarLabel('totalWin') : toolbarLabel('win'));
	const spinsProgress = $derived(
		freeSpinProgressLabel(stateUi.freeSpinCounterCurrent || 0, stateUi.freeSpinCounterTotal || 0),
	);

	$effect(() => {
		balanceTween.set(stateBet.balanceAmount, { duration: 0 });
	});

	const shouldDeferHudWinSlide = (winAmount: number, opts?: { maxWin?: boolean }) => {
		if (!(layout.portrait || phonePlayHost)) return false;
		if (inFreegame) return false;
		if (opts?.maxWin) return true;
		if (stateSpinSkip.active) return false;
		return shouldShowCenterWinCountUp(winAmount);
	};

	$effect(() => {
		const amount = capBookAmount(stateBet.winBookEventAmount);
		if (amount === 0) {
			holdHudWinForCenterPopup = false;
			winTween.set(0, { duration: 0 });
			return;
		}
		const maxWin = isMaxWinMultiplier(getWinMultiplier(amount));
		holdHudWinForCenterPopup = shouldDeferHudWinSlide(amount, { maxWin });
		if (inFreegame && amount > winTween.current) {
			winTween.set(amount, { duration: Math.round(480 * winPresentationSpeedScale()) });
			return;
		}
		winTween.set(amount, { duration: 0 });
	});

	context.eventEmitter.subscribeOnMount({
		spinWinPresentComplete: () => {
			holdHudWinForCenterPopup = false;
		},
		freeSpinOutroShow: () => {
			holdHudWinForOutro = true;
		},
		freeSpinOutroHide: () => {
			holdHudWinForOutro = false;
		},
	});

	const controlsDisabled = $derived(!idle || !isGameplayInputAllowed());
	const autoplayDisabledByJurisdiction = $derived(
		isAutoplayDisabled(),
	);
	const buyFeatureDisabled = $derived(isBuyFeatureDisabled());
	const spinSpeedDisabledByJurisdiction = $derived(isSpinSpeedControlDisabled());
	const turboDisabled = $derived(stateBet.isSpaceHold || spinSpeedDisabledByJurisdiction);

	const autoPlayRunning = $derived(context.stateXstateDerived.isAutoBetting());
	const autoPlayArmed = $derived(stateBetDerived.hasAutoBetCounter() && !autoPlayRunning);
	const autoSpinsText = $derived(stateUi.autoSpinsText || '');
	const autoSpinsRemainingDisplay = $derived.by(() => {
		const n = stateBet.autoSpinsCounter;
		if (n < 0 || !Number.isFinite(n)) return '∞';
		return String(n);
	});
	const autoChipCount = $derived(autoSpinsText === '∞' ? '∞' : autoSpinsRemainingDisplay);

	const speedTier = $derived(getSpinSpeedDisplayTier());
	const speedMode = $derived(speedTier === 'superTurbo' ? 2 : speedTier === 'turbo' ? 1 : 0);

	const betAccentClass = $derived(featureToggleActive ? 'mode-on' : '');
	const activeModeHudLabel = $derived(
		anteActive
			? 'EXTRA CHANCE'
			: featureSpinActive
				? isSocialMode()
					? 'FEATURE PLAY'
					: 'FEATURE SPIN'
				: peakSpinActive
					? isSocialMode()
						? 'TRIFECTA PLAY'
						: 'TRIFECTA SPIN'
					: gambleActive
						? isSocialMode()
							? 'FEATURE PICK'
							: 'GAMBLE'
						: toolbarLabel('bet'),
	);

	const biggestBet = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const sortedBetLadder = $derived([...stateConfig.betAmountOptions]);
	const canIncreaseBet = $derived(
		idle && stateBet.betAmount !== biggestBet && !isToolbarBetUpBlockedByAffordability(),
	);
	const canDecreaseBet = $derived(idle && stateBet.betAmount !== smallestBet);
	const canOpenBetSlider = $derived(idle && !inFreegame && !props.replayMode);

	let hamburgerOpen = $state(false);
	let autoPopupOpen = $state(false);
	let betSliderOpen = $state(false);
	let toolbarBarEl = $state<HTMLElement | undefined>(undefined);
	let hamburgerBtnEl = $state<HTMLButtonElement | undefined>(undefined);
	let autoBtnEl = $state<HTMLButtonElement | undefined>(undefined);
	let sfxVolume = $state(stateSound.volumeValueSoundEffect);
	let musicVolume = $state(stateSound.volumeValueMusic);

	const autoSpinOptions = ['∞', '10', '25', '50', '100', '200', '300', '500', '1000'] as const;
	const autoRoundCount: Record<string, number> = {
		'∞': Infinity,
		'10': 10,
		'25': 25,
		'50': 50,
		'100': 100,
		'200': 200,
		'300': 300,
		'500': 500,
		'1000': 1000,
	};
	let autoPick = $state('10');

	const playUi = (type: 'soundPressGeneral' | 'soundPressBet' = 'soundPressGeneral') => {
		context.eventEmitter.broadcast({ type });
	};

	const closeHamburgerMenu = () => {
		hamburgerOpen = false;
	};

	const closeBetSlider = () => {
		betSliderOpen = false;
	};

	const closeAutoplayPanel = () => {
		if (!autoPopupOpen) return;
		autoPopupOpen = false;
		if (!autoPlayRunning && autoPlayArmed) {
			stateBet.autoSpinsCounter = 0;
			stateUi.autoSpinsText = '' as never;
		}
	};

	const toggleHamburger = () => {
		playUi();
		autoPopupOpen = false;
		betSliderOpen = false;
		hamburgerOpen = !hamburgerOpen;
	};

	const toggleBetSlider = (event?: MouseEvent) => {
		event?.stopPropagation();
		if (!canOpenBetSlider) return;
		playUi();
		betSliderOpen = !betSliderOpen;
		if (betSliderOpen) {
			hamburgerOpen = false;
			autoPopupOpen = false;
		}
	};

	const pickBetAmount = (amount: number) => {
		if (!canOpenBetSlider || amount === stateBet.betAmount) {
			closeBetSlider();
			return;
		}
		playUi();
		stateBetDerived.setBetAmount(amount);
		closeBetSlider();
	};

	const onBetIncreasePress = () => {
		playUi();
		if (!idle || stateBet.betAmount === biggestBet) return;
		if (isToolbarBetUpBlockedByAffordability()) {
			showInsufficientBalanceModal(insufficientBetIncreaseMessage());
			return;
		}
		stepToolbarBetAmount('up');
	};

	const onBetDecreasePress = () => {
		playUi();
		if (!canDecreaseBet) return;
		stepToolbarBetAmount('down');
	};

	const openBuyBonus = () => {
		if (buyFeatureDisabled || controlsDisabled) return;
		hamburgerOpen = false;
		stateModal.modal = { name: 'buyBonus' };
	};

	const onBonusPress = () => {
		if (controlsDisabled) return;
		playUi();
		if (featureToggleActive) deactivateToggleBetModes();
		else {
			if (buyFeatureDisabled) return;
			openBuyBonus();
		}
	};

	const toggleTurbo = () => {
		if (turboDisabled) return;
		playUi();
		cycleSpinSpeedTier();
	};

	const toggleAutoplay = () => {
		if (autoplayDisabledByJurisdiction) return;
		if (autoPlayRunning || autoPlayArmed) {
			playUi();
			stateBet.autoSpinsCounter = 0;
			stateUi.autoSpinsText = '' as never;
			autoPopupOpen = false;
			return;
		}
		if (controlsDisabled) return;
		playUi();
		hamburgerOpen = false;
		betSliderOpen = false;
		autoPopupOpen = !autoPopupOpen;
	};

	const armAutoplay = (option: string) => {
		if (autoplayDisabledByJurisdiction) return;
		const count = autoRoundCount[option];
		if (count === undefined) return;
		playUi();
		autoPick = option;
		stateUi.autoSpinsText = option as never;
		stateBet.autoSpinsCounter = count;
		if (stateBetDerived.activeBetMode().type === 'buy') {
			stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
		}
	};

	const activateSelectedAutoplay = () => {
		if (autoplayDisabledByJurisdiction || !idle) return;
		armAutoplay(autoPick);
		if (!stateBetDerived.isBetCostAvailable()) {
			showInsufficientBalanceModal();
			return;
		}
		invalidateWinPresentation();
		context.eventEmitter.broadcast({ type: 'paylineWinHide' });
		requestAutoBet();
		autoPopupOpen = false;
	};

	const onSpinPress = () => {
		if (stateGame.gameType === 'freegame') return;
		if (idle && !isGameplayInputAllowed()) return;
		playUi('soundPressBet');
		if (idle) {
			if (autoPlayArmed) {
				if (!stateBetDerived.isBetCostAvailable()) {
					showInsufficientBalanceModal();
					return;
				}
				invalidateWinPresentation();
				context.eventEmitter.broadcast({ type: 'paylineWinHide' });
				requestAutoBet();
				autoPopupOpen = false;
				return;
			}
			if (!stateBetDerived.isBetCostAvailable()) {
				showInsufficientBalanceModal();
				return;
			}
			invalidateWinPresentation();
			context.eventEmitter.broadcast({ type: 'paylineWinHide' });
			requestBet();
			return;
		}
		if (autoPlayRunning) {
			stateBet.autoSpinsCounter = 0;
			if (canRequestSpinSkip()) requestSpinSkip();
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
			return;
		}
		if (stateSpinSkip.active) {
			if (
				stateSpinSkip.boardSkipUsed ||
				stateSpinSkip.quickLandUsed ||
				stateSpinSkip.quickLandInProgress
			)
				return;
			if (canRequestSpinSkip()) requestSpinSkip();
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const openInfo = () => {
		playUi();
		hamburgerOpen = false;
		autoPopupOpen = false;
		stateModal.modal = { name: 'payTable' };
	};

	const setVolumeSfx = (value: number) => {
		stateSound.volumeValueSoundEffect = value;
		syncMonkeySfxVolume();
	};

	const setVolumeMusic = (value: number) => {
		stateSound.volumeValueMusic = value;
		syncMonkeyBgmVolume();
	};

	const handleGlobalPointerDown = (event: PointerEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		if (betSliderOpen && !target.closest('.bet-grid, .bet-copy-hit, .bet-chevron, .amount.bet')) {
			closeBetSlider();
		}
		if (
			hamburgerOpen &&
			!layout.portrait &&
			!target.closest('.toolbar-settings-menu, .toolbar-menu-anchor, .hamburger')
		) {
			closeHamburgerMenu();
		}
		if (
			autoPopupOpen &&
			!layout.auxInMenu &&
			!target.closest('.auto-popup, .sprite.auto, .sprite.spin')
		) {
			closeAutoplayPanel();
		}
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (betSliderOpen) closeBetSlider();
		if (hamburgerOpen) closeHamburgerMenu();
		if (autoPopupOpen) closeAutoplayPanel();
	};

	onMount(() => {
		let mounted = true;
		void ensureFredokaOneFont().then(() => {
			if (mounted) summitFontReady = true;
		});
		const syncViewport = () => {
			viewport = readCanvasSize();
		};
		syncViewport();
		window.addEventListener('resize', syncViewport);
		window.visualViewport?.addEventListener('resize', syncViewport);
		window.visualViewport?.addEventListener('scroll', syncViewport);
		sfxVolume = stateSound.volumeValueSoundEffect;
		musicVolume = stateSound.volumeValueMusic;
		window.addEventListener('pointerdown', handleGlobalPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('resize', syncViewport);
			window.visualViewport?.removeEventListener('resize', syncViewport);
			window.visualViewport?.removeEventListener('scroll', syncViewport);
			window.removeEventListener('pointerdown', handleGlobalPointerDown);
			window.removeEventListener('keydown', onKeyDown);
			mounted = false;
		};
	});

	$effect(() => {
		if (!autoplayDisabledByJurisdiction) return;
		stateBet.autoSpinsCounter = 0;
		autoPopupOpen = false;
	});

	const toolbarShellMenuScale = $derived(layout.uiScale * (layout.displayScale || 1));
	const toolbarShellPopoverGap = $derived(
		(layout.auxInMenu ? 190 : 16) * toolbarShellMenuScale,
	);
	const menuScale = $derived(Math.max(0.85, toolbarShellMenuScale));

	const toolbarMenuPopoverStyle = $derived.by(() => {
		void viewport.width;
		void viewport.height;
		void hamburgerOpen;
		void hamburgerBtnEl;
		void toolbarBarEl;
		if (!hamburgerBtnEl || !toolbarBarEl) return '';
		const shell = hamburgerBtnEl.closest('.game-shell')?.getBoundingClientRect();
		if (!shell) return '';
		const ham = hamburgerBtnEl.getBoundingClientRect();
		const bar = toolbarBarEl.getBoundingClientRect();
		const leftEdge = Math.min(ham.left, bar.left);
		return `left:${leftEdge - shell.left}px;bottom:${shell.bottom - bar.top + toolbarShellPopoverGap}px`;
	});

	const spinning = $derived(!idle);
	const spinButtonDisabled = $derived(
		inFreegame ||
			(idle &&
				!autoPlayArmed &&
				(!isGameplayInputAllowed() || !stateBetDerived.isBetCostAvailable())),
	);
	const speedModeLabel = $derived(`SPEED: ${spinSpeedLabel(speedTier)}`);
	const hudAlpha = $derived(stateBonusOutro.playfieldAlpha);
	const hudOutroHidden = $derived(hudAlpha < 0.05);
</script>

<div
	class="game-shell"
	class:font-ready={summitFontReady}
	class:portrait={layout.portrait}
	class:phone-budget={phonePlayHost}
	class:short-landscape={shortLandscape}
	class:outro-fade={hudOutroHidden}
	style={`--ui-scale:${layout.uiScale}; --scene-scale:${layout.sceneScale}; --display-scale:${layout.displayScale}; --design-w:${layout.designWidth}px; --design-h:${layout.designHeight}px; opacity:${hudAlpha};`}
>
	<div
		class="game-stage"
		style={`width:${layout.designWidth}px; height:${layout.designHeight}px; transform:translate(-50%, -50%) scale(${layout.sceneScale});`}
	>
		<section
			bind:this={toolbarBarEl}
			class="toolbar summit-bar gg-hud"
			class:bonus-mode={inFreegame}
			class:portrait-hud={layout.portrait}
			class:gg-portrait={layout.portrait}
			style={`left:${layout.toolbarLeftX}px; top:${layout.toolbarTopY}px; width:${layout.toolbarWidth}px; height:${layout.toolbarHeight}px; --ui-scale:${layout.uiScale}; --safe-bottom:${layout.bottomInset}px; --spin-d:${layout.spinD}px; --spin-overlap:${Math.round(layout.spinD * 0.58)}px`}
		>
			{#if layout.portrait}
				<div class="portrait-stack">
					<div class="portrait-controls">
						{#if !inFreegame}
							<button
								class="bonus-button"
								class:ante={featureToggleActive}
								aria-label={featureToggleActive ? 'Disable mode' : 'Bonus'}
								onclick={onBonusPress}
								disabled={spinning || autoPlayRunning}
							>
								{#if featureToggleActive}
									<span class="disable-x" aria-hidden="true">×</span>
									<span class="disable-word">DISABLE</span>
								{:else}
									<svg class="buy-mark" viewBox="0 0 48 42" aria-hidden="true">
										<path d="M24 4 L44 38 H4 Z" />
									</svg>
								{/if}
							</button>
						{/if}
						<button
							class:active={speedMode > 0}
							class:turbo-1={speedMode === 1}
							class:turbo-2={speedMode === 2}
							class="sprite turbo"
							onclick={toggleTurbo}
							disabled={turboDisabled}
							aria-label={speedModeLabel}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 L4 14 h6 l-1 8 9-12 h-6 z" /></svg>
						</button>
						{#if !inFreegame}
							<button
								class="bet-step"
								aria-label={betControlDecreaseAria()}
								disabled={!canDecreaseBet}
								onclick={onBetDecreasePress}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 l7 7" /></svg>
							</button>
						{/if}
						{#if !inFreegame}
							<button
								class="sprite spin"
								class:stopping={spinning && !autoPlayRunning}
								class:fs-chip={autoPlayRunning}
								class:auto-remaining={autoPlayRunning}
								onclick={onSpinPress}
								disabled={spinButtonDisabled && !spinning && !autoPlayRunning}
								aria-label={autoPlayRunning
									? 'Stop autoplay after this spin'
									: spinning
										? 'Skip spin'
										: 'Spin'}
							>
								{#if autoPlayRunning}
									<span>{autoSpinsMenuLabel()}</span>
									<strong>{autoSpinsText === '∞' ? '∞' : autoSpinsRemainingDisplay}</strong>
								{:else if spinning}
									<span class="spin-face" aria-hidden="true"><i class="spin-stop"></i></span>
								{:else}
									<svg class="spin-arrows" viewBox="0 0 64 64" aria-hidden="true">
										<path d="M46 18a18 18 0 1 0 4 16" />
										<path d="M46 10 v12 h-12" />
										<path d="M18 46a18 18 0 1 0-4-16" />
										<path d="M18 54 v-12 h12" />
									</svg>
								{/if}
							</button>
						{:else}
							<div class="sprite spin fs-chip" aria-label={`${freeSpinsToolbarLabel()} ${spinsProgress}`}>
								<span>{freeSpinsToolbarLabel()}</span>
								<strong>{spinsProgress}</strong>
							</div>
						{/if}
						{#if !inFreegame}
							<button
								class="bet-step"
								aria-label={betControlIncreaseAria()}
								disabled={!canIncreaseBet}
								onclick={onBetIncreasePress}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 l7 7 -7 7" /></svg>
							</button>
							<button
								bind:this={autoBtnEl}
								class:active={autoPlayRunning || autoPlayArmed}
								class:menu-open={autoPopupOpen}
								class="sprite auto"
								onclick={toggleAutoplay}
								disabled={autoplayDisabledByJurisdiction}
								aria-label={autoPlayRunning || autoPlayArmed ? 'Clear autoplay' : 'Autoplay'}
							>
								{#if autoPlayRunning || autoPlayArmed}
									<strong>{autoChipCount}</strong>
								{:else}
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M19 8a7 7 0 1 0 1.2 6" />
										<path d="M19 4 v5 h-5" />
									</svg>
								{/if}
							</button>
						{/if}
						<button
							bind:this={hamburgerBtnEl}
							class="hamburger"
							aria-label="menu"
							onclick={toggleHamburger}
						>
							{#if hamburgerOpen}
								<span class="ham-x" aria-hidden="true"></span>
							{:else}
								<span></span><span></span><span></span>
							{/if}
						</button>
					</div>
					<div class="portrait-meters">
						<div class="amount balance" style={`--label-size:${toolbarLabelSize}px; --value-size:${balanceFitValueSize}px`}>
							<span>{toolbarLabel('balance')}</span>
							<strong>{balanceValue}</strong>
						</div>
						<div class="amount win-inline" class:on={winPopupOpen}>
							<span>{winChipLabel}</span>
							<strong>{winPopupOpen ? winPopupAmount : '—'}</strong>
						</div>
						<div class="amount bet {betAccentClass}" style={`--label-size:${toolbarLabelSize}px; --value-size:${betFitValueSize}px`}>
							<span>{inFreegame ? toolbarLabel('bet') : activeModeHudLabel}</span>
							<strong>{betValue}</strong>
						</div>
					</div>
				</div>
			{:else}
				{#if !inFreegame}
					<button
						class="bonus-button"
						class:ante={featureToggleActive}
						aria-label={featureToggleActive ? 'Disable mode' : 'Bonus'}
						style={`left:${layout.bonusX}px; top:${layout.bonusY}px; width:${Math.round(layout.bonusD * 1.24)}px; height:${layout.bonusD}px`}
						onclick={onBonusPress}
						disabled={spinning || autoPlayRunning}
					>
						{#if featureToggleActive}
							<span class="disable-x" aria-hidden="true">×</span>
							<span class="disable-word">DISABLE</span>
						{:else}
							<svg class="buy-mark" viewBox="0 0 48 42" aria-hidden="true">
								<path d="M24 4 L44 38 H4 Z" />
							</svg>
						{/if}
					</button>
				{/if}

				<div
					class="slab balance-slab"
					style={`left:${layout.meterX}px; top:${layout.meterY}px; width:${layout.meterW}px; height:${layout.meterH}px`}
				>
					<button
						bind:this={hamburgerBtnEl}
						class="hamburger"
						aria-label="menu"
						onclick={toggleHamburger}
					>
						{#if hamburgerOpen}
							<span class="ham-x" aria-hidden="true"></span>
						{:else}
							<span></span><span></span><span></span>
						{/if}
					</button>
					<div class="amount balance" style={`--label-size:${toolbarLabelSize}px; --value-size:${balanceFitValueSize}px`}>
						<span>{toolbarLabel('balance')}</span>
						<strong>{balanceValue}</strong>
					</div>
					<div
						class="amount win-inline"
						class:on={winPopupOpen}
						style={`--label-size:${Math.round(toolbarLabelSize * 1.05)}px; --value-size:${Math.round(layout.valueSize * 1.15)}px`}
					>
						<span>{winChipLabel}</span>
						<strong>{winPopupOpen ? winPopupAmount : ''}</strong>
					</div>
				</div>

				<div
					class="slab bet-slab"
					style={`left:${layout.betX}px; top:${layout.meterY}px; width:${layout.betW}px; height:${layout.meterH}px`}
				>
					{#if !inFreegame}
						<div class="bet-chevron-stack">
							<button class="bet-chevron up" aria-label={betControlIncreaseAria()} disabled={!canIncreaseBet} onclick={onBetIncreasePress}>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14 l6-7 6 7" /></svg>
							</button>
							<button class="bet-chevron down" aria-label={betControlDecreaseAria()} disabled={!canDecreaseBet} onclick={onBetDecreasePress}>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10 l6 7 6-7" /></svg>
							</button>
						</div>
					{/if}
					<button
						type="button"
						class="bet-copy bet-copy-hit {betAccentClass}"
						aria-label="Select bet amount"
						aria-expanded={betSliderOpen}
						disabled={!canOpenBetSlider || inFreegame}
						onclick={toggleBetSlider}
					>
						<span>{inFreegame ? toolbarLabel('bet') : activeModeHudLabel}</span>
						<strong>{betValue}</strong>
					</button>
					<div class="utility-stack">
						{#if !inFreegame}
							<button
								bind:this={autoBtnEl}
								class:active={autoPlayRunning || autoPlayArmed}
								class:menu-open={autoPopupOpen}
								class="sprite auto"
								onclick={toggleAutoplay}
								disabled={autoplayDisabledByJurisdiction}
								aria-label={autoPlayRunning || autoPlayArmed ? 'Clear autoplay' : 'Autoplay'}
							>
								{#if autoPlayRunning || autoPlayArmed}
									<strong>{autoChipCount}</strong>
								{:else}
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M19 8a7 7 0 1 0 1.2 6" />
										<path d="M19 4 v5 h-5" />
									</svg>
								{/if}
							</button>
						{/if}
						<button
							class:active={speedMode > 0}
							class:turbo-1={speedMode === 1}
							class:turbo-2={speedMode === 2}
							class="sprite turbo"
							onclick={toggleTurbo}
							disabled={turboDisabled}
							aria-label={speedModeLabel}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 L4 14 h6 l-1 8 9-12 h-6 z" /></svg>
						</button>
					</div>
				</div>

				{#if !inFreegame}
					<button
						class="sprite spin"
						class:stopping={spinning && !autoPlayRunning}
						class:fs-chip={autoPlayRunning}
						class:auto-remaining={autoPlayRunning}
						style={`left:${layout.spinX}px; top:${layout.spinY}px; width:${layout.spinD}px; height:${layout.spinD}px`}
						onclick={onSpinPress}
						disabled={spinButtonDisabled && !spinning && !autoPlayRunning}
						aria-label={autoPlayRunning
							? 'Stop autoplay after this spin'
							: spinning
								? 'Skip spin'
								: 'Spin'}
					>
						{#if autoPlayRunning}
							<span>{autoSpinsMenuLabel()}</span>
							<strong>{autoSpinsText === '∞' ? '∞' : autoSpinsRemainingDisplay}</strong>
						{:else if spinning}
							<span class="spin-face" aria-hidden="true"><i class="spin-stop"></i></span>
						{:else}
							<svg class="spin-arrows" viewBox="0 0 64 64" aria-hidden="true">
								<path d="M46 18a18 18 0 1 0 4 16" />
								<path d="M46 10 v12 h-12" />
								<path d="M18 46a18 18 0 1 0-4-16" />
								<path d="M18 54 v-12 h12" />
							</svg>
						{/if}
					</button>
				{:else}
					<div
						class="sprite spin fs-chip"
						style={`left:${layout.spinX}px; top:${layout.spinY}px; width:${layout.spinD}px; height:${layout.spinD}px`}
						aria-label={`${freeSpinsToolbarLabel()} ${spinsProgress}`}
					>
						<span>{freeSpinsToolbarLabel()}</span>
						<strong>{spinsProgress}</strong>
					</div>
				{/if}

				{#if betSliderOpen && !inFreegame}
					<div
						class="bet-grid"
						style={`left:${layout.betX}px; width:${Math.max(layout.betW, 280)}px; bottom:${layout.toolbarHeight - layout.meterY + 10}px`}
						role="dialog"
						aria-label="Select bet"
					>
						{#each sortedBetLadder as amount (amount)}
							<button
								type="button"
								class:selected={amount === stateBet.betAmount}
								onclick={() => pickBetAmount(amount)}
							>
								{formatMoney(amount, 'bet')}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</section>
	</div>

	{#if hamburgerOpen}
		<div
			class="settings-overlay"
			class:anchored={!layout.portrait}
			role="presentation"
			onclick={closeHamburgerMenu}
			onkeydown={(e) => e.key === 'Escape' && closeHamburgerMenu()}
		>
			<div
				class="settings-menu-modal"
				class:anchored={!layout.portrait}
				role="presentation"
				style={layout.portrait ? '' : toolbarMenuPopoverStyle}
				onclick={(e) => e.stopPropagation()}
			>
				<ToolbarSettingsMenu
					scale={Math.max(layout.portrait ? 1 : 0.85, menuScale)}
					nativeRange={phonePlayHost}
					bind:sfxVolume
					bind:musicVolume
					onInfo={openInfo}
					onSfxChange={setVolumeSfx}
					onMusicChange={setVolumeMusic}
					soundSrc={summitSrc('sound.svg')}
					musicSrc={summitSrc('music.svg')}
				/>
			</div>
		</div>
	{/if}

	{#if betSliderOpen && !inFreegame && layout.portrait}
		<div class="settings-overlay" role="presentation" onclick={closeBetSlider}>
			<div class="bet-grid bet-grid-modal" role="dialog" aria-label="Select bet" onclick={(e) => e.stopPropagation()}>
				{#each sortedBetLadder as amount (amount)}
					<button
						type="button"
						class:selected={amount === stateBet.betAmount}
						onclick={() => pickBetAmount(amount)}
					>
						{formatMoney(amount, 'bet')}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if autoPopupOpen && !inFreegame}
		<div class="settings-overlay" role="presentation" onclick={closeAutoplayPanel}>
			<div class="auto-popup auto-popup-modal" role="dialog" aria-label="Autoplay" onclick={(e) => e.stopPropagation()}>
				<div class="auto-popup-title">AUTOPLAY ROUNDS</div>
				<div class="auto-rounds">
					{#each autoSpinOptions as option (option)}
						<button type="button" class:active={autoPick === option} onclick={() => (autoPick = option)}>{option}</button>
					{/each}
				</div>
				<button type="button" class="auto-activate" onclick={activateSelectedAutoplay}>ACTIVATE</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-shell {
		position: absolute;
		inset: 0;
		z-index: 40;
		pointer-events: none;
		overflow: hidden;
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
		font-synthesis: none;
		visibility: hidden;
	}

	.game-shell.font-ready {
		visibility: visible;
	}

	.game-shell.outro-fade :global(*) {
		pointer-events: none !important;
	}

	.yellow-type {
		position: relative;
		isolation: isolate;
		text-shadow: none;
	}

	.yellow-type::before,
	.yellow-type::after {
		content: attr(data-mult);
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		font: inherit;
		letter-spacing: inherit;
		line-height: inherit;
		text-align: inherit;
		white-space: inherit;
		pointer-events: none;
	}

	.yellow-type::before {
		z-index: 2;
		color: transparent;
		-webkit-text-fill-color: transparent;
		-webkit-text-stroke: 1px #ffc02a;
		paint-order: stroke fill;
	}

	.yellow-type::after {
		z-index: 1;
		color: #000;
		-webkit-text-fill-color: #000;
		-webkit-text-stroke: 0;
		mix-blend-mode: overlay;
		opacity: 0.4;
		clip-path: inset(50% 0 0 0);
	}

	.game-shell.portrait {
		overflow: visible;
	}

	.game-stage {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 1;
		transform-origin: center center;
		overflow: visible;
		contain: none;
		pointer-events: none;
	}

	.toolbar {
		position: absolute;
		z-index: 50;
		border: 0;
		background: transparent;
		overflow: visible;
		pointer-events: auto;
	}

	.toolbar-meter {
		position: absolute;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		padding: 0 calc(172px * var(--ui-scale, 1)) 0 calc(32px * var(--ui-scale, 1));
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 12px;
		background-color: rgba(28, 28, 28, 0.9);
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: 8px 8px;
		box-shadow: 0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		font-family: 'Fredoka One', Inter, sans-serif;
		pointer-events: auto;
	}

	.toolbar.bonus-mode .toolbar-meter {
		padding-right: calc(192px * var(--ui-scale, 1));
	}

	.amount {
		position: relative;
		top: auto;
		bottom: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		color: #fff;
		pointer-events: auto;
	}

	.amount span,
	.amount strong {
		paint-order: stroke fill;
	}

	.amount span {
		color: #d2d2d2;
		font-size: var(--label-size, 19px);
		line-height: 1.1;
		letter-spacing: 0.04em;
		opacity: 0.88;
	}

	.amount strong {
		font-size: var(--value-size, 35px);
		font-weight: 400;
		line-height: 1;
	}

	.amount.bet {
		position: relative;
		padding-right: calc(48px * var(--ui-scale, 1));
	}

	.amount.bet.ante strong,
	.amount.bet.ante span {
		color: #ffc933;
	}

	.amount.bet.feature strong,
	.amount.bet.feature span {
		color: #50be50;
	}

	.amount.bet.peak strong,
	.amount.bet.peak span {
		color: #ffd54f;
	}

	.bet-copy,
	.bet-copy-hit {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0;
		margin: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: left;
	}

	.bet-copy-hit:disabled {
		cursor: default;
	}

	.bet-chevron-stack {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: calc(4px * var(--ui-scale, 1));
	}

	.bet-chevron {
		display: grid;
		place-items: center;
		width: calc(28px * var(--ui-scale, 1));
		height: calc(18px * var(--ui-scale, 1));
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	.bet-chevron:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.bet-chevron img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform 140ms ease, filter 140ms ease;
	}

	.bet-slider {
		position: absolute;
		z-index: 20;
		height: calc(36px * var(--ui-scale, 1));
		padding: calc(8px * var(--ui-scale, 1));
		border: calc(2px * var(--ui-scale, 1)) solid #fff;
		border-radius: 999px;
		background: rgba(28, 28, 28, 0.92);
		pointer-events: auto;
	}

	.bet-slider-hit {
		position: relative;
		height: 100%;
		cursor: pointer;
		touch-action: none;
	}

	.bet-slider-track {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: calc(8px * var(--ui-scale, 1));
		transform: translateY(-50%);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.bet-slider-fill {
		height: 100%;
		background: #fff;
	}

	.bet-slider-thumb {
		position: absolute;
		top: 50%;
		width: calc(18px * var(--ui-scale, 1));
		height: calc(18px * var(--ui-scale, 1));
		border: 3px solid #000;
		border-radius: 50%;
		background: #fff;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.win-popup {
		position: absolute;
		z-index: 55;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: nowrap;
		white-space: nowrap;
		gap: 0.45em;
		box-sizing: border-box;
		overflow: hidden;
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 5px;
		background-color: rgba(28, 28, 28, 0.78);
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: 8px 8px;
		box-shadow: none;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: var(--label-size, 19px);
		line-height: 1;
		visibility: hidden;
		opacity: 0;
		transform: translate3d(-50%, calc(100% + 12px), 0);
		pointer-events: none;
		transition:
			transform 240ms cubic-bezier(0.22, 0.82, 0.16, 1),
			opacity 240ms cubic-bezier(0.22, 0.82, 0.16, 1),
			visibility 0s 240ms;
	}

	.win-popup.show {
		visibility: visible;
		opacity: 1;
		transform: translate3d(-50%, 0, 0);
		transition:
			transform 240ms cubic-bezier(0.22, 0.82, 0.16, 1),
			opacity 240ms cubic-bezier(0.22, 0.82, 0.16, 1),
			visibility 0s;
	}

	.win-popup span,
	.win-popup strong {
		position: static;
		width: auto;
		flex: 0 0 auto;
		transform: none;
		overflow: visible;
		white-space: nowrap;
		font-weight: 400;
		letter-spacing: 0;
		color: #fff;
	}

	.win-popup span {
		color: #d2d2d2;
		opacity: 1;
	}

	.win-popup strong {
		font-size: var(--value-size, 19px);
	}

	.bonus-button,
	.hamburger,
	.sprite {
		border: 0;
		color: #fff;
		cursor: pointer;
	}

	.bonus-button {
		--bonus-stroke: #fff;
		position: absolute;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 0;
		overflow: hidden;
		isolation: isolate;
		box-sizing: border-box;
		border: calc(4px * var(--ui-scale, 1)) solid var(--bonus-stroke);
		border-radius: calc(22.29px * 119 / 112 * var(--ui-scale, 1));
		background: #fff;
		pointer-events: auto;
		box-shadow: inset 0 0 0 calc(4px * var(--ui-scale, 1)) #000;
		filter: drop-shadow(0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
	}

	.bonus-button.ante {
		--bonus-stroke: #ffc933;
	}

	.bonus-button > .bonus-art {
		display: block;
		width: 84%;
		height: auto;
		place-self: center;
		overflow: visible;
		grid-area: 1 / 1;
		pointer-events: none;
	}

	.bonus-button > .bonus-x {
		width: 52%;
	}

	.bonus-button .bonus-art path,
	.bonus-button .bonus-art rect {
		fill: #000;
	}

	.bonus-button.ante .bonus-art path,
	.bonus-button.ante .bonus-art rect {
		fill: #ffc933;
	}

	.bonus-button.ante .bonus-x rect {
		fill: #000;
	}

	.bonus-button .bonus-idle {
		opacity: 1;
	}

	.bonus-button .bonus-x {
		opacity: 0;
	}

	.bonus-button.ante .bonus-idle {
		opacity: 0;
	}

	.bonus-button.ante .bonus-x {
		opacity: 1;
	}

	.sprite {
		position: absolute;
		z-index: 5;
		display: grid;
		place-items: center;
		padding: 0;
		border-radius: 0;
		background: transparent;
	}

	.sprite img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.sprite.auto,
	.sprite.turbo {
		box-sizing: border-box;
		overflow: visible;
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 12px;
		background-color: rgba(28, 28, 28, 0.9);
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: 8px 8px;
		box-shadow: 0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55);
	}

	.sprite.turbo.turbo-1,
	.sprite.turbo.turbo-2 {
		background-image:
			linear-gradient(rgba(255, 166, 0, 0.28), rgba(255, 166, 0, 0.08)),
			radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: auto, 8px 8px;
	}

	.sprite.turbo.turbo-2 {
		background-image:
			linear-gradient(rgba(255, 166, 0, 0.42), rgba(255, 166, 0, 0.16)),
			radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
	}

	.sprite.auto.menu-open {
		opacity: 0.75;
	}

	.sprite.auto.fs-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(2px * var(--ui-scale, 1));
		overflow: hidden;
		background-color: #1c1c1c;
		background-image: none;
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		pointer-events: auto;
	}

	.sprite.auto.fs-chip span {
		color: #d2d2d2;
		font-size: calc(11px * var(--ui-scale, 1));
		line-height: 1;
	}

	.sprite.auto.fs-chip strong {
		font-size: calc(var(--auto-count-size, 26px) * var(--ui-scale, 1));
		line-height: 0.9;
		font-weight: 400;
	}

	.sprite.spin {
		transition: transform 160ms ease, opacity 120ms ease, filter 120ms ease;
	}

	.hamburger,
	.bonus-button,
	.bet-copy-hit,
	.bet-chevron,
	.sprite.auto,
	.sprite.turbo {
		transition: transform 140ms ease, filter 140ms ease, opacity 140ms ease;
	}

	.sprite.spin:not(.fs-chip) {
		overflow: hidden;
		box-sizing: border-box;
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 25px;
		background: #1c1c1c;
		filter: drop-shadow(0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
	}

	button.sprite.spin.fs-chip.auto-remaining {
		pointer-events: auto;
		cursor: pointer;
	}

	.spin-face {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
	}

	.spin-stop {
		display: block;
		width: 28%;
		height: 28%;
		border: 3px solid #000;
		border-radius: 13px;
		background: #fff;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
	}

	.sprite.spin.fs-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(3px * var(--ui-scale, 1));
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 25px;
		background: #1c1c1c;
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		pointer-events: none;
	}

	.sprite.spin.fs-chip span {
		color: #d2d2d2;
		font-size: calc(19px * var(--ui-scale, 1));
		line-height: 1;
	}

	.sprite.spin.fs-chip strong {
		font-size: calc(36px * var(--ui-scale, 1));
		line-height: 0.9;
		font-weight: 400;
	}

	.hamburger {
		position: absolute;
		z-index: 6;
		display: grid;
		grid-template-columns: minmax(calc(55px * var(--ui-scale, 1)), 1fr);
		grid-auto-rows: minmax(calc(8px * var(--ui-scale, 1)), auto);
		align-content: center;
		align-items: center;
		justify-items: center;
		gap: calc(12px * var(--ui-scale, 1));
		padding: calc(2px * var(--ui-scale, 1)) 0;
		box-sizing: border-box;
		appearance: none;
		background: transparent;
		border: 0;
		overflow: visible;
	}

	.hamburger span {
		display: block;
		width: 100%;
		min-width: calc(55px * var(--ui-scale, 1));
		height: calc(8px * var(--ui-scale, 1));
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 calc(3px * var(--ui-scale, 1)) #000;
		filter: drop-shadow(0 calc(3px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
	}

	.hamburger-x {
		grid-area: 1 / 1;
		display: block;
		width: calc(61px * var(--ui-scale, 1));
		height: calc(61px * var(--ui-scale, 1));
		filter: drop-shadow(0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
		overflow: visible;
		pointer-events: none;
	}

	.toolbar-menu-anchor,
	.toolbar-shell-popover {
		position: absolute;
		z-index: 60;
		pointer-events: auto;
	}

	.toolbar-shell-popover.toolbar-menu-anchor {
		transform: none;
	}

	.auto-popup {
		position: absolute;
		z-index: 14;
		display: grid;
		grid-template-columns: repeat(4, calc(61.5px * var(--menu-scale, 1)));
		gap: calc(8px * var(--menu-scale, 1));
		box-sizing: content-box;
		width: calc(270px * var(--menu-scale, 1));
		min-height: calc(128px * var(--menu-scale, 1));
		padding: calc(8px * var(--menu-scale, 1));
		padding-bottom: calc(12px * var(--menu-scale, 1));
		border: calc(3px * var(--menu-scale, 1)) solid #fff;
		border-radius: 12px;
		background-color: rgba(28, 28, 28, 0.78);
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: 8px 8px;
		box-shadow: 0 calc(4px * var(--menu-scale, 1)) 0 rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: #fff;
		font-family: 'Fredoka One', Inter, sans-serif;
		transform: none;
		pointer-events: auto;
	}

	.auto-popup-title,
	.auto-popup-subtitle {
		grid-column: 1 / -1;
		color: #fff;
		font-family: 'Fredoka One', sans-serif;
		font-weight: 400;
		letter-spacing: 0.02em;
		line-height: 1;
		text-align: left;
	}

	.auto-popup-title {
		font-size: calc(19px * var(--menu-scale, 1));
	}

	.auto-popup-subtitle {
		margin-top: calc(-2px * var(--menu-scale, 1));
		font-size: calc(12px * var(--menu-scale, 1));
		color: #d2d2d2;
	}

	.auto-popup button {
		min-height: calc(36px * var(--menu-scale, 1));
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		font-family: inherit;
		font-weight: 400;
		letter-spacing: 0.04em;
		cursor: pointer;
	}

	.auto-popup button {
		transition: transform 140ms ease, background-color 140ms ease;
	}

	.auto-popup button:hover,
	.auto-popup button.active {
		background: rgba(255, 255, 255, 0.18);
	}

	.auto-popup-modal {
		position: relative;
		left: auto;
		right: auto;
		bottom: auto;
		width: min(calc(270px * var(--menu-scale, 1)), calc(100vw - 48px));
		grid-template-columns: repeat(2, minmax(72px, 1fr));
	}

	.settings-overlay {
		position: absolute;
		inset: 0;
		z-index: 13000;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.45);
		pointer-events: auto;
		border: 0;
		padding: 16px;
	}

	.settings-menu-modal,
	.auto-popup-modal {
		position: relative;
		z-index: 2;
		pointer-events: auto;
		max-width: calc(100vw - 32px);
		box-sizing: border-box;
	}

	.settings-menu-modal :global(.toolbar-settings-menu) {
		max-width: 100%;
		box-sizing: border-box;
	}

	.game-shell.portrait .toolbar {
		border: 0;
		border-radius: 0;
		background: transparent;
		overflow: visible;
		left: 0;
		width: 100%;
	}

	.game-shell.portrait .toolbar.portrait-hud .toolbar-meter {
		display: flex;
		justify-content: space-between;
		left: -40px !important;
		width: calc(100% + 80px) !important;
		bottom: -80px !important;
		height: auto !important;
		padding: 0 calc(18px * var(--ui-scale, 1) + 40px) calc(var(--safe-bottom, 0px) + 80px)
			calc(var(--ham-slot, calc(48px * var(--ui-scale, 1))) + 40px);
		border: 0;
		border-top: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: 0 !important;
		box-shadow: inset 0 calc(4px * var(--ui-scale, 1)) 8px rgba(0, 0, 0, 0.4);
		background-color: #1c1c1c;
		background-size: calc(8px * var(--ui-scale, 1)) calc(8px * var(--ui-scale, 1));
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		align-items: flex-end;
	}

	.game-shell.portrait .toolbar.portrait-hud .amount {
		position: relative;
		left: auto;
		width: auto;
		top: auto;
		bottom: auto;
		justify-content: flex-end;
	}

	.game-shell.portrait .toolbar.portrait-hud.bonus-mode .toolbar-meter {
		padding-right: calc(18px * var(--ui-scale, 1) + 40px);
	}

	.game-shell.portrait .amount.bet:not(.center) span,
	.game-shell.portrait .amount.bet:not(.center) strong {
		text-align: center;
	}

	.game-shell.portrait .bet-amount-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.95em;
		pointer-events: auto;
	}

	.game-shell.portrait .bet-amount-row .bet-chevron {
		font-size: var(--value-size, 1em);
		width: 1.15em;
		height: 0.88em;
	}

	.game-shell.portrait .bet-amount-row .bet-chevron img {
		width: 1.08em;
	}

	.game-shell.portrait .hamburger {
		grid-template-columns: minmax(0, 1fr);
		grid-auto-rows: minmax(0, auto);
		align-content: end;
		align-items: end;
		gap: calc(10px * var(--ui-scale, 1));
		padding: 0;
	}

	.game-shell.portrait .hamburger span {
		width: 100%;
		min-width: 0;
		height: calc(8px * var(--ui-scale, 1));
		border-radius: 999px;
		box-shadow: 0 0 0 calc(2.5px * var(--ui-scale, 1)) #000;
	}

	.game-shell.portrait .hamburger-x {
		width: 90%;
		height: 90%;
	}

	.game-shell.portrait .sprite.auto,
	.game-shell.portrait .sprite.turbo {
		border-radius: calc(12px * var(--ui-scale, 1));
	}

	.game-shell.portrait .sprite.spin:not(.fs-chip),
	.game-shell.portrait .sprite.spin.fs-chip {
		border-radius: calc(25px * var(--ui-scale, 1));
	}

	.game-shell.portrait .sprite.spin.fs-chip span {
		font-size: 31px;
	}

	.game-shell.portrait .sprite.spin.fs-chip strong {
		font-size: 44px;
	}

	.game-shell.portrait .win-popup {
		z-index: 55;
		box-sizing: border-box;
		border: calc(3px * var(--ui-scale, 1)) solid #fff;
		border-radius: calc(12px * var(--ui-scale, 1));
		background-color: #1c1c1c;
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1.2px);
		background-size: calc(8px * var(--ui-scale, 1)) calc(8px * var(--ui-scale, 1));
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		padding: 0 0.45em;
		gap: 0.35em;
		flex-wrap: nowrap;
		white-space: nowrap;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: var(--value-size, var(--label-size, 19px));
	}

	.game-shell.portrait .win-popup span,
	.game-shell.portrait .win-popup strong {
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
		font-size: var(--value-size, 1em);
		color: #fff;
		opacity: 1;
		flex: 0 0 auto;
		white-space: nowrap;
	}

	.game-shell.phone-budget.portrait .toolbar-meter .amount span,
	.game-shell.phone-budget.portrait .toolbar-meter .amount strong:not(.yellow-type) {
		opacity: 1;
	}

	.game-shell.phone-budget :global(.toolbar-settings-menu) {
		background-color: rgba(28, 28, 28, 0.96);
	}

	.game-shell.phone-budget .toolbar-meter,
	.game-shell.phone-budget .bonus-button,
	.game-shell.phone-budget .bet-slider {
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}

	.gg-hud {
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 700;
		color: #fff;
	}

	.gg-hud .slab {
		position: absolute;
		display: flex;
		align-items: center;
		box-sizing: border-box;
		background: linear-gradient(180deg, #1c1c1c 0%, #141414 100%);
		border: 2px solid #3c3c3c;
		border-radius: 18px;
		box-shadow: 0 10px 18px rgba(0, 0, 0, 0.45);
		overflow: hidden;
		z-index: 3;
	}

	.gg-hud .balance-slab {
		padding: 0 18px 0 12px;
		gap: 12px;
	}

	.gg-hud .bet-slab {
		padding: 0 var(--spin-overlap) 0 8px;
		gap: 4px;
		z-index: 4;
	}

	.gg-hud .bonus-button {
		position: absolute;
		z-index: 6;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 0;
		background: #141414;
		color: #fff;
		border: 2px solid #ffd500;
		border-radius: 16px;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);
		transform: skewX(-14deg);
		overflow: hidden;
		filter: none;
	}

	.gg-hud .bonus-button > * {
		transform: skewX(14deg);
	}

	.gg-hud .buy-mark {
		width: 42%;
		height: auto;
	}

	.gg-hud .buy-mark path {
		fill: none;
		stroke: #ffd500;
		stroke-width: 3.5;
		stroke-linejoin: round;
	}

	.gg-hud .disable-x {
		font-size: calc(28px * var(--ui-scale, 1));
		line-height: 0.85;
		font-weight: 700;
	}

	.gg-hud .disable-word {
		font-size: calc(11px * var(--ui-scale, 1));
		letter-spacing: 0.08em;
		font-weight: 800;
	}

	.gg-hud .balance-slab .hamburger,
	.gg-portrait .hamburger {
		position: relative;
		left: auto;
		top: auto;
		width: 36px;
		height: 28px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		background: transparent;
		border: 0;
		padding: 0;
	}

	.gg-hud .hamburger span {
		display: block;
		width: 22px;
		height: 3px;
		background: #fff;
		border-radius: 2px;
		box-shadow: none;
	}

	.gg-hud .ham-x {
		position: relative;
		width: 22px;
		height: 22px;
		background: transparent !important;
	}

	.gg-hud .ham-x::before,
	.gg-hud .ham-x::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 10px;
		height: 3px;
		background: #fff;
		border-radius: 2px;
	}

	.gg-hud .ham-x::before {
		transform: rotate(45deg);
	}

	.gg-hud .ham-x::after {
		transform: rotate(-45deg);
	}

	.gg-hud .amount {
		align-items: flex-start;
	}

	.gg-hud .amount span {
		color: #b8b8b8;
		font-size: var(--label-size, 14px);
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 1;
	}

	.gg-hud .amount strong {
		color: #fff;
		font-size: var(--value-size, 26px);
		font-weight: 800;
		letter-spacing: 0;
	}

	.gg-hud .win-inline {
		margin-left: auto;
		min-width: 30%;
		text-align: right;
		align-items: flex-end;
		opacity: 0;
		transform: translateY(8px) scale(0.96);
		transition: opacity 180ms ease, transform 180ms ease;
	}

	.gg-hud .win-inline.on {
		opacity: 1;
		transform: none;
	}

	.gg-hud .win-inline span,
	.gg-hud .win-inline strong {
		color: #ffd500;
	}

	.gg-hud .bet-copy,
	.gg-hud .bet-copy-hit {
		flex: 1;
		align-items: center;
		text-align: center;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
	}

	.gg-hud .mode-on span,
	.gg-hud .mode-on strong {
		color: #ffd500;
	}

	.gg-hud .bet-chevron-stack {
		position: relative;
		right: auto;
		top: auto;
		transform: none;
		gap: 2px;
	}

	.gg-hud .bet-chevron,
	.gg-hud .bet-step {
		width: 32px;
		height: 24px;
		background: transparent;
		border: 0;
		color: #fff;
		cursor: pointer;
	}

	.gg-hud .bet-chevron svg,
	.gg-hud .bet-step svg,
	.gg-hud .sprite.auto svg,
	.gg-hud .sprite.turbo svg {
		width: 20px;
		height: 20px;
	}

	.gg-hud .bet-chevron svg path,
	.gg-hud .bet-step svg path,
	.gg-hud .sprite.auto svg path {
		fill: none;
		stroke: #e8e8e8;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.gg-hud .sprite.turbo svg path {
		fill: #e8e8e8;
		stroke: none;
	}

	.gg-hud .sprite.turbo.active svg path,
	.gg-hud .sprite.turbo.turbo-1 svg path,
	.gg-hud .sprite.turbo.turbo-2 svg path {
		fill: #ffd500;
	}

	.gg-hud .utility-stack {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-left: auto;
	}

	.gg-hud .utility-stack .sprite,
	.gg-hud .bet-slab .sprite.auto,
	.gg-hud .bet-slab .sprite.turbo {
		position: relative;
		left: auto;
		top: auto;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		box-shadow: none;
	}

	.gg-hud .sprite.spin {
		z-index: 8;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.88);
		background: radial-gradient(circle at 40% 32%, #2c2c2c, #0c0c0c 68%);
		box-shadow: 0 10px 18px rgba(0, 0, 0, 0.55);
		filter: none;
	}

	.gg-hud .spin-arrows {
		width: 58%;
		height: 58%;
	}

	.gg-hud .spin-arrows path {
		fill: none;
		stroke: #fff;
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.gg-hud .spin-stop {
		width: 26%;
		height: 26%;
		border: 0;
		border-radius: 4px;
		background: #fff;
		box-shadow: none;
	}

	.gg-hud .sprite.spin.fs-chip {
		border-radius: 50%;
		background: radial-gradient(circle at 40% 32%, #2c2c2c, #0c0c0c 68%);
		font-family: Fredoka, Inter, sans-serif;
	}

	.gg-portrait .portrait-stack {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		height: 100%;
		padding-bottom: var(--safe-bottom, 12px);
		box-sizing: border-box;
	}

	.gg-portrait .portrait-controls {
		display: grid;
		grid-template-columns: 1.05fr 0.92fr 0.78fr 1.28fr 0.78fr 0.92fr 0.92fr;
		gap: 10px;
		align-items: center;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		padding: 8px 18px 0;
		height: auto;
	}

	.gg-portrait .portrait-controls > .sprite,
	.gg-portrait .portrait-controls > .bonus-button,
	.gg-portrait .portrait-controls > .hamburger,
	.gg-portrait .portrait-controls > .bet-step {
		position: relative;
		left: auto !important;
		top: auto !important;
		width: 100% !important;
		height: auto !important;
		aspect-ratio: 1;
		min-width: 0;
		max-height: 200px;
		box-sizing: border-box;
	}

	.gg-portrait .bet-step {
		display: grid;
		place-items: center;
		background: #1a1a1a;
		border: 2px solid #6a6a6a;
		border-radius: 16px;
	}

	.gg-portrait .bet-step svg {
		width: 62%;
		height: 62%;
	}

	.gg-portrait .bet-step svg path {
		stroke: #ffffff;
		stroke-width: 3.4;
	}

	.gg-portrait .hamburger {
		display: grid;
		place-items: center;
		background: #1a1a1a;
		border: 2px solid #6a6a6a;
		border-radius: 16px;
	}

	.gg-portrait .sprite.turbo,
	.gg-portrait .sprite.auto {
		background: #1a1a1a;
		border: 2px solid #3a3a3a;
		border-radius: 16px;
	}

	.gg-portrait .portrait-meters {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		align-items: end;
		width: 100%;
		box-sizing: border-box;
		padding: 10px 18px 6px;
	}

	.gg-portrait .portrait-meters .amount {
		align-items: center;
		text-align: center;
	}

	.gg-portrait .portrait-meters .amount span {
		font-size: 26px;
		color: #b8b8b8;
		letter-spacing: 0.12em;
	}

	.gg-portrait .portrait-meters .amount strong {
		font-size: 44px;
		color: #ffffff;
	}

	.gg-portrait .portrait-meters .win-inline span,
	.gg-portrait .portrait-meters .win-inline strong {
		color: #ffd500;
	}

	.gg-portrait .portrait-meters .win-inline {
		margin: 0;
		opacity: 0.28;
		transform: none;
		align-items: center;
		text-align: center;
	}

	.gg-portrait .portrait-meters .win-inline.on {
		opacity: 1;
	}

	.bet-grid {
		position: absolute;
		z-index: 40;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		padding: 12px;
		box-sizing: border-box;
		background: #141414;
		border: 2px solid #3a3a3a;
		border-radius: 16px;
		pointer-events: auto;
		animation: gg-pop 180ms ease;
	}

	.bet-grid button {
		min-height: 46px;
		border-radius: 10px;
		border: 2px solid transparent;
		background: #1e1e1e;
		color: #fff;
		font-family: Fredoka, Inter, sans-serif;
		font-weight: 800;
		font-size: 16px;
		cursor: pointer;
	}

	.bet-grid button.selected {
		border-color: #ffd500;
		color: #ffd500;
	}

	.bet-grid-modal {
		position: relative;
		width: min(440px, 92vw);
	}

	.settings-overlay.anchored {
		display: block;
		background: transparent;
		pointer-events: none;
	}

	.settings-menu-modal.anchored {
		position: absolute;
		pointer-events: auto;
	}

	.auto-popup-modal {
		width: min(520px, 94vw);
		padding: 22px 18px 16px;
		background: #141414;
		border: 2px solid #3a3a3a;
		border-radius: 18px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
		animation: gg-pop 200ms ease;
		font-family: Fredoka, Inter, sans-serif;
	}

	.auto-rounds {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin: 14px 0 12px;
	}

	.auto-rounds button {
		min-height: 48px;
		border-radius: 10px;
		border: 2px solid #2c2c2c;
		background: #1a1a1a;
		color: #fff;
		font-family: inherit;
		font-weight: 800;
		font-size: 18px;
		cursor: pointer;
	}

	.auto-rounds button.active {
		border-color: #ffd500;
		color: #ffd500;
	}

	.auto-activate {
		width: 100%;
		min-height: 50px;
		border: 0;
		border-radius: 12px;
		background: #fff;
		color: #111;
		font-family: inherit;
		font-weight: 800;
		letter-spacing: 0.12em;
		cursor: pointer;
	}

	@keyframes gg-pop {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.sprite.spin:active:not(:disabled) {
		transform: none;
	}

	.sprite.spin:active:not(:disabled):not(.stopping) img {
		transform: rotate(12deg);
	}

	@media (hover: hover) and (pointer: fine) {
		.sprite.spin:hover:not(:disabled):not(:active):not(.stopping) {
			transform: scale(1.06);
			filter: brightness(1.1) drop-shadow(0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
		}

		.sprite.spin:hover:not(:disabled):not(:active):not(.stopping) img {
			transform: rotate(-12deg);
		}

		.toolbar .hamburger:hover:not(:disabled) {
			transform: scale(1.08);
			filter: brightness(1.12);
		}

		.toolbar .bonus-button:hover:not(:disabled) {
			transform: scale(1.08);
			filter: brightness(1.12) drop-shadow(0 calc(4px * var(--ui-scale, 1)) 0 rgba(0, 0, 0, 0.55));
		}

		.toolbar button.bet-copy-hit:hover:not(:disabled) {
			filter: brightness(1.2);
		}

		.toolbar .bet-chevron:hover:not(:disabled) img {
			transform: scale(1.22);
			filter: brightness(1.2);
		}

		.toolbar .sprite.auto:hover:not(:disabled):not(.menu-open),
		.toolbar .sprite.turbo:hover:not(:disabled) {
			transform: scale(1.08);
			filter: brightness(1.12);
		}

		.auto-popup button:hover:not(:disabled) {
			transform: scale(1.06);
			background: rgba(255, 255, 255, 0.26);
		}
	}
</style>
