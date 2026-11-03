import { createApp } from 'pixi-svelte';

import assets from './assets';
import { resolveAssetsManifest } from './assetUrl';

export const { stateApp } = createApp({
	assets: resolveAssetsManifest(assets),
});

if (typeof window !== 'undefined') {
	(window as unknown as { __kongClub: typeof stateApp }).__kongClub = stateApp;
}
