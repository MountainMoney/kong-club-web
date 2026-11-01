import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { getMonkeyBoardLayout } from './kongClubLayout';
import { getReelSpinOptions, getScatterRollInSpinOptions } from './spinSpeed.svelte';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_ANTICIPATED,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

/** Tease-stream faces only — never ST / MW / coins. */
const TEASE_STREAM_NAMES = ['A', 'K', 'Q', 'J', 'T', 'BA', 'GR', 'OR', 'CO', 'LE'] as const;
let teaseStreamCursor = 0;
const nextTeaseStreamSymbol = (): RawSymbol => {
	const name = TEASE_STREAM_NAMES[teaseStreamCursor % TEASE_STREAM_NAMES.length] ?? 'A';
	teaseStreamCursor += 1;
	return { name };
};

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'ST') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()],
		});
	}

	if (rawSymbol.name === 'MW') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForCascading({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSymbolLand,
		getTeaseRawSymbol: nextTeaseStreamSymbol,
	});

	reel.reelState.spinOptions = () => {
		if (stateGame.scatterRollInActive) {
			const rollIn = getScatterRollInSpinOptions(stateGame.scatterRollInCount);
			if (reel.reelState.spinType !== 'anticipated') return rollIn;
			return {
				...rollIn,
				reelAnticipationHangMs: SPIN_OPTIONS_ANTICIPATED.reelAnticipationHangMs,
				reelAnticipationHangMsMin: SPIN_OPTIONS_ANTICIPATED.reelAnticipationHangMsMin,
				reelAnticipationHangMsMax: SPIN_OPTIONS_ANTICIPATED.reelAnticipationHangMsMax,
				reelAnticipationStaggerMs: SPIN_OPTIONS_ANTICIPATED.reelAnticipationStaggerMs,
				reelAnticipationStaggerMsMin: SPIN_OPTIONS_ANTICIPATED.reelAnticipationStaggerMsMin,
				reelAnticipationStaggerMsMax: SPIN_OPTIONS_ANTICIPATED.reelAnticipationStaggerMsMax,
			};
		}
		if (reel.reelState.spinType === 'anticipated') return SPIN_OPTIONS_ANTICIPATED;
		if (reel.reelState.spinType === 'fast') return getReelSpinOptions('fast');
		return getReelSpinOptions('normal');
	};

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type TumbleSymbol = {
	symbolY: Tween<number>;
	symbolScaleX: Tween<number>;
	symbolScaleY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export const stateGame = $state({
	/** Active bonus tier (see=1, hear=2) for branded FS outro art. */
	sessionBonusTier: undefined as 1 | 2 | 3 | undefined,
	board,
	gameType: 'basegame' as GameType,
	tumbleBoardAdding: [] as TumbleSymbol[][],
	tumbleBoardBase: [] as TumbleSymbol[][],
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	/** FF-style scatter / buy-bonus roll-in — uses getScatterRollInSpinOptions. */
	scatterRollInActive: false,
	scatterRollInCount: 3,
	/** True while FF-style center win presentation is active (skip guard). */
	lineWinPresentation: false,
});

const boardLayout = () => {
	const main = stateLayoutDerived.mainLayout();
	const layoutType = stateLayoutDerived.layoutType();
	return getMonkeyBoardLayout(layoutType, main);
};

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const tumbleBoardCombined = () => {
	const tumbleBoardCombined = stateGame.tumbleBoardBase.map((tumbleReelBase, reelIndex) => {
		const tumbleReelAdding = stateGame.tumbleBoardAdding[reelIndex] ?? [];
		return [...tumbleReelAdding, ...tumbleReelBase];
	});

	return tumbleBoardCombined;
};

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard({ overlapFallInWithFallOut: true });
const enhancedBoard = enhanceBoard({ board: stateGame.board });

// win levels

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	tumbleBoardCombined,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
