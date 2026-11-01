import { isCompactViewport, isMiniPlayerViewport } from './layoutUi';
import type { LayoutMode } from './responsiveManager';

/** Text fallback width when tier PNG is unavailable (1920×1080 ref). */
export const WIN_COUNT_LABEL_W = 1140;

/** Tier popup PNG width (win_popup_*.png) — scaled independently of dollar amount. */
export const WIN_COUNT_TIER_POPUP_WIDTH = 1000;

/** Max-win 25,000× wordmark plate (intro_card_10000x.png key). */
export const WIN_COUNT_MAX_POPUP_WIDTH = 1200;

/** Nudge tier PNG down toward the dollar amount (design px). */
export const WIN_COUNT_TIER_POPUP_Y_OFFSET = 72;

/** Gap from bottom of tier art to top of win amount. */
export const WIN_COUNT_LABEL_AMOUNT_GAP = 72;

/** Tier win popups — larger than bonus outro for readability on the playfield. */
export const WIN_COUNT_AMOUNT_SIZE = 248;

/** Playfield dim while count-up runs (Le Bandit–style focus on win UI). */
export const WIN_COUNT_DIM_ALPHA = 0.62;
export const WIN_COUNT_DIM_FADE_MS = 480;
export const WIN_COUNT_LABEL_BOUNCE_MS = 580;
/** Board soak on winning symbols before center count-up (small wins). */
export const WIN_PRE_COUNTUP_HOLD_MS = 300;
/** 40×–99× — beat before center popup. */
export const WIN_PRE_COUNTUP_MED_HOLD_MS = 250;
/** 100×+ — board soak before center popup. */
export const WIN_PRE_COUNTUP_BIG_HOLD_MS = 400;
/** Brief savor beat after count-up before fade-out. */
export const WIN_COUNT_HOLD_MS = 150;
/** Extra beat on max-win cap before fade-out. */
export const WIN_COUNT_MAX_HOLD_MS = 3500;
export const WIN_COUNT_FADE_OUT_MS = 150;
export const WIN_COUNT_BASE_COUNT_MS = 2200;

const WIN_POPUP_ASPECT = 347 / 1024;

/** Tier popup height at a given design-space width (1894×642 art). */
export const winPopupHeightForWidth = (width: number) => Math.round(width * WIN_POPUP_ASPECT);

export type WinCountLayout = {
	x: number;
	amountY: number;
	labelBottomY: number;
	popupWidth: number;
	popupHeight: number;
	maxPopupWidth: number;
	maxPopupHeight: number;
	amountFontSize: number;
	labelWidth: number;
	labelAmountGap: number;
	tierPopupYOffset: number;
	scale: number;
};

type MainSize = { width: number; height: number };
type CanvasSize = { width: number; height: number };

const widthBudgetRatio = (mode: LayoutMode, compact: boolean, mini: boolean) => {
	if (mini) return 0.86;
	if (compact) return 0.88;
	if (mode === 'portrait') return 0.9;
	if (mode === 'tablet') return 0.9;
	if (mode === 'landscape') return 0.92;
	return 0.94;
};

const stackHeightBudgetRatio = (mode: LayoutMode) => {
	if (mode === 'portrait') return 0.48;
	if (mode === 'tablet') return 0.5;
	return 0.52;
};

const amountYRatio = (mode: LayoutMode) => {
	if (mode === 'portrait') return 0.47;
	if (mode === 'tablet') return 0.48;
	if (mode === 'landscape') return 0.46;
	return 0.45;
};

const bottomMarginRef = (mode: LayoutMode) => {
	if (mode === 'portrait') return 220;
	if (mode === 'tablet') return 140;
	return 108;
};

const stackHeight = (
	popupWidth: number,
	amountFontSize: number,
	gap: number,
) => winPopupHeightForWidth(popupWidth) + gap + Math.ceil(amountFontSize * 1.15);

/**
 * Responsive win-popup layout inside the SDK MainContainer for the active viewport.
 * Centers on main.width / main.height and scales art + text to fit each layout mode.
 */
export const winCountLayoutForMain = (
	main: MainSize,
	mode: LayoutMode,
	canvas?: CanvasSize,
): WinCountLayout => {
	if (!main?.width || !main?.height) {
		return winCountLayoutForMain({ width: 1422, height: 800 }, mode, canvas);
	}

	const canvasW = canvas?.width ?? main.width;
	const canvasH = canvas?.height ?? main.height;
	const compact = isCompactViewport(canvasW, canvasH);
	const mini = isMiniPlayerViewport(canvasW, canvasH);

	const widthCap = main.width * widthBudgetRatio(mode, compact, mini);
	let popupWidth = Math.min(WIN_COUNT_TIER_POPUP_WIDTH, Math.round(widthCap));
	let maxPopupWidth = Math.min(
		WIN_COUNT_MAX_POPUP_WIDTH,
		Math.round(Math.min(main.width * 0.98, widthCap * 1.12)),
	);

	let scale = popupWidth / WIN_COUNT_TIER_POPUP_WIDTH;
	let amountFontSize = Math.max(72, Math.round(WIN_COUNT_AMOUNT_SIZE * scale));
	let gap = Math.max(24, Math.round(WIN_COUNT_LABEL_AMOUNT_GAP * scale));

	const maxStackH = main.height * stackHeightBudgetRatio(mode);
	if (stackHeight(popupWidth, amountFontSize, gap) > maxStackH) {
		const shrink = maxStackH / stackHeight(popupWidth, amountFontSize, gap);
		popupWidth = Math.max(280, Math.round(popupWidth * shrink));
		maxPopupWidth = Math.max(320, Math.round(maxPopupWidth * shrink));
		scale = popupWidth / WIN_COUNT_TIER_POPUP_WIDTH;
		amountFontSize = Math.max(64, Math.round(WIN_COUNT_AMOUNT_SIZE * scale));
		gap = Math.max(20, Math.round(WIN_COUNT_LABEL_AMOUNT_GAP * scale));
	}

	const halfH = Math.ceil(amountFontSize * 0.55);
	const marginTop = Math.round(40 * scale);
	const marginBottom = Math.round(bottomMarginRef(mode) * scale);
	const minAmountY = marginTop + halfH;
	const maxAmountY = main.height - marginBottom - halfH;
	const targetY = main.height * amountYRatio(mode);
	const amountY = Math.round(
		minAmountY > maxAmountY
			? main.height * 0.5
			: Math.min(maxAmountY, Math.max(minAmountY, targetY)),
	);
	const labelBottomY = Math.round(amountY - gap - halfH);

	return {
		x: main.width * 0.5,
		amountY,
		labelBottomY,
		popupWidth,
		popupHeight: winPopupHeightForWidth(popupWidth),
		maxPopupWidth,
		maxPopupHeight: winPopupHeightForWidth(maxPopupWidth),
		amountFontSize,
		labelWidth: Math.round(WIN_COUNT_LABEL_W * scale),
		labelAmountGap: gap,
		tierPopupYOffset: Math.round(WIN_COUNT_TIER_POPUP_Y_OFFSET * scale),
		scale,
	};
};

/** @deprecated Use winCountLayoutForMain(main, mode, canvas). */
export const winCountLayoutCenter = () =>
	winCountLayoutForMain({ width: 1920, height: 1080 }, 'desktop');
