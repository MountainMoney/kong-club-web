/**
 * Layout positions as ratios of `mainLayout` (SDK scales and centers the main container).
 * Frame / bar geometry is authored on a 1920×1080 reference and scaled per layout size.
 */


import { MASCOT_CONTENT_ASPECT } from './mascotRig';
import { boardNetLayout, GRID_OPTICAL_NUDGE_X, GRID_OPTICAL_NUDGE_Y } from './boardNetLayout';
import { GOAL_FRAME_BOTTOM_BLEED_REF, INTRO_LOGO_RENDER_SCALE, PLAYTABLE_BOARDER_INNER, playtableBoarderCoverSize, UI_ASSET_PIXELS } from './uiAssetSizes';
import { BOARD_DIMENSIONS, BOARD_SIZES, REEL_PADDING, SYMBOL_SIZE } from './constants';
import { getGameLayoutProfile } from './responsiveProfile.svelte';
import { ResponsiveManager, type LayoutMode } from './responsiveManager';

export const REF_W = 1920;
export const REF_H = 1080;

/** Global playfield shrink (reels + net + goal frame). 1 = design size; <1 = smaller on screen. */
export const PLAYFIELD_SIZE_SCALE = 0.9;

export const BOARD_POSITION_X_RATIO = 0.5;
export const BOARD_POSITION_Y_RATIO = 0.42;
export const MASCOT_POSITION_X_RATIO = 0.78;
export const MASCOT_POSITION_Y_RATIO = 0.2;

/**
 * Playfield panel behind reels (design px at 1920×1080).
 * Matches scanned `playtable_boarder` inner opening so grid insets fit without squashing.
 */
export const PLAYTABLE_H = PLAYTABLE_BOARDER_INNER.h;
export const PLAYTABLE_W = PLAYTABLE_BOARDER_INNER.w;

/** Reel-window reference px — matches playtable inner opening at 1920×1080. */
export const BOARD_W = PLAYTABLE_W;
export const BOARD_H = PLAYTABLE_H;

/** In-game title above the goal crossbar (Le Bandit–style), 1920×1080 reference width. */
export const PLAYFIELD_TITLE_REF_WIDTH = 470;
/** Gap between logo bottom and top edge of playtable_boarder (full frame, above crossbar). */
export const PLAYFIELD_TITLE_GAP_ABOVE_FRAME = 48;
/** Min clearance from safe-area top so title_art decorative edge does not clip. */
export const PLAYFIELD_TITLE_TOP_SAFE_PAD_REF = 14;
export const PLAYTABLE_ALPHA = 0.9;
export const PLAYTABLE_GRID_ALPHA = 0.02;
export const PLAYTABLE_GRADIENT_TOP = 0x1f1b28;
export const PLAYTABLE_GRADIENT_BOTTOM = 0x281f3c;

export const POST_WIDTH = 40;
export const POST_TOP_Y = 202;
export const POST_BOTTOM_Y = 802;
export const LEFT_POST_X = 390;
export const RIGHT_POST_X = 1472;

export const CROSSBAR_LEFT_X = 390;
export const CROSSBAR_RIGHT_X = 1472;
export const CROSSBAR_TOP_Y = 220;
export const CROSSBAR_HEIGHT = 30;

export { GRID_PAD_BELOW_CROSSBAR, GRID_OPTICAL_NUDGE_Y } from './boardNetLayout';

export const getBoardGridLayout = () => {
	const { topInset, netBottomY, maskBottomY, bottomInset } = boardNetLayout();
	/** Cancel BoardContainer gridOffsetX so the reel window is centered in the playtable opening. */
	const reelGridOffsetX = SYMBOL_SIZE * (0.5 - REEL_PADDING);
	const contentOffsetX = (BOARD_W - BOARD_SIZES.width) / 2 - reelGridOffsetX + GRID_OPTICAL_NUDGE_X;
	const gridTop = Math.round((BOARD_H - BOARD_SIZES.height) / 2);
	return {
		contentOffsetX,
		contentOffsetY: gridTop + GRID_OPTICAL_NUDGE_Y,
		topInset,
		bottomInset,
		maskBottomY,
		netBottomY,
	};
};

export const CAP_SIZE = 89;
export const CAP_BORDER_RADIUS = 12;

/** Bottom toolbar — design px at 1920×1080 reference. */
export const TOOLBAR_W = 1237.58;
export const TOOLBAR_H = 119.27;
export const TOOLBAR_RADIUS = 4;
export const TOOLBAR_FILL_ALPHA = 0.65;
export const TOOLBAR_STROKE_ALPHA = 0.25;

export const TOOLBAR_INSET_LEFT = 44;
/** Horizontal gap between in-bonus toolbar items (menu / balance / bet / FS / win / turbo). */
export const TOOLBAR_SECTION_GAP = 44;
/** Gap from BET cluster right edge to chevron left-edge (1920 ref). */
export const BET_TO_CHEVRON_GAP_RIGHT = 28;

