import _ from 'lodash';

import { stateBet, stateUi } from 'state-shared';

import { handleProgressFill } from './coinSeedDeferral';
import { bonusTierFromModeState } from './bonusIntroContent';
import { eventEmitter } from './eventEmitter';
import { awaitBuyBonusPresentationReady } from './spinSkip.svelte';
import { stateGame } from './stateGame.svelte';
import type { BookEvent, BookEventOfType } from './typesBookEvent';
import type { RawSymbol } from './types';
import { rememberBonusSessionWin } from './bonusSessionWin';
import {
	findLastModeStateBookEvent,
	MODE_STATE_EVENT_TYPES,
	type ModeStateBookEvent,
} from './modeStateEvent';

/** Book event types folded into createBonusSnapshot before resume playback. */
export const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	...MODE_STATE_EVENT_TYPES,
	'updateLevelUpTiles',
	'updateGlobalMult',
	'updateFreeSpin',
	'setTotalWin',
	'progressFill',
] as const;

const SNAPSHOT_RESERVED_TYPES = new Set<string>(BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT);

export const isSnapshotReservedBookEvent = (event: { type: string }) =>
	SNAPSHOT_RESERVED_TYPES.has(event.type);

/** Ordered restore phases — board before tiles. */
export const SNAPSHOT_RESTORE_STEP_ORDER = [
	'bonusEntry',
	'board',
	'freeSpinCounter',
	'tiles',
	'totalWin',
	'progressFill',
	'presentationReady',
] as const;

export type SnapshotRestoreStep = (typeof SNAPSHOT_RESTORE_STEP_ORDER)[number];

const awaitRestoreEvent = <T extends Parameters<typeof eventEmitter.broadcastAsync>[0]>(
	emitterEvent: T,
) => eventEmitter.broadcastAsync(emitterEvent);

const findLastBookEvent = <T extends BookEvent['type']>(bookEvents: BookEvent[], type: T) =>
	_.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as BookEventOfType<T> | undefined;

export const applyFreeSpinCounterState = (
	current: number | undefined,
	total: number | undefined,
) => {
	stateUi.freeSpinCounterShow = true;
	if (current !== undefined) stateUi.freeSpinCounterCurrent = current;
	if (total !== undefined) stateUi.freeSpinCounterTotal = total;
};

/** Minimal FS chrome for resume — no scatter intro or buy transition replay. */
export const restoreBonusSnapshotEntry = async (
	modeEvent: ModeStateBookEvent | undefined,
	gameType: 'basegame' | 'freegame' | undefined,
) => {
	await awaitRestoreEvent({ type: 'freeSpinIntroHide' });
	await awaitRestoreEvent({ type: 'freeSpinOutroHide' });
	eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });

	const resolvedGameType = gameType ?? modeEvent?.gameType ?? 'freegame';
	stateGame.gameType = resolvedGameType;
	if (modeEvent) {
		stateGame.sessionBonusTier = bonusTierFromModeState(modeEvent.state);
	}

	if (resolvedGameType === 'freegame') {
		await awaitRestoreEvent({ type: 'boardFrameGlowShow' });
	} else {
		await awaitRestoreEvent({ type: 'boardFrameGlowHide' });
	}

	if (modeEvent) {
		await awaitRestoreEvent({ type: 'monkeyModeState', payload: modeEvent });
	}
};

export const restoreBoardForSnapshot = async (
	board: RawSymbol[][],
	gameType: 'basegame' | 'freegame',
) => {
	stateGame.gameType = gameType;
	await awaitRestoreEvent({ type: 'tumbleBoardReset' });
	await awaitRestoreEvent({ type: 'tumbleBoardHide' });
	await awaitRestoreEvent({ type: 'boardShow' });
	await awaitRestoreEvent({ type: 'boardSettle', board });
};

