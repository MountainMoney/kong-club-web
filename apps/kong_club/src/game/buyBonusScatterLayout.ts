import {
	BUY_BONUS_CLUSTER_MAX_W,
	BUY_BONUS_HERO_TROPHY_RATIO,
	BUY_BONUS_IMAGE_H,
} from './buyBonusScreenLayout';

/** Horizontal overlap between stacked toucans (reference fan). */
const OVERLAP_RATIO = 0.38;

/** Match hero cards — clusters fill ~98% of the image band. */
const CLUSTER_TARGET_W = Math.round(BUY_BONUS_CLUSTER_MAX_W * 0.98);
const CLUSTER_TARGET_H = Math.round(BUY_BONUS_IMAGE_H * BUY_BONUS_HERO_TROPHY_RATIO * 0.98);
/** ST art has transparent padding — render slightly larger in UI. */
const TROPHY_VISUAL_BOOST = 1.08;

export type ScatterClusterSlot = {
	x: number;
	y: number;
	zIndex: number;
};

export type ScatterClusterLayout = {
	trophySize: number;
	clusterWidth: number;
	clusterHeight: number;
	slots: ScatterClusterSlot[];
};

function rowTrophySize(count: number, maxWidth: number) {
	const divisor = count - OVERLAP_RATIO * (count - 1);
	return Math.floor(maxWidth / divisor);
}

const scaleLayout = (layout: ScatterClusterLayout): ScatterClusterLayout => {
	const scale = Math.min(
		CLUSTER_TARGET_W / layout.clusterWidth,
		CLUSTER_TARGET_H / layout.clusterHeight,
	);
	const scaled =
		scale <= 1.005
			? layout
			: {
					trophySize: Math.round(layout.trophySize * scale),
					clusterWidth: Math.round(layout.clusterWidth * scale),
					clusterHeight: Math.round(layout.clusterHeight * scale),
					slots: layout.slots.map((slot) => ({
						x: Math.round(slot.x * scale),
						y: Math.round(slot.y * scale),
						zIndex: slot.zIndex,
					})),
				};
	return {
		...scaled,
		trophySize: Math.round(scaled.trophySize * TROPHY_VISUAL_BOOST),
	};
};

/** See / Hear / Gamble — one overlapping row, later birds on top. */
const layoutOverlappingRow = (count: 3 | 4 | 5): ScatterClusterLayout => {
	const trophySize = rowTrophySize(count, BUY_BONUS_CLUSTER_MAX_W);
	const overlap = Math.round(trophySize * OVERLAP_RATIO);
	const step = trophySize - overlap;
	const clusterWidth = trophySize + step * (count - 1);
	const clusterHeight = trophySize;
	return scaleLayout({
		trophySize,
		clusterWidth,
		clusterHeight,
		slots: Array.from({ length: count }, (_, i) => ({
			x: step * i,
			y: 0,
			zIndex: i + 1,
		})),
	});
};

export const buyBonusScatterLayout = (count: 3 | 4 | 5): ScatterClusterLayout =>
	layoutOverlappingRow(count);

/** Feature Spin — sack on top, red MULTI eyes bottom-left, gold coin bottom-right. */
export const FEATURE_COIN_KEYS = ['symbol_CL', 'symbol_XM_red', 'symbol_CG'] as const;

export const buyBonusCoinTriangleLayout = (): ScatterClusterLayout => {
	const trophySize = Math.round(CLUSTER_TARGET_H / 2.05);
	const gapX = Math.round(trophySize * 0.1);
	const gapY = Math.round(trophySize * 0.06);
	const clusterWidth = trophySize * 2 + gapX;
	const clusterHeight = trophySize * 2 + gapY;
	const bottomY = trophySize + gapY;
	const topX = Math.round((clusterWidth - trophySize) / 2);
	return {
		trophySize,
		clusterWidth,
		clusterHeight,
		slots: [
			{ x: topX, y: 0, zIndex: 3 },
			{ x: 0, y: bottomY, zIndex: 1 },
			{ x: trophySize + gapX, y: bottomY, zIndex: 2 },
		],
	};
};

export type ScatterClusterPixiSlot = {
	x: number;
	y: number;
	zIndex: number;
};

export type ScatterClusterPixiOptions = {
	/** Expand slot spacing from cluster center (1 = buy-card default). */
	spread?: number;
};

/** Scale a scatter cluster to fit a box — Pixi anchor 0.5 center positions. */
export const scatterClusterPixiLayout = (
	count: 3 | 4 | 5,
	boxW: number,
	boxH: number,
	centerX = 0,
	centerY = 0,
	options: ScatterClusterPixiOptions = {},
) => {
	const spread = options.spread ?? 1;
	const layout = buyBonusScatterLayout(count);
	const scale = Math.min(boxW / layout.clusterWidth, boxH / layout.clusterHeight);
	const trophySize = layout.trophySize * scale;
	const clusterCx = layout.clusterWidth / 2;
	const clusterCy = layout.clusterHeight / 2;
	const slots: ScatterClusterPixiSlot[] = layout.slots.map((slot) => {
		const localCx = slot.x + layout.trophySize / 2;
		const localCy = slot.y + layout.trophySize / 2;
		return {
			x: Math.round(centerX + (localCx - clusterCx) * spread * scale),
			y: Math.round(centerY + (localCy - clusterCy) * spread * scale),
			zIndex: slot.zIndex,
		};
	});
	return { trophySize, slots };
};
