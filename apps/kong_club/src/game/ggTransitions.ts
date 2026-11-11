/**
 * Gaia's Grotto (GG) transition constants, ported 1:1 from the live GG build
 * (trifecta.live.engine.io/gaiasgrotto/v4, inline bundle in index.html).
 * Offsets are line numbers in the prettified bundle
 * /workspace/gaia/live_build/game.pretty.js; see GG_TRANSITIONS.md there.
 */

/** GG easings (game.pretty.js 5609-5624). */
/** GG `Nq`: easeInQuad. Curtain close. */
export const ggEaseInQuad = (t: number) => t * t;
/** GG `Ie`: easeOutCubic. Curtain open, intro card, total win scrim. */
export const ggEaseOutCubic = (t: number) => {
	const e = t - 1;
	return e * e * e + 1;
};
/** GG `jr`: easeOutBack (1.70158). Total win continue prompt. */
export const ggEaseOutBack = (t: number) => {
	const n = t - 1;
	return n * n * ((1.70158 + 1) * n + 1.70158) + 1;
};

/** GG scene curtain `Mr` (game.pretty.js 51366-51384). */
export const GG_CURTAIN = {
	closeMs: 520,
	holdMs: 90,
	openMs: 780,
	color: 0x070403,
	softness: 0.46,
	rim: { color: 0xffa548, alpha: 0.09, width: 0.12 },
	emberLight: 0.06,
} as const;

/** GG bonus intro card `Ya` (game.pretty.js 51176-51184). */
export const GG_INTRO_CARD = {
	dimInMs: 220,
	contentInMs: 420,
	ctaMs: 700,
	ctaInMs: 260,
	unattendedHoldMs: 1500,
	contentOutMs: 200,
	dimOutMs: 360,
} as const;

/** GG total win screen (game.pretty.js 50200-50247, 66909-66931, 84575-84618). */
export const GG_TOTAL_WIN = {
	/** Game layers darken to (1 - scrim) brightness while the screen is up (`Lr.scrim`). */
	scrim: 0.6,
	/** `fEe`: scrim in. */
	scrimInMs: 280,
	/** `pEe`: scrim out. */
	scrimOutMs: 500,
	/** `_Ee`: count-up starts this long after the screen opens. */
	countStartMs: 300,
	/** `mEe`: count-up length. */
	countUpMs: 1400,
	/** `yEe`: auto-continue hold after the count (autoplay / space hold only). */
	autoHoldMs: 1500,
	/** `Lr.continue.inMs`: continue prompt in (out is half). */
	continueInMs: 380,
	/** `Mu.total.outS - gEe` (0.8 s - 0.15 s): scrim starts out this long after the exit. */
	exitToScrimOutMs: 650,
} as const;
