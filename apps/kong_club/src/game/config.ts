import { buildClusterPaytable, SMALL_CLUSTER_TIERS } from './clusterPaytable';
import { mathModes, mathProfile } from './mathProfile';

const betModes = Object.fromEntries(
	mathModes.map((mode) => [
		mode.id,
		{
			cost: mode.cost,
			feature: mode.feature,
			buyBonus: mode.buyBonus,
			rtp: mode.rtp,
			max_win: mode.maxWin,
		},
	]),
);

export default {
	providerName: 'Trifecta',
	gameName: 'Kong Club',
	gameID: 'kong-club',
	rtp: mathProfile.rtp,
	numReels: 6,
	numRows: [5, 5, 5, 5, 5, 5],
	betModes,
	symbols: {
		MW: { paytable: null, special_properties: ['wild'] },
		ST: { paytable: null, special_properties: ['scatter'] },
		CB: { paytable: null, special_properties: ['coin'] },
		CS: { paytable: null, special_properties: ['coin'] },
		CG: { paytable: null, special_properties: ['coin'] },
		BA: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.top) },
		GR: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.high) },
		OR: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.high) },
		CO: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.mid) },
		LE: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.mid) },
		A: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.royals) },
		K: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.royals) },
		Q: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.royals) },
		J: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.royals) },
		T: { paytable: buildClusterPaytable(SMALL_CLUSTER_TIERS.royals) },
	},
	paddingReels: {
		basegame: '',
		freegame: '',
	},
	/** Cluster game — no paylines; empty map satisfies FF win presenter types. */
	paylines: {} as Record<string, number[]>,
};
