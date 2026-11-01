import { stateMeta, type GameRuleData } from 'state-shared';

import { buildKongClubGameRules } from './gameRulesContent';

export function initKongClubGameRules() {
	stateMeta.gameRuleMeta = {
		payTable: [] satisfies GameRuleData[],
		gameRules: buildKongClubGameRules(),
		splashScreen: [] satisfies GameRuleData[],
	};
}
