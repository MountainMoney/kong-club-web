import { eventEmitter } from './eventEmitter';

// GG scene curtain (ggTransitions GG_CURTAIN): close 520 ms, hold 90 ms, open 780 ms.
export const BLACK_SCREEN_FADE_MS = 520;

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
	// GG: no hold here; the curtain holds GG_CURTAIN.holdMs (90 ms) as it starts to open.
	if (!options?.keepBlackUntilIntro) {
		await fadeScreenFromBlack();
	}
};
