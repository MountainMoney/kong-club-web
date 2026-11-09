import config from '../config';
import {
	ANTE_BET_MODE_KEY,
	FEATURE_SPIN_BET_MODE_KEY,
	GAMBLE_BET_MODE_KEY,
	HUNT_BET_MODE_KEY,
	PEAK_SPIN_BET_MODE_KEY,
	RISKY_MYSTERY_BET_MODE_KEY,
	SPEAK_NO_EVIL_TITLE,
	activeHuntLevel,
	formatCostMultiplier,
} from '../betModes';
import {
	buyBonusCardActionKind,
	volatilityCaps,
	volatilityForMode,
	volatilityStarCount,
} from '../buyBonusScreen';
import { bonusDescriptionCopy, paytableModeLabel, type PaytableModeKey } from '../socialCopy';
import { HUNT_LEVELS, huntOddsLine, stateHunt, statePublishedCosts } from '../stateHunt.svelte';
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
	/** Hunt Spins. Level is 1-based. Labels are the bet multipliers, e.g. 2×. */
	slider?: { level: number; levels: number; labels: string[] };
	lettering?: string;
	prop?: { key: string; spot: Partial<Record<CardCut, ArtSpot>> };
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

const times = (cost: number) => `${formatCostMultiplier(cost)}×`;

type OfferSeed = {
	id: string;
	art: string;
	artSize: { width: number; height: number };
	theme: string;
	title?: string;
	body: string;
	detail: string;
	price: number;
	slider?: BonusOffer['slider'];
};

const huntLabels = () => HUNT_LEVELS.map((level) => times(config.betModes[`hunt_${level}`].cost));

const offerSeeds = (): OfferSeed[] => {
	const huntLevel = activeHuntLevel();
	const huntIndex = HUNT_LEVELS.indexOf(huntLevel);
	const ante = config.betModes.base_ante.cost;
	const feature = config.betModes.feature_spin.cost;
	const peak = config.betModes.peak_spin.cost;
	const see = config.betModes.bonus_see.cost;
	const hear = config.betModes.bonus_hear.cost;
	const mystery = config.betModes.bonus_mystery.cost;
	const risky = config.betModes.bonus_risky.cost;
	const hunt = config.betModes[`hunt_${huntLevel}`].cost;
	return [
		{
			id: ANTE_BET_MODE_KEY,
			art: 'ST',
			artSize: { width: 512, height: 512 },
			theme: 'Lobby',
			title: 'Ante',
			body: `Extra Chance. Raises bonus odds for ${times(ante)} bet.`,
			detail: `Stays on until you turn it off. Only one of Ante, Hunt, Feature Spin and Trifecta can be on. Extra Chance costs ${times(ante)} bet and raises the chance of a bonus. The bar fills at 10.`,
			price: ante,
		},
		{
			id: HUNT_BET_MODE_KEY,
			art: 'ST',
			artSize: { width: 512, height: 512 },
			theme: 'Hear',
			title: 'Hunt Spins',
			body: `${times(config.betModes.hunt_2.cost)}–${times(config.betModes.hunt_6.cost)} cost with more exclusive bonus access.`,
			detail: huntOddsLine(huntLevel),
			price: hunt,
			slider: {
				level: huntIndex + 1,
				levels: HUNT_LEVELS.length,
				labels: huntLabels(),
			},
		},
		{
			id: FEATURE_SPIN_BET_MODE_KEY,
			art: 'CG',
			artSize: { width: 983, height: 1024 },
			theme: 'Feature',
			body: 'Every spin lands at least one connection.',
			detail: `Each spin costs ${times(feature)} bet. It is guaranteed to land a connection of any size, or a tumble chain. It cannot trigger a bonus.`,
			price: feature,
		},
		{
			id: PEAK_SPIN_BET_MODE_KEY,
			art: 'monkeyMascot',
			artSize: { width: 662, height: 903 },
			theme: 'Peak',
			body: 'The whole board starts gold. A connection plays one coin game.',
			detail: `Each spin costs ${times(peak)} bet. Every cell starts gold. When the board connects, one coin game plays. It cannot trigger a bonus.`,
			price: peak,
		},
		{
			id: 'bonus_see',
			art: 'seeMonkey',
			artSize: { width: 819, height: 1024 },
			theme: 'See',
			body: '3 scatters. The board clears, then 10 free spins.',
			detail: `Buy See No Evil for ${times(see)} bet. 3 scatters. The board clears, then 10 free spins. The bar fills at 5. Ranks reset after each coin game. 4 scatters during See upgrade to Hear No Evil and add 4 spins.`,
			price: see,
		},
		{
			id: 'bonus_hear',
			art: 'hearMonkey',
			artSize: { width: 819, height: 1024 },
			theme: 'Hear',
			body: '4 scatters. The board stays, then 10 free spins.',
			detail: `Buy Hear No Evil for ${times(hear)} bet. 4 scatters. The board stays, then 10 free spins. Ranks carry. 5 scatters during Hear upgrade to ${SPEAK_NO_EVIL_TITLE} and add 4 spins.`,
			price: hear,
		},
		{
			id: GAMBLE_BET_MODE_KEY,
			art: 'seeMonkey',
			artSize: { width: 819, height: 1024 },
			theme: 'See',
			body: `Guaranteed bonus. 50% See, 45% Hear, 5% ${SPEAK_NO_EVIL_TITLE}.`,
			detail: `Buy Mystery Bonus for ${times(mystery)} bet. You always enter a bonus: 50% See No Evil, 45% Hear No Evil, 5% ${SPEAK_NO_EVIL_TITLE}. Direct ${SPEAK_NO_EVIL_TITLE} pays at least 1,000×.`,
			price: mystery,
		},
		{
			id: RISKY_MYSTERY_BET_MODE_KEY,
			art: 'speakMonkey',
			artSize: { width: 819, height: 1024 },
			theme: 'Gamble',
			title: 'Risky Mystery',
			body: `50% nothing, 40% Hear No Evil, 10% ${SPEAK_NO_EVIL_TITLE}.`,
			detail: `Buy Risky Mystery Bonus for ${times(risky)} bet. 50% dead spin, 40% Hear No Evil, 10% ${SPEAK_NO_EVIL_TITLE}. Direct ${SPEAK_NO_EVIL_TITLE} pays at least 1,000×.`,
			price: risky,
		},
	];
};

