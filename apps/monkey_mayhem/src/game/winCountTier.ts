import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import type { WinPopupAlias } from './uiAssetSizes';

import { WIN_COUNT_BASE_COUNT_MS } from './winCountLayout';
import { productionFeatureScale } from './presentationClocks';



export type WinCountTier = WinPopupAlias | null;



export type WinPresentationTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Cap multiplier for this game (all modes). */
export const MAX_WIN_MULTIPLIER = 25000;

export const isMaxWinMultiplier = (multiplier: number) => multiplier >= MAX_WIN_MULTIPLIER;

/** Clamp a shown face / pot / MULTI product to 25,000×. */
export const capWinMultiplier = (multiplier: number): number => {
	const n = Number(multiplier);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.min(MAX_WIN_MULTIPLIER, n);
};

/** Uncollected coin faces still on the board (not pots). */
export const leftoverCoinSum = (
	items: ReadonlyArray<{
		kind?: string;
		collected?: boolean;
		displayValue?: number;
		value?: number;
		payout?: number;
	}>,
): number => {
	let total = 0;
	for (const item of items) {
		if (item.kind !== 'coin' || item.collected) continue;
		const n = Number(item.displayValue ?? item.value ?? item.payout ?? 0);
		if (Number.isFinite(n) && n > 0) total += Math.round(n);
	}
	return total;
};

/**
 * Pot face so pot + leftover coins never exceed 25,000×.
 * Leftover already ≥ 25,000 → pot 0 (gather coins, then max-win count-up).
 */
export const capPotToBoard = (rawPot: number, leftover: number): number => {
	const leftoverN = Math.max(0, Math.round(Number(leftover) || 0));
	const raw = Math.max(0, Math.round(Number(rawPot) || 0));
	if (leftoverN >= MAX_WIN_MULTIPLIER) return 0;
	if (raw + leftoverN > MAX_WIN_MULTIPLIER) return MAX_WIN_MULTIPLIER - leftoverN;
	return raw;
};

export const isBoardAtMaxWin = (leftover: number, potFace = 0) =>
	leftover >= MAX_WIN_MULTIPLIER || leftover + potFace >= MAX_WIN_MULTIPLIER;

/** Book units for 25,000×. Math `setWin` is `multiplier * 100` — no dollar bet in the book. */
export const maxWinBookAmount = (): number => MAX_WIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER;

/** Clamp a book amount so the currency string never exceeds 25,000×. */
export const capBookAmount = (bookAmount: number): number => {
	const n = Number(bookAmount);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.min(maxWinBookAmount(), n);
};



/** Center spin-win count-up (and center payline amount) only at this multiplier or above. */
export const CENTER_WIN_COUNT_UP_MIN_MULTIPLIER = 50;

/** @deprecated Use CENTER_WIN_COUNT_UP_MIN_MULTIPLIER — kept for imports. */
export const BASE_GAME_CENTER_WIN_MIN_MULTIPLIER = CENTER_WIN_COUNT_UP_MIN_MULTIPLIER;

export const shouldShowCenterWinCountUp = (bookAmount: number) =>
	getWinMultiplier(bookAmount) >= CENTER_WIN_COUNT_UP_MIN_MULTIPLIER;

export const shouldShowBaseGameCenterWin = shouldShowCenterWinCountUp;

/** Lowest multiplier that triggers BIG WIN popup + big-win skip blocking. */
export const BIG_WIN_MIN_MULTIPLIER = 40;

/** Turbo / super-turbo: only pause for win popup at this multiplier or above. */
export const TURBO_WIN_POPUP_MIN_MULTIPLIER = CENTER_WIN_COUNT_UP_MIN_MULTIPLIER;

export const shouldPauseForTurboWinPopup = (bookAmount: number) =>
	getWinMultiplier(bookAmount) >= TURBO_WIN_POPUP_MIN_MULTIPLIER;

