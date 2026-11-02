import type { GameRuleData } from 'state-shared';

import { shouldDisplayRtp } from './jurisdiction';
import {
	LE_BANDIT_CLUSTER_TIERS,
	clusterPayAtSize,
	type LeBanditPayRow,
} from './clusterPaytable';
import {
	PUBLISHED_MAX_WIN_LABEL,
	PUBLISHED_MODE_COST,
	PUBLISHED_RTP_PCT,
	formatPublishedCost,
	type PublishedModeKey,
} from './publishedMath';
import { isSocialMode, stakeGameDisclaimer } from './socialCopy';

export const RULES_RTP_PCT = PUBLISHED_RTP_PCT;
export const RULES_MAX_WIN_X = PUBLISHED_MAX_WIN_LABEL;
export const RULES_FREE_SPINS = 10;

const MODE_LABELS: Record<PublishedModeKey, { default: string; social: string }> = {
	base: { default: 'Base game', social: 'Base game' },
	base_ante: { default: 'Extra Chance', social: 'Extra Chance' },
	feature_spin: { default: 'Feature Spin', social: 'Feature Play' },
	peak_spin: { default: 'TRIFECTA Spin', social: 'TRIFECTA Play' },
	bonus_see: { default: 'See No Evil', social: 'See No Evil' },
	bonus_hear: { default: 'Hear No Evil', social: 'Hear No Evil' },
	bonus_pick: { default: 'Mystery Bonus', social: 'Mystery Feature' },
};

const modeLabel = (modeKey: PublishedModeKey) =>
	isSocialMode() ? MODE_LABELS[modeKey].social : MODE_LABELS[modeKey].default;

const maxWinPhrase = () =>
	isSocialMode()
		? `${RULES_MAX_WIN_X}× base play amount`
		: `${RULES_MAX_WIN_X}× base bet`;

const modeRtpMaxLine = (modeKey: PublishedModeKey) => {
	const label = modeLabel(modeKey);
	const cost = formatPublishedCost(PUBLISHED_MODE_COST[modeKey]);
	const price = isSocialMode() ? `${cost}× play amount` : `cost ${cost}×`;
	const maxWin = `Max win ${maxWinPhrase()}`;
	if (!shouldDisplayRtp()) return `• ${label} — ${price} · ${maxWin}`;
	return `• ${label} — ${price} · RTP ${RULES_RTP_PCT}% · ${maxWin}`;
};

