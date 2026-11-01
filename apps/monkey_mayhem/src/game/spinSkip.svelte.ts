import { stateBet, stateBetDerived } from 'state-shared';

import {
	commitPendingSpinSpeedTier,
	setSpinSpeedCommitBlocked,
} from './spinSpeed.svelte';
import { stateGame } from './stateGame.svelte';
import { eventEmitter } from './eventEmitter';
import { spinWinOverlay, runSkipWinCount } from './spinWinOverlay.svelte';
import { isFsIntroBlocked, endFsIntroBlock } from './gameplayLock.svelte';

export const stateSpinSkip = $state({
	active: false,
	reelsRolling: false,
	boardSkipUsed: false,
	quickLandUsed: false,
	quickLandInProgress: false,
	forceSkip: false,
	winPresentationSkipUsed: false,
	tumbleAnimating: false,
});

export const hasSkippableWinPresentation = () =>
	spinWinOverlay.counting || spinWinOverlay.show || stateGame.lineWinPresentation;

export const clearWinPresentationSkipUsed = () => {
	stateSpinSkip.winPresentationSkipUsed = false;
};

export const canRequestSpinSkip = () => {
	// Cascades must stay skippable — tumbleAnimating used to hard-block skip and break flow.
	return (
		stateSpinSkip.active ||
		stateSpinSkip.reelsRolling ||
		stateSpinSkip.tumbleAnimating ||
		hasSkippableWinPresentation()
	);
};

export const canRequestBoardSpinSkip = () =>
	canRequestSpinSkip() &&
	(stateSpinSkip.reelsRolling || stateSpinSkip.tumbleAnimating || isFsIntroBlocked());

const skipWinPresentation = () => {
	if (!hasSkippableWinPresentation()) return false;
	const targetWinAmount =
		spinWinOverlay.targetAmount ||
		spinWinOverlay.displayAmount;
	const hasUnfinishedWinCount =
		spinWinOverlay.show &&
		targetWinAmount > 0 &&
		spinWinOverlay.displayAmount < targetWinAmount;
	if (spinWinOverlay.counting || hasUnfinishedWinCount) {
		if (stateSpinSkip.winPresentationSkipUsed) return false;
		stateSpinSkip.winPresentationSkipUsed = true;
		runSkipWinCount();
		return true;
	}
	eventEmitter.broadcast({ type: 'paylineWinSkip' });
	return true;
};

export const requestSpinSkip = () => {
	if (!canRequestSpinSkip()) return;
	if (skipWinPresentation()) {
		eventEmitter.broadcast({ type: 'winSkip' });
		return;
	}
	eventEmitter.broadcast({ type: 'spinSkipPressToContinue' });
	if (isFsIntroBlocked()) return;
	stateSpinSkip.forceSkip = true;
};

export const requestBoardSpinSkip = () => {
	if (!stateSpinSkip.reelsRolling) return;
	requestSpinSkip();
};

export const beginBetPlayback = () => {
	setSpinSpeedCommitBlocked(true);
	stateSpinSkip.active = true;
	stateSpinSkip.reelsRolling = false;
	stateSpinSkip.forceSkip = false;
	stateSpinSkip.winPresentationSkipUsed = false;
};

export const endBetPlayback = () => {
	stateSpinSkip.active = false;
	stateSpinSkip.reelsRolling = false;
	stateSpinSkip.forceSkip = false;
	stateSpinSkip.tumbleAnimating = false;
	commitPendingSpinSpeedTier(true);
};

/** Full spin-skip guard reset after a failed wager or abandoned playback. */
export const resetSpinSkipState = () => {
	stateSpinSkip.active = false;
	stateSpinSkip.reelsRolling = false;
	stateSpinSkip.boardSkipUsed = false;
	stateSpinSkip.quickLandUsed = false;
	stateSpinSkip.quickLandInProgress = false;
	stateSpinSkip.forceSkip = false;
	stateSpinSkip.winPresentationSkipUsed = false;
	stateSpinSkip.tumbleAnimating = false;
	commitPendingSpinSpeedTier(true);
};

export const beginReelsRolling = () => {
	stateSpinSkip.reelsRolling = true;
	stateSpinSkip.boardSkipUsed = false;
	if (stateGame.gameType === 'freegame') {
		stateSpinSkip.forceSkip = false;
	}
};

export const endReelsRolling = () => {
	stateSpinSkip.reelsRolling = false;
};

export const beginTumbleAnimating = () => {
	stateSpinSkip.tumbleAnimating = true;
	// Keep forceSkip / turbo intent across cascade steps — clearing it made tumbles unskippable.
};

export const endTumbleAnimating = () => {
	stateSpinSkip.tumbleAnimating = false;
};

export const waitForTumbleIdle = (): Promise<void> =>
	new Promise((resolve) => {
		if (!stateSpinSkip.tumbleAnimating) {
			resolve();
			return;
		}
		const started = performance.now();
		const maxMs = 8000;
		const poll = () => {
			if (!stateSpinSkip.tumbleAnimating || performance.now() - started > maxMs) {
				if (stateSpinSkip.tumbleAnimating) {
					stateSpinSkip.tumbleAnimating = false;
				}
				resolve();
				return;
			}
			requestAnimationFrame(poll);
		};
		requestAnimationFrame(poll);
	});

export const clearSpinSkipForBonusPresentation = () => {
	stateSpinSkip.forceSkip = false;
	stateSpinSkip.boardSkipUsed = false;
	stateSpinSkip.quickLandUsed = false;
	stateSpinSkip.quickLandInProgress = false;
};

export const beginBuyBonusEntryBlock = () => {
	endFsIntroBlock();
	clearSpinSkipForBonusPresentation();
};

export const awaitBuyBonusPresentationReady = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		);
	});

/** Apply force-skip turbo for the current reveal spin. */
export const withForceSkipSpin = async <T>(spin: () => Promise<T>) => {
	const wasTurbo = stateBet.isTurbo;
	if (stateSpinSkip.forceSkip) {
		stateBetDerived.updateIsTurbo(true, { persistent: false });
	}
	try {
		return await spin();
	} finally {
		if (stateSpinSkip.forceSkip && !wasTurbo) {
			stateBetDerived.updateIsTurbo(wasTurbo, { persistent: false });
		}
		stateSpinSkip.forceSkip = false;
	}
};

export const skippableDelay = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		if (ms <= 0) {
			resolve();
			return;
		}
		if (shouldBypassSkippableDelay()) {
			resolve();
			return;
		}
		const deadline = performance.now() + ms;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const finish = () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			resolve();
		};
		timeoutId = setTimeout(finish, ms);
		const pollSkip = () => {
			if (shouldBypassSkippableDelay() || performance.now() >= deadline) {
				finish();
				return;
			}
			requestAnimationFrame(pollSkip);
		};
		requestAnimationFrame(pollSkip);
	});

/** Player slam-skip only. Persistent turbo must not zero-out waits. */
export const shouldBypassSkippableDelay = () => stateSpinSkip.forceSkip;