/**
 * Mystery and the big buys sit on the top row. Ante and Hunt are the wide
 * modifier row underneath. Only one toggle is on at a time.
 */
const GRID: { ids: string[]; wide: boolean }[] = [
	{ ids: [GAMBLE_BET_MODE_KEY, RISKY_MYSTERY_BET_MODE_KEY, 'bonus_hear'], wide: false },
	{ ids: ['bonus_see', FEATURE_SPIN_BET_MODE_KEY, PEAK_SPIN_BET_MODE_KEY], wide: false },
	{ ids: [ANTE_BET_MODE_KEY, HUNT_BET_MODE_KEY], wide: true },
];

export const slotOf = (offer: BonusOffer) => {
	const row = GRID.findIndex((entry) => entry.ids.includes(offer.id));
	const entry = GRID[row];
	return { row, column: entry.ids.indexOf(offer.id), wide: entry.wide };
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

export const bonusOffers = (): BonusOffer[] => {
	// Re-read when the slider moves or published costs arrive.
	void stateHunt.level;
	void statePublishedCosts.revision;
	return offerSeeds().map((seed) => {
		const measured = volatilityForMode(seed.id);
		const volatility = measured ? volatilityCaps(measured) : '';
		const modeKey = seed.id === HUNT_BET_MODE_KEY ? undefined : (seed.id as PaytableModeKey);
		return {
			id: seed.id,
			kind: seed.id === HUNT_BET_MODE_KEY ? 'activate' : buyBonusCardActionKind(seed.id),
			art: seed.art,
			artSpot: tuneArt(seed.id, spots(seed.artSize.width, seed.artSize.height)),
			backdrop: backdrop(seed.theme),
			tier: measured ? volatilityStarCount(measured) : 0,
			title: seed.title ?? (modeKey ? paytableModeLabel(modeKey) : seed.id),
			body: bonusDescriptionCopy(seed.body),
			detail: bonusDescriptionCopy(seed.detail),
			volatility,
			price: seed.price,
			slider: seed.slider,
		};
	});
};

export const stackedOffers = (offers: BonusOffer[]) =>
	[...offers].sort((a, b) => slotOf(a).row - slotOf(b).row || slotOf(a).column - slotOf(b).column);
