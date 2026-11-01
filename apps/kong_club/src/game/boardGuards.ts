import type { MonkeyBonusTier } from './bonusIntroContent';

export const clampBonusTier = (tier: number | undefined): MonkeyBonusTier => {
	if (tier === 3) return 3;
	if (tier === 2) return 2;
	return 2;
};
