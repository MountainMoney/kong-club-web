/** Exact Jul 2 Le Bandit cluster paytable — 7 size bands × total bet (scale 1.0). */

export type LeBanditPayRow = [
	number, // 5
	number, // 6
	number, // 7
	number, // 8
	number, // 9–10
	number, // 11–12
	number, // 13+
];

export type SmallClusterPayTierValues = LeBanditPayRow;
export type ClusterPayTierValues = LeBanditPayRow;

const MIN_CLUSTER = 5;
const MAX_CLUSTER = 30;

/** Map cluster size → paytable band index 0..6. */
export const paytableBandIndex = (size: number): number => {
	if (size <= 5) return 0;
	if (size === 6) return 1;
	if (size === 7) return 2;
	if (size === 8) return 3;
	if (size <= 10) return 4;
	if (size <= 12) return 5;
	return 6;
};

export const payAtSmallClusterSize = (tiers: LeBanditPayRow, size: number): number =>
	tiers[paytableBandIndex(size)] ?? 0;

export const buildSmallClusterPaytable = (tiers: LeBanditPayRow) => {
	const paytable: Array<Record<string, number>> = [];
	for (let size = MIN_CLUSTER; size <= MAX_CLUSTER; size++) {
		paytable.push({ [String(size)]: payAtSmallClusterSize(tiers, size) });
	}
	return paytable;
};

export const buildClusterPaytable = buildSmallClusterPaytable;

/** Exact Jul 2 Le Bandit cluster paytable — 7 size bands × total bet (scale 1.0). */
export const LE_BANDIT_CLUSTER_TIERS = {
	royals: [0.1, 0.2, 0.3, 0.5, 1.5, 5.0, 15.0] as LeBanditPayRow,
	mid: [0.3, 0.4, 0.5, 0.7, 2.5, 7.5, 25.0] as LeBanditPayRow,
	high: [0.5, 0.7, 1.0, 1.5, 5.0, 15.0, 50.0] as LeBanditPayRow,
	top: [1.0, 1.5, 2.0, 3.0, 10.0, 30.0, 100.0] as LeBanditPayRow,
} as const;

/** Alias used by paytable UI. */
export const SMALL_CLUSTER_TIERS = LE_BANDIT_CLUSTER_TIERS;

export const clusterPayAtSize = (tiers: LeBanditPayRow, size: number | string) =>
	payAtSmallClusterSize(tiers, Number(size));
