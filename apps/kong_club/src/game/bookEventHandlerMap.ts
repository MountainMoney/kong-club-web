import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';
import { PUBLIC_LOCAL_DEV } from 'envs';
import {
	canonicalizeBookMode,
	isFeatureSpinBetMode,
	isHeldFeatureBoardMode,
	isGambleBuyBetMode,
	isOneShotBuyBetMode,
	isPeakSpinBetMode,
	resetActiveBetModeAfterBuyFeature,
} from './betModes';

import { eventEmitter } from './eventEmitter';
import { mascotCuesForBookEvent, type MascotBookEvent } from './mascotDirector';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import {
	beginReelsRolling,
	beginTumbleAnimating,
	endReelsRolling,
	endTumbleAnimating,
	waitForTumbleIdle,
	skippableDelay,
	stateSpinSkip,
	withForceSkipSpin,
} from './spinSkip.svelte';
import { invalidateWinPresentation } from './spinWinOverlay.svelte';
import {
	BONUS_SPINS_TOTAL,
	buyBonusTriggerPositions,
	presentBuyBonusFreeSpinTrigger,
	presentScatterFreeSpinIntro,
} from './freeSpinPresentation';
import { bonusTierFromModeState } from './bonusIntroContent';
import { applyFreeSpinCounterState } from './bonusSnapshotRestore';
import {
	CLUSTER_CONNECT_STAGGER_MS,
	CLUSTER_CONNECTION_ACK_MS,
	CLUSTER_PRE_POOF_MS,
	CLUSTER_TILE_RANK_MS,
} from './clusterConnectionTempo';
import {
	clearClusterConnectMotion,
	startClusterConnectMotion,
} from './clusterConnectMotion.svelte';
import { scaleFeatureMs } from './winPresentationTempo';
import { waitForTimeout } from 'utils-shared/wait';
import { stateSlots } from 'utils-slots/src/stateSlots.svelte';
import { isTurboOrFaster, isTurboSpinHeld } from './spinSpeed.svelte';
import {
	runBonusSnapshotRestore,
} from './bonusSnapshotRestore';
import { isReplayActive } from './replayMode.svelte';
import {
	beginBonusOutroTransitionCover,
	releaseBonusOutroPlayfield,
} from './bonusOutroPresentation.svelte';
import {
	applyDeferredCoinSeeds,
	clearDeferredCoinSeeds,
	handleCoinSeedEvent,
	handleProgressFill,
} from './coinSeedDeferral';
import { clearLastTileLevels, rememberTileLevels } from './lastTileLevels';
import {
	beginHeldBoardDismiss,
	hasSittingCoinCells,
	isHeldBoardDismissActive,
} from './coinFeatureCover.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import {
	findLastModeStateBookEvent,
	isModeStateBookEvent,
	type ModeStateBookEvent,
} from './modeStateEvent';
import type { Position } from './types';
import { uniqueSymbolPositions } from './boardPositions';
import { scatterPositionsFromBoard, slamFromReelAfterFifthScatter } from './scatterAnticipation';
import { bookPositionToTilePosition } from './utils';
import { isValidSettleBoard } from './boardSettle';
import { simulateTumbleBoard } from './tumbleBoardSim';
import { capBookAmount, shouldShowCenterWinCountUp } from './winCountTier';
import {
	getBonusSessionWin,
	rememberBonusSessionWin,
	resetBonusSessionWin,
} from './bonusSessionWin';
import { resolveRevealAnticipation } from './scatterAnticipation';
import {
	clearDeferredFeatureActivation,
	deferFeatureActivation,
	deferFeatureProgressReset,
	deferFeatureTileWipe,
	deferFeatureTumbleWin,
	hasDeferredFeatureActivation,
	hasLaterTumbleBoard,
	isTileWipeEvent,
	peekDeferredFeatureActivation,
	takeDeferredFeatureActivation,
} from './featureSpinActivationDeferral';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateGame.gameType === 'freegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: uniqueSymbolPositions(positions),
	});
};

/** Gamble / organic books land ST on a real reveal, then emit bonus mode. Hear buy emits mode first. */
let bonusIntroPresentedThisRound = false;

