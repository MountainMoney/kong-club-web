/**
 * Intro cinematic sounds. Standalone Howls (same pattern as baseGameMusic.ts),
 * gated exactly like Sound.svelte's sfx: off in PUBLIC_LOCAL_DEV and when the
 * sound-effects volume is 0, and played at the current sfx volume.
 *
 * Sources / licences: static/assets/audio/intro/LICENSES.txt
 */
import { Howl } from 'howler';
import { PUBLIC_LOCAL_DEV } from 'envs';
import { stateSoundDerived } from 'state-shared';

import { assetUrl } from './assetUrl';

export type IntroSfx = 'intro_whoosh' | 'intro_card' | 'intro_click';

const howls = new Map<IntroSfx, Howl>();

const sfxEnabled = () => !PUBLIC_LOCAL_DEV && stateSoundDerived.volumeSoundEffect() > 0;

const ensure = (name: IntroSfx) => {
	let h = howls.get(name);
	if (!h) {
		h = new Howl({
			src: [assetUrl(`/assets/audio/intro/${name}.webm`), assetUrl(`/assets/audio/intro/${name}.mp3`)],
			preload: true,
			volume: 1,
		});
		howls.set(name, h);
	}
	return h;
};

export const preloadIntroSfx = () => {
	(['intro_whoosh', 'intro_card', 'intro_click'] as const).forEach(ensure);
};

export const playIntroSfx = (name: IntroSfx, volume = 1) => {
	if (!sfxEnabled()) return;
	const h = ensure(name);
	const id = h.play();
	h.volume(Math.max(0, Math.min(1, stateSoundDerived.volumeSoundEffect() * volume)), id);
};
