import { isSpeakBonusState } from './bonusState';

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
		description:
			'The board clears. The bar fills at 5.\nRanks reset after each coin game.\n4 scatters upgrade to Hear and add 4 spins.',
	},
	2: {
		tier: 2,
		title: 'HEAR NO EVIL',
		description:
			'The board stays. The bar fills at 5.\nRanks carry through the bonus.\n5 scatters upgrade to Speak No Evil and add 4 spins.',
	},
	3: {
		tier: 3,
		title: 'SPEAK NO EVIL',
		description:
			'The bar is full every spin and fades rainbow.\nOne coin game every spin. Ranks carry.\nDirect entry pays at least 1,000×.',
	},
};

export const bonusIntroContentForTier = (tier: number | undefined): BonusIntroContent => {
	if (tier === 3) return BONUS_INTRO_BY_TIER[3];
	if (tier === 1) return BONUS_INTRO_BY_TIER[1];
	return BONUS_INTRO_BY_TIER[2];
};

/** Map `kongClubMode.state` (e.g. `organic_bonus_hear`) to intro tier. */
export const bonusTierFromModeState = (state: string | undefined): MonkeyBonusTier => {
	if (isSpeakBonusState(state)) return 3;
	if (state?.includes('hear')) return 2;
	if (state?.includes('see')) return 1;
	return 2;
};

export const bonusIntroSpinsLabel = (totalFreeSpins: number) => `${totalFreeSpins} FREE SPINS`;
