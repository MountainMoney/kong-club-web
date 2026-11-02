import {
	PORTRAIT_REF_H,
	PORTRAIT_REF_W,
	REF_H,
	REF_W,
	usePortraitDesignSpace,
} from './desktopLayout';
import { readSafeAreaInsets, type SafeAreaInsets } from './safeArea';
import { isMobileLandscapeViewport } from './layoutUi';

/** GG-style landscape HUD, design px inside the 1920×1080 stage. */
const GG_TRI_W = 124;
const GG_TRI_H = 100;
const GG_SLAB_H = 100;
const GG_SLAB_Y = 34;
const GG_GAP = 14;
const GG_BAL_W = 620;
const GG_BET_W = 400;
const GG_SPIN_D = 158;
const GG_ICON = 40;
const GG_HAM_W = 42;
const GG_HAM_H = 34;
const GG_LABEL = 15;
const GG_VALUE = 28;
const GG_WIN_W = 220;
const GG_WIN_H = 52;
const DESKTOP_LOCK_MIN_W = 1200;
const DESKTOP_TOOLBAR_MIN_W = 1100;

const ZERO_SAFE: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const px = (value: number) => (Number.isFinite(value) ? Math.round(value) : 0);

export const getDesignSize = (canvasWidth: number, canvasHeight: number) => {
	const portrait = usePortraitDesignSpace(canvasWidth, canvasHeight);
	const width = portrait ? PORTRAIT_REF_W : REF_W;
	const height = portrait
		? Math.max(PORTRAIT_REF_H, Math.round(width * (canvasHeight / Math.max(canvasWidth, 1))))
		: REF_H;
	return { width, height };
};

export const getMainLayoutScale = (canvasWidth: number, canvasHeight: number) => {
	const design = getDesignSize(canvasWidth, canvasHeight);
	return Math.min(canvasWidth / Math.max(design.width, 1), canvasHeight / Math.max(design.height, 1));
};

export const safeAreaToDesign = (
	canvasInsets: SafeAreaInsets,
	designW: number,
	designH: number,
	canvasW: number,
	canvasH: number,
): SafeAreaInsets => {
	const scale = Math.min(canvasW / Math.max(designW, 1), canvasH / Math.max(designH, 1));
	const inv = scale > 0 ? 1 / scale : 1;
	return {
		top: canvasInsets.top * inv,
		right: canvasInsets.right * inv,
		bottom: canvasInsets.bottom * inv,
		left: canvasInsets.left * inv,
	};
};

export const isShortLandscape = (canvasWidth: number, canvasHeight: number): boolean => {
	const w = Math.max(canvasWidth, 1);
	const h = Math.max(canvasHeight, 1);
	return w > h && h <= 280 && w <= 560 && w / h >= 1.35;
};

export const isPopoutL = (canvasWidth: number, canvasHeight: number): boolean => {
	const w = Math.max(canvasWidth, 1);
	const h = Math.max(canvasHeight, 1);
	return w > h && w >= 720 && w <= 880 && h >= 400 && h <= 500 && w / h >= 1.55 && w / h <= 2.05;
};

export const isLaptopViewport = (canvasWidth: number, canvasHeight: number): boolean => {
	const w = Math.max(canvasWidth, 1);
	const h = Math.max(canvasHeight, 1);
	return (
		w > h &&
		w >= 960 &&
		w < DESKTOP_LOCK_MIN_W &&
		h >= 520 &&
		h <= 680 &&
		w / h >= 1.55 &&
		w / h <= 2.05
	);
};

export const winPopupHostScale = (canvasWidth: number, canvasHeight: number): number => {
	if (usePortraitDesignSpace(canvasWidth, canvasHeight)) return 1;
	if (isShortLandscape(canvasWidth, canvasHeight)) return 2.5;
	if (isPopoutL(canvasWidth, canvasHeight)) return 2;
	if (isLaptopViewport(canvasWidth, canvasHeight)) return 1.75;
	if (canvasWidth >= DESKTOP_LOCK_MIN_W) return 1;
	return 1;
};

