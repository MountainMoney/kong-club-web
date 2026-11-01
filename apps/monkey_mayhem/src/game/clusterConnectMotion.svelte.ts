import { uniqueSymbolPositions } from './boardPositions';
import { CLUSTER_CONNECT_MOTION_MS } from './clusterConnectionTempo';
import type { Position } from './types';
import { scaleFeatureMs } from './winPresentationTempo';

export type ClusterConnectBeat = {
	startedAt: number;
	duration: number;
};

export const stateClusterConnectMotion = $state<{
	byKey: Record<string, ClusterConnectBeat>;
	epoch: number;
}>({
	byKey: {},
	epoch: 0,
});

export const clusterConnectCellKey = (reel: number, row: number) => `${reel}:${row}`;

/** `positions` are tile rows 0–4 (same as ReelSymbol `symbolIndexOfBoard`). */
export const startClusterConnectMotion = (
	positions: Position[],
	opts?: { snap?: boolean },
) => {
	const snap = opts?.snap === true;
	const duration = snap ? 0 : scaleFeatureMs(CLUSTER_CONNECT_MOTION_MS, 40);
	const startedAt = performance.now();
	const next = { ...stateClusterConnectMotion.byKey };
	for (const position of uniqueSymbolPositions(positions)) {
		if (position.reel < 0 || position.row < 0) continue;
		next[clusterConnectCellKey(position.reel, position.row)] = {
			startedAt,
			duration,
		};
	}
	stateClusterConnectMotion.byKey = next;
	stateClusterConnectMotion.epoch += 1;
};

export const clearClusterConnectMotion = () => {
	if (Object.keys(stateClusterConnectMotion.byKey).length === 0) return;
	stateClusterConnectMotion.byKey = {};
	stateClusterConnectMotion.epoch += 1;
};
