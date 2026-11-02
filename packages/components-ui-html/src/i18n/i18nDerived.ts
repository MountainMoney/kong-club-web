import { stateConfig, stateI18nDerived, stateUrlDerived } from 'state-shared';

const isSocialMode = () => stateUrlDerived.social() || stateConfig.jurisdiction.socialCasino;

export const i18nDerived = {
	bet: () => stateI18nDerived.translate(isSocialMode() ? 'PLAY' : 'BET'),
	max: () => stateI18nDerived.translate('MAX'),
	betMenu: () => stateI18nDerived.translate(isSocialMode() ? 'PLAY MENU' : 'BET MENU'),
	selectYourBet: () =>
		stateI18nDerived.translate(isSocialMode() ? 'SELECT YOUR PLAY' : 'SELECT YOUR BET'),
	confirm: () => stateI18nDerived.translate('CONFIRM'),
	masterVolume: () => stateI18nDerived.translate('MASTER VOLUME'),
	musicVolume: () => stateI18nDerived.translate('MUSIC VOLUME'),
	soundEffectVolume: () => stateI18nDerived.translate('SOUND EFFECT VOLUME'),
	autoSpins: () => stateI18nDerived.translate('AUTO SPINS'),
	numberOfRounds: () => stateI18nDerived.translate('NUMBER OF ROUNDS'),
	advanced: () => stateI18nDerived.translate('ADVANCED'),
	singleWinLimit: () => stateI18nDerived.translate('SINGLE WIN LIMIT'),
	lossLimit: () => stateI18nDerived.translate('LOSS LIMIT'),
	startAutoplay: () => stateI18nDerived.translate('START AUTOPLAY'),
	notification: () => stateI18nDerived.translate('NOTIFICATION'),
	autoSpinsStopInfo: () =>
		stateI18nDerived.translate(
			isSocialMode() ? 'AUTO PLAYS HAVE STOPPED DUE TO' : 'AUTO PLAY HAS STOPPED DUE TO',
		),
	insufficientFundsTitle: () =>
		isSocialMode()
			? stateI18nDerived.translate('NOT ENOUGH COINS')
			: stateI18nDerived.translate('INSUFFICIENT BALANCE'),
	insufficientFunds: () =>
		isSocialMode()
			? stateI18nDerived.translate(
					'NOT ENOUGH COINS TO START THIS PLAY. PLEASE LOWER THE PLAY LEVEL.',
				)
			: stateI18nDerived.translate(
					'INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.',
				),
	lossLimitReached: () =>
		stateI18nDerived.translate(isSocialMode() ? 'PLAY LIMIT REACHED' : 'LOSS LIMIT REACHED'),
	singleWinLimitReached: () => stateI18nDerived.translate('SINGLE WIN LIMIT REACHED'),
	settings: () => stateI18nDerived.translate('SETTINGS'),
};
