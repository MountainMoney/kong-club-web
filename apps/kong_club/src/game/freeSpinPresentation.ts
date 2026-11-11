import { stateSlots } from 'utils-slots/src/stateSlots.svelte';

import type { Position } from './types';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { eventEmitter } from './eventEmitter';
import { beginFsIntroBlock, endFsIntroBlock } from './gameplayLock.svelte';
import {
	beginReelsRolling,
	endReelsRolling,
	skippableDelay,
	withForceSkipSpin,
} from './spinSkip.svelte';
import { waitForTimeout } from 'utils-shared/wait';
import {
	placeScattersOnBoard,
	resolveRevealAnticipation,
	stripScattersFromBoard,
} from './scatterAnticipation';
import { scaleFeatureMs } from './winPresentationTempo';
import { endFullBoardShrink } from './coinFeatureCover.svelte';
import { clearLastTileLevels } from './lastTileLevels';
import { playBlackScreenTransition } from './blackScreenTransition';
import { prepareBonusEntryUnderBlack } from './bonusIntroPresentation.svelte';

export const BONUS_SPINS_TOTAL = 10;
const SCATTER_ROLL_IN_SETTLE_MS = 450;

type AnimateSymbols = (args: { positions: Position[] }) => Promise<void>;

export const buyBonusTriggerPositions = (scatterCount: 3 | 4 | 5): Position[] => {
	const reels =
		scatterCount === 5 ? [0, 1, 2, 3, 4] : scatterCount === 3 ? [0, 2, 4] : [0, 2, 3, 5];
	return reels.map((reel) => ({ reel, row: 3 }));
};

const clearScatterRollIn = () => {
	stateGame.scatterRollInActive = false;
	stateGame.scatterRollInCount = 3;
	stateGame.board.forEach((reel) => {
		reel.reelState.anticipating = false;
		reel.reelState.anticipationLevel = 0;
	});
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
};

/** Buy-bonus entry — FS chrome without scatter intro card. */
export const presentBuyBonusFreeSpinEntry = async ({
	tier = 1,
}: {
	tier?: number;
} = {}) => {
	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
	await eventEmitter.broadcastAsync({ type: 'uiHide' });
	await eventEmitter.broadcastAsync({ type: 'transition' });
	eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	stateGame.gameType = 'freegame';
	stateGame.sessionBonusTier = tier === 3 ? 3 : tier === 1 ? 1 : 2;
	eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
	eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
	eventEmitter.broadcast({
		type: 'freeSpinCounterUpdate',
		current: undefined,
		total: BONUS_SPINS_TOTAL,
	});
	await eventEmitter.broadcastAsync({ type: 'uiShow' });
	await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
	eventEmitter.broadcast({ type: 'drawerFold' });
};

/** Buy path: land 3/4/5 ST, then intro. See clears the board; Hear/Madness keep it. */
export const presentBuyBonusFreeSpinTrigger = async ({
	scatterCount,
	animateSymbols,
	tier = 1,
	keepBoard = scatterCount >= 4,
}: {
	scatterCount: 3 | 4 | 5;
	animateSymbols: AnimateSymbols;
	tier?: number;
	keepBoard?: boolean;
}) => {
	const positions = buyBonusTriggerPositions(scatterCount);
	const sourceBoard = stripScattersFromBoard(
		stateGameDerived.boardRaw().map((reel) => reel.map((symbol) => ({ ...symbol }))),
	);
	const landingBoard = placeScattersOnBoard(sourceBoard, positions);
	const anticipation = resolveRevealAnticipation(landingBoard, undefined, { skip: true });

	stateGame.gameType = 'basegame';
	eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
	eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
	eventEmitter.broadcast({ type: 'boardShow' });
	eventEmitter.broadcast({ type: 'soundScatterCounterClear' });

	stateGame.scatterRollInActive = true;
	stateGame.scatterRollInCount = scatterCount;
	beginReelsRolling();
	if (!stateSlots.isPreSpinning) {
		void stateGameDerived.enhancedBoard.preSpin({});
	}
	try {
		await withForceSkipSpin(() =>
			stateGameDerived.enhancedBoard.spin({
				revealEvent: {
					index: 0,
					type: 'reveal',
					board: landingBoard,
					anticipation,
					gameType: 'basegame',
				},
			}),
		);
	} finally {
		stateSlots.isPreSpinning = false;
		endReelsRolling();
		clearScatterRollIn();
	}

	await skippableDelay(scaleFeatureMs(SCATTER_ROLL_IN_SETTLE_MS, 200));
	await presentScatterFreeSpinIntro({
		totalFs: BONUS_SPINS_TOTAL,
		positions,
		animateSymbols,
		tier,
		keepBoard,
	});
};

/** Scatter trigger — full intro with press-to-continue. */
export const presentScatterFreeSpinIntro = async ({
	totalFs,
	positions,
	animateSymbols,
	tier = 1,
	keepBoard: _keepBoard = false,
}: {
	totalFs: number;
	positions: Position[];
	animateSymbols: AnimateSymbols;
	tier?: number;
	/** Kept for callers. Entry no longer shrinks the board away before the bonus. */
	keepBoard?: boolean;
}) => {
	beginFsIntroBlock();
	try {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		// Leave the scatter-trigger board up. Shrinking it stuck every symbol at
		// scale 0, so the bonus opened on empty wood. The first bonus spin falls
		// this board out as the new one drops in.
		await animateSymbols({ positions });
		void _keepBoard;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await playBlackScreenTransition(
			() => {
				// Ryan Nov 10 (Q3 / polish group 2): the bonus look (and Speak's tile clear)
				// swaps under black. It used to swap before the fade, in view.
				stateGame.sessionBonusTier = tier === 3 ? 3 : tier === 1 ? 1 : 2;
				if (tier === 3) {
					clearLastTileLevels();
					eventEmitter.broadcast({ type: 'monkeyTilesClear' });
				}
				prepareBonusEntryUnderBlack(tier);
				eventEmitter.broadcast({ type: 'uiHide' });
			},
			{ keepBlackUntilIntro: true },
		);
		eventEmitter.broadcast({ type: 'freeSpinIntroShow', tier });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await waitForTimeout(32);
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: totalFs,
			tier,
		});
		eventEmitter.broadcast({ type: 'freeSpinIntroSkip' });
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	} finally {
		endFullBoardShrink();
		endFsIntroBlock();
	}
};
