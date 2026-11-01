<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import {
		AUTO_SPINS_TEXT_OPTION_MAP,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateSound,
		stateUi,
	} from 'state-shared';
	import { bookEventAmountToNormalisedAmount } from 'utils-shared/amount';
	import { getContext } from '../../game/context';
	import { assetUrl } from '../../game/assetUrl';
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
		autoSpinsActiveMenuLabel,
		autoSpinsMenuLabel,
		autoplayPopupTitle,
		betControlDecreaseAria,
		betControlIncreaseAria,
		buyBonusLabel,
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
	import { syncFootballBgmVolume } from '../../game/footballBgm';
	import { syncFootballSfxVolume } from '../../game/footballSoundPlayer';
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

	const summitSrc = (name: string) => assetUrl(`/assets/monkey/ui/summit/${name}`);

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
	const winChipLeft = $derived(
		layout.portrait
			? layout.toolbarLeftX + layout.winX + layout.winW / 2
			: layout.designWidth / 2,
	);
	const winChipTop = $derived(Math.round(layout.toolbarTopY + layout.winY));
	const toolbarLabelSize = $derived(layout.labelSize);
	const balanceFitValueSize = $derived(
		roundFitFontSize(fitValueFontSize(balanceValue, layout.balanceW, layout.valueSize)),
	);
	const betFitValueSize = $derived(
		roundFitFontSize(fitValueFontSize(betValue, layout.betW, layout.valueSize)),
	);
	const winChipLabel = $derived(inFreegame ? toolbarLabel('totalWin') : toolbarLabel('win'));
	const winChipLabelSize = $derived(
		Math.max(12, Math.round(toolbarLabelSize * (layout.portrait ? 1.28 : 0.92 * layout.winPopupScale))),
	);
	const winPopupChipW = $derived(layout.winW);
	const winPopupChipValueSize = $derived.by(() => {
		const base = Math.round(layout.valueSize * (layout.portrait ? 1 : layout.winPopupScale));
		const gap = Math.round(0.45 * winChipLabelSize);
		const labelW = Math.ceil(winChipLabel.length * winChipLabelSize * 0.65);
		const pad = Math.round(16 * layout.uiScale);
		const lane = Math.max(48, layout.winW - labelW - gap - pad);
		return roundFitFontSize(fitValueFontSize(winPopupAmount, lane, base));
	});
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
	const autoChipLabel = $derived(isSocialMode() ? 'PLAYS' : 'AUTO');
	const autoChipCountSize = $derived.by(() => {
		const t = autoChipCount;
		if (t === '∞') return 28;
		if (t.length >= 4) return 16;
		if (t.length === 3) return 20;
		return 26;
	});

	const speedTier = $derived(getSpinSpeedDisplayTier());
	const speedMode = $derived(speedTier === 'superTurbo' ? 2 : speedTier === 'turbo' ? 1 : 0);

	const toolbarTurboSrc = $derived(
		inFreegame && !layout.portrait
			? speedMode === 2
				? summitSrc('turbo-on2.svg')
				: speedMode === 1
					? summitSrc('turbo-on1.svg')
					: summitSrc('bonus-turbo.svg')
			: speedMode === 2
				? summitSrc('base-turbo-on2.svg')
				: speedMode === 1
					? summitSrc('base-turbo-on1.svg')
					: summitSrc('base-turbo.svg'),
	);

	const betAccentClass = $derived(
		peakSpinActive ? 'peak' : featureSpinActive ? 'feature' : anteActive ? 'ante' : '',
	);

	const biggestBet = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const sortedBetLadder = $derived([...stateConfig.betAmountOptions]);
	const betSliderIndex = $derived(
		Math.max(0, sortedBetLadder.findIndex((v) => v === stateBet.betAmount)),
	);
	const betSliderPct = $derived(
		sortedBetLadder.length < 2 ? 0 : (betSliderIndex / (sortedBetLadder.length - 1)) * 100,
	);

	const canIncreaseBet = $derived(
		idle && stateBet.betAmount !== biggestBet && !isToolbarBetUpBlockedByAffordability(),
	);
	const canDecreaseBet = $derived(idle && stateBet.betAmount !== smallestBet);
	const canOpenBetSlider = $derived(idle && !inFreegame && !props.replayMode);

	let hamburgerOpen = $state(false);
	let autoPopupOpen = $state(false);
	let betSliderOpen = $state(false);
	let betSliderDragging = $state(false);
	let betSliderTrackEl = $state<HTMLDivElement | undefined>(undefined);
	let toolbarBarEl = $state<HTMLElement | undefined>(undefined);
	let hamburgerBtnEl = $state<HTMLButtonElement | undefined>(undefined);
	let autoBtnEl = $state<HTMLButtonElement | undefined>(undefined);
	let sfxVolume = $state(stateSound.volumeValueSoundEffect);
	let musicVolume = $state(stateSound.volumeValueMusic);

	const autoSpinOptions = ['∞', '10', '25', '50', '75', '100', '500', '1000'] as const;

	const playUi = (type: 'soundPressGeneral' | 'soundPressBet' = 'soundPressGeneral') => {
		context.eventEmitter.broadcast({ type });
	};

	const closeHamburgerMenu = () => {
		hamburgerOpen = false;
	};

	const closeBetSlider = () => {
		betSliderOpen = false;
		betSliderDragging = false;
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

	const applyBetFromLadderIndex = (index: number) => {
		const ladder = sortedBetLadder;
		if (!ladder.length) return;
		const next = ladder[Math.max(0, Math.min(ladder.length - 1, index))];
		if (next === stateBet.betAmount) return;
		stateBetDerived.setBetAmount(next);
	};

	const betIndexFromClientX = (clientX: number) => {
		const ladder = sortedBetLadder;
		if (!betSliderTrackEl || ladder.length < 2) return 0;
		const rect = betSliderTrackEl.getBoundingClientRect();
		if (rect.width <= 0) return 0;
		const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return Math.round(t * (ladder.length - 1));
	};

	const onBetSliderPointerDown = (event: PointerEvent) => {
		if (!canOpenBetSlider) return;
		event.stopPropagation();
		betSliderDragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		applyBetFromLadderIndex(betIndexFromClientX(event.clientX));
	};

	const onBetSliderPointerMove = (event: PointerEvent) => {
		if (!betSliderDragging) return;
		event.stopPropagation();
		applyBetFromLadderIndex(betIndexFromClientX(event.clientX));
	};

	const onBetSliderPointerUp = (event: PointerEvent) => {
		if (!betSliderDragging) return;
		event.stopPropagation();
		betSliderDragging = false;
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
		const count = AUTO_SPINS_TEXT_OPTION_MAP[option as keyof typeof AUTO_SPINS_TEXT_OPTION_MAP];
		if (count === undefined) return;
		playUi();
		stateUi.autoSpinsText = option as never;
		stateBet.autoSpinsCounter = count;
		if (stateBetDerived.activeBetMode().type === 'buy') {
			stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
		}
		if (layout.auxInMenu) autoPopupOpen = false;
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
		syncFootballSfxVolume();
	};

	const setVolumeMusic = (value: number) => {
		stateSound.volumeValueMusic = value;
		syncFootballBgmVolume();
	};

	const handleGlobalPointerDown = (event: PointerEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		if (betSliderOpen && !target.closest('.bet-slider, .bet-copy-hit, .bet-chevron, .amount.bet')) {
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
	const toolbarAutoPopoverStyle = $derived.by(() => {
		void viewport.width;
		void viewport.height;
		void autoPopupOpen;
		void autoBtnEl;
		void toolbarBarEl;
		if (!toolbarBarEl) return `--menu-scale:${toolbarShellMenuScale}`;
		const shell = toolbarBarEl.closest('.game-shell')?.getBoundingClientRect();
		if (!shell) return `--menu-scale:${toolbarShellMenuScale}`;
		const bar = toolbarBarEl.getBoundingClientRect();
		const bottom = `bottom:${shell.bottom - bar.top + toolbarShellPopoverGap}px;--menu-scale:${toolbarShellMenuScale}`;
		if (layout.auxInMenu && autoBtnEl) {
			const auto = autoBtnEl.getBoundingClientRect();
			return `left:${auto.left + auto.width / 2 - shell.left}px;${bottom}`;
		}
		return `right:${shell.right - bar.right}px;${bottom}`;
	});

	const betSliderLeft = $derived(layout.betX);
	const betSliderW = $derived(Math.max(layout.betW, 180 * layout.uiScale));
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
			class="toolbar summit-bar"
			class:bonus-mode={inFreegame}
			class:portrait-hud={layout.portrait}
			style={`left:${layout.toolbarLeftX}px; top:${layout.toolbarTopY}px; width:${layout.toolbarWidth}px; height:${layout.toolbarHeight}px; --ui-scale:${layout.uiScale}; --safe-bottom:${layout.bottomInset}px; --ham-slot:${layout.menuX + layout.menuW + Math.round(12 * layout.uiScale)}px`}
		>
			<button
				bind:this={hamburgerBtnEl}
				class="hamburger"
				class:portrait-lg={layout.portrait}
				style={`left:${layout.menuX}px; top:${layout.menuY}px; width:${layout.menuW}px; height:${layout.menuH}px`}
				aria-label="menu"
				onclick={toggleHamburger}
			>
				{#if hamburgerOpen}
					<svg class="hamburger-x" viewBox="0 0 61 61" aria-hidden="true" focusable="false">
						<g transform="translate(30.5 30.5)">
							<rect fill="#000" x="-30.5" y="-7" width="61" height="14" rx="7" transform="rotate(45)" />
							<rect fill="#000" x="-30.5" y="-7" width="61" height="14" rx="7" transform="rotate(-45)" />
							<rect fill="#fff" x="-27.5" y="-4" width="55" height="8" rx="4" transform="rotate(45)" />
							<rect fill="#fff" x="-27.5" y="-4" width="55" height="8" rx="4" transform="rotate(-45)" />
						</g>
					</svg>
				{:else}
					<span></span><span></span><span></span>
				{/if}
			</button>

			{#if !inFreegame}
				<button
					class="bonus-button"
					class:ante={featureToggleActive}
					aria-label="Bonus"
					style={`left:${layout.bonusX}px; top:${layout.bonusY}px; width:${layout.bonusD}px; height:${layout.bonusD}px`}
					onclick={onBonusPress}
					disabled={spinning || autoPlayRunning}
				>
					<svg class="bonus-art bonus-idle" viewBox="14.1735 29.3174 91.2175 50.4809" aria-hidden="true" focusable="false">
						<path
							d="M33.9327 52.7308L14.1735 78.9863L33.9327 65.3172L31.632 73.0314L46.2485 63.8285L78.1881 79.7983L64.7897 47.4526L87.6617 73.0314V65.3172L105.391 79.7983L84.8196 52.7308L79.1355 55.9789L59.3762 29.3174L40.1583 55.9789L33.9327 52.7308Z"
						/>
					</svg>
					<svg class="bonus-art bonus-x" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
						<g transform="translate(16 16)">
							<rect x="-11" y="-1.5" width="22" height="3" rx="1.5" transform="rotate(45)" />
							<rect x="-11" y="-1.5" width="22" height="3" rx="1.5" transform="rotate(-45)" />
						</g>
					</svg>
				</button>
			{/if}

			<div
				class="toolbar-meter"
				style={`left:${layout.meterX}px; top:${layout.meterY}px; width:${layout.meterW}px; height:${layout.meterH}px`}
			>
				<div
					class="amount balance"
					style={`--label-size:${toolbarLabelSize}px; --value-size:${balanceFitValueSize}px`}
				>
					<span>{toolbarLabel('balance')}</span>
					<strong>{balanceValue}</strong>
				</div>
				<div
					class="amount bet {betAccentClass}"
					style={`--label-size:${toolbarLabelSize}px; --value-size:${betFitValueSize}px`}
				>
					{#if inFreegame}
						<div class="bet-copy">
							<span>{toolbarLabel('bet')}</span>
							<strong>{betValue}</strong>
						</div>
					{:else if layout.portrait}
						<span>{toolbarLabel('bet')}</span>
						<div class="bet-amount-row">
							<button
								class="bet-chevron down"
								aria-label={betControlDecreaseAria()}
								disabled={!canDecreaseBet}
								onclick={onBetDecreasePress}
								><img src={summitSrc('chevrondown.svg')} alt="" aria-hidden="true" /></button
							>
							<strong>{betValue}</strong>
							<button
								class="bet-chevron up"
								aria-label={betControlIncreaseAria()}
								disabled={!canIncreaseBet}
								onclick={onBetIncreasePress}
								><img src={summitSrc('chevronup.svg')} alt="" aria-hidden="true" /></button
							>
						</div>
					{:else}
						<button
							type="button"
							class="bet-copy bet-copy-hit"
							aria-label="Select bet amount"
							aria-expanded={betSliderOpen}
							disabled={!canOpenBetSlider}
							onclick={toggleBetSlider}
						>
							<span>{toolbarLabel('bet')}</span>
							<strong>{betValue}</strong>
						</button>
						<div class="bet-chevron-stack">
							<button
								class="bet-chevron up"
								aria-label={betControlIncreaseAria()}
								disabled={!canIncreaseBet}
								onclick={onBetIncreasePress}
								><img src={summitSrc('chevronup.svg')} alt="" aria-hidden="true" /></button
							>
							<button
								class="bet-chevron down"
								aria-label={betControlDecreaseAria()}
								disabled={!canDecreaseBet}
								onclick={onBetDecreasePress}
								><img src={summitSrc('chevrondown.svg')} alt="" aria-hidden="true" /></button
							>
						</div>
					{/if}
				</div>
			</div>

			{#if betSliderOpen && !inFreegame && !layout.portrait}
				<div
					class="bet-slider"
					style={`left:${betSliderLeft}px; top:${Math.max(0, layout.meterY - Math.round(42 * layout.uiScale))}px; width:${betSliderW}px`}
					role="dialog"
					aria-label="Select bet"
				>
					<div
						class="bet-slider-hit"
						bind:this={betSliderTrackEl}
						onpointerdown={onBetSliderPointerDown}
						onpointermove={onBetSliderPointerMove}
						onpointerup={onBetSliderPointerUp}
						onpointercancel={onBetSliderPointerUp}
						role="slider"
						aria-valuemin={0}
						aria-valuemax={Math.max(0, sortedBetLadder.length - 1)}
						aria-valuenow={betSliderIndex}
						aria-valuetext={betValue}
						tabindex="0"
					>
						<div class="bet-slider-track">
							<div class="bet-slider-fill" style={`width:${betSliderPct}%`}></div>
						</div>
						<div class="bet-slider-thumb" style={`left:${betSliderPct}%`}></div>
					</div>
				</div>
			{/if}

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
							: autoPlayArmed
								? 'Start autoplay'
								: 'Spin'}
				>
					{#if autoPlayRunning}
						<span>{autoSpinsMenuLabel()}</span>
						<strong>{autoSpinsText === '∞' ? '∞' : autoSpinsRemainingDisplay}</strong>
					{:else if spinning}
						<span class="spin-face" aria-hidden="true"><i class="spin-stop"></i></span>
					{:else}
						<img src={summitSrc('base-spin.svg')} alt="" aria-hidden="true" />
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

			{#if !inFreegame}
				<button
					bind:this={autoBtnEl}
					class:active={autoPlayRunning || autoPlayArmed}
					class:menu-open={autoPopupOpen}
					class:fs-chip={autoPlayRunning || autoPlayArmed}
					class="sprite auto"
					style={`left:${layout.autoX}px; top:${layout.autoY}px; width:${layout.autoD}px; height:${layout.autoD}px; --auto-count-size:${autoChipCountSize}px`}
					onclick={toggleAutoplay}
					disabled={autoplayDisabledByJurisdiction}
					aria-label={autoPlayRunning || autoPlayArmed ? 'Clear autoplay' : 'Autoplay'}
				>
					{#if autoPlayRunning || autoPlayArmed}
						<span>{autoChipLabel}</span>
						<strong>{autoChipCount}</strong>
					{:else}
						<img src={summitSrc('base-auto.svg')} alt="" aria-hidden="true" />
					{/if}
				</button>
			{/if}

			<button
				class:active={speedMode > 0}
				class:turbo-1={speedMode === 1}
				class:turbo-2={speedMode === 2}
				class:tall={inFreegame && !layout.portrait}
				class="sprite turbo"
				style={`left:${layout.turboX}px; top:${layout.turboY}px; width:${layout.turboW}px; height:${layout.turboH}px`}
				onclick={toggleTurbo}
				disabled={turboDisabled}
				aria-label={speedModeLabel}
			>
				<img src={toolbarTurboSrc} alt="" aria-hidden="true" />
			</button>
		</section>
		<div
			class="win-popup"
			class:show={winPopupOpen}
			style={`left:${winChipLeft}px; top:${winChipTop}px; width:${winPopupChipW}px; height:${layout.winH}px; --label-size:${winChipLabelSize}px; --value-size:${winPopupChipValueSize}px`}
		>
			<span>{winChipLabel}</span>
			<strong class="money-amount toolbar-money">{winPopupAmount}</strong>
		</div>
	</div>

	{#if hamburgerOpen && !layout.portrait}
		<div class="toolbar-menu-anchor toolbar-shell-popover" style={toolbarMenuPopoverStyle}>
			<ToolbarSettingsMenu
				scale={menuScale}
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
	{/if}

	{#if hamburgerOpen && layout.portrait}
		<div
			class="settings-overlay"
			role="presentation"
			onclick={closeHamburgerMenu}
			onkeydown={(e) => e.key === 'Escape' && closeHamburgerMenu()}
		>
			<div
				class="settings-menu-modal"
				role="presentation"
				onclick={(e) => e.stopPropagation()}
			>
				<ToolbarSettingsMenu
					scale={Math.max(1, menuScale)}
					nativeRange={phonePlayHost}
					bind:sfxVolume
					bind:musicVolume
					onInfo={openInfo}
					onSfxChange={setVolumeSfx}
					onMusicChange={setVolumeMusic}
					showBonusRow={!inFreegame}
					onBonusPress={onBonusPress}
					bonusDisabled={spinning || autoPlayRunning}
					bonusAnteActive={featureToggleActive}
					bonusLabel={buyBonusLabel()}
					showAutoSpinRow={!inFreegame}
					onAutoSpin={toggleAutoplay}
					autoSpinDisabled={autoplayDisabledByJurisdiction}
					autoSpinActive={autoPlayRunning || autoPlayArmed}
					autoSpinLabel={autoPlayRunning || autoPlayArmed
						? autoSpinsActiveMenuLabel(stateBet.autoSpinsCounter)
						: autoSpinsMenuLabel()}
					showSpeedRow={true}
					onSpeedPress={toggleTurbo}
					speedLabel={speedModeLabel}
					soundSrc={summitSrc('sound.svg')}
					musicSrc={summitSrc('music.svg')}
				/>
			</div>
		</div>
	{/if}

	{#if autoPopupOpen && !inFreegame && !layout.auxInMenu}
		<div class="auto-popup toolbar-shell-popover" style={toolbarAutoPopoverStyle}>
			<div class="auto-popup-title">{autoplayPopupTitle()}</div>
			<div class="auto-popup-subtitle">SELECT ROUNDS — THEN PRESS SPIN</div>
			{#each autoSpinOptions as option (option)}
				<button
					class:active={autoSpinsText === option && autoPlayArmed}
					onclick={() => armAutoplay(option)}>{option}</button
				>
			{/each}
		</div>
	{/if}

	{#if autoPopupOpen && !inFreegame && layout.auxInMenu}
		<div
			class="settings-overlay"
			role="presentation"
			onclick={closeAutoplayPanel}
		>
			<div class="auto-popup auto-popup-modal" role="presentation" onclick={(e) => e.stopPropagation()}>
				<div class="auto-popup-title">{autoplayPopupTitle()}</div>
				<div class="auto-popup-subtitle">SELECT ROUNDS — THEN PRESS SPIN</div>
				{#each autoSpinOptions as option (option)}
					<button
						class:active={autoSpinsText === option && autoPlayArmed}
						onclick={() => armAutoplay(option)}>{option}</button
					>
				{/each}
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
		font-family: 'Fredoka One', Inter, sans-serif;
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
