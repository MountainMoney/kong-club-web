import _ from 'lodash';

import { stateBet } from 'state-shared';
import { checkIsMultipleRevealEvents } from 'utils-book';
import { createIntermediateMachines, createGameActor } from 'utils-xstate';

import type { Bet } from './typesBookEvent';
import { stateXstateDerived } from './stateXstate';
import { normalizeResumeBetState, shouldSkipActorPreSpin } from './betModes';
import { playBet, convertTorResumableBet } from './utils';
import { stateGameDerived } from './stateGame.svelte';
import { createLocalPrimaryMachines } from './localPrimaryMachines';
import { resetBaseSpinVisualsOnClick } from './baseSpinStartReset';

const primaryMachines = createLocalPrimaryMachines<Bet>({
	onResumeGameActive: (betToResume) => {
		normalizeResumeBetState();
		return convertTorResumableBet(betToResume);
	},
	onResumeGameInactive: (betToResume) => {
		normalizeResumeBetState();
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
	onPlayGame: async (bet) => {
		await playBet(bet);
	},
	checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state }),
});

const intermediateMachines = createIntermediateMachines(primaryMachines);

export const gameActor = createGameActor(intermediateMachines);
