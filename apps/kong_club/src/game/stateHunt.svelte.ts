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
