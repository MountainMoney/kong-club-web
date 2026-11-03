/**
 * Coin face tables.
 *
 * Math (`kong-club-math` PR #5) still rolls the integer pools, then multiplies
 * by `base_coin_game_scale` (0.20) only when betmode is `base` or `base_ante`
 * and gametype is not freegame. Live book items are
 * `{ reel, row, kind: "coin"|"clover"|"pot", value, round, level }`.
 * `value` is already scaled. `coinFeature.totalPayout` is the resolved payout
 * rounded to 2 decimals; `activationWin` is that payout × 100.
 * Clovers stay integer multipliers. Free spins and every other mode pay the
 * integer faces.
 */

export const BASE_COIN_GAME_SCALE = 0.2;

/** Free spins, Feature Spin, TRIFECTA, and the bonus modes. */
export const COIN_FACE_VALUES = {
	CB: [1, 2, 3, 4],
	CS: [5, 7, 10, 15, 20],
	CG: [25, 50, 100, 250, 500],
} as const;

/** Base and Extra Chance, outside free spins. Integer pool × 0.20. */
export const BASE_COIN_FACE_VALUES = {
	CB: [0.2, 0.4, 0.6, 0.8],
	CS: [1, 1.4, 2, 3, 4],
	CG: [5, 10, 20, 50, 100],
} as const;

export type CoinFaceSymbol = keyof typeof COIN_FACE_VALUES;

const MAX_FACE = 25000;

/** Two-decimal coin face. 7 × 0.20 stays 1.4, not 1. */
export const roundCoinFace = (value: number): number => {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100) / 100;
};

/** Coin face label. Keeps one decimal for 0.2 and 1.4, strips trailing zeros. */
export const formatCoinFaceLabel = (value: number): string => {
	const capped = Math.min(MAX_FACE, Math.max(0, Number(value)));
	const n = roundCoinFace(capped);
	if (!Number.isFinite(n) || n <= 0) return '0';
	if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)}`;
	return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

export const scaledBaseCoinFaces = (betMode: string, gameType: string): boolean =>
	(betMode === 'base' || betMode === 'base_ante') && gameType !== 'freegame';

export const coinFaceValuesFor = (scaled: boolean) =>
	scaled ? BASE_COIN_FACE_VALUES : COIN_FACE_VALUES;

/** Unscaled bands are 5 / 25. Scaled bands are those × 0.20 (1 / 5). */
export const coinFaceBands = (scaled: boolean) =>
	scaled ? { silver: 1, gold: 5 } : { silver: 5, gold: 25 };

/**
 * Live books say `clover` and `pot`. Older books say `multiplier` and `collector`.
 */
export const bookCoinKind = (
	raw?: string,
): 'coin' | 'multiplier' | 'collector' | 'tier_shift' => {
	if (raw === 'multiplier' || raw === 'clover') return 'multiplier';
	if (raw === 'collector' || raw === 'pot') return 'collector';
	if (raw === 'tier_shift') return 'tier_shift';
	return 'coin';
};

const faceList = (values: readonly number[]) => values.map((value) => formatCoinFaceLabel(value)).join(', ');

const poolSentence = (pool: typeof COIN_FACE_VALUES) =>
	`Bronze (CB) ${faceList(pool.CB)}; Silver (CS) ${faceList(pool.CS)}; Gold (CG) ${faceList(pool.CG)}`;

/** Rules / paytable sentence. Lists both tables so neither mode is described with the other. */
export const coinValueRulesSentence = (social: boolean): string => {
	const stake = social ? 'play-amount' : 'bet';
	const freeWord = social ? 'free games' : 'free spins';
	return `Coin values are ${stake} multiples from fixed pools. Base game and Extra Chance, outside ${freeWord}: ${poolSentence(BASE_COIN_FACE_VALUES)}. Free ${social ? 'games' : 'spins'} and every other mode: ${poolSentence(COIN_FACE_VALUES)}.`;
};