export type PortraitHudLayout = {
	uiScale: number;
	toolbarWidth: number;
	toolbarHeight: number;
	barTop: number;
	bonusX: number;
	bonusY: number;
	bonusD: number;
	spinX: number;
	spinY: number;
	spinD: number;
	autoX: number;
	autoY: number;
	autoD: number;
	turboX: number;
	turboY: number;
	turboW: number;
	turboH: number;
	menuX: number;
	menuY: number;
	menuW: number;
	menuH: number;
	meterX: number;
	meterY: number;
	meterW: number;
	meterH: number;
	balanceX: number;
	balanceW: number;
	betX: number;
	betW: number;
	winX: number;
	winY: number;
	winW: number;
	winH: number;
	labelSize: number;
	valueSize: number;
	bottomPad: number;
};

export const computePortraitHud = (
	designWidth: number,
	displayScale: number,
	inBonus = false,
	safeBottom = 0,
): PortraitHudLayout => {
	void displayScale;
	void inBonus;
	const r = (value: number) => Math.round(value);
	const uiScale = 1;
	const toolbarWidth = designWidth;
	const spinD = 168;
	const bonusD = 112;
	const autoD = 96;
	const controlH = 252;
	const meterH = 112;
	const bottomPad = Math.max(36, safeBottom + 18);
	const toolbarHeight = controlH + 12 + meterH + bottomPad;
	const labelSize = 22;
	const valueSize = 36;
	return {
		uiScale,
		toolbarWidth: r(toolbarWidth),
		toolbarHeight: r(toolbarHeight),
		barTop: 0,
		bonusX: 0,
		bonusY: 0,
		bonusD: r(bonusD),
		spinX: 0,
		spinY: 0,
		spinD: r(spinD),
		autoX: 0,
		autoY: 0,
		autoD: r(autoD),
		turboX: 0,
		turboY: 0,
		turboW: r(autoD),
		turboH: r(autoD),
		menuX: 0,
		menuY: 0,
		menuW: r(autoD),
		menuH: r(autoD),
		meterX: 0,
		meterY: r(controlH + 8),
		meterW: r(toolbarWidth),
		meterH: r(meterH),
		balanceX: 24,
		balanceW: r(toolbarWidth * 0.32),
		betX: r(toolbarWidth * 0.66),
		betW: r(toolbarWidth * 0.3),
		winW: r(toolbarWidth * 0.34),
		winH: r(meterH),
		winX: r(toolbarWidth * 0.33),
		winY: 0,
		labelSize,
		valueSize,
		bottomPad: r(bottomPad),
	};
};

export type SummitToolbarLayout = {
	mode: string;
	portrait: boolean;
	auxInMenu: boolean;
	designWidth: number;
	designHeight: number;
	sceneScale: number;
	displayScale: number;
	uiScale: number;
	toolbarLeftX: number;
	toolbarTopY: number;
	toolbarWidth: number;
	toolbarHeight: number;
	toolbarCenterY: number;
	bottomInset: number;
	bonusD: number;
	bonusX: number;
	bonusY: number;
	menuX: number;
	menuY: number;
	menuCenterX: number;
	menuW: number;
	menuH: number;
	meterX: number;
	meterY: number;
	meterW: number;
	meterH: number;
	balanceX: number;
	balanceW: number;
	betX: number;
	betW: number;
	winW: number;
	winX: number;
	winY: number;
	winH: number;
	winPopupScale: number;
	spinX: number;
	spinY: number;
	spinD: number;
	autoX: number;
	autoY: number;
	turboX: number;
	turboY: number;
	turboW: number;
	turboH: number;
	autoD: number;
	labelSize: number;
	valueSize: number;
};

