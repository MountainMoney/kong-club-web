/**
 * Intro cinematic timelines, ported 1:1 from Gaia's Grotto's live build
 * (trifecta.live.engine.io/gaiasgrotto/v4, main bundle). GG names in brackets.
 * Only the art and copy differ: KC logo, KC cards, KC background, KC sounds.
 */

// ── easing / helpers [It, _v, Ie, Ea, jr, Zye, nc, or, ri, n4e, q5] ─────────
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n)); // nc
export const progress = (n: number, start: number, dur: number) =>
	dur <= 0 ? (n >= start ? 1 : 0) : clamp01((n - start) / dur); // It
export const quadIn = (t: number) => t * t; // _v
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3); // Ie
export const easeInOutCubic = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // Ea
const BACK = 1.70158;
export const backOut = (t: number) => 1 + (BACK + 1) * Math.pow(t - 1, 3) + BACK * Math.pow(t - 1, 2); // jr
export const backIn = (t: number) => (BACK + 1) * t * t * t - BACK * t * t; // Zye
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t; // or

export type Spring = { amount: number; periodMs: number; decayMs: number };
/** Damped cosine bounce [ri]. */
export const ring = (n: number, s: Spring) =>
	n < 0 ? 0 : s.amount * Math.exp(-n / s.decayMs) * Math.cos((2 * Math.PI * n) / s.periodMs);
/** Damped sine wobble [n4e]. */
export const wobble = (n: number, s: { radians: number; periodMs: number; decayMs: number }) =>
	n < 0 ? 0 : s.radians * Math.exp(-n / s.decayMs) * Math.sin((2 * Math.PI * n) / s.periodMs);
/** Volume-keeping squash [q5]. */
export const squash = (n: number) => ({ x: 1 + 0.6 * n, y: 1 - n });
/** Deterministic hash noise [ma]. */
export const hash01 = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

// ── design space [ig / la] ────────────────────────────────────────────────
export const DESIGN = {
	desktop: { width: 1920, height: 1080 },
	portrait: { width: 1080, height: 1920 },
} as const;

// GG logo box (kd × pg) and its desktop slot [F2e].
export const GG_LOGO = { w: 568, h: 204.125 };

/** Card-local box every card is laid out in [Q0]. */
export const CARD_BOX = { w: 421.2, h: 554.4 };
/** Card scale factor GG authors at [Ej]. */
export const CARD_AUTHOR_SCALE = 1.2;

export type Slot = { x: number; y: number; scale: number };
export type IntroLayout = { logoTo: Slot; cards: Slot[]; depth: number[]; cta: Slot };

/** Card order follows GG's three slots: left, middle, right. KC: COINS, MAX WIN, MYSTERY. */
const CARD_BOX_SIZE = { w: 350.83, h: 461.48 };
const CARD_X = [338.81, 783.8, 1232.21];

/** [mm] desktop / landscape layout. */
export const LAYOUT_DESKTOP: IntroLayout = {
	logoTo: { x: 684 + 551.44 / 2, y: 135.83 + 198.15 / 2, scale: 551.44 / GG_LOGO.w },
	cards: CARD_X.map((x) => ({
		x: x + CARD_BOX_SIZE.w / 2,
		y: 430.3 + CARD_BOX_SIZE.h / 2,
		scale: 1 / CARD_AUTHOR_SCALE,
	})),
	depth: [2, 0, 1], // G2e
	cta: { x: 960, y: 952, scale: 1 }, // W2e
};

/** [P6e] portrait layout. */
export const LAYOUT_PORTRAIT: IntroLayout = {
	logoTo: { x: 540, y: 220, scale: 1.3 }, // H2e
	cards: [
		{ x: 287, y: 708, scale: 1 },
		{ x: 787, y: 708, scale: 1 },
		{ x: 540, y: 1309, scale: 1 },
	], // z2e
	depth: [2, 1, 0], // Y2e
	cta: { x: 540, y: 1660, scale: 1.25 }, // j2e
};

