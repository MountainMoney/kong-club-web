import { cubicIn, cubicOut, sineOut } from 'svelte/easing';
import type { Tween } from 'svelte/motion';

import type { CascadingReelSpinOptions } from './types';

export type SlideSymbolFallInOptions = {
	symbolY: Tween<number>;
	oldSymbolY: number;
	newSymbolY: number;
	symbolIndexInBoard: number;
	reelLengthInBoard: number;
	spinOptions: Pick<
		CascadingReelSpinOptions,
		| 'symbolFallInInterval'
		| 'symbolFallInBounceSizeMulti'
		| 'symbolFallInBounceSpeed'
		| 'symbolFallInSpeed'
		| 'symbolFallInEasing'
	>;
	symbolHeight: number;
	onLand?: () => void;
};

/** Gravity drop, dip on impact, spring above rest, then settle. */
export const slideSymbolFallIn = async ({
	symbolY,
	oldSymbolY,
	newSymbolY,
	symbolIndexInBoard,
	reelLengthInBoard,
	spinOptions,
	symbolHeight,
	onLand,
}: SlideSymbolFallInOptions) => {
	if (newSymbolY === oldSymbolY) return;

	const delay =
		spinOptions.symbolFallInInterval * (reelLengthInBoard - symbolIndexInBoard);
	const dipPx = symbolHeight * Math.max(0, spinOptions.symbolFallInBounceSizeMulti ?? 0);

	if (dipPx <= 0) {
		const distance = newSymbolY - oldSymbolY;
		const duration = Math.max(distance / spinOptions.symbolFallInSpeed, 0);
		await symbolY.set(newSymbolY, {
			duration,
			delay,
			easing: spinOptions.symbolFallInEasing ?? cubicOut,
		});
		onLand?.();
		return;
	}

	const recoilPx = dipPx * 0.45;
	const impactY = newSymbolY + dipPx;
	const recoilY = newSymbolY - recoilPx;
	const fallDuration = Math.max((impactY - oldSymbolY) / spinOptions.symbolFallInSpeed, 0);
	const bounceDuration = Math.max(dipPx / spinOptions.symbolFallInBounceSpeed, 0);
	const recoilDuration = bounceDuration * 0.55;
	const settleDuration = bounceDuration * 0.45;

	await symbolY.set(impactY, {
		duration: fallDuration,
		delay,
		easing: cubicIn,
	});
	onLand?.();
	await symbolY.set(recoilY, {
		duration: recoilDuration,
		easing: cubicOut,
	});
	await symbolY.set(newSymbolY, {
		duration: settleDuration,
		easing: sineOut,
	});
};
