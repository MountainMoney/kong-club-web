import type { TextStyle } from 'pixi.js';

import type { SplashFeaturePanelId } from './splashCarousel';
import { INTRO_CARD_10000X_CONTENT, UI_ASSET_PIXELS } from './uiAssetSizes';

/** Plaque card aspect (width / height) — tall jungle panel. */
export const SPLASH_CARD_ASPECT = 0.72;

export const splashCardTitleStyle = (
	fontSize: number,
	fontReady: boolean,
): Partial<TextStyle> => ({
	fontFamily: fontReady ? 'Fredoka' : 'Arial',
	fontSize,
	fontWeight: '700',
	fill: 0xffec9a,
	stroke: { color: 0x1a1208, width: Math.max(3, Math.round(fontSize * 0.1)) },
	align: 'center',
});

export const splashCardSubtitleStyle = (
	fontSize: number,
	fontReady: boolean,
	wrapWidth?: number,
): Partial<TextStyle> => ({
	fontFamily: fontReady ? 'Fredoka' : 'Arial',
	fontSize,
	fontWeight: '600',
	fill: 0xffffff,
	stroke: { color: 0x0d0818, width: Math.max(2, Math.round(fontSize * 0.08)) },
	align: 'center',
	lineHeight: Math.round(fontSize * 1.2),
	...(wrapWidth != null ? { wordWrap: true, wordWrapWidth: wrapWidth } : {}),
});

export type SplashHeroKind = 'scatterFive' | 'maxWin' | 'coinTrio';

export const splashHeroForPanel = (id: SplashFeaturePanelId): SplashHeroKind => {
	if (id === 'hidden_bonus') return 'scatterFive';
	if (id === 'max_win') return 'maxWin';
	return 'coinTrio';
};

export const splashHeroTextureKeys = (kind: SplashHeroKind): readonly string[] => {
	if (kind === 'scatterFive') return ['ST', 'ST', 'ST', 'ST', 'ST'];
	if (kind === 'maxWin') return ['intro_card_10000x'];
	return ['CB', 'CS', 'CG'];
};

export const splashMaxWinPlateLayout = (maxW: number, maxH: number) => {
	const native = UI_ASSET_PIXELS.intro_card_10000x;
	const content = INTRO_CARD_10000X_CONTENT;
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
