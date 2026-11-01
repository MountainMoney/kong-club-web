import { capBookAmount } from './winCountTier';

/** Last `setTotalWin`. See/Hear HUD adds the current tumble on top of this. */
let bonusSessionWin = 0;

export const getBonusSessionWin = () => bonusSessionWin;

export const resetBonusSessionWin = () => {
	bonusSessionWin = 0;
};

export const rememberBonusSessionWin = (bookAmount: number) => {
	bonusSessionWin = capBookAmount(bookAmount);
	return bonusSessionWin;
};
