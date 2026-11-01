import { eventEmitter } from './eventEmitter';

let coinLoopActive = false;

export const startWinCoinLoop = () => {
	if (coinLoopActive) return;
	coinLoopActive = true;
	eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
};

export const stopWinCoinLoop = () => {
	if (!coinLoopActive) return;
	coinLoopActive = false;
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
};
