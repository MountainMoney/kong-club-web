import { SYMBOL_SIZE } from './constants';

const V2_CANVAS = { w: 512, h: 512 } as const;

/**
 * Opaque painted box on each V2 512×512 reel PNG (alpha ≥ 16).
 * Layout fits this box into the cell so padding does not shrink the fruit.
 */
const V2_CONTENT_BOX = {
	A: { x: 71, y: 23, w: 379, h: 429 },
	BA: { x: 21, y: 59, w: 453, h: 391 },
	CO: { x: 46, y: 59, w: 422, h: 401 },
	GR: { x: 33, y: 37, w: 447, h: 430 },
	J: { x: 114, y: 22, w: 310, h: 433 },
	K: { x: 61, y: 51, w: 381, h: 399 },
	LE: { x: 20, y: 42, w: 472, h: 428 },
	OR: { x: 46, y: 32, w: 429, h: 440 },
	Q: { x: 66, y: 48, w: 394, h: 452 },
	ST: { x: 8, y: 27, w: 504, h: 457 },
	T: { x: 19, y: 65, w: 456, h: 377 },
	W: { x: 50, y: 34, w: 425, h: 447 },
} as const;

/**
 * Coin disc + face-number lock (Cole 2026-08-24).
 * Lab sliders add on top; production uses these only.
 */
export const COIN_ART = {
	x: 0,
	y: 0,
	scale: 1.1,
	labelX: 0,
	labelY: 0,
} as const;

/** Per digit-count extras on top of `COIN_ART.labelX/Y`. Production stays 0 (disc center). */
export const COIN_FACE_LABEL_BY_DIGITS: Record<1 | 2 | 3 | 4 | 5, { x: number; y: number }> = {
	1: { x: 0, y: 0 },
	2: { x: 0, y: 0 },
	3: { x: 0, y: 0 },
	4: { x: 0, y: 0 },
	5: { x: 0, y: 0 },
};

/** Extra sit for a single-digit face (`1`–`9`). Production stays 0 (disc center). */
export const COIN_FACE_LABEL_BY_CHAR: Record<string, { x: number; y: number }> = {
	'1': { x: 0, y: 0 },
	'2': { x: 0, y: 0 },
	'3': { x: 0, y: 0 },
	'4': { x: 0, y: 0 },
	'5': { x: 0, y: 0 },
	'6': { x: 0, y: 0 },
	'7': { x: 0, y: 0 },
	'8': { x: 0, y: 0 },
	'9': { x: 0, y: 0 },
};

export const coinFaceDigitCount = (label: string): 1 | 2 | 3 | 4 | 5 => {
	const body = label.replace(/[^0-9.]/g, '');
	const n = body.length || 1;
	return Math.min(5, Math.max(1, n)) as 1 | 2 | 3 | 4 | 5;
};

export const coinFaceSingleDigit = (label: string): string | null => {
	if (label.includes('.')) return null;
	const digits = label.replace(/\D/g, '');
	if (digits.length !== 1) return null;
	return digits;
};

export const coinFaceLabelOffset = (label: string) => {
	const extra = COIN_FACE_LABEL_BY_DIGITS[coinFaceDigitCount(label)];
	const glyph = coinFaceSingleDigit(label);
	const byChar = glyph ? (COIN_FACE_LABEL_BY_CHAR[glyph] ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
	return {
		x: COIN_ART.labelX + extra.x + byChar.x,
		y: COIN_ART.labelY + extra.y + byChar.y,
	};
};

/** Opaque disc box (alpha ≥ 16) — pin this center to the cell, not the canvas. */
const COIN_CONTENT_BOX = {
	CB: { x: 14, y: 15, w: 936, h: 994 },
	CS: { x: 15, y: 15, w: 963, h: 994 },
	CG: { x: 11, y: 10, w: 962, h: 1003 },
} as const;

/** Native PNG pixel sizes — used only to preserve aspect when fitting the cell. */
export const SYMBOL_NATIVE_PX = {
	A: V2_CANVAS,
	BA: V2_CANVAS,
	CB: { w: 965, h: 1024 },
	CG: { w: 983, h: 1024 },
	CO: V2_CANVAS,
	CS: { w: 993, h: 1024 },
	EXPLODED_W: { w: 1024, h: 1024 },
	GR: V2_CANVAS,
	J: V2_CANVAS,
	K: V2_CANVAS,
	LE: V2_CANVAS,
	MW: { w: 819, h: 1024 },
	OR: V2_CANVAS,
	Q: V2_CANVAS,
	ST: V2_CANVAS,
	T: V2_CANVAS,
	W: V2_CANVAS,
} as const;

type AssetKey = keyof typeof SYMBOL_NATIVE_PX;
type V2Key = keyof typeof V2_CONTENT_BOX;
type CoinKey = keyof typeof COIN_CONTENT_BOX;

const GEOMETRIC_ANCHOR = { x: 0.5, y: 0.5 } as const;

const isV2Key = (key: string): key is V2Key => key in V2_CONTENT_BOX;
const isCoinKey = (key: string): key is CoinKey => key in COIN_CONTENT_BOX;

const layoutFromContentBox = (
	native: { w: number; h: number },
	content: { x: number; y: number; w: number; h: number },
	maxW: number,
	maxH: number,
) => {
	const scale = Math.min(maxW / content.w, maxH / content.h);
	return {
		width: native.w * scale,
		height: native.h * scale,
		anchor: {
			x: (content.x + content.w / 2) / native.w,
			y: (content.y + content.h / 2) / native.h,
		},
	};
};

/**
 * Fit symbol art inside the cell box (no X/Y squash).
 * V2 fruit/letters/scatter: scale so the painted box fills the cell; pin that box's
 * center to the reel cell. Coins: same, using the disc box (not canvas padding).
 */
export const getSymbolSpriteLayout = (
	assetKey: string,
	sizeRatios: { width: number; height: number },
) => {
	const maxW = SYMBOL_SIZE * sizeRatios.width;
	const maxH = SYMBOL_SIZE * sizeRatios.height;
	const native = SYMBOL_NATIVE_PX[assetKey as AssetKey];
	if (!native) {
		return { width: maxW, height: maxH, anchor: { ...GEOMETRIC_ANCHOR } };
	}
	if (isV2Key(assetKey)) {
		return layoutFromContentBox(native, V2_CONTENT_BOX[assetKey], maxW, maxH);
	}
	if (isCoinKey(assetKey)) {
		return layoutFromContentBox(native, COIN_CONTENT_BOX[assetKey], maxW, maxH);
	}
	const scale = Math.min(maxW / native.w, maxH / native.h);
	return {
		width: native.w * scale,
		height: native.h * scale,
		anchor: { ...GEOMETRIC_ANCHOR },
	};
};
