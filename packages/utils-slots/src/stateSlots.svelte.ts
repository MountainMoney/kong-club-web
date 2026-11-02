export const stateSlots = $state({
	isPreSpinning: false,
	/** performance.now() when the current preSpin fall-out wave started. */
	fallOutStartedAt: 0,
});
