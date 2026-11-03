import { stateConfig, stateMeta, stateUrlDerived } from 'state-shared';

import { coinValueRulesSentence } from './coinFacePools';
import config from './config';

/** Stake social / Stake.us copy mode. */
export const isSocialMode = () =>
	stateUrlDerived.social() || stateConfig.jurisdiction.socialCasino;

const REPLAY_LABELS = {
	baseBet: { default: 'Base Bet', social: 'Base Play' },
	costMultiplier: { default: 'Cost Multiplier', social: 'Feature Multiplier' },
	totalBetCost: { default: 'Final Bet Amount', social: 'Final Play Amount' },
	payoutMultiplier: { default: 'Payout Multiplier', social: 'Final Multiplier' },
	totalWin: { default: 'Total Win', social: 'Total Win' },
} as const;

export type ReplayLabelKey = keyof typeof REPLAY_LABELS;

export const replayLabel = (key: ReplayLabelKey) =>
	isSocialMode() ? REPLAY_LABELS[key].social : REPLAY_LABELS[key].default;

export const replayTitle = () => (isSocialMode() ? 'Play Replay' : 'Bet Replay');

export const toolbarLabel = (key: 'balance' | 'bet' | 'win' | 'totalWin') => {
	if (!isSocialMode()) {
		return (
			{
				balance: 'BALANCE',
				bet: 'BET',
				win: 'WIN',
				totalWin: 'TOTAL WIN',
			} as const
		)[key];
	}
	return (
		{
			balance: 'COINS',
			bet: 'PLAY',
			win: 'WIN',
			totalWin: 'TOTAL WIN',
		} as const
	)[key];
};

export const buyBonusLabel = () => (isSocialMode() ? 'PLAY BONUS' : 'BUY BONUS');

export const freeSpinsToolbarLabel = () => (isSocialMode() ? 'FREE GAMES' : 'FREE SPINS');

export const freeSpinCounterLabel = () => (isSocialMode() ? 'FREE GAME' : 'FREE SPIN');

/** Playfield / toolbar: `3/10`, not remaining-only “10 left”. */
export const freeSpinProgressLabel = (current: number, total: number) => {
	const tot = Math.max(0, total);
	const cur = current > 0 ? current : tot > 0 ? 1 : 0;
	return `${cur}/${tot}`;
};

export const autoplayPopupTitle = () => (isSocialMode() ? 'AUTO PLAY' : 'AUTOPLAY');

export const autoplayRoundsLabel = () =>
	isSocialMode() ? 'NUMBER OF PLAYS' : 'NUMBER OF ROUNDS';

export const autoSpinsMenuLabel = () => (isSocialMode() ? 'AUTO PLAYS' : 'AUTO SPINS');

export const autoSpinsActiveMenuLabel = (counter: number) => {
	const count = counter < 0 ? '∞' : String(counter);
	return isSocialMode() ? `AUTO PLAYS: ${count}` : `AUTO: ${count}`;
};

export const betControlDecreaseAria = () =>
	isSocialMode() ? 'Decrease play amount' : 'Decrease bet';

export const betControlIncreaseAria = () =>
	isSocialMode() ? 'Increase play amount' : 'Increase bet';

export const autoSpinBeforeBonusMessage = () =>
	isSocialMode()
		? 'Stop Auto Play before playing a bonus.'
		: 'Stop Auto Spin before buying a bonus.';

export const buyBonusActionLabel = (kind: 'buy' | 'activate' | 'ok') => {
	if (kind === 'activate') return 'ACTIVATE';
	if (kind === 'ok') return 'OK';
	return isSocialMode() ? 'PLAY' : 'BUY';
};

export const insufficientBalanceMessage = () =>
	isSocialMode()
		? 'Insufficient balance for this bonus feature.'
		: 'Insufficient balance for this bonus cost.';

export const insufficientSpinBalanceMessage = () =>
	isSocialMode()
		? 'Insufficient balance for this play amount.'
		: 'Insufficient balance for this bet.';

export const insufficientBetIncreaseMessage = () =>
	isSocialMode()
		? 'Insufficient balance for the next play amount in this mode.'
		: 'Insufficient balance for the next bet in this mode.';

export const insufficientExtraChanceMessage = () =>
	isSocialMode()
		? 'Insufficient balance for Extra Chance at this play amount.'
		: 'Insufficient balance for Extra Chance at this bet.';

