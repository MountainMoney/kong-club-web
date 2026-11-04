import type { GameRuleData } from 'state-shared';

import config from './config';
import { shouldDisplayRtp } from './jurisdiction';
import { coinValueRulesSentence } from './coinFacePools';
import { isSocialMode, stakeGameDisclaimer } from './socialCopy';

export const RULES_RTP_PCT = (config.rtp * 100).toFixed(2);
export const RULES_MAX_WIN_X = config.betModes.base.max_win.toLocaleString('en-US');
export const RULES_FREE_SPINS = 10;

type BetModeKey = keyof typeof config.betModes;

const MODE_LABELS: Record<BetModeKey, { default: string; social: string }> = {
	base: { default: 'Base game', social: 'Base game' },
	base_ante: { default: 'Ante (Extra Chance)', social: 'Ante (Extra Chance)' },
	hunt_2: { default: 'Hunt Spins 2×', social: 'Hunt Spins 2×' },
	hunt_3: { default: 'Hunt Spins 3×', social: 'Hunt Spins 3×' },
	hunt_4: { default: 'Hunt Spins 4×', social: 'Hunt Spins 4×' },
	hunt_5: { default: 'Hunt Spins 5×', social: 'Hunt Spins 5×' },
	feature_spin: { default: 'Feature Spin', social: 'Feature Play' },
	peak_spin: { default: 'TRIFECTA Spin', social: 'TRIFECTA Play' },
	bonus_see: { default: 'See No Evil', social: 'See No Evil' },
	bonus_hear: { default: 'Hear No Evil', social: 'Hear No Evil' },
	bonus_pick: { default: 'Mystery Bonus', social: 'Mystery Bonus' },
	bonus_risky: { default: 'Risky Mystery Bonus', social: 'Risky Mystery Bonus' },
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
		const lines = (Object.keys(MODE_LABELS) as BetModeKey[]).map(modeRtpMaxLine).join('\n');
		return `\n\nReturn to Player (RTP) and maximum win by mode:\n${lines}`;
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
			? `The bar sits above the reels. In the base game, Ante and Hunt Spins it fills at 10 connections. In See No Evil and Hear No Evil it fills at 5. Speak No Evil refills the bar full on every play and the fill fades through a rainbow, so every play has one coin game.

Only one coin game can play per spin. The bar empties after that coin game. Clusters still pay in a bonus, and they fill the bar. Scatters that land in tumbles count.

On regular base plays, coin values are revealed on bronze, silver and gold tiles. Plain tiles do not flip. ${coinValueRulesSentence(true)}`
			: `The bar sits above the reels. In the base game, Ante and Hunt Spins it fills at 10 connections. In See No Evil and Hear No Evil it fills at 5. Speak No Evil refills the bar full on every spin and the fill fades through a rainbow, so every spin has one coin game.

Only one coin game can play per spin. The bar empties after that coin game. Clusters still pay in a bonus, and they fill the bar. Scatters that land in tumbles count.

On regular base spins, coin values are revealed on bronze, silver and gold tiles. Plain tiles do not flip. ${coinValueRulesSentence(false)}`
	);

const buildFeatureSpinSection = (): GameRuleData =>
	ruleSection(
		isSocialMode() ? 'FEATURE PLAY' : 'FEATURE SPIN',
		isSocialMode()
			? `Toggle Feature Play from the bonus menu (${config.betModes.feature_spin.cost}× play amount per play). Every play lands at least one connection, or a tumble chain. It cannot start a bonus. Ante, Hunt Spins, Feature Play and TRIFECTA are mutually exclusive: only one can be on.`
			: `Toggle Feature Spin from the bonus menu (${config.betModes.feature_spin.cost}× bet per spin). Every spin lands at least one connection, or a tumble chain. It cannot trigger a bonus. Ante, Hunt Spins, Feature Spin and TRIFECTA are mutually exclusive: only one can be on.`,
	);

const buildPeakSpinSection = (): GameRuleData =>
	ruleSection(
		'TRIFECTA SPIN',
		isSocialMode()
			? `Toggle TRIFECTA from the bonus menu (${config.betModes.peak_spin.cost}× play amount per play). Every cell starts gold. When the board connects, one coin game plays. It cannot start a bonus.`
			: `Toggle TRIFECTA from the bonus menu (${config.betModes.peak_spin.cost}× bet per spin). Every cell starts gold. When the board connects, one coin game plays. It cannot trigger a bonus.`,
	);

