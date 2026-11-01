import { PLAYTABLE_BOARDER_INNER } from './uiAssetSizes';

/** Scanned scene coords at 1920×1080 — keep in sync with layoutScene goal posts. */
const CROSSBAR_TOP_Y = 220;
const CROSSBAR_HEIGHT = 30;

const OPENING_TOP = PLAYTABLE_BOARDER_INNER.y;
const CROSSBAR_BOTTOM = CROSSBAR_TOP_Y + CROSSBAR_HEIGHT;

/** Locks top spawn at crossbar/net junction — do not change. */
export const GRID_PAD_BELOW_CROSSBAR = 8;

/** Fine-tune grid Y after vertical centering (negative = move up). */
export const GRID_OPTICAL_NUDGE_Y = 0;
/** Shift reel grid right so symbols clear the left goal post (boarder inner is ~6px right of screen center). */
export const GRID_OPTICAL_NUDGE_X = 0;

const netLayoutRef = () => {
	const topInset = CROSSBAR_BOTTOM - OPENING_TOP + GRID_PAD_BELOW_CROSSBAR;
	/** Net-to-grass junction = inner opening bottom (playtable top-left coords). */
	const netBottomY = PLAYTABLE_BOARDER_INNER.h;
	const netInteriorH = netBottomY - topInset;
	const symbolSize = Math.floor(netInteriorH / 3);
	return {
		topInset,
		netBottomY,
		netInteriorH,
		symbolSize,
		maskBottomY: netInteriorH,
		bottomInset: PLAYTABLE_BOARDER_INNER.h - netBottomY,
	};
};

/** Cached at module load — playtable matches scanned opening 1:1 at 1920×1080. */
export const BOARD_NET_LAYOUT = netLayoutRef();

export const boardNetLayout = () => BOARD_NET_LAYOUT;

/** Crossbar → net-to-grass (excludes extra grass art below opening on portrait). */
export const VISIBLE_PLAYTABLE_REF_H =
	BOARD_NET_LAYOUT.topInset + BOARD_NET_LAYOUT.maskBottomY;