const scatterPositionsFromRevealBoard = (board: BookEventOfType<'reveal'>['board']): Position[] =>
	scatterPositionsFromBoard(board);

const presentBonusIntroFromMode = async (
	bookEvent: ModeStateBookEvent,
	bookEvents: BookEvent[],
) => {
	const isBonusStart =
		bookEvent.state.startsWith('start_bonus_') || bookEvent.state.startsWith('organic_bonus_');
	if (!isBonusStart) return false;

	const modeIndex = bookEvents.indexOf(bookEvent);
	const landingReveal = _.findLast(
		modeIndex >= 0 ? bookEvents.slice(0, modeIndex) : bookEvents,
		(event) => event.type === 'reveal',
	) as BookEventOfType<'reveal'> | undefined;
	const landedPositions = landingReveal
		? scatterPositionsFromRevealBoard(landingReveal.board)
		: [];
	const tier = bonusTierFromModeState(bookEvent.state);

	// Landed 3/4/5 ST: See clears the board; Hear/Madness keep it. Do not re-spin.
	if (landingReveal && landedPositions.length >= 3) {
		await presentScatterFreeSpinIntro({
			totalFs: BONUS_SPINS_TOTAL,
			positions: landedPositions,
			animateSymbols,
			tier,
			keepBoard: tier !== 1,
		});
		bonusIntroPresentedThisRound = true;
		return true;
	}

	// Gamble already played a real first reveal. Intro on that board — never a second ST land.
	if (isGambleBuyBetMode(stateBet.activeBetModeKey)) {
		const scatterCount = bookEvent.state.includes('madness') ? 5 : 4;
		const positions =
			landedPositions.length > 0 ? landedPositions : buyBonusTriggerPositions(scatterCount);
		await presentScatterFreeSpinIntro({
			totalFs: BONUS_SPINS_TOTAL,
			positions,
			animateSymbols,
			tier,
			keepBoard: true,
		});
		bonusIntroPresentedThisRound = true;
		return true;
	}

	if (bookEvent.state.includes('madness')) {
		await presentBuyBonusFreeSpinTrigger({
			scatterCount: 5,
			animateSymbols,
			tier,
			keepBoard: true,
		});
		bonusIntroPresentedThisRound = true;
		return true;
	}
	if (bookEvent.state.includes('see')) {
		await presentBuyBonusFreeSpinTrigger({
			scatterCount: 3,
			animateSymbols,
			tier,
			keepBoard: false,
		});
		bonusIntroPresentedThisRound = true;
		return true;
	}
	if (!bookEvent.state.includes('hear')) return false;
	await presentBuyBonusFreeSpinTrigger({
		scatterCount: 4,
		animateSymbols,
		tier,
		keepBoard: true,
	});
	bonusIntroPresentedThisRound = true;
	return true;
};

const bookHasPendingBonusStart = (bookEvents: BookEvent[], fromEvent: BookEvent) => {
	const start = bookEvents.indexOf(fromEvent);
	const rest = start >= 0 ? bookEvents.slice(start + 1) : bookEvents;
	return rest.some(
		(event) =>
			isModeStateBookEvent(event) &&
			(event.state.startsWith('start_bonus_') || event.state.startsWith('organic_bonus_')),
	);
};

const clusterWinFloaterPayload = (win: BookEventOfType<'winInfo'>['wins'][number]) => ({
	amount: capBookAmount(win.win),
	reel: win.meta.overlay.reel,
	row: win.meta.overlay.row,
});

/** Cluster wins only — excludes synthetic BOARD activation line on progress fill. */
const countClusterConnections = (wins: BookEventOfType<'winInfo'>['wins']) =>
	wins.filter((win) => win.symbol !== 'BOARD').length;

const logClusterWins = (wins: BookEventOfType<'winInfo'>['wins']) => {
	if (!import.meta.env.DEV) return;
	for (const win of wins) {
		if (win.symbol === 'BOARD') continue;
		const positions = win.positions.map((pos) => `[${pos.reel},${pos.row}]`).join(', ');
		const size = win.positions.length;
		console.log(`Cluster found: ${win.symbol} size ${size} at positions ${positions}`);
	}
};

