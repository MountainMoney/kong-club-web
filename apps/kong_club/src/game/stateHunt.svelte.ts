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
 * Bonus-entry weight versus the base game, from the vendored math-publish
 * lookup tables (freegame criteria ÷ base freegame criteria):
 * hunt_2 9% / 0.2% = 45×, hunt_3 13% = 65×, hunt_4 18% = 90×, hunt_5 45% = 225×.
 * Those entries are tagged See No Evil. Hear and Speak have no weight in the hunt books.
 */
export const HUNT_BONUS_CHANCE_MULTIPLIER: Record<HuntLevel, number> = {
	2: 45,
	3: 65,
	4: 90,
	5: 225,
};

export const huntOddsLine = (level: HuntLevel) =>
	`Hunt Spins ${level}: Increases the chances of triggering See No Evil by ${HUNT_BONUS_CHANCE_MULTIPLIER[level]}×.`;
