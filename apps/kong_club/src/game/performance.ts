import { browser } from '$app/environment';

import { isFxLabActive } from './fxLab.svelte';

/** Portrait phones — reduce expensive celebration FX. */
const isMobilePortraitViewport = () => {
	if (!browser) return false;
	const w = window.innerWidth;
	const h = window.innerHeight;
	return h > w && Math.min(w, h) <= 520;
};

export const FOOTBALL_PERFORMANCE = {
	maxFps: 60,
	maxDevicePixelRatio: 1.5,
	particlePoolLimit: 160,
	get disableExpensiveTestFx() {
		if (isFxLabActive()) return false;
		return isMobilePortraitViewport();
	},
} as const;
