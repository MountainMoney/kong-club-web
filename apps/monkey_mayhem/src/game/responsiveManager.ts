/**

 * Football Fiesta responsive layout — design-space geometry (1080×1920 portrait, 1920×1080 desktop).

 *

 * ## Container hierarchy

 * ```

 * App

 * ├── Background (contain desktop | cover portrait)

 * ├── MainContainer [scale = min(canvasW/designW, canvasH/designH)]

 * │   ├── Playfield @ boardCenter  ← portrait: Le Bandit stack (logo | grid | gap | bar)

 * │   └── Mascot (desktop/landscape only — hidden on portrait mobile)

 * └── UI MainContainer → MonkeyBottomBar

 * ```

 *

 * ## Example (portrait vs landscape)

 * @see responsiveProfile.svelte.ts — `syncGameLayoutProfile` + `layoutExamples`

 */



import { VISIBLE_PLAYTABLE_REF_H } from './boardNetLayout';
import { GOAL_FRAME_BOTTOM_BLEED_REF, PLAYTABLE_BOARDER_INNER } from './uiAssetSizes';

import { MASCOT_CONTENT_ASPECT } from './mascotRig';

import { LAYOUT_EDGE_MARGIN, MASCOT_FEET_X_NUDGE, MASCOT_FROM_GOAL_GAP, MASCOT_FROM_SPIN_GAP } from './layoutScene';

import { isMiniPlayerViewport, isMobileLandscapeViewport } from './layoutUi';

import { estimateSafeAreaInsets, readSafeAreaInsets, safeAreaToDesign, type SafeAreaInsets } from './safeArea';



/** Duplicated here to avoid circular import with `layoutScene.ts`. */

const REF_W = 1920;

const REF_H = 1080;

const TOOLBAR_H = 119.27;

const PLAYTABLE_W = 984;

const MASCOT_REF_HEIGHT = 555;

const MASCOT_REF_WIDTH = Math.round(MASCOT_REF_HEIGHT * MASCOT_CONTENT_ASPECT);

const MASCOT_SHADOW_REF_WIDTH = 260;

const MASCOT_SHADOW_REF_HEIGHT = 75;

const MASCOT_FEET_GAP_ABOVE_TOOLBAR = 6;



/** Le Bandit portrait proportions (title | playfield | gap — toolbar is measured). */

const PORTRAIT_TITLE_RATIO = 0.08;

const PORTRAIT_GAP_RATIO = 0;

/** Grass strip between goal posts and toolbar (1080 ref px). */
const PORTRAIT_PLAYFIELD_TOOLBAR_GAP_REF = 32;

/** Min clearance below safe-area top before playfield stack (1080 ref px). */
const PORTRAIT_PLAYFIELD_TOP_PAD_REF = 16;

/** Logo bottom sits this far down the header gap above the board (0 = top, 1 = board top). */
const PORTRAIT_LOGO_HEADER_RATIO = 0.32;

/** Bottom chrome band as share of layout height (Le Bandit ~12–14%). */
const PORTRAIT_TOOLBAR_RATIO = 0.13;

/** Le Bandit desktop / landscape / tablet stack ratios (title | playfield | gap). */
const DESKTOP_TITLE_RATIO = 0.11;
/** No reserved gap — toolbar sits directly under the playfield (mascot grass is BG art). */
const DESKTOP_GAP_RATIO = 0;
const DESKTOP_TITLE_OVERLAP_REF = 0;
const TITLE_LOGO_GAP_ABOVE_PLAYFIELD_REF = 14;

const LANDSCAPE_TITLE_RATIO = 0.11;
const LANDSCAPE_GAP_RATIO = 0;
const LANDSCAPE_TITLE_OVERLAP_REF = 0;
const LANDSCAPE_COMPACT_TITLE_RATIO = 0.1;
const LANDSCAPE_COMPACT_GAP_RATIO = 0;
const LANDSCAPE_COMPACT_TITLE_OVERLAP_REF = 0;

