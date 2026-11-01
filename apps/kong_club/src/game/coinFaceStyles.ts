import { Texture } from 'pixi.js';

import { PRIZE_NUMBER_WEIGHT } from './prizeNumberFont';

/** Lab A/B presets for coin face numbers. Production stays `hard_down`. */

export type CoinFaceStyleId = 'hard_down' | 'tight_down' | 'soft_down';

/** Lab A/B for the number fill (Stake refs). Production stays `flat`. */
export type CoinFaceFillId = 'now' | 'lime' | 'holo' | 'candy' | 'enamel' | 'twostop' | 'flat';

export type CoinFaceStakeFillId = 'lime' | 'holo' | 'candy';

export type CoinFaceCoinAbFillId = 'enamel' | 'twostop' | 'flat';

export type CoinFaceMetal = 'CB' | 'CS' | 'CG';

export type CoinFaceStyleMeta = {
	id: CoinFaceStyleId;
	label: string;
	reference: string;
};

export const COIN_FACE_STYLE_OPTIONS: CoinFaceStyleMeta[] = [
	{ id: 'hard_down', label: 'Hard', reference: 'Shipped · 60% · 3px down · tinted, no stroke' },
	{ id: 'tight_down', label: 'Tight', reference: '50% · 2px down · tinted, no stroke' },
	{ id: 'soft_down', label: 'Soft', reference: '55% · 4px down · tinted, no stroke' },
];

export const DEFAULT_COIN_FACE_STYLE: CoinFaceStyleId = 'hard_down';

export const COIN_FACE_FILL_OPTIONS: { id: CoinFaceFillId; label: string }[] = [
	{ id: 'now', label: 'Now' },
	{ id: 'lime', label: 'Lime' },
	{ id: 'holo', label: 'Holo' },
	{ id: 'candy', label: 'Candy' },
];

export const COIN_FACE_COIN_AB_OPTIONS: { id: CoinFaceCoinAbFillId; label: string }[] = [
	{ id: 'enamel', label: 'Enamel' },
	{ id: 'twostop', label: 'Two-stop' },
	{ id: 'flat', label: 'Flat' },
];

export const DEFAULT_COIN_FACE_FILL: CoinFaceFillId = 'flat';

export type CoinFaceFillSpec = {
	top: number;
	mid?: number;
	bot: number;
	outline: number;
	strokeScale: number;
	extrude: boolean;
	letterSpacing: number;
	/** Lab: straight dark crease across the glyph interiors. */
	midCrease?: boolean;
};

const rgbToHsl = (hex: number): [number, number, number] => {
	const r = ((hex >> 16) & 255) / 255;
	const g = ((hex >> 8) & 255) / 255;
	const b = (hex & 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return [h, s, l];
};

const hslToRgb = (h: number, s: number, l: number): number => {
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	if (s === 0) {
		const v = Math.round(l * 255);
		return (v << 16) | (v << 8) | v;
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const r = hue2rgb(p, q, h + 1 / 3);
	const g = hue2rgb(p, q, h);
	const b = hue2rgb(p, q, h - 1 / 3);
	return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
};

const saturateHex = (hex: number, add: number) => {
	const [h, s, l] = rgbToHsl(hex);
	return hslToRgb(h, Math.min(1, s + add), l);
};

const mixTowardWhite = (hex: number, amount: number) => {
	const t = Math.min(1, Math.max(0, amount));
	const r = Math.round(((hex >> 16) & 255) * (1 - t) + 255 * t);
	const g = Math.round(((hex >> 8) & 255) * (1 - t) + 255 * t);
	const b = Math.round((hex & 255) * (1 - t) + 255 * t);
	return (r << 16) | (g << 8) | b;
};

const mixHex = (a: number, b: number, t: number) => {
	const k = Math.min(1, Math.max(0, t));
	const r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k);
	const g = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k);
	const bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
	return (r << 16) | (g << 8) | bl;
};

/** Same hue, lower lightness — crease, not a black stroke. */
const darkenHex = (hex: number, amount: number) => {
	const [h, s, l] = rgbToHsl(hex);
	return hslToRgb(h, Math.min(1, s + 0.06), Math.max(0.1, l * (1 - amount)));
};

/** Near-black of the metal stroke — same hue, crushed lightness (not pure black). */
export const coinFaceShadowTint = (stroke: number) => {
	const [h, s] = rgbToHsl(stroke);
	return hslToRgb(h, Math.min(1, Math.max(s, 0.55)), 0.12);
};

