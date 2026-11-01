import { browser } from '$app/environment';
import { PUBLIC_LOCAL_DEV } from 'envs';

import { isFxLabEnabled } from './debugHud.svelte';
import type { PacingPreset } from './winPresentationTempo';
import type { PaylineStyleId } from './paylineStyles';
import {
	COIN_FACE_BANDS_BY_METAL,
	DEFAULT_COIN_FACE_FILL,
	DEFAULT_COIN_FACE_STYLE,
	BAG_FACE_BANDS,
	MULTI_FACE_BANDS,
	fromCssHex,
	toCssHex,
	type CoinFaceFillId,
	type CoinFaceStyleId,
	coinMetalForSymbol,
	multiFaceTone,
} from './coinFaceStyles';

export type FxLabRunnerStatus = 'ready' | 'running' | 'blocked' | 'sticky';

export type MascotClip = 'idle' | 'randomidle' | 'celebration' | 'angry' | 'bananaphone';

/** Lab-only jungle grade. Production stays on the daytime plates. */
export type BackgroundLook = 'day' | 'sunny' | 'midnight';

export const MASCOT_CLIPS: { id: MascotClip; label: string; loop: boolean }[] = [
	{ id: 'idle', label: 'Idle', loop: true },
	{ id: 'randomidle', label: 'Random idle', loop: true },
	{ id: 'celebration', label: 'Celebration', loop: false },
	{ id: 'angry', label: 'Angry', loop: false },
	{ id: 'bananaphone', label: 'Banana phone', loop: false },
];

export const mascotClipLoops = (clip: MascotClip) =>
	MASCOT_CLIPS.find((entry) => entry.id === clip)?.loop ?? true;

const PACING_STORAGE_KEY = 'fxLabPacing';

const readStoredPacing = (): PacingPreset => {
	if (!browser) return 'snappy';
	try {
		const raw = window.localStorage.getItem(PACING_STORAGE_KEY);
		if (raw === 'standard' || raw === 'cinematic' || raw === 'snappy') return raw;
	} catch {
		/* ignore */
	}
	return 'snappy';
};

export const stateFxLab = $state({
	mockTeaseActive: false,
	previewGeneration: 0,
	runnerStatus: 'ready' as FxLabRunnerStatus,
	runnerLabel: '',
	boardFrameGlowPreview: false,
	pacingPreset: readStoredPacing() as PacingPreset,
	/** Kept for PaylineWinHighlight imports — unused in MM production path. */
	paylineStylePreset: 'gold_stroke' as PaylineStyleId,
	coinFacePreset: DEFAULT_COIN_FACE_STYLE as CoinFaceStyleId,
	coinFaceFillLook: DEFAULT_COIN_FACE_FILL as CoinFaceFillId,
	/** Lab-only: dark straight crease through the number middles. */
	coinFaceMidCrease: true,
	/** Lab-only coin disc nudge (px). Production stays 0. */
	coinArtX: 0,
	coinArtY: 0,
	coinArtScale: 1,
	/** Lab-only extra sit per digit count (1–5). Production stays 0. */
	coinDigitX: [0, 0, 0, 0, 0] as [number, number, number, number, number],
	coinDigitY: [0, 0, 0, 0, 0] as [number, number, number, number, number],
	/** Lab-only extra sit for one glyph (`1`–`9`). Production stays 0. */
	coinCharFocus: '1',
	coinCharX: [0, 0, 0, 0, 0, 0, 0, 0, 0] as number[],
	coinCharY: [0, 0, 0, 0, 0, 0, 0, 0, 0] as number[],
	/** Sit board: show MULTI xN and pot numbers without waiting on the power beat. */
	forceShowPowerLabels: false,
	/** Lab-only number fill gradient (top / bot bands). Production uses COIN_FACE_BANDS_BY_METAL. */
	coinBandTopCB: toCssHex(COIN_FACE_BANDS_BY_METAL.CB.top),
	coinBandBotCB: toCssHex(COIN_FACE_BANDS_BY_METAL.CB.bot),
	coinBandTopCS: toCssHex(COIN_FACE_BANDS_BY_METAL.CS.top),
	coinBandBotCS: toCssHex(COIN_FACE_BANDS_BY_METAL.CS.bot),
	coinBandTopCG: toCssHex(COIN_FACE_BANDS_BY_METAL.CG.top),
	coinBandBotCG: toCssHex(COIN_FACE_BANDS_BY_METAL.CG.bot),
	multiBandTopGreen: toCssHex(MULTI_FACE_BANDS.green.top),
	multiBandBotGreen: toCssHex(MULTI_FACE_BANDS.green.bot),
	multiBandTopYellow: toCssHex(MULTI_FACE_BANDS.yellow.top),
	multiBandBotYellow: toCssHex(MULTI_FACE_BANDS.yellow.bot),
	multiBandTopRed: toCssHex(MULTI_FACE_BANDS.red.top),
	multiBandBotRed: toCssHex(MULTI_FACE_BANDS.red.bot),
	bagBandTop: toCssHex(BAG_FACE_BANDS.top),
	bagBandBot: toCssHex(BAG_FACE_BANDS.bot),
	amountFloatPreview: false,
	forceToolbarWinPreview: false,
	/** True once LoadingScreen is dismissed (Press Continue). */
	gameShellReady: false,
	/** True once playfield presenters mount (PaylineWinHighlight / CoinFeatureReveal). */
	paylinePresenterReady: false,
	/** Last sticky preview left on screen for inspection. */
	stickyActive: false,
	/** Lab asked Game to dismiss the intro and mount the playfield. */
	forceEnterPlayfield: false,
	/** Debug mascot clip. Production always uses idle. */
	mascotClip: 'idle' as MascotClip,
	/** Lab-only mascot sit (main px). Production stays 0 / scale 1. */
	mascotX: 0,
	mascotY: 0,
	mascotScale: 1,
	/** 1 = Spine file speed. Lab only. */
	mascotTimeScale: 1,
	/** Lab-only jungle grade. Production stays day. */
	backgroundLook: 'day' as BackgroundLook,
});

