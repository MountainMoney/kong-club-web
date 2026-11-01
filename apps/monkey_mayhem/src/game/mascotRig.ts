export type MascotLayerKey =
	| 'mascot_17_tail'
	| 'mascot_16_tail_tip'
	| 'mascot_14_leg_left'
	| 'mascot_15_leg_right'
	| 'mascot_13_shoes'
	| 'mascot_12_bottom'
	| 'mascot_11_upper'
	| 'mascot_10_hair'
	| 'mascot_9_face'
	| 'mascot_8_bang'
	| 'mascot_5_eyeball_left'
	| 'mascot_7_eyeball_right'
	| 'mascot_4_pupil_left'
	| 'mascot_6_pupil_right'
	| 'mascot_2_eyebrow_left'
	| 'mascot_3_eyebrow_right'
	| 'mascot_1_mouth';

/** Back → front draw order. All layers share 1600×2000 native canvas, feet at bottom. */
export const MASCOT_LAYER_ORDER: MascotLayerKey[] = [
	'mascot_17_tail',
	'mascot_16_tail_tip',
	'mascot_14_leg_left',
	'mascot_15_leg_right',
	'mascot_13_shoes',
	'mascot_12_bottom',
	'mascot_11_upper',
	'mascot_10_hair',
	'mascot_9_face',
	'mascot_8_bang',
	'mascot_5_eyeball_left',
	'mascot_7_eyeball_right',
	'mascot_4_pupil_left',
	'mascot_6_pupil_right',
	'mascot_2_eyebrow_left',
	'mascot_3_eyebrow_right',
	'mascot_1_mouth',
];

export const MASCOT_NATIVE = { w: 1600, h: 2000 } as const;

/**
 * Visible character bounds inside each 1600×2000 layer (pixel-scanned from art pack).
 * Layout anchors the grass line to the bottom of this union, left edge to `left`.
 */
export const MASCOT_CONTENT = {
	left: 333,
	top: 64,
	w: 946,
	h: 1868,
	/** Pixels between painted feet and the PNG bottom edge. */
	feetInsetBottom: 69,
} as const;

export const MASCOT_CONTENT_ASPECT = MASCOT_CONTENT.w / MASCOT_CONTENT.h;

export type MascotLayerTransform = {
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	alpha: number;
};

export const defaultMascotLayerTransform = (): MascotLayerTransform => ({
	x: 0,
	y: 0,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	alpha: 1,
});
