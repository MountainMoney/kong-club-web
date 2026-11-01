import type { Sizes } from 'pixi-svelte';

import { isSocialMode } from './socialCopy';

/** Use text labels instead of freespins_* bitmap art on intro/outro cards. */
export const showFreeSpinSocialLabels = () => isSocialMode();

export const FREE_SPIN_INTRO_HEADLINE = 'FREE GAMES';
export const FREE_SPIN_INTRO_SUBLINE = 'GAMES';

export const freeSpinHeadlineStyle = (sizes: Sizes, fontReady: boolean) => ({
	fontFamily: fontReady ? 'Fredoka' : 'Arial',
	fontSize: sizes.width * 0.11,
	fontWeight: '700' as const,
	fill: 0xffffff,
	align: 'center' as const,
	stroke: { color: 0x000000, width: 6 },
});

export const freeSpinSublineStyle = (sizes: Sizes, fontReady: boolean) => ({
	fontFamily: fontReady ? 'Fredoka' : 'Arial',
	fontSize: sizes.width * 0.045,
	fontWeight: '700' as const,
	fill: 0xffffff,
	align: 'center' as const,
	stroke: { color: 0x000000, width: 4 },
});
