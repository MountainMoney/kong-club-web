import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type ClusterWin = {
	symbol: SymbolName | 'BOARD';
	clusterSize: number;
	win: number;
	positions: Position[];
	meta: {
		globalMult: number;
		clusterMult: number;
		monkeyMult?: number;
		winWithoutMult: number;
		overlay: Position;
	};
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: ClusterWin[];
};

type BookEventSetTumbleWin = {
	index: number;
	type: 'updateTumbleWin';
	amount: number;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	explodingSymbols: Position[];
	newSymbols: RawSymbol[][];
	resultBoard?: RawSymbol[][];
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventUpdateLevelUpTiles = {
	index: number;
	type: 'updateLevelUpTiles';
	tileLevels: number[][];
	tileMultipliers: number[][];
	gameType: GameType;
	mode: string;
};

type BookEventProgressFill = {
	index: number;
	type: 'progressFill';
	value: number;
	threshold: number;
	mode: string;
	activationCount: number;
};

export type CoinFeatureItem = Position & {
	kind: 'coin' | 'multiplier' | 'collector' | 'tier_shift';
	symbol: 'CB' | 'CS' | 'CG' | 'XM' | 'CL' | 'TS';
	value: number;
	displayValue?: number;
	tileLevel: number;
	tileMultiplier: number;
	resolvedValue?: number;
	payout?: number;
	round?: number;
	/** spawn | multi | collect | regen — FE plays this instead of guessing. */
	action?: 'spawn' | 'multi' | 'collect' | 'regen';
	/** Face altered by MULTI/collect — keep exact integer, do not snap to pool. */
	powerResolved?: boolean;
	/** Collector absorbed this coin — FE vacuums it into the acting sack. */
	collected?: boolean;
	/** Fresh board after collector re-activate (full re-spawn). */
	reactivate?: boolean;
};

export type CoinFeatureActivation = {
	totalPayout?: number;
	totalMultiplier?: number;
	rounds: number | Array<{ index: number; items: CoinFeatureItem[] }>;
	items?: CoinFeatureItem[];
};

type BookEventBoardActivation = {
	index: number;
	type: 'boardActivation';
	activationWin: number;
	tileMultipliers: number[][];
	tileLevels?: number[][];
	coinFeature?: CoinFeatureActivation;
};

type BookEventCoinSeed = {
	index: number;
	type: 'coinSeed';
	seeds: {
		reel: number;
		row: number;
		symbol: string;
		seedLevel: number;
		multiplier: number;
	}[];
	tileLevels: number[][];
	tileMultipliers: number[][];
};

type BookEventScatterPayout = {
	index: number;
	type: 'scatterPayout';
	count: number;
	amount: number;
	positions: Position[];
};

type BookEventStickyWilds = {
	index: number;
	type: 'stickyWilds';
	positions: Position[];
};

/**
 * Mode-state payload. `kongClubMode` is the current name.
 * Compressed publish books still emit `monkeyMayhemMode` with the same fields.
 */
type BookEventModeStateFields = {
	index: number;
	state: string;
	mode: string;
	gameType: GameType;
};

type BookEventKongClubMode = BookEventModeStateFields & {
	type: 'kongClubMode';
};

type BookEventMonkeyMayhemMode = BookEventModeStateFields & {
	type: 'monkeyMayhemMode';
};

type BookEventWincap = {
	index: number;
	type: 'wincap';
	amount: number;
};

type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

type BookEventUpdateGlobalMult = {
	index: number;
	type: 'updateGlobalMult';
	globalMult: number;
};

type BookEventUpdateGrid = {
	index: number;
	type: 'updateGrid';
	gridMultipliers: number[][];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTumbleWin
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventFreeSpinRetrigger
	| BookEventUpdateFreeSpin
	| BookEventFreeSpinEnd
	| BookEventTumbleBoard
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventUpdateLevelUpTiles
	| BookEventProgressFill
	| BookEventBoardActivation
	| BookEventCoinSeed
	| BookEventScatterPayout
	| BookEventStickyWilds
	| BookEventKongClubMode
	| BookEventMonkeyMayhemMode
	| BookEventWincap
	| BookEventCreateBonusSnapshot
	| BookEventUpdateGlobalMult
	| BookEventUpdateGrid;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
