/** Hunt Spins slider stops. The cost of each stop is `config.betModes[hunt_N].cost`. */
export const HUNT_LEVELS = [2, 3, 4, 5] as const;

export type HuntLevel = (typeof HUNT_LEVELS)[number];

export const stateHunt = $state({ level: 2 as HuntLevel });

/** Bumped when `/__math/costs` replaces config prices so the buy menu redraws. */
export const statePublishedCosts = $state({ revision: 0 });

export const isHuntLevel = (level: number): level is HuntLevel =>
	(HUNT_LEVELS as readonly number[]).includes(level);

export const huntModeKeyFor = (level: HuntLevel) => `hunt_${level}` as const;

export const huntLevelFromModeKey = (key: string): HuntLevel | null => {
	const match = /^hunt_(\d+)$/.exec(key);
	if (!match) return null;
	const level = Number(match[1]);
	return isHuntLevel(level) ? level : null;
};

/**
 * Locked Hunt price grid (spec 2026-11-04): stop Nx costs N x bet and multiplies the
 * base game's See / Hear / Speak No Evil trigger odds by these factors. Math reads the
 * same grid (game_criteria.HUNT_LEVELS).
 */
export const HUNT_BONUS_CHANCE_MULTIPLIER: Record<HuntLevel, { see: number; hear: number; speak: number }> = {
	2: { see: 3, hear: 5, speak: 10 },
	3: { see: 5, hear: 6, speak: 10 },
	4: { see: 7, hear: 10, speak: 18 },
	5: { see: 8.5, hear: 15, speak: 30 },
};

export const huntOddsLine = (level: HuntLevel) => {
	const boost = HUNT_BONUS_CHANCE_MULTIPLIER[level];
	return `Hunt Spins ${level}: Increases the chances of triggering See No Evil by ${boost.see}×, Hear No Evil by ${boost.hear}× and Speak No Evil by ${boost.speak}×.`;
};
