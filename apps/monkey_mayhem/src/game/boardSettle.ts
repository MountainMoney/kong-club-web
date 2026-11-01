import type { RawSymbol } from './types';
import { INITIAL_BOARD, SYMBOL_SIZE } from './constants';
import type { Reel } from './stateGame.svelte';

export const isValidSettleBoard = (board: RawSymbol[][]) =>
	board.length === INITIAL_BOARD.length &&
	board.every(
		(reel, reelIndex) =>
			reel.length === INITIAL_BOARD[reelIndex].length &&
			reel.every((symbol) => Boolean(symbol?.name)),
	);

export const snapReelsToSettlePositions = (board: Reel[]) => {
	board.forEach((reel) => {
		reel.reelState.symbols.forEach((reelSymbol) => {
			const targetY = (reelSymbol.symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;
			reelSymbol.symbolY.set(targetY, { duration: 0 });
			reelSymbol.symbolState = 'static';
		});
	});
};
