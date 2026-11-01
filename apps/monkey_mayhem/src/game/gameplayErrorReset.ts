import { stateBet, stateModal, stateUi } from 'state-shared';
import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';

import { resetActiveBetModeAfterBuyFeature } from './betModes';
import { clearDeferredCoinSeeds } from './coinSeedDeferral';
import { clearDeferredFeatureActivation } from './featureSpinActivationDeferral';
import { clearLastTileLevels } from './lastTileLevels';
import { INITIAL_BOARD } from './constants';
import { eventEmitter } from './eventEmitter';
import { unlockGameplayInput, endFsIntroBlock } from './gameplayLock.svelte';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { resetSpinSkipState } from './spinSkip.svelte';
import { resetBonusSessionWin } from './bonusSessionWin';
import { invalidateWinPresentation } from './spinWinOverlay.svelte';
import { clearClusterConnectMotion } from './clusterConnectMotion.svelte';

/** Clears spin-skip / FS-intro guards after a failed wager or book playback. */
export const resetSpinSkipAfterError = () => {
	resetSpinSkipState();
	endFsIntroBlock();
};

const resetGameModelState = () => {
	stateGame.gameType = 'basegame';
	stateGame.lineWinPresentation = false;
	stateGame.tumbleBoardAdding = [];
	stateGame.tumbleBoardBase = [];
	stateGame.multiplierBoard = [];
	stateGame.scatterCounter = 0;
	stateGame.scatterRollInActive = false;
	stateGame.scatterRollInCount = 3;
};

const resetBoardPresentation = () => {
	eventEmitter.broadcast({ type: 'stopButtonClick' });
	stateGameDerived.enhancedBoard.settle(INITIAL_BOARD);
};

const resetWinOverlays = () => {
	invalidateWinPresentation();
	eventEmitter.broadcast({ type: 'winHide' });
	eventEmitter.broadcast({ type: 'paylineWinHide' });
	eventEmitter.broadcast({ type: 'hideClusterWinAmounts' });
	clearClusterConnectMotion();
};

const resetFreeSpinUi = () => {
	stateUi.freeSpinCounterShow = false;
	stateUi.freeSpinCounterCurrent = 0;
	stateUi.freeSpinCounterTotal = 0;
	eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
	eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
	eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
	eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: 0, total: 0 });
};

const resetTumbleUi = () => {
	eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
	eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
	eventEmitter.broadcast({ type: 'tumbleBoardReset' });
	eventEmitter.broadcast({ type: 'tumbleBoardHide' });
};

const resetMonkeyMechanics = () => {
	clearDeferredCoinSeeds();
	clearDeferredFeatureActivation();
	clearLastTileLevels();
	eventEmitter.broadcast({ type: 'monkeyTilesClear' });
	eventEmitter.broadcast({ type: 'monkeyTileWinPulseClear' });
	eventEmitter.broadcast({ type: 'monkeyMechanicsReset', instant: true });
};

const resetMultiplierUi = () => {
	eventEmitter.broadcast({ type: 'globalMultiplierHide' });
	eventEmitter.broadcast({ type: 'multiplierGridHide' });
	eventEmitter.broadcast({ type: 'multiplierGridClear' });
	eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
};

const resetStaleModes = () => {
	resetActiveBetModeAfterBuyFeature();
	stateBonus.selectedBetModeKey = null;
};

const resetAudioAfterError = () => {
	eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
	eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
};

/** Clears board, tiles, progress bar, win overlays, FS UI, spin-skip guards, and win amount. */
export const resetGameplayPresentation = () => {
	resetGameModelState();
	resetBoardPresentation();

	resetWinOverlays();
	resetFreeSpinUi();
	resetTumbleUi();
	resetMonkeyMechanics();
	resetMultiplierUi();

	eventEmitter.broadcast({ type: 'boardShow' });

	resetSpinSkipAfterError();

	stateBet.winBookEventAmount = 0;
	resetBonusSessionWin();
};

/** Restore a clean base-game presentation after a failed bet fetch or book playback. */
export const resetGameplayAfterError = () => {
	resetGameplayPresentation();

	eventEmitter.broadcast({ type: 'stopButtonEnable' });

	resetStaleModes();
	stateBet.autoSpinsCounter = 0;

	resetAudioAfterError();
	void eventEmitter.broadcastAsync({ type: 'uiShow' });

	unlockGameplayInput();
};

const toErrorModalPayload = (error: unknown) => {
	if (error instanceof Error) {
		return { error: error.name, message: error.message };
	}
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return error as { error?: string; message: string };
	}
	return { error: 'BookPlaybackError', message: 'Round playback failed.' };
};

/** Full reset after a book event handler throws — surfaces the error modal. */
export const resetGameplayAfterBookError = (error: unknown) => {
	resetGameplayAfterError();
	stateModal.modal = { name: 'error', error: toErrorModalPayload(error) };
	if (import.meta.env.DEV) console.error(error);
};