const TABLET_STACKED_TITLE_RATIO = 0.13;
const TABLET_STACKED_GAP_RATIO = 0;
const TABLET_STACKED_TITLE_OVERLAP_REF = 0;
const TABLET_SIDE_TITLE_RATIO = 0.11;
const TABLET_SIDE_GAP_RATIO = 0;
const TABLET_SIDE_TITLE_OVERLAP_REF = 0;



export type MainLayoutSize = { width: number; height: number };



export type LayoutMode = 'desktop' | 'portrait' | 'landscape' | 'tablet';



export type MascotPlacement = 'besidePlaytable' | 'cornerOverlay';



export type PlayfieldLayout = 'stacked' | 'sideBySide';



export type PortraitBands = {

	title: number;

	playfield: number;

	gap: number;

	toolbar: number;

	titleBottomY: number;

	/** Screen Y for intro_logo bottom anchor (may overlap frame top). */
	titleLogoBottomY: number;

	playfieldTopY: number;

	playfieldBottomY: number;

	gapBottomY: number;

};



export type ResponsiveProfile = {

	mode: LayoutMode;

	isTallPortrait: boolean;

	playfieldLayout: PlayfieldLayout;

	/** Portrait only — band anchors in design-space Y. */

	portraitBands?: PortraitBands;

	/** Reference px height used for portrait playfield scale (crossbar → grass). */

	portraitVisiblePlaytableH: number;

	boardCenterXRatio: number;

	boardCenterYRatio: number;

	playfieldScale: number;

	playfieldSidePadding: number;

	useUniformPlayfieldScale: boolean;

	playfieldSyStretch: number;

	playfieldGapAboveToolbar: number;

	/** Extra Y offset for playfield cluster (1080 ref px; negative = lift up). Toolbar stays put. */
	playfieldLiftY: number;

	mascot: {

		visible: boolean;

		placement: MascotPlacement;

		scale: number;

		opacity: number;

		anchorRight: boolean;

		cornerMarginX: number;

		cornerMarginY: number;

	};

	toolbar: {

		heightScale: number;

		/** Portrait stacked: toolbar pill height as fraction of layout height. */

		bandHeightRatio?: number;

		bottomInset: number;

		controlScale: number;

		anchorToBottom: boolean;

		widthRatio: number;

		insetScale: number;

		/** Portrait: auto/turbo live in hamburger menu instead of the bar row. */

		auxInMenu?: boolean;

	};

	safeArea: SafeAreaInsets;

};





/** Tall phone held vertically (Stake-style mobile portrait). */

export const isTallMobilePortrait = (canvasWidth: number, canvasHeight: number): boolean => {

	const w = Math.max(canvasWidth, 1);

	const h = Math.max(canvasHeight, 1);

	const aspect = h / w;

	const shortSide = Math.min(w, h);

	const longSide = Math.max(w, h);



	return (

		aspect >= 1.35 &&

		shortSide <= 520 &&

		longSide >= 580 &&

		w < h

	);

};



/** Very tall aspect (iPhone 14 Pro Max, modern Android). */

export const isUltraTallPortrait = (canvasWidth: number, canvasHeight: number): boolean => {

	const w = Math.max(canvasWidth, 1);

	const h = Math.max(canvasHeight, 1);

	return h / w >= 1.9 && Math.min(w, h) <= 520;

};



export const resolveEffectiveLayoutMode = (

	canvasWidth: number,

	canvasHeight: number,

	baseLayoutType: LayoutMode,

): LayoutMode => {

	if (isMiniPlayerViewport(canvasWidth, canvasHeight)) return 'tablet';



	if (isTallMobilePortrait(canvasWidth, canvasHeight)) return 'portrait';



	if (isMobileLandscapeViewport(canvasWidth, canvasHeight)) return 'landscape';



	if (baseLayoutType === 'landscape' && !isMobileLandscapeViewport(canvasWidth, canvasHeight)) {

		return 'desktop';

	}



	return baseLayoutType;

};



const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));



export class ResponsiveManager {

