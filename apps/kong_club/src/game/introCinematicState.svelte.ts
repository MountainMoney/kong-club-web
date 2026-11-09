import { BlurFilter } from 'pixi.js';

/**
 * Shared state for the GG-ported intro cinematic (see IntroCinematic.svelte).
 * `zoom` is GG's camera [ja]: 1 → 1.1 while the intro is up, back to 1 on exit.
 */
export const stateIntroCinematic = $state({
	/** Mounted from boot until its exit animations finish. */
	active: true,
	/** Camera zoom on the game background (1 = untouched). */
	zoom: 1,
	/** Black wash over the game background (KC: darkened a little). */
	dim: 0,
	/** Hide the in-game title until the intro logo hands over (GG logoHandedOver). */
	holdTitle: false,
	/** Background blur share (1 = full intro blur, 0 = sharp). */
	blur: 0,
	/** Game UI (bar, labels) and in-game logo entrance fade. */
	uiAlpha: 1,
	/** Board drop offset in main-layout px (GG Dce boardY; negative = above). */
	boardY: 0,
	/** Monkey hop [Jqe]: offset + squash about the feet (main-layout px). */
	hero: { x: 0, y: 0, sx: 1, sy: 1, px: 0, py: 0 },
});

/** Shared blur on the KC background container (strength driven by IntroCinematic). */
export const introBackgroundBlur = new BlurFilter({ strength: 0, quality: 3 });
introBackgroundBlur.repeatEdgePixels = true;

/** KC background darkening while the intro is up. */
export const INTRO_DIM = 0.28;