export const insufficientFeatureSpinMessage = () =>
	isSocialMode()
		? 'Insufficient balance for Feature Spin at this play amount.'
		: 'Insufficient balance for Feature Spin at this bet.';

/** Player-facing bet mode title for replay / UI (not raw math key). */
export const betModeDisplayTitle = (modeKey: string) => {
	const normalized = modeKey.toLowerCase();
	const meta =
		stateMeta.betModeMeta?.[normalized] ??
		stateMeta.betModeMeta?.[normalized.toUpperCase()];
	return meta?.text?.title ?? modeKey.toUpperCase();
};

/** Replay shows clean player-facing mode names; cost is already displayed in its own row. */
export const replayModeDisplayTitle = (modeKey: string) =>
	betModeDisplayTitle(modeKey).replace(/\s*\([^)]*\)\s*$/, '');

/** Official Stake Engine disclaimer — verbatim in both modes. Do not rewrite. */
export const STAKE_GAME_DISCLAIMER =
	'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Stake Engine.';

export const stakeGameDisclaimer = () => STAKE_GAME_DISCLAIMER;

export const isOfficialDisclaimerContent = (text: string) =>
	text.includes('TM and ©') && /Stake Engine/i.test(text);

/** Apply social-safe substitutions to rules / info copy. */
export const applySocialCopy = (text: string) => {
	if (!isSocialMode()) return text;
	if (isOfficialDisclaimerContent(text)) return text;

	return text
		.replace(/\bStake Engine\b/g, 'the game server')
		.replace(/\bstake engine\b/gi, 'the game server')
		.replace(/\bbuy a mystery bonus\b/gi, 'play a mystery bonus')
		.replace(/\bbuy bonus\b/gi, 'get bonus')
		.replace(/\bbonus buy\b/gi, 'bonus feature')
		.replace(/\bbought\b/gi, 'instantly triggered')
		.replace(/\bbuying\b/gi, 'playing')
		.replace(/\bbuy\b/gi, 'play')
		.replace(/\bauto spin\b/gi, 'auto play')
		.replace(/\bpurchases\b/gi, 'plays')
		.replace(/\bpurchase\b/gi, 'play')
		.replace(/\bat the cost of\b/gi, 'for')
		.replace(/\bcost of\b/gi, 'can be played for')
		.replace(/\bbets?\b/gi, (match) => (match.toLowerCase() === 'bet' ? 'play' : 'plays'))
		.replace(/\bwagered\b/gi, 'played')
		.replace(/\bwager\b/gi, 'play')
		.replace(/\bwin feature\b/gi, 'play feature')
		.replace(/\bpay out\b/gi, 'win')
		.replace(/\bpaid out\b/gi, 'won')
		.replace(/\bpayouts?\b/gi, (match) => (match.toLowerCase() === 'payout' ? 'win' : 'wins'))
		.replace(/\bpaid\b/gi, 'won')
		.replace(/\bpays\b/gi, 'wins')
		.replace(/\bpay\b/gi, 'win')
		.replace(/\bpaying\b/gi, 'winning')
		.replace(/\bpaylines\b/gi, 'win lines')
		.replace(/\bpayline\b/gi, 'win line')
		.replace(/\bgamble\b/gi, 'feature pick')
		.replace(/\bgambling\b/gi, 'playing')
		.replace(/\bwinnings\b/gi, 'wins')
		.replace(/\bcash\b/gi, 'coins')
		.replace(/\bmoney\b/gi, 'coins')
		.replace(/\bcurrency\b/gi, 'token')
		.replace(/\bfunds?\b/gi, 'balance')
		.replace(/\bcredit\b/gi, 'balance')
		.replace(/\bdeposit\b/gi, 'get coins')
		.replace(/\bwithdraw\b/gi, 'redeem')
		.replace(/\bstake\b/gi, 'play amount');
};