	static compute(input: {

		mode: LayoutMode;

		layoutWidth: number;

		layoutHeight: number;

		canvasWidth: number;

		canvasHeight: number;

		safeArea?: SafeAreaInsets;

	}): ResponsiveProfile {

		const { mode, layoutWidth, layoutHeight, canvasWidth, canvasHeight } = input;

		const canvasInsets = input.safeArea ?? readSafeAreaInsets(canvasWidth, canvasHeight);

		const safeArea = safeAreaToDesign(

			canvasInsets,

			layoutWidth,

			layoutHeight,

			canvasWidth,

			canvasHeight,

		);



		const canvasAspect = canvasHeight / Math.max(canvasWidth, 1);

		const layoutAspect = layoutHeight / Math.max(layoutWidth, 1);



		switch (mode) {

			case 'portrait':

				return ResponsiveManager.computePortrait(

					layoutWidth,

					layoutHeight,

					canvasAspect,

					layoutAspect,

					safeArea,

					isUltraTallPortrait(canvasWidth, canvasHeight),

				);

			case 'landscape':

				return ResponsiveManager.computeLandscape(

					layoutWidth,

					layoutHeight,

					canvasAspect,

					safeArea,

				);

			case 'tablet':

				return ResponsiveManager.computeTablet(

					layoutWidth,

					layoutHeight,

					layoutAspect,

					safeArea,

				);

			default:

				return ResponsiveManager.computeDesktop(layoutWidth, layoutHeight, safeArea);

		}

	}



	/**

	 * Le Bandit stack: title band → playfield fills middle → gap → toolbar.

	 * Scales visible playtable height (crossbar → grass) plus optional goal-post bleed.

	 */

	private static computeLeBanditStack(metrics: {

		layoutWidth: number;

		layoutHeight: number;

		safeTop: number;

		toolbarTopY: number;

		toolbarH: number;

		sidePadding: number;

		baseScale: number;

		titleRatio: number;

		gapRatio: number;

		titleOverlapRefPx: number;

		frameBottomBleedRefPx: number;

		minScale: number;

		maxScale: number;

		widthBleed: number;

	}): {

		playfieldScale: number;

		playfieldSyStretch: number;

		boardCenterY: number;

		portraitBands: PortraitBands;

		playfieldGapAboveToolbar: number;

	} {

		const {

			layoutWidth,

			layoutHeight,

			safeTop,

			toolbarTopY,

			toolbarH,

			sidePadding,

			baseScale,

			titleRatio,

			gapRatio,

			titleOverlapRefPx,

			frameBottomBleedRefPx,

			minScale,

			maxScale,

			widthBleed,

		} = metrics;

		const sy = layoutHeight / REF_H;



		const titleBandH = layoutHeight * titleRatio;

		const gapBandH = layoutHeight * gapRatio;

		const toolbarBandH = toolbarH;



		const titleBottomY = safeTop + titleBandH;

		const gapBottomY = toolbarTopY;

		const playfieldBottomY = gapBottomY - gapBandH;

		const playfieldTopY = titleBottomY;

		let titleLogoBottomY =
			titleOverlapRefPx > 0
				? playfieldTopY + titleOverlapRefPx * sy
				: playfieldTopY - TITLE_LOGO_GAP_ABOVE_PLAYFIELD_REF * sy;

		const availH = Math.max(1, playfieldBottomY - playfieldTopY);

		const availW = layoutWidth - sidePadding * 2;



		const naturalW = PLAYTABLE_W * baseScale;

		const naturalH = (VISIBLE_PLAYTABLE_REF_H + frameBottomBleedRefPx) * baseScale;



		const scaleByWidth = (availW / Math.max(naturalW, 1)) * widthBleed;

		const scaleByHeight = availH / Math.max(naturalH, 1);

		const playfieldScale = clamp(Math.min(scaleByWidth, scaleByHeight), minScale, maxScale);



		const effectiveH = naturalH * playfieldScale;

		// Portrait stacked uses uniform scale only (see layoutScene getPlayfieldScaleFactors).
		const syStretch = frameBottomBleedRefPx > 0
			? 1
			: clamp(availH / Math.max(effectiveH, 1), 1, 1.08);

		let boardCenterY = playfieldTopY + availH * 0.5;
		let playfieldTopBound = playfieldTopY;
		let playfieldBottomBound = playfieldBottomY;
		let playfieldGapAboveToolbar = gapBandH;

		if (frameBottomBleedRefPx > 0) {
			const uniform = baseScale * playfieldScale;
			const stackH =
				(PLAYTABLE_BOARDER_INNER.h + frameBottomBleedRefPx) * uniform;
			const grassGap = PORTRAIT_PLAYFIELD_TOOLBAR_GAP_REF * sy;
			// Center board in the playable zone (safe top → toolbar).
			boardCenterY = (safeTop + toolbarTopY) * 0.5;
			const maxCenterY = toolbarTopY - grassGap - stackH / 2;
			const minCenterY = safeTop + PORTRAIT_PLAYFIELD_TOP_PAD_REF * sy + stackH / 2;
			boardCenterY = clamp(boardCenterY, minCenterY, maxCenterY);
			playfieldTopBound = boardCenterY - stackH / 2;
			playfieldBottomBound = boardCenterY + stackH / 2;
			playfieldGapAboveToolbar = Math.max(0, toolbarTopY - playfieldBottomBound);
			const headerSpan = Math.max(1, playfieldTopBound - safeTop);
			titleLogoBottomY = safeTop + headerSpan * PORTRAIT_LOGO_HEADER_RATIO;
		}

		const playfieldRatio = (playfieldBottomBound - playfieldTopBound) / layoutHeight;

		const toolbarRatio = toolbarBandH / layoutHeight;



		return {

			playfieldScale,

			playfieldSyStretch: syStretch,

			boardCenterY,

			playfieldGapAboveToolbar,

			portraitBands: {

				title: titleRatio,

				playfield: playfieldRatio,

				gap: gapRatio,

				toolbar: toolbarRatio,

				titleBottomY,

				titleLogoBottomY,

				playfieldTopY: playfieldTopBound,

				playfieldBottomY: playfieldBottomBound,

				gapBottomY,

			},

		};

	}



