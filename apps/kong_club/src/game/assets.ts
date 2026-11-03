import type { Assets } from 'pixi-svelte';

import { buildPixiAssets } from '../assets/manifest';

/**
 * Pixi load list. Paths live in `src/assets/manifest.ts`.
 * Edit that file to swap art, sound, or animation files.
 */
const assets = buildPixiAssets() as Assets;

export default assets;
