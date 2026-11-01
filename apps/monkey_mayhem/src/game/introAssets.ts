import type { UiAssetKey } from './uiAssetSizes';

export const hasLoadedAssetTexture = (
	loadedAssets: Record<string, unknown> | undefined,
	key: string,
) => Boolean(loadedAssets?.[key]);

export const isIntroTextureReady = (
	loadedAssets: Record<string, unknown> | undefined,
	key: UiAssetKey,
) => hasLoadedAssetTexture(loadedAssets, key);

/** Splash logo + heroes used on the composed title cards. */
export const areIntroSplashTexturesReady = (
	loadedAssets: Record<string, unknown> | undefined,
) =>
	hasLoadedAssetTexture(loadedAssets, 'title_art') &&
	hasLoadedAssetTexture(loadedAssets, 'ST') &&
	hasLoadedAssetTexture(loadedAssets, 'CB') &&
	hasLoadedAssetTexture(loadedAssets, 'CS') &&
	hasLoadedAssetTexture(loadedAssets, 'CG') &&
	hasLoadedAssetTexture(loadedAssets, 'intro_card_10000x');
