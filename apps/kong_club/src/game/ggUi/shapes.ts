import { Color, FillGradient, type ColorSource, type Graphics } from 'pixi.js';

export type RoundRect = { x: number; y: number; width: number; height: number; radius: number };

export const roundRectBand = (
	graphics: Graphics,
	{ x, y, width: w, height: h, radius: r }: RoundRect,
	d: number,
	side: 'below' | 'above',
) => {
	if (d <= 0) return graphics;
	const { PI } = Math;
	if (side === 'below') {
		return graphics
			.moveTo(x, y + h - r)
			.lineTo(x, y + d + h - r)
			.arc(x + r, y + d + h - r, r, PI, PI / 2, true)
			.lineTo(x + w - r, y + d + h)
			.arc(x + w - r, y + d + h - r, r, PI / 2, 0, true)
			.lineTo(x + w, y + h - r)
			.arc(x + w - r, y + h - r, r, 0, PI / 2)
			.lineTo(x + r, y + h)
			.arc(x + r, y + h - r, r, PI / 2, PI)
			.closePath();
	}
	return graphics
		.moveTo(x, y + d + r)
		.lineTo(x, y + r)
		.arc(x + r, y + r, r, PI, PI * 1.5)
		.lineTo(x + w - r, y)
		.arc(x + w - r, y + r, r, PI * 1.5, PI * 2)
		.lineTo(x + w, y + d + r)
		.arc(x + w - r, y + d + r, r, 0, -PI / 2, true)
		.lineTo(x + r, y + d)
		.arc(x + r, y + d + r, r, -PI / 2, -PI, true)
		.closePath();
};

export const verticalGradient = (top: ColorSource, bottom: ColorSource) =>
	new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: [
			{ offset: 0, color: top },
			{ offset: 1, color: bottom },
		],
	});

/** One colour fading down a shape, as Figma's gradient strokes do. */
export const alphaGradient = (
	color: ColorSource,
	{ top, bottom }: { top: number; bottom: number },
) =>
	verticalGradient(
		new Color(color).setAlpha(top).toRgbaString(),
		new Color(color).setAlpha(bottom).toRgbaString(),
	);
