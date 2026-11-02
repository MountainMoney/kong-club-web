import config from '../config';
import {
	ANTE_BET_MODE_KEY,
	FEATURE_SPIN_BET_MODE_KEY,
	GAMBLE_BET_MODE_KEY,
	PEAK_SPIN_BET_MODE_KEY,
} from '../betModes';
import {
	buyBonusCardActionKind,
	volatilityCaps,
	volatilityForMode,
	volatilityStarCount,
} from '../buyBonusScreen';
import { bonusDescriptionCopy, paytableModeLabel, type PaytableModeKey } from '../socialCopy';
import { BONUS_BUY } from './constants';

export type CardCut = 'desktop' | 'wide' | 'mobile' | 'confirm';

type ArtSpot = { dx?: number; dy?: number; scale?: number };

export type BonusOffer = {
	id: string;
	kind: 'activate' | 'buy';
	art: string;
	artSpot?: Partial<Record<CardCut, ArtSpot>>;
	backdrop: Record<CardCut, string>;
	tier: number;
	title: string;
	/** Short line on the confirm card. */
	body: string;
	/** Full explanation under the confirm dialog. */
	detail: string;
	/** Shown where Gaia's Grotto prints its volatility line. */
	volatility: string;
	/** Cost multiplier. Cash price is this times the current bet. */
	price: number;
};

const artScale = BONUS_BUY.artScale;

/** Sprite scale so a texture fits a box. GG art is drawn at `artScale` (2x exports). */
const fit = (width: number, height: number, maxW: number, maxH: number, dy = 0): ArtSpot => ({
	scale: Math.min(maxW / width, maxH / height) / artScale,
	...(dy ? { dy } : {}),
});

const spots = (width: number, height: number): BonusOffer['artSpot'] => ({
	desktop: fit(width, height, 188, 188),
	wide: fit(width, height, 210, 188),
	mobile: fit(width, height, 148, 136),
	confirm: fit(width, height, 250, 168, 6),
});

const backdrop = (name: string): BonusOffer['backdrop'] => ({
	desktop: `ggBgDesktop${name}`,
	wide: `ggBgDesktop${name}`,
	mobile: `ggBgMobile${name}`,
	confirm: `ggBgConfirm${name}`,
});

type OfferSeed = {
	id: PaytableModeKey;
	art: string;
	artSize: { width: number; height: number };
	theme: string;
	body: string;
	detail: string;
	price: number;
};

const SEEDS: OfferSeed[] = [
	{
		id: ANTE_BET_MODE_KEY,
		art: 'ST',
		artSize: { width: 512, height: 512 },
		theme: 'Lobby',
		body: 'About 1 in 130 spins instead of about 1 in 260.',
		detail:
			'Stays on for every spin until you turn it off. Doubles the base bonus chance for 1.4× bet.',
		price: config.betModes.base_ante.cost,
	},
	{
		id: FEATURE_SPIN_BET_MODE_KEY,
		art: 'CG',
		artSize: { width: 983, height: 1024 },
		theme: 'Feature',
		body: 'The progress bar starts full. Every spin lands a 5+ cluster.',
		detail:
			'Each spin costs 65× bet with the progress bar filled. After the tumbles stop, the coin game plays.',
		price: config.betModes.feature_spin.cost,
	},
	{
		id: PEAK_SPIN_BET_MODE_KEY,
		art: 'monkeyMascot',
		artSize: { width: 662, height: 903 },
		theme: 'Peak',
		body: 'The whole board starts gold. The bar can dump, or hit the coin game.',
		detail:
			'Each spin costs 1,400× bet. The whole board starts gold. After it lands the bar fills. It can dump, or hit full and play the coin game.',
		price: config.betModes.peak_spin.cost,
	},
	{
		id: 'bonus_see',
		art: 'seeMonkey',
		artSize: { width: 819, height: 1024 },
		theme: 'See',
		body: '3 scatters. The board clears, then 10 free spins.',
		detail: 'Buy See No Evil for 115× bet. 3 scatters. The board clears, then 10 free spins.',
		price: config.betModes.bonus_see.cost,
	},
	{
		id: 'bonus_hear',
		art: 'hearMonkey',
		artSize: { width: 819, height: 1024 },
		theme: 'Hear',
		body: '4 scatters. The board stays, then 10 free spins.',
		detail: 'Buy Hear No Evil for 250× bet. 4 scatters. The board stays, then 10 free spins.',
		price: config.betModes.bonus_hear.cost,
	},
	{
		id: GAMBLE_BET_MODE_KEY,
		art: 'speakMonkey',
		artSize: { width: 819, height: 1024 },
		theme: 'Gamble',
		body: '50% nothing, 40% Hear No Evil, 10% Monkey Madness.',
		detail:
			'Each spin costs 380× bet. 50% dead spin, 40% 4 scatters (Hear No Evil), 10% 5 scatters (Monkey Madness).',
		price: config.betModes.bonus_gamble.cost,
	},
];

/**
 * Kong Club has six offers, so the menu is two rows of the same 450px card
 * GG uses for its middle and bottom rows. There is no Hunt Spins ladder.
 */
const GRID = [
	[ANTE_BET_MODE_KEY, FEATURE_SPIN_BET_MODE_KEY, PEAK_SPIN_BET_MODE_KEY],
	['bonus_see', 'bonus_hear', GAMBLE_BET_MODE_KEY],
];

export const slotOf = (offer: BonusOffer) => {
	const row = GRID.findIndex((ids) => ids.includes(offer.id));
	return { row, column: GRID[row].indexOf(offer.id), wide: false as const };
};

const tuneArt = (id: string, spot: BonusOffer['artSpot']) => {
	if (!spot) return spot;
	// The bonus mark includes its own lettering, so it sits higher on the confirm card.
	if (id === ANTE_BET_MODE_KEY && spot.confirm) {
		spot.confirm = { ...spot.confirm, scale: (spot.confirm.scale ?? 1) * 0.82, dy: -36 };
	}
	// The gold coin is almost square and was crowding the title.
	if (id === FEATURE_SPIN_BET_MODE_KEY) {
		for (const cut of ['desktop', 'wide', 'mobile'] as const) {
			if (spot[cut]) spot[cut] = { ...spot[cut], scale: (spot[cut]!.scale ?? 1) * 0.78 };
		}
	}
	return spot;
};

export const bonusOffers = (): BonusOffer[] =>
	SEEDS.map((seed) => {
		const volatility = volatilityCaps(volatilityForMode(seed.id));
		return {
			id: seed.id,
			kind: buyBonusCardActionKind(seed.id),
			art: seed.art,
			artSpot: tuneArt(seed.id, spots(seed.artSize.width, seed.artSize.height)),
			backdrop: backdrop(seed.theme),
			tier: volatilityStarCount(volatility),
			title: paytableModeLabel(seed.id),
			body: bonusDescriptionCopy(seed.body),
			detail: bonusDescriptionCopy(seed.detail),
			volatility,
			price: seed.price,
		};
	});

export const stackedOffers = (offers: BonusOffer[]) =>
	[...offers].sort((a, b) => slotOf(a).row - slotOf(b).row || slotOf(a).column - slotOf(b).column);
