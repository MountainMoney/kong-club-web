/** Loading / intro splash layout (1920×1080 design space). */
import { REF_H, REF_W } from './layoutScene';
import type { LayoutMode } from './responsiveManager';
import { getGameLayoutProfile } from './responsiveProfile.svelte';
import { useSplashCarouselMode } from './splashCarousel';
import { SPLASH_CARD_ASPECT } from './splashIntroContent';
import { INTRO_LOGO_RENDER_SCALE, UI_ASSET_PIXELS } from './uiAssetSizes';

export const LOADING_LOGO_WIDTH = 560;
export const LOADING_LOGO_TOP_Y = 20;
export const LOADING_LOGO_TO_CARDS_GAP = 12;
/** title_art is a square plate; the wordmark sits in the upper half. */
export const LOADING_LOGO_PAINT_RATIO = 0.62;

export const LOADING_CARD_GAP = 18;
export const LOADING_MIDDLE_CARD_DROP = 24;

export const LOADING_PRESS_BOTTOM_INSET = 84;
export const LOADING_PRESS_TEXT_RESERVE = 12;
export const LOADING_PRESS_FONT_SIZE = 48;
export const LOADING_PRESS_FONT_SIZE_PORTRAIT = 54;
export const LOADING_PRESS_PORTRAIT_TOUCH_H = 88;

export const introLogoDisplaySize = (width = LOADING_LOGO_WIDTH) => {
	const { w, h } = UI_ASSET_PIXELS.title_art;
	const size = { width, height: Math.round((width * h) / w) };
	return {
		width: Math.round(size.width * INTRO_LOGO_RENDER_SCALE),
		height: Math.round(size.height * INTRO_LOGO_RENDER_SCALE),
	};
};

/** Uniform scale for title_art sprites (splash + playfield). */
export const introLogoUniformScale = (displayWidth: number) =>
	(displayWidth / UI_ASSET_PIXELS.title_art.w) * INTRO_LOGO_RENDER_SCALE;

export const splashCardHeightForWidth = (width: number) =>
	Math.round(width / SPLASH_CARD_ASPECT);

export const splashCardDisplaySize = (width: number) => ({
	width,
	height: splashCardHeightForWidth(width),
});

export const splashLogoPaintedBottom = (logoTopY: number, logoHeight: number) =>
	logoTopY + Math.round(logoHeight * LOADING_LOGO_PAINT_RATIO);

export const computeDesktopSplashCardSize = (
	layoutWidth = REF_W,
	layoutHeight = REF_H,
	logoWidth = LOADING_LOGO_WIDTH,
) => {
	const logo = introLogoDisplaySize(logoWidth);
	const cardsTop =
		splashLogoPaintedBottom(LOADING_LOGO_TOP_Y, logo.height) + LOADING_LOGO_TO_CARDS_GAP;
	const cardsBottom = layoutHeight - LOADING_PRESS_BOTTOM_INSET - LOADING_PRESS_TEXT_RESERVE;
	const space = cardsBottom - cardsTop - LOADING_MIDDLE_CARD_DROP;
	const maxHeight = Math.max(160, Math.min(space, 360));
	const maxWidthFromHeight = Math.floor(maxHeight * SPLASH_CARD_ASPECT);
	const maxWidthFromRow = Math.floor((layoutWidth - LOADING_CARD_GAP * 2) / 3);
	const cardWidth = Math.min(maxWidthFromHeight, maxWidthFromRow, 340);
	return {
		cardWidth,
		cardHeight: splashCardHeightForWidth(cardWidth),
		cardsTopY: cardsTop,
	};
};

export const loadingCardsRowWidth = (cardWidth: number) =>
	cardWidth * 3 + LOADING_CARD_GAP * 2;

export const loadingLayoutCenterX = (layoutWidth = REF_W) => layoutWidth * 0.5;

