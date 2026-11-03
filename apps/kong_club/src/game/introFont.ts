import { AUTO_POPUP_SUBTITLE_SIZE, AUTO_POPUP_TITLE_SIZE } from './autoplayPopupTheme';
import { BAR_LABEL_SIZE, BAR_VALUE_SIZE } from './layoutScene';
import { TOOLBAR_MENU_I_FONT_SIZE, TOOLBAR_MENU_LABEL_SIZE } from './toolbarMenuTheme';
import { SYMBOL_SIZE } from './constants';
import { PAYLINE_AMOUNT_FONT_SIZE } from './paylineWinAmount';
import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from './prizeNumberFont';
import { UI_FONT } from './uiFont';
import { WIN_COUNT_AMOUNT_SIZE } from './winCountLayout';

/** A missing face must not stall splash or the first spin. */
const loadFaces = async (faces: string[], ms = 2500) => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			Promise.all(faces.map((face) => document.fonts.load(face).catch(() => []))),
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, ms);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
};

let fredokaReady: Promise<void> | null = null;
let fredokaOneReady: Promise<void> | null = null;
let prizeNumberReady: Promise<void> | null = null;
let aileronReady: Promise<void> | null = null;
let aileronLoaded = false;

export const isAileronFontReady = () => aileronLoaded;

/** Summit chrome — excerpt 13. Do not load Inter/Aileron (CDN/missing faces stall boot). */
const FREDOKA_ONE_BOOT_FACES = [
	'400 43.2px "Fredoka One"',
	'400 28.8px "Fredoka One"',
	'400 62.1px "Fredoka One"',
	'400 94.5px "Fredoka One"',
	'400 171px "Fredoka One"',
	'400 21.6px "Fredoka One"',
];

export const ensureFredokaOneFont = () => {
	if (!fredokaOneReady) {
		fredokaOneReady = (async () => {
			await loadFaces(FREDOKA_ONE_BOOT_FACES);
		})();
	}
	return fredokaOneReady;
};

/** Fredoka for win count-up overlay, payline amounts, and title text. */
export const ensureIntroFredokaFont = () => {
	if (!fredokaReady) {
		fredokaReady = (async () => {
			await loadFaces([
				'700 56px Fredoka',
				'700 48px Fredoka',
				'600 48px Fredoka',
				'700 40px Fredoka',
				`700 ${WIN_COUNT_AMOUNT_SIZE}px Fredoka`,
				`900 ${Math.round(WIN_COUNT_AMOUNT_SIZE * 0.78)}px Fredoka`,
				`700 ${PAYLINE_AMOUNT_FONT_SIZE}px Fredoka`,
				'700 32px Fredoka',
				'700 26px Fredoka',
				'700 22px Fredoka',
				'800 42px Fredoka',
				'800 36px Fredoka',
				'800 30px Fredoka',
				'800 24px Fredoka',
			]);
			await Promise.race([
				document.fonts.ready.catch(() => undefined),
				new Promise<void>((resolve) => setTimeout(resolve, 2500)),
			]);
		})();
	}
	return fredokaReady;
};

/** Lilita One for coin faces and prize amounts. */
export const ensurePrizeNumberFont = () => {
	if (!prizeNumberReady) {
		prizeNumberReady = (async () => {
			const sizes = [
				20,
				22,
				24,
				26,
				28,
				30,
				32,
				36,
				40,
				42,
				48,
				56,
				Math.round(SYMBOL_SIZE * 0.5),
				Math.round(SYMBOL_SIZE * 0.65),
				PAYLINE_AMOUNT_FONT_SIZE,
				WIN_COUNT_AMOUNT_SIZE,
				Math.round(WIN_COUNT_AMOUNT_SIZE * 0.78),
				72,
				64,
			];
			await loadFaces(sizes.map((px) => `${PRIZE_NUMBER_WEIGHT} ${px}px "${PRIZE_NUMBER_FONT}"`));
			await Promise.race([
				document.fonts.ready.catch(() => undefined),
				new Promise<void>((resolve) => setTimeout(resolve, 2500)),
			]);
		})();
	}
	return prizeNumberReady;
};

/** Preload Inter for Pixi toolbar text (Stake CSP blocks Adobe Typekit). */
export const ensureAileronFont = () => {
	if (!aileronReady) {
		aileronReady = (async () => {
			const sizes = [
				BAR_LABEL_SIZE,
				BAR_VALUE_SIZE,
				Math.round(BAR_VALUE_SIZE * 0.6),
				TOOLBAR_MENU_LABEL_SIZE,
				TOOLBAR_MENU_I_FONT_SIZE,
				AUTO_POPUP_TITLE_SIZE,
				AUTO_POPUP_SUBTITLE_SIZE,
				12,
			];
			await loadFaces([
				...sizes.map((px) => `bold ${px}px ${UI_FONT}`),
				...sizes.map((px) => `900 ${px}px ${UI_FONT}`),
				`600 ${BAR_LABEL_SIZE}px ${UI_FONT}`,
			]);
			await Promise.race([
				document.fonts.ready.catch(() => undefined),
				new Promise<void>((resolve) => setTimeout(resolve, 2500)),
			]);
			aileronLoaded = true;
		})();
	}
	return aileronReady;
};