/** Reserved width for FS toolbar text clusters at 1920 reference (labels + values). */
export const FS_TOOLBAR_CLUSTER_W = {
	balance: 148,
	/** Wide enough for "$1,000.00" at 34px Aileron (≈160px) with the 44px chevron gap. */
	bet: 160,
	freeSpins: 132,
	totalWin: 158,
} as const;

export const TOOLBAR_SPIN_RIGHT_INSET = 76;
export const TOOLBAR_ACTION_GAP = 16;
export const TOOLBAR_STACK_GAP = 6;

export const BONUS_TOOLBAR_GAP = 16;
/** Portrait: gap between bonus button bottom and toolbar pill top (1080 ref px). */
/** Clear portrait hamburger hit box (44px+) so BONUS taps are not stolen. */
export const BONUS_ABOVE_BAR_GAP_REF = 28;

export const SPIN_DIAMETER = 156;
export const AUTO_DIAMETER = 70;
export const TURBO_DIAMETER = 70;
export const BET_ARROWS_HEIGHT = 27;
/** Space between bet label/value block and chevron controls. */
export const BET_TO_CHEVRON_GAP = 78;
/** Space between chevron controls and spin button (left edge of spin). */
export const CHEVRON_TO_SPIN_GAP = 48;

export const HAMBURGER_LINE_W = 42;
export const HAMBURGER_LINE_H = 6;
export const HAMBURGER_LINE_GAP = 5;
export const HAMBURGER_LINE_RADIUS = 1;
export const HAMBURGER_W = HAMBURGER_LINE_W;
export const HAMBURGER_H = HAMBURGER_LINE_H * 3 + HAMBURGER_LINE_GAP * 2;
export const BONUS_REF_DIAMETER = 113;
/** Portrait floating BONUS pill — larger tap target above toolbar. */
export const BONUS_PORTRAIT_DIAMETER_SCALE = 1.28;
export const LAYOUT_EDGE_MARGIN = 8;

export const BAR_LABEL_SIZE = 19;
export const BAR_VALUE_SIZE = 34;

/** Fine-tune after MonkeyBottomBar applies (valueSize - labelSize) / 2 visual lift. */
export const TOOLBAR_TEXT_STACK_OPTICAL_Y = -2;

const boardCenterRef = () => ({
	x: REF_W * BOARD_POSITION_X_RATIO,
	y: REF_H * BOARD_POSITION_Y_RATIO,
});

export const boardLocal = (() => {
	const { x: boardCenterX, y: boardCenterY } = boardCenterRef();
	return {
		leftPostX: LEFT_POST_X - boardCenterX + BOARD_W / 2,
		rightPostX: RIGHT_POST_X - boardCenterX + BOARD_W / 2,
		postTopY: POST_TOP_Y - boardCenterY + BOARD_H / 2,
		postBottomY: POST_BOTTOM_Y - boardCenterY + BOARD_H / 2,
		crossbarLeftX: CROSSBAR_LEFT_X - boardCenterX + BOARD_W / 2,
		crossbarRightX: CROSSBAR_RIGHT_X - boardCenterX + BOARD_W / 2,
		crossbarCenterY: CROSSBAR_TOP_Y - boardCenterY + BOARD_H / 2 + CROSSBAR_HEIGHT / 2,
		crossbarWidth: CROSSBAR_RIGHT_X - CROSSBAR_LEFT_X,
	};
})();

export type MainLayoutSize = { width: number; height: number };

export const getBoardCenter = (main: MainLayoutSize) =>
	ResponsiveManager.boardCenter(main, getGameLayoutProfile());

/** Lifts playfield art without moving the toolbar (1080 ref px). */
export const getPlayfieldLiftY = (layoutHeight: number) => {
	const lift = getGameLayoutProfile().playfieldLiftY ?? 0;
	return lift * (layoutHeight / REF_H);
};

export type MainLayout = MainLayoutSize & {
	x: number;
	y: number;
	scale: number;
};

export const getPlayfieldScaleFactors = (layoutWidth: number, layoutHeight: number) => {
	const profile = getGameLayoutProfile();
	// Stacked portrait fills the band like other Stake slots — no global desktop shrink.
	const sizeScale = profile.playfieldLayout === 'stacked' ? 1 : PLAYFIELD_SIZE_SCALE;
	if (profile.useUniformPlayfieldScale) {
		const uniform = (layoutWidth / REF_W) * profile.playfieldScale * sizeScale;
		// Stacked portrait: keep goal frame + symbols at native aspect (no vertical stretch).
		const syStretch =
			profile.playfieldLayout === 'stacked' ? 1 : (profile.playfieldSyStretch ?? 1);
		return { sx: uniform, sy: uniform * syStretch };
	}
	return {
		sx: (layoutWidth / REF_W) * profile.playfieldScale * sizeScale,
		sy: (layoutHeight / REF_H) * profile.playfieldScale * sizeScale,
	};
};

/** Inner opening height — matches `PLAYTABLE_BOARDER_INNER` so border/background scale uniformly. */
const playtableRefHeight = () => PLAYTABLE_H;

