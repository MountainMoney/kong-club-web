import { Howl } from 'howler';
import { stateSoundDerived } from 'state-shared';

import { assetSrc } from '../assets/resolve';

/** Standalone Feature Spin loop. Path is `music_feature_spin` in the asset manifest. */

let howl: Howl | null = null;
let soundId: number | undefined;

const ensureHowl = () => {
	if (!howl) {
		howl = new Howl({
			src: [assetSrc('music_feature_spin')],
			html5: true,
			loop: true,
			preload: true,
			volume: 1,
		});
	}
	return howl;
};

export const playFeatureSpinMusic = () => {
	if (stateSoundDerived.volumeMusic() <= 0) return;
	const h = ensureHowl();
	if (soundId != null && h.playing(soundId)) return;
	h.stop();
	h.volume(stateSoundDerived.volumeMusic());
	soundId = h.play();
};

export const stopFeatureSpinMusic = () => {
	if (!howl) return;
	howl.stop();
	soundId = undefined;
};

export const syncFeatureSpinMusicVolume = () => {
	if (!howl) return;
	howl.volume(stateSoundDerived.volumeMusic());
};
