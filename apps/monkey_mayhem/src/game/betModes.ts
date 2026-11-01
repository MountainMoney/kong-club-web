import { stateBet, stateMeta, type BetModeMeta } from 'state-shared';

import config from './config';
import { eventEmitter } from './eventEmitter';

const assets = {
	icon: '',
	volatility: '',
	button: '',
	dialogImage: '',
	dialogVolatility: '',
};

function modeEntry(
	key: string,
	opts: {
		type: 'default' | 'activate' | 'buy';
		costMultiplier: number;
		title: string;
		button: string;
		parent?: string;
		description?: string;
	},
): [string, BetModeMeta[string]] {
	return [
		key,
		{
			mode: key,
			costMultiplier: opts.costMultiplier,
			type: opts.type,
			parent: opts.parent ?? '',
			children: '',
			maxWin: config.betModes.base.max_win,
			assets,
			text: {
				title: opts.title,
				dialog: opts.description ?? opts.title,
				button: opts.button,
				tickerIdle: opts.title,
				tickerSpin: opts.title,
				betAmountLabel: 'Cost',
				...(opts.description ? { description: opts.description } : {}),
			},
		},
	];
}

export const FOOTBALL_DEFAULT_BET_MODE_KEY = 'base';
export const ANTE_BET_MODE_KEY = 'base_ante';
export const FEATURE_SPIN_BET_MODE_KEY = 'feature_spin';
export const PEAK_SPIN_BET_MODE_KEY = 'peak_spin';
export const GAMBLE_BET_MODE_KEY = 'bonus_gamble';
/** Player-facing name. Math / RGS key stays `peak_spin`. */
export const SUMMIT_SPIN_LABEL = 'SUMMIT';
export const SUMMIT_SPIN_TITLE = 'SUMMIT SPIN';

/** Progress bar steps — keep in sync with math `progress_thresholds`. */
export const PROGRESS_THRESHOLD_BASE = 5;
export const PROGRESS_THRESHOLD_FEATURE = 5;
/** Matches math `progress_thresholds.peak_spin`. Bar teases after land; hit rate still matches tumble activations. */
export const PROGRESS_THRESHOLD_PEAK = 1;
export const PROGRESS_THRESHOLD_SEE = 5;