// ── logo drop [D2e] ───────────────────────────────────────────────────────
export const LOGO = {
	dropFrom: -560,
	dropMs: 620,
	squash: { amount: 0.09, periodMs: 260, decayMs: 120 },
	landNuggets: 9,
	glintEveryMs: { min: 520, max: 1250 },
	glintMs: 620,
	glintSize: 70,
	glints: [
		{ x: -0.3913, y: 0.3867 },
		{ x: 0.3824, y: 0.3968 },
		{ x: 0.2455, y: 0.4073 },
		{ x: -0.2774, y: 0.383 },
		{ x: 0.2276, y: -0.1427 },
		{ x: -0.1629, y: -0.1325 },
		{ x: -0.2279, y: -0.176 },
		{ x: 0.2234, y: 0.3896 },
		{ x: -0.1913, y: 0.3898 },
		{ x: -0.2498, y: -0.2915 },
	],
};

export const logoPose = (t: number, to: Slot) => {
	const f = quadIn(progress(t, 0, LOGO.dropMs));
	const d = squash(t >= LOGO.dropMs ? ring(t - LOGO.dropMs, LOGO.squash) : 0);
	return { x: to.x, y: to.y + LOGO.dropFrom * (1 - f), scaleX: to.scale * d.x, scaleY: to.scale * d.y };
};

// ── cards [Ij / Cqe] ──────────────────────────────────────────────────────
export const CARDS = {
	startMs: [210, 60, 330],
	postsFrom: -980,
	postsFallMs: 330,
	postsSquash: { amount: 0.06, periodMs: 230, decayMs: 95 },
	signFrom: -820,
	signLagMs: 110,
	signWobble: { radians: 0.11, periodMs: 330, decayMs: 170 },
	signSquash: { amount: 0.05, periodMs: 200, decayMs: 80 },
	textDelayMs: 90,
	textMs: 300,
	textRise: 16,
	sway: { radians: 0.008, periodMs: 3100 },
	thud: { amount: 6, periodMs: 120, decayMs: 70 },
	signThud: 0.6,
	dust: {
		puffs: 9,
		halfWidth: 200,
		y: -6,
		size: { min: 80, max: 110 },
		grow: { min: 1.8, max: 2.3 },
		drift: { min: 15, max: 110 },
		rise: { min: 12, max: 36 },
		spin: 0.6,
		lagMs: 8,
		lifeMs: { min: 490, max: 540 },
		alpha: 0.8,
	},
	signNuggets: 10,
};

/** Posts land [fm]. */
export const postsLandMs = (i: number) => (CARDS.startMs[i] ?? 0) + CARDS.postsFallMs;
/** Sign lands [Nv]. */
export const signLandMs = (i: number) => postsLandMs(i) + CARDS.signLagMs;
/** Text starts [wD]. */
export const textStartMs = (i: number) => signLandMs(i) + CARDS.textDelayMs;

const squashAt = (n: number, at: number, s: Spring) => squash(n >= at ? ring(n - at, s) : 0); // Ece
const signSide = (i: number) => (i % 2 === 0 ? 1 : -1); // Iqe

export const cardPose = (n: number, i: number) => {
	const t = CARDS.startMs[i] ?? 0;
	const r = postsLandMs(i);
	const s = signLandMs(i);
	const fall = CARDS.postsFallMs;
	const pi = quadIn(progress(n, t, fall));
	const si = quadIn(progress(n, s - fall, fall));
	const o = n - s;
	const sway =
		o > 0
			? CARDS.sway.radians *
				Math.sin((2 * Math.PI * o) / CARDS.sway.periodMs + i * 1.7) *
				progress(o, 0, CARDS.sway.periodMs / 2)
			: 0;
	const l = easeOutCubic(progress(n, textStartMs(i), CARDS.textMs));
	return {
		postsShown: n >= t,
		postsY: CARDS.postsFrom * (1 - pi),
		postsScale: squashAt(n, r, CARDS.postsSquash),
		signShown: n >= s - fall,
		signY: CARDS.signFrom * (1 - si),
		signRotation: signSide(i) * wobble(o, CARDS.signWobble) + sway,
		signScale: squashAt(n, s, CARDS.signSquash),
		textAlpha: l,
		textY: CARDS.textRise * (1 - l),
	};
};

