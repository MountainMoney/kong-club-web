import type { LayoutMode } from './responsiveManager';
import { jungleCover } from './backgroundCover';
import { DESIGN_PORTRAIT, UI_BAR_PORTRAIT } from './ggUi/constants';
import { BOARD_FRAME_INNER } from './uiAssetSizes';

/** Logical 6×5 grid at 80px cells — scale via `MonkeyBoardLayout.scale`. */
export const MM_BASE_GRID = { w: 480, h: 400 } as const;

/** Board art canvas `board.png` / `border.png` (V2 1564×1194). */
export const MM_BORDER_ASSET = { w: 1564, h: 1194 } as const;

/**
 * First opaque column of vine/frame art (scanned from border.png).
 * Used so the progress bar sits outside the leaves, not on the texture padding.
 */
export const MM_BORDER_VISIBLE_LEFT = 120;

/**
 * Outer vine-frame width vs mainLayout.
 * Board + vines scale — bumped up after centering lock (2026-08).
 */
export const MOCKUP_FRAME_W_RATIO = 0.718;
export const MOCKUP_FRAME_H_RATIO = BOARD_FRAME_INNER.h / BOARD_FRAME_INNER.w;
/** Slightly below center so title clears vines + canvas top. */
export const MOCKUP_BOARD_CENTER_Y_RATIO = 0.50;

const baseFrameSize = () => {
	const { w: innerW, h: innerH } = BOARD_FRAME_INNER;
	return {
		w: MM_BORDER_ASSET.w * (MM_BASE_GRID.w / innerW),
		h: MM_BORDER_ASSET.h * (MM_BASE_GRID.h / innerH),
	};
};

export type MonkeyBoardLayout = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale?: number;
};

export const getScaledBoardRect = (board: MonkeyBoardLayout): MonkeyBoardLayout => {
	const scale = board.scale ?? 1;
	return {
		x: board.x,
		y: board.y,
		width: board.width * scale,
		height: board.height * scale,
		scale,
	};
};

export const getBoardScreenMetrics = (board: MonkeyBoardLayout & { scale?: number }) => {
	const scale = board.scale ?? 1;
	const scaledW = board.width * scale;
	const scaledH = board.height * scale;
	return { scale, scaledW, scaledH, halfW: scaledW / 2, halfH: scaledH / 2 };
};

/** Scale playfield to match reference mockup proportions on mainLayout. */
export const getMonkeyBoardLayout = (
	_layoutType: LayoutMode,
	main: { width: number; height: number },
): MonkeyBoardLayout & {
	scale: number;
	anchor: { x: number; y: number };
	pivot: { x: number; y: number };
} => {
	const base = baseFrameSize();
	const portrait = main.height > main.width * 1.05;
	// Portrait: symbol grid ≈ 90% of the playfield width, sitting in the upper half.
	const targetFrameW = portrait
		? main.width * 0.9 * (base.w / MM_BASE_GRID.w)
		: main.width * MOCKUP_FRAME_W_RATIO;
	const scale = targetFrameW / base.w;
	const frameH = base.h * scale;
	const centerY = portrait
		? main.height * 0.05 + frameH / 2
		: main.height * MOCKUP_BOARD_CENTER_Y_RATIO;

	return {
		x: main.width * 0.5,
		y: centerY,
		width: MM_BASE_GRID.w,
		height: MM_BASE_GRID.h,
		scale,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: MM_BASE_GRID.w / 2, y: MM_BASE_GRID.h / 2 },
	};
};

/** @deprecated Use getMonkeyBoardLayout */
export const getMonkeyBoardCenter = (
	layoutType: LayoutMode,
	main: { width: number; height: number },
) => {
	const board = getMonkeyBoardLayout(layoutType, main);
	return { x: board.x, y: board.y };
};

/**
 * One transform for the combined board art.
 * Maps BOARD_FRAME_INNER (painted 6×5) onto the logical grid (cell centers =
 * board/6 and board/5 divisions).
 */
export const getMonkeyUnifiedFrameLayout = (board: MonkeyBoardLayout) => {
	const scaled = getScaledBoardRect(board);
	const { w: assetW, h: assetH } = MM_BORDER_ASSET;
	const { x: innerX, y: innerY, w: innerW, h: innerH } = BOARD_FRAME_INNER;
	const scaleX = scaled.width / innerW;
	const scaleY = scaled.height / innerH;
	return {
		x: scaled.x,
		y: scaled.y,
		width: Math.round(assetW * scaleX),
		height: Math.round(assetH * scaleY),
		anchor: {
			x: (innerX + innerW / 2) / assetW,
			y: (innerY + innerH / 2) / assetH,
		},
	};
};

