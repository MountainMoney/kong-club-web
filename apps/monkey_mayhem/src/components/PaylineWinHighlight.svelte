<script lang="ts" module>
	import type { Position } from '../game/types';

	export type WinLinePresent = {
		win: number;
		positions: Position[];
		lineIndex: number;
	};

	export type SpinWinPresentLabOpts = {
		forceSlowCrawl?: boolean;
		coinTickLineAmount?: boolean;
		amountFloat?: boolean;
		winStingOnComplete?: boolean;
		skipCenterOverlay?: boolean;
		/** Leftover coin collect under 50× — snap the win-font amount, no tier/dim/count-up. */
		amountOnly?: boolean;
		/** FX Lab end-to-end beat — no sting/float hijack; clean handoff to count-up. */
		fullWinBeat?: boolean;
		/** FX Lab runner session — ties spinWinPresentComplete to the active preview. */
		labSession?: number;
		/** Force a payline style for this preview (lab). */
		paylineStyle?: import('../game/paylineStyles').PaylineStyleId;
	};

	export type EmitterEventPaylineWin =
		| {
				type: 'spinWinPresent';
				totalWin: number;
				lines: WinLinePresent[];
				lab?: SpinWinPresentLabOpts;
		  }
		| { type: 'paylineWinSkip' }
		| { type: 'paylineWinHide' }
		| { type: 'spinWinCountUpComplete'; totalWin: number }
		| { type: 'spinWinPresentComplete'; generation: number; labSession?: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { bookEventAmountToWinCurrencyString } from 'utils-shared/amount';
	import BoardContainer from './BoardContainer.svelte';
	import { isGameAudioUnlocked } from '../game/audioUnlock.svelte';
	import { getContext } from '../game/context';
	import config from '../game/config';
	import { ensurePrizeNumberFont } from '../game/introFont';
	import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from '../game/prizeNumberFont';
	import {
		buildPaylineAmountLabels,
		getPaylineAmountMode,
		PAYLINE_AMOUNT_FONT_SIZE,
		PAYLINE_AMOUNT_POP_MS,
	} from '../game/paylineWinAmount';
	import { getPixiTextResolution, roundPix } from '../game/pixiTextCrisp';
	import { eventEmitter } from '../game/eventEmitter';
	import {
		resumeMonkeyBgmAfterWinSting,
		WIN_LEVEL_BGM_NAMES,
	} from '../game/MonkeyBgm';
	import { stopWinTierStings } from '../game/MonkeySoundPlayer';
	import type { SoundEffectName } from '../game/sound';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		bookRowToOverlayY,
		getSymbolX,
		paylineVisibleRowToBookRow,
	} from '../game/utils';
	import { BOARD_DIMENSIONS, zIndexes } from '../game/constants';
	import { clearWinPresentationSkipUsed, skippableDelay } from '../game/spinSkip.svelte';
	import {
		beginCenterCountUp,
		beginWinPresentation,
		isWinPresentationCurrent,
		resetSpinWinOverlay,
		runCountUpDriverSkip,
		runSkipWinCount,
		spinWinOverlay,
		setSkipWinCount,
		startSpinWinCountUp,
	} from '../game/spinWinOverlay.svelte';
	import { resetWinCelebration } from '../game/winCelebrationPresentation.svelte';
	import { pulseWinScreenShake } from '../game/winCelebrationShake';
	import { applyTierVisuals, burstTierJuice } from '../game/winCelebrationFx';
	import { startWinCoinLoop, stopWinCoinLoop } from '../game/winCoinLoop';
	import { startAcceleratingCoinTicks } from '../game/winCoinTick';
	import {
		fadeSpinWinDimIn,
		fadeSpinWinDimOut,
		resetSpinWinDim,
	} from '../game/spinWinDim.svelte';
	import {
		WIN_COUNT_DIM_ALPHA,
		WIN_COUNT_FADE_OUT_MS,
		WIN_COUNT_HOLD_MS,
		WIN_COUNT_LABEL_BOUNCE_MS,
		WIN_COUNT_MAX_HOLD_MS,
		WIN_PRE_COUNTUP_BIG_HOLD_MS,
		WIN_PRE_COUNTUP_HOLD_MS,
		WIN_PRE_COUNTUP_MED_HOLD_MS,
	} from '../game/winCountLayout';
	import {
		BIG_WIN_MIN_MULTIPLIER,
		capBookAmount,
		getWinCountTierFromAmount,
		getWinMultiplier,
		isMaxWinMultiplier,
		getWinPresentationTier,
		shouldShowCenterWinCountUp,
		winCountDurationMsRaw,
		winCountTierRank,
	} from '../game/winCountTier';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';
	import {
		getActivePaylineStyle,
		isFxLabActive,
		markFxLabPresenterGone,
		markFxLabPresenterReady,
		stateFxLab,
	} from '../game/fxLab.svelte';
	import { drawPaylineStyle, type PaylineStyleId } from '../game/paylineStyles';
	import {
		pacedWinCountDurationMs,
		scaleFeatureMs,
		SLOW_CRAWL_HOLD_MS,
		SLOW_CRAWL_REEL_MS,
	} from '../game/winPresentationTempo';
	const activePaylineStyle = (): PaylineStyleId =>
		labOpts?.paylineStyle ?? getActivePaylineStyle();

	/** Left→right payline crawl: one reel step, then brief hold on full lines. */
	const PAYLINE_CRAWL_REEL_MS = 110;
	const PAYLINE_CRAWL_HOLD_MS = 380;
	/** Quick payline draw for sub-tier-4 wins. */
	const PAYLINE_QUICK_DRAW_MS = 380;
	const PAYLINE_QUICK_HOLD_MS = 520;
	const WIN_SYMBOL_ANIM_MIN_MULTIPLIER = 100;

	const preCountUpHoldMs = (bookAmount: number) => {
		const mult = getWinMultiplier(bookAmount);
		if (mult >= WIN_SYMBOL_ANIM_MIN_MULTIPLIER) return WIN_PRE_COUNTUP_BIG_HOLD_MS;
		if (mult >= BIG_WIN_MIN_MULTIPLIER) return WIN_PRE_COUNTUP_MED_HOLD_MS;
		return WIN_PRE_COUNTUP_HOLD_MS;
	};

	const WIN_COUNT_TIER_TO_LEVEL: Record<'big' | 'mega' | 'superwin' | 'epic' | 'max', WinLevel> = {
		big: 6,
		superwin: 7,
		mega: 8,
		epic: 9,
		max: 10,
	};

	const WIN_LEVEL_TIER_SFX: Partial<Record<WinLevel, SoundEffectName>> = {
		6: 'sfx_winlevel_substantial',
		7: 'sfx_winlevel_nice',
		8: 'sfx_winlevel_standard',
		9: 'sfx_winlevel_end',
	};

	const context = getContext();

	let show = $state(false);
	let phase = $state<'lines' | 'snapshot' | 'total'>('lines');
	let lines = $state<WinLinePresent[]>([]);
	let totalWin = $state(0);
	/** Reels revealed left→right during payline crawl (0–5). */
	let visibleReels = $state(0);
	/** 0–1 progress for animated payline connector draw. */
	let lineDrawProgress = $state(1);
	let showLineAmount = $state(false);
	let fontReady = $state(false);
	let labOpts = $state<SpinWinPresentLabOpts | null>(null);
	let lineAmountDisplay = $state(0);
	let amountFloatY = $state(0);
	let amountFloatScale = $state(1);

	const labelScaleTween = new Tween(0);
	const contentAlphaTween = new Tween(1);
	const amountPopScale = new Tween(0);

	const PAYLINE_AMOUNT_Z = 800;

	const textRes = getPixiTextResolution();

	const amountLabels = $derived.by(() => {
		if (!showLineAmount || lineDrawProgress < 1) return [];
		return buildPaylineAmountLabels(
			getPaylineAmountMode(),
			lines,
			lineAmountDisplay > 0 ? lineAmountDisplay : totalWin,
			config.paylines as Record<string, number[]>,
		);
	});

	const amountFloatActive = $derived(
		labOpts?.amountFloat === true || stateFxLab.amountFloatPreview,
	);

	const amountLabelStyle = $derived({
		fontFamily: fontReady ? PRIZE_NUMBER_FONT : 'Arial',
		fontSize: PAYLINE_AMOUNT_FONT_SIZE,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: 5 },
		dropShadow: {
			alpha: 0.85,
			angle: Math.PI / 2,
			blur: 0,
			color: 0x000000,
			distance: 6,
		},
	});

	// ── Payline connector pulse (alpha breathes on layered gold stroke) ─────
	let lineAlpha = $state(0.9);
	let pulseRaf = 0;
	let floatRaf = 0;

	const startLinePulse = () => {
		cancelAnimationFrame(pulseRaf);
		const start = performance.now();
		const tick = () => {
			const t = (performance.now() - start) / 1000;
			const wave = Math.sin(t * Math.PI * 2.4);
			lineAlpha = 0.72 + wave * 0.22;
			pulseRaf = requestAnimationFrame(tick);
		};
		tick();
	};

	const stopLinePulse = () => {
		cancelAnimationFrame(pulseRaf);
		lineAlpha = 0.9;
	};

	const startAmountFloat = () => {
		cancelAnimationFrame(floatRaf);
		const start = performance.now();
		const tick = () => {
			const t = (performance.now() - start) / 1000;
			const wave = Math.sin(t * Math.PI * 1.2);
			amountFloatY = wave * 6;
			amountFloatScale = 1 + wave * 0.04;
			floatRaf = requestAnimationFrame(tick);
		};
		tick();
	};

	const stopAmountFloat = () => {
		cancelAnimationFrame(floatRaf);
		amountFloatY = 0;
		amountFloatScale = 1;
	};

	onMount(() => () => {
		cancelAnimationFrame(pulseRaf);
		cancelAnimationFrame(floatRaf);
	});

	const paylineRowsFor = (lineIndex: number) =>
		lineIndex > 0
			? (config.paylines[String(lineIndex)] as number[] | undefined)
			: undefined;

	const exponentialEase = (t: number) => (t <= 0 ? 0 : 1 - Math.pow(2, -10 * t));

	let labelSyncRaf = 0;
	let abortPresentation = false;
	/** User skipped lines/snapshot — jump to center total, not full abort. */
	let skipToTotal = false;
	let countUpSkipped = false;
	let presentationGeneration = 0;

	const shouldBreakPhase = () => skipToTotal || abortPresentation;

	const winLevelSoundsPlay = (winLevel: WinLevel) => {
		if (winLevel === 10) {
			eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_winlevel_max' });
			return;
		}

		const tierSfx = WIN_LEVEL_TIER_SFX[winLevel];
		if (tierSfx) {
			stopWinTierStings();
			eventEmitter.broadcast({ type: 'soundOnce', name: tierSfx, forcePlay: true });
			return;
		}

		const winLevelData = winLevelMap[winLevel];
		if (winLevelData?.sound?.sfx) {
			eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
		}
	};

	const winLevelSoundsStop = () => {
		stopWinCoinLoop();
		stopAcceleratingCoinTicks();
		stopWinTierStings();
		for (const name of WIN_LEVEL_BGM_NAMES) {
			eventEmitter.broadcast({ type: 'soundStop', name });
		}
		resumeMonkeyBgmAfterWinSting(stateGame.gameType === 'freegame');
		void eventEmitter.broadcastAsync({ type: 'uiShow' });
	};

	let stopCoinTicksFn: (() => void) | null = null;

	const stopAcceleratingCoinTicks = () => {
		stopCoinTicksFn?.();
		stopCoinTicksFn = null;
	};

	const countUpTo = async (rawTarget: number, durationMs: number, generation: number) => {
		const target = capBookAmount(rawTarget);
		if (!isWinPresentationCurrent(generation)) return;

		spinWinOverlay.targetDimAlpha = WIN_COUNT_DIM_ALPHA;
		spinWinOverlay.targetAmount = 0;
		void fadeSpinWinDimIn();

		spinWinOverlay.tier = null;
		labelScaleTween.set(0, { duration: 0 });
		spinWinOverlay.labelScale = 0;
		let lastAppliedTierRank = -1;

		if (isMaxWinMultiplier(getWinMultiplier(target))) {
			winLevelSoundsPlay(10);
		}

		const applyTierCrossing = (bookAmount: number) => {
			const tier = getWinCountTierFromAmount(bookAmount);
			if (!tier) return;
			const rank = winCountTierRank(tier);
			if (rank <= lastAppliedTierRank) return;

			lastAppliedTierRank = rank;
			spinWinOverlay.tier = tier;
			winLevelSoundsPlay(WIN_COUNT_TIER_TO_LEVEL[tier]);
			applyTierVisuals(tier);
			burstTierJuice(tier, getWinMultiplier(bookAmount));
			void labelScaleTween.set(0, { duration: 0 }).then(() =>
				labelScaleTween.set(1, { duration: 320, easing: backOut }),
			);
		};

		const countUpPromise = beginCenterCountUp();
		spinWinOverlay.counting = true;
		startSpinWinCountUp(target, durationMs);
		stopAcceleratingCoinTicks();
		stopCoinTicksFn = startAcceleratingCoinTicks(durationMs);

		setSkipWinCount(() => {
			if (!isWinPresentationCurrent(generation)) {
				setSkipWinCount(null);
				clearWinPresentationSkipUsed();
				return;
			}
			cancelAnimationFrame(labelSyncRaf);
			countUpSkipped = true;
			stopAcceleratingCoinTicks();
			runCountUpDriverSkip();
			applyTierCrossing(target);
			spinWinOverlay.contentAlpha = 1;
			contentAlphaTween.set(1, { duration: 0 });
			clearWinPresentationSkipUsed();
			setSkipWinCount(null);
		});

		const syncLabel = () => {
			if (!spinWinOverlay.counting || !isWinPresentationCurrent(generation)) return;
			applyTierCrossing(spinWinOverlay.displayAmount);
			spinWinOverlay.labelScale = labelScaleTween.current;
			spinWinOverlay.contentAlpha = contentAlphaTween.current;
			labelSyncRaf = requestAnimationFrame(syncLabel);
		};
		labelSyncRaf = requestAnimationFrame(syncLabel);

		try {
			await countUpPromise;
		} catch {
			stopAcceleratingCoinTicks();
			return;
		}

		stopAcceleratingCoinTicks();
		cancelAnimationFrame(labelSyncRaf);
		if (!isWinPresentationCurrent(generation)) return;
		applyTierCrossing(target);
		// Guarantee full visibility during the post-count hold (tween may not have reached 1 yet).
		spinWinOverlay.labelScale = 1;
		spinWinOverlay.contentAlpha = 1;
		setSkipWinCount(null);
	};

	const fadeCelebrationOut = async () => {
		const duration = WIN_COUNT_FADE_OUT_MS;
		const fromContent = spinWinOverlay.contentAlpha;
		void fadeSpinWinDimOut();

		return new Promise<void>((resolve) => {
			const start = performance.now();
			const tick = () => {
				const t = Math.min(1, (performance.now() - start) / duration);
				spinWinOverlay.contentAlpha = fromContent * (1 - t);

				if (t < 1) {
					requestAnimationFrame(tick);
					return;
				}

				spinWinOverlay.contentAlpha = 0;
				resetSpinWinDim();
				resetWinCelebration();
				resolve();
			};
			tick();
		});
	};

	const resetPresentation = () => {
		cancelAnimationFrame(labelSyncRaf);
		stopWinCoinLoop();
		stopAcceleratingCoinTicks();
		stopLinePulse();
		stateGame.lineWinPresentation = false;
		abortPresentation = false;
		skipToTotal = false;
		countUpSkipped = false;
		show = false;
		phase = 'lines';
		lines = [];
		totalWin = 0;
		visibleReels = 0;
		lineDrawProgress = 1;
		showLineAmount = false;
		lineAmountDisplay = 0;
		labOpts = null;
		stateFxLab.amountFloatPreview = false;
		stopAmountFloat();
		amountPopScale.set(0, { duration: 0 });
		labelScaleTween.set(0, { duration: 0 });
		contentAlphaTween.set(1, { duration: 0 });
		resetSpinWinDim();
		resetWinCelebration();
		resetSpinWinOverlay();
	};

	const finishPresentation = () => {
		if (!show && !spinWinOverlay.show && !spinWinOverlay.counting) return;
		if (abortPresentation) return;
		cancelAnimationFrame(labelSyncRaf);
		stopWinCoinLoop();
		stopAcceleratingCoinTicks();
		stopLinePulse();
		stopAmountFloat();
		if (spinWinOverlay.counting) {
			runSkipWinCount();
			return;
		}
		if (show && (phase === 'lines' || phase === 'snapshot')) {
			show = false;
			visibleReels = BOARD_DIMENSIONS.x;
			lineDrawProgress = 1;
			endPaylinePhaseForCountUp();
		}
		skipToTotal = true;
	};

	const winPositionsForReel = (winLines: WinLinePresent[], reelIndex: number): Position[] => {
		const seen = new Set<string>();
		const positions: Position[] = [];
		for (const line of winLines) {
			if (line.lineIndex <= 0) continue;
			for (const pos of line.positions) {
				if (pos.reel !== reelIndex) continue;
				const key = `${pos.reel}:${pos.row}`;
				if (seen.has(key)) continue;
				seen.add(key);
				positions.push(pos);
			}
		}
		return positions;
	};

	const allWinPositions = (winLines: WinLinePresent[]): Position[] => {
		const seen = new Set<string>();
		const positions: Position[] = [];
		for (const line of winLines) {
			for (const pos of line.positions) {
				const key = `${pos.reel}:${pos.row}`;
				if (seen.has(key)) continue;
				seen.add(key);
				positions.push(pos);
			}
		}
		return positions;
	};

	/** Only positions belonging to drawn paylines (lineIndex > 0) — excludes scatter wins. */
	const paylineOnlyPositions = (winLines: WinLinePresent[]): Position[] => {
		const seen = new Set<string>();
		const positions: Position[] = [];
		for (const line of winLines) {
			if (line.lineIndex <= 0) continue;
			for (const pos of line.positions) {
				const key = `${pos.reel}:${pos.row}`;
				if (seen.has(key)) continue;
				seen.add(key);
				positions.push(pos);
			}
		}
		return positions;
	};

	const hasPaylineWinLines = (winLines: WinLinePresent[]) =>
		winLines.some((line) => line.lineIndex > 0);

	const playBaseGameLineWinSfx = (winLines: WinLinePresent[]) => {
		if (stateGame.gameType !== 'basegame') return;
		if (!hasPaylineWinLines(winLines)) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small', forcePlay: true });
	};

	const playWinSting = () => {
		const overlayWasHidden = !spinWinOverlay.show;
		spinWinOverlay.show = true;
		spinWinOverlay.flashAlpha = 0.62;
		spinWinOverlay.targetDimAlpha = 0.24;
		spinWinOverlay.contentAlpha = 0;
		void fadeSpinWinDimIn();
		lineAlpha = 1;
		pulseWinScreenShake(12, 380);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_substantial' });
		setTimeout(() => {
			if (overlayWasHidden && phase !== 'total') {
				spinWinOverlay.show = false;
				resetSpinWinDim();
				spinWinOverlay.contentAlpha = 1;
			}
		}, 360);
	};

	const popAmountIn = async () => {
		if (!lines.length || totalWin <= 0) return;
		if (shouldShowCenterWinCountUp(totalWin)) return;
		showLineAmount = true;
		amountPopScale.set(0, { duration: 0 });

		if (labOpts?.coinTickLineAmount) {
			lineAmountDisplay = 0;
			await amountPopScale.set(1, { duration: 0 });
			startWinCoinLoop();
			const durationMs = scaleFeatureMs(600, 400);
			let lastPulseAt = 0;
			try {
				await new Promise<void>((resolve) => {
					const start = performance.now();
					const tick = () => {
						const t = Math.min(1, (performance.now() - start) / durationMs);
						lineAmountDisplay = Math.round(totalWin * exponentialEase(t));
						const now = performance.now();
						if (now - lastPulseAt > 90) {
							lastPulseAt = now;
							void amountPopScale.set(1.1, { duration: 60 }).then(() =>
								amountPopScale.set(1, { duration: 90 }),
							);
						}
						if (t < 1) {
							requestAnimationFrame(tick);
							return;
						}
						lineAmountDisplay = totalWin;
						resolve();
					};
					tick();
				});
			} finally {
				stopWinCoinLoop();
			}
		} else {
			lineAmountDisplay = totalWin;
			const popMs = scaleFeatureMs(PAYLINE_AMOUNT_POP_MS, 200);
			await amountPopScale.set(1, { duration: popMs, easing: backOut });
		}

		if (labOpts?.winStingOnComplete && !labOpts?.fullWinBeat) playWinSting();
		if (amountFloatActive && !labOpts?.fullWinBeat) startAmountFloat();
	};

	const endPaylinePhaseForCountUp = () => {
		stopAmountFloat();
		stopLinePulse();
		showLineAmount = false;
		stateFxLab.amountFloatPreview = false;
		spinWinOverlay.flashAlpha = 0;
	};

	const animateLineDraw = (durationMs: number) =>
		new Promise<void>((resolve) => {
			const start = performance.now();
			lineDrawProgress = 0;
			showLineAmount = false;
			amountPopScale.set(0, { duration: 0 });
			const finish = () => {
				lineDrawProgress = 1;
				void popAmountIn().then(resolve);
			};
			const tick = () => {
				if (shouldBreakPhase()) {
					finish();
					return;
				}
				lineDrawProgress = Math.min(1, (performance.now() - start) / durationMs);
				if (lineDrawProgress < 1) {
					requestAnimationFrame(tick);
					return;
				}
				finish();
			};
			tick();
		});

	const paylinePointsFor = (rows: number[], maxReel: number) => {
		const points: { x: number; y: number }[] = [];
		rows.forEach((visibleRow, reel) => {
			if (reel >= maxReel) return;
			points.push({
				x: getSymbolX(reel),
				y: bookRowToOverlayY(paylineVisibleRowToBookRow(visibleRow)),
			});
		});
		return points;
	};

	const drawPaylineConnector = (
		g: import('pixi.js').Graphics,
		rows: number[],
		alpha: number,
		maxReel: number,
		progress: number,
	) => {
		g.clear();
		const points = paylinePointsFor(rows, maxReel);
		if (!points.length) return;
		if (points.length < 2 && activePaylineStyle() !== 'cell_boxes') return;
		drawPaylineStyle(g, activePaylineStyle(), points, alpha, progress);
	};

	/** Fast left→right payline draw for regular wins. */
	const presentQuickPaylines = async (winLines: WinLinePresent[]) => {
		if (!winLines.length || shouldBreakPhase()) return;
		playBaseGameLineWinSfx(winLines);
		phase = 'lines';
		startLinePulse();
		visibleReels = BOARD_DIMENSIONS.x;
		await animateLineDraw(scaleFeatureMs(PAYLINE_QUICK_DRAW_MS, 180));
		const positions = paylineOnlyPositions(winLines);
		if (positions.length && !shouldBreakPhase()) {
			await eventEmitter.broadcastAsync({
				type: 'boardWithAnimateSymbols',
				symbolPositions: positions,
			});
		}
		if (!shouldBreakPhase()) {
			await skippableDelay(scaleFeatureMs(PAYLINE_QUICK_HOLD_MS, 220));
		}
		stopLinePulse();
	};

	const tweenLineDrawProgress = (from: number, to: number, durationMs: number) =>
		new Promise<void>((resolve) => {
			if (durationMs <= 0 || from >= to) {
				lineDrawProgress = to;
				resolve();
				return;
			}
			const start = performance.now();
			const tick = () => {
				if (shouldBreakPhase()) {
					lineDrawProgress = to;
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / durationMs);
				lineDrawProgress = from + (to - from) * t;
				if (t < 1) {
					requestAnimationFrame(tick);
					return;
				}
				lineDrawProgress = to;
				resolve();
			};
			tick();
		});

	const presentAllLines = async (winLines: WinLinePresent[], slowCrawl = false) => {
		if (!winLines.length || shouldBreakPhase()) return;
		playBaseGameLineWinSfx(winLines);
		phase = 'lines';
		startLinePulse();
		visibleReels = 0;
		lineDrawProgress = 0;
		const crawlReelMs = slowCrawl
			? scaleFeatureMs(SLOW_CRAWL_REEL_MS, 120)
			: scaleFeatureMs(PAYLINE_CRAWL_REEL_MS, 80);
		const crawlHoldMs = slowCrawl
			? scaleFeatureMs(SLOW_CRAWL_HOLD_MS, 400)
			: scaleFeatureMs(PAYLINE_CRAWL_HOLD_MS, 280);
		const drawSegmentMs = Math.max(60, Math.round(crawlReelMs * 0.55));
		for (let reel = 1; reel <= BOARD_DIMENSIONS.x; reel++) {
			if (shouldBreakPhase()) {
				visibleReels = BOARD_DIMENSIONS.x;
				lineDrawProgress = 1;
				break;
			}
			const prevProgress = (reel - 1) / BOARD_DIMENSIONS.x;
			const nextProgress = reel / BOARD_DIMENSIONS.x;
			visibleReels = reel;
			const positions = winPositionsForReel(winLines, reel - 1);
			if (positions.length) {
				await eventEmitter.broadcastAsync({
					type: 'boardWithAnimateSymbols',
					symbolPositions: positions,
				});
			}
			await tweenLineDrawProgress(prevProgress, nextProgress, drawSegmentMs);
			if (slowCrawl) lineAlpha = 1;
			if (reel < BOARD_DIMENSIONS.x && !shouldBreakPhase()) {
				await skippableDelay(crawlReelMs - drawSegmentMs);
			}
		}
		lineDrawProgress = 1;
		if (!shouldBreakPhase()) {
			await popAmountIn();
		}
		if (!shouldBreakPhase()) {
			await skippableDelay(crawlHoldMs);
		}
		stopLinePulse();
	};

	/** Winning cells celebrate on the board, then hold before count-up. */
	const presentWinHitSnapshot = async (winLines: WinLinePresent[], bookTotalWin: number) => {
		if (!winLines.length || shouldBreakPhase()) return;
		endPaylinePhaseForCountUp();
		phase = 'snapshot';
		visibleReels = BOARD_DIMENSIONS.x;
		lineDrawProgress = 1;

		const skipSymbolReAnim = getWinPresentationTier(bookTotalWin) >= 4;
		if (!skipSymbolReAnim) {
			const positions = allWinPositions(winLines);
			if (positions.length) {
				await eventEmitter.broadcastAsync({
					type: 'boardWithAnimateSymbols',
					symbolPositions: positions,
				});
			}
		}

		if (shouldShowCenterWinCountUp(bookTotalWin)) {
			spinWinOverlay.show = true;
			spinWinOverlay.targetDimAlpha = WIN_COUNT_DIM_ALPHA;
			void fadeSpinWinDimIn();
		}

		startLinePulse();
		await skippableDelay(preCountUpHoldMs(bookTotalWin));
		stopLinePulse();
	};

	const presentSpinTotal = async (rawTarget: number, generation: number) => {
		const target = capBookAmount(rawTarget);
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;
		endPaylinePhaseForCountUp();
		phase = 'total';
		clearWinPresentationSkipUsed();
		const mult = getWinMultiplier(target);

		spinWinOverlay.show = true;
		spinWinOverlay.tier = null;
		spinWinOverlay.targetDimAlpha = WIN_COUNT_DIM_ALPHA;
		spinWinOverlay.contentAlpha = 1;
		spinWinOverlay.labelScale = 0;
		contentAlphaTween.set(1, { duration: 0 });
		labelScaleTween.set(0, { duration: 0 });
		void fadeSpinWinDimIn();

		await countUpTo(
			target,
			isFxLabActive() ? pacedWinCountDurationMs(mult) : winCountDurationMsRaw(mult),
			generation,
		);
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;

		eventEmitter.broadcast({ type: 'spinWinCountUpComplete', totalWin: target });

		if (spinWinOverlay.tier) {
			winLevelSoundsStop();
		}

		if (countUpSkipped) {
			await skippableDelay(isFxLabActive() ? 120 : 700);
			if (abortPresentation || !isWinPresentationCurrent(generation)) return;
		}

		const holdMs =
			spinWinOverlay.tier === 'max'
				? WIN_COUNT_MAX_HOLD_MS
				: isFxLabActive()
					? 600
					: WIN_COUNT_HOLD_MS;
		await skippableDelay(holdMs);
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;
		await fadeCelebrationOut();
	};

	const presentAmountOnlyPop = async (rawTarget: number, generation: number) => {
		const target = capBookAmount(rawTarget);
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;
		endPaylinePhaseForCountUp();
		phase = 'total';
		clearWinPresentationSkipUsed();

		spinWinOverlay.show = true;
		spinWinOverlay.tier = null;
		spinWinOverlay.targetAmount = target;
		spinWinOverlay.targetDimAlpha = 0;
		spinWinOverlay.dimAlpha = 0;
		spinWinOverlay.contentAlpha = 1;
		spinWinOverlay.labelScale = 0;
		contentAlphaTween.set(1, { duration: 0 });
		labelScaleTween.set(0, { duration: 0 });

		const countUpPromise = beginCenterCountUp();
		spinWinOverlay.counting = true;
		startSpinWinCountUp(target, 0);
		try {
			await countUpPromise;
		} catch {
			return;
		}
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;

		spinWinOverlay.contentAlpha = 1;
		await skippableDelay(640);
		if (abortPresentation || !isWinPresentationCurrent(generation)) return;
		await fadeCelebrationOut();
	};

	onMount(() => {
		void ensurePrizeNumberFont().then(() => {
			fontReady = true;
		});
		markFxLabPresenterReady();
		return () => {
			markFxLabPresenterGone();
			cancelAnimationFrame(labelSyncRaf);
		};
	});

	context.eventEmitter.subscribeOnMount({
		spinWinPresent: async (e) => {
			if (spinWinOverlay.show || spinWinOverlay.counting) return;
			const generation = beginWinPresentation();
			presentationGeneration = generation;
			stateGame.lineWinPresentation = true;
			abortPresentation = false;
			skipToTotal = false;
			countUpSkipped = false;
			show = true;
			phase = 'lines';
			lines = e.lines.map((line) => ({ ...line, win: capBookAmount(line.win) }));
			totalWin = capBookAmount(e.totalWin);
			labOpts = e.lab ?? null;
			if (labOpts?.amountFloat) stateFxLab.amountFloatPreview = true;

			try {
				if (labOpts?.amountOnly === true) {
					if (
						e.totalWin > 0 &&
						!abortPresentation &&
						isWinPresentationCurrent(generation)
					) {
						await presentAmountOnlyPop(e.totalWin, generation);
					}
				} else {
					if (e.lines.length > 0 && !abortPresentation) {
						if (labOpts?.forceSlowCrawl === true) {
							await presentAllLines(e.lines, true);
						} else {
							await presentQuickPaylines(e.lines);
						}
						if (!skipToTotal && !abortPresentation && !labOpts?.skipCenterOverlay) {
							await presentWinHitSnapshot(e.lines, e.totalWin);
						}
					}

					const showCenterTotal =
						!labOpts?.skipCenterOverlay &&
						e.totalWin > 0 &&
						shouldShowCenterWinCountUp(e.totalWin);

					if (
						showCenterTotal &&
						!abortPresentation &&
						isWinPresentationCurrent(generation)
					) {
						await presentSpinTotal(e.totalWin, generation);
					}
				}
			} finally {
				if (presentationGeneration === generation) {
					eventEmitter.broadcast({
						type: 'spinWinPresentComplete',
						generation,
						labSession: labOpts?.labSession,
					});
					resetPresentation();
				}
			}
		},
		paylineWinSkip: finishPresentation,
		paylineWinHide: () => {
			abortPresentation = true;
			skipToTotal = false;
			resetPresentation();
		},
	});
