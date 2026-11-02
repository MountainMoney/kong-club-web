import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import { SYMBOL_SIZE, REEL_PADDING, SYMBOL_INFO_MAP, BOARD_DIMENSIONS } from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState, Position } from './types';
import { beginBetPlayback, endBetPlayback } from './spinSkip.svelte';
import { resetGameplayAfterBookError } from './gameplayErrorReset';
import { normalizeLegacyBetModeKey } from './betModes';
import { isSocialMode } from './socialCopy';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
export const playBet = async (bet: Bet) => {
	beginBetPlayback();
	stateBet.winBookEventAmount = 0;
	try {
		await playBookEvents(bet.state);
	} catch (error) {
		resetGameplayAfterBookError(error);
		throw error;
	} finally {
		endBetPlayback();
	}
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

import { isSnapshotReservedBookEvent } from './bonusSnapshotRestore';

// resume bet
export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter(isSnapshotReservedBookEvent),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return {
		...betToResume,
		mode: normalizeLegacyBetModeKey(betToResume.mode),
		state: stateToResume,
	};
};

// other utils
export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const bookRowToOverlayY = (bookRow: number) => getSymbolY(bookRow - 1);

/** Math winInfo / tumble positions use book rows 1–5; tile grid uses 0–4. */
export const bookRowToTileRow = (bookRow: number) => bookRow - 1;

export const bookPositionToTilePosition = (position: Position): Position => ({
	reel: position.reel,
	row: bookRowToTileRow(position.row),
});

export const paylineVisibleRowToBookRow = (visibleRow: number) => visibleRow + 1;

export const getSymbolKey = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.multiplier !== undefined) {
		return `${rawSymbol.name}_${rawSymbol.multiplier}` as keyof typeof SYMBOL_INFO_MAP;
	}
	return rawSymbol.name as keyof typeof SYMBOL_INFO_MAP;
};

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	const symbolKey = getSymbolKey({ rawSymbol });
	const info = SYMBOL_INFO_MAP[symbolKey][state];
	if (symbolKey === 'ST' && isSocialMode() && info.type === 'sprite') {
		return { ...info, assetKey: 'STSocial' } as typeof info;
	}
	return info;
};
