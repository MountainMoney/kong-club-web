import type { RawSymbol } from './types';
import { BOARD_DIMENSIONS } from './constants';

/** Padded board: row 0 and last are off-window. Visible game rows are 1..y. */
export const VISIBLE_BOARD_ROWS = Array.from(
	{ length: BOARD_DIMENSIONS.y },
	(_, i) => i + 1,
) as readonly number[];

const REEL_COUNT = BOARD_DIMENSIONS.x;

const isScatter = (symbol: RawSymbol | undefined) =>
	symbol?.name === 'ST' || symbol?.scatter === true;

/** Math books are 5 rows (0–4 visible). Padded FE reels are 7 (1–5 visible). */
export const visibleGameRowsForReel = (reelLength: number): readonly number[] => {
	if (reelLength <= BOARD_DIMENSIONS.y) {
		return Array.from({ length: Math.max(reelLength, 0) }, (_, i) => i);
	}
	return VISIBLE_BOARD_ROWS;
};

export const scatterPositionsFromBoard = (
	board: readonly (readonly (RawSymbol | undefined)[])[],
): { reel: number; row: number }[] => {
	const positions: { reel: number; row: number }[] = [];
	for (let reelIndex = 0; reelIndex < board.length; reelIndex += 1) {
		const reel = board[reelIndex];
		for (const row of visibleGameRowsForReel(reel?.length ?? 0)) {
			if (isScatter(reel?.[row])) {
				positions.push({ reel: reelIndex, row });
			}
		}
	}
	return positions;
};

const emptyAnticipation = () => Array.from({ length: REEL_COUNT }, () => 0);

const uniqueScatterReels = (positions: readonly { reel: number }[]) =>
	[...new Set(positions.map((p) => p.reel))].sort((a, b) => a - b);

/** After the 5th tablet’s reel, remaining columns slam. Last reel never slams past the board. */
export const slamFromReelAfterFifthScatter = (
	board: readonly (readonly (RawSymbol | undefined)[])[],
): number | undefined => {
	const scatterReels = uniqueScatterReels(scatterPositionsFromBoard(board));
	if (scatterReels.length < 5) return undefined;
	const afterFifth = scatterReels[4] + 1;
	return afterFifth < REEL_COUNT ? afterFifth : undefined;
};

/** Tease after the 2nd ST through the 5th ST reel, or through the last reel if there is no 5th. */
export const buildScatterAnticipationFromPositions = (
	positions: readonly { reel: number }[],
): number[] => {
	const anticipation = emptyAnticipation();
	const scatterReels = uniqueScatterReels(positions);
	if (scatterReels.length < 2) return anticipation;

	const secondScatterReel = scatterReels[1];
	const lastTeaseReel =
		scatterReels.length >= 5 ? scatterReels[4] : anticipation.length - 1;
	let level = 1;
	for (let reelIndex = secondScatterReel + 1; reelIndex <= lastTeaseReel; reelIndex += 1) {
		anticipation[reelIndex] = level;
		level += 1;
	}
	return anticipation;
};

/** Visible scatters only — padding ST must not start a tease. */
export const buildScatterAnticipation = (board: RawSymbol[][]): number[] =>
	buildScatterAnticipationFromPositions(scatterPositionsFromBoard(board));

export const stripScattersFromBoard = (board: RawSymbol[][]): RawSymbol[][] =>
	board.map((reel) =>
		reel.map((symbol) =>
			isScatter(symbol) ? { name: 'A' } : { ...symbol },
		),
	);

export const placeScattersOnBoard = (
	board: RawSymbol[][],
	positions: readonly { reel: number; row: number }[],
): RawSymbol[][] => {
	const next = board.map((reel) => reel.map((symbol) => ({ ...symbol })));
	for (const { reel, row } of positions) {
		if (!next[reel]?.[row]) continue;
		next[reel][row] = { name: 'ST', scatter: true };
	}
	return next;
};

/** Merge math + client tease (FF). Book zeros still get a client tease from the board. */
export const resolveRevealAnticipation = (
	board: RawSymbol[][],
	bookAnticipation?: number[],
	opts?: { skip?: boolean },
): number[] => {
	if (opts?.skip) return emptyAnticipation();
	const positions = scatterPositionsFromBoard(board);
	const client = buildScatterAnticipation(board);
	const math = bookAnticipation?.length ? bookAnticipation : emptyAnticipation();
	const scatterReels = uniqueScatterReels(positions);
	const alreadyLanded = new Set(scatterReels.slice(0, 2));
	const slamFrom = slamFromReelAfterFifthScatter(board);
	return emptyAnticipation().map((_, reelIndex) => {
		if (alreadyLanded.has(reelIndex)) return 0;
		if (slamFrom != null && reelIndex >= slamFrom) return 0;
		return Math.max(math[reelIndex] ?? 0, client[reelIndex] ?? 0);
	});
};
