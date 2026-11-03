import { Howl } from 'howler';
import { stateSoundDerived } from 'state-shared';

import { assetSrc } from '../assets/resolve';

/** Standalone max-win song. Path is `music_win_max` in the asset manifest. */

let howl: Howl | null = null;
let soundId: number | undefined;

const ensureHowl = () => {
	if (!howl) {
		howl = new Howl({
			src: [assetSrc('music_win_max')],
			html5: true,
			loop: true,
			preload: true,
			volume: 1,
		});
	}
	return howl;
};

export const playMaxWinMusic = () => {
	if (stateSoundDerived.volumeMusic() <= 0) return;
	const h = ensureHowl();
	if (soundId != null && h.playing(soundId)) return;
	h.stop();
	h.volume(stateSoundDerived.volumeMusic());
	soundId = h.play();
};

export const stopMaxWinMusic = () => {
	if (!howl) return;
	howl.stop();
	soundId = undefined;
};

export const syncMaxWinMusicVolume = () => {
	if (!howl) return;
	howl.volume(stateSoundDerived.volumeMusic());
};