/** Whole-screen thud from every landing [Oqe]. */
export const thudY = (n: number) =>
	[0, 1, 2].reduce(
		(e, r) => e + ring(n - postsLandMs(r), CARDS.thud) + ring(n - signLandMs(r), CARDS.thud) * CARDS.signThud,
		0,
	);

// ── CTA [eb, Ace, SD, uN] ─────────────────────────────────────────────────
export const CTA = { inMs: 380, startScale: 0.6, fontSize: 48 };
export const CTA_START_MS = Math.max(...[0, 1, 2].map(textStartMs)); // Ace = 860
export const CONTINUE_MS = CTA_START_MS + CTA.inMs; // SD = 1240
export const PULSE = { firstMs: 1200, everyMs: 2200, ms: 520, rot: 0.12, scale: 0.08, freq: 20 };

export const pulseAt = (sinceMount: number) => {
	if (sinceMount < PULSE.firstMs) return { rot: 0, scale: 1 };
	const cycle = PULSE.ms + PULSE.everyMs;
	const local = (sinceMount - PULSE.firstMs) % cycle;
	if (local >= PULSE.ms) return { rot: 0, scale: 1 };
	const c = local / PULSE.ms;
	const l = (1 - c) * (1 - c);
	const h = Math.sin(c * PULSE.freq);
	return { rot: h * PULSE.rot * l, scale: 1 + Math.abs(h) * PULSE.scale * l };
};

// ── hover [V2e, X2e, K2e, $2e, Z2e, J2e] ──────────────────────────────────
export const HOVER = { ms: 180, grow: 0.06, lift: 14, wobbleMs: 460, wobbleAmp: 0.05, wobbleFreq: 22 };

// ── exit [Vc / Dce / Zqe] ─────────────────────────────────────────────────
export const EXIT = {
	ctaOutMs: 160,
	cardsOut: { startMs: [0, 70, 35], ms: 460, fall: 1350, turn: [-0.24, 0.05, 0.24] },
	logo: { delayMs: 40, ms: 540 },
	cameraMs: 1100,
	board: { delayMs: 160, fallMs: 440, marginPx: 40 },
	hero: { delayMs: 360, hopMs: 520, arc: 230, squash: { amount: 0.08, periodMs: 260, decayMs: 110 } },
};
/** GG [pm]: the hero lands. */
export const HERO_LAND_MS = EXIT.hero.delayMs + EXIT.hero.hopMs;
/** In-game logo takes over when GG's board lands [Ku]. */
export const HANDOVER_MS = EXIT.board.delayMs + EXIT.board.fallMs;

export const exitPose = (n: number) => ({
	ctaOut: easeOutCubic(progress(n, 0, EXIT.ctaOutMs)),
	cards: [0, 1, 2].map((i) => {
		const t = progress(n, EXIT.cardsOut.startMs[i] ?? 0, EXIT.cardsOut.ms);
		const r = backIn(t);
		return {
			y: EXIT.cardsOut.fall * r,
			rotation: (EXIT.cardsOut.turn[i] ?? 0) * clamp01(r),
			alpha: 1 - progress(t, 0.75, 0.25),
		};
	}),
	logo: easeInOutCubic(progress(n, EXIT.logo.delayMs, EXIT.logo.ms)),
	logoHandedOver: n >= HANDOVER_MS,
	scene: easeOutCubic(progress(n, 0, HANDOVER_MS)),
});

// ── camera [ja, iEe, Cj] + backdrop [N2e] ─────────────────────────────────
export const CAMERA = { zoom: 1.1, inMs: 1667 };
export const BACKDROP = {
	parallax: 1.9,
	fadeOutMs: 520,
	motes: {
		count: 34,
		near: 6,
		size: { min: 3, max: 9 },
		nearSize: { min: 22, max: 40 },
		rise: { min: 0.006, max: 0.022 },
		sway: { px: 26, periodMs: { min: 3600, max: 7400 } },
		alpha: { min: 0.18, max: 0.62 },
		nearAlpha: 0.1,
		tint: 16768160,
		twinkleHz: { min: 0.3, max: 1.1 },
	},
	grit: { everyMs: { min: 1400, max: 3800 }, specks: { min: 3, max: 7 }, tint: 2825490 },
};

