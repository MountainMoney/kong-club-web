import { resolveEffectiveLayoutMode, type LayoutMode } from './responsiveManager';
import { isSocialMode } from './socialCopy';

export type SplashFeaturePanelId = 'hidden_bonus' | 'max_win' | 'coin_game';

export type SplashFeaturePanel = {
	id: SplashFeaturePanelId;
	title: string;
	subtitle: string;
};

export const splashFeaturePanels = (): SplashFeaturePanel[] => [
	{
		id: 'hidden_bonus',
		title: isSocialMode() ? 'HIDDEN FEATURE' : 'HIDDEN BONUS',
		subtitle: 'Land scatters for See, Hear, or Monkey Madness',
	},
	{
		id: 'max_win',
		title: 'MAX WIN',
		subtitle: 'The cap. Hard to hit.',
	},
	{
		id: 'coin_game',
		title: isSocialMode() ? 'COIN FEATURE' : 'BONUS COIN FEATURE',
		subtitle: isSocialMode()
			? 'Fill the bar. Lit tiles reveal coins.'
			: 'Fill the bar. Lit tiles pay coins.',
	},
];

/** Canonical panel list (index order for carousel). */
export const SPLASH_FEATURE_PANELS: SplashFeaturePanel[] = splashFeaturePanels();

export const SPLASH_PANEL_COUNT = 3;

/** Hold on each panel before auto-advance. */
export const SPLASH_AUTO_ADVANCE_MS = 4000;
/** Crossfade duration. */
export const SPLASH_TRANSITION_MS = 480;

export const splashPanelByStep = (stepIndex: number): SplashFeaturePanel => {
	const panels = splashFeaturePanels();
	const len = panels.length;
	return panels[((stepIndex % len) + len) % len];
};

/** Desktop: three-up row. Mobile portrait: single-panel carousel. */
export const useSplashCarouselMode = (
	canvasWidth: number,
	canvasHeight: number,
	baseLayoutType: LayoutMode,
): boolean =>
	resolveEffectiveLayoutMode(canvasWidth, canvasHeight, baseLayoutType) === 'portrait';

export const splashEaseOutCubic = (t: number) => 1 - (1 - t) ** 3;