export const getSummitToolbarLayout = (
	canvasWidth: number,
	canvasHeight: number,
	inBonus = false,
	forcePortrait = false,
): SummitToolbarLayout => {
	const portrait = forcePortrait || usePortraitDesignSpace(canvasWidth, canvasHeight);
	const shortLandscape = isShortLandscape(canvasWidth, canvasHeight);
	const design = getDesignSize(canvasWidth, canvasHeight);
	const isDesktopLocked =
		!portrait &&
		(canvasWidth >= Math.max(DESKTOP_LOCK_MIN_W, DESKTOP_TOOLBAR_MIN_W) ||
			shortLandscape ||
			isPopoutL(canvasWidth, canvasHeight));
	const sceneScale = getMainLayoutScale(canvasWidth, canvasHeight);
	const isCompact = !portrait && !isDesktopLocked && canvasWidth < 900;
	const mode = portrait ? 'portrait' : isDesktopLocked ? 'desktop' : isCompact ? 'compact' : 'fluid';
	const layoutWidth = design.width;
	const layoutHeight = design.height;
	const safeDesign = safeAreaToDesign(
		typeof window === 'undefined' ? ZERO_SAFE : readSafeAreaInsets(canvasWidth, canvasHeight),
		layoutWidth,
		layoutHeight,
		canvasWidth,
		canvasHeight,
	);

	if (portrait) {
		const hud = computePortraitHud(layoutWidth, sceneScale, inBonus, safeDesign.bottom);
		const toolbarLeftX = 0;
		const toolbarTopY = layoutHeight - hud.toolbarHeight;
		return {
			mode,
			portrait,
			auxInMenu: false,
			designWidth: layoutWidth,
			designHeight: layoutHeight,
			sceneScale,
			displayScale: sceneScale,
			uiScale: hud.uiScale,
			toolbarLeftX: px(toolbarLeftX),
			toolbarTopY: px(toolbarTopY),
			toolbarWidth: px(hud.toolbarWidth),
			toolbarHeight: px(hud.toolbarHeight),
			toolbarCenterY: px(toolbarTopY + hud.toolbarHeight / 2),
			bottomInset: px(hud.bottomPad),
			bonusD: hud.bonusD,
			bonusX: hud.bonusX,
			bonusY: hud.bonusY,
			menuX: hud.menuX,
			menuY: hud.menuY,
			menuCenterX: px(hud.menuX + hud.menuW / 2),
			menuW: hud.menuW,
			menuH: hud.menuH,
			meterX: hud.meterX,
			meterY: hud.meterY,
			meterW: hud.meterW,
			meterH: hud.meterH,
			balanceX: hud.balanceX,
			balanceW: hud.balanceW,
			betX: hud.betX,
			betW: hud.betW,
			winW: hud.winW,
			winX: hud.winX,
			winY: hud.winY,
			winH: hud.winH,
			winPopupScale: 1,
			spinX: hud.spinX,
			spinY: hud.spinY,
			spinD: hud.spinD,
			autoX: hud.autoX,
			autoY: hud.autoY,
			turboX: hud.turboX,
			turboY: hud.turboY,
			turboW: hud.turboW,
			turboH: hud.turboH,
			autoD: hud.autoD,
			labelSize: hud.labelSize,
			valueSize: hud.valueSize,
		};
	}

	const uiScale = isCompact ? 0.86 : shortLandscape ? 0.72 : 1;
	const s = uiScale;
	const triW = GG_TRI_W * s;
	const slabH = GG_SLAB_H * s;
	const slabY = GG_SLAB_Y * s;
	const gap = GG_GAP * s;
	const balW = (inBonus ? GG_BAL_W + GG_BET_W * 0.42 : GG_BAL_W) * s;
	const betW = (inBonus ? GG_BET_W * 0.72 : GG_BET_W) * s;
	const spinD = GG_SPIN_D * s;
	const icon = GG_ICON * s;
	const bonusX = 0;
	const bonusY = slabY;
	const bonusD = GG_TRI_H * s;
	const meterX = inBonus ? bonusX : triW + gap;
	const meterY = slabY;
	const meterW = balW;
	const meterH = slabH;
	const betPanelX = meterX + meterW + gap;
	const spinX = betPanelX + betW - spinD * 0.56;
	const spinY = slabY + slabH / 2 - spinD / 2;
	const iconX = spinX - icon - 12 * s;
	const autoX = iconX;
	const autoY = slabY + 10 * s;
	const autoD = icon;
	const turboX = iconX;
	const turboY = inBonus ? slabY + (slabH - icon) / 2 : slabY + slabH - icon - 10 * s;
	const turboW = icon;
	const turboH = inBonus ? slabH - 16 * s : icon;
	const menuX = meterX + 16 * s;
	const menuY = slabY + (slabH - GG_HAM_H * s) / 2;
	const menuW = GG_HAM_W * s;
	const menuH = GG_HAM_H * s;
	const balanceX = menuX + menuW + 14 * s;
	const balanceW = Math.max(120 * s, meterW * 0.42);
	const toolbarWidth = Math.max(spinX + spinD, betPanelX + betW);
	const toolbarHeight = Math.max(slabY + slabH, spinY + spinD) + 6 * s;
	const toolbarLeftX = (layoutWidth - toolbarWidth) / 2;
	const bottomInset = isDesktopLocked ? 18 : isCompact ? 12 : 16;
	const toolbarTopY = layoutHeight - bottomInset - toolbarHeight;
	const winPopupScale = winPopupHostScale(canvasWidth, canvasHeight);
	const winW = GG_WIN_W * s;
	const winH = GG_WIN_H * s;
	const winX = balanceX + balanceW;
	const winY = meterY;

	return {
		mode,
		portrait,
		auxInMenu: isMobileLandscapeViewport(canvasWidth, canvasHeight),
		designWidth: layoutWidth,
		designHeight: layoutHeight,
		sceneScale,
		displayScale: sceneScale,
		uiScale,
		toolbarLeftX: px(toolbarLeftX),
		toolbarTopY: px(toolbarTopY),
		toolbarWidth: px(toolbarWidth),
		toolbarHeight: px(toolbarHeight),
		toolbarCenterY: px(toolbarTopY + toolbarHeight / 2),
		bottomInset: px(bottomInset),
		bonusD: px(bonusD),
		bonusX: px(bonusX),
		bonusY: px(bonusY),
		menuX: px(menuX),
		menuY: px(menuY),
		menuCenterX: px(menuX + menuW / 2),
		menuW: px(menuW),
		menuH: px(menuH),
		meterX: px(meterX),
		meterY: px(meterY),
		meterW: px(meterW),
		meterH: px(meterH),
		balanceX: px(balanceX),
		balanceW: px(balanceW),
		betX: px(betPanelX),
		betW: px(betW),
		winW: px(winW),
		winX: px(winX),
		winY: px(winY),
		winH: px(winH),
		winPopupScale,
		spinX: px(spinX),
		spinY: px(spinY),
		spinD: px(spinD),
		autoX: px(autoX),
		autoY: px(autoY),
		turboX: px(turboX),
		turboY: px(turboY),
		turboW: px(turboW),
		turboH: px(turboH),
		autoD: px(autoD),
		labelSize: GG_LABEL * s,
		valueSize: GG_VALUE * s,
	};
};

/** Canvas Y of the top of Summit chrome (WIN chip / spin hang) for Pixi skip hit. */
export const getSummitSkipCanvasHeight = (
	canvasWidth: number,
	canvasHeight: number,
	inBonus = false,
	forcePortrait = false,
) => {
	const layout = getSummitToolbarLayout(canvasWidth, canvasHeight, inBonus, forcePortrait);
	const stageTop = (canvasHeight - layout.designHeight * layout.sceneScale) / 2;
	const chromeTop =
		stageTop + (layout.toolbarTopY + Math.min(0, layout.winY, layout.spinY, layout.bonusY)) * layout.sceneScale;
	return Math.max(0, chromeTop);
};
