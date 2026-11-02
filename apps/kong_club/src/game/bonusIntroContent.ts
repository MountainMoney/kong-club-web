import { isSocialMode } from './socialCopy';

export type MonkeyBonusTier = 1 | 2 | 3;

export type BonusIntroContent = {
	tier: MonkeyBonusTier;
	title: string;
	description: string;
};

export const BONUS_INTRO_BY_TIER: Record<MonkeyBonusTier, BonusIntroContent> = {
	1: {
		tier: 1,
		title: 'SEE NO EVIL',
		description: 'The board clears. Progress bar fills 1 per connection.\nTiles persist. Coin game at 5/5.',
	},
	2: {
		tier: 2,
		title: 'HEAR NO EVIL',
		description: 'The board stays. Progress bar fills 1 per connection.\nTiles persist. One coin game per spin.',
	},
	3: {
		tier: 3,
		title: 'MONKEY MADNESS',
		description: 'Coin game every spin.\nTiles go silver then gold (no bronze). Tiles persist.',
	},
};

export const bonusIntroContentForTier = (tier: number | undefined): BonusIntroContent => {
	const content =
		tier === 3 ? BONUS_INTRO_BY_TIER[3] : tier === 1 ? BONUS_INTRO_BY_TIER[1] : BONUS_INTRO_BY_TIER[2];
	if (!isSocialMode()) return content;
	return {
		...content,
		description: content.description.replace(/\bspin\b/gi, 'play'),
	};
};

/** Map `kongClubMode.state` (e.g. `organic_bonus_hear`) to intro tier. */
export const bonusTierFromModeState = (state: string | undefined): MonkeyBonusTier => {
	if (state?.includes('madness')) return 3;
	if (state?.includes('hear')) return 2;
	if (state?.includes('see')) return 1;
	return 2;
};

export const bonusIntroSpinsLabel = (totalFreeSpins: number) =>
	isSocialMode() ? `${totalFreeSpins} FREE GAMES` : `${totalFreeSpins} FREE SPINS`;