export const getPlaytableLayout = (layoutWidth: number, layoutHeight: number) => {
	const { sx, sy } = getPlayfieldScaleFactors(layoutWidth, layoutHeight);
	const center = getBoardCenter({ width: layoutWidth, height: layoutHeight });
	const w = PLAYTABLE_W * sx;
	const h = playtableRefHeight() * sy;
	const gridW = BOARD_SIZES.width * sx;
	const gridH = BOARD_SIZES.height * sy;
	const gridLeft = (w - gridW) * 0.5;
	const { contentOffsetY } = getBoardGridLayout();
	const gridTop = contentOffsetY * sy;
	const cellW = SYMBOL_SIZE * sx;
	const cellH = SYMBOL_SIZE * sy;

	return {
		x: center.x,
		y: center.y,
		width: w,
		height: h,
		gridLeft,
		gridTop,
		gridW,
		gridH,
		cellW,
		cellH,
		cols: BOARD_DIMENSIONS.x,
		rows: BOARD_DIMENSIONS.y,
	};
};

/** Playtable geometry for the board container (local space, centered on board pivot). */
export const getPlaytableDimensions = (layoutWidth: number, layoutHeight: number) => {
	const { x: _x, y: _y, ...dims } = getPlaytableLayout(layoutWidth, layoutHeight);
	return dims;
};

/** Playtable sprite top in board-local coords (centered on pivot). */
const playtableTopBoardLocal = (playtableHeight: number) => -playtableHeight / 2;

/** Logo bottom sits fully above the playtable frame (crossbar + reels below). */
const titleBottomBoardLocal = (playtableHeight: number, gapSy: number) =>
	playtableTopBoardLocal(playtableHeight) - gapSy;

const clampTitleBottomBoardLocal = (
	titleBottomY: number,
	height: number,
	safeTop: number,
	boardCenterY: number,
	sy: number,
) => {
	const minBottomBoardLocal =
		safeTop + PLAYFIELD_TITLE_TOP_SAFE_PAD_REF * sy + height - boardCenterY;
	return Math.max(titleBottomY, minBottomBoardLocal);
};

/** title_art placement (board-local coords, bottom-anchored). */
export const getPlayfieldTitleLayout = (layoutWidth: number, layoutHeight: number) => {
	const profile = getGameLayoutProfile();
	const { sx, sy } = getPlayfieldScaleFactors(layoutWidth, layoutHeight);
	const playtable = getPlaytableDimensions(layoutWidth, layoutHeight);
	const boardCenter = getBoardCenter({ width: layoutWidth, height: layoutHeight });
	const { w: logoW, h: logoH } = UI_ASSET_PIXELS.title_art;
	const safeTop = profile.safeArea.top;
	const isStacked = profile.playfieldLayout === 'stacked';

	const titleScale = isStacked && profile.mode === 'portrait' ? 2.24 : 0.92;
	const width = Math.min(
		Math.round(PLAYFIELD_TITLE_REF_WIDTH * sx * titleScale),
		Math.round(layoutWidth * (isStacked ? 0.86 : 0.9)),
	);
	const height = ((width * logoH) / logoW) * INTRO_LOGO_RENDER_SCALE;
	const gap = PLAYFIELD_TITLE_GAP_ABOVE_FRAME * sy;
	let titleY: number;
	if (isStacked && profile.mode === 'portrait' && profile.portraitBands?.titleLogoBottomY != null) {
		const logoBottomMain = Math.max(
			profile.portraitBands.titleLogoBottomY,
			safeTop + height,
		);
		titleY = logoBottomMain - boardCenter.y;
	} else {
		titleY = clampTitleBottomBoardLocal(
			titleBottomBoardLocal(playtable.height, gap),
			height,
			safeTop,
			boardCenter.y,
			sy,
		);
	}

	return {
		x: 0,
		y: titleY,
		width,
		height,
	};
};

/** Win-highlight stroke around the reel window (not the goalpost sprite bounds). */
export const getBoardGlowDimensions = (layoutWidth: number, layoutHeight: number) => {
	const { sx, sy } = getPlayfieldScaleFactors(layoutWidth, layoutHeight);
	return { width: BOARD_W * sx, height: playtableRefHeight() * sy };
};

/** Le Bandit pavement strip between playfield and toolbar (main-layout coords). */
export const getPortraitGapLayout = (layoutWidth: number, layoutHeight: number) => {
	const profile = getGameLayoutProfile();
	if (profile.playfieldLayout !== 'stacked' || !profile.portraitBands) return null;

	const bands = profile.portraitBands;
	return {
		x: layoutWidth * 0.5,
		y: bands.playfieldBottomY + (bands.gapBottomY - bands.playfieldBottomY) * 0.5,
		width: layoutWidth,
		height: Math.max(0, bands.gapBottomY - bands.playfieldBottomY),
	};
};

/** Canvas-space skip hit height for stacked portrait (excludes gap + toolbar). */
export const getPortraitSkipCanvasHeight = (
	main: MainLayout,
	layoutWidth: number,
	_layoutHeight: number,
) => {
	const profile = getGameLayoutProfile();
	if (profile.playfieldLayout !== 'stacked' || !profile.portraitBands) return null;
	const playfieldBottomY = profile.portraitBands.playfieldBottomY;
	return Math.max(0, main.y + (playfieldBottomY - main.height * 0.5) * main.scale);
};

