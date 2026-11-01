/** Blocks spin / buy / speed input until the current wager fully resolves. */
export const stateGameplayLock = $state({
	locked: false,
	/** FS count reveal + intro — no click-to-skip in this window (scatter roll-in stays skippable). */
	blockSpinSkip: false,
});

export const isGameplayInputAllowed = () => !stateGameplayLock.locked;

/** Returns true when this wager may start (blocks duplicate spin + buy confirm). */
export const tryCommitWager = (): boolean => {
	if (stateGameplayLock.locked) return false;
	stateGameplayLock.locked = true;
	return true;
};

/** Clears wager lock only — does not end buy/FS intro presentation guard (use endFsIntroBlock). */
export const unlockGameplayInput = () => {
	stateGameplayLock.locked = false;
};

export const isFsIntroBlocked = () => stateGameplayLock.blockSpinSkip;

export const beginFsIntroBlock = () => {
	stateGameplayLock.blockSpinSkip = true;
};

export const endFsIntroBlock = () => {
	stateGameplayLock.blockSpinSkip = false;
};