const MAX_BOARD_ACTIVATIONS_PER_SPIN = 3;

let skipWinPresentationForTumble = false;
/** Snap tumble counter when center overlay already presented this activation payout. */
let skipTumbleWinAnimationForActivation = false;
let boardActivationPlayedThisSpin = false;
let boardActivationsThisSpin = 0;
/** Highest spin-win amount already shown via center overlay this spin (book units). */
let lastPresentedSpinWinAmount = 0;
/** Guards duplicate spinWinPresent (activation + setWin used to both fire). */
let centerWinPopupShownThisSpin = false;

/** Coin feature can fire max-win mid-vacuum; setWin / wincap must not replay it. */
export const markCenterWinPopupShown = (bookAmount: number) => {
	centerWinPopupShownThisSpin = true;
	lastPresentedSpinWinAmount = Math.max(lastPresentedSpinWinAmount, bookAmount);
};
const clearBaseSpinMechanics = () => {
	clearDeferredCoinSeeds();
	clearLastTileLevels();
	eventEmitter.broadcast({ type: 'monkeyMechanicsReset' });
};

const restoreBoardForReveal = () => {
	eventEmitter.broadcast({ type: 'tumbleBoardReset' });
	eventEmitter.broadcast({ type: 'tumbleBoardHide' });
	eventEmitter.broadcast({ type: 'boardShow' });
};

let progressFillsShownEarly = 0;
let progressFillsConsumed = 0;
let peakBarTeasedThisSpin = false;

const resetProgressFillSync = () => {
	progressFillsShownEarly = 0;
	progressFillsConsumed = 0;
	peakBarTeasedThisSpin = false;
};

const hasLaterBoardActivation = (bookEvents: BookEvent[], current: BookEvent) => {
	const index = bookEvents.indexOf(current);
	return index >= 0 && bookEvents.slice(index + 1).some((event) => event.type === 'boardActivation');
};

const playPeakBarTease = async (hit: boolean) => {
	if (peakBarTeasedThisSpin) return;
	peakBarTeasedThisSpin = true;
	await eventEmitter.broadcastAsync({ type: 'peakBarTease', hit });
};

const applyProgressFillVisual = (bookEvent: BookEventOfType<'progressFill'>) => {
	handleProgressFill(bookEvent);
	eventEmitter.broadcast({ type: 'monkeyProgressUpdate', payload: bookEvent });
};

/** progressFill events that belong to this winInfo (before the next tumble / win). */
const progressFillsForWinInfo = (bookEvents: BookEvent[], winInfo: BookEvent) => {
	const start = bookEvents.indexOf(winInfo);
	if (start < 0) return 0;
	let count = 0;
	for (const event of bookEvents.slice(start + 1)) {
		if (event.type === 'tumbleBoard' || event.type === 'winInfo') break;
		if (event.type === 'progressFill' && event.value > 0) count += 1;
	}
	return count;
};

/** Move the bar with the cluster pulse — do not wait for tumbleBoard. */
const applyProgressFillOnConnection = (bookEvents: BookEvent[]) => {
	if (isPeakSpinBetMode(stateBet.activeBetModeKey)) return;
	const fills = bookEvents.filter(
		(event): event is BookEventOfType<'progressFill'> => event.type === 'progressFill',
	);
	let index = Math.max(progressFillsShownEarly, progressFillsConsumed);
	while (index < fills.length) {
		const next = fills[index];
		index += 1;
		progressFillsShownEarly = index;
		if (next.value <= 0) continue;
		applyProgressFillVisual(next);
		return;
	}
};

const clusterSortKey = (win: BookEventOfType<'winInfo'>['wins'][number]) => {
	const reel = win.meta?.overlay?.reel ?? Math.min(...win.positions.map((pos) => pos.reel));
	const row = win.meta?.overlay?.row ?? Math.min(...win.positions.map((pos) => pos.row));
	return reel * 10 + row;
};