/** Wood fill uses the same transform as the vine border (no separate bleed warp). */
export const getMonkeyBoardFillLayout = (board: MonkeyBoardLayout) =>
	getMonkeyUnifiedFrameLayout(board);

/** @deprecated Use getMonkeyUnifiedFrameLayout */
export const getMonkeyFrameBorderLayout = (board: MonkeyBoardLayout) =>
	getMonkeyUnifiedFrameLayout(board);

/** @deprecated Use getMonkeyUnifiedFrameLayout */
export const getMonkeyFrameBackLayout = (board: MonkeyBoardLayout) =>
	getMonkeyUnifiedFrameLayout(board);

/** @deprecated Use getMonkeyUnifiedFrameLayout */
export const getMonkeyFrameLayout = (board: MonkeyBoardLayout) => {
	const frame = getMonkeyUnifiedFrameLayout(board);
	return {
		x: frame.x,
		y: frame.y,
		width: frame.width,
		height: frame.height,
	};
};

/** Still PNG `monkey.png` is 662×903. Spine setup pose is 647×933, AABB y = −70.5. */
export const MONKEY_MASCOT = {
	/**
	 * FF mascot is ~555/1080 ≈ 0.51 of ref height; keep MM in that ballpark
	 * so he reads as a hero beside the board (still lands on the stump).
	 */
	heightScreenRatio: 0.46,
	aspect: 662 / 903,
	/** MM_Mascot_2.json skeleton size (not the 1260 atlas square). */
	spineSize: { w: 647.1044, h: 933.3954 },
	/** Setup-pose AABB min Y. Root is above the soles; pin soles to the stump. */
	spineBoundsMinY: -70.52268,
	/**
	 * Vertical sit only. X stays 0 so the feet stay on the plate point below
	 * at every aspect — a main-pixel X nudge drifts off the stump when the
	 * playfield is contain-fit and the jungle is cover-fit.
	 */
	spineNudge: { x: 0, y: -32 },
	/**
	 * Pale cut-face center of `jungle_bg_layer5.png` (1920×1080).
	 * Measured ellipse bbox 1538–1891 × 850–948. Y is on the standing surface.
	 */
	stumpBgRatio: { x: 0.893, y: 0.84 },
	/** Vertical only, in main px. Horizontal seat is `stumpBgRatio`. */
	stumpNudge: { x: 0, y: 18 },
} as const;

/**
 * Logo sits on the top beam of the vine frame, centered — wordmark is in the
 * upper portion of the square title plate.
 */
export const getMonkeyTitleLayout = (board: MonkeyBoardLayout, portrait = false) => {
	const frame = getMonkeyUnifiedFrameLayout(board);
	const centerX = frame.x + frame.width * (0.5 - frame.anchor.x);
	const topY = frame.y - frame.height * frame.anchor.y;
	if (portrait) {
		return {
			x: centerX,
			y: topY + frame.height * 0.01,
			width: Math.round(Math.min(frame.width * 0.42, board.width * (board.scale ?? 1) * 1.15)),
			anchor: { x: 0.5, y: 0.46 } as const,
		};
	}
	return {
		x: centerX,
		y: topY + frame.height * 0.02,
		width: Math.round(frame.width * 0.36),
		anchor: { x: 0.5, y: 0.48 } as const,
	};
};

/** Empty / fill bar art shares the board/border canvas (1564×1194). */
export const PROGRESS_BAR_CANVAS = { w: 1564, h: 1194 } as const;
/** Green fill opaque rect on that canvas (inset inside the maroon track). */
export const PROGRESS_BAR_FILL_RECT = { x: 334, y: 138, w: 897, h: 34 } as const;

/** Top-slot meter — board-local, same transform as wood/vines. */
export const MONKEY_PROGRESS_BAR = {
	/** Under the vine frame (z 100) so the meter shows through the top slot. */
	zIndex: 90,
} as const;

/** Full-canvas bar overlay aligned to BOARD_FRAME_INNER (slot sits above the 6×5). */
export const getMonkeyProgressBarBoardLayout = (boardW: number, boardH: number) => {
	const inner = BOARD_FRAME_INNER;
	const scaleX = boardW / inner.w;
	const scaleY = boardH / inner.h;
	return {
		x: -inner.x * scaleX,
		y: -inner.y * scaleY,
		width: PROGRESS_BAR_CANVAS.w * scaleX,
		height: PROGRESS_BAR_CANVAS.h * scaleY,
		zIndex: MONKEY_PROGRESS_BAR.zIndex,
	};
};

