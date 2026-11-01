import _ from 'lodash';

import { stateBet } from 'state-shared';
import { checkIsMultipleRevealEvents } from 'utils-book';
import { createPrimaryMachines, createIntermediateMachines, createGameActor } from 'utils-xstate';

import type { Bet } from './typesBookEvent';
import { isReplayUrl } from './replayMode.svelte';
import { stateXstateDerived } from './stateXstate';
import { resetGameplayAfterError } from './gameplayErrorReset';
import { normalizeResumeBetState, shouldSkipActorPreSpin } from './betModes';
import { playBet, convertTorResumableBet } from './utils';
import { stateGameDerived } from './stateGame.svelte';
import { resetBaseSpinVisualsOnClick } from './baseSpinStartReset';

const primaryMachines = createPrimaryMachines<Bet>({
	onResumeGameActive: (betToResume) => {
		normalizeResumeBetState();
		return isReplayUrl() ? betToResume : convertTorResumableBet(betToResume);
	},
	onResumeGameInactive: (betToResume) => {
		normalizeResumeBetState();
		if (isReplayUrl()) return;
		const lastRevealEvent = _.findLast(
			betToResume.state,
			(bookEvent) => bookEvent?.type === 'reveal',
		);

		if (lastRevealEvent) stateGameDerived.enhancedBoard.settle(lastRevealEvent.board);
	},
	onNewGameStart: async () => {
		resetBaseSpinVisualsOnClick();
		if ((stateBet.isTurbo && stateXstateDerived.isAutoBetting()) || stateBet.isSpaceHold) return;
		if (shouldSkipActorPreSpin()) return;
		stateBet.winBookEventAmount = 0;
		void stateGameDerived.enhancedBoard.preSpin({});
	},
	onNewGameError: () => resetGameplayAfterError(),
	onEndRoundError: () => resetGameplayAfterError(),
	onPlayGame: async (bet) => {
		await playBet(bet);
	},
	checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state }),
});

const intermediateMachines = createIntermediateMachines(primaryMachines);

export const gameActor = createGameActor(intermediateMachines);
