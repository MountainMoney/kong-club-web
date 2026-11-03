import { stateBet } from 'state-shared';

import { scaledBaseCoinFaces } from './coinFacePools';
import { stateGame } from './stateGame.svelte';

/** True only for base and Extra Chance while this spin is not a free spin. */
export const usesScaledBaseCoinFaces = (): boolean =>
	scaledBaseCoinFaces(stateBet.activeBetModeKey, stateGame.gameType);
