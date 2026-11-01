import { Howl } from 'howler';
import { stateSoundDerived } from 'state-shared';

/** Standalone base loop — Tropical Morning (Cole 2026-09-11). */
const SRC = '/assets/audio/bgm_main.mp3?v=tropical-morning';

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

export const playBaseGameMusic = () => {
	if (stateSoundDerived.volumeMusic() <= 0) return;
	const h = ensureHowl();
	if (soundId != null && h.playing(soundId)) return;
	h.stop();
	h.volume(stateSoundDerived.volumeMusic());
	soundId = h.play();
};

export const stopBaseGameMusic = () => {
	if (!howl) return;
	howl.stop();
	soundId = undefined;
};

export const syncBaseGameMusicVolume = () => {
	if (!howl) return;
	howl.volume(stateSoundDerived.volumeMusic());
};