/** @deprecated Use getMonkeyProgressBarBoardLayout — screen coords drift from board pivot. */
export const getMonkeyProgressBarScreenLayout = (board: MonkeyBoardLayout) => {
	const frame = getMonkeyUnifiedFrameLayout(board);
	return {
		x: frame.x - frame.width * frame.anchor.x,
		y: frame.y - frame.height * frame.anchor.y,
		width: frame.width,
		height: frame.height,
		zIndex: MONKEY_PROGRESS_BAR.zIndex,
	};
};

/** Cover-fit jungle_bg geometry (the same rect as `Background.svelte`). */
const getJungleBgCover = (canvasW: number, canvasH: number) => {
	const cover = jungleCover(canvasW, canvasH);
	return { width: cover.width, height: cover.height, x: cover.x, y: cover.y };
};

export type MonkeyMascotMainTransform = {
	width: number;
	height: number;
	x: number;
	y: number;
	scale: number;
};

/** Feet on the jungle_bg stump (bg ratios → canvas → main-layout). */
export const getMonkeyMascotLayout = (
	main: MonkeyMascotMainTransform | { width: number; height: number },
	board?: MonkeyBoardLayout,
	canvas?: { width: number; height: number },
) => {
	const m = MONKEY_MASCOT;
	const canvasW = canvas?.width ?? main.width;
	const canvasH = canvas?.height ?? main.height;
	const portrait = canvasH > canvasW * 1.05;

	if (portrait && board) {
		// Gaia's Grotto phone portrait: character centered, head on the bottom
		// row, feet just above the spin row. The bar is not moved — if the
		// pocket under the grid is shorter than that, the mascot shrinks to it.
		const frame = getMonkeyUnifiedFrameLayout(board);
		const frameTop = frame.y - frame.height * frame.anchor.y;
		const innerBottom =
			frameTop +
			frame.height * ((BOARD_FRAME_INNER.y + BOARD_FRAME_INNER.h) / MM_BORDER_ASSET.h);
		const mainScale = 'scale' in main ? main.scale : 1;
		const mainCenterY = 'y' in main && 'scale' in main ? main.y : canvasH / 2;
		const mainTop = mainCenterY - (main.height * mainScale) / 2;
		const barFit = Math.min(canvasW / DESIGN_PORTRAIT.width, canvasH / DESIGN_PORTRAIT.height);
		const barTopCanvas =
			(canvasH - DESIGN_PORTRAIT.height * barFit) / 2 + UI_BAR_PORTRAIT.top * barFit;
		const barTopMain = (barTopCanvas - mainTop) / mainScale;
		const clearance = 10 / mainScale;
		const feetY = barTopMain - clearance;
		// The skeleton box is taller than the opaque hat. Scale so the hat
		// crosses the grid the way GG's helmet does, feet still above the bar.
		const crownFill = 0.79;
		const overlap = (canvasH * 0.028) / mainScale;
		const height = Math.max(1, (feetY - innerBottom + overlap) / crownFill);
		const width = height * m.aspect;
		return {
			x: main.width * 0.5,
			y: feetY,
			width,
			height,
		};
	}

	const height = main.height * m.heightScreenRatio;
	const width = height * m.aspect;
	const bg = getJungleBgCover(canvasW, canvasH);
	const stumpCanvasX = bg.x - bg.width / 2 + m.stumpBgRatio.x * bg.width;
	const stumpCanvasY = bg.y - bg.height / 2 + m.stumpBgRatio.y * bg.height;

	const mainX = 'x' in main && 'scale' in main ? main.x : canvasW / 2;
	const mainY = 'y' in main && 'scale' in main ? main.y : canvasH / 2;
	const mainScale = 'scale' in main ? main.scale : 1;

	// Do not clamp into the main rect. On a wide fullscreen the cover-fitted
	// stump sits past the 16:9 playfield, and clamping walked the monkey off it.
	const feetX =
		main.width * 0.5 + (stumpCanvasX - mainX) / mainScale + m.stumpNudge.x;
	const feetY =
		main.height * 0.5 + (stumpCanvasY - mainY) / mainScale + m.stumpNudge.y;

	return { x: feetX, y: feetY, width, height };
};

export const isMonkeyMascotVisible = (layoutType: LayoutMode) => {
	void layoutType;
	return true;
};
