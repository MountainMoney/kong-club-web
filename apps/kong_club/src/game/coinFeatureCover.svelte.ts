/**
 * Hides reel symbols only under coins/pots that have spawned (`keys`).
 * Coin/pot cells shrink first; every other cell gets the dim wash (including unused tiles).
 */

import { stateBet } from 'state-shared';

import { BOARD_DIMENSIONS } from './constants';
import { isPeakSpinBetMode } from './betModes';

export const PRE_COIN_SHRINK_MS = 240;

const cellKeysFromPositions = (positions: Array<{ reel: number; row: number }>) => {
	const keys = new Set<string>();
	for (const position of positions) {
		if (position.reel < 0 || position.row < 0) continue;
		keys.add(cellCoverKey(position.reel, position.row));
	}
	return keys;
};

export const stateCoinFeatureCover = $state<{
	keys: Set<string>;
	litKeys: Set<string>;
	shrinkKeys: Set<string>;
	dimActive: boolean;
	preCoinShrinkActive: boolean;
	/** SUMMIT gold plate — on at pre-coin shrink, stays through the held board. */
	summitPlateActive: boolean;
	/** Next Feature/PEAK spin is leaving the held board (do not snap-clear). */
	heldDismissActive: boolean;
	/** Plaque fade in flight — finishReveal must not reset alpha/plate. */
	tileFadeActive: boolean;
	/** Plaques + gold plate fade while the next drop comes in. */
	tileFadeAlpha: number;
	/** Horizontal squash of a ranked tile during the first half of its coin flip. */
	flipScaleX: Record<string, number>;
}>({
	keys: new Set(),
	litKeys: new Set(),
	shrinkKeys: new Set(),
	dimActive: false,
	preCoinShrinkActive: false,
	summitPlateActive: false,
	heldDismissActive: false,
	tileFadeActive: false,
	tileFadeAlpha: 1,
	flipScaleX: {},
});

export const cellCoverKey = (reel: number, row: number) => `${reel}:${row}`;

export const beginPreCoinShrink = (positions: Array<{ reel: number; row: number }>) => {
	stateCoinFeatureCover.shrinkKeys = cellKeysFromPositions(positions);
	stateCoinFeatureCover.preCoinShrinkActive = true;
	if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
		stateCoinFeatureCover.summitPlateActive = true;
	}
};

/** Whole 6×5 — bonus entry. Does not light the Summit plate. */
export const beginFullBoardShrink = () => {
	const positions: Array<{ reel: number; row: number }> = [];
	for (let reel = 0; reel < BOARD_DIMENSIONS.x; reel += 1) {
		for (let row = 0; row < BOARD_DIMENSIONS.y; row += 1) {
			positions.push({ reel, row });
		}
	}
	stateCoinFeatureCover.shrinkKeys = cellKeysFromPositions(positions);
	stateCoinFeatureCover.preCoinShrinkActive = true;
};

export const endFullBoardShrink = () => {
	stateCoinFeatureCover.preCoinShrinkActive = false;
	stateCoinFeatureCover.shrinkKeys = new Set();
};

export const isPreCoinShrinkCell = (reel: number, row: number) =>
	stateCoinFeatureCover.shrinkKeys.has(cellCoverKey(reel, row));

export const isCoinCellCovered = (reel: number, row: number) =>
	stateCoinFeatureCover.keys.has(cellCoverKey(reel, row));

export const isCoinFeatureLit = (reel: number, row: number) =>
	stateCoinFeatureCover.litKeys.has(cellCoverKey(reel, row));

export const setCoinCellCover = (positions: Array<{ reel: number; row: number }>) => {
	stateCoinFeatureCover.keys = new Set(
		positions.map((position) => cellCoverKey(position.reel, position.row)),
	);
};

/** Drop cover on one cell once its leaving coin has cleared the mask. */
export const releaseCoinCellCover = (reel: number, row: number) => {
	const key = cellCoverKey(reel, row);
	if (!stateCoinFeatureCover.keys.has(key)) return;
	const next = new Set(stateCoinFeatureCover.keys);
	next.delete(key);
	stateCoinFeatureCover.keys = next;
};

/** Dim every cell that is not a coin/pot target. */
export const beginCoinFeatureDim = (positions: Array<{ reel: number; row: number }>) => {
	const lit = cellKeysFromPositions(positions);
	stateCoinFeatureCover.litKeys = lit;
	stateCoinFeatureCover.dimActive = lit.size > 0;
};

export const clearCoinCellCover = () => {
	stateCoinFeatureCover.flipScaleX = {};
	stateCoinFeatureCover.keys = new Set();
	stateCoinFeatureCover.litKeys = new Set();
	stateCoinFeatureCover.shrinkKeys = new Set();
	stateCoinFeatureCover.dimActive = false;
	stateCoinFeatureCover.preCoinShrinkActive = false;
	if (!stateCoinFeatureCover.heldDismissActive) {
		stateCoinFeatureCover.summitPlateActive = false;
		stateCoinFeatureCover.tileFadeAlpha = 1;
	}
};

export const beginHeldBoardDismiss = () => {
	stateCoinFeatureCover.heldDismissActive = true;
	stateCoinFeatureCover.tileFadeActive = true;
	stateCoinFeatureCover.dimActive = false;
	stateCoinFeatureCover.preCoinShrinkActive = false;
};

export const isHeldBoardDismissActive = () => stateCoinFeatureCover.heldDismissActive;

/** Coins/pots still covering cells after collect — next spin should leave with the reels. */
export const hasSittingCoinCells = () => stateCoinFeatureCover.keys.size > 0;

export const setHeldTileFadeAlpha = (alpha: number) => {
	stateCoinFeatureCover.tileFadeAlpha = Math.max(0, Math.min(1, alpha));
};

export const finishHeldBoardDismiss = () => {
	stateCoinFeatureCover.heldDismissActive = false;
	stateCoinFeatureCover.tileFadeActive = false;
	stateCoinFeatureCover.summitPlateActive = false;
	stateCoinFeatureCover.tileFadeAlpha = 1;
	stateCoinFeatureCover.keys = new Set();
	stateCoinFeatureCover.litKeys = new Set();
	stateCoinFeatureCover.shrinkKeys = new Set();
	stateCoinFeatureCover.dimActive = false;
	stateCoinFeatureCover.preCoinShrinkActive = false;
};

/** After the plaque fade — only if coins have already left (or never sat). */
export const completeHeldTileFade = () => {
	stateCoinFeatureCover.tileFadeActive = false;
	if (!stateCoinFeatureCover.heldDismissActive) return;
	if (stateCoinFeatureCover.keys.size > 0) return;
	finishHeldBoardDismiss();
};

/** Coins gone — wait if plaques are still fading. */
export const tryFinishHeldBoardDismiss = () => {
	if (!stateCoinFeatureCover.heldDismissActive) return;
	if (stateCoinFeatureCover.tileFadeActive) return;
	finishHeldBoardDismiss();
};
