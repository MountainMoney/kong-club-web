import { Howl } from 'howler';
import { stateSoundDerived } from 'state-shared';

import { assetUrl } from './assetUrl';

/** Standalone max-win song — not the 8s sprite slice in sounds.mp3. */
const SRC_PATH = '/assets/audio/bgm_winlevel_max.mp3';

let howl: Howl | null = null;
let soundId: number | undefined;

const ensureHowl = () => {
	if (!howl) {
		howl = new Howl({
			src: [assetUrl(SRC_PATH)],
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
