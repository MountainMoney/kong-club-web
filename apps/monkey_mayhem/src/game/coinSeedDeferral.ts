import type { BookEventOfType } from './typesBookEvent';

type CoinSeedEvent = BookEventOfType<'coinSeed'>;
type ProgressFillEvent = BookEventOfType<'progressFill'>;

let deferredCoinSeedEvents: CoinSeedEvent[] = [];
let progressBarFull = false;

export const clearDeferredCoinSeeds = () => {
	deferredCoinSeedEvents = [];
	progressBarFull = false;
};

export const handleProgressFill = (bookEvent: ProgressFillEvent) => {
	progressBarFull = bookEvent.value >= bookEvent.threshold;
};

/** Coin seed visuals come from updateLevelUpTiles on land; defer only bookkeeping until activation. */
export const applyDeferredCoinSeeds = (force = false) => {
	if (!force && !progressBarFull) return;
	deferredCoinSeedEvents = [];
};

/** Queue coinSeed book events until boardActivation — tile tiers render via updateLevelUpTiles. */
export const handleCoinSeedEvent = (bookEvent: CoinSeedEvent) => {
	if (bookEvent.seeds.length === 0) return;
	deferredCoinSeedEvents.push(bookEvent);
};