/**
 * Mascot art (reference px at 1920×1080):
 *   - 555 px tall (visible rig content height)
 *   - Feet left edge sits `MASCOT_FROM_SPIN_GAP` right of the spin button
 *   - Feet sit just above the toolbar
 */
export const MASCOT_REF_HEIGHT = 555;
/** Visible rig content aspect (946×1868 union inside 1600×2000 layers). */
export const MASCOT_ASPECT = MASCOT_CONTENT_ASPECT;
export const MASCOT_REF_WIDTH = Math.round(MASCOT_REF_HEIGHT * MASCOT_ASPECT);
/** @deprecated Playtable-relative placement — mascot X now uses spin button geometry. */
export const MASCOT_FROM_PLAYTABLE_LEFT = 65;
/** Gap between goal frame right edge and mascot left feet (ref px). */
export const MASCOT_FROM_GOAL_GAP = 24;
/** Gap between mascot left feet and spin button right edge (1920 ref px). */
export const MASCOT_FROM_SPIN_GAP = 16;
/** Gap between character feet and the top of the bottom toolbar (reference px). */
export const MASCOT_FEET_GAP_ABOVE_TOOLBAR = 34;
/** Fine-tune mascot feet on the grass row (ref px at 1080; positive = lower on screen). */
export const MASCOT_FEET_GRASS_NUDGE = -14;
/** Fine-tune mascot horizontal position (ref px at 1920; positive = right). */
export const MASCOT_FEET_X_NUDGE = 36;
/** Minimum pad above visible goal bottom before feet can sit (ref px at 1080). */
export const MASCOT_GRASS_MIN_PAD_REF = 8;
export const MASCOT_SHADOW_REF_WIDTH = 260;
export const MASCOT_SHADOW_REF_HEIGHT = 75;
/** Positive = lower on screen (grass contact). */
export const MASCOT_SHADOW_Y_NUDGE = 10;
export const MASCOT_SHADOW_ALPHA = 0.58;
export const MASCOT_SHADOW_ALPHA_OUTER = 0.38;

/** Convert a canvas-space Y into main-design coordinates (inside `MainContainer`). */
export const canvasYToMainLayoutY = (canvasY: number, main: MainLayout) =>
	main.height * 0.5 + (canvasY - main.y) / main.scale;

export type MascotGrassContext = {
	mainTransform: MainLayout;
	canvasWidth: number;
	canvasHeight: number;
	layoutMode: LayoutMode;
};

/** Resolve mascot feet Y on the grass strip just above the toolbar. */
export const resolveMascotGrassFeetY = (
	main: MainLayoutSize,
	toolbarTopY: number,
): number => {
	const sy = main.height / REF_H;
	const boardCenter = getBoardCenter(main);
	const playtable = getPlaytableDimensions(main.width, main.height);
	const { sy: psy } = getPlayfieldScaleFactors(main.width, main.height);
	const goalVisualBottom =
		boardCenter.y + playtable.height / 2 + GOAL_FRAME_BOTTOM_BLEED_REF * psy;
	const feetY =
		toolbarTopY -
		MASCOT_FEET_GAP_ABOVE_TOOLBAR * sy +
		MASCOT_FEET_GRASS_NUDGE * sy;
	const grassFloor = goalVisualBottom + MASCOT_GRASS_MIN_PAD_REF * sy;
	return Math.max(feetY, grassFloor);
};

/** Mascot layout in main-design coordinates (use inside `MainContainer`). */
export const getMascotLayout = (main: MainLayoutSize, grassContext?: MascotGrassContext) => {
	const boardCenter = getBoardCenter(main);
	const playtable = getPlaytableDimensions(main.width, main.height);
	const bar = getBottomBarLayout(main.width, main.height);
	const grassFeetY = grassContext
		? resolveMascotGrassFeetY(main, bar.toolbarTopY)
		: undefined;
	return ResponsiveManager.mascotLayout(
		main,
		getGameLayoutProfile(),
		boardCenter,
		playtable,
		bar.toolbarTopY,
		bar.spinLeft + bar.spinDiameter,
		grassFeetY,
		bar.autoCenterX,
	);
};

/** Canvas-space mascot layout (root-level containers outside `MainContainer`). */
export const getMascotCanvasLayout = (main: MainLayout) => {
	const m = getMascotLayout(main);
	const toCanvas = (localX: number, localY: number) => ({
		x: main.x + (localX - main.width * 0.5) * main.scale,
		y: main.y + (localY - main.height * 0.5) * main.scale,
	});
	const feet = toCanvas(m.feetX, m.feetY);
	const shadowCenter = toCanvas(m.shadowCenterX, m.shadowCenterY);
	return {
		feetX: feet.x,
		feetY: feet.y,
		width: m.width * main.scale,
		height: m.height * main.scale,
		shadowCenterX: shadowCenter.x,
		shadowCenterY: shadowCenter.y,
		shadowWidth: m.shadowWidth * main.scale,
		shadowHeight: m.shadowHeight * main.scale,
	};
};