export const restoreFreeSpinCounter = async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
	applyFreeSpinCounterState(bookEvent.amount, bookEvent.total);
	await awaitRestoreEvent({ type: 'freeSpinCounterShow' });
	await awaitRestoreEvent({
		type: 'freeSpinCounterUpdate',
		current: bookEvent.amount,
		total: bookEvent.total,
	});
};

export const restoreTileLevels = async (bookEvent: BookEventOfType<'updateLevelUpTiles'>) => {
	await awaitRestoreEvent({ type: 'monkeyTilesUpdate', payload: bookEvent });
};

export const restoreTotalWin = async (bookEvent: BookEventOfType<'setTotalWin'>) => {
	stateBet.winBookEventAmount = rememberBonusSessionWin(bookEvent.amount);
};

export const restoreGlobalMultiplier = async (bookEvent: BookEventOfType<'updateGlobalMult'>) => {
	if (bookEvent.globalMult === 1) {
		await awaitRestoreEvent({ type: 'tumbleWinAmountReset' });
	}
};

export const restoreProgressFill = async (bookEvent: BookEventOfType<'progressFill'>) => {
	handleProgressFill(bookEvent);
	await awaitRestoreEvent({ type: 'monkeyProgressUpdate', payload: bookEvent });
};

/** Pure plan of which restore phases will run for a snapshot payload. */
export const buildSnapshotRestorePlan = (bookEvents: BookEvent[]): SnapshotRestoreStep[] => {
	const plan: SnapshotRestoreStep[] = ['bonusEntry'];

	if (findLastBookEvent(bookEvents, 'reveal')) plan.push('board');
	if (findLastBookEvent(bookEvents, 'updateFreeSpin')) plan.push('freeSpinCounter');
	if (findLastBookEvent(bookEvents, 'updateLevelUpTiles')) plan.push('tiles');
	if (findLastBookEvent(bookEvents, 'setTotalWin')) plan.push('totalWin');
	if (findLastBookEvent(bookEvents, 'progressFill')) plan.push('progressFill');

	plan.push('presentationReady');
	return plan;
};

/** Restore mid-bonus presentation from reserved book events before resume playback. */
export const runBonusSnapshotRestore = async (bookEvents: BookEvent[]) => {
	const lastKongClubModeEvent = findLastModeStateBookEvent(bookEvents);
	const lastRevealEvent = findLastBookEvent(bookEvents, 'reveal');
	const lastUpdateFreeSpinEvent = findLastBookEvent(bookEvents, 'updateFreeSpin');
	const lastSetTotalWinEvent = findLastBookEvent(bookEvents, 'setTotalWin');
	const lastUpdateGlobalMultEvent = findLastBookEvent(bookEvents, 'updateGlobalMult');
	const lastUpdateLevelUpTilesEvent = findLastBookEvent(bookEvents, 'updateLevelUpTiles');
	const lastProgressFillEvent = findLastBookEvent(bookEvents, 'progressFill');

	await restoreBonusSnapshotEntry(lastKongClubModeEvent, lastRevealEvent?.gameType);

	if (lastRevealEvent) {
		await restoreBoardForSnapshot(lastRevealEvent.board, lastRevealEvent.gameType);
	}
	if (lastUpdateFreeSpinEvent) await restoreFreeSpinCounter(lastUpdateFreeSpinEvent);
	if (lastUpdateLevelUpTilesEvent) await restoreTileLevels(lastUpdateLevelUpTilesEvent);
	if (lastSetTotalWinEvent) await restoreTotalWin(lastSetTotalWinEvent);
	if (lastUpdateGlobalMultEvent) await restoreGlobalMultiplier(lastUpdateGlobalMultEvent);
	if (lastProgressFillEvent) await restoreProgressFill(lastProgressFillEvent);

	await awaitSnapshotPresentationReady();
};

/** Let Svelte/Pixi subscribers flush before the resumed book continues. */
export const awaitSnapshotPresentationReady = () => awaitBuyBonusPresentationReady();
