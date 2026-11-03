/** Above this, a reel symbol is a drop-in, not a land bounce. */
export const COIN_CELL_ENTER_PX = 28;

export type CoinViewPose = {
	/** View is following the reel leave that started with held-board dismiss. */
	riding: boolean;
	dismissActive: boolean;
	symbolY: number;
	homeY: number;
	maskBottom: number;
};

/**
 * A coin view leaves when its cell symbol is off the board (falling out or
 * dropping in), and a view that rode the leave must not snap back onto the
 * next symbol when dismiss ends.
 */
export const shouldRetireCoinView = (pose: CoinViewPose): boolean => {
	const incoming = pose.symbolY < pose.homeY - COIN_CELL_ENTER_PX;
	const left = pose.symbolY >= pose.maskBottom;
	if (incoming || left) return true;
	if (pose.riding && !pose.dismissActive) return true;
	return false;
};
