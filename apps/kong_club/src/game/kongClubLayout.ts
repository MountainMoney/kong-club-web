import type { LayoutMode } from './responsiveManager';
import { BACKGROUND_RATIO } from './constants';
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
	const targetFrameW = main.width * MOCKUP_FRAME_W_RATIO;
	const base = baseFrameSize();
	const scale = targetFrameW / base.w;

	return {
		x: main.width * 0.5,
		y: main.height * MOCKUP_BOARD_CENTER_Y_RATIO,
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
	/** Spine sit on the stump (lab 2026-08-30). Extra on top of stumpNudge. */
	spineNudge: { x: 39, y: -32 },
	/**
	 * Stump cut-face center in `jungle_bg.png` (cover-fitted).
	 * Y is the flat top — not the grass at the stump base.
	 */
	stumpBgRatio: { x: 0.912, y: 0.84 },
	/** Fine-tune after bg→main conversion (main-layout px at 1422×800). */
	stumpNudge: { x: 8, y: 18 },
} as const;

/** Title — top-left, sized to stay in the header (square logo must not cover the grid). */
export const getMonkeyTitleLayout = (board: MonkeyBoardLayout) => {
	const frame = getMonkeyUnifiedFrameLayout(board);
	return {
		x: 12,
		y: 8,
		width: Math.round(frame.width * 0.25),
		anchor: { x: 0, y: 0 } as const,
	};
};

/** Empty / fill bar art shares the board/border canvas (1564×1194). */
export const PROGRESS_BAR_CANVAS = { w: 1564, h: 1194 } as const;
/** Green fill opaque rect on that canvas (inset inside the maroon track). */
export const PROGRESS_BAR_FILL_RECT = { x: 334, y: 138, w: 897, h: 34 } as const;

/** Top-slot meter — board-local, same transform as wood/vines. */
export const MONKEY_PROGRESS_BAR = {
	zIndex: 12,
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

/** Cover-fit jungle_bg geometry (matches `Background.svelte`). */
const getJungleBgCover = (canvasW: number, canvasH: number) => {
	const canvasRatio = canvasW / canvasH;
	if (canvasRatio > BACKGROUND_RATIO) {
		return { width: canvasW, height: canvasW / BACKGROUND_RATIO, x: canvasW / 2, y: canvasH / 2 };
	}
	return { width: canvasH * BACKGROUND_RATIO, height: canvasH, x: canvasW / 2, y: canvasH / 2 };
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
	_board?: MonkeyBoardLayout,
	canvas?: { width: number; height: number },
) => {
	const m = MONKEY_MASCOT;
	const height = main.height * m.heightScreenRatio;
	const width = height * m.aspect;

	const canvasW = canvas?.width ?? main.width;
	const canvasH = canvas?.height ?? main.height;
	const bg = getJungleBgCover(canvasW, canvasH);
	const stumpCanvasX = bg.x - bg.width / 2 + m.stumpBgRatio.x * bg.width;
	const stumpCanvasY = bg.y - bg.height / 2 + m.stumpBgRatio.y * bg.height;

	const mainX = 'x' in main && 'scale' in main ? main.x : canvasW / 2;
	const mainY = 'y' in main && 'scale' in main ? main.y : canvasH / 2;
	const mainScale = 'scale' in main ? main.scale : 1;

	let feetX =
		main.width * 0.5 + (stumpCanvasX - mainX) / mainScale + m.stumpNudge.x;
	let feetY =
		main.height * 0.5 + (stumpCanvasY - mainY) / mainScale + m.stumpNudge.y;

	const maxX = main.width - width * 0.35;
	const minX = width * 0.35;
	const maxY = main.height - 8;
	const minY = height * 0.55;
	feetX = Math.min(maxX, Math.max(minX, feetX));
	feetY = Math.min(maxY, Math.max(minY, feetY));

	return { x: feetX, y: feetY, width, height };
};

export const isMonkeyMascotVisible = (layoutType: LayoutMode) => layoutType !== 'portrait';