const buildScatterSection = (): GameRuleData =>
	ruleSection(
		isSocialMode() ? 'SCATTER & FREE GAMES' : 'SCATTER & FREE SPINS',
		isSocialMode()
			? `Stone tablet scatters do not pay. They start a ${RULES_FREE_SPINS}-play bonus. Scatters that land in tumbles count. A bonus ends immediately at ${RULES_MAX_WIN_X}×.
• 3 scatters → See No Evil. The board clears. Ranks reset after every coin game. The bar fills at 5.
• 4 scatters → Hear No Evil. The board stays and ranks carry. The bar fills at 5.
• 5 scatters → Speak No Evil. The board stays, ranks carry, and the bar is full every play (rainbow fade), so there is one coin game every play. A direct entry pays at least 1,000×. An upgrade from Hear does not.

During See No Evil, 4 scatters upgrade the bonus to Hear No Evil and add 4 plays. Current ranks are kept.
During Hear No Evil, 5 scatters upgrade the bonus to Speak No Evil and add 4 plays. Current ranks are kept.
Retriggers: 2 scatters add 2 plays, 3 or more scatters add 4 plays. There is no cap on total plays.

Ante (${config.betModes.base_ante.cost}×, Extra Chance) raises the bonus chance. Hunt Spins is a slider at ${config.betModes.hunt_2.cost}× / ${config.betModes.hunt_3.cost}× / ${config.betModes.hunt_4.cost}× / ${config.betModes.hunt_5.cost}×. Higher stops raise the bonus chance. The bar still fills at 10. Only one of Ante, Hunt, Feature Play and TRIFECTA can be on.

Buys: See No Evil (${config.betModes.bonus_see.cost}×), Hear No Evil (${config.betModes.bonus_hear.cost}×), Mystery Bonus (${config.betModes.bonus_pick.cost}×: 50% See, 45% Hear, 5% Speak No Evil), Risky Mystery Bonus (${config.betModes.bonus_risky.cost}×: 50% nothing, 40% Hear, 10% Speak No Evil).

In the base game, tiles return to plain when the play ends. Nothing carries to the next play.`
			: `Stone tablet scatters do not pay. They start a ${RULES_FREE_SPINS}-spin bonus. Scatters that land in tumbles count. A bonus ends immediately at ${RULES_MAX_WIN_X}×.
• 3 scatters → See No Evil. The board clears. Ranks reset after every coin game. The bar fills at 5.
• 4 scatters → Hear No Evil. The board stays and ranks carry. The bar fills at 5.
• 5 scatters → Speak No Evil. The board stays, ranks carry, and the bar is full every spin (rainbow fade), so there is one coin game every spin. A direct entry pays at least 1,000×. An upgrade from Hear does not.

During See No Evil, 4 scatters upgrade the bonus to Hear No Evil and add 4 spins. Current ranks are kept.
During Hear No Evil, 5 scatters upgrade the bonus to Speak No Evil and add 4 spins. Current ranks are kept.
Retriggers: 2 scatters add 2 spins, 3 or more scatters add 4 spins. There is no cap on total spins.

Ante (${config.betModes.base_ante.cost}×, Extra Chance) raises the bonus chance. Hunt Spins is a slider at ${config.betModes.hunt_2.cost}× / ${config.betModes.hunt_3.cost}× / ${config.betModes.hunt_4.cost}× / ${config.betModes.hunt_5.cost}×. Higher stops raise the bonus chance. The bar still fills at 10. Only one of Ante, Hunt, Feature Spin and TRIFECTA can be on.

Buys: See No Evil (${config.betModes.bonus_see.cost}×), Hear No Evil (${config.betModes.bonus_hear.cost}×), Mystery Bonus (${config.betModes.bonus_pick.cost}×: 50% See, 45% Hear, 5% Speak No Evil), Risky Mystery Bonus (${config.betModes.bonus_risky.cost}×: 50% nothing, 40% Hear, 10% Speak No Evil).

In the base game, tiles return to plain when the spin ends. Nothing carries to the next spin.`,
	);

const buildWildsSection = (): GameRuleData =>
	ruleSection(
		'WILDS',
		isSocialMode()
			? `Monkey wild (MW) substitutes for winning symbols except scatters and coins, and one wild can count in more than one cluster. Wilds can land on the opening drop and in tumbles. More than four wilds can land in any mode; that is rare. A wild lights its own tile when it wins. Wilds have no multiplier.`
			: `Monkey wild (MW) substitutes for paying symbols except scatters and coins, and one wild can count in more than one cluster. Wilds can land on the opening drop and in tumbles. More than four wilds can land in any mode; that is rare. A wild lights its own tile when it wins. Wilds have no multiplier.`,
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
