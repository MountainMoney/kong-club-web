import { SYMBOL_SIZE, VISIBLE_BOARD_ROWS } from './constants';
import { capBookAmount } from './winCountTier';
import { REF_H, REF_W } from './layoutScene';
import {
	bookRowToOverlayY,
	getSymbolX,
	paylineVisibleRowToBookRow,
} from './utils';

export type PaylineAmountMode = 'total_on_primary_line' | 'per_line' | 'total_center';

export const DEFAULT_PAYLINE_AMOUNT_MODE: PaylineAmountMode = 'total_on_primary_line';

export const PAYLINE_AMOUNT_FONT_SIZE = Math.round(SYMBOL_SIZE * 0.42);
export const PAYLINE_AMOUNT_Y_OFFSET = SYMBOL_SIZE * 0.6;
export const PAYLINE_AMOUNT_POP_MS = 280;

export type PaylineAmountLabel = {
	x: number;
	y: number;
	bookAmount: number;
	key: string;
};

export type PaylineLineInput = {
	win: number;
	lineIndex: number;
};

let labAmountModeOverride: PaylineAmountMode | null = null;

export const setLabPaylineAmountMode = (mode: PaylineAmountMode | null) => {
	labAmountModeOverride = mode;
};

export const getPaylineAmountMode = (): PaylineAmountMode =>
	labAmountModeOverride ?? DEFAULT_PAYLINE_AMOUNT_MODE;

const paylineRowsFromConfig = (
	lineIndex: number,
	paylines: Record<string, number[]>,
): number[] | undefined => {
	if (lineIndex <= 0) return undefined;
	return paylines[String(lineIndex)] as number[] | undefined;
};

/** Center of primary line — reel 2, above the payline row. */
export const lineAnchor = (
	lineIndex: number,
	paylines: Record<string, number[]>,
): { x: number; y: number } | null => {
	const rows = paylineRowsFromConfig(lineIndex, paylines);
	if (!rows?.length) return null;
	const midReel = 2;
	const visibleRow = rows[midReel] ?? rows[0];
	return {
		x: getSymbolX(midReel),
		y: bookRowToOverlayY(paylineVisibleRowToBookRow(visibleRow)) - PAYLINE_AMOUNT_Y_OFFSET,
	};
};

/** Centroid of all payline path points (for V-shaped lines). */
export const lineCentroid = (
	lineIndex: number,
	paylines: Record<string, number[]>,
): { x: number; y: number } | null => {
	const rows = paylineRowsFromConfig(lineIndex, paylines);
	if (!rows?.length) return null;
	let sumX = 0;
	let sumY = 0;
	rows.forEach((visibleRow, reel) => {
		sumX += getSymbolX(reel);
		sumY += bookRowToOverlayY(paylineVisibleRowToBookRow(visibleRow));
	});
	return {
		x: sumX / rows.length,
		y: sumY / rows.length - PAYLINE_AMOUNT_Y_OFFSET,
	};
};

/** Board center — reel 2, middle visible row. */
export const boardCenterAnchor = () => ({
	x: getSymbolX(2),
	y: bookRowToOverlayY(VISIBLE_BOARD_ROWS[1]) - PAYLINE_AMOUNT_Y_OFFSET,
});

/** Fixed playfield center in 1920×1080 main-layout space (always fully visible). */
export const paylineAmountLayoutCenter = () => ({
	x: Math.round(REF_W * 0.5),
	y: Math.round(REF_H * 0.48),
});

export const isScreenCenterPaylineAmountMode = (mode: PaylineAmountMode) =>
	mode === 'total_center';

export const buildPaylineAmountLabels = (
	mode: PaylineAmountMode,
	lines: PaylineLineInput[],
	totalWin: number,
	paylines: Record<string, number[]>,
): PaylineAmountLabel[] => {
	if (!lines.length || totalWin <= 0) return [];

	switch (mode) {
		case 'total_on_primary_line': {
			const primary = lines[0];
			const anchor = lineCentroid(primary.lineIndex, paylines);
			if (!anchor) return [];
			return [{ ...anchor, bookAmount: capBookAmount(totalWin), key: 'total-primary' }];
		}
		case 'per_line':
			return lines.flatMap((line, idx) => {
				const anchor = lineCentroid(line.lineIndex, paylines);
				if (!anchor || line.win <= 0) return [];
				return [{ ...anchor, bookAmount: capBookAmount(line.win), key: `line-${line.lineIndex}-${idx}` }];
			});
		case 'total_center': {
			const anchor = boardCenterAnchor();
			return [{ ...anchor, bookAmount: capBookAmount(totalWin), key: 'total-center' }];
		}
	}
};
