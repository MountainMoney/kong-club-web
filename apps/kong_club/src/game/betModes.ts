import { stateBet, stateMeta, type BetModeMeta } from 'state-shared';

import config from './config';
import { eventEmitter } from './eventEmitter';
import {
	huntLevelFromModeKey,
	huntModeKeyFor,
	isHuntLevel,
	stateHunt,
	statePublishedCosts,
	type HuntLevel,
} from './stateHunt.svelte';

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
/** Math publish key. Player-facing name stays Mystery Bonus. */
export const GAMBLE_BET_MODE_KEY = 'bonus_pick';
export const RISKY_MYSTERY_BET_MODE_KEY = 'bonus_risky';
export const HUNT_BET_MODE_KEY = 'hunt';
/** Player-facing name. Math / RGS key stays `peak_spin`. */
export const SUMMIT_SPIN_LABEL = 'TRIFECTA';
export const SUMMIT_SPIN_TITLE = 'TRIFECTA SPIN';
export const SPEAK_NO_EVIL_TITLE = 'Speak No Evil';

/**
 * Idle bar length before a book event arrives.
 * Base, Ante and Hunt fill at 10. Bonuses fill at 5.
 * A book's own `progressFill.threshold` still wins during playback.
 */
export const PROGRESS_THRESHOLD_BASE = 10;
export const PROGRESS_THRESHOLD_ANTE = 10;
export const PROGRESS_THRESHOLD_HUNT = 10;
export const PROGRESS_THRESHOLD_FEATURE = 10;
/** Trifecta: one connection plays the coin game. The bar teases, then hits or dumps. */
export const PROGRESS_THRESHOLD_PEAK = 1;
export const PROGRESS_THRESHOLD_SEE = 5;
export const PROGRESS_THRESHOLD_BONUS = 5;

export const formatCostMultiplier = (cost: number) => {
	const rounded = Math.round(cost * 10000) / 10000;
	if (Number.isInteger(rounded)) return `${rounded}`;
	return rounded.toFixed(4).replace(/\.?0+$/, '');
};

/** Toolbar / buy-screen cost label for Extra Chance (matches math cost). */
export const extraChanceCostLabel = () =>
	`${formatCostMultiplier(config.betModes.base_ante.cost)}×`;

/** Persists across spins until the player toggles another one on, or off. Only one at a time. */
export const ACTIVATE_BET_MODE_KEYS = [
	ANTE_BET_MODE_KEY,
	'hunt_2',
	'hunt_3',
	'hunt_4',
	'hunt_5',
	FEATURE_SPIN_BET_MODE_KEY,
	PEAK_SPIN_BET_MODE_KEY,
] as const;

export type ActivateBetModeKey = (typeof ACTIVATE_BET_MODE_KEYS)[number];

/** One-shot purchased bonuses — reset to base after the round completes. */
export const ONE_SHOT_BUY_MODE_KEYS = [
	'bonus_see',
	'bonus_hear',
	GAMBLE_BET_MODE_KEY,
	RISKY_MYSTERY_BET_MODE_KEY,
] as const;

export type OneShotBuyModeKey = (typeof ONE_SHOT_BUY_MODE_KEYS)[number];

const BET_MODE_ALIASES: Record<string, string> = {
	ante: ANTE_BET_MODE_KEY,
	extra_chance: ANTE_BET_MODE_KEY,
	extrachance: ANTE_BET_MODE_KEY,
	baseante: ANTE_BET_MODE_KEY,
	bonus_gamble: GAMBLE_BET_MODE_KEY,
	bonus_mystery: GAMBLE_BET_MODE_KEY,
	gamble: GAMBLE_BET_MODE_KEY,
	mystery: GAMBLE_BET_MODE_KEY,
	mystery_bonus: GAMBLE_BET_MODE_KEY,
	bonusmystery: GAMBLE_BET_MODE_KEY,
	crazy_mystery_bonus: RISKY_MYSTERY_BET_MODE_KEY,
	risky_mystery: RISKY_MYSTERY_BET_MODE_KEY,
	risky_mystery_bonus: RISKY_MYSTERY_BET_MODE_KEY,
	bonus_risky_mystery: RISKY_MYSTERY_BET_MODE_KEY,
	hunt: huntModeKeyFor(2),
	hunt_spin: huntModeKeyFor(2),
	hunt_spins: huntModeKeyFor(2),
	bonus_hunt: huntModeKeyFor(2),
	bonus_hunt_2: huntModeKeyFor(2),
	bonus_hunt_3: huntModeKeyFor(3),
	bonus_hunt_4: huntModeKeyFor(4),
	bonus_hunt_5: huntModeKeyFor(5),
};