/** Paytable uses curated strings — avoid applySocialCopy on pays/paying/win phrasing. */
const PAYTABLE_COPY = {
	title: { default: 'PAY TABLE', social: 'WIN TABLE' },
	intro: {
		default:
			'Clusters pay when 5 or more matching symbols connect. Values are multiples of your total bet. Cluster pay = base pay × the sum of lit tile multipliers (Bronze 2× / Silver 5× / Gold 10×).',
		social:
			'Clusters win when 5 or more matching symbols connect. Values are multiples of your total play amount. Cluster win = base win × the sum of lit tile multipliers (Bronze 2× / Silver 5× / Gold 10×).',
	},
	wild: {
		default: 'Wild (MW): substitutes for all paying symbols.',
		social: 'Wild (MW): substitutes for all winning symbols.',
	},
	scatter: {
		default:
			'Scatter (stone tablet): does not pay. 3 scatters start See No Evil; 4 start Hear No Evil; 5+ start Monkey Madness.',
		social:
			'Scatter (stone tablet): does not pay. 3 scatters start See No Evil; 4 start Hear No Evil; 5+ start Monkey Madness.',
	},
	levelUpTiles: {
		default:
			`Level-Up Tiles: Bronze / Silver / Gold ranks (2× / 5× / 10×) — grow each time that cell’s symbol type wins in a tumble. Cluster pay = base pay × the sum of lit tile multipliers. ${coinValueRulesSentence(false)}`,
		social:
			`Level-Up Tiles: Bronze / Silver / Gold ranks (2× / 5× / 10×) — grow each time that cell’s symbol type wins in a tumble. Cluster win = base win × the sum of lit tile multipliers. ${coinValueRulesSentence(true)}`,
	},
	multiPower: {
		default:
			'MULTI (XM): Board Activation prize. Multiplies coin faces on the 8 adjacent tiles (×2 / ×3 / ×4 / ×5 / ×10 / ×20). The MULTI itself does not pay.',
		social:
			'MULTI (XM): rare Board Activation prize. Multiplies coin faces on the 8 adjacent tiles (×2 / ×3 / ×4 / ×5 / ×10 / ×20). The MULTI itself does not award a value.',
	},
	peakSpin: {
		default: `TRIFECTA Spin (${config.betModes.peak_spin.cost}×): the whole board starts Gold. After it lands the Progress Bar fills — it can dump, or hit full and play the coin game with Gold prizes on every tile.`,
		social: `TRIFECTA Play (${config.betModes.peak_spin.cost}×): the whole board starts Gold. After it lands the Progress Bar fills — it can dump, or hit full and play the coin game with Gold prizes on every tile.`,
	},
	collectorPower: {
		default:
			'COLLECTOR (CL): Board Activation prize. The leftmost pot vacuums coins and other pots. Those slots replace immediately. After the pot is counted (and maybe MULTI’d), its slot is replaced too.',
		social:
			'COLLECTOR (CL): Board Activation prize. The leftmost pot vacuums coins and other pots. Those slots replace immediately. After the pot is counted (and maybe MULTI’d), its slot is replaced too.',
	},
} as const;

export type PaytableCopyKey = keyof typeof PAYTABLE_COPY;

export const paytableCopy = (key: PaytableCopyKey) => {
	const entry = PAYTABLE_COPY[key];
	if (typeof entry === 'string') return entry;
	return isSocialMode() ? entry.social : entry.default;
};

const PAYTABLE_MODE_LABELS = {
	base: 'Base game',
	base_ante: 'Extra Chance',
	feature_spin: { default: 'Feature Spin', social: 'Feature Play' },
	peak_spin: { default: 'TRIFECTA Spin', social: 'TRIFECTA Play' },
	bonus_see: 'See No Evil',
	bonus_hear: 'Hear No Evil',
	bonus_gamble: { default: 'Gamble', social: 'Feature Pick' },
} as const;

export type PaytableModeKey = keyof typeof PAYTABLE_MODE_LABELS;

export const paytableModeLabel = (modeKey: PaytableModeKey) => {
	const entry = PAYTABLE_MODE_LABELS[modeKey];
	if (typeof entry === 'string') return entry;
	return isSocialMode() ? entry.social : entry.default;
};

/** Short bonus-card copy has stricter Stake.us wording than full rules text. */
export const bonusDescriptionCopy = (text: string) => {
	const socialText = applySocialCopy(text);
	if (!isSocialMode()) return socialText;

	return socialText
		.replace(/\bfree spins\b/gi, 'free games')
		.replace(/\bspin\b/gi, 'play')
		.replace(/\bspins\b/gi, 'plays')
		.replace(/\bplayed out\b/gi, 'revealed');
};
