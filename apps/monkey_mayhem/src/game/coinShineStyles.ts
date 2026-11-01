import { SYMBOL_SIZE } from './constants';

/**
 * LOCKED (Cole 2026-08-24) — Wide disc sheen.
 * Do not restore A/B presets or retune without an explicit Cole ask.
 */
export const COIN_DISC_RADIUS = SYMBOL_SIZE * 0.36;

export const COIN_SHINE = {
	duration: 560,
	/** Idle between sweeps — doubled 2026-08-24 (Cole: shimmer 50% less). */
	gapMin: 3600,
	gapMax: 9200,
	rotation: -0.46,
	bandWidth: 18,
	bandHeight: COIN_DISC_RADIUS * 2.35,
	alpha: 0.48,
	softAlpha: 0.2,
	radiusScale: 0.96,
} as const;
