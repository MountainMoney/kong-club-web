const DEFAULT_BET_MODE_META = {
	BASE: {
		mode: 'BASE',
		costMultiplier: 1,
		type: 'default',
		parent: '',
		children: '',
		assets: {
			icon: '',
			dialogImage: '',
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: '',
			dialog: '',
			button: '',
			betAmountLabel: '',
			tickerIdle: '',
			tickerSpin: '',
			bannerText: '',
		},
		maxWin: 0,
	},
};

const DEFAULT_GAME_RULE_META = {
	payTable: [],
	gameRules: [],
	splashScreen: [],
};
export { DEFAULT_BET_MODE_META, DEFAULT_GAME_RULE_META };
