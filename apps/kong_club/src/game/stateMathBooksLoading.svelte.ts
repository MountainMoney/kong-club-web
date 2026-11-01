export const BUY_BONUS_PREFETCH_MODES = [
	'feature_spin',
	'peak_spin',
	'bonus_see',
	'bonus_hear',
	'bonus_gamble',
] as const;

export const stateMathBooksLoading = $state({
	loadingModes: [] as string[],
});

export const startMathBooksLoading = (mode: string) => {
	if (!stateMathBooksLoading.loadingModes.includes(mode)) {
		stateMathBooksLoading.loadingModes = [...stateMathBooksLoading.loadingModes, mode];
	}
};

export const stopMathBooksLoading = (mode: string) => {
	stateMathBooksLoading.loadingModes = stateMathBooksLoading.loadingModes.filter((m) => m !== mode);
};

export const isMathBooksLoading = (mode: string) =>
	stateMathBooksLoading.loadingModes.includes(mode);

export const isAnyBuyBonusMathLoading = () =>
	BUY_BONUS_PREFETCH_MODES.some((mode) => isMathBooksLoading(mode));
