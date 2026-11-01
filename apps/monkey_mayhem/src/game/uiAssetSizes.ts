/** Native pixel dimensions for football/ui PNGs — keep in sync with files on disk. */
export const UI_ASSET_PIXELS = {
	btn_spin: { w: 694, h: 694 },
	btn_autospin: { w: 694, h: 694 },
	btn_turbo: { w: 694, h: 694 },
	btn_disable: { w: 1023, h: 1023 },
	bonus_button: { w: 445, h: 445 },
	playtable_background: { w: 1920, h: 1080 },
	playtable_boarder: { w: 1920, h: 1080 },
	/** FS outro TOTAL WIN art — V2 typography (all tiers share one plate). */
	label_total_win_tier1: { w: 1894, h: 649 },
	label_total_win_tier2: { w: 1894, h: 649 },
	label_total_win_tier3: { w: 1894, h: 649 },
	win_popup_big: { w: 1298, h: 495 },
	win_popup_super: { w: 1683, h: 578 },
	win_popup_mega: { w: 1545, h: 564 },
	win_popup_epic: { w: 1632, h: 652 },
	intro_logo: { w: 1408, h: 1408 },
	/** Playfield title (sprites/monkeySymbols/title_art.png). */
	title_art: { w: 1408, h: 1408 },
	intro_card_bg: { w: 938, h: 1080 },
	intro_card_border: { w: 938, h: 1080 },
	/** Max-win 25,000× wordmark (Downloads/grok-09f4db64…png). */
	intro_card_10000x: { w: 1408, h: 1408 },
} as const;

/** Painted 25,000× bounds inside the square plate (alpha bbox). */
export const INTRO_CARD_10000X_CONTENT = { x: 69, y: 486, w: 1316, h: 467 } as const;

/** Pin the sprite to the wordmark bottom so square padding does not gap the amount. */
export const introCard10000xAnchor = {
	x:
		(INTRO_CARD_10000X_CONTENT.x + INTRO_CARD_10000X_CONTENT.w / 2) /
		UI_ASSET_PIXELS.intro_card_10000x.w,
	y:
		(INTRO_CARD_10000X_CONTENT.y + INTRO_CARD_10000X_CONTENT.h) /
		UI_ASSET_PIXELS.intro_card_10000x.h,
} as const;

/** Visual scale multiplier for intro_logo sprites (splash + playfield). */
export const INTRO_LOGO_RENDER_SCALE = 1.1;

/**
 * Painted 6×5 wood on V2 `board.png` (1564×1194) — opaque bbox.
 * Maps onto logical 480×400 so each symbol center lands mid-cell.
 */
export const BOARD_FRAME_INNER = {
	x: 254,
	y: 200,
	w: 1042,
	h: 882,
} as const;

/** @deprecated Use BOARD_FRAME_INNER */
export const BOARD_BORDER_INNER = BOARD_FRAME_INNER;

/** @deprecated Use BOARD_FRAME_INNER */
export const BOARD_BACK_INNER = BOARD_FRAME_INNER;

/**
 * Inner transparent opening of `playtable_boarder.png` (1920 × 1080).
 * Pixel-scanned from static/assets/football/ui/playtable_boarder.png.
 */
export const PLAYTABLE_BOARDER_INNER = {
	x: 474,
	y: 221,
	w: 984,
	h: 619,
} as const;

/**
 * Goal-post extension below the inner opening when `playtable_boarder` is cover-scaled
 * to the playtable rectangle (1080 ref px at native asset scale).
 */
export const GOAL_FRAME_BOTTOM_BLEED_REF =
	(UI_ASSET_PIXELS.playtable_boarder.h -
		(PLAYTABLE_BOARDER_INNER.y + PLAYTABLE_BOARDER_INNER.h)) *
	(PLAYTABLE_BOARDER_INNER.h / PLAYTABLE_BOARDER_INNER.h);

/**
 * Visible net fill region of `playtable_background.png` (1920 × 1080).
 * Pixel-scanned from static/assets/football/ui/playtable_background.png.
 */
export const PLAYTABLE_BACKGROUND_NET = {
	x: 455,
	y: 201,
	w: 1026,
	h: 620,
} as const;

/** Scanned net fill RGB from playtable_background / intro_card_bg (38, 38, 38). */
export const NET_PANEL_FILL = 0x262626;

export type UiAssetKey = keyof typeof UI_ASSET_PIXELS;

export const uiDisplaySize = (key: UiAssetKey, width: number) => {
	const { w, h } = UI_ASSET_PIXELS[key];
	return { width, height: Math.round((width * h) / w) };
};

export const uiDisplaySizeFromHeight = (key: UiAssetKey, height: number) => {
	const { w, h } = UI_ASSET_PIXELS[key];
	const roundedH = Math.round(height);
	return { width: Math.round((roundedH * w) / h), height: roundedH };
};

/** Stretch playtable_boarder so its inner opening matches the playtable rectangle. */
export const playtableBoarderCoverSize = (innerWidth: number, innerHeight: number) => {
	const { w, h } = UI_ASSET_PIXELS.playtable_boarder;
	const { x: innerX, y: innerY, w: innerW, h: innerH } = PLAYTABLE_BOARDER_INNER;
	const scaleX = innerWidth / innerW;
	const scaleY = innerHeight / innerH;
	return {
		width: Math.round(w * scaleX),
		height: Math.round(h * scaleY),
		anchor: {
			x: (innerX + innerW / 2) / w,
			y: (innerY + innerH / 2) / h,
		},
	};
};

/** Stretch playtable_background so the net panel matches the playtable rectangle. */
export const playtableBackgroundCoverSize = (innerWidth: number, innerHeight: number) => {
	const { w, h } = UI_ASSET_PIXELS.playtable_background;
	const { x: netX, y: netY, w: netW, h: netH } = PLAYTABLE_BACKGROUND_NET;
	const scaleX = innerWidth / netW;
	const scaleY = innerHeight / netH;
	return {
		width: Math.round(w * scaleX),
		height: Math.round(h * scaleY),
		anchor: {
			x: (netX + netW / 2) / w,
			y: (netY + netH / 2) / h,
		},
	};
};

export type WinPopupAlias = 'big' | 'superwin' | 'mega' | 'epic' | 'max';

const WIN_POPUP_KEYS: Record<WinPopupAlias, UiAssetKey> = {
	big: 'win_popup_big',
	superwin: 'win_popup_super',
	mega: 'win_popup_mega',
	epic: 'win_popup_epic',
	max: 'intro_card_10000x',
};

export const winPopupAssetKey = (alias: string): UiAssetKey | undefined =>
	alias in WIN_POPUP_KEYS ? WIN_POPUP_KEYS[alias as WinPopupAlias] : undefined;

export const winPopupDisplaySize = (alias: WinPopupAlias, width: number) => {
	const key = WIN_POPUP_KEYS[alias];
	return uiDisplaySize(key, width);
};