	private static buildStackedProfile(

		mode: LayoutMode,

		layoutHeight: number,

		safeArea: SafeAreaInsets,

		stack: ReturnType<typeof ResponsiveManager.computeLeBanditStack>,

		toolbar: ResponsiveProfile['toolbar'],

		mascot: ResponsiveProfile['mascot'],

		overrides: Partial<ResponsiveProfile> = {},

	): ResponsiveProfile {

		return {

			mode,

			isTallPortrait: false,

			playfieldLayout: 'stacked',

			portraitBands: stack.portraitBands,

			portraitVisiblePlaytableH: VISIBLE_PLAYTABLE_REF_H,

			boardCenterXRatio: 0.5,

			boardCenterYRatio: stack.boardCenterY / layoutHeight,

			playfieldScale: stack.playfieldScale,

			playfieldSidePadding: 0,

			useUniformPlayfieldScale: true,

			playfieldSyStretch: stack.playfieldSyStretch,

			playfieldGapAboveToolbar: stack.playfieldGapAboveToolbar,

			playfieldLiftY: 0,

			mascot,

			toolbar,

			safeArea,

			...overrides,

		};

	}



	private static computePortrait(

		layoutWidth: number,

		layoutHeight: number,

		canvasAspect: number,

		layoutAspect: number,

		safeArea: SafeAreaInsets,

		ultraTall: boolean,

	): ResponsiveProfile {

		const isTallPortrait = canvasAspect >= 1.75 || layoutAspect >= 1.65 || ultraTall;

		const sy = layoutHeight / REF_H;

		const baseScale = layoutWidth / REF_W;



		const safeTop = safeArea.top + (ultraTall ? 6 : isTallPortrait ? 8 : 12) * sy;

		const safeBottom = safeArea.bottom;



		const bottomInset = safeBottom + (ultraTall ? 3 : isTallPortrait ? 4 : 6) * sy;

		const toolbarH = layoutHeight * PORTRAIT_TOOLBAR_RATIO;

		const toolbarTopY = layoutHeight - bottomInset - toolbarH;

		const refToolbarH = TOOLBAR_H * baseScale;

		const bandScale = toolbarH / Math.max(refToolbarH, 1);



		const { playfieldScale, boardCenterY, playfieldSyStretch, portraitBands, playfieldGapAboveToolbar } =

			ResponsiveManager.computeLeBanditStack({

				layoutWidth,

				layoutHeight,

				safeTop,

				toolbarTopY,

				toolbarH,

				sidePadding: 0,

				baseScale,

				titleRatio: PORTRAIT_TITLE_RATIO,

				gapRatio: PORTRAIT_GAP_RATIO,

				titleOverlapRefPx: 0,

				frameBottomBleedRefPx: GOAL_FRAME_BOTTOM_BLEED_REF,

				minScale: 1,

				maxScale: ultraTall ? 2.7 : isTallPortrait ? 2.65 : 2.55,

				widthBleed: ultraTall ? 1.02 : isTallPortrait ? 1.01 : 1,

			});



		return {

			mode: 'portrait',

			isTallPortrait,

			playfieldLayout: 'stacked',

			portraitBands,

			portraitVisiblePlaytableH: VISIBLE_PLAYTABLE_REF_H,

			boardCenterXRatio: 0.5,

			boardCenterYRatio: boardCenterY / layoutHeight,

			playfieldScale,

			playfieldSidePadding: 0,

			useUniformPlayfieldScale: true,

			playfieldSyStretch,

			playfieldGapAboveToolbar,

			playfieldLiftY: 0,

			mascot: {

				visible: false,

				placement: 'cornerOverlay',

				scale: 0,

				opacity: 0,

				anchorRight: true,

				cornerMarginX: 0,

				cornerMarginY: 0,

			},

			toolbar: {

				heightScale: bandScale,

				bandHeightRatio: PORTRAIT_TOOLBAR_RATIO,

				auxInMenu: true,

				bottomInset: bottomInset / sy,

				controlScale: bandScale,

				anchorToBottom: true,

				widthRatio: 0.96,

				insetScale: ultraTall ? 0.78 : isTallPortrait ? 0.8 : 0.82,

			},

			safeArea,

		};

	}