const formatCostMultiplier = (cost: number) => {
	const rounded = Math.round(cost * 100) / 100;
	return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

/** Toolbar / buy-screen cost label for Extra Chance (matches math cost). */
export const extraChanceCostLabel = () =>
	`${formatCostMultiplier(config.betModes.base_ante.cost)}×`;

/** Persists across spins until the player toggles off (Extra Chance, Feature Spin, Gamble). */
export const ACTIVATE_BET_MODE_KEYS = [
	ANTE_BET_MODE_KEY,
	FEATURE_SPIN_BET_MODE_KEY,
	PEAK_SPIN_BET_MODE_KEY,
	GAMBLE_BET_MODE_KEY,
] as const;

export type ActivateBetModeKey = (typeof ACTIVATE_BET_MODE_KEYS)[number];

/** One-shot purchased bonuses — reset to base after the round completes. */
export const ONE_SHOT_BUY_MODE_KEYS = ['bonus_see', 'bonus_hear'] as const;

export type OneShotBuyModeKey = (typeof ONE_SHOT_BUY_MODE_KEYS)[number];

export function normalizeLegacyBetModeKey(key: string): string {
	const trimmed = (key ?? '').trim();
	if (!trimmed) return FOOTBALL_DEFAULT_BET_MODE_KEY;

	const upper = trimmed.toUpperCase();
	if (upper === 'BASE') return FOOTBALL_DEFAULT_BET_MODE_KEY;

	const lower = trimmed.toLowerCase();
	const canonicalKeys = [
		FOOTBALL_DEFAULT_BET_MODE_KEY,
		...ACTIVATE_BET_MODE_KEYS,
		...ONE_SHOT_BUY_MODE_KEYS,
	] as const;

	for (const canonical of canonicalKeys) {
		if (canonical === lower || canonical.toUpperCase() === upper) {
			return canonical;
		}
	}

	if (stateMeta.betModeMeta?.[lower]) return lower;

	return FOOTBALL_DEFAULT_BET_MODE_KEY;
}

const betModeMetaForKey = (key: string) => {
	const normalized = normalizeLegacyBetModeKey(key);
	return stateMeta.betModeMeta?.[normalized];
};

export const isActivateBetMode = (mode: string): mode is ActivateBetModeKey =>
	(ACTIVATE_BET_MODE_KEYS as readonly string[]).includes(normalizeLegacyBetModeKey(mode) as ActivateBetModeKey);

export const isOneShotBuyBetMode = (key: string): key is OneShotBuyModeKey =>
	(ONE_SHOT_BUY_MODE_KEYS as readonly string[]).includes(
		normalizeLegacyBetModeKey(key) as OneShotBuyModeKey,
	);

/** Hear/See buy synthesizes its own ST land. Actor preSpin races that. Gamble is activate — actor preSpins. */
export const shouldSkipActorPreSpin = (key: string = stateBet.activeBetModeKey) =>
	isOneShotBuyBetMode(key);

export const isGambleBuyBetMode = (key: string) =>
	normalizeLegacyBetModeKey(key) === GAMBLE_BET_MODE_KEY;

export const isFeatureSpinBetMode = (key: string) =>
	normalizeLegacyBetModeKey(key) === FEATURE_SPIN_BET_MODE_KEY;

export const isPeakSpinBetMode = (key: string) =>
	normalizeLegacyBetModeKey(key) === PEAK_SPIN_BET_MODE_KEY;

/** Feature / PEAK sit on the last coin board until the next spin (Le Bandit). */
export const isHeldFeatureBoardMode = (key: string) =>
	isFeatureSpinBetMode(key) || isPeakSpinBetMode(key);

export const isExtraChanceBetMode = (key: string) =>
	normalizeLegacyBetModeKey(key) === ANTE_BET_MODE_KEY;

export const isToggleFeatureBetMode = (key: string): key is ActivateBetModeKey =>
	isActivateBetMode(key);

/** @deprecated Use isOneShotBuyBetMode — kept for call sites that gate one-shot buys. */
export const isBuyFeatureBetMode = (key: string): key is OneShotBuyModeKey =>
	isOneShotBuyBetMode(key);

export const activateModeCostMultiplier = (mode: ActivateBetModeKey | string) => {
	const normalized = normalizeLegacyBetModeKey(mode);
	const meta = betModeMetaForKey(normalized);
	if (meta?.costMultiplier) return meta.costMultiplier;
	if (normalized === ANTE_BET_MODE_KEY) return config.betModes.base_ante.cost;
	if (normalized === FEATURE_SPIN_BET_MODE_KEY) return config.betModes.feature_spin.cost;
	if (normalized === PEAK_SPIN_BET_MODE_KEY) return config.betModes.peak_spin.cost;
	if (normalized === GAMBLE_BET_MODE_KEY) return config.betModes.bonus_gamble.cost;
	return 1;
};

export const activateModeCost = (mode: ActivateBetModeKey) =>
	stateBet.betAmount * activateModeCostMultiplier(mode);

/** True when the current denomination can cover the activate-mode spin cost. */
export const canAffordActivateMode = (mode: ActivateBetModeKey) => {
	const cost = activateModeCost(mode);
	return stateBet.betAmount > 0 && cost > 0 && cost <= stateBet.balanceAmount;
};

/** True when a candidate denomination can cover the activate-mode spin cost. */
export const canAffordActivateModeAtBet = (mode: ActivateBetModeKey, betAmount: number) => {
	const mult = activateModeCostMultiplier(mode);
	const cost = betAmount * mult;
	return betAmount > 0 && cost > 0 && cost <= stateBet.balanceAmount;
};

/** Drop activate toggles when balance or denomination no longer covers their cost. */
export const syncActivateModeToBalance = () => {
	if (
		isToggleFeatureBetMode(stateBet.activeBetModeKey) &&
		!canAffordActivateMode(stateBet.activeBetModeKey)
	) {
		stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
		notifyBetModeMusic(FOOTBALL_DEFAULT_BET_MODE_KEY);
	}
};

/** Return to base when a buy-bonus entry is aborted before the wager starts. */
export const abortBuyBonusEntry = () => {
	stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
};

export const buyModeCostMultiplier = (mode: string) => {
	const normalized = normalizeLegacyBetModeKey(mode);
	const meta = betModeMetaForKey(normalized);
	if (meta?.costMultiplier) return meta.costMultiplier;
	if (normalized === 'bonus_see') return config.betModes.bonus_see.cost;
	if (normalized === 'bonus_hear') return config.betModes.bonus_hear.cost;
	if (normalized === 'bonus_gamble') return config.betModes.bonus_gamble.cost;
	return 1;
};

export const oneShotBuyModeCost = (mode: OneShotBuyModeKey) =>
	stateBet.betAmount * buyModeCostMultiplier(mode);

/** See/Hear buys reset to base. Gamble / ante / Feature / PEAK stay on. */
export const resetActiveBetModeAfterBuyFeature = () => {
	if (isOneShotBuyBetMode(stateBet.activeBetModeKey)) {
		stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
	}
};

const syncProgressBarForActiveMode = (mode: string) => {
	const normalized = normalizeLegacyBetModeKey(mode);
	if (normalized === FEATURE_SPIN_BET_MODE_KEY) {
		eventEmitter.broadcast({
			type: 'monkeyProgressUpdate',
			payload: {
				index: 0,
				type: 'progressFill',
				value: PROGRESS_THRESHOLD_FEATURE,
				threshold: PROGRESS_THRESHOLD_FEATURE,
				mode: FEATURE_SPIN_BET_MODE_KEY,
				activationCount: 0,
			},
		});
		return;
	}
	if (normalized === PEAK_SPIN_BET_MODE_KEY) {
		eventEmitter.broadcast({
			type: 'monkeyProgressUpdate',
			payload: {
				index: 0,
				type: 'progressFill',
				value: 0,
				threshold: PROGRESS_THRESHOLD_PEAK,
				mode: PEAK_SPIN_BET_MODE_KEY,
				activationCount: 0,
			},
		});
		return;
	}
	eventEmitter.broadcast({
		type: 'monkeyProgressUpdate',
		payload: {
			index: 0,
			type: 'progressFill',
			value: 0,
			threshold: PROGRESS_THRESHOLD_BASE,
			mode: normalized,
			activationCount: 0,
		},
	});
};

const notifyBetModeMusic = (betModeKey: string) => {
	eventEmitter.broadcast({ type: 'soundBetMode', betModeKey });
};

export const activateToggleBetMode = (mode: ActivateBetModeKey) => {
	if (!canAffordActivateMode(mode)) return false;
	stateBet.activeBetModeKey = mode;
	syncProgressBarForActiveMode(mode);
	notifyBetModeMusic(mode);
	return true;
};

export const deactivateToggleBetModes = () => {
	if (isToggleFeatureBetMode(stateBet.activeBetModeKey)) {
		stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
		syncProgressBarForActiveMode(FOOTBALL_DEFAULT_BET_MODE_KEY);
		notifyBetModeMusic(FOOTBALL_DEFAULT_BET_MODE_KEY);
	}
};

/** Assign active bet mode after normalizing legacy / uppercase RGS keys. */
export const setActiveBetModeKey = (key: string) => {
	stateBet.activeBetModeKey = normalizeLegacyBetModeKey(key);
};

/** Normalize active bet mode + betToResume.mode before resume playback or cost lookup. */
export const normalizeResumeBetState = () => {
	const betToResume = stateBet.betToResume;
	if (betToResume?.mode) {
		const normalizedMode = normalizeLegacyBetModeKey(betToResume.mode);
		stateBet.activeBetModeKey = normalizedMode;
		if (betToResume.mode !== normalizedMode) {
			stateBet.betToResume = { ...betToResume, mode: normalizedMode };
		}
	} else {
		setActiveBetModeKey(stateBet.activeBetModeKey);
	}
	syncActivateModeToBalance();
};

/** Normalize auth + resume bet mode fields once bet mode meta is registered. */
export const normalizeAuthResumeBetState = () => {
	normalizeResumeBetState();
};

let monkeyMayhemBetModesInitialized = false;

export function initMonkeyMayhemBetModes() {
	if (!monkeyMayhemBetModesInitialized) {
		const meta: BetModeMeta = Object.fromEntries([
			modeEntry('base', { type: 'default', costMultiplier: 1, title: 'Base', button: 'Base' }),
			modeEntry('base_ante', {
				type: 'activate',
				costMultiplier: config.betModes.base_ante.cost,
				title: `Extra Chance (${config.betModes.base_ante.cost}×)`,
				button: 'Ante',
				parent: 'base',
			}),
			modeEntry('feature_spin', {
				type: 'activate',
				costMultiplier: config.betModes.feature_spin.cost,
				title: `Feature Spin (${config.betModes.feature_spin.cost}×)`,
				button: 'Feature',
				parent: 'base',
				description: 'Each spin starts with a filled Progress Bar. Clusters tumble in and light tiles as they win.',
			}),
			modeEntry('peak_spin', {
				type: 'activate',
				costMultiplier: config.betModes.peak_spin.cost,
				title: `${SUMMIT_SPIN_TITLE} (${config.betModes.peak_spin.cost}×)`,
				button: SUMMIT_SPIN_LABEL,
				parent: 'base',
				description:
					'Each spin costs 1000× bet. The whole board starts Gold. After it lands the bar fills — it can dump, or hit full and play the coin game.',
			}),
			modeEntry('bonus_see', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_see.cost,
				title: `See No Evil (${config.betModes.bonus_see.cost}×)`,
				button: 'Buy',
			}),
			modeEntry('bonus_hear', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_hear.cost,
				title: `Hear No Evil (${config.betModes.bonus_hear.cost}×)`,
				button: 'Buy',
			}),
			modeEntry('bonus_gamble', {
				type: 'activate',
				costMultiplier: config.betModes.bonus_gamble.cost,
				title: `Gamble (${config.betModes.bonus_gamble.cost}×)`,
				button: 'Activate',
				parent: 'base',
				description:
					'Each spin costs 100× bet. 50% dead spin, 40% Hear No Evil, 10% Monkey Madness.',
			}),
		]);
		stateMeta.betModeMeta = meta;
		monkeyMayhemBetModesInitialized = true;
	}

	normalizeAuthResumeBetState();
	syncActivateModeToBalance();
}
