export const REF_W = 1920;
export const REF_H = 1080;
/** Stake-style stacked portrait design space. */
export const PORTRAIT_REF_W = 1080;
export const PORTRAIT_REF_H = 1920;

export type CanvasSize = {
	width: number;
	height: number;
};

/** Visible canvas in CSS pixels. */
export const readCanvasSize = (): CanvasSize => {
	if (typeof window === 'undefined') return { width: REF_W, height: REF_H };
	const visualViewport = window.visualViewport;
	return {
		width: Math.round(visualViewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth ?? REF_W),
		height: Math.round(
			visualViewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight ?? REF_H,
		),
	};
};

export const isPortraitViewport = (canvasWidth: number, canvasHeight: number) =>
	canvasHeight > canvasWidth * 1.05;

/**
 * Switch to 1080×1920 design space only for real phone / mini-player portrait.
 * Tall desktop side-panels stay on 1920×1080.
 */
export const usePortraitDesignSpace = (canvasWidth: number, canvasHeight: number) => {
	if (!isPortraitViewport(canvasWidth, canvasHeight)) return false;
	const shortSide = Math.min(canvasWidth, canvasHeight);
	if (shortSide > 700) return false;
	const aspect = canvasHeight / Math.max(canvasWidth, 1);
	const longSide = Math.max(canvasWidth, canvasHeight);
	const tallPhone = aspect >= 1.35 && shortSide <= 520 && longSide >= 580;
	return tallPhone || aspect >= 1.25;
};
