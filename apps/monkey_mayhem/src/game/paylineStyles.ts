import { SYMBOL_SIZE } from './constants';

/** Lab A/B presets — production stays `gold_stroke`. */
export type PaylineStyleId =
	| 'gold_stroke'
	| 'neon_pulse'
	| 'classic_outline'
	| 'ribbon'
	| 'dashed'
	| 'dot_trail'
	| 'cell_boxes';

export type PaylineStyleMeta = {
	id: PaylineStyleId;
	label: string;
	/** Short reference slot / studio vibe. */
	reference: string;
};

export const PAYLINE_STYLE_OPTIONS: PaylineStyleMeta[] = [
	{ id: 'gold_stroke', label: 'Gold stroke +', reference: 'Shipped · bloom + rim + glint' },
	{ id: 'neon_pulse', label: 'Neon glow', reference: 'Hacksaw · Le Bandit electric' },
	{ id: 'classic_outline', label: 'Classic outline', reference: 'Book of Dead · white + rim' },
	{ id: 'ribbon', label: 'Soft ribbon', reference: 'Pragmatic · fat translucent band' },
	{ id: 'dashed', label: 'Dashed crawl', reference: 'Retro · segmented draw' },
	{ id: 'dot_trail', label: 'Dot trail', reference: 'Sweet Bonanza · bead path' },
	{ id: 'cell_boxes', label: 'Cell boxes', reference: 'Modern · no connector' },
];

const GOLD = 0xffd700;
const WHITE = 0xffffff;
const INK = 0x120818;

type Point = { x: number; y: number };

/** Points along the path revealed by crawl / draw progress (0–1). */
export const paylinePathSlice = (points: Point[], progress: number): Point[] => {
	if (points.length < 2) return points;
	const segments = points.length - 1;
	const drawLen = Math.max(0, Math.min(segments, progress * segments));
	const fullSegments = Math.floor(drawLen);
	const partial = drawLen - fullSegments;
	const out = points.slice(0, fullSegments + 1);
	if (fullSegments < segments && partial > 0) {
		const a = points[fullSegments];
		const b = points[fullSegments + 1];
		out.push({
			x: a.x + (b.x - a.x) * partial,
			y: a.y + (b.y - a.y) * partial,
		});
	}
	return out;
};

const strokePolyline = (
	g: import('pixi.js').Graphics,
	points: Point[],
	width: number,
	color: number,
	alpha: number,
) => {
	if (points.length < 2) return;
	g.setStrokeStyle({ width, color, alpha, cap: 'round', join: 'round' });
	g.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) {
		g.lineTo(points[i].x, points[i].y);
	}
	g.stroke();
};

/** Production payline — gold vector with soft bloom, dark rim, bright core. */
const drawGoldStroke = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	strokePolyline(g, points, 10, GOLD, alpha * 0.22);
	strokePolyline(g, points, 6, INK, alpha * 0.38);
	strokePolyline(g, points, 4, GOLD, alpha);
	strokePolyline(g, points, 1.5, WHITE, alpha * 0.42);
	for (const p of points) {
		g.circle(p.x, p.y, 3.5);
		g.fill({ color: GOLD, alpha: alpha * 0.55 });
		g.circle(p.x, p.y, 1.8);
		g.fill({ color: WHITE, alpha: alpha * 0.7 });
	}
};

const drawNeonPulse = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	strokePolyline(g, points, 14, GOLD, alpha * 0.22);
	strokePolyline(g, points, 8, GOLD, alpha * 0.45);
	strokePolyline(g, points, 3, WHITE, alpha * 0.95);
};

const drawClassicOutline = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	strokePolyline(g, points, 7, INK, alpha * 0.92);
	strokePolyline(g, points, 3, WHITE, alpha * 0.98);
};

const drawRibbon = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	strokePolyline(g, points, 16, GOLD, alpha * 0.28);
	strokePolyline(g, points, 2, GOLD, alpha * 0.92);
};

const drawDashed = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	if (points.length < 2) return;
	const dash = 14;
	const gap = 10;
	let travelled = 0;
	let draw = true;
	let remain = dash;

	for (let i = 0; i < points.length - 1; i++) {
		const a = points[i];
		const b = points[i + 1];
		const segLen = Math.hypot(b.x - a.x, b.y - a.y);
		let t = 0;
		let cx = a.x;
		let cy = a.y;

		while (t < segLen) {
			const step = Math.min(remain, segLen - t);
			const nx = a.x + ((b.x - a.x) * (t + step)) / segLen;
			const ny = a.y + ((b.y - a.y) * (t + step)) / segLen;
			if (draw) {
				g.setStrokeStyle({ width: 4, color: GOLD, alpha, cap: 'round' });
				g.moveTo(cx, cy);
				g.lineTo(nx, ny);
				g.stroke();
			}
			cx = nx;
			cy = ny;
			t += step;
			remain -= step;
			if (remain <= 0) {
				draw = !draw;
				remain = draw ? dash : gap;
			}
		}
	}
};

const drawDotTrail = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	const r = 5;
	for (const p of points) {
		g.circle(p.x, p.y, r);
		g.fill({ color: GOLD, alpha: alpha * 0.35 });
		g.circle(p.x, p.y, r * 0.55);
		g.fill({ color: WHITE, alpha: alpha * 0.95 });
	}
	if (points.length >= 2) {
		strokePolyline(g, points, 2, GOLD, alpha * 0.55);
	}
};

const drawCellBoxes = (g: import('pixi.js').Graphics, points: Point[], alpha: number) => {
	const pad = SYMBOL_SIZE * 0.08;
	const w = SYMBOL_SIZE - pad * 2;
	const h = SYMBOL_SIZE - pad * 2;
	for (const p of points) {
		g.roundRect(p.x - w / 2, p.y - h / 2, w, h, 10);
		g.fill({ color: GOLD, alpha: alpha * 0.14 });
		g.stroke({ color: GOLD, width: 3, alpha: alpha * 0.92 });
	}
};

export const drawPaylineStyle = (
	g: import('pixi.js').Graphics,
	style: PaylineStyleId,
	points: Point[],
	alpha: number,
	progress: number,
) => {
	const slice = paylinePathSlice(points, progress);
	if (!slice.length) return;

	switch (style) {
		case 'neon_pulse':
			drawNeonPulse(g, slice, alpha);
			break;
		case 'classic_outline':
			drawClassicOutline(g, slice, alpha);
			break;
		case 'ribbon':
			drawRibbon(g, slice, alpha);
			break;
		case 'dashed':
			drawDashed(g, slice, alpha);
			break;
		case 'dot_trail':
			drawDotTrail(g, slice, alpha);
			break;
		case 'cell_boxes':
			drawCellBoxes(g, slice.length ? slice : points, alpha);
			break;
		default:
			drawGoldStroke(g, slice, alpha);
	}
};
