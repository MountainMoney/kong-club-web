import { isMiniPlayerViewport, isMobileLandscapeViewport } from './layoutUi';
import type { LayoutMode } from './responsiveManager';
import {
	getDefaultResponsiveProfile,
	readSafeAreaInsets,
	resolveEffectiveLayoutMode,
	ResponsiveManager,
	type ResponsiveProfile,
} from './responsiveManager';

/** Active layout profile — updated from `Game.svelte` when canvas/layout changes. */
const profile = $state<ResponsiveProfile>(getDefaultResponsiveProfile());

/** Read current responsive profile (safe to call from layout helpers and components). */
export const getGameLayoutProfile = (): ResponsiveProfile => profile;

export type SyncLayoutProfileInput = {
	layoutType: LayoutMode;
	layoutWidth: number;
	layoutHeight: number;
	canvasWidth: number;
	canvasHeight: number;
};

export const syncGameLayoutProfile = (input: SyncLayoutProfileInput) => {
	const mode = resolveEffectiveLayoutMode(
		input.canvasWidth,
		input.canvasHeight,
		input.layoutType,
	);
	const safeArea = readSafeAreaInsets(input.canvasWidth, input.canvasHeight);

	const next = ResponsiveManager.compute({
		mode,
		layoutWidth: input.layoutWidth,
		layoutHeight: input.layoutHeight,
		canvasWidth: input.canvasWidth,
		canvasHeight: input.canvasHeight,
		safeArea,
	});
	// Do not reassign the exported $state; mutate it in-place for Svelte runes.
	Object.assign(profile, next);
};

/** Single layout picker for UI + playfield — matches Stake SDK portrait/landscape routing. */
export const getEffectiveFootballLayoutType = (
	canvasWidth: number,
	canvasHeight: number,
	baseLayoutType: LayoutMode,
): LayoutMode => {
	if (isMiniPlayerViewport(canvasWidth, canvasHeight)) return 'tablet';
	const mode = resolveEffectiveLayoutMode(canvasWidth, canvasHeight, baseLayoutType);
	if (mode === 'landscape' && !isMobileLandscapeViewport(canvasWidth, canvasHeight)) {
		return 'desktop';
	}
	return mode;
};

export { resolveEffectiveLayoutMode, readSafeAreaInsets };

// ─── Usage examples (portrait vs landscape) ───────────────────────────────
//
//   import { syncGameLayoutProfile, getGameLayoutProfile } from './responsiveProfile.svelte';
//
//   $effect.pre(() => { syncGameLayoutProfile({ ... }); });
//   const profile = getGameLayoutProfile();
//
export const layoutExamples = {
	portrait: (): Partial<ResponsiveProfile> => ({
		mode: 'portrait',
		playfieldLayout: 'stacked',
		boardCenterXRatio: 0.5,
		useUniformPlayfieldScale: true,
		playfieldScale: 2.2,
		playfieldSyStretch: 1,
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
			anchorToBottom: true,
			widthRatio: 0.99,
			bandHeightRatio: 0.13,
			controlScale: 3.7,
			heightScale: 3.7,
			bottomInset: 6,
			insetScale: 0.86,
		},
	}),
	landscape: (): Partial<ResponsiveProfile> => ({
		mode: 'landscape',
		playfieldLayout: 'stacked',
		boardCenterXRatio: 0.5,
		boardCenterYRatio: 0.48,
		playfieldScale: 1,
		mascot: {
			visible: true,
			placement: 'besidePlaytable',
			scale: 0.78,
			opacity: 1,
			anchorRight: false,
			cornerMarginX: 12,
			cornerMarginY: 8,
		},
	}),
} as const;