export function normalizeLegacyBetModeKey(key: string): string {
	const trimmed = (key ?? '').trim();
	if (!trimmed) return FOOTBALL_DEFAULT_BET_MODE_KEY;

	const upper = trimmed.toUpperCase();
	if (upper === 'BASE') return FOOTBALL_DEFAULT_BET_MODE_KEY;

	const lower = trimmed.toLowerCase();
	const aliased = BET_MODE_ALIASES[lower] ?? lower;
	const canonicalKeys = [
		FOOTBALL_DEFAULT_BET_MODE_KEY,
		...ACTIVATE_BET_MODE_KEYS,
		...ONE_SHOT_BUY_MODE_KEYS,
	] as const;

	for (const canonical of canonicalKeys) {
		if (canonical === aliased || canonical.toUpperCase() === aliased.toUpperCase()) {
			return canonical;
		}
	}

	if (stateMeta.betModeMeta?.[aliased]) return aliased;

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

/**
 * See / Hear synthesize a scatter land, so the actor must not pre-spin.
 * Mystery and Risky also skip it: their reveal handler owns the spin,
 * and the book already contains the real board (including a dead Risky spin).
 */
export const shouldSkipActorPreSpin = (key: string = stateBet.activeBetModeKey) =>
	isOneShotBuyBetMode(key);

/** Mystery and Risky play the book's own reveal. Do not synthesize a second scatter land. */
export const isGambleBuyBetMode = (key: string) => {
	const normalized = normalizeLegacyBetModeKey(key);
	return normalized === GAMBLE_BET_MODE_KEY || normalized === RISKY_MYSTERY_BET_MODE_KEY;
};

export const isHuntBetMode = (key: string) => huntLevelFromModeKey(normalizeLegacyBetModeKey(key)) != null;

export const activeHuntLevel = (): HuntLevel => {
	const fromMode = huntLevelFromModeKey(normalizeLegacyBetModeKey(stateBet.activeBetModeKey));
	return fromMode ?? stateHunt.level;
};

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
	if (normalized === GAMBLE_BET_MODE_KEY) return config.betModes.bonus_pick.cost;
	const huntLevel = huntLevelFromModeKey(normalized);
	if (huntLevel) return config.betModes[huntModeKeyFor(huntLevel)].cost;
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
	if (normalized === 'bonus_pick') return config.betModes.bonus_pick.cost;
	if (normalized === 'bonus_risky') return config.betModes.bonus_risky.cost;
	return 1;
};

export const oneShotBuyModeCost = (mode: OneShotBuyModeKey) =>
	stateBet.betAmount * buyModeCostMultiplier(mode);

/** See, Hear, Mystery and Risky reset to base. Ante, Hunt, Feature and Trifecta stay on. */
export const resetActiveBetModeAfterBuyFeature = () => {
	if (isOneShotBuyBetMode(stateBet.activeBetModeKey)) {
		stateBet.activeBetModeKey = FOOTBALL_DEFAULT_BET_MODE_KEY;
	}
};