/** Shifts the whole bottom toolbar up (reference px at 1080 height). Lower = more gap below goal posts. */
export const PILL_BAR_LIFT_Y = 8;

/**
 * Bottom toolbar centered on screen width; bonus sits 16px left without shifting toolbar.
 * Reference geometry at 1920×1080, scaled by layoutWidth/REF_W.
 */
export const getBottomBarLayout = (layoutWidth: number, layoutHeight: number) => {
	const profile = getGameLayoutProfile();
	const sx = layoutWidth / REF_W;
	const sy = layoutHeight / REF_H;
	const isPortraitBand = profile.toolbar.bandHeightRatio != null;

	const refToolbarH = TOOLBAR_H * sx;
	const toolbarH = isPortraitBand
		? layoutHeight * profile.toolbar.bandHeightRatio!
		: refToolbarH * profile.toolbar.heightScale;
	const bandScale = isPortraitBand
		? toolbarH / Math.max(refToolbarH, 1)
		: profile.toolbar.controlScale;
	const textScale = isPortraitBand ? bandScale : 1;
	const hs = isPortraitBand ? sx * textScale : sx;

	const toolbarW = isPortraitBand
		? layoutWidth * profile.toolbar.widthRatio
		: Math.min(TOOLBAR_W * sx, layoutWidth * profile.toolbar.widthRatio);
	const toolbarLeftX = (layoutWidth - toolbarW) * 0.5;
	const toolbarRightX = toolbarLeftX + toolbarW;
	const insetScale = profile.toolbar.insetScale;

	let toolbarTopY: number;
	let toolbarCenterY: number;

	if (profile.toolbar.anchorToBottom) {
		toolbarTopY = layoutHeight - profile.toolbar.bottomInset * sy - toolbarH;
		toolbarCenterY = toolbarTopY + toolbarH / 2;
	} else {
		const boardBottomY =
			layoutHeight * profile.boardCenterYRatio + (BOARD_H / 2) * (layoutHeight / REF_H) * profile.playfieldScale;
		const spinD = SPIN_DIAMETER * hs;
		const gapBelowBoard = (48 - PILL_BAR_LIFT_Y) * hs;
		toolbarCenterY = boardBottomY + gapBelowBoard + spinD * 0.5;
		toolbarTopY = toolbarCenterY - toolbarH / 2;
	}

	if (isPortraitBand) {
		return buildPortraitBottomBarLayout({
			layoutWidth,
			sx,
			hs,
			textScale,
			toolbarLeftX,
			toolbarRightX,
			toolbarTopY,
			toolbarCenterY,
			toolbarW,
			toolbarH,
			insetScale,
		});
	}

	const controlScale = bandScale;
	const spinD = SPIN_DIAMETER * sx * controlScale;

	const spinRight = toolbarRightX - TOOLBAR_SPIN_RIGHT_INSET * sx * insetScale;
	const spinCenterX = spinRight - spinD / 2;
	const spinLeft = spinCenterX - spinD / 2;

	const autoD = AUTO_DIAMETER * sx * controlScale;
	const stackLeft = spinRight + TOOLBAR_ACTION_GAP * sx;
	const stackCenterX = stackLeft + autoD / 2;
	const stackTotalH = autoD * 2 + TOOLBAR_STACK_GAP * sx;
	const autoCenterY = toolbarCenterY - stackTotalH / 2 + autoD / 2;
	const turboCenterY = autoCenterY + autoD + TOOLBAR_STACK_GAP * sx;

	const arrowsH = BET_ARROWS_HEIGHT * sx * controlScale;
	const arrowsRight = spinLeft - CHEVRON_TO_SPIN_GAP * sx;
	const arrowsCenterX = arrowsRight - arrowsH / 2;
	const arrowsLeft = arrowsRight - arrowsH;

	const betRight = arrowsLeft - BET_TO_CHEVRON_GAP * sx;

	const menuLeft = toolbarLeftX + TOOLBAR_INSET_LEFT * sx * insetScale;
	const menuW = HAMBURGER_W * sx;
	const menuH = HAMBURGER_H * sx;
	const menuCenterX = menuLeft + menuW / 2;
	const balanceW = FS_TOOLBAR_CLUSTER_W.balance * sx;
	const betW = FS_TOOLBAR_CLUSTER_W.bet * sx;
	const balanceLeft = menuLeft + menuW + TOOLBAR_SECTION_GAP * sx;
	const balanceCenterX = balanceLeft + balanceW / 2;
	const betZoneRight = arrowsLeft - BET_TO_CHEVRON_GAP_RIGHT * sx;
	const betLeftX = betZoneRight - betW;
	const betCenterX = betLeftX + betW / 2;
	const betRightX = betZoneRight;

	const bonusD = BONUS_REF_DIAMETER * sx;
	const bonusRight = toolbarLeftX - BONUS_TOOLBAR_GAP * sx;
	let bonusCenterX = bonusRight - bonusD / 2;
	const minBonusCenterX = LAYOUT_EDGE_MARGIN * sx + bonusD / 2;
	if (bonusCenterX < minBonusCenterX) {
		bonusCenterX = minBonusCenterX;
	}

	const turboD = TURBO_DIAMETER * sx * controlScale;
	const fsPad = TOOLBAR_INSET_LEFT * sx * insetScale;
	const fsGap = TOOLBAR_SECTION_GAP * sx;
	const fsBalanceX = balanceLeft;
	const fsBalanceCenterX = fsBalanceX + (FS_TOOLBAR_CLUSTER_W.balance * sx) / 2;
	const fsBetX = fsBalanceX + FS_TOOLBAR_CLUSTER_W.balance * sx + fsGap;
	const fsBetCenterX = fsBetX + (FS_TOOLBAR_CLUSTER_W.bet * sx) / 2;
	const fsFreeSpinsW = FS_TOOLBAR_CLUSTER_W.freeSpins * sx;
	const fsTotalWinW = FS_TOOLBAR_CLUSTER_W.totalWin * sx;
	const fsRightEdge = toolbarRightX - fsPad;
	const fsTurboCenterX = fsRightEdge - turboD / 2;
	const fsTotalWinCenterX = fsTurboCenterX - turboD / 2 - fsGap - fsTotalWinW / 2;
	const fsFreeSpinsCenterX = fsTotalWinCenterX - fsTotalWinW / 2 - fsGap - fsFreeSpinsW / 2;

	const chevronHalfW = 30 * sx;

	return {
		sx,
		uiScale: sx,
		auxInMenu: false,
		showWinCluster: true,
		showBonusButton: true,
		toolbarLeftX,
		toolbarTopY,
		toolbarWidth: toolbarW,
		toolbarHeight: toolbarH,
		toolbarCenterY,
		bonusCenterX,
		bonusDiameter: bonusD,
		menuLeft,
		menuW,
		menuH,
		menuCenterX,
		balanceLeft,
		balanceCenterX,
		balanceLeftX: balanceLeft,
		balanceClusterW: balanceW,
		betCenterX,
		betClusterW: betW,
		betRightX,
		betLeftX,
		betRight,
		arrowsCenterX,
		chevronHalfW,
		spinCenterX,
		spinLeft,
		spinDiameter: spinD,
		autoCenterX: stackCenterX,
		autoCenterY,
		autoDiameter: autoD,
		turboCenterX: stackCenterX,
		turboCenterY,
		turboDiameter: turboD,
		fsBalanceX,
		fsBalanceCenterX,
		fsBetX,
		fsBetCenterX,
		fsFreeSpinsCenterX,
		fsTotalWinCenterX,
		fsTurboCenterX,
		labelSize: BAR_LABEL_SIZE * sx,
		valueSize: BAR_VALUE_SIZE * sx,
		arrowsHeight: arrowsH,
	};
};

