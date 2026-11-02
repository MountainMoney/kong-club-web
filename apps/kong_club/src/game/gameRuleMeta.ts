import { stateMeta, type GameRuleData } from 'state-shared';

import { buildKongClubGameRules, buildKongClubPayTable } from './gameRulesContent';

export function initKongClubGameRules() {
	stateMeta.gameRuleMeta = {
		payTable: buildKongClubPayTable(),
		gameRules: buildKongClubGameRules(),
		splashScreen: [] satisfies GameRuleData[],
	};
}