// ── smoke puffs [Xu / yce] ────────────────────────────────────────────────
type PuffSpec = typeof CARDS.dust;
const smooth = (n: number) => {
	const e = clamp01(n);
	return e * e * (3 - 2 * e);
}; // pD
export type Puff = ReturnType<typeof makePuffs>[number];
export const makePuffs = (spec: PuffSpec, at: { x: number; y: number }, seed: number) =>
	Array.from({ length: spec.puffs }, (_, s) => {
		const h = (c: number) => hash01(seed + s * 13.7 + c * 1.31);
		const a = -1 + (2 * (s + 0.5 + (h(1) - 0.5) * 0.5)) / spec.puffs;
		const o = Math.abs(a);
		return {
			x: at.x + a * spec.halfWidth,
			y: at.y + spec.y + (h(2) - 0.5) * 12,
			dx: Math.sign(a) * lerp(spec.drift.min, spec.drift.max, o) * lerp(0.75, 1.1, h(3)),
			rise: lerp(spec.rise.min, spec.rise.max, h(4)),
			size: lerp(spec.size.min, spec.size.max, h(5)),
			grow: lerp(spec.grow.min, spec.grow.max, h(6)),
			rotation: h(7) * Math.PI * 2,
			spin: (h(8) - 0.5) * 2 * spec.spin,
			lagMs: h(9) * spec.lagMs,
			lifeMs: lerp(spec.lifeMs.min, spec.lifeMs.max, h(10)),
			alpha: spec.alpha * lerp(0.8, 1, h(11)),
		};
	});
export const puffPose = (p: Puff, ms: number) => {
	const t = clamp01((ms - p.lagMs) / p.lifeMs);
	const r = easeOutCubic(t);
	const s = smooth(t / 0.16);
	return {
		x: p.x + p.dx * r,
		y: p.y - p.rise * r,
		size: p.size * (1 + (p.grow - 1) * r),
		rotation: p.rotation + p.spin * t,
		alpha: p.alpha * s * (1 - smooth((t - 0.3) / (1 - 0.3))),
	};
};
/** Card dust at each card's foot [Tce / Pqe]. */
export const CARD_DUST = [0, 1, 2].map((i) => makePuffs(CARDS.dust, { x: 0, y: CARD_BOX.h / 2 }, 211 + i * 37));
export const cardDustPoses = (n: number, i: number) =>
	(CARD_DUST[i] ?? []).map((p) => puffPose(p, n - postsLandMs(i)));

// ── intro → game entrance [Dce boardY / hero Jqe] + KC blur/vignette/UI fade ─
/**
 * Ryan: background unblurs on exit; the UI and logo fade in with the unblur (no slide).
 * The unblur rides GG's camera return (cameraMs, easeInOutCubic) so all three move together.
 */
export const ENTER = {
	/** Peak background blur at 1080p canvas height (scaled with the canvas). */
	blurPx: 5,
	/** Vignette strength over the cinematic (edge alpha). */
	vignetteAlpha: 0.62,
};
/** Measured on the box (virtual clock, same capture): GG's intro clock starts 100ms after its loader is removed. */
export const INTRO_START_DELAY_MS = 100;
export const enterPose = (n: number) => {
	const unblur = easeInOutCubic(progress(n, 0, EXIT.cameraMs));
	const b = progress(n, EXIT.board.delayMs, EXIT.board.fallMs);
	const h = progress(n, EXIT.hero.delayMs, EXIT.hero.hopMs);
	return {
		unblur,
		/** 0 → 1: board drop share remaining (boardY = −dropPx · boardDrop). */
		boardDrop: 1 - quadIn(b),
		/** Hero hop [Jqe]: x share remaining and arc height share. */
		heroX: 1 - h,
		heroArc: 4 * h * (1 - h),
		heroSquash: squash(n >= HERO_LAND_MS ? ring(n - HERO_LAND_MS, EXIT.hero.squash) : 0),
	};
};
