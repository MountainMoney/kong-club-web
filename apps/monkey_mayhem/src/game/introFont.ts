import {
	AUTO_POPUP_SUBTITLE_SIZE,
	AUTO_POPUP_TITLE_SIZE,
} from './autoplayPopupTheme';
import { BAR_LABEL_SIZE, BAR_VALUE_SIZE } from './layoutScene';
import {
	TOOLBAR_MENU_I_FONT_SIZE,
	TOOLBAR_MENU_LABEL_SIZE,
} from './toolbarMenuTheme';
import { SYMBOL_SIZE } from './constants';
import { PAYLINE_AMOUNT_FONT_SIZE } from './paylineWinAmount';
import { PRIZE_NUMBER_FONT, PRIZE_NUMBER_WEIGHT } from './prizeNumberFont';
import { UI_FONT } from './uiFont';
import { WIN_COUNT_AMOUNT_SIZE } from './winCountLayout';

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
			await Promise.all(FREDOKA_ONE_BOOT_FACES.map((face) => document.fonts.load(face)));
		})();
	}
	return fredokaOneReady;
};

/** Fredoka for win count-up overlay, payline amounts, and title text. */
export const ensureIntroFredokaFont = () => {
	if (!fredokaReady) {
		fredokaReady = (async () => {
			await Promise.all([
				document.fonts.load('700 56px Fredoka'),
				document.fonts.load('700 48px Fredoka'),
				document.fonts.load('600 48px Fredoka'),
				document.fonts.load('700 40px Fredoka'),
				document.fonts.load(`700 ${WIN_COUNT_AMOUNT_SIZE}px Fredoka`),
				document.fonts.load(`900 ${Math.round(WIN_COUNT_AMOUNT_SIZE * 0.78)}px Fredoka`),
				document.fonts.load(`700 ${PAYLINE_AMOUNT_FONT_SIZE}px Fredoka`),
				document.fonts.load('700 32px Fredoka'),
				document.fonts.load('700 26px Fredoka'),
				document.fonts.load('700 22px Fredoka'),
				document.fonts.load('800 42px Fredoka'),
				document.fonts.load('800 36px Fredoka'),
				document.fonts.load('800 30px Fredoka'),
				document.fonts.load('800 24px Fredoka'),
			]);
			await document.fonts.ready;
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
			await Promise.all(
				sizes.map((px) =>
					document.fonts.load(`${PRIZE_NUMBER_WEIGHT} ${px}px "${PRIZE_NUMBER_FONT}"`),
				),
			);
			await document.fonts.ready;
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
			await Promise.all([
				...sizes.map((px) => document.fonts.load(`bold ${px}px ${UI_FONT}`)),
				...sizes.map((px) => document.fonts.load(`900 ${px}px ${UI_FONT}`)),
				document.fonts.load(`600 ${BAR_LABEL_SIZE}px ${UI_FONT}`),
			]);
			await document.fonts.ready;
			aileronLoaded = true;
		})();
	}
	return aileronReady;
};