/** True when spinWinPresent will run a center count-up (toolbar should wait). */
export const shouldDeferToolbarWinUntilCountUp = (
	bookEvent: { totalWin: number; wins: { positions?: unknown[] }[] },
	gameType: 'basegame' | 'freegame',
	opts?: { presentationSkipped?: boolean },
) => {
	if (opts?.presentationSkipped) return false;
	if (bookEvent.totalWin <= 0) return false;

	const showCenter = shouldShowCenterWinCountUp(bookEvent.totalWin);
	if (!showCenter) return false;

	const tier = getWinPresentationTier(bookEvent.totalWin);
	if (tier <= 2) {
		return bookEvent.wins.some((w) => (w.positions?.length ?? 0) > 0);
	}
	return true;
};



/**

 * Win celebration thresholds (× per-spin bet/denomination):

 *   40×–149× BIG · 150×–499× SUPER · 500×–2499× MEGA · 2500×–24999× EPIC · 25000× MAX

 */

export const WIN_POPUP_MULTIPLIER_THRESHOLDS = [

	{ mult: 40, tier: 'big', presentation: 4 },

	{ mult: 150, tier: 'superwin', presentation: 5 },

	{ mult: 500, tier: 'mega', presentation: 6 },

	{ mult: 2500, tier: 'epic', presentation: 7 },

	{ mult: MAX_WIN_MULTIPLIER, tier: 'max', presentation: 8 },

] as const satisfies ReadonlyArray<{

	mult: number;

	tier: Exclude<WinCountTier, null>;

	presentation: WinPresentationTier;

}>;

/** Ascending popup tiers for count-up threshold crossings. */
export const WIN_COUNT_TIER_ORDER = WIN_POPUP_MULTIPLIER_THRESHOLDS.map((t) => t.tier);

export const winCountTierRank = (tier: WinCountTier): number => {
	if (!tier) return -1;
	return WIN_COUNT_TIER_ORDER.indexOf(tier);
};



export const getWinMultiplier = (bookAmount: number) => {
	const n = Number(bookAmount);
	if (!Number.isFinite(n) || n <= 0) return 0;
	return n / BOOK_AMOUNT_MULTIPLIER;
};



export const getWinCountTier = (multiplier: number): WinCountTier => {

	for (let i = WIN_POPUP_MULTIPLIER_THRESHOLDS.length - 1; i >= 0; i--) {

		if (multiplier >= WIN_POPUP_MULTIPLIER_THRESHOLDS[i].mult) {

			return WIN_POPUP_MULTIPLIER_THRESHOLDS[i].tier;

		}

	}

	return null;

};



export const getWinCountTierFromAmount = (bookAmount: number): WinCountTier =>

	getWinCountTier(getWinMultiplier(bookAmount));



export const getWinPresentationTier = (bookAmount: number): WinPresentationTier => {

	const mult = getWinMultiplier(bookAmount);

	for (let i = WIN_POPUP_MULTIPLIER_THRESHOLDS.length - 1; i >= 0; i--) {

		if (mult >= WIN_POPUP_MULTIPLIER_THRESHOLDS[i].mult) {

			return WIN_POPUP_MULTIPLIER_THRESHOLDS[i].presentation;

		}

	}

	return 1;

};



export const isBookAmountBigWin = (bookAmount: number) =>

	getWinMultiplier(bookAmount) >= BIG_WIN_MIN_MULTIPLIER;



/** Feature clock — win count-up and bonus intro stay almost full length. */
export const winPresentationSpeedScale = (): number => productionFeatureScale();

const scaleWinCountMs = (ms: number) =>
	Math.max(200, Math.round(ms * winPresentationSpeedScale()));

/** Unscaled count-up duration for the highest tier crossed. */
export const winCountDurationMsRaw = (multiplier: number): number => {
	const tier = getWinCountTier(multiplier);

	if (!tier) return WIN_COUNT_BASE_COUNT_MS;
	if (tier === 'big') return 5000;
	if (tier === 'superwin') return 8000;
	if (tier === 'mega') return 12000;
	if (tier === 'epic') return 16000;
	return 22000;
};

/** Count-up durations scale with turbo in production (use pacedWinCountDurationMs in FX Lab). */
export const winCountDurationMs = (multiplier: number): number =>
	scaleWinCountMs(winCountDurationMsRaw(multiplier));

/** Brief hold after a skipped count-up before fade-out (turbo = near-instant). */
export const winCountAfterSkipHoldMs = () => scaleWinCountMs(700);