export const setBackgroundLook = (look: BackgroundLook) => {
	stateFxLab.backgroundLook = look;
};

export const getBackgroundLook = (): BackgroundLook =>
	isFxLabActive() ? stateFxLab.backgroundLook : 'day';

export const setMascotClip = (clip: MascotClip) => {
	stateFxLab.mascotClip = clip;
};

export const resetMascotNudge = () => {
	stateFxLab.mascotX = 0;
	stateFxLab.mascotY = 0;
	stateFxLab.mascotScale = 1;
	stateFxLab.mascotTimeScale = 1;
};

export const getMascotNudge = () =>
	isFxLabActive()
		? {
				x: stateFxLab.mascotX,
				y: stateFxLab.mascotY,
				scale: stateFxLab.mascotScale,
				timeScale: stateFxLab.mascotTimeScale,
			}
		: { x: 0, y: 0, scale: 1, timeScale: 1 };

/** Skip Press Continue so lab previews can run from the splash. */
export const requestFxLabEnterPlayfield = () => {
	stateFxLab.forceEnterPlayfield = true;
};

export const isFxLabActive = () =>
	(PUBLIC_LOCAL_DEV || import.meta.env.DEV) && isFxLabEnabled();

/** Lab buttons can run once the player is past Press Continue (board tree is mounted). */
export const isFxLabSceneReady = () => stateFxLab.gameShellReady;

export const bumpFxLabPreview = () => {
	stateFxLab.previewGeneration += 1;
};

export const setPacingPreset = (preset: PacingPreset) => {
	stateFxLab.pacingPreset = preset;
	if (!browser) return;
	try {
		window.localStorage.setItem(PACING_STORAGE_KEY, preset);
	} catch {
		/* ignore */
	}
};

export const setPaylineStylePreset = (style: PaylineStyleId) => {
	stateFxLab.paylineStylePreset = style;
};

export const getActivePaylineStyle = (): PaylineStyleId =>
	isFxLabActive() ? stateFxLab.paylineStylePreset : 'gold_stroke';

export const setCoinFacePreset = (style: CoinFaceStyleId) => {
	stateFxLab.coinFacePreset = style;
};

export const getActiveCoinFaceStyle = (): CoinFaceStyleId =>
	isFxLabActive() ? stateFxLab.coinFacePreset : DEFAULT_COIN_FACE_STYLE;

export const setCoinFaceFillLook = (look: CoinFaceFillId) => {
	stateFxLab.coinFaceFillLook = look;
};

export const getActiveCoinFaceFill = (): CoinFaceFillId =>
	isFxLabActive() ? stateFxLab.coinFaceFillLook : DEFAULT_COIN_FACE_FILL;

export const setCoinFaceMidCrease = (on: boolean) => {
	stateFxLab.coinFaceMidCrease = on;
};

export const getActiveCoinFaceMidCrease = () =>
	isFxLabActive() && stateFxLab.coinFaceMidCrease;

export const getCoinArtNudge = () =>
	isFxLabActive()
		? {
				x: stateFxLab.coinArtX,
				y: stateFxLab.coinArtY,
				scale: stateFxLab.coinArtScale,
			}
		: { x: 0, y: 0, scale: 1 };

export const getCoinLabelNudge = () => ({ x: 0, y: 0 });

export const getCoinDigitLab = (digits: number) => {
	const i = Math.min(5, Math.max(1, digits)) - 1;
	if (!isFxLabActive()) return { x: 0, y: 0 };
	return { x: stateFxLab.coinDigitX[i] ?? 0, y: stateFxLab.coinDigitY[i] ?? 0 };
};

export const setCoinDigitLab = (digits: number, axis: 'x' | 'y', value: number) => {
	const i = Math.min(5, Math.max(1, digits)) - 1;
	if (axis === 'x') {
		stateFxLab.coinDigitX = stateFxLab.coinDigitX.map((n, j) => (j === i ? value : n)) as typeof stateFxLab.coinDigitX;
	} else {
		stateFxLab.coinDigitY = stateFxLab.coinDigitY.map((n, j) => (j === i ? value : n)) as typeof stateFxLab.coinDigitY;
	}
};

