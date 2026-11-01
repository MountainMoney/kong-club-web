import { stateBet } from 'state-shared';

import { stateGame } from './stateGame.svelte';
import { eventEmitter } from './eventEmitter';
import { clearDeferredCoinSeeds } from './coinSeedDeferral';
import { isHeldFeatureBoardMode, isPeakSpinBetMode } from './betModes';
import { beginHeldBoardDismiss, hasSittingCoinCells } from './coinFeatureCover.svelte';
import { isTurboOrFaster } from './spinSpeed.svelte';

/** Clear level-up tiles + progress as soon as the player commits the next base spin. */
export const resetBaseSpinVisualsOnClick = () => {
	if (stateGame.gameType !== 'basegame') return;
	clearDeferredCoinSeeds();
	const peak = isPeakSpinBetMode(stateBet.activeBetModeKey);
	if (peak) {
		eventEmitter.broadcast({ type: 'peakBarSpinReset' });
	}
	const sitLeave =
		hasSittingCoinCells() && !isTurboOrFaster() && !stateBet.isTurbo;
	if (sitLeave) {
		beginHeldBoardDismiss();
		eventEmitter.broadcast({ type: 'heldBoardSpinAway' });
		if (isHeldFeatureBoardMode(stateBet.activeBetModeKey) || peak) return;
	}
	if (!peak) {
		eventEmitter.broadcast({ type: 'monkeyMechanicsReset' });
	}
};
