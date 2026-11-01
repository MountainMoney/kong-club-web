import type { BookEvent, BookEventOfType } from './typesBookEvent';

/** Feature Spin / bonus books can emit coins before leftover tumbleBoard — hold until cascade ends. */
let deferredFeatureActivation: BookEventOfType<'boardActivation'> | null = null;
let deferredFeatureTumbleWin: BookEventOfType<'updateTumbleWin'> | null = null;
let deferredFeatureProgressReset: BookEventOfType<'progressFill'> | null = null;
let deferredFeatureTileWipe: BookEventOfType<'updateLevelUpTiles'> | null = null;

export const clearDeferredFeatureActivation = () => {
	deferredFeatureActivation = null;
	deferredFeatureTumbleWin = null;
	deferredFeatureProgressReset = null;
	deferredFeatureTileWipe = null;
};

export const hasDeferredFeatureActivation = () => deferredFeatureActivation !== null;

export const peekDeferredFeatureActivation = () => deferredFeatureActivation;

export const deferFeatureActivation = (bookEvent: BookEventOfType<'boardActivation'>) => {
	deferredFeatureActivation = bookEvent;
};

export const deferFeatureTumbleWin = (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
	deferredFeatureTumbleWin = bookEvent;
};

export const deferFeatureProgressReset = (bookEvent: BookEventOfType<'progressFill'>) => {
	deferredFeatureProgressReset = bookEvent;
};

export const deferFeatureTileWipe = (bookEvent: BookEventOfType<'updateLevelUpTiles'>) => {
	deferredFeatureTileWipe = bookEvent;
};

export const isTileWipeEvent = (bookEvent: BookEventOfType<'updateLevelUpTiles'>) =>
	(bookEvent.tileLevels ?? []).every((reel) =>
		(reel ?? []).every((level) => (level ?? 0) <= 0),
	);

export const takeDeferredFeatureActivation = () => {
	const activation = deferredFeatureActivation;
	const tumbleWin = deferredFeatureTumbleWin;
	const progressReset = deferredFeatureProgressReset;
	const tileWipe = deferredFeatureTileWipe;
	clearDeferredFeatureActivation();
	return { activation, tumbleWin, progressReset, tileWipe };
};

export const hasLaterTumbleBoard = (bookEvents: BookEvent[], current: BookEvent) => {
	const index = bookEvents.indexOf(current);
	return index >= 0 && bookEvents.slice(index + 1).some((event) => event.type === 'tumbleBoard');
};
