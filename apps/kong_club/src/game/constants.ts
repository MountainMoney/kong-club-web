import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 80;

/** Cell-center alignment (0.5). Higher values shove column 6 into the vine frame. */
export const REEL_PADDING = 0.5;

export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{ name: 'BA' },
		{ name: 'GR' },
		{ name: 'OR' },
		{ name: 'CO' },
		{ name: 'A' },
		{ name: 'K' },
		{ name: 'J' },
	],
	[
		{ name: 'GR' },
		{ name: 'BA' },
		{ name: 'LE' },
		{ name: 'Q' },
		{ name: 'A' },
		{ name: 'A' },
		{ name: 'T' },
	],
	[
		{ name: 'LE' },
		{ name: 'BA' },
		{ name: 'GR' },
		{ name: 'OR' },
		{ name: 'K' },
		{ name: 'K' },
		{ name: 'Q' },
	],
	[
		{ name: 'OR' },
		{ name: 'CO' },
		{ name: 'LE' },
		{ name: 'BA' },
		{ name: 'Q' },
		{ name: 'J' },
		{ name: 'T' },
	],
	[
		{ name: 'LE' },
		{ name: 'OR' },
		{ name: 'GR' },
		{ name: 'CO' },
		{ name: 'A' },
		{ name: 'Q' },
		{ name: 'K' },
	],
	[
		{ name: 'CO' },
		{ name: 'GR' },
		{ name: 'BA' },
		{ name: 'OR' },
		{ name: 'T' },
		{ name: 'J' },
		{ name: 'A' },
	],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

/** Padded board rows that are visible on the cluster grid (rows 1–5 of 7). */
export const VISIBLE_BOARD_ROWS = [1, 2, 3, 4, 5] as const;

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

/** Clip fall-out at the wood rail — same idea as FF `BOARD_MASK_NET_BOTTOM_TRIM`. */
export const BOARD_MASK_BOTTOM_TRIM = Math.ceil(SYMBOL_SIZE * 0.05);
/** Glow / AA only. A full-cell bleed parked the pad/refill row on the top rail. */
export const BOARD_MASK_TOP_BLEED = Math.ceil(SYMBOL_SIZE * 0.12);

export const BACKGROUND_RATIO = 1920 / 1080;
export const PORTRAIT_BACKGROUND_RATIO = 800 / 1422;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['BA', 'GR', 'OR', 'CO', 'LE'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 73,
	reelPaddingMultiplierNormal: 1.15,
	/** FF: stock SDK 10, halved so the tail tease reads instead of hanging. */
	reelPaddingMultiplierAnticipated: 5,
	/** Leave L→R — clip ~100ms between columns. */
	reelFallOutDelay: 100,
	/** Incoming L→R — same wave, columns overlap in the air. */
	reelFallInStagger: 100,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 1.15,
	symbolFallInInterval: 28,
	/** ~150ms dip + recoil at 0.16 cell (Le Bandit spring). */
	symbolFallInBounceSpeed: 0.105,
	symbolFallInBounceSizeMulti: 0.16,
	symbolFallOutSpeed: 1.15,
	symbolFallOutInterval: 28,
};

/** First tease reel land delay after the last normal column. Rolled once per spin. */
export const ANTICIPATION_HANG_MS_MIN = 700;
export const ANTICIPATION_HANG_MS_MAX = 1400;
/** Gap between tease reels. Later remaining reels scale this up (last chance longest). */
export const ANTICIPATION_REEL_STAGGER_MS_MIN = 380;
export const ANTICIPATION_REEL_STAGGER_MS_MAX = 700;

