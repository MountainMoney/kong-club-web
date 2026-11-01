/** Shared layout math for Football Fiesta UI bars (avoids clipping on small viewports). */

export function clampedBarWidth(layoutWidth: number, preferredWidth: number, padding = 32) {
	return Math.min(preferredWidth, Math.max(280, layoutWidth - padding));
}

export function bottomBarY(layoutHeight: number, barHeight: number, inset = 12) {
	return Math.max(inset, layoutHeight - barHeight - inset);
}

/** Scale Pixi UI controls (AUTO/TURBO etc.) on narrow layouts. */
export function controlScale(layoutWidth: number, referenceWidth = 1920, min = 0.55, max = 1) {
	return Math.min(max, Math.max(min, layoutWidth / referenceWidth));
}

/** Real phone UA — Chrome device-mode portrait is not phone-budget (UI_SPEC). */
export function isPhonePlayHost() {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || '';
	return /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua));
}

/** Phone held sideways: wide canvas, short height (e.g. 844×390). */
export function isMobileLandscapeViewport(canvasWidth: number, canvasHeight: number) {
	const shortSide = Math.min(canvasWidth, canvasHeight);
	return canvasWidth > canvasHeight && canvasHeight < 520 && shortSide <= 480;
}

/** Popout / mini-player or very small embed windows. */
export function isCompactViewport(canvasWidth: number, canvasHeight: number) {
	return canvasWidth <= 520 && canvasHeight <= 520;
}

/** Use tablet UI for popouts so controls stay on-screen without distortion. */
export function isMiniPlayerViewport(canvasWidth: number, canvasHeight: number) {
	return canvasWidth <= 500 && canvasHeight <= 400;
}

/** Win-popup layout mode — mirrors toolbar routing without importing responsiveProfile. */
export function effectiveWinLayoutMode(
	canvasWidth: number,
	canvasHeight: number,
	baseLayoutType: 'desktop' | 'portrait' | 'landscape' | 'tablet',
): 'desktop' | 'portrait' | 'landscape' | 'tablet' {
	if (isMiniPlayerViewport(canvasWidth, canvasHeight)) return 'tablet';
	if (baseLayoutType === 'landscape' && !isMobileLandscapeViewport(canvasWidth, canvasHeight)) {
		return 'desktop';
	}
	return baseLayoutType;
}

export type PortraitBarOffsets = {
	spin: number;
	bet: number;
	metrics: number;
	win: number;
	turbo: number;
	increase: number;
};

/** Portrait/stacked UI: Y offsets from design-space bottom (matches Stake SDK portrait layout). */
export function portraitBarOffsets(
	layoutHeight: number,
	compact: boolean,
): PortraitBarOffsets {
	if (compact) {
		return {
			spin: layoutHeight - 300,
			bet: layoutHeight - 200,
			metrics: layoutHeight - 440,
			win: layoutHeight - 520,
			turbo: layoutHeight - 72,
			increase: layoutHeight - 72,
		};
	}
	return {
		spin: layoutHeight - 400,
		bet: layoutHeight - 270,
		metrics: layoutHeight - 620,
		win: layoutHeight - 670,
		turbo: layoutHeight - 85,
		increase: layoutHeight - 85,
	};
}

/** @deprecated Use portraitBarOffsets */
export function portraitStackedBarY(layoutHeight: number, offsetFromBottom: number) {
	return layoutHeight - offsetFromBottom;
}
