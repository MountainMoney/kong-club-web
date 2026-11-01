import { buildClusterPaytable, SMALL_CLUSTER_TIERS } from './clusterPaytable';

export default {
	providerName: 'Trifecta',
	gameName: 'Monkey Mayhem',
	gameID: 'monkey-mayhem',
	rtp: 0.9601,
	numReels: 6,
	numRows: [5, 5, 5, 5, 5, 5],
	betModes: {
		base: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.9601, max_win: 25000.0 },
		base_ante: { cost: 1.4, feature: true, buyBonus: false, rtp: 0.9601, max_win: 25000.0 },
		feature_spin: { cost: 50.0, feature: true, buyBonus: false, rtp: 0.9601, max_win: 25000.0 },
		peak_spin: { cost: 1000.0, feature: true, buyBonus: false, rtp: 0.9601, max_win: 25000.0 },
		bonus_see: { cost: 100.0, feature: true, buyBonus: true, rtp: 0.9601, max_win: 25000.0 },
		bonus_hear: { cost: 200.0, feature: true, buyBonus: true, rtp: 0.9601, max_win: 25000.0 },
		bonus_gamble: { cost: 1567.0, feature: true, buyBonus: false, rtp: 0.9601, max_win: 25000.0 },
	},
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