export const COIN_FACE_METAL: Record<CoinFaceMetal, { fill: number; stroke: number }> = {
	CB: { fill: mixTowardWhite(0xf3d48a, 0.25), stroke: saturateHex(0x8c3e00, 0.18) },
	CS: { fill: mixTowardWhite(0xe8eef4, 0.22), stroke: saturateHex(0x5c6a78, 0.22) },
	CG: { fill: mixTowardWhite(0xffe7a0, 0.25), stroke: saturateHex(0xb56a00, 0.18) },
};

/** Gold default — Pixi Text cannot take a fill array, so we stack two solids. */
export const COIN_FACE_BANDS = {
	top: 0xfff491,
	bot: 0xe7ad21,
} as const;

/**
 * Le Bandit enamel (sampled 2026-09-10 from digits_* ktx2).
 * Top-bright cream, mid highlight, saturated metal foot.
 */
export const COIN_FACE_BANDS_BY_METAL: Record<
	CoinFaceMetal,
	{ top: number; mid: number; bot: number }
> = {
	CB: { top: 0xf9d096, mid: 0xf4e3cb, bot: 0xde6b21 },
	CS: { top: 0xc6dfe7, mid: 0xe9f1f9, bot: 0x6aacb5 },
	CG: { top: 0xfff491, mid: 0xfbf3c2, bot: 0xe7ad21 },
};

export const coinFaceBands = (symbol?: string) =>
	COIN_FACE_BANDS_BY_METAL[coinMetalForSymbol(symbol ?? 'CB')];

/** Stake-style fills — lab only until Cole picks. */
export const COIN_FACE_FILL_PRESETS: Record<CoinFaceStakeFillId, CoinFaceFillSpec> = {
	lime: {
		top: 0xf4ff9a,
		mid: 0xb6ee32,
		bot: 0x5fb41a,
		outline: 0x0a0a0a,
		strokeScale: 1.45,
		extrude: false,
		letterSpacing: -1,
	},
	holo: {
		top: 0xff4ec8,
		mid: 0xfff3ea,
		bot: 0x7ee8ff,
		outline: 0x32104a,
		strokeScale: 1.35,
		extrude: false,
		letterSpacing: -1,
	},
	candy: {
		top: 0xff8ad8,
		mid: 0xf3e8ff,
		bot: 0x6ec8ff,
		outline: 0x0a0a0a,
		strokeScale: 1.45,
		extrude: false,
		letterSpacing: -1,
	},
};

export const COIN_FACE_EXTRUDE_STEPS = 2;

export const COIN_FACE_SHADOW: Record<
	CoinFaceStyleId,
	{ alpha: number; blur: number; distance: number }
> = {
	hard_down: { alpha: 0.2, blur: 0, distance: 1 },
	tight_down: { alpha: 0.16, blur: 0, distance: 1 },
	soft_down: { alpha: 0.22, blur: 0, distance: 2 },
};

export const toCssHex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const fromCssHex = (value: string) => {
	const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
	return match ? parseInt(match[1], 16) : null;
};

export const COIN_FACE_OUTLINE_DEFAULTS: Record<CoinFaceMetal, number> = {
	CB: coinFaceShadowTint(COIN_FACE_METAL.CB.stroke),
	CS: coinFaceShadowTint(COIN_FACE_METAL.CS.stroke),
	CG: coinFaceShadowTint(COIN_FACE_METAL.CG.stroke),
};

export const coinFaceStrokeWidth = (fontSize: number, scale = 1) => fontSize * 0.1 * scale;

export const coinFaceExtrudeStep = (fontSize: number) => ({
	x: fontSize * 0.02,
	y: fontSize * 0.03,
});

/** Far-to-near bronze copies so the side reads as a solid block. */
export const coinFaceExtrudeOffsets = (fontSize: number) => {
	const step = coinFaceExtrudeStep(fontSize);
	return Array.from({ length: COIN_FACE_EXTRUDE_STEPS }, (_, index) => {
		const i = COIN_FACE_EXTRUDE_STEPS - index;
		return { x: step.x * i, y: step.y * i };
	});
};

/** Bronze side — metal stroke, a little lighter than the drop. */
export const coinFaceExtrudeTint = (stroke: number) => {
	const [h, s] = rgbToHsl(stroke);
	return hslToRgb(h, Math.min(1, Math.max(s, 0.5)), 0.22);
};

/** Unused leftover. Live faces sit at disc center (label offsets 0). */
export const coinFaceOpticalNudge = (fontSize: number) => ({
	x: fontSize * 0.12,
	y: fontSize * 0.08,
});

