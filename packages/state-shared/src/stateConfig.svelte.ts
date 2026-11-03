export const stateConfig = $state({
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
	betAmountOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
	betMenuOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
	/** Display units from authenticate. Undefined until auth returns them. */
	minBet: undefined as number | undefined,
	maxBet: undefined as number | undefined,
	stepBet: undefined as number | undefined,
	defaultBetLevel: undefined as number | undefined,
});
