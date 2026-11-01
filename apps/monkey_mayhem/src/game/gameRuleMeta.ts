import { stateMeta, type GameRuleData } from 'state-shared';

import { buildMonkeyMayhemGameRules } from './gameRulesContent';

export function initMonkeyMayhemGameRules() {
	stateMeta.gameRuleMeta = {
		payTable: [] satisfies GameRuleData[],
		gameRules: buildMonkeyMayhemGameRules(),
		splashScreen: [] satisfies GameRuleData[],
	};
}