const sortClustersLeftToRight = (wins: BookEventOfType<'winInfo'>['wins']) =>
	[...wins].sort((a, b) => clusterSortKey(a) - clusterSortKey(b));

const pulseClusterTiles = (win: BookEventOfType<'winInfo'>['wins'][number]) => {
	const positions = uniqueSymbolPositions(win.positions.map(bookPositionToTilePosition));
	if (positions.length === 0) return;
	eventEmitter.broadcast({ type: 'monkeyTileWinPulse', positions });
};

const playBoardActivation = async (bookEvent: BookEventOfType<'boardActivation'>) => {
	if (boardActivationPlayedThisSpin && stateGame.gameType === 'basegame') return;
	if (
		stateGame.gameType === 'freegame' &&
		boardActivationsThisSpin >= MAX_BOARD_ACTIVATIONS_PER_SPIN
	) {
		return;
	}
	boardActivationPlayedThisSpin = true;
	boardActivationsThisSpin += 1;
	const hasCoinPayout =
		Boolean(bookEvent.coinFeature) || bookEvent.activationWin > 0;
	if (hasCoinPayout) {
		markCenterWinPopupShown(capBookAmount(bookEvent.activationWin || 0));
	}
	applyDeferredCoinSeeds(true);
	skipTumbleWinAnimationForActivation = false;
	eventEmitter.broadcast({ type: 'paylineWinHide' });
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	if (bookEvent.tileLevels) {
		rememberTileLevels(bookEvent.tileLevels, bookEvent.tileMultipliers);
	}
	await eventEmitter.broadcastAsync({
		type: 'monkeyBoardActivation',
		payload: bookEvent,
	});
	const activationWin = capBookAmount(bookEvent.activationWin);
	if (activationWin > 0) {
		skipTumbleWinAnimationForActivation = true;
		lastPresentedSpinWinAmount = Math.max(lastPresentedSpinWinAmount, activationWin);
	}
};

const applyTumbleWinAmount = (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
	skipTumbleWinAnimationForActivation = false;
	skipWinPresentationForTumble = false;
	if (bookEvent.amount <= 0) return;
	if (stateGame.gameType === 'freegame') {
		stateBet.winBookEventAmount = capBookAmount(getBonusSessionWin() + bookEvent.amount);
		return;
	}
	stateBet.winBookEventAmount = capBookAmount(bookEvent.amount);
};

/** Feature Spin + See/Hear bonus — not a normal base spin, not PEAK. */
const shouldDeferActivationUntilCascadeIdle = () =>
	isFeatureSpinBetMode(stateBet.activeBetModeKey) ||
	stateGame.gameType === 'freegame' ||
	isOneShotBuyBetMode(stateBet.activeBetModeKey) ||
	isGambleBuyBetMode(stateBet.activeBetModeKey);

const applyLevelUpTiles = async (bookEvent: BookEventOfType<'updateLevelUpTiles'>) => {
	rememberTileLevels(bookEvent.tileLevels, bookEvent.tileMultipliers);
	eventEmitter.broadcast({ type: 'monkeyTilesUpdate', payload: bookEvent });
	await skippableDelay(scaleFeatureMs(CLUSTER_TILE_RANK_MS, 35));
};

const flushDeferredFeatureActivation = async () => {
	const { activation, tumbleWin, progressReset, tileWipe } = takeDeferredFeatureActivation();
	if (!activation) return;
	await skippableDelay(scaleFeatureMs(CLUSTER_CONNECTION_ACK_MS, 120));
	await playBoardActivation(activation);
	if (tumbleWin) applyTumbleWinAmount(tumbleWin);
	if (progressReset) applyProgressFillVisual(progressReset);
	if (
		tileWipe &&
		!isHeldFeatureBoardMode(stateBet.activeBetModeKey) &&
		stateGame.gameType !== 'freegame'
	) {
		await applyLevelUpTiles(tileWipe);
	}
};

