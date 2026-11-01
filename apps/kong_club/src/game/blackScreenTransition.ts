import { waitForTimeout } from 'utils-shared/wait';

import { bonusScreenAnimMs } from './bonusScreenWait';
import { eventEmitter } from './eventEmitter';

export const BLACK_SCREEN_FADE_MS = 520;
export const BLACK_SCREEN_HOLD_MS = 280;

const waitPaintFrame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export const fadeScreenToBlack = () =>
	eventEmitter.broadcastAsync({ type: 'blackScreenFadeIn' });

export const fadeScreenFromBlack = () =>
	eventEmitter.broadcastAsync({ type: 'blackScreenFadeOut' });

type BlackScreenTransitionOptions = {
	/** Keep the black cover up until the FS intro fades it out (avoids a flash of reels). */
	keepBlackUntilIntro?: boolean;
	/** Caller already faded to black (e.g. bonus outro crossfade). */
	skipFadeIn?: boolean;
};

/** Fade to black, run work while covered, brief hold, then fade back in. */
export const playBlackScreenTransition = async (
	duringBlack: () => Promise<void> | void,
	options?: BlackScreenTransitionOptions,
) => {
	if (!options?.skipFadeIn) {
		await fadeScreenToBlack();
		await waitPaintFrame();
		await waitPaintFrame();
	}
	await duringBlack();
	await waitForTimeout(bonusScreenAnimMs(BLACK_SCREEN_HOLD_MS));
	if (!options?.keepBlackUntilIntro) {
		await fadeScreenFromBlack();
	}
};