/** Tail-reel tease — hang is land time, not an empty sit. Same gravity as normal. */
export const SPIN_OPTIONS_ANTICIPATED = {
	...SPIN_OPTIONS_DEFAULT,
	reelAnticipationHangMs: ANTICIPATION_HANG_MS_MIN,
	reelAnticipationHangMsMin: ANTICIPATION_HANG_MS_MIN,
	reelAnticipationHangMsMax: ANTICIPATION_HANG_MS_MAX,
	reelAnticipationStaggerMs: ANTICIPATION_REEL_STAGGER_MS_MIN,
	reelAnticipationStaggerMsMin: ANTICIPATION_REEL_STAGGER_MS_MIN,
	reelAnticipationStaggerMsMax: ANTICIPATION_REEL_STAGGER_MS_MAX,
	reelPaddingMultiplierAnticipated: SPIN_OPTIONS_SHARED.reelPaddingMultiplierNormal,
};

/** Scatter / buy-bonus roll-in — slower, staggered, readable ST land. */
export const SPIN_OPTIONS_SCATTER_ROLLIN = {
	...SPIN_OPTIONS_DEFAULT,
	symbolFallInSpeed: SPIN_OPTIONS_DEFAULT.symbolFallInSpeed * 0.86,
	symbolFallOutSpeed: SPIN_OPTIONS_DEFAULT.symbolFallOutSpeed * 0.86,
	symbolFallInInterval: Math.round(SPIN_OPTIONS_DEFAULT.symbolFallInInterval * 1.08),
	symbolFallOutInterval: Math.round(SPIN_OPTIONS_DEFAULT.symbolFallOutInterval * 1.08),
	reelFallOutDelay: Math.round(SPIN_OPTIONS_SHARED.reelFallOutDelay * 1.08),
};

/** Hear (4 ST) — wider stagger so the extra scatter reads. */
export const SPIN_OPTIONS_SCATTER_ROLLIN_45 = {
	...SPIN_OPTIONS_SCATTER_ROLLIN,
	symbolFallInSpeed: SPIN_OPTIONS_SCATTER_ROLLIN.symbolFallInSpeed * 0.9,
	symbolFallOutSpeed: SPIN_OPTIONS_SCATTER_ROLLIN.symbolFallOutSpeed * 0.9,
	reelFallOutDelay: Math.round(SPIN_OPTIONS_SCATTER_ROLLIN.reelFallOutDelay * 1.22),
	reelPaddingMultiplierAnticipated: 4.5,
};

/** Super turbo — whole board as one unit, faster than turbo, not a flash. */
export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 3.1,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.105,
	symbolFallInBounceSizeMulti: 0.16,
	symbolFallOutSpeed: 3.1,
	symbolFallOutInterval: 0,
	reelFallOutDelay: 0,
	reelFallInStagger: 0,
};

/** Turbo — columns drop as a unit, slight L→R between reels. */
export const SPIN_OPTIONS_TURBO = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 1.85,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.105,
	symbolFallInBounceSizeMulti: 0.16,
	symbolFallOutSpeed: 1.85,
	symbolFallOutInterval: 0,
	reelFallOutDelay: 28,
	reelFallInStagger: 28,
};

/** Turbo scatter roll-in — same slight L→R as turbo spins. */
export const SPIN_OPTIONS_SCATTER_ROLLIN_TURBO = {
	...SPIN_OPTIONS_TURBO,
};

export const SPIN_OPTIONS_SCATTER_ROLLIN_TURBO_45 = {
	...SPIN_OPTIONS_SCATTER_ROLLIN_TURBO,
	reelPaddingMultiplierAnticipated: 4.5,
};

export type SpinOptions = typeof SPIN_OPTIONS_DEFAULT;

export const MOTION_BLUR_VELOCITY = 31;

/**
 * Playfield stack (front → back):
 * title → board border → symbols → board background
 */