/** Fire-and-forget. The book runner must not await the mascot clip. */
const emitMascotCues = (bookEvent: MascotBookEvent) => {
	const cues = mascotCuesForBookEvent(bookEvent, {
		countDeadSpins: stateGame.gameType !== 'freegame',
	});
	for (const cue of cues) eventEmitter.broadcast({ type: 'mascotCue', cue });
};

/** Same playback for `kongClubMode` and legacy `monkeyMayhemMode`. */
const withCanonicalMode = <T extends { mode: string }>(bookEvent: T): T => {
	const mode = canonicalizeBookMode(bookEvent.mode);
	return mode === bookEvent.mode ? bookEvent : { ...bookEvent, mode };
};

const handleModeStateEvent = async (
	bookEvent: ModeStateBookEvent,
	{ bookEvents }: BookEventContext,
) => {
	bookEvent = withCanonicalMode(bookEvent);
	emitMascotCues(bookEvent);
	eventEmitter.broadcast({ type: 'monkeyModeState', payload: bookEvent });
	const isBonusStart =
		bookEvent.state.startsWith('start_bonus_') || bookEvent.state.startsWith('organic_bonus_');
	if (isBonusStart) {
		clearDeferredCoinSeeds();
		eventEmitter.broadcast({ type: 'monkeyTilesClear' });
	}
	await presentBonusIntroFromMode(bookEvent, bookEvents);
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		emitMascotCues(bookEvent);
		boardActivationPlayedThisSpin = false;
		boardActivationsThisSpin = 0;
		lastPresentedSpinWinAmount = 0;
		centerWinPopupShownThisSpin = false;
		if (bookEvent.gameType !== 'freegame') {
			resetProgressFillSync();
		}
		clearDeferredFeatureActivation();
		skipTumbleWinAnimationForActivation = false;
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		invalidateWinPresentation();
		skipWinPresentationForTumble = false;
		clearClusterConnectMotion();
		eventEmitter.broadcast({ type: 'paylineWinHide' });
		if (
			hasSittingCoinCells() &&
			!isHeldBoardDismissActive() &&
			!isTurboOrFaster() &&
			!stateBet.isTurbo
		) {
			beginHeldBoardDismiss();
			eventEmitter.broadcast({ type: 'heldBoardSpinAway' });
		}
		if (
			bookEvent.gameType === 'basegame' &&
			!isPeakSpinBetMode(stateBet.activeBetModeKey) &&
			!isHeldBoardDismissActive()
		) {
			clearBaseSpinMechanics();
		}
		if (bookEvent.gameType !== 'freegame') {
			resetBonusSessionWin();
		}
		restoreBoardForReveal();
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			if (!PUBLIC_LOCAL_DEV) {
				recordBookEvent({ bookEvent });
			}
		}

		if (bookEvent.gameType === 'basegame') {
			bonusIntroPresentedThisRound = false;
		}
		const alreadyInBonus = stateGame.gameType === 'freegame';
		stateGame.gameType = bookEvent.gameType;
		// Freegame + one-shot buy: actor skips preSpin so this reveal owns leave→fall-in.
		if (
			(bookEvent.gameType === 'freegame' || isOneShotBuyBetMode(stateBet.activeBetModeKey)) &&
			!stateSlots.isPreSpinning &&
			!isTurboSpinHeld()
		) {
			void stateGameDerived.enhancedBoard.preSpin({});
		}
		beginReelsRolling();
		// Subsequent FS spins skip tease. Entry / See / Hear / Gamble buys use real 2-ST tease.
		const skipBonusTease = alreadyInBonus;
		await withForceSkipSpin(() =>
			stateGameDerived.enhancedBoard.spin({
				revealEvent: {
					...bookEvent,
					anticipation: resolveRevealAnticipation(
						bookEvent.board,
						bookEvent.anticipation,
						skipBonusTease ? { skip: true } : undefined,
					),
					slamFromReel: skipBonusTease
						? undefined
						: slamFromReelAfterFifthScatter(bookEvent.board),
				},
			}),
		);
		endReelsRolling();
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
		if (
			isPeakSpinBetMode(stateBet.activeBetModeKey) &&
			!bookEvents.some((event) => event.type === 'tumbleBoard') &&
			!bookEvents.some((event) => event.type === 'boardActivation')
		) {
			await playPeakBarTease(false);
		}
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>, { bookEvents }: BookEventContext) => {
		emitMascotCues(bookEvent);
		if (isPeakSpinBetMode(stateBet.activeBetModeKey)) return;
		await waitForTumbleIdle();
		logClusterWins(bookEvent.wins);

		const clusterWins = bookEvent.wins.filter((win) => win.symbol !== 'BOARD');
		skipWinPresentationForTumble = countClusterConnections(clusterWins) <= 1;

		if (clusterWins.length === 0) return;

		const inBonus = stateGame.gameType === 'freegame';
		const fillsThisTumble = progressFillsForWinInfo(bookEvents, bookEvent);
		const applyFillPerCluster = inBonus || fillsThisTumble > 1;
		let fillsApplied = 0;
		if (!applyFillPerCluster) applyProgressFillOnConnection(bookEvents);
		const clusters = sortClustersLeftToRight(clusterWins);
		for (let i = 0; i < clusters.length; i += 1) {
			const win = clusters[i]!;
			pulseClusterTiles(win);
			startClusterConnectMotion(
				uniqueSymbolPositions(win.positions.map(bookPositionToTilePosition)),
				{ snap: stateSpinSkip.forceSkip },
			);
			void animateSymbols(uniqueSymbolPositions(win.positions));
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			if (applyFillPerCluster && fillsApplied < fillsThisTumble) {
				applyProgressFillOnConnection(bookEvents);
				fillsApplied += 1;
			}
			if (!inBonus) {
				void eventEmitter.broadcastAsync({
					type: 'showClusterWinAmounts',
					wins: [clusterWinFloaterPayload(win)],
				});
			}
			if (i < clusters.length - 1) {
				await skippableDelay(scaleFeatureMs(CLUSTER_CONNECT_STAGGER_MS, 40));
			}
		}

		await skippableDelay(scaleFeatureMs(CLUSTER_CONNECTION_ACK_MS, 120));
	},
	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		const pendingActivation = peekDeferredFeatureActivation();
		if (pendingActivation && bookEvent.amount >= (pendingActivation.activationWin ?? 0)) {
			deferFeatureTumbleWin(bookEvent);
			return;
		}
		applyTumbleWinAmount(bookEvent);
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		if (hasDeferredFeatureActivation()) {
			await flushDeferredFeatureActivation();
		}
		const amount = rememberBonusSessionWin(bookEvent.amount);
		stateBet.winBookEventAmount = amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>, { bookEvents }: BookEventContext) => {
		if (bonusIntroPresentedThisRound) return;
		emitMascotCues(bookEvent);
		const lastMode = findLastModeStateBookEvent(bookEvents);
		clearDeferredCoinSeeds();
		eventEmitter.broadcast({ type: 'monkeyTilesClear' });
		await presentScatterFreeSpinIntro({
			totalFs: bookEvent.totalFs,
			positions: bookEvent.positions,
			animateSymbols,
			tier: bonusTierFromModeState(lastMode?.state),
		});
		bonusIntroPresentedThisRound = true;
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		emitMascotCues(bookEvent);
		await presentScatterFreeSpinIntro({
			totalFs: bookEvent.totalFs,
			positions: bookEvent.positions,
			animateSymbols,
		});
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		applyFreeSpinCounterState(bookEvent.amount, bookEvent.total);
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},
	updateGlobalMult: async (bookEvent: BookEventOfType<'updateGlobalMult'>) => {
		if (bookEvent.globalMult === 1) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		}
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		emitMascotCues(bookEvent);
		if (hasDeferredFeatureActivation()) {
			await flushDeferredFeatureActivation();
		}
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		// Keep freegame chrome + sessionBonusTier through Total Win art (Hear = tier 2).
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'monkeyMechanicsReset' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
		});
		if (isReplayActive()) {
			eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
			stateGame.gameType = 'basegame';
			stateGame.sessionBonusTier = undefined;
			releaseBonusOutroPlayfield();
			return;
		}
		await eventEmitter.broadcastAsync({ type: 'freeSpinOutroFadeOut' });
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		stateGame.gameType = 'basegame';
		stateGame.sessionBonusTier = undefined;
		beginBonusOutroTransitionCover();
		resetActiveBetModeAfterBuyFeature();
		await eventEmitter.broadcastAsync({ type: 'transition' });
		releaseBonusOutroPlayfield();
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>, { bookEvents }: BookEventContext) => {
		while (isHeldBoardDismissActive()) {
			await waitForTimeout(16);
		}
		if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
			const settleBoard =
				bookEvent.resultBoard && isValidSettleBoard(bookEvent.resultBoard)
					? bookEvent.resultBoard
					: simulateTumbleBoard(stateGameDerived.boardRaw(), bookEvent);
			eventEmitter.broadcast({
				type: 'boardSettle',
				board: settleBoard,
			});
			if (hasDeferredFeatureActivation() && !hasLaterTumbleBoard(bookEvents, bookEvent)) {
				await flushDeferredFeatureActivation();
			}
			return;
		}
		await waitForTumbleIdle();
		beginTumbleAnimating();
		clearClusterConnectMotion();
		const explodingPositions = uniqueSymbolPositions(bookEvent.explodingSymbols);
		try {
			eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
			eventEmitter.broadcast({ type: 'tumbleBoardShow' });
			eventEmitter.broadcast({
				type: 'tumbleBoardInit',
				addingBoard: bookEvent.newSymbols,
				resultBoard: bookEvent.resultBoard,
			});
			// Paint tumble overlay first so hiding the static board does not flash empty wood.
			await waitForTimeout(16);
			eventEmitter.broadcast({ type: 'boardHide' });
			if (explodingPositions.length > 0) {
				await skippableDelay(scaleFeatureMs(CLUSTER_PRE_POOF_MS, 15));
			}
			eventEmitter.broadcast({ type: 'monkeyTileWinPulseClear' });
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_explosion_a' });
			await eventEmitter.broadcastAsync({
				type: 'tumbleBoardExplode',
				explodingPositions,
			});
			eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
			await eventEmitter.broadcastAsync({
				type: 'tumbleBoardSlideDown',
			});
			const prevBoard = stateGameDerived.boardRaw();
			const settleBoard =
				bookEvent.resultBoard && isValidSettleBoard(bookEvent.resultBoard)
					? bookEvent.resultBoard
					: simulateTumbleBoard(prevBoard, bookEvent);
			eventEmitter.broadcast({
				type: 'boardSettle',
				board: settleBoard,
			});
		} finally {
			eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
			// Same tick: reveal settled board, then drop tumble. Waiting a frame stacked two
			// DropShadowFilter layers and flashed a dark blink after the last cascade.
			eventEmitter.broadcast({ type: 'boardShow' });
			eventEmitter.broadcast({ type: 'tumbleBoardHide' });
			eventEmitter.broadcast({ type: 'tumbleBoardReset' });
			endTumbleAnimating();
		}
		if (hasDeferredFeatureActivation() && !hasLaterTumbleBoard(bookEvents, bookEvent)) {
			if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
				await playPeakBarTease(true);
			}
			await flushDeferredFeatureActivation();
		} else if (
			isPeakSpinBetMode(stateBet.activeBetModeKey) &&
			!hasLaterTumbleBoard(bookEvents, bookEvent) &&
			!hasLaterBoardActivation(bookEvents, bookEvent)
		) {
			await playPeakBarTease(false);
		}
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>, { bookEvents }: BookEventContext) => {
		if (hasDeferredFeatureActivation()) {
			await flushDeferredFeatureActivation();
		}
		// Landing 4/5 ST still has a base setWin — do not play it before the bonus intro.
		if (bookHasPendingBonusStart(bookEvents, bookEvent)) return;
		// Single end-of-spin center popup owner (do not also present from boardActivation).
		const amount = capBookAmount(bookEvent.amount);
		if (amount <= 0) return;
		if (stateGame.gameType === 'freegame') return;
		if (centerWinPopupShownThisSpin) return;
		lastPresentedSpinWinAmount = Math.max(lastPresentedSpinWinAmount, amount);
		if (!shouldShowCenterWinCountUp(amount)) return;
		centerWinPopupShownThisSpin = true;
		await eventEmitter.broadcastAsync({
			type: 'spinWinPresent',
			totalWin: amount,
			lines: [],
		});
	},
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		const amount = capBookAmount(bookEvent.amount);
		lastPresentedSpinWinAmount = Math.max(lastPresentedSpinWinAmount, amount);
		if (centerWinPopupShownThisSpin) return;
		const winLevelData = winLevelMap[10];
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		winLevelSoundsPlay({ winLevelData });
		centerWinPopupShownThisSpin = true;
		await eventEmitter.broadcastAsync({
			type: 'spinWinPresent',
			totalWin: amount,
			lines: [],
		});
		winLevelSoundsStop();
	},
	updateGrid: async (_bookEvent: BookEventOfType<'updateGrid'>) => {
		// No per-cell multiplier overlay — Level-Up Tiles use tier chrome only.
		eventEmitter.broadcast({ type: 'multiplierGridHide' });
		eventEmitter.broadcast({ type: 'multiplierGridClear' });
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		emitMascotCues(bookEvent);
		eventEmitter.broadcast({ type: 'multiplierGridClear' });
		eventEmitter.broadcast({ type: 'multiplierGridHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		if (stateGame.gameType === 'basegame') {
			resetActiveBetModeAfterBuyFeature();
		}
	},
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		await runBonusSnapshotRestore(bookEvent.bookEvents);
	},
	updateLevelUpTiles: async (bookEvent: BookEventOfType<'updateLevelUpTiles'>) => {
		bookEvent = withCanonicalMode(bookEvent);
		if (hasDeferredFeatureActivation() && isTileWipeEvent(bookEvent)) {
			deferFeatureTileWipe(bookEvent);
			return;
		}
		if (
			isTileWipeEvent(bookEvent) &&
			(isHeldFeatureBoardMode(stateBet.activeBetModeKey) ||
				stateGame.gameType === 'freegame')
		) {
			return;
		}
		await applyLevelUpTiles(bookEvent);
	},
	progressFill: async (bookEvent: BookEventOfType<'progressFill'>) => {
		bookEvent = withCanonicalMode(bookEvent);
		progressFillsConsumed += 1;
		if (progressFillsConsumed <= progressFillsShownEarly) return;
		if (isPeakSpinBetMode(stateBet.activeBetModeKey)) return;
		if (hasDeferredFeatureActivation() && bookEvent.value <= 0) {
			deferFeatureProgressReset(bookEvent);
			return;
		}
		applyProgressFillVisual(bookEvent);
	},
	boardActivation: async (bookEvent: BookEventOfType<'boardActivation'>, { bookEvents }: BookEventContext) => {
		if (
			shouldDeferActivationUntilCascadeIdle() &&
			hasLaterTumbleBoard(bookEvents, bookEvent)
		) {
			deferFeatureActivation(bookEvent);
			return;
		}
		if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
			await playPeakBarTease(true);
		}
		if (isFeatureSpinBetMode(stateBet.activeBetModeKey)) {
			await skippableDelay(scaleFeatureMs(CLUSTER_CONNECTION_ACK_MS, 120));
		}
		await playBoardActivation(bookEvent);
	},
	coinSeed: async (bookEvent: BookEventOfType<'coinSeed'>) => {
		eventEmitter.broadcast({ type: 'monkeyCoinSeed', payload: bookEvent });
		handleCoinSeedEvent(bookEvent);
	},
	scatterPayout: async (bookEvent: BookEventOfType<'scatterPayout'>) => {
		eventEmitter.broadcast({ type: 'monkeyScatterPayout', payload: bookEvent });
	},
	stickyWilds: async (bookEvent: BookEventOfType<'stickyWilds'>) => {
		eventEmitter.broadcast({ type: 'monkeyStickyWilds', payload: bookEvent });
	},
	kongClubMode: handleModeStateEvent,
	monkeyMayhemMode: handleModeStateEvent,
};