type PortraitBarMetrics = {
	layoutWidth: number;
	sx: number;
	hs: number;
	textScale: number;
	toolbarLeftX: number;
	toolbarRightX: number;
	toolbarTopY: number;
	toolbarCenterY: number;
	toolbarW: number;
	toolbarH: number;
	insetScale: number;
};

/** Portrait with aux in hamburger menu — wider text columns, spin fills band height. */
const PORTRAIT_AUX_CLUSTER = { balance: 1.22, bet: 1.18 } as const;

/** Reference content width for portrait toolbar row (1920×1080 px). */
const portraitToolbarContentRefW = (insetScale: number, auxInMenu: boolean) =>
	TOOLBAR_INSET_LEFT * insetScale * 2 +
	HAMBURGER_W +
	TOOLBAR_SECTION_GAP +
	FS_TOOLBAR_CLUSTER_W.balance +
	TOOLBAR_SECTION_GAP +
	FS_TOOLBAR_CLUSTER_W.bet +
	TOOLBAR_SECTION_GAP +
	BET_ARROWS_HEIGHT +
	BET_TO_CHEVRON_GAP_RIGHT +
	CHEVRON_TO_SPIN_GAP +
	SPIN_DIAMETER +
	(auxInMenu
		? 0
		: TOOLBAR_ACTION_GAP + AUTO_DIAMETER + TOOLBAR_ACTION_GAP + TURBO_DIAMETER) +
	TOOLBAR_SPIN_RIGHT_INSET * insetScale;

/**
 * Portrait band toolbar — tall pill; aux-in-menu spreads items across the bar width.
 * Text uses band height; controls use width-fitted `hs` so balance stays on-screen.
 */
