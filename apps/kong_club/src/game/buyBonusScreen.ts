import { stateMeta } from 'state-shared';

import {
	ANTE_BET_MODE_KEY,
	FEATURE_SPIN_BET_MODE_KEY,
	extraChanceCostLabel,
	isActivateBetMode,
	isGambleBuyBetMode,
} from './betModes';
import config from './config';
import {
	BUY_BONUS_CARD_GAP,
	BUY_BONUS_CARD_W,
	buyBonusCardHeight,
	buyBonusCardStyleVars,
	buyBonusPortraitConfirmWidth,
	buyBonusPortraitListWidth,
	type BuyBonusCardSizeOpts,
} from './buyBonusScreenLayout';

export {
	BUY_BONUS_BLUR_PX,
	BUY_BONUS_BET_BLOCK_GAP,
	BUY_BONUS_CARD_GAP,
	BUY_BONUS_CARD_PAD,
	BUY_BONUS_CARD_PAD_TOP_EXTRA,
	BUY_BONUS_CARD_RADIUS_PX,
	BUY_BONUS_CARD_W,
	BUY_BONUS_CARD_CONFIRM_W,
	BUY_BONUS_CLOSE_INSET,
	BUY_BONUS_CLOSE_SIZE,
	BUY_BONUS_CLUSTER_MAX_W,
	BUY_BONUS_DESC_H,
	BUY_BONUS_HERO_TROPHY_RATIO,
	BUY_BONUS_IMAGE_H,
	BUY_BONUS_IMAGE_VOL_GAP,
	BUY_BONUS_LIST_ACTION_W,
	BUY_BONUS_LIST_ICON_BOX_H,
	BUY_BONUS_LIST_ICON_BOX_W,
	BUY_BONUS_LIST_ROW_GAP,
	BUY_BONUS_OVERLAY_OPACITY,
	BUY_BONUS_PORTRAIT_CARD_GAP,
	BUY_BONUS_PORTRAIT_CARD_W,
	BUY_BONUS_PORTRAIT_COMPACT_SCALE,
	BUY_BONUS_PORTRAIT_CONFIRM_H_PAD,
	BUY_BONUS_PORTRAIT_CONFIRM_MAX_W,
	BUY_BONUS_PORTRAIT_CONFIRM_MIN_W,
	BUY_BONUS_PORTRAIT_BTN_MIN_H,
	BUY_BONUS_PORTRAIT_SHEET_REF_W,
	BUY_BONUS_REF_H,
	BUY_BONUS_REF_W,
	BUY_BONUS_BODY_COLOR,
	BUY_BONUS_BODY_PX,
	BUY_BONUS_BTN_PX,
	BUY_BONUS_PRICE_PX,
	BUY_BONUS_SECTION_GAP,
	BUY_BONUS_TITLE_PX,
	buyBonusCardHeight,
	buyBonusCardStyleVars,
	buyBonusPortraitConfirmWidth,
	buyBonusPortraitListWidth,
	type BuyBonusCardSizeOpts,
} from './buyBonusScreenLayout';

export type BuyBonusIconLayout =
	| { kind: 'composite' }
	| { kind: 'scatter'; count: number }
	| { kind: 'extraChance' }
	| { kind: 'featureSpin' }
	| { kind: 'summitSpin' }
	| { kind: 'mysteryBonus' };

export type BuyBonusCardDef = {
	mode: string;
	title: string;
	description: string;
	imageSrc: string;
	iconLayout: BuyBonusIconLayout;
	volatility: string;
	buttonColor: string;
};

/**
 * Weighted standard deviation of payout, in base-bet multiples, from the
 * 250k-sim publish LUTs (math-sdk stake_sim_report.json, std_payout_x).
 * Bands: Low < 50, Medium < 200, High < 1000, Very High >= 1000.
 */
const MEASURED_PAYOUT_STD: Record<string, number> = {
	base_ante: 37.23,
	feature_spin: 135.0,
	peak_spin: 1463.12,
	bonus_see: 398.66,
	bonus_hear: 546.97,
	bonus_pick: 4468.38,
};

export const volatilityLabelFromStd = (std: number): string => {
	if (std < 50) return 'Volatility: Low';
	if (std < 200) return 'Volatility: Medium';
	if (std < 1000) return 'Volatility: High';
	return 'Volatility: Very High';
};

export const volatilityForMode = (mode: string): string =>
	volatilityLabelFromStd(MEASURED_PAYOUT_STD[mode === 'bonus_gamble' ? 'bonus_pick' : mode] ?? 0);

/** GG-style star row: Low 2, Medium 3, High 4, Very High 5. */
export const volatilityStarCount = (label: string) => {
	if (/very high/i.test(label)) return 5;
	if (/high/i.test(label)) return 4;
	if (/medium/i.test(label)) return 3;
	return 2;
};

