import { SYMBOL_SIZE } from './constants';

/**
 * A4 plain land (Ryan pick, preview v5b).
 * Exact squash-punch from symbol_land_A_v2..v5: 26/18 squash, damped cosine
 * spring (decay 7, 2.2 Hz, 500 ms window), foot planted. No hit-stop, shake, or dust.
 */
export const SYMBOL_LAND_A4_SQUASH_Y = 0.26;
export const SYMBOL_LAND_A4_SQUASH_X = 0.18;
export const SYMBOL_LAND_A4_DAMP = 7.0;
export const SYMBOL_LAND_A4_FREQ_HZ = 2.2;
export const SYMBOL_LAND_A4_WINDOW_MS = 500;
/** Arm the land squash once the symbol has dropped from at least this far above rest. */
export const SYMBOL_LAND_A4_ARM_ABOVE_PX = 28;

/** Envelope e; e = 1 is max squash. `exp(-7t) * cos(2π · 2.2 · t)`. */
export const symbolLandA4Envelope = (tSec: number) => {
	if (tSec < 0) return 0;
	if (tSec >= SYMBOL_LAND_A4_WINDOW_MS / 1000) return 0;
	return Math.exp(-SYMBOL_LAND_A4_DAMP * tSec) * Math.cos(2 * Math.PI * SYMBOL_LAND_A4_FREQ_HZ * tSec);
};

export const symbolLandA4Scale = (envelope: number) => ({
	sx: 1 + SYMBOL_LAND_A4_SQUASH_X * envelope,
	sy: 1 - SYMBOL_LAND_A4_SQUASH_Y * envelope,
});

/** Keep the foot planted when scale is applied about the cell centre. */
export const symbolLandA4FootOffsetY = (scaleY: number, height = SYMBOL_SIZE) =>
	(height * (1 - scaleY)) / 2;
