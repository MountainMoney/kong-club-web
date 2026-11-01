import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventBoardFrame } from '../components/BoardFrame.svelte';
import type { EmitterEventClusterWinAmounts } from '../components/ClusterWinAmounts.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventTumbleWinAmount } from '../components/TumbleWinAmount.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/MonkeyFreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventMultiplierGrid } from '../components/MultiplierGrid.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';
import type { EmitterEventKongClub } from '../components/KongClubMechanics.svelte';
import type { EmitterEventTileLevelGrid } from '../components/TileLevelGrid.svelte';
import type { EmitterEventPaylineWin } from '../components/PaylineWinHighlight.svelte';
import type { EmitterEventBlackScreen } from '../components/BlackScreenFade.svelte';

export type EmitterEventSpinSkip =
	| { type: 'winSkip' }
	| { type: 'spinSkipPressToContinue' };

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventBoardFrame
	| EmitterEventClusterWinAmounts
	| EmitterEventTumbleBoard
	| EmitterEventTumbleWinAmount
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventMultiplierGrid
	| EmitterEventTransition
	| EmitterEventKongClub
	| EmitterEventTileLevelGrid
	| EmitterEventPaylineWin
	| EmitterEventBlackScreen
	| EmitterEventSpinSkip;