/** Collector bag numbers use gold coin faces. */
export const BAG_FACE_BANDS = { top: 0xfff491, bot: 0xe7ad21 } as const;

/** MULTI xN — eye-tone metal, same dark-top / light-bot recipe as coins. */
export type MultiFaceTone = 'green' | 'yellow' | 'red';

export const MULTI_FACE_BANDS: Record<MultiFaceTone, { top: number; bot: number; stroke: number }> = {
	green: { top: 0x04d739, bot: 0x7cfeab, stroke: 0x145c32 },
	yellow: { top: 0xfee60b, bot: 0xfedb71, stroke: 0x8a6d00 },
	red: { top: 0xc70f21, bot: 0xfe7171, stroke: 0x8b1e2d },
};

export const multiFaceTone = (symbol: string): MultiFaceTone | null => {
	if (symbol === 'XM_yellow') return 'yellow';
	if (symbol === 'XM_red') return 'red';
	if (symbol === 'XM_green' || symbol === 'XM') return 'green';
	return null;
};

const isStakeFillLook = (look: CoinFaceFillId): look is CoinFaceStakeFillId =>
	look === 'lime' || look === 'holo' || look === 'candy';

const isCoinAbFillLook = (look: CoinFaceFillId): look is CoinFaceCoinAbFillId =>
	look === 'enamel' || look === 'twostop' || look === 'flat';

const LB_FACE_OUTLINE = 0x0a0a0a;
const LB_FACE_STROKE_SCALE = 0.95;

const coinAbFill = (
	look: CoinFaceCoinAbFillId,
	topBand: number,
	botBand: number,
	midBand?: number,
): CoinFaceFillSpec => {
	if (look === 'enamel') {
		return {
			top: mixTowardWhite(topBand, 0.28),
			bot: botBand,
			outline: LB_FACE_OUTLINE,
			strokeScale: 0.32,
			extrude: false,
			letterSpacing: 0,
		};
	}
	if (look === 'flat') {
		return {
			top: topBand,
			mid: midBand,
			bot: botBand,
			outline: LB_FACE_OUTLINE,
			strokeScale: LB_FACE_STROKE_SCALE,
			extrude: true,
			letterSpacing: 0,
		};
	}
	return {
		top: topBand,
		bot: botBand,
		outline: LB_FACE_OUTLINE,
		strokeScale: 0.32,
		extrude: false,
		letterSpacing: 0,
	};
};

export const coinMetalForSymbol = (symbol: string): CoinFaceMetal => {
	if (symbol === 'CS' || symbol === 'CG') return symbol;
	return 'CB';
};

export const coinFaceShadowForPreset = (preset: CoinFaceStyleId) =>
	COIN_FACE_SHADOW[preset] ?? COIN_FACE_SHADOW.hard_down;

export const coinFaceMetal = (symbol: string) => COIN_FACE_METAL[coinMetalForSymbol(symbol)];

export const resolveCoinFaceFill = (
	symbol: string,
	look: CoinFaceFillId,
	bandOverride?: { top?: number; bot?: number },
): CoinFaceFillSpec => {
	if (isStakeFillLook(look)) return COIN_FACE_FILL_PRESETS[look];
	const bands = coinFaceBands(symbol);
	const topBand = bandOverride?.top ?? bands.top;
	const botBand = bandOverride?.bot ?? bands.bot;
	if (isCoinAbFillLook(look) && (symbol === 'CB' || symbol === 'CS' || symbol === 'CG')) {
		return coinAbFill(look, topBand, botBand, bands.mid);
	}
	if (symbol === 'CL') {
		return resolveCoinFaceFill('CG', look, bandOverride);
	}
	const multiTone = multiFaceTone(symbol);
	if (multiTone) {
		const multiBands = MULTI_FACE_BANDS[multiTone];
		const lookAb = isCoinAbFillLook(look) ? look : 'flat';
		const multiLook = lookAb === 'flat' ? 'twostop' : lookAb;
		return {
			...coinAbFill(
				multiLook,
				bandOverride?.top ?? multiBands.top,
				bandOverride?.bot ?? multiBands.bot,
			),
			outline: LB_FACE_OUTLINE,
			strokeScale: LB_FACE_STROKE_SCALE,
			extrude: true,
		};
	}
	return coinAbFill('flat', topBand, botBand, bands.mid);
};

const coinFaceFillColorStops = (spec: {
	top: number;
	mid?: number;
	bot: number;
}): { offset: number; color: number }[] =>
	spec.mid == null
		? [
				{ offset: 0, color: spec.top },
				{ offset: 1, color: spec.bot },
			]
		: [
				{ offset: 0, color: spec.top },
				{ offset: 0.5, color: spec.mid },
				{ offset: 1, color: spec.bot },
			];