export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
	/** Opaque wood / grid fill under the reels. */
	boardBackground: 1,
	playfield: 2,
	/** Bronze / silver / gold plaques — under symbols. */
	boardTiles: 5,
	/** Reels, tumble, coin powers, payline pops — under the vine border. */
	boardSymbols: 10,
	paylineWin: 12,
	mascot: 30,
	/** Hollow vine frame over symbols (mount after board content in Game.svelte). */
	boardBorder: 100,
	/** Coin / pot faces over the side vines so labels stay readable. */
	coinFeature: 105,
	/** Title above the board chrome. */
	playfieldTitle: 110,
	/** SUMMIT tease wash — App/canvas sibling above MainContainer, under bar + mascot. */
	summitTeaseOverlay: 118,
	/** Progress bar while the SUMMIT tease wash is up. */
	summitTeaseBar: 122,
	/** Front MainContainer (mascot + bar) above the canvas wash. */
	summitTeaseFront: 126,
	/** Mascot while the SUMMIT tease wash is up. */
	summitTeaseMascot: 125,
	ui: 120,
	/** Full-screen black cover during bonus entry. */
	blackScreen: 150,
	spinWinOverlay: 160,
	/** Boot title card over jungle_bg (under playfield until dismissed). */
	splash: 200,
};

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 0.42, height: 0.42 },
};

/** Shared cell fill for all pay symbols — even scale into the wood grid. */
const REEL_SYMBOL_SIZE = 0.86;
/** A / K / Q / J / 10 — 20% smaller than fruit / high symbols. */
const ROYAL_SYMBOL_SIZE = REEL_SYMBOL_SIZE * 0.8;

const createSymbolSprites = (assetKey: string, size = REEL_SYMBOL_SIZE) => {
	const sprite = {
		type: 'sprite' as const,
		assetKey,
		sizeRatios: { width: size, height: size },
	};
	return {
		explosion,
		win: sprite,
		postWinStatic: sprite,
		static: sprite,
		spin: sprite,
		land: sprite,
	};
};

/** Scatter — same cell fill as pay symbols so roll-in does not overflow the mask. */
const scatterSymbol = {
	type: 'sprite' as const,
	assetKey: 'ST',
	sizeRatios: { width: REEL_SYMBOL_SIZE, height: REEL_SYMBOL_SIZE },
};
const wildW = {
	type: 'spine' as const,
	assetKey: 'barrelWild',
	animationName: 'mutong',
	/** Looping barrel. Same cell fill as the other pay symbols. */
	sizeRatios: { width: REEL_SYMBOL_SIZE, height: REEL_SYMBOL_SIZE },
	loop: true,
};
/** Coin discs — bronze / silver / gold. Same cell fill the static coins used. */
const createCoinSpine = (animationName: 'tongbi' | 'yinbi' | 'jinbi') => {
	const spine = {
		type: 'spine' as const,
		assetKey: 'coinMetal',
		animationName,
		sizeRatios: { width: 0.8, height: 0.8 },
		/** One flip, then hold the landed face. */
		loop: false,
	};
	return {
		explosion,
		win: spine,
		postWinStatic: spine,
		static: spine,
		spin: spine,
		land: spine,
	};
};

const createWildSprites = () => ({
	explosion,
	win: wildW,
	postWinStatic: wildW,
	static: wildW,
	spin: wildW,
	land: wildW,
});

const createScatterSprites = () => ({
	explosion,
	win: scatterSymbol,
	postWinStatic: scatterSymbol,
	static: scatterSymbol,
	spin: scatterSymbol,
	land: scatterSymbol,
});

export const SYMBOL_INFO_MAP = {
	LE: createSymbolSprites('LE'),
	CO: createSymbolSprites('CO'),
	OR: createSymbolSprites('OR'),
	GR: createSymbolSprites('GR'),
	BA: createSymbolSprites('BA'),
	T: createSymbolSprites('T', ROYAL_SYMBOL_SIZE),
	J: createSymbolSprites('J', ROYAL_SYMBOL_SIZE),
	Q: createSymbolSprites('Q', ROYAL_SYMBOL_SIZE),
	K: createSymbolSprites('K', ROYAL_SYMBOL_SIZE),
	A: createSymbolSprites('A', ROYAL_SYMBOL_SIZE),
	CB: createCoinSpine('tongbi'),
	CS: createCoinSpine('yinbi'),
	CG: createCoinSpine('jinbi'),
	MW: createWildSprites(),
	ST: createScatterSprites(),
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
