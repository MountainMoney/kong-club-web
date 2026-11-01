<script lang="ts" module>
	import { sound, type MusicName, type SoundEffectName, type SoundName } from '../game/sound';

	export type EmitterEventSound =
		| { type: 'soundMusic'; name: MusicName }
		| { type: 'soundOnce'; name: SoundEffectName; forcePlay?: boolean }
		| { type: 'soundLoop'; name: SoundEffectName }
		| { type: 'soundStop'; name: SoundName }
		| { type: 'soundFade'; name: SoundName; from: number; to: number; duration: number }
		| { type: 'soundScatterCounterIncrease' }
		| { type: 'soundScatterCounterClear' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	import { PUBLIC_LOCAL_DEV } from 'envs';
	import { waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';
	import { stateBet, stateSoundDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { isFeatureSpinBetMode } from '../game/betModes';
	import { WIN_LEVEL_BGM_NAMES } from '../game/footballBgm';
	import {
		playBaseGameMusic,
		stopBaseGameMusic,
		syncBaseGameMusicVolume,
	} from '../game/baseGameMusic';
	import {
		playFeatureSpinMusic,
		stopFeatureSpinMusic,
		syncFeatureSpinMusicVolume,
	} from '../game/featureSpinMusic';
	import { playMaxWinMusic, stopMaxWinMusic, syncMaxWinMusicVolume } from '../game/maxWinMusic';

	const context = getContext();

	const musicEnabled = () =>
		!PUBLIC_LOCAL_DEV && stateSoundDerived.volumeMusic() > 0;

	const sfxEnabled = () =>
		!PUBLIC_LOCAL_DEV && stateSoundDerived.volumeSoundEffect() > 0;

	const stopAtlasMusic = () => {
		sound.stop({ name: 'bgm_main' });
		sound.stop({ name: 'bgm_freespin' });
		for (const name of WIN_LEVEL_BGM_NAMES) {
			sound.stop({ name });
		}
	};

	const playMusic = (name: MusicName) => {
		if (name === 'bgm_winlevel_max') {
			stopBaseGameMusic();
			stopFeatureSpinMusic();
			stopAtlasMusic();
			playMaxWinMusic();
			return;
		}
		if (name === 'bgm_main') {
			stopMaxWinMusic();
			stopAtlasMusic();
			if (isFeatureSpinBetMode(stateBet.activeBetModeKey)) {
				stopBaseGameMusic();
				playFeatureSpinMusic();
			} else {
				stopFeatureSpinMusic();
				playBaseGameMusic();
			}
			return;
		}
		stopBaseGameMusic();
		stopFeatureSpinMusic();
		stopMaxWinMusic();
		if (!musicEnabled()) return;
		sound.players.music.play({ name });
	};

	context.eventEmitter.subscribeOnMount({
		// ui
		soundBetMode: async ({ betModeKey }) => {
			if (isFeatureSpinBetMode(betModeKey)) {
				stopBaseGameMusic();
				if (sfxEnabled()) sound.players.once.play({ name: 'sfx_winlevel_end' });
				await waitForTimeout(SECOND);
			}
			playMusic('bgm_main');
		},
		soundPressGeneral: () => {
			if (!sfxEnabled()) return;
			sound.players.once.play({ name: 'sfx_btn_general' });
		},
		soundPressBet: () => {
			if (!sfxEnabled()) return;
			sound.players.once.play({ name: 'sfx_btn_spin' });
		},
		// scatterCounter
		soundScatterCounterIncrease: () => (context.stateGame.scatterCounter = context.stateGame.scatterCounter + 1), // prettier-ignore
		soundScatterCounterClear: () => (context.stateGame.scatterCounter = 0),
		// game
		soundMusic: ({ name }) => playMusic(name),
		soundLoop: ({ name }) => {
			if (!sfxEnabled()) return;
			sound.players.loop.play({ name });
		},
		soundOnce: ({ name, forcePlay }) => {
			if (!sfxEnabled()) return;
			sound.players.once.play({ name, forcePlay });
		},
		soundStop: ({ name }) => {
			if (name === 'bgm_winlevel_max') stopMaxWinMusic();
			if (name === 'bgm_main') {
				stopBaseGameMusic();
				stopFeatureSpinMusic();
			}
			sound.stop({ name });
		},
		soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to }), // prettier-ignore
	});

	$effect(() => {
		stateSoundDerived.volumeMusic();
		syncBaseGameMusicVolume();
		syncFeatureSpinMusicVolume();
		syncMaxWinMusicVolume();
	});

	onMount(() => {
		playMusic('bgm_main');

		//How to control volume per soundfile(use fade)
		// sound.players.music.fade({ name: 'bgm_main', from: 0, to: 1, duration: 3000 });

		//How to control rate per soundfile
		// sound.players.music.rate({ rate: 2, name: 'bgm_main'}); // change play back rate(1: default, 0: slow, 1+ fasterm and higher pitch )
	});
</script>
