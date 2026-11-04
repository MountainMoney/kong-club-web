/**
 * Speak No Evil was Monkey Madness / Mayhem. Books and mode-state strings
 * may use either name. Both play the hidden bonus tier.
 */
export const isSpeakBonusState = (state: string | undefined) => {
	if (!state) return false;
	const normalized = state.toLowerCase();
	return normalized.includes('madness') || normalized.includes('speak') || normalized.includes('mayhem');
};

/** Mid-bonus rank upgrade (See → Hear, Hear → Speak). Spins come from the book. */
export const isBonusUpgradeState = (state: string | undefined) => {
	if (!state) return false;
	return /upgrade|promote/.test(state.toLowerCase());
};