const buildPortraitBottomBarLayout = (m: PortraitBarMetrics) => {
	const { sx, textScale, insetScale, toolbarCenterY, toolbarLeftX, toolbarRightX, toolbarH } = m;
	const auxInMenu = getGameLayoutProfile().toolbar.auxInMenu ?? false;

	const contentRefW = portraitToolbarContentRefW(insetScale, auxInMenu);
	const fitLs = Math.min(textScale, m.toolbarW / Math.max(contentRefW * sx, 1));
	const hs = sx * fitLs;
	const toolbarLiftY = 96 * hs;
	const liftedToolbarTopY = m.toolbarTopY - toolbarLiftY;
	const liftedToolbarCenterY = toolbarCenterY - toolbarLiftY;

	const leftInset = TOOLBAR_INSET_LEFT * hs * insetScale;
	const rightInset = TOOLBAR_SPIN_RIGHT_INSET * hs * insetScale * (auxInMenu ? 0.48 : 1);
	const actionGap = TOOLBAR_ACTION_GAP * hs;
	const chevronSpinGap = CHEVRON_TO_SPIN_GAP * hs * (auxInMenu ? 0.68 : 1);
	const betChevronGap = BET_TO_CHEVRON_GAP_RIGHT * hs;

	const menuW = HAMBURGER_W * hs;
	const menuH = HAMBURGER_H * hs;
	const balanceW =
		FS_TOOLBAR_CLUSTER_W.balance * hs * (auxInMenu ? PORTRAIT_AUX_CLUSTER.balance : 1);
	const betW = FS_TOOLBAR_CLUSTER_W.bet * hs * (auxInMenu ? PORTRAIT_AUX_CLUSTER.bet : 1);
	const arrowsH = BET_ARROWS_HEIGHT * hs;
	const autoD = AUTO_DIAMETER * hs;
	const turboD = TURBO_DIAMETER * hs;
	let sectionGap = TOOLBAR_SECTION_GAP * hs;
	let spinD = Math.min(SPIN_DIAMETER * hs, toolbarH * (auxInMenu ? 0.88 : 1.08));

	type PlacedRow = {
		menuLeft: number;
		menuCenterX: number;
		balanceLeft: number;
		betLeftX: number;
		betRightX: number;
		arrowsCenterX: number;
		arrowsLeft: number;
		spinLeft: number;
		spinCenterX: number;
		spinDiameter: number;
		autoCenterX: number;
		turboCenterX: number;
		contentEnd: number;
	};

	const packForward = (gap: number, spinDiameter: number): PlacedRow => {
		let x = toolbarLeftX + leftInset;
		const menuLeft = x;
		const menuCenterX = menuLeft + menuW / 2;
		x += menuW + gap;
		const balanceLeft = x;
		x += balanceW + gap;
		const betLeftX = x;
		const betRightX = betLeftX + betW;
		x += betW + gap;
		const arrowsCenterX = x + arrowsH / 2;
		const arrowsLeft = x;
		x += arrowsH + betChevronGap + chevronSpinGap;

		const spinLeft = x;
		const spinCenterX = spinLeft + spinDiameter / 2;
		x += spinDiameter + actionGap;
		const autoCenterX = x + autoD / 2;
		x += autoD + actionGap;
		const turboCenterX = x + turboD / 2;
		const contentEnd = x + turboD / 2 + rightInset;
		return {
			menuLeft,
			menuCenterX,
			balanceLeft,
			betLeftX,
			betRightX,
			arrowsCenterX,
			arrowsLeft,
			spinLeft,
			spinCenterX,
			spinDiameter,
			autoCenterX,
			turboCenterX,
			contentEnd,
		};
	};

	/** Spread menu → balance → bet → chevrons across space left of the spin button. */
	const packPortraitAux = (spinDiameter: number): PlacedRow => {
		const spinCenterX = toolbarRightX - rightInset - spinDiameter / 2;
		const spinLeft = spinCenterX - spinDiameter / 2;
		const stripEnd = spinLeft - chevronSpinGap;
		const left = toolbarLeftX + leftInset;
		const itemsW = menuW + balanceW + betW + arrowsH;
		const minGap = TOOLBAR_SECTION_GAP * hs * 0.7;
		const maxGap = TOOLBAR_SECTION_GAP * hs * 1.55;
		const gapCount = 3;
		const gap = Math.max(minGap, Math.min(maxGap, (stripEnd - left - itemsW) / gapCount));

		let x = left;
		const menuLeft = x;
		const menuCenterX = menuLeft + menuW / 2;
		x += menuW + gap;
		const balanceLeft = x;
		x += balanceW + gap;
		const betLeftX = x;
		const betRightX = betLeftX + betW;
		x += betW + gap;
		const arrowsLeft = x;
		const arrowsCenterX = arrowsLeft + arrowsH / 2;

		return {
			menuLeft,
			menuCenterX,
			balanceLeft,
			betLeftX,
			betRightX,
			arrowsCenterX,
			arrowsLeft,
			spinLeft,
			spinCenterX,
			spinDiameter,
			autoCenterX: -9999,
			turboCenterX: -9999,
			contentEnd: toolbarRightX,
		};
	};

	let placed: PlacedRow;

	if (auxInMenu) {
		const minGap = TOOLBAR_SECTION_GAP * hs * 0.7;
		const minStrip = menuW + balanceW + betW + arrowsH + minGap * 3;
		const stripEndFor = (spinDiameter: number) =>
			toolbarRightX - rightInset - spinDiameter - chevronSpinGap;
		const stripStart = toolbarLeftX + leftInset;

		for (let attempt = 0; attempt < 6; attempt++) {
			placed = packPortraitAux(spinD);
			const available = stripEndFor(spinD) - stripStart;
			if (available >= minStrip) break;
			spinD = Math.max(SPIN_DIAMETER * hs * 0.72, spinD * 0.94);
		}
		placed = packPortraitAux(spinD);
	} else {
		placed = packForward(sectionGap, spinD);
		if (placed.contentEnd > toolbarRightX) {
			sectionGap = TOOLBAR_SECTION_GAP * hs * 0.72;
			placed = packForward(sectionGap, spinD);
		}
		if (placed.contentEnd > toolbarRightX) {
			const overflow = placed.contentEnd - toolbarRightX;
			spinD = Math.max(SPIN_DIAMETER * hs * 0.82, spinD - overflow * 0.55);
			placed = packForward(sectionGap, spinD);
		}
	}

	const autoCenterY = liftedToolbarCenterY;
	const turboCenterY = liftedToolbarCenterY;

	const bonusD = BONUS_REF_DIAMETER * hs * BONUS_PORTRAIT_DIAMETER_SCALE;
	const showBonusButton = true;
	let bonusCenterX = -9999;
	let bonusCenterY = liftedToolbarCenterY;
	if (auxInMenu) {
		bonusCenterX = toolbarLeftX + leftInset + bonusD / 2;
		bonusCenterY = liftedToolbarTopY - BONUS_ABOVE_BAR_GAP_REF * hs - bonusD / 2;
	} else {
		const bonusRight = toolbarLeftX - BONUS_TOOLBAR_GAP * hs;
		bonusCenterX = bonusRight - bonusD / 2;
		const minBonusCenterX = LAYOUT_EDGE_MARGIN * hs + bonusD / 2;
		if (bonusCenterX < minBonusCenterX) {
			bonusCenterX = minBonusCenterX;
		}
	}

	const fsPad = TOOLBAR_INSET_LEFT * hs * insetScale;
	const fsGap = TOOLBAR_SECTION_GAP * hs;
	const fsBalanceX = placed.balanceLeft;
	const fsBalanceCenterX = fsBalanceX + balanceW / 2;
	const fsBetX = fsBalanceX;
	const fsBetCenterX = fsBetX + betW / 2;
	const fsFreeSpinsW = FS_TOOLBAR_CLUSTER_W.freeSpins * hs;
	const fsTotalWinW = FS_TOOLBAR_CLUSTER_W.totalWin * hs;
	const fsRightEdge = toolbarRightX - fsPad;
	let fsTurboCenterX = fsRightEdge - turboD / 2;
	let fsTotalWinCenterX = fsTurboCenterX - turboD / 2 - fsGap - fsTotalWinW / 2;
	let fsFreeSpinsCenterX = fsTotalWinCenterX - fsTotalWinW / 2 - fsGap - fsFreeSpinsW / 2;
	if (auxInMenu) {
		fsTurboCenterX = -9999;
		const fsLeft = fsBetCenterX;
		const fsRight = fsRightEdge - fsTotalWinW / 2;
		const fsStep = (fsRight - fsLeft) / 2;
		fsFreeSpinsCenterX = fsLeft + fsStep;
		fsTotalWinCenterX = fsLeft + fsStep * 2;
	}

	return {
		sx,
		uiScale: hs,
		auxInMenu,
		showWinCluster: false,
		showBonusButton,
		toolbarLeftX: m.toolbarLeftX,
		toolbarTopY: liftedToolbarTopY,
		toolbarWidth: m.toolbarW,
		toolbarHeight: m.toolbarH,
		toolbarCenterY: liftedToolbarCenterY,
		bonusCenterX,
		bonusCenterY,
		bonusDiameter: bonusD,
		menuLeft: placed.menuLeft,
		menuW,
		menuH,
		menuCenterX: placed.menuCenterX,
		balanceLeft: placed.balanceLeft,
		balanceCenterX: placed.balanceLeft + balanceW / 2,
		balanceLeftX: placed.balanceLeft,
		balanceClusterW: balanceW,
		betCenterX: placed.betLeftX + betW / 2,
		betClusterW: betW,
		betRightX: placed.betRightX,
		betLeftX: placed.betLeftX,
		betRight: placed.arrowsLeft - BET_TO_CHEVRON_GAP * hs,
		arrowsCenterX: placed.arrowsCenterX,
		chevronHalfW: 30 * hs,
		spinCenterX: placed.spinCenterX,
		spinLeft: placed.spinLeft,
		spinDiameter: placed.spinDiameter,
		autoCenterX: placed.autoCenterX,
		autoCenterY,
		autoDiameter: autoD,
		turboCenterX: placed.turboCenterX,
		turboCenterY,
		turboDiameter: turboD,
		fsBalanceX,
		fsBalanceCenterX,
		fsBetX,
		fsBetCenterX,
		fsFreeSpinsCenterX,
		fsTotalWinCenterX,
		fsTurboCenterX,
		labelSize: BAR_LABEL_SIZE * sx * textScale,
		valueSize: BAR_VALUE_SIZE * sx * textScale,
		arrowsHeight: arrowsH,
	};
};

export { BOARD_SIZES };
