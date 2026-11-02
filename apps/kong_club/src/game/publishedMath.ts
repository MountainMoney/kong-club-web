/**
 * Player-facing cost, RTP, and max win from kong-club-math `GameConfig` BetModes
 * (`self.rtp` 0.965, `self.wincap` 25000, and each mode's cost). Those are the
 * fields the Stake packager writes into index.json.
 *
 * The LUT archive in that repo is the older pre-96.50% build, so it is not used
 * here. Frontend `config.ts` is not the source for these figures.
 */
export const PUBLISHED_RTP = 0.965;
export const PUBLISHED_MAX_WIN_X = 25_000;

export const PUBLISHED_MODE_COST = {
	base: 1,
	base_ante: 1.4,
	feature_spin: 65,
	peak_spin: 1400,
	bonus_see: 115,
	bonus_hear: 250,
	bonus_pick: 380,
} as const;

export type PublishedModeKey = keyof typeof PUBLISHED_MODE_COST;

export const PUBLISHED_RTP_PCT = (PUBLISHED_RTP * 100).toFixed(2);
export const PUBLISHED_MAX_WIN_LABEL = PUBLISHED_MAX_WIN_X.toLocaleString('en-US');

export const formatPublishedCost = (cost: number) =>
	cost >= 1000 ? cost.toLocaleString('en-US') : String(cost);