export const loadingCardX = (
	index: 0 | 1 | 2,
	layoutWidth = REF_W,
	cardWidth: number,
) => {
	const rowW = loadingCardsRowWidth(cardWidth);
	const center = loadingLayoutCenterX(layoutWidth);
	const startX = center - rowW * 0.5;
	return startX + index * (cardWidth + LOADING_CARD_GAP) + cardWidth * 0.5;
};

export const loadingCardsTopY = (logoWidth = LOADING_LOGO_WIDTH) => {
	const logo = introLogoDisplaySize(logoWidth);
	return splashLogoPaintedBottom(LOADING_LOGO_TOP_Y, logo.height) + LOADING_LOGO_TO_CARDS_GAP;
};

export const loadingCardTopY = (index: 0 | 1 | 2, logoWidth = LOADING_LOGO_WIDTH) =>
	loadingCardsTopY(logoWidth) + (index === 1 ? LOADING_MIDDLE_CARD_DROP : 0);

export type SplashLayoutMode = 'desktop' | 'carousel';

export type SplashScreenLayout = {
	mode: SplashLayoutMode;
	centerX: number;
	logo: { x: number; y: number; width: number; height: number };
	carousel?: {
		centerX: number;
		centerY: number;
		cardWidth: number;
		cardHeight: number;
		dotsY: number;
	};
	desktop?: {
		cardWidth: number;
		cardHeight: number;
	};
	pressBottomInset: number;
	pressCarousel?: boolean;
	pressFontSize?: number;
	pressTouchHeight?: number;
};

export const getSplashScreenLayout = (input: {
	layoutWidth: number;
	layoutHeight: number;
	canvasWidth: number;
	canvasHeight: number;
	layoutType: LayoutMode;
}): SplashScreenLayout => {
	const { layoutWidth, layoutHeight, canvasWidth, canvasHeight, layoutType } = input;
	const profile = getGameLayoutProfile();
	const sy = layoutHeight / REF_H;
	const centerX = layoutWidth * 0.5;

	const carousel = useSplashCarouselMode(canvasWidth, canvasHeight, layoutType);

	const logoWidth = carousel
		? Math.min(layoutWidth * 0.72, LOADING_LOGO_WIDTH * 1.05)
		: LOADING_LOGO_WIDTH;
	const logo = introLogoDisplaySize(logoWidth);
	const logoY = carousel ? profile.safeArea.top + 12 * sy : LOADING_LOGO_TOP_Y;

	const pressBottomInset =
		LOADING_PRESS_BOTTOM_INSET + profile.safeArea.bottom + (carousel ? 8 * sy : 0);

	if (carousel) {
		const cardWidth = Math.min(layoutWidth * 0.78, 420);
		const card = splashCardDisplaySize(cardWidth);
		const cardsTop =
			splashLogoPaintedBottom(logoY, logo.height) + LOADING_LOGO_TO_CARDS_GAP + 16 * sy;
		const centerY = cardsTop + card.height * 0.5;

		return {
			mode: 'carousel',
			centerX,
			logo: { x: centerX, y: logoY, width: logo.width, height: logo.height },
			carousel: {
				centerX,
				centerY,
				cardWidth: card.width,
				cardHeight: card.height,
				dotsY: cardsTop + card.height + 20 * sy,
			},
			pressBottomInset,
			pressCarousel: true,
			pressFontSize: LOADING_PRESS_FONT_SIZE_PORTRAIT,
			pressTouchHeight: LOADING_PRESS_PORTRAIT_TOUCH_H,
		};
	}

	const desktop = computeDesktopSplashCardSize(layoutWidth, layoutHeight, LOADING_LOGO_WIDTH);
	return {
		mode: 'desktop',
		centerX,
		logo: { x: centerX, y: LOADING_LOGO_TOP_Y, width: logo.width, height: logo.height },
		desktop: {
			cardWidth: desktop.cardWidth,
			cardHeight: desktop.cardHeight,
		},
		pressBottomInset,
		pressFontSize: LOADING_PRESS_FONT_SIZE,
	};
};

export { REF_H, REF_W };
