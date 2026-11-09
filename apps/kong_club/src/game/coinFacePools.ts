/**
 * Coin face tables.
 *
 * Every mode uses this one bet-multiple table. There is no per-mode scale.
 * Live book items are `{ reel, row, kind: "coin"|"clover"|"pot", value, round, level }`.
 * `value` is the face. `coinFeature.totalPayout` is the resolved payout rounded
 * to 2 decimals; `activationWin` is that payout × 100.
 * Clovers stay integer multipliers.
 */

/**
 * Bronze, silver, and gold faces, in bet multiples. Same list in every mode.
 * Whole numbers only (math 9f5778f, 2026-11-09): bronze dropped 0.2 / 0.5.
 */
export const COIN_FACE_VALUES = {
	CB: [1, 2, 3, 4],
	CS: [5, 10, 15, 20],
	CG: [25, 50, 100, 250, 500, 1000],
} as const;

export type CoinFaceSymbol = keyof typeof COIN_FACE_VALUES;

const MAX_FACE = 25000;

/** Two-decimal coin face. Spawned faces are whole; a max-win trimmed coin or pot can carry cents. */
export const roundCoinFace = (value: number): number => {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100) / 100;
};

/** Coin face label. Whole faces print as integers; a max-win trim keeps its cents (24996.1). */
export const formatCoinFaceLabel = (value: number): string => {
	const capped = Math.min(MAX_FACE, Math.max(0, Number(value)));
	const n = roundCoinFace(capped);
	if (!Number.isFinite(n) || n <= 0) return '0';
	if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)}`;
	return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

/** Bronze is below 5. Silver starts at 5. Gold starts at 25. */
export const coinFaceBands = () => ({ silver: 5, gold: 25 }) as const;

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

/** Rules / paytable sentence. One table for every mode. */
export const coinValueRulesSentence = (social: boolean): string => {
	const stake = social ? 'play-amount' : 'bet';
	return `Coin values are ${stake} multiples from fixed pools: ${poolSentence(COIN_FACE_VALUES)}.`;
};