</script>

{#if show && (phase === 'lines' || phase === 'snapshot')}
	<BoardContainer zIndex={zIndexes.paylineWin}>
		<Container zIndex={100}>
			{#each lines as line, lineIdx (lineIdx)}
				{@const rows = paylineRowsFor(line.lineIndex)}
				{#if rows}
					<Graphics
						draw={(g) =>
							drawPaylineConnector(
								g,
								rows,
								lineAlpha,
								phase === 'snapshot' ? BOARD_DIMENSIONS.x : visibleReels,
								lineDrawProgress,
							)}
					/>
				{/if}
			{/each}
		</Container>
	</BoardContainer>

	{#if showLineAmount && amountPopScale.current > 0.01 && amountLabels.length > 0}
		<BoardContainer zIndex={zIndexes.paylineWin}>
			<Container zIndex={PAYLINE_AMOUNT_Z} sortableChildren={true}>
				{#each amountLabels as label (label.key)}
					<Container
						x={roundPix(label.x)}
						y={roundPix(label.y + (amountFloatActive ? amountFloatY : 0))}
						scale={amountPopScale.current * (amountFloatActive ? amountFloatScale : 1)}
					>
						<Text
							anchor={0.5}
							text={bookEventAmountToWinCurrencyString(label.bookAmount)}
							style={amountLabelStyle}
							resolution={textRes}
						/>
					</Container>
				{/each}
			</Container>
		</BoardContainer>
	{/if}
{/if}