	private static computeDesktop(

		layoutWidth: number,

		layoutHeight: number,

		safeArea: SafeAreaInsets,

	): ResponsiveProfile {

		const sy = layoutHeight / REF_H;

		const baseScale = layoutWidth / REF_W;

		const safeTop = safeArea.top + 8 * sy;

		const bottomInset = 24 + safeArea.bottom / sy;

		const toolbarH = TOOLBAR_H * baseScale;

		const toolbarTopY = layoutHeight - bottomInset * sy - toolbarH;



		const stack = ResponsiveManager.computeLeBanditStack({

			layoutWidth,

			layoutHeight,

			safeTop,

			toolbarTopY,

			toolbarH,

			sidePadding: 0,

			baseScale,

			titleRatio: DESKTOP_TITLE_RATIO,

			gapRatio: DESKTOP_GAP_RATIO,

			titleOverlapRefPx: DESKTOP_TITLE_OVERLAP_REF,

			frameBottomBleedRefPx: 0,

			minScale: 0.85,

			maxScale: 1.08,

			widthBleed: 1,

		});



		return ResponsiveManager.buildStackedProfile(

			'desktop',

			layoutHeight,

			safeArea,

			stack,

			{

				heightScale: 1,

				bottomInset,

				controlScale: 1,

				anchorToBottom: true,

				widthRatio: 1,

				insetScale: 1,

			},

			{

				visible: true,

				placement: 'besidePlaytable',

				scale: 1.04,

				opacity: 1,

				anchorRight: false,

				cornerMarginX: 12,

				cornerMarginY: 8,

			},

		);

	}



