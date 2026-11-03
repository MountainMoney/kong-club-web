import type { GameRuleData } from 'state-shared';

import config from './config';
import { shouldDisplayRtp } from './jurisdiction';
import { isSocialMode, stakeGameDisclaimer } from './socialCopy';

export const RULES_RTP_PCT = (config.rtp * 100).toFixed(2);
export const RULES_MAX_WIN_X = config.betModes.base.max_win.toLocaleString('en-US');
export const RULES_FREE_SPINS = 10;

type BetModeKey = keyof typeof config.betModes;

const MODE_LABELS: Record<BetModeKey, { default: string; social: string }> = {
	base: { default: 'Base game', social: 'Base game' },
	base_ante: { default: 'Extra Chance', social: 'Extra Chance' },
	feature_spin: { default: 'Feature Spin', social: 'Feature Play' },
	peak_spin: { default: 'TRIFECTA Spin', social: 'TRIFECTA Play' },
	bonus_see: { default: 'See No Evil', social: 'See No Evil' },
	bonus_hear: { default: 'Hear No Evil', social: 'Hear No Evil' },
	bonus_mystery: { default: 'Gamble', social: 'Feature Pick' },
};

const modeLabel = (modeKey: BetModeKey) =>
	isSocialMode() ? MODE_LABELS[modeKey].social : MODE_LABELS[modeKey].default;

const formatModeMaxWin = (modeKey: BetModeKey) =>
	config.betModes[modeKey].max_win.toLocaleString('en-US');

const modeRtpMaxLine = (modeKey: BetModeKey) => {
	const mode = config.betModes[modeKey];
	const label = modeLabel(modeKey);
	if (!shouldDisplayRtp()) return `• ${label}`;
	return `• ${label} — RTP ${(mode.rtp * 100).toFixed(2)}% · Max win ${formatModeMaxWin(modeKey)}×`;
};

const rtpBlock = () => {
	if (shouldDisplayRtp()) {
		return `\n\nReturn to Player (RTP) and maximum win by mode:
${modeRtpMaxLine('base')}
${modeRtpMaxLine('base_ante')}
${modeRtpMaxLine('feature_spin')}
${modeRtpMaxLine('peak_spin')}
${modeRtpMaxLine('bonus_see')}
${modeRtpMaxLine('bonus_hear')}
${modeRtpMaxLine('bonus_mystery')}`;
	}

	return isSocialMode()
		? `\n\nMaximum win: ${RULES_MAX_WIN_X}× total play amount (all modes).`
		: `\n\nMaximum win: ${RULES_MAX_WIN_X}× total bet (all modes).`;
};

const ruleCell = (text: string, row = 0): GameRuleData['containers'][number] => ({
	title: '',
	text,
	image: '',
	row,
	column: 0,
	imagePosition: 'left',
});

const ruleSection = (title: string, text: string): GameRuleData => ({
	title,
	rows: 1,
	columns: 1,
	containers: [ruleCell(text)],
});

const buildGameInfoSection = (): GameRuleData =>
	ruleSection(
		'GAME INFO',
		`Kong Club is a 6-reel cluster slot with tumbling wins and Level-Up Tiles.${rtpBlock()}`,
	);

const buildHowToPlaySection = (): GameRuleData =>
	ruleSection(
		'HOW TO PLAY',
		isSocialMode()
			? `Set your play amount and press play. Wins form when 5 or more matching symbols connect horizontally or vertically (no diagonals).

Super Cascade removes every symbol of each winning type from the board (not only the cluster cells). New symbols tumble down from above.

Winning clusters light Level-Up Tiles only on the connected cells (including wilds in that cluster). Each new involvement raises that tile’s rank (Bronze → Silver → Gold). Cluster win = base win × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×). Super Cascade still removes every symbol of the winning type — non-connected matches delete without getting a tile. Tiles persist across tumbles within a play.`
			: `Set your bet and press spin. Wins form when 5 or more matching symbols connect horizontally or vertically (no diagonals).

Super Cascade removes every symbol of each winning type from the board (not only the cluster cells). New symbols tumble down from above.

Winning clusters light Level-Up Tiles only on the connected cells (including wilds in that cluster). Each new involvement raises that tile’s rank (Bronze → Silver → Gold). Cluster pay = base pay × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×). Super Cascade still removes every symbol of the winning type — non-connected matches delete without getting a tile. Tiles persist across tumbles within a spin.`,
	);

