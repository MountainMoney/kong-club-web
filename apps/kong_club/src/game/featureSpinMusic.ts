import { Howl } from 'howler';
import { stateSoundDerived } from 'state-shared';

/** Standalone Feature Spin loop — Birds in the Lobby (Cole 2026-09-11). */
const SRC = '/assets/audio/bgm_feature_spin.mp3?v=birds-lobby';

let howl: Howl | null = null;
let soundId: number | undefined;

const ensureHowl = () => {
	if (!howl) {
		howl = new Howl({
			src: [SRC],
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