	private static computeLandscape(

		layoutWidth: number,

		layoutHeight: number,

		canvasAspect: number,

		safeArea: SafeAreaInsets,

	): ResponsiveProfile {

		const compact = canvasAspect < 0.52;

		const sy = layoutHeight / REF_H;

		const baseScale = layoutWidth / REF_W;

		const safeTop = safeArea.top + (compact ? 6 : 8) * sy;

		const bottomInset = (compact ? 14 : 18) + safeArea.bottom / sy;

		const toolbarH = TOOLBAR_H * baseScale * 0.9;

		const toolbarTopY = layoutHeight - bottomInset * sy - toolbarH;



		const stack = ResponsiveManager.computeLeBanditStack({

			layoutWidth,

			layoutHeight,

			safeTop,

			toolbarTopY,

			toolbarH,

			sidePadding: 0,

			baseScale,

			titleRatio: compact ? LANDSCAPE_COMPACT_TITLE_RATIO : LANDSCAPE_TITLE_RATIO,

			gapRatio: compact ? LANDSCAPE_COMPACT_GAP_RATIO : LANDSCAPE_GAP_RATIO,

			titleOverlapRefPx: compact

				? LANDSCAPE_COMPACT_TITLE_OVERLAP_REF

				: LANDSCAPE_TITLE_OVERLAP_REF,

			frameBottomBleedRefPx: 0,

			minScale: 0.8,

			maxScale: compact ? 1.05 : 1.1,

			widthBleed: 1,

		});



		return ResponsiveManager.buildStackedProfile(

			'landscape',

			layoutHeight,

			safeArea,

			stack,

			{

				heightScale: 0.9,

				bottomInset,

				controlScale: compact ? 0.98 : 1,

				anchorToBottom: true,

				widthRatio: 1,

				insetScale: 1,

			},

			{

				visible: true,

				placement: 'besidePlaytable',

				scale: compact ? 0.86 : 0.98,

				opacity: 1,

				anchorRight: false,

				cornerMarginX: 12,

				cornerMarginY: 8,

			},

		);

	}



	private static computeTablet(

		layoutWidth: number,

		layoutHeight: number,

		layoutAspect: number,

		safeArea: SafeAreaInsets,

	): ResponsiveProfile {

		const tallStacked = layoutAspect > 1.05;

		const sy = layoutHeight / REF_H;

		const baseScale = layoutWidth / REF_W;

		const safeTop = safeArea.top + 10 * sy;

		const bottomInset = 20 + safeArea.bottom / sy;

		const toolbarH = TOOLBAR_H * baseScale * 0.92;

		const toolbarTopY = layoutHeight - bottomInset * sy - toolbarH;



		const stack = ResponsiveManager.computeLeBanditStack({

			layoutWidth,

			layoutHeight,

			safeTop,

			toolbarTopY,

			toolbarH,

			sidePadding: tallStacked ? 12 : 0,

			baseScale,

			titleRatio: tallStacked ? TABLET_STACKED_TITLE_RATIO : TABLET_SIDE_TITLE_RATIO,

			gapRatio: tallStacked ? TABLET_STACKED_GAP_RATIO : TABLET_SIDE_GAP_RATIO,

			titleOverlapRefPx: tallStacked

				? TABLET_STACKED_TITLE_OVERLAP_REF

				: TABLET_SIDE_TITLE_OVERLAP_REF,

			frameBottomBleedRefPx: 0,

			minScale: 0.85,

			maxScale: tallStacked ? 2.2 : 1.12,

			widthBleed: tallStacked ? 1.04 : 1,

		});



		return ResponsiveManager.buildStackedProfile(

			'tablet',

			layoutHeight,

			safeArea,

			stack,

			{

				heightScale: 0.92,

				bottomInset,

				controlScale: 1.04,

				anchorToBottom: true,

				widthRatio: tallStacked ? 0.92 : 1,

				insetScale: 0.9,

			},

			{

				visible: !tallStacked,

				placement: tallStacked ? 'cornerOverlay' : 'besidePlaytable',

				scale: tallStacked ? 0 : 0.85,

				opacity: tallStacked ? 0 : 1,

				anchorRight: tallStacked,

				cornerMarginX: 12,

				cornerMarginY: 8,

			},

			{

				playfieldSidePadding: tallStacked ? 12 : 0,

			},

		);

	}