const charLabIndex = (glyph: string) => {
	const n = Number(glyph);
	if (n < 1 || n > 9) return 0;
	return n - 1;
};

export const getCoinCharLab = (label: string) => {
	if (!isFxLabActive()) return { x: 0, y: 0 };
	const digits = label.replace(/\D/g, '');
	if (digits.length !== 1) return { x: 0, y: 0 };
	const i = charLabIndex(digits);
	return { x: stateFxLab.coinCharX[i] ?? 0, y: stateFxLab.coinCharY[i] ?? 0 };
};

export const setCoinCharLab = (glyph: string, axis: 'x' | 'y', value: number) => {
	const i = charLabIndex(glyph);
	if (axis === 'x') {
		stateFxLab.coinCharX = stateFxLab.coinCharX.map((n, j) => (j === i ? value : n));
	} else {
		stateFxLab.coinCharY = stateFxLab.coinCharY.map((n, j) => (j === i ? value : n));
	}
};

export const resetCoinArtNudge = () => {
	stateFxLab.coinArtX = 0;
	stateFxLab.coinArtY = 0;
	stateFxLab.coinArtScale = 1;
	stateFxLab.coinDigitX = [0, 0, 0, 0, 0];
	stateFxLab.coinDigitY = [0, 0, 0, 0, 0];
	stateFxLab.coinCharX = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	stateFxLab.coinCharY = [0, 0, 0, 0, 0, 0, 0, 0, 0];
};

export const resetCoinFaceGradient = () => {
	stateFxLab.coinBandTopCB = toCssHex(COIN_FACE_BANDS_BY_METAL.CB.top);
	stateFxLab.coinBandBotCB = toCssHex(COIN_FACE_BANDS_BY_METAL.CB.bot);
	stateFxLab.coinBandTopCS = toCssHex(COIN_FACE_BANDS_BY_METAL.CS.top);
	stateFxLab.coinBandBotCS = toCssHex(COIN_FACE_BANDS_BY_METAL.CS.bot);
	stateFxLab.coinBandTopCG = toCssHex(COIN_FACE_BANDS_BY_METAL.CG.top);
	stateFxLab.coinBandBotCG = toCssHex(COIN_FACE_BANDS_BY_METAL.CG.bot);
};

export const resetMultiFaceGradient = () => {
	stateFxLab.multiBandTopGreen = toCssHex(MULTI_FACE_BANDS.green.top);
	stateFxLab.multiBandBotGreen = toCssHex(MULTI_FACE_BANDS.green.bot);
	stateFxLab.multiBandTopYellow = toCssHex(MULTI_FACE_BANDS.yellow.top);
	stateFxLab.multiBandBotYellow = toCssHex(MULTI_FACE_BANDS.yellow.bot);
	stateFxLab.multiBandTopRed = toCssHex(MULTI_FACE_BANDS.red.top);
	stateFxLab.multiBandBotRed = toCssHex(MULTI_FACE_BANDS.red.bot);
};

export const resetBagFaceGradient = () => {
	stateFxLab.bagBandTop = toCssHex(BAG_FACE_BANDS.top);
	stateFxLab.bagBandBot = toCssHex(BAG_FACE_BANDS.bot);
};

export const getCoinFaceBandFillLab = (symbol: string, band: 'top' | 'bot'): number | undefined => {
	if (!isFxLabActive()) return undefined;
	const tone = multiFaceTone(symbol);
	if (tone) {
		const css =
			tone === 'yellow'
				? band === 'top'
					? stateFxLab.multiBandTopYellow
					: stateFxLab.multiBandBotYellow
				: tone === 'red'
					? band === 'top'
						? stateFxLab.multiBandTopRed
						: stateFxLab.multiBandBotRed
					: band === 'top'
						? stateFxLab.multiBandTopGreen
						: stateFxLab.multiBandBotGreen;
		return fromCssHex(css) ?? MULTI_FACE_BANDS[tone][band];
	}
	if (symbol === 'CL') {
		const css = band === 'top' ? stateFxLab.bagBandTop : stateFxLab.bagBandBot;
		return fromCssHex(css) ?? BAG_FACE_BANDS[band];
	}
	const metal = coinMetalForSymbol(symbol);
	const css =
		metal === 'CS'
			? band === 'top'
				? stateFxLab.coinBandTopCS
				: stateFxLab.coinBandBotCS
			: metal === 'CG'
				? band === 'top'
					? stateFxLab.coinBandTopCG
					: stateFxLab.coinBandBotCG
				: band === 'top'
					? stateFxLab.coinBandTopCB
					: stateFxLab.coinBandBotCB;
	const parsed = fromCssHex(css);
	return parsed ?? COIN_FACE_BANDS_BY_METAL[metal][band];
};

export const markFxLabPresenterReady = () => {
	stateFxLab.paylinePresenterReady = true;
};

export const markFxLabPresenterGone = () => {
	stateFxLab.paylinePresenterReady = false;
};

export const markFxLabShellReady = () => {
	stateFxLab.gameShellReady = true;
};