const syncProgressBarForActiveMode = (mode: string) => {
	const normalized = normalizeLegacyBetModeKey(mode);
	const huntLevel = huntLevelFromModeKey(normalized);
	const threshold = huntLevel
		? PROGRESS_THRESHOLD_HUNT
		: normalized === ANTE_BET_MODE_KEY
			? PROGRESS_THRESHOLD_ANTE
			: PROGRESS_THRESHOLD_BASE;
	if (normalized === FEATURE_SPIN_BET_MODE_KEY) {
		eventEmitter.broadcast({
			type: 'monkeyProgressUpdate',
			payload: {
				index: 0,
				type: 'progressFill',
				value: 0,
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
			threshold,
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
	const huntLevel = huntLevelFromModeKey(mode);
	if (huntLevel) stateHunt.level = huntLevel;
	syncProgressBarForActiveMode(mode);
	notifyBetModeMusic(mode);
	return true;
};

/** Slider stop. If Hunt is already the active toggle, the cost changes with the stop. */
export const setHuntLevel = (level: number) => {
	if (!isHuntLevel(level)) return;
	stateHunt.level = level;
	if (isHuntBetMode(stateBet.activeBetModeKey)) {
		activateToggleBetMode(huntModeKeyFor(level));
	}
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
	const normalized = normalizeLegacyBetModeKey(key);
	stateBet.activeBetModeKey = normalized;
	const huntLevel = huntLevelFromModeKey(normalized);
	if (huntLevel) stateHunt.level = huntLevel;
};

/** Normalize active bet mode + betToResume.mode before resume playback or cost lookup. */
export const normalizeResumeBetState = () => {
	const betToResume = stateBet.betToResume;
	if (betToResume?.mode) {
		const normalizedMode = normalizeLegacyBetModeKey(betToResume.mode);
		setActiveBetModeKey(normalizedMode);
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

let kongClubBetModesInitialized = false;

export function initKongClubBetModes() {
	if (!kongClubBetModesInitialized) {
		const meta: BetModeMeta = Object.fromEntries([
			modeEntry('base', { type: 'default', costMultiplier: 1, title: 'Base', button: 'Base' }),
			modeEntry('base_ante', {
				type: 'activate',
				costMultiplier: config.betModes.base_ante.cost,
				title: `Ante (${formatCostMultiplier(config.betModes.base_ante.cost)}×)`,
				button: 'Ante',
				parent: 'base',
				description: `Extra Chance. Raises bonus odds for ${formatCostMultiplier(config.betModes.base_ante.cost)}× bet.`,
			}),
			modeEntry('hunt_2', {
				type: 'activate',
				costMultiplier: config.betModes.hunt_2.cost,
				title: `Hunt Spins (${formatCostMultiplier(config.betModes.hunt_2.cost)}×)`,
				button: 'Hunt',
				parent: 'base',
				description: 'Raises bonus odds. The bar fills at 10, same as base.',
			}),
			modeEntry('hunt_3', {
				type: 'activate',
				costMultiplier: config.betModes.hunt_3.cost,
				title: `Hunt Spins (${formatCostMultiplier(config.betModes.hunt_3.cost)}×)`,
				button: 'Hunt',
				parent: 'base',
			}),
			modeEntry('hunt_4', {
				type: 'activate',
				costMultiplier: config.betModes.hunt_4.cost,
				title: `Hunt Spins (${formatCostMultiplier(config.betModes.hunt_4.cost)}×)`,
				button: 'Hunt',
				parent: 'base',
			}),
			modeEntry('hunt_5', {
				type: 'activate',
				costMultiplier: config.betModes.hunt_5.cost,
				title: `Hunt Spins (${formatCostMultiplier(config.betModes.hunt_5.cost)}×)`,
				button: 'Hunt',
				parent: 'base',
			}),
			modeEntry('feature_spin', {
				type: 'activate',
				costMultiplier: config.betModes.feature_spin.cost,
				title: `Feature Spin (${formatCostMultiplier(config.betModes.feature_spin.cost)}×)`,
				button: 'Feature',
				parent: 'base',
				description: `Each spin costs ${formatCostMultiplier(config.betModes.feature_spin.cost)}× bet and lands at least one connection. It cannot trigger a bonus.`,
			}),
			modeEntry('peak_spin', {
				type: 'activate',
				costMultiplier: config.betModes.peak_spin.cost,
				title: `${SUMMIT_SPIN_TITLE} (${formatCostMultiplier(config.betModes.peak_spin.cost)}×)`,
				button: SUMMIT_SPIN_LABEL,
				parent: 'base',
				description: `Each spin costs ${formatCostMultiplier(config.betModes.peak_spin.cost)}× bet. The whole board starts gold. A connection plays one coin game. It cannot trigger a bonus.`,
			}),
			modeEntry('bonus_see', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_see.cost,
				title: `See No Evil (${formatCostMultiplier(config.betModes.bonus_see.cost)}×)`,
				button: 'Buy',
			}),
			modeEntry('bonus_hear', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_hear.cost,
				title: `Hear No Evil (${formatCostMultiplier(config.betModes.bonus_hear.cost)}×)`,
				button: 'Buy',
			}),
			modeEntry('bonus_pick', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_pick.cost,
				title: `Mystery Bonus (${formatCostMultiplier(config.betModes.bonus_pick.cost)}×)`,
				button: 'Buy',
				description: `Guaranteed bonus for ${formatCostMultiplier(config.betModes.bonus_pick.cost)}× bet. 50% See No Evil, 45% Hear No Evil, 5% ${SPEAK_NO_EVIL_TITLE}.`,
			}),
			modeEntry('bonus_risky', {
				type: 'buy',
				costMultiplier: config.betModes.bonus_risky.cost,
				title: `Risky Mystery (${formatCostMultiplier(config.betModes.bonus_risky.cost)}×)`,
				button: 'Buy',
				description: `50% nothing, 40% Hear No Evil, 10% ${SPEAK_NO_EVIL_TITLE}.`,
			}),
		]);
		stateMeta.betModeMeta = meta;
		kongClubBetModesInitialized = true;
	}

	normalizeAuthResumeBetState();
	syncActivateModeToBalance();
	void refreshPublishedModeCosts();
}

/** Published math costs override config when `publish_files/mode_costs.json` is present. */
export async function refreshPublishedModeCosts() {
	try {
		const response = await fetch(`/__math/costs?t=${Date.now()}`);
		if (!response.ok) return;
		const costs = (await response.json()) as Record<string, number>;
		let changed = false;
		for (const [key, cost] of Object.entries(costs)) {
			if (typeof cost !== 'number' || !Number.isFinite(cost) || cost <= 0) continue;
			const normalized = normalizeLegacyBetModeKey(key);
			const mode = config.betModes[normalized as keyof typeof config.betModes];
			if (!mode) continue;
			mode.cost = cost;
			const meta = stateMeta.betModeMeta?.[normalized];
			if (meta) {
				meta.costMultiplier = cost;
				meta.text.title = meta.text.title.replace(/\([^)]*×\)/, `(${formatCostMultiplier(cost)}×)`);
			}
			changed = true;
		}
		if (changed) statePublishedCosts.revision += 1;
	} catch {
		/* Config prices stay in place until math publishes mode_costs.json. */
	}
}
