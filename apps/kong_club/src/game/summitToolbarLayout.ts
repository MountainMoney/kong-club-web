import {
	PORTRAIT_REF_H,
	PORTRAIT_REF_W,
	REF_H,
	REF_W,
	usePortraitDesignSpace,
} from './desktopLayout';
import { readSafeAreaInsets, type SafeAreaInsets } from './safeArea';
import { isMobileLandscapeViewport } from './layoutUi';

const TOOLBAR_W = 1233;
const SM_FRAME_W = 1233;
const SM_FRAME_H = 172;
const SM_PILL_X = 194;
const SM_PILL_Y = 37;
const SM_PILL_W = 975;
const SM_PILL_H = 119;
const SM_PILL_BONUS_X = 70;
const SM_PILL_BONUS_W = 1099;
const SM_HAM_X = 0;
const SM_HAM_Y = 63;
const SM_HAM_W = 55;
const SM_HAM_H = 68;
const SM_BONUS_X = 70;
const SM_BONUS_Y = 37;
const SM_BONUS_D = 119;
const SM_SPIN_X = 997;
const SM_SPIN_Y = 18;
const SM_SPIN_D = 156;
const SM_AUTO_X = 1177;
const SM_AUTO_Y = 37;
const SM_AUTO_D = 56;
const SM_TURBO_Y = 101;
const SM_TURBO_BONUS_Y = 37;
const SM_TURBO_BONUS_H = 119;
const SM_WIN_W = 237;
const SM_WIN_H = 52;
const SM_LABEL = 19;
const SM_VALUE = 35;
const DESKTOP_LOCK_MIN_W = 1200;
const DESKTOP_TOOLBAR_MIN_W = TOOLBAR_W + 8 * 2;