/** One bitmap: metal (or lab) stroke + real vertical fill. Avoids Pixi Text outline blobs. */
export const makeCoinFaceNumberTexture = ({
	label,
	fontSize,
	fontFamily,
	fill,
	resolution = 2,
}: {
	label: string;
	fontSize: number;
	fontFamily: string;
	fill: CoinFaceFillSpec;
	resolution?: number;
}) => {
	if (typeof document === 'undefined') {
		return { texture: Texture.EMPTY, width: fontSize, height: fontSize };
	}
	const ctxProbe = document.createElement('canvas').getContext('2d');
	if (!ctxProbe) {
		return { texture: Texture.EMPTY, width: fontSize, height: fontSize };
	}
	const font = `${PRIZE_NUMBER_WEIGHT} ${fontSize}px "${fontFamily}"`;
	ctxProbe.font = font;
	if (fill.letterSpacing) {
		(ctxProbe as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
			`${fill.letterSpacing}px`;
	}
	const strokeW = coinFaceStrokeWidth(fontSize, fill.strokeScale);
	const blackW = Math.max(1.75, strokeW);
	const bevelX = fill.extrude ? Math.max(0.6, fontSize * 0.012) : 0;
	const bevelY = fill.extrude ? Math.max(1.6, fontSize * 0.04) : 0;
	const shadowX = 1;
	const shadowY = 2;
	ctxProbe.textAlign = 'center';
	ctxProbe.textBaseline = 'middle';
	const measured = ctxProbe.measureText(label);
	const inkLeft = measured.actualBoundingBoxLeft || 0;
	const inkRight = measured.actualBoundingBoxRight || measured.width / 2;
	const inkAscent = measured.actualBoundingBoxAscent || fontSize * 0.8;
	const inkDescent = measured.actualBoundingBoxDescent || fontSize * 0.2;
	const inkW = Math.max(1, inkLeft + inkRight);
	const inkH = Math.max(1, inkAscent + inkDescent);
	const creaseBlur = fill.midCrease ? Math.max(1.4, fontSize * 0.05) : 0;
	const pad = Math.ceil(blackW + Math.max(shadowX, shadowY) + bevelX + bevelY + creaseBlur + 3);
	const width = Math.max(4, Math.ceil(pad + inkW + pad));
	const height = Math.max(4, Math.ceil(pad + inkH + pad));
	const canvas = document.createElement('canvas');
	canvas.width = Math.ceil(width * resolution);
	canvas.height = Math.ceil(height * resolution);
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return { texture: Texture.EMPTY, width, height };
	}
	ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
	ctx.clearRect(0, 0, width, height);
	ctx.font = font;
	if (fill.letterSpacing) {
		(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
			`${fill.letterSpacing}px`;
	}
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	const dx = width / 2;
	const dy = height / 2;
	ctx.shadowColor = 'transparent';
	if (fill.extrude) {
		const far = darkenHex(fill.bot, 0.42);
		const near = darkenHex(fill.bot, 0.22);
		ctx.fillStyle = toCssHex(far);
		ctx.fillText(label, dx + bevelX * 2, dy + bevelY * 2);
		ctx.fillStyle = toCssHex(near);
		ctx.fillText(label, dx + bevelX, dy + bevelY);
	}
	ctx.shadowColor = toCssHex(coinFaceShadowTint(fill.outline));
	ctx.shadowOffsetX = shadowX;
	ctx.shadowOffsetY = shadowY;
	ctx.shadowBlur = 0;
	ctx.strokeStyle = toCssHex(fill.outline);
	ctx.lineWidth = blackW;
	ctx.strokeText(label, dx, dy);
	ctx.shadowColor = 'transparent';
	const gy0 = dy - inkAscent;
	const gy1 = dy + inkDescent;
	const grad = ctx.createLinearGradient(0, gy0, 0, gy1);
	for (const stop of coinFaceFillColorStops(fill)) {
		grad.addColorStop(stop.offset, toCssHex(stop.color));
	}
	ctx.fillStyle = grad;
	ctx.fillText(label, dx, dy);
	if (fill.midCrease) {
		const midY = gy0 + inkH * 0.5;
		const creaseH = Math.max(3, fontSize * 0.08);
		const darkTop = darkenHex(fill.top, 0.28);
		const darkBot = darkenHex(fill.bot, 0.28);
		const darkMid = darkenHex(fill.mid ?? mixHex(fill.top, fill.bot, 0.5), 0.32);
		const band = ctx.createLinearGradient(0, midY - creaseH * 2, 0, midY + creaseH * 2);
		band.addColorStop(0, 'rgba(0,0,0,0)');
		band.addColorStop(0.38, toCssHex(darkTop));
		band.addColorStop(0.5, toCssHex(darkMid));
		band.addColorStop(0.62, toCssHex(darkBot));
		band.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.save();
		ctx.globalCompositeOperation = 'source-atop';
		ctx.filter = `blur(${(creaseBlur * resolution).toFixed(2)}px)`;
		ctx.globalAlpha = 0.38;
		ctx.fillStyle = band;
		ctx.fillRect(0, midY - creaseH * 2.8 - creaseBlur, width, creaseH * 5.6 + creaseBlur * 2);
		ctx.restore();
	}
	return { texture: Texture.from(canvas), width, height };
};

export const buildCoinFaceBandStyle = ({
	symbol,
	fontSize,
	fontFamily,
	band,
	strokeWidthScale = 1,
	fill,
	letterSpacing = 0,
}: {
	symbol: string;
	fontSize: number;
	fontFamily: string;
	band: 'top' | 'bot';
	strokeWidthScale?: number;
	fill?: number;
	letterSpacing?: number;
}) =>
	fillOnlyStyle(
		fontSize,
		fontFamily,
		fill ?? coinFaceBands(symbol)[band],
		coinFaceStrokeWidth(fontSize, strokeWidthScale),
		letterSpacing,
	);

/** @deprecated Use band styles. Mid gold kept so older call sites still compile. */
export const buildCoinFaceTextStyle = ({
	symbol,
	fontSize,
	fontFamily,
}: {
	symbol: string;
	fontSize: number;
	fontFamily: string;
	preset?: CoinFaceStyleId;
}) =>
	buildCoinFaceBandStyle({
		symbol,
		fontSize,
		fontFamily,
		band: 'bot',
	});

/** Dark 3D outline plate — sits under the bands so a rim shows around the face. */
export const buildCoinFaceOutlineStyle = ({
	symbol,
	fontSize,
	fontFamily,
	outlineColor,
	strokeWidthScale = 1,
	letterSpacing = 0,
}: {
	symbol: string;
	fontSize: number;
	fontFamily: string;
	outlineColor?: number;
	strokeWidthScale?: number;
	letterSpacing?: number;
}) => {
	const metal = coinFaceMetal(symbol);
	const strokeWidth = coinFaceStrokeWidth(fontSize, strokeWidthScale);
	const color = outlineColor ?? coinFaceShadowTint(metal.stroke);
	return {
		fontFamily,
		fontSize,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill: color,
		align: 'center' as const,
		letterSpacing,
		padding: Math.ceil(strokeWidth) + 4,
		stroke: {
			color,
			width: strokeWidth,
			join: 'round' as const,
			cap: 'round' as const,
		},
	};
};

const fillOnlyStyle = (
	fontSize: number,
	fontFamily: string,
	fill: number,
	strokeWidth: number,
	letterSpacing = 0,
) => ({
	fontFamily,
	fontSize,
		fontWeight: PRIZE_NUMBER_WEIGHT,
		fill,
	align: 'center' as const,
	letterSpacing,
	padding: Math.ceil(strokeWidth) + 4,
});

/** Fill-only shadow glyph — no outline, so the drop does not pick up the stroke. */
export const buildCoinFaceShadowStyle = ({
	symbol,
	fontSize,
	fontFamily,
	strokeWidthScale = 1,
	fill,
}: {
	symbol: string;
	fontSize: number;
	fontFamily: string;
	strokeWidthScale?: number;
	fill?: number;
}) => {
	const metal = coinFaceMetal(symbol);
	return fillOnlyStyle(
		fontSize,
		fontFamily,
		fill ?? coinFaceShadowTint(metal.stroke),
		coinFaceStrokeWidth(fontSize, strokeWidthScale),
	);
};

/** Fill-only bronze side for the extrusion stack. */
export const buildCoinFaceExtrudeStyle = ({
	symbol,
	fontSize,
	fontFamily,
	strokeWidthScale = 1,
}: {
	symbol: string;
	fontSize: number;
	fontFamily: string;
	strokeWidthScale?: number;
}) => {
	const metal = coinFaceMetal(symbol);
	return fillOnlyStyle(
		fontSize,
		fontFamily,
		coinFaceExtrudeTint(metal.stroke),
		coinFaceStrokeWidth(fontSize, strokeWidthScale),
	);
};