export const volatilityCaps = (label: string) =>
	`${label
		.replace(/^volatility:\s*/i, '')
		.trim()
		.toUpperCase()} VOLATILITY`;

export const BUY_BONUS_CARDS: BuyBonusCardDef[] = [
	{
		mode: ANTE_BET_MODE_KEY,
		title: 'EXTRA CHANCE',
		description: `Double the base bonus chance: about 1 in 130 spins instead of about 1 in 260, for ${extraChanceCostLabel()} base bet.`,
		imageSrc: '/assets/sprites/monkeySymbols/ST.png',
		iconLayout: { kind: 'extraChance' },
		volatility: volatilityForMode(ANTE_BET_MODE_KEY),
		buttonColor: '#FFE14A',
	},
	{
		mode: 'feature_spin',
		title: 'FEATURE SPIN',
		description: `Each spin costs ${config.betModes.feature_spin.cost}× bet with the Progress Bar filled. Every spin lands a 5+ cluster, then the coin game after tumbles stop.`,
		imageSrc: '/assets/sprites/monkeySymbols/CG.png',
		iconLayout: { kind: 'featureSpin' },
		volatility: volatilityForMode('feature_spin'),
		buttonColor: '#7DFF6A',
	},
	{
		mode: 'peak_spin',
		title: 'TRIFECTA SPIN',
		description: `Each spin costs ${config.betModes.peak_spin.cost}× bet. The whole board starts Gold. After it lands the bar fills. It can dump, or hit full and play the coin game.`,
		imageSrc: '/assets/sprites/monkeySymbols/CG.png',
		iconLayout: { kind: 'summitSpin' },
		volatility: volatilityForMode('peak_spin'),
		buttonColor: '#FFD500',
	},
	{
		mode: 'bonus_see',
		title: 'SEE NO EVIL',
		description: `Buy the See No Evil bonus for ${config.betModes.bonus_see.cost}× bet. 3 scatters. The board clears, then 10 free spins.`,
		imageSrc: '/assets/sprites/monkeySymbols/ST.png',
		iconLayout: { kind: 'scatter', count: 3 },
		volatility: volatilityForMode('bonus_see'),
		buttonColor: '#5EE7FF',
	},
	{
		mode: 'bonus_hear',
		title: 'HEAR NO EVIL',
		description: `Buy the Hear No Evil bonus for ${config.betModes.bonus_hear.cost}× bet. 4 scatters. The board stays, then 10 free spins.`,
		imageSrc: '/assets/sprites/monkeySymbols/ST.png',
		iconLayout: { kind: 'scatter', count: 4 },
		volatility: volatilityForMode('bonus_hear'),
		buttonColor: '#FF8A3D',
	},
	{
		mode: 'bonus_pick',
		title: 'MYSTERY BONUS',
		description: `Each spin costs ${config.betModes.bonus_pick.cost}× bet. 50% dead spin, 45% 4 scatters (Hear No Evil), 5% 5 scatters (Monkey Madness).`,
		imageSrc: '/assets/sprites/monkeySymbols/ST.png',
		iconLayout: { kind: 'scatter', count: 5 },
		volatility: volatilityForMode('bonus_pick'),
		buttonColor: '#FF5AD1',
	},
];

export const BUY_BONUS_GRID_COLS = 3;
export const BUY_BONUS_GROUP_W =
	BUY_BONUS_CARD_W * BUY_BONUS_GRID_COLS + BUY_BONUS_CARD_GAP * (BUY_BONUS_GRID_COLS - 1);
export const BUY_BONUS_GROUP_H =
	(buyBonusCardHeight(BUY_BONUS_CARD_W, { showDescription: false }) ?? 0) * 2 + BUY_BONUS_CARD_GAP;

export const buyBonusCardByMode = (mode: string) => BUY_BONUS_CARDS.find((c) => c.mode === mode);

export const buyBonusModeCostMultiplier = (mode: string) =>
	stateMeta.betModeMeta?.[mode]?.costMultiplier ?? 1;

export { isActivateBetMode };

/** Feature and TRIFECTA stay on. See, Hear, and Gamble are scatter buys. */
export const buyBonusCardActionKind = (mode: string): 'buy' | 'activate' => {
	if (isGambleBuyBetMode(mode)) return 'buy';
	return isActivateBetMode(mode) ? 'activate' : 'buy';
};

export const BUY_BONUS_MENU_PREFETCH = [
	'/assets/sprites/monkeySymbols/ST.png',
	'/assets/sprites/monkeySymbols/CL.png',
	'/assets/sprites/monkeySymbols/XM_red.png',
	'/assets/sprites/monkeySymbols/CG.png',
	'/assets/sprites/monkeySymbols/CB.png',
	'/assets/sprites/monkeySymbols/CS.png',
] as const;