const PORTRAIT_SPIN_D = 156;
const PORTRAIT_BONUS_D = 119;
const PORTRAIT_AUTO_D = 66;
const PORTRAIT_HAM_W = 55;
const PORTRAIT_HAM_H = 68;
const PORTRAIT_WIN_W = 237;
const PORTRAIT_WIN_H = 52;
const PORTRAIT_LABEL = 19;
const PORTRAIT_VALUE = 35;
const PORTRAIT_CHROME = 0.86;
const PORTRAIT_HUD_REF_W = 390;
const PORTRAIT_WIN_SCALE_W = 1.48;
const PORTRAIT_WIN_SCALE_H = 1.82;

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
	const screenW = Math.max(displayScale, 0.08) * PORTRAIT_REF_W;
	const uiScale = PORTRAIT_CHROME * (PORTRAIT_REF_W / Math.max(screenW, PORTRAIT_HUD_REF_W));
	const footerScale = 0.94;
	const hamScale = uiScale * footerScale;
	const r = (value: number) => Math.round(value);
	const toolbarWidth = designWidth;
	const pad = 16 * uiScale;
	const gap = 10 * uiScale;
	const spinD = PORTRAIT_SPIN_D * uiScale;
	const bonusD = PORTRAIT_BONUS_D * uiScale * 0.82;
	const autoD = PORTRAIT_AUTO_D * uiScale * 0.84;
	const hamW = PORTRAIT_HAM_W * hamScale;
	const hamH = PORTRAIT_HAM_H * hamScale;
	const labelSize = PORTRAIT_LABEL * uiScale * 0.84 * footerScale;
	const valueSize = PORTRAIT_VALUE * uiScale * footerScale;
	const winH = Math.max(
		PORTRAIT_WIN_H * uiScale * PORTRAIT_WIN_SCALE_H,
		valueSize * 1.75 + 12 * uiScale,
	);
	const winW = Math.max(PORTRAIT_WIN_W * uiScale * PORTRAIT_WIN_SCALE_W, valueSize * 12);
	const turboW = autoD;
	const barLift = 24 * uiScale;
	const barTop = spinD / 2 - barLift;
	const spinX = (toolbarWidth - spinD) / 2;
	const spinY = 0;
	const bonusX = pad;
	const bonusY = barTop - bonusD / 2;
	const turboX = toolbarWidth - pad - turboW;
	const autoX = inBonus ? turboX : turboX - gap - autoD;
	const autoY = barTop - autoD / 2;
	const contentH = Math.max(
		PORTRAIT_HAM_H * uiScale,
		PORTRAIT_LABEL * uiScale * 0.84 + PORTRAIT_VALUE * uiScale + 6 * uiScale,
	);
	const hang = (PORTRAIT_BONUS_D * uiScale * 0.95) / 2;
	const bottomPad = Math.max(26 * uiScale, safeBottom + 14 * uiScale);
	const barVisible = hang + contentH + 18 * uiScale;
	const meterY = barTop;
	const meterX = 0;
	const meterW = toolbarWidth;
	const meterH = barVisible + bottomPad + barLift;
	const toolbarHeight = barTop + meterH;
	// Portrait: turbo stays the compact base plate in bonus — the tall desktop asset is landscape-only.
	const turboH = autoD;
	const turboY = barTop - turboH / 2;
	const menuX = pad;
	const menuY = meterY + meterH - bottomPad - hamH;
	const hamSlot = menuX + hamW + 12 * uiScale;
	const innerW = Math.max(80 * uiScale, meterW - hamSlot - pad);
	const balanceW = innerW * 0.48;
	const betW = innerW * 0.52;
	const winX = spinX + (spinD - winW) / 2;
	const winGap = 12 * uiScale;
	const winY = spinY - winH - winGap;
	return {
		uiScale,
		toolbarWidth: r(toolbarWidth),
		toolbarHeight: r(toolbarHeight),
		barTop: r(barTop),
		bonusX: r(bonusX),
		bonusY: r(bonusY),
		bonusD: r(bonusD),
		spinX: r(spinX),
		spinY: r(spinY),
		spinD: r(spinD),
		autoX: r(autoX),
		autoY: r(autoY),
		autoD: r(autoD),
		turboX: r(turboX),
		turboY: r(turboY),
		turboW: r(turboW),
		turboH: r(turboH),
		menuX: r(menuX),
		menuY: r(menuY),
		menuW: r(hamW),
		menuH: r(hamH),
		meterX: r(meterX),
		meterY: r(meterY),
		meterW: r(meterW),
		meterH: r(meterH),
		balanceX: r(hamSlot),
		balanceW: r(balanceW),
		betX: r(meterW - pad - betW),
		betW: r(betW),
		winW: r(winW),
		winH: r(winH),
		winX: r(winX),
		winY: r(winY),
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
			auxInMenu: true,
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

	const uiScale = isCompact ? 0.82 : shortLandscape ? Math.min(1, (layoutWidth * 0.94) / SM_FRAME_W) : 1;
	const toolbarWidth = SM_FRAME_W * uiScale;
	const toolbarHeight = SM_FRAME_H * uiScale;
	const toolbarLeftX = (layoutWidth - toolbarWidth) / 2;
	const bottomInset = isDesktopLocked ? 24 : isCompact ? 28 : 24;
	const pillBottom = (SM_PILL_Y + SM_PILL_H) * uiScale;
	const toolbarTopY = layoutHeight - bottomInset - pillBottom - 2;
	const s = uiScale;
	const meterX = (inBonus ? SM_PILL_BONUS_X : SM_PILL_X) * s;
	const meterY = SM_PILL_Y * s;
	const meterW = (inBonus ? SM_PILL_BONUS_W : SM_PILL_W) * s;
	const meterH = SM_PILL_H * s;
	const spinX = SM_SPIN_X * s;
	const spinY = SM_SPIN_Y * s;
	const spinD = SM_SPIN_D * s;
	const autoX = SM_AUTO_X * s;
	const autoY = SM_AUTO_Y * s;
	const autoD = SM_AUTO_D * s;
	const turboX = SM_AUTO_X * s;
	const turboY = (inBonus ? SM_TURBO_BONUS_Y : SM_TURBO_Y) * s;
	const turboW = SM_AUTO_D * s;
	const turboH = (inBonus ? SM_TURBO_BONUS_H : SM_AUTO_D) * s;
	const bonusX = SM_BONUS_X * s;
	const bonusY = SM_BONUS_Y * s;
	const bonusD = SM_BONUS_D * s;
	const menuX = SM_HAM_X * s;
	const menuY = SM_HAM_Y * s;
	const menuW = SM_HAM_W * s;
	const menuH = SM_HAM_H * s;
	const spinReserve = Math.max(48 * s, meterX + meterW - spinX + 12 * s);
	const innerW = Math.max(80 * s, meterW - 32 * s - spinReserve);
	const balanceW = innerW * 0.52;
	const betW = innerW * 0.48;
	const winPopupScale = winPopupHostScale(canvasWidth, canvasHeight);
	const winW = SM_WIN_W * s * winPopupScale;
	const winH = SM_WIN_H * s * winPopupScale;
	const winX = meterX + (meterW - winW) / 2;
	const winGap = 8 * s;
	const winY = meterY - winH - winGap;

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
		balanceX: px(meterX + 16 * s),
		balanceW: px(balanceW),
		betX: px(meterX + meterW - spinReserve - betW),
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
		labelSize: SM_LABEL * s,
		valueSize: SM_VALUE * s,
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
