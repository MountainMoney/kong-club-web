/** Device safe-area insets in CSS/canvas pixels (not design space). */

export type SafeAreaInsets = {
	top: number;
	bottom: number;
	left: number;
	right: number;
};

const ZERO: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

let probeEl: HTMLDivElement | null = null;

/**
 * Reads `env(safe-area-inset-*)` when available (mobile browsers / PWA).
 * Falls back to conservative estimates for tall portrait phones.
 */
export const readSafeAreaInsets = (
	canvasWidth: number,
	canvasHeight: number,
): SafeAreaInsets => {
	if (typeof document === 'undefined' || typeof window === 'undefined') {
		return ZERO;
	}

	try {
		if (!probeEl) {
			probeEl = document.createElement('div');
			probeEl.style.cssText = [
				'position:fixed',
				'top:0',
				'left:0',
				'padding-top:env(safe-area-inset-top)',
				'padding-bottom:env(safe-area-inset-bottom)',
				'padding-left:env(safe-area-inset-left)',
				'padding-right:env(safe-area-inset-right)',
				'visibility:hidden',
				'pointer-events:none',
			].join(';');
			document.body.appendChild(probeEl);
		}

		const style = getComputedStyle(probeEl);
		const parse = (v: string) => {
			const n = parseFloat(v);
			return Number.isFinite(n) ? n : 0;
		};

		const fromEnv: SafeAreaInsets = {
			top: parse(style.paddingTop),
			bottom: parse(style.paddingBottom),
			left: parse(style.paddingLeft),
			right: parse(style.paddingRight),
		};

		if (fromEnv.top + fromEnv.bottom + fromEnv.left + fromEnv.right > 0) {
			return fromEnv;
		}
	} catch {
		// Fall through to estimates.
	}

	return estimateSafeAreaInsets(canvasWidth, canvasHeight);
};

/** Heuristic when env() is zero (desktop devtools, some embeds). */
export const estimateSafeAreaInsets = (
	canvasWidth: number,
	canvasHeight: number,
): SafeAreaInsets => {
	const aspect = canvasHeight / Math.max(canvasWidth, 1);
	if (aspect < 1.15) return ZERO;

	const shortSide = Math.min(canvasWidth, canvasHeight);
	const isTall = aspect >= 1.85;
	const isPhone = shortSide <= 520;

	if (!isPhone) {
		return { top: 12, bottom: 8, left: 0, right: 0 };
	}

	return {
		top: isTall ? Math.min(56, shortSide * 0.11) : Math.min(44, shortSide * 0.09),
		bottom: isTall ? Math.min(34, shortSide * 0.08) : 22,
		left: 0,
		right: 0,
	};
};

/** Map canvas safe-area px → design-space px for the active main layout. */
export const safeAreaToDesign = (
	insets: SafeAreaInsets,
	layoutWidth: number,
	layoutHeight: number,
	canvasWidth: number,
	canvasHeight: number,
): SafeAreaInsets => {
	const scaleX = layoutWidth / Math.max(canvasWidth, 1);
	const scaleY = layoutHeight / Math.max(canvasHeight, 1);
	return {
		top: insets.top * scaleY,
		bottom: insets.bottom * scaleY,
		left: insets.left * scaleX,
		right: insets.right * scaleX,
	};
};
