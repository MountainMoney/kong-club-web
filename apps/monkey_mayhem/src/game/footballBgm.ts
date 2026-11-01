import { eventEmitter } from './eventEmitter';
import { stopMaxWinMusic } from './maxWinMusic';
import type { MusicName } from './sound';

/** Win-level BGM stings referenced by SpinWinOverlay / PaylineWinHighlight. */
export const WIN_LEVEL_BGM_NAMES = [
	'bgm_winlevel_big',
	'bgm_winlevel_superwin',
	'bgm_winlevel_mega',
	'bgm_winlevel_epic',
	'bgm_winlevel_max',
] as const satisfies readonly MusicName[];

export const syncFootballBgmVolume = (_musicSliderPct?: number) => {};

export const resumeFootballBgmAfterWinSting = (inFreegame: boolean) => {
	stopMaxWinMusic();
	eventEmitter.broadcast({
		type: 'soundMusic',
		name: inFreegame ? 'bgm_freespin' : 'bgm_main',
	});
};
