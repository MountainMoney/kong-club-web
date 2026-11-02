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
import {
	bonusDescriptionCopy,
	isSocialMode,
	paytableModeLabel,
	type PaytableModeKey,
} from '../socialCopy';
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
	/** Optional prop drawn behind the hero. No current offer sets this. */
	prop?: {
		key: string;
		spot: Partial<Record<CardCut, ArtSpot>>;
	};
	/** Optional title sprite. Offers without it render `title` as text. */
	lettering?: string;
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
	/** Social-mode lines. Written out so restricted words are not left to a rewrite. */
	socialBody?: string;
	socialDetail?: string;
	price: number;
};

const SEEDS: OfferSeed[] = [
	{
		id: ANTE_BET_MODE_KEY,
		art: 'ST',
		artSize: { width: 512, height: 512 },
		theme: 'Lobby',
		body: 'About 1 in 130 spins instead of about 1 in 260.',
		socialBody: 'About 1 in 130 plays instead of about 1 in 260.',
		detail:
			'Stays on for every spin until you turn it off. Doubles the base bonus chance for 1.4× bet.',
		socialDetail: 'Stays on for every play until you turn it off. Doubles the chance for 1.4× play amount.',
		price: config.betModes.base_ante.cost,
	},
	{
		id: FEATURE_SPIN_BET_MODE_KEY,
		art: 'CG',
		artSize: { width: 983, height: 1024 },
		theme: 'Feature',
		body: 'The progress bar starts full. Not every spin lands a 5+ cluster.',
		socialBody: 'The progress bar starts full. Not every play lands a 5+ cluster.',
		detail:
			'Each spin costs 65× bet. The bar starts full. 56% of spins have no 5+ cluster and no scatter. The rest tumble, then the coin game plays.',
		socialDetail:
			'Each play is 65× play amount. The bar starts full. 56% of plays have no 5+ cluster and no scatter. The rest tumble, then the coin game plays.',
		price: config.betModes.feature_spin.cost,
	},
	{
		id: PEAK_SPIN_BET_MODE_KEY,
		art: 'monkeyMascot',
		artSize: { width: 662, height: 903 },
		theme: 'Peak',
		body: '72% pay nothing. The rest light every cell gold and play the coin game.',
		socialBody: '72% win nothing. The rest light every cell gold and play the coin game.',
		detail:
			'Each spin costs 1,400× bet. 72% pay nothing. The rest light every cell gold and play the coin game with gold coin faces.',
		socialDetail:
			'Each play is 1,400× play amount. 72% win nothing. The rest light every cell gold and play the coin game with gold coin faces.',
		price: config.betModes.peak_spin.cost,
	},
	{
		id: 'bonus_see',
		art: 'seeMonkey',
		artSize: { width: 819, height: 1024 },
		theme: 'See',
		body: '3 scatters. The board clears, then 10 free spins.',
		socialBody: '3 scatters. The board clears, then 10 free games.',
		detail: 'Buy See No Evil for 115× bet. 3 scatters. The board clears, then 10 free spins.',
		socialDetail:
			'Play See No Evil for 115× play amount. 3 scatters. The board clears, then 10 free games.',
		price: config.betModes.bonus_see.cost,
	},
	{
		id: 'bonus_hear',
		art: 'hearMonkey',
		artSize: { width: 819, height: 1024 },
		theme: 'Hear',
		body: '4 scatters. The board stays, then 10 free spins. One coin game per free spin.',
		socialBody: '4 scatters. The board stays, then 10 free games. One coin game per play.',
		detail:
			'Buy Hear No Evil for 250× bet. 4 scatters. The board stays, then 10 free spins. One coin game per free spin.',
		socialDetail:
			'Play Hear No Evil for 250× play amount. 4 scatters. The board stays, then 10 free games. One coin game per play.',
		price: config.betModes.bonus_hear.cost,
	},
	{
		id: GAMBLE_BET_MODE_KEY,
		art: 'speakMonkey',
		artSize: { width: 819, height: 1024 },
		// Backdrop keys are ggBg*Gamble. The card title comes from paytableModeLabel.
		theme: 'Gamble',
		body: '50% nothing, 45% Hear No Evil, 5% Monkey Madness.',
		socialBody: '50% nothing, 45% Hear No Evil, 5% Monkey Madness.',
		detail:
			'Each spin costs 380× bet. 50% dead spin, 45% 4 scatters (Hear No Evil), 5% 5 scatters (Monkey Madness).',
		socialDetail:
			'Each play is 380× play amount. 50% nothing, 45% 4 scatters (Hear No Evil), 5% 5 scatters (Monkey Madness).',
		price: config.betModes.bonus_pick.cost,
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
	// The real-money scatter includes the word BONUS, so it sits higher on the confirm card.
	if (id === ANTE_BET_MODE_KEY && spot.confirm && !isSocialMode()) {
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
			art: seed.id === ANTE_BET_MODE_KEY && isSocialMode() ? 'STSocial' : seed.art,
			artSpot: tuneArt(seed.id, spots(seed.artSize.width, seed.artSize.height)),
			backdrop: backdrop(seed.theme),
			tier: volatilityStarCount(volatility),
			title: paytableModeLabel(seed.id),
			body:
				isSocialMode() && seed.socialBody ? seed.socialBody : bonusDescriptionCopy(seed.body),
			detail:
				isSocialMode() && seed.socialDetail
					? seed.socialDetail
					: bonusDescriptionCopy(seed.detail),
			volatility,
			price: seed.price,
		};
	});

export const stackedOffers = (offers: BonusOffer[]) =>
	[...offers].sort((a, b) => slotOf(a).row - slotOf(b).row || slotOf(a).column - slotOf(b).column);
