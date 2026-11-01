import { SYMBOL_SIZE } from './constants';

/** Prize amounts and coin/MULTI faces. Single Regular face — do not fake-bold. */
export const PRIZE_NUMBER_FONT = 'Lilita One';
export const PRIZE_NUMBER_WEIGHT = '400' as const;

/** In-game 500 face is 30px on a CG sprite of SYMBOL_SIZE × 0.8. */
export const GOLD_COIN_3CHAR_FONT_PX = 30;
export const GOLD_COIN_SPRITE_RATIO = 0.8;
export const GOLD_COIN_3CHAR_FONT_RATIO =
	GOLD_COIN_3CHAR_FONT_PX / (SYMBOL_SIZE * GOLD_COIN_SPRITE_RATIO);
