import { createApp } from 'pixi-svelte';

import assets from './assets';
import { resolveAssetsManifest } from './assetUrl';

export const { stateApp } = createApp({
	assets: resolveAssetsManifest(assets),
});
