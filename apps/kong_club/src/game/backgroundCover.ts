/**
 * One uniform cover for every jungle background layer.
 *
 * Plates are 16:9. Scale is `max(canvas / plate)` and the rect is centered, so
 * the art is cropped and never stretched. Day, sunny, and midnight sprites
 * share this rect. Tree and bush spines use the same scale (not a second
 * sx/sy) so they stay registered to the plate.
 *
 * PR #14 (`cursor/bonus-animated-backgrounds-c564`) mounts sunny/midnight
 * tree and bush spines with the same `treeLayout` / `bushLayout` markers.
 * Those spines should spread `spineOnPlate` from this module. On merge, keep
 * PR #14's bonus spine keys and this file's cover math.
 */

export const JUNGLE_PLATE = { w: 1920, h: 1080 } as const;

/** `jungle_bg_super.png` is 1376×768, not 16:9. Cover it on its own pixels. */
export const JUNGLE_SUPER_PLATE = { w: 1376, h: 768 } as const;

/**
 * Slot `树` attachment center on bone `all` (origin). The region is the
 * 1920×1080 foreground plate, the same pixels as `jungle_bg_layer3.png`.
 */
export const TREE_PLATE_MARKER = { x: 106.378, y: 372.2437 } as const;

/** Slot `灌木` attachment center. */
export const BUSH_PLATE_MARKER = { x: 0, y: 552.8258 } as const;

/**
 * Extra plate pixels. Scale stays the cover scale — this only slides the spine.
 * Positive x moves the spine left. Positive y moves it down (spine +Y is up).
 * Measured registration on a uniform 16:9 plate is already the static tree.
 */
export const TREE_PLATE_NUDGE = { x: 0, y: 0 } as const;
export const BUSH_PLATE_NUDGE = { x: 0, y: 0 } as const;

export type CoverRect = {
	x: number;
	y: number;
	width: number;
	height: number;
	anchor: 0.5;
	/** Plate pixels → canvas pixels. One number for x and y. */
	scale: number;
};

export const coverPlate = (
	canvasW: number,
	canvasH: number,
	plateW: number,
	plateH: number,
): CoverRect => {
	const scale = Math.max(canvasW / plateW, canvasH / plateH);
	return {
		x: canvasW / 2,
		y: canvasH / 2,
		width: plateW * scale,
		height: plateH * scale,
		anchor: 0.5,
		scale,
	};
};

export const jungleCover = (canvasW: number, canvasH: number): CoverRect =>
	coverPlate(canvasW, canvasH, JUNGLE_PLATE.w, JUNGLE_PLATE.h);

/**
 * Park a spine whose marker attachment is the jungle plate.
 * spine-pixi draws skeleton +Y up, so
 * `x = cover.x - marker.x * s`, `y = cover.y + marker.y * s`.
 */
export const spineOnPlate = (
	cover: CoverRect,
	marker: { x: number; y: number },
	nudge: { x: number; y: number } = { x: 0, y: 0 },
) => {
	const s = cover.scale;
	return {
		x: cover.x - (marker.x + nudge.x) * s,
		y: cover.y + (marker.y + nudge.y) * s,
		scale: s,
	};
};
