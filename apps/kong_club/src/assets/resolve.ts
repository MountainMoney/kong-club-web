import { assetUrl } from '../game/assetUrl';
import { entryByKey, resolvedSrc, useAssetPlaceholders } from './manifest';

/** URL for a logical asset key. Relative when the Vite base is relative. */
export const assetSrc = (key: string): string => {
	const src = resolvedSrc(entryByKey(key), useAssetPlaceholders());
	if (typeof src !== 'string') {
		throw new Error(`Asset "${key}" is a spine. Use its runtime key in Pixi.`);
	}
	return assetUrl(src);
};

export const symbolSrc = (symbol: string): string => assetSrc(`symbol_${symbol}`);
