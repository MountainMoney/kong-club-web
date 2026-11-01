import { REF_H, REF_W } from './layoutScene';
import type { LayoutMode } from './responsiveManager';

/** Total win banner width on bonus-end screen (1920 design px) — matches Football Fiesta. */
export const BONUS_OUTRO_TOTAL_WIN_W = 1480;

/** Win amount typography (1920 design px). */
export const BONUS_OUTRO_AMOUNT_SIZE = 240;

/** Gap from bottom of TOTAL WIN art to top of win amount. */
export const BONUS_OUTRO_LABEL_AMOUNT_GAP = 60;

/** Vertical nudge for TOTAL WIN art (1920 design px). */
export const BONUS_OUTRO_LABEL_Y_OFFSET = 56;

/** Win amount vertical nudge — keeps label + amount balanced (1920 design px). */
export const BONUS_OUTRO_AMOUNT_Y_OFFSET = 24;

export const BONUS_OUTRO_PLAYFIELD_FADE_MS = 450;
export const BONUS_OUTRO_OVERLAY_FADE_MS = 400;
export const BONUS_OUTRO_LABEL_BOUNCE_MS = 580;
/** Pause after TOTAL WIN art lands before showing the amount. */
export const BONUS_OUTRO_LABEL_HOLD_MS = 450;

export type BonusOutroLayout = {
	/** Container X — center of main. */
	x: number;
	/** Container Y — 0; children use absolute main Ys (FF desktop pattern). */
	y: number;
	/** Display width for TOTAL WIN art. */
	totalWinW: number;
	/** Win amount font size (px in main space). */
	amountSize: number;
	/** Amount center Y relative to container. */
	amountY: number;
	/** TOTAL WIN art bottom-center Y relative to container. */
	labelBottomY: number;
};

/**
 * Football Fiesta TOTAL WIN proportions, mapped into the active main layout.
 * Design authored at 1920×1080 (`BONUS_OUTRO_*` constants), scaled by main/REF.
 */
export const bonusOutroLayoutForMain = (
	main: { width: number; height: number },
	_mode?: LayoutMode,
): BonusOutroLayout => {
	const w = Math.max(1, main.width);
	const h = Math.max(1, main.height);
	const s = Math.min(w / REF_W, h / REF_H);

	const amountSize = Math.round(BONUS_OUTRO_AMOUNT_SIZE * s);
	const gap = Math.round(BONUS_OUTRO_LABEL_AMOUNT_GAP * s);
	const labelYOff = Math.round(BONUS_OUTRO_LABEL_Y_OFFSET * s);
	const amountYOff = Math.round(BONUS_OUTRO_AMOUNT_Y_OFFSET * s);
	const amountHalfH = Math.ceil(amountSize * 0.55);
	const midY = Math.round(h * 0.5);

	return {
		x: Math.round(w * 0.5),
		y: 0,
		totalWinW: Math.round(BONUS_OUTRO_TOTAL_WIN_W * s),
		amountSize,
		amountY: midY + amountYOff,
		labelBottomY: midY - amountHalfH - gap + labelYOff,
	};
};

/** @deprecated Use {@link bonusOutroLayoutForMain}. */
export const bonusOutroLayoutCenter = () =>
	bonusOutroLayoutForMain({ width: REF_W, height: REF_H });
