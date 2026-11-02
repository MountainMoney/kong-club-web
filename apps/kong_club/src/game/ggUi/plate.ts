import type { Graphics } from 'pixi.js';

import { PLATE } from './constants';
import { alphaGradient, roundRectBand, verticalGradient } from './shapes';

const face = verticalGradient(PLATE.top, PLATE.bottom);
const stroke = alphaGradient(0xffffff, PLATE.borderAlpha);

/** The dark bordered plate with a black outline and lip, its top-left at 0,0. */
export const drawPlate = (
	graphics: Graphics,
	width: number,
	height: number,
	radius: number,
	border: number = PLATE.border,
) => {
	const { outline, lip, edge } = PLATE;
	graphics
		.roundRect(
			-outline,
			-outline,
			width + outline * 2,
			height + outline * 2 + lip,
			radius + outline,
		)
		.fill(0x000000);
	roundRectBand(graphics, { x: 0, y: 0, width, height, radius }, edge.offset, 'below').fill(
		edge.color,
	);
	return graphics
		.roundRect(border / 2, border / 2, width - border, height - border, radius - border / 2)
		.fill(face)
		.stroke({ width: border, fill: stroke });
};