	static boardCenter(main: MainLayoutSize, profile: ResponsiveProfile) {

		return {

			x: main.width * profile.boardCenterXRatio,

			y: main.height * profile.boardCenterYRatio,

		};

	}



	static mascotLayout(

		main: MainLayoutSize,

		profile: ResponsiveProfile,

		boardCenter: { x: number; y: number },

		playtable: { width: number; height: number },

		toolbarTopY: number,

		spinRight?: number,

		grassFeetY?: number,

		autoStackCenterX?: number,

	) {

		const sx = main.width / REF_W;

		const sy = main.height / REF_H;

		const scale = profile.mascot.scale;

		const width = MASCOT_REF_WIDTH * sx * scale;

		const height = MASCOT_REF_HEIGHT * sy * scale;



		if (profile.mascot.placement === 'cornerOverlay') {

			const marginX = profile.mascot.cornerMarginX * sx;

			const marginY = profile.mascot.cornerMarginY * sy;

			const feetY = grassFeetY ?? toolbarTopY - marginY;

			const feetX = profile.mascot.anchorRight ? main.width - marginX : marginX;



			const shadowCenterX = profile.mascot.anchorRight

				? feetX - width / 2

				: feetX + width / 2;

			const shadowCenterY = feetY - (MASCOT_SHADOW_REF_HEIGHT / 2) * sy * scale;



			return {

				feetX,

				feetY,

				width,

				height,

				anchorRight: profile.mascot.anchorRight,

				shadowCenterX,

				shadowCenterY,

				shadowWidth: MASCOT_SHADOW_REF_WIDTH * sx * scale,

				shadowHeight: MASCOT_SHADOW_REF_HEIGHT * sy * scale,

				opacity: profile.mascot.opacity,

				placement: profile.mascot.placement,

			};

		}



		const goalRightX = boardCenter.x + playtable.width / 2;
		const spinEdge = spinRight ?? goalRightX;
		const stackCenterX = autoStackCenterX ?? spinEdge + MASCOT_FROM_SPIN_GAP * sx;

		// Center on auto/turbo column; keep feet on grass and clear of the goal frame.
		let feetX = stackCenterX - width / 2;
		const minFeetX = goalRightX + MASCOT_FROM_GOAL_GAP * sx * scale;
		feetX = Math.max(feetX, minFeetX);

		const maxFeetX = main.width - width - LAYOUT_EDGE_MARGIN * sx;
		if (feetX > maxFeetX) {
			feetX = maxFeetX;
		}
		feetX += MASCOT_FEET_X_NUDGE * sx * scale;

		const feetY =
			grassFeetY ?? toolbarTopY - MASCOT_FEET_GAP_ABOVE_TOOLBAR * sy;



		return {

			feetX,

			feetY,

			width,

			height,

			anchorRight: false,

			shadowCenterX: feetX + width / 2,

			shadowCenterY: feetY - (MASCOT_SHADOW_REF_HEIGHT / 2) * sy * scale,

			shadowWidth: MASCOT_SHADOW_REF_WIDTH * sx * scale,

			shadowHeight: MASCOT_SHADOW_REF_HEIGHT * sy * scale,

			opacity: profile.mascot.opacity,

			placement: profile.mascot.placement,

		};

	}

}



export const getDefaultResponsiveProfile = (): ResponsiveProfile =>
	ResponsiveManager.compute({
		mode: 'desktop',
		layoutWidth: REF_W,
		layoutHeight: REF_H,
		canvasWidth: REF_W,
		canvasHeight: REF_H,
	});



export { estimateSafeAreaInsets, readSafeAreaInsets };


