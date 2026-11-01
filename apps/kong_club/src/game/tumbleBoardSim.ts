import type { RawSymbol } from './types';
import type { BookEventOfType } from './typesBookEvent';
import { INITIAL_BOARD } from './constants';

/** Padded board rows that participate in cluster/tumble logic (not top/bottom strip padding). */
export const TUMBLE_GAME_ROWS = [1, 2, 3, 4, 5] as const;

export const isTumbleGameRow = (row: number) => row >= 1 && row <= 5;

/** Math refills only the 5-row game window; padding rows are fixed separately in `resultBoard`. */
export const simulateTumbleBoard = (
	prevBoard: RawSymbol[][],
	bookEvent: Pick<BookEventOfType<'tumbleBoard'>, 'newSymbols' | 'explodingSymbols' | 'resultBoard'>,
): RawSymbol[][] => {
	const resultBoard = bookEvent.resultBoard;
	if (resultBoard?.length === INITIAL_BOARD.length) {
		return resultBoard.map((reel) => reel.map((symbol) => ({ ...symbol })));
	}

	return prevBoard.map((column, reelIndex) => {
		const explodeRows = new Set(
			bookEvent.explodingSymbols.filter((pos) => pos.reel === reelIndex).map((pos) => pos.row),
		);
		const gameRows = column.slice(1, 6);
		const survivors = gameRows.filter((_, gameRow) => !explodeRows.has(gameRow + 1));
		const incoming = (bookEvent.newSymbols[reelIndex] ?? []).map((symbol) => ({ ...symbol }));
		const nextGame = [...incoming, ...survivors].slice(0, 5);
		return [{ ...column[0] }, ...nextGame.map((symbol) => ({ ...symbol })), { ...column[6] }];
	});
};

export const splitTumbleColumn = (column: RawSymbol[]) => ({
	topPad: column[0],
	gameRows: column.slice(1, 6),
	bottomPad: column[6],
});

export const mergeTumbleColumn = (parts: {
	topPad: RawSymbol;
	gameRows: RawSymbol[];
	bottomPad: RawSymbol;
}) => [parts.topPad, ...parts.gameRows, parts.bottomPad];