const buildProgressBarSection = (): GameRuleData =>
	ruleSection(
		'PROGRESS BAR & BOARD ACTIVATION',
		isSocialMode()
			? `On regular plays, each winning tumble fills the Progress Bar by one step. In See and Hear free games, each winning cluster fills the bar by one step. Hear pays at most 3 Board Activations per free game. When the bar fills (5 steps), Board Activation starts the coin collect.

On regular base plays, coin values are revealed on active Level-Up Tiles (no Bronze/Silver/Gold coin symbols on the board). In Feature Play and free games, Bronze/Silver/Gold coins can land on the grid and pay when Activation fires. Tile multipliers apply. Physical coins are then removed; Level-Up Tiles stay lit. Base game: one Board Activation per play.

Coin values are play-amount multiples from fixed pools: Bronze (CB) 1, 2, 3, 4; Silver (CS) 5, 7, 10, 15, 20; Gold (CG) 25, 50, 100, 250, 500.`
			: `On regular spins, each winning tumble fills the Progress Bar by one step. In See and Hear free spins, each winning cluster fills the bar by one step. Hear pays at most 3 Board Activations per free spin. When the bar fills (5 steps), Board Activation starts the coin collect.

On regular base spins, coin values are revealed on active Level-Up Tiles (no Bronze/Silver/Gold coin symbols on the board). In Feature Spin and free spins, Bronze/Silver/Gold coins can land on the grid and pay when Activation fires. Tile multipliers apply. Physical coins are then removed; Level-Up Tiles stay lit. Base game: one Board Activation per spin.

Coin values are bet multiples from fixed pools: Bronze (CB) 1, 2, 3, 4; Silver (CS) 5, 7, 10, 15, 20; Gold (CG) 25, 50, 100, 250, 500.`
	);

const buildFeatureSpinSection = (): GameRuleData =>
	ruleSection(
		isSocialMode() ? 'FEATURE PLAY' : 'FEATURE SPIN',
		isSocialMode()
			? `Toggle Feature Play from the bonus menu or the FEAT toolbar button (${config.betModes.feature_spin.cost}× play amount per play). The Progress Bar starts full. Every play lands a 5+ cluster, then the coin game after tumbles stop.

Toggle off from the bonus button, toolbar FEAT button, or bonus menu.`
			: `Toggle Feature Spin from the bonus menu or the FEAT toolbar button (${config.betModes.feature_spin.cost}× bet per spin). The Progress Bar starts full. Every spin lands a 5+ cluster, then the coin game after tumbles stop.

Toggle off from the bonus button, toolbar FEAT button, or bonus menu.`,
	);

const buildPeakSpinSection = (): GameRuleData =>
	ruleSection(
		'TRIFECTA SPIN',
		isSocialMode()
			? `Toggle TRIFECTA from the bonus menu (${config.betModes.peak_spin.cost}× play amount per play). Every cell starts Gold. After the board lands the Progress Bar fills — it can dump, or hit full and play the coin game.

Gold coin prizes land on every lit tile when the bar fills all the way.`
			: `Toggle TRIFECTA from the bonus menu (${config.betModes.peak_spin.cost}× bet per spin). Every cell starts Gold. After the board lands the Progress Bar fills — it can dump, or hit full and play the coin game.

Gold coin prizes land on every lit tile when the bar fills all the way.`,
	);

