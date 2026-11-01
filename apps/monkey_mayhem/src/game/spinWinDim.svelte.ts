import { Tween } from 'svelte/motion';

import {
	WIN_COUNT_DIM_ALPHA,
	WIN_COUNT_DIM_FADE_MS,
	WIN_COUNT_FADE_OUT_MS,
} from './winCountLayout';
import { spinWinOverlay } from './spinWinOverlay.svelte';

/** 0–1 fade multiplier for playfield dim during win count-up. */
export const spinWinDimProgress = new Tween(0);

export const spinWinEffectiveDim = () =>
	spinWinDimProgress.current *
	(spinWinOverlay.targetDimAlpha || WIN_COUNT_DIM_ALPHA);

export const fadeSpinWinDimIn = () => {
	const current = spinWinDimProgress.current;
	if (current >= 0.99) {
		return spinWinDimProgress.set(1, { duration: 0 });
	}
	if (current > 0.01) {
		const remaining = Math.max(80, WIN_COUNT_DIM_FADE_MS * (1 - current));
		return spinWinDimProgress.set(1, { duration: remaining });
	}
	spinWinDimProgress.set(0, { duration: 0 });
	return spinWinDimProgress.set(1, { duration: WIN_COUNT_DIM_FADE_MS });
};

export const fadeSpinWinDimOut = () =>
	spinWinDimProgress.set(0, { duration: WIN_COUNT_FADE_OUT_MS });

export const resetSpinWinDim = () => {
	spinWinDimProgress.set(0, { duration: 0 });
};
