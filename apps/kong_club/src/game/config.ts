import { buildClusterPaytable, SMALL_CLUSTER_TIERS } from './clusterPaytable';

export default {
	providerName: 'Trifecta',
	gameName: 'Kong Club',
	gameID: 'kong-club',
	rtp: 0.963,
	numReels: 6,
	numRows: [5, 5, 5, 5, 5, 5],
	/**
	 * Costs are bet multipliers. Math is re-solving several of these to 96.3%.
	 * Until a publish file overrides them (`/__math/costs`), the UI reads these.
	 * Hunt stops are the slider prices (2× / 3× / 4× / 5×).
	 * `bonus_risky` keeps the last published price of the dead-spin mix (was Mystery).
	 * Guaranteed Mystery still uses that published 380× until math ships a new cost.
	 */
	betModes: {
		base: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		base_ante: { cost: 1.4, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		hunt_2: { cost: 2.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		hunt_3: { cost: 3.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		hunt_4: { cost: 4.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		hunt_5: { cost: 5.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		feature_spin: { cost: 65.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		peak_spin: { cost: 1400.0, feature: true, buyBonus: false, rtp: 0.963, max_win: 25000.0 },
		bonus_see: { cost: 115.0, feature: true, buyBonus: true, rtp: 0.963, max_win: 25000.0 },
		bonus_hear: { cost: 250.0, feature: true, buyBonus: true, rtp: 0.963, max_win: 25000.0 },
		bonus_mystery: { cost: 380.0, feature: true, buyBonus: true, rtp: 0.963, max_win: 25000.0 },
		bonus_risky: { cost: 380.0, feature: true, buyBonus: true, rtp: 0.963, max_win: 25000.0 },
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