const buildScatterSection = (): GameRuleData =>
	ruleSection(
		isSocialMode() ? 'SCATTER & FREE GAMES' : 'SCATTER & FREE SPINS',
		isSocialMode()
			? `Stone tablet scatters do not pay. They start a bonus:
• 1–2 scatters do not start a bonus
• 3 scatters → See No Evil (${RULES_FREE_SPINS} free games; board clears; each winning cluster fills the Progress Bar; threshold 5)
• 4 scatters → Hear No Evil (${RULES_FREE_SPINS} free games, board stays, each winning cluster fills the Progress Bar, threshold 5, at most 3 Board Activations per free game)
• 5+ scatters → Monkey Madness (${RULES_FREE_SPINS} free games; board stays; tiles go silver then gold, no bronze; coin game every play)

Extra Chance (${config.betModes.base_ante.cost}×) doubles the bonus chance from about 1 in 260 plays to about 1 in 130. The 3, 4, and 5 scatter mix stays the same.

You can buy See No Evil (${config.betModes.bonus_see.cost}×) or Hear No Evil (${config.betModes.bonus_hear.cost}×), or activate Gamble (${config.betModes.bonus_mystery.cost}×): 50% dead play, 40% Hear, 10% Monkey Madness.

Level-Up Tiles reset on bonus entry, then carry across free games within that bonus.`
			: `Stone tablet scatters do not pay. They start a bonus:
• 1–2 scatters do not start a bonus
• 3 scatters → See No Evil (${RULES_FREE_SPINS} free spins; board clears; each winning cluster fills the Progress Bar; threshold 5)
• 4 scatters → Hear No Evil (${RULES_FREE_SPINS} free spins, board stays, each winning cluster fills the Progress Bar, threshold 5, at most 3 Board Activations per free spin)
• 5+ scatters → Monkey Madness (${RULES_FREE_SPINS} free spins; board stays; tiles go silver then gold, no bronze; coin game every spin)

Extra Chance (${config.betModes.base_ante.cost}×) doubles the bonus chance from about 1 in 260 spins to about 1 in 130. The 3, 4, and 5 scatter mix stays the same.

You can buy See No Evil (${config.betModes.bonus_see.cost}×) or Hear No Evil (${config.betModes.bonus_hear.cost}×), or activate Gamble (${config.betModes.bonus_mystery.cost}×): 50% dead spin, 40% Hear, 10% Monkey Madness.

Level-Up Tiles reset on bonus entry, then carry across free spins within that bonus.`,
	);

const buildWildsSection = (): GameRuleData =>
	ruleSection(
		'WILDS',
		isSocialMode()
			? `Monkey wild (MW) substitutes for all winning symbols except scatters and coins. Wilds appear on the initial drop only (not during tumble refills), with at most two on the board at once.`
			: `Monkey wild (MW) substitutes for all paying symbols except scatters and coins. Wilds appear on the initial drop only (not during tumble refills), with at most two on the board at once.`,
	);

const buildSymbolPaysSection = (): GameRuleData =>
	ruleSection(
		isSocialMode() ? 'SYMBOL WINS' : 'SYMBOL PAYS',
		isSocialMode()
			? `Clusters win (minimum 5 connected symbols):
Banana, Grape, Orange, Coconut, Lemon — see win table for exact multiples by cluster size.

Cluster win = base win × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×).`
			: `Cluster pays (minimum 5 connected symbols):
Banana, Grape, Orange, Coconut, Lemon — see paytable for exact multiples by cluster size.

Cluster pay = base pay × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×).`,
	);

const buildOfficialDisclaimerSection = (): GameRuleData =>
	ruleSection('GENERAL GAME DISCLAIMER', stakeGameDisclaimer());

export const buildKongClubGameRules = (): GameRuleData[] => [
	buildGameInfoSection(),
	buildHowToPlaySection(),
	buildProgressBarSection(),
	buildFeatureSpinSection(),
	buildPeakSpinSection(),
	buildScatterSection(),
	buildWildsSection(),
	buildSymbolPaysSection(),
	buildOfficialDisclaimerSection(),
];