const rtpBlock = () => {
	const modes = (
		[
			'base',
			'base_ante',
			'feature_spin',
			'peak_spin',
			'bonus_see',
			'bonus_hear',
			'bonus_pick',
		] as const
	)
		.map((modeKey) => modeRtpMaxLine(modeKey))
		.join('\n');
	const stake = isSocialMode()
		? 'Every max win is a multiple of the base play amount, including modes that cost more than 1×.'
		: 'Every max win is a multiple of the base bet, including modes that cost more than 1×.';
	return `\n\n${stake}\n\n${modes}`;
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

const copy = (social: string, normal: string) => (isSocialMode() ? social : normal);

const buildGameInfoSection = (): GameRuleData =>
	ruleSection(
		'GAME INFO',
		copy(
			`Kong Club is a 6-reel cluster game with tumbling wins and Level-Up Tiles.${rtpBlock()}`,
			`Kong Club is a 6-reel cluster slot with tumbling wins and Level-Up Tiles.${rtpBlock()}`,
		),
	);

const buildHowToPlaySection = (): GameRuleData =>
	ruleSection(
		'HOW TO PLAY',
		copy(
			`Set your play amount and press play. Wins form when 5 or more matching symbols connect horizontally or vertically (no diagonals).

Super Cascade removes every symbol of each winning type from the board (not only the cluster cells). New symbols tumble down from above.

Winning clusters light Level-Up Tiles only on the connected cells (including wilds in that cluster). Each new involvement raises that tile’s rank (Bronze → Silver → Gold). Cluster win = base win × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×). Super Cascade still removes every symbol of the winning type — non-connected matches delete without getting a tile. Tiles persist across tumbles within a play. Those multipliers apply to cluster wins only. They do not multiply the coin game.`,
			`Set your bet and press spin. Wins form when 5 or more matching symbols connect horizontally or vertically (no diagonals).

Super Cascade removes every symbol of each winning type from the board (not only the cluster cells). New symbols tumble down from above.

Winning clusters light Level-Up Tiles only on the connected cells (including wilds in that cluster). Each new involvement raises that tile’s rank (Bronze → Silver → Gold). Cluster pay = base pay × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×). Super Cascade still removes every symbol of the winning type — non-connected matches delete without getting a tile. Tiles persist across tumbles within a spin. Those multipliers apply to cluster wins only. They do not multiply the coin game.`,
		),
	);

const buildProgressBarSection = (): GameRuleData =>
	ruleSection(
		'PROGRESS BAR',
		copy(
			`Each winning cluster adds one step to the Progress Bar, up to 5. One coin game can play per play, in the base game and in free games.

On a base play, coin faces are revealed on the lit tiles. In Feature Play and free games, bronze, silver, and gold coins can also land on the grid. After the coin game those coins leave the board.

See No Evil clears Level-Up Tiles after its coin game. Hear No Evil and Monkey Madness keep them.`,
			`Each winning cluster adds one step to the Progress Bar, up to 5. One coin game can play per spin, in the base game and in free spins.

On a base spin, coin faces are revealed on the lit tiles. In Feature Spin and free spins, bronze, silver, and gold coins can also land on the grid. After the coin game those coins leave the board.

See No Evil clears Level-Up Tiles after its coin game. Hear No Evil and Monkey Madness keep them.`,
		),
	);

const buildCoinGameSection = (): GameRuleData =>
	ruleSection(
		'COIN GAME',
		copy(
			`Coin faces are multiples of the base play amount.
• Bronze (CB): 1, 2, 3, 4
• Silver (CS): 5, 7, 10, 15, 20
• Gold (CG): 25, 50, 100, 250, 500

A lit tile can flip to a coin, a clover (MULTI), or a pot (COLLECTOR). Against a coin weight of 100: bronze is clover 3 and pot 0, silver is clover 6 and pot 2, gold is clover 8 and pot 3. TRIFECTA gold uses the gold weights. Reruns use the same weights.

Clover faces are 2×, 3×, 4×, 5×, 10×, and 20×. Clovers resolve in reading order. Each one multiplies coins and pots that already hold a value on the eight surrounding cells. A clover does not multiply another clover. A face that reaches 5 is treated as silver, and a face that reaches 25 is treated as gold. Later clovers multiply the new faces, so the multipliers stack.

Pots then chain from left to right. Each pot collects every coin, and the last pot holds the total. Collected coins, used clovers, and spent pots flip again. The loop stops when a round flips no new clover and no new pot. The coin game can rerun up to 10 times. Hitting that cap awards the max win.`,
			`Coin faces are multiples of the base bet.
• Bronze (CB): 1, 2, 3, 4
• Silver (CS): 5, 7, 10, 15, 20
• Gold (CG): 25, 50, 100, 250, 500

A lit tile can flip to a coin, a clover (MULTI), or a pot (COLLECTOR). Against a coin weight of 100: bronze is clover 3 and pot 0, silver is clover 6 and pot 2, gold is clover 8 and pot 3. TRIFECTA gold uses the gold weights. Reruns use the same weights.

Clover faces are 2×, 3×, 4×, 5×, 10×, and 20×. Clovers resolve in reading order. Each one multiplies coins and pots that already hold a value on the eight surrounding cells. A clover does not multiply another clover. A face that reaches 5 is treated as silver, and a face that reaches 25 is treated as gold. Later clovers multiply the new faces, so the multipliers stack.

Pots then chain from left to right. Each pot collects every coin, and the last pot holds the total. Collected coins, used clovers, and spent pots flip again. The loop stops when a round flips no new clover and no new pot. The coin game can rerun up to 10 times. Hitting that cap pays the max win.`,
		),
	);

const buildFeatureSpinSection = (): GameRuleData =>
	ruleSection(
		copy('FEATURE PLAY', 'FEATURE SPIN'),
		copy(
			`Toggle Feature Play from the feature menu or the FEAT button (${formatPublishedCost(PUBLISHED_MODE_COST.feature_spin)}× play amount per play). The Progress Bar starts full. 56% of plays land no 5+ cluster and no scatter, so the coin game does not play. The other plays tumble, and the coin game plays after the tumbles stop.

Toggle it off from the same controls.`,
			`Toggle Feature Spin from the bonus menu or the FEAT button (${formatPublishedCost(PUBLISHED_MODE_COST.feature_spin)}× bet per spin). The Progress Bar starts full. 56% of spins land no 5+ cluster and no scatter, so the coin game does not play. The other spins tumble, and the coin game plays after the tumbles stop.

Toggle it off from the bonus button, the FEAT button, or the bonus menu.`,
		),
	);

const buildPeakSpinSection = (): GameRuleData =>
	ruleSection(
		copy('TRIFECTA PLAY', 'TRIFECTA SPIN'),
		copy(
			`Toggle TRIFECTA from the feature menu (${formatPublishedCost(PUBLISHED_MODE_COST.peak_spin)}× play amount per play). 72% of plays win nothing. The rest light every cell gold and play the coin game with gold coin faces.`,
			`Toggle TRIFECTA from the bonus menu (${formatPublishedCost(PUBLISHED_MODE_COST.peak_spin)}× bet per spin). 72% of spins pay nothing. The rest light every cell gold and play the coin game with gold coin faces.`,
		),
	);

const buildScatterSection = (): GameRuleData =>
	ruleSection(
		copy('SCATTER & FREE GAMES', 'SCATTER & FREE SPINS'),
		copy(
			`The toucan scatter does not award a win.
• 3 scatters → See No Evil (${RULES_FREE_SPINS} free games; the board clears; each winning cluster fills the Progress Bar; threshold 5)
• 4 scatters → Hear No Evil (${RULES_FREE_SPINS} free games; the board stays; one coin game per free game)
• 5 or more scatters → Monkey Madness (${RULES_FREE_SPINS} free games; the board stays; tiles go silver then gold, with no bronze). The bar starts full, and a coin game plays on every free game. If a play does not fill the bar, a coin game is still played. The reels are built around a 2,000× floor of the base play amount, so wins are spread through that region and not only the 5,000× tail. Monkey Madness stays rare on the base game and Extra Chance so a 3,000× floor does not overwhelm those modes.

Extra Chance (${formatPublishedCost(PUBLISHED_MODE_COST.base_ante)}× play amount) doubles the chance of a free-game feature from 1 in 260 plays to 1 in 130. When a feature starts, the 3, 4, and 5 scatter mix stays the same.

You can play See No Evil (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_see)}×), Hear No Evil (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_hear)}×), or Mystery Feature (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_pick)}×): 50% nothing, 45% Hear No Evil, 5% Monkey Madness.

During a feature, 4 or more scatters in See No Evil upgrade the round to Hear No Evil and add 4 free games. Otherwise 3 scatters add 4 free games, and 2 scatters add 2. Fewer than 2 do nothing. There is no coin game when the feature ends.

Level-Up Tiles reset when a feature starts. Hear No Evil and Monkey Madness then keep them from play to play. See No Evil clears them after each coin game.`,
			`Stone tablet scatters do not pay.
• 3 scatters → See No Evil (${RULES_FREE_SPINS} free spins; the board clears; each winning cluster fills the Progress Bar; threshold 5)
• 4 scatters → Hear No Evil (${RULES_FREE_SPINS} free spins; the board stays; one coin game per free spin)
• 5 or more scatters → Monkey Madness (${RULES_FREE_SPINS} free spins; the board stays; tiles go silver then gold, with no bronze). The bar starts full, and a coin game plays on every free spin. If a spin does not fill the bar, a coin game is still played. The reels are built around a 2,000× floor of the base bet, so wins are spread through that region and not only the 5,000× tail. Monkey Madness stays rare on the base game and Extra Chance so a 3,000× floor does not overwhelm those modes.

Extra Chance (${formatPublishedCost(PUBLISHED_MODE_COST.base_ante)}×) doubles the bonus chance from 1 in 260 spins to 1 in 130. When a bonus starts, the 3, 4, and 5 scatter mix stays the same.

You can buy See No Evil (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_see)}×) or Hear No Evil (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_hear)}×), or activate Mystery Bonus (${formatPublishedCost(PUBLISHED_MODE_COST.bonus_pick)}×): 50% dead spin, 45% Hear No Evil, 5% Monkey Madness.

During a bonus, 4 or more scatters in See No Evil upgrade the round to Hear No Evil and add 4 free spins. Otherwise 3 scatters add 4 free spins, and 2 scatters add 2. Fewer than 2 do nothing. There is no coin game when the bonus ends.

Level-Up Tiles reset when a bonus starts. Hear No Evil and Monkey Madness then keep them from spin to spin. See No Evil clears them after each coin game.`,
		),
	);

const buildWildsSection = (): GameRuleData =>
	ruleSection(
		'WILDS',
		copy(
			`Monkey wild (MW) substitutes for all winning symbols except scatters and coins. Wilds appear on the initial drop only (not during tumble refills), with at most 4 on the board.`,
			`Monkey wild (MW) substitutes for all paying symbols except scatters and coins. Wilds appear on the initial drop only (not during tumble refills), with at most 4 on the board.`,
		),
	);

const buildSymbolPaysSection = (): GameRuleData =>
	ruleSection(
		copy('SYMBOL WINS', 'SYMBOL PAYS'),
		copy(
			`Clusters win from 5 connected symbols. The win table lists Ten, Jack, Queen, King, Ace, Lemon, Coconut, Orange, Grape, and Banana. Cluster win = base win × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×).`,
			`Cluster pays start at 5 connected symbols. The paytable lists Ten, Jack, Queen, King, Ace, Lemon, Coconut, Orange, Grape, and Banana. Cluster pay = base pay × the sum of lit tile multipliers (Bronze 2×, Silver 5×, Gold 10×).`,
		),
	);

const buildControlsSection = (): GameRuleData =>
	ruleSection(
		'CONTROLS',
		copy(
			`• Play — press the play button to start one round at the current play amount.
• Turbo — press turbo to speed up the round. Press it again for a faster speed when that speed is allowed.
• Autoplay — open auto play and choose how many plays to run. They continue until the count finishes or you stop them.
• Spacebar — press space to play. Press it again to skip some motion when that skip is allowed.
• Menu — open the menu for game info, sound, and the other controls.
• Sound — turn effects and music on or off from the menu.
• Play amount — raise or lower the play amount. A win is a multiple of the base play amount.
• Features — open the feature menu to turn on Extra Chance, Feature Play, or TRIFECTA, or to play See No Evil, Hear No Evil, or Mystery Feature.`,
			`• Spin — press the spin button to play one round at the current bet.
• Turbo — press turbo to speed up the round. Press it again for a faster speed when that speed is allowed.
• Autoplay — open autoplay and choose how many rounds to run. They continue until the count finishes or you stop them.
• Spacebar — press space to spin. Press it again to skip some motion when slam-stop is allowed.
• Menu — open the menu for game info, sound, and the other controls.
• Sound — turn effects and music on or off from the menu.
• Bet — raise or lower the bet. A win is a multiple of the base bet.
• Buy — open the bonus menu to turn on Extra Chance, Feature Spin, or TRIFECTA, or to buy See No Evil, Hear No Evil, or Mystery Bonus.`,
		),
	);

const buildOfficialDisclaimerSection = (): GameRuleData =>
	ruleSection('GENERAL GAME DISCLAIMER', stakeGameDisclaimer());

export const buildKongClubGameRules = (): GameRuleData[] => [
	buildGameInfoSection(),
	buildHowToPlaySection(),
	buildProgressBarSection(),
	buildCoinGameSection(),
	buildFeatureSpinSection(),
	buildPeakSpinSection(),
	buildScatterSection(),
	buildWildsSection(),
	buildSymbolPaysSection(),
	buildControlsSection(),
	buildOfficialDisclaimerSection(),
];

const PAY_BANDS: { label: string; size: number }[] = [
	{ label: '13+', size: 13 },
	{ label: '11–12', size: 11 },
	{ label: '9–10', size: 9 },
	{ label: '8', size: 8 },
	{ label: '7', size: 7 },
	{ label: '6', size: 6 },
	{ label: '5', size: 5 },
];

const formatClusterPay = (tiers: LeBanditPayRow, size: number) => {
	const value = clusterPayAtSize(tiers, size);
	return `${value}×`;
};

const payLine = (tiers: LeBanditPayRow) =>
	PAY_BANDS.map((band) => `${band.label} ${formatClusterPay(tiers, band.size)}`).join(' · ');

const PAYTABLE_SYMBOLS: { name: string; image: string; tiers: LeBanditPayRow }[] = [
	{ name: 'Ten', image: 'T', tiers: LE_BANDIT_CLUSTER_TIERS.royals },
	{ name: 'Jack', image: 'J', tiers: LE_BANDIT_CLUSTER_TIERS.royals },
	{ name: 'Queen', image: 'Q', tiers: LE_BANDIT_CLUSTER_TIERS.royals },
	{ name: 'King', image: 'K', tiers: LE_BANDIT_CLUSTER_TIERS.royals },
	{ name: 'Ace', image: 'A', tiers: LE_BANDIT_CLUSTER_TIERS.royals },
	{ name: 'Lemon', image: 'LE', tiers: LE_BANDIT_CLUSTER_TIERS.mid },
	{ name: 'Coconut', image: 'CO', tiers: LE_BANDIT_CLUSTER_TIERS.mid },
	{ name: 'Orange', image: 'OR', tiers: LE_BANDIT_CLUSTER_TIERS.high },
	{ name: 'Grape', image: 'GR', tiers: LE_BANDIT_CLUSTER_TIERS.high },
	{ name: 'Banana', image: 'BA', tiers: LE_BANDIT_CLUSTER_TIERS.top },
];

/** Symbol pays for `stateMeta.gameRuleMeta.payTable`. Values are multiples of the base bet. */
export const buildKongClubPayTable = (): GameRuleData[] => {
	const stake = isSocialMode() ? 'base play amount' : 'base bet';
	const symbols = PAYTABLE_SYMBOLS.map((symbol) =>
		ruleSection(symbol.name, `Multiples of the ${stake}, by cluster size: ${payLine(symbol.tiers)}.`),
	);
	symbols.forEach((section, index) => {
		section.containers[0].image = PAYTABLE_SYMBOLS[index].image;
	});
	symbols.push(
		ruleSection(
			'Wild',
			copy(
				'Monkey wild (MW) substitutes for winning symbols except scatters and coins.',
				'Monkey wild (MW) substitutes for paying symbols except scatters and coins.',
			),
		),
		ruleSection(
			'Scatter',
			copy(
				'The toucan scatter does not award a win. 3 start See No Evil, 4 start Hear No Evil, and 5 or more start Monkey Madness.',
				'The scatter does not pay. 3 start See No Evil, 4 start Hear No Evil, and 5 or more start Monkey Madness.',
			),
		),
	);
	return symbols;
};
