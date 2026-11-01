	import { PUBLIC_LOCAL_DEV } from 'envs';
	import { stateSoundDerived } from 'state-shared';

import { assetUrl } from './assetUrl';
import { isGameAudioUnlocked } from './audioUnlock.svelte';

const COIN_TICK_URL = '/assets/audio/coin_tick.wav';

let coinTickBuffer: AudioBuffer | null = null;
let coinTickBufferPromise: Promise<AudioBuffer> | null = null;

const sfxVolume = () => stateSoundDerived.volumeSoundEffect();

export const getCoinTickBuffer = async (audioCtx: AudioContext): Promise<AudioBuffer> => {
	if (coinTickBuffer) return coinTickBuffer;

	if (!coinTickBufferPromise) {
		coinTickBufferPromise = fetch(assetUrl(COIN_TICK_URL))
			.then((response) => {
				if (!response.ok) {
					throw new Error(`coin_tick.wav fetch failed: ${response.status}`);
				}
				return response.arrayBuffer();
			})
			.then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
			.then((buffer) => {
				coinTickBuffer = buffer;
				return buffer;
			})
			.catch((error) => {
				coinTickBufferPromise = null;
				throw error;
			});
	}

	return coinTickBufferPromise;
};

/** Web Audio coin ticks — matches coin-counter demo (ease-out interval + rising pitch). */
export const startAcceleratingCoinTicks = (durationMs: number): (() => void) => {
	let cancelled = false;

	if (typeof window === 'undefined' || !isGameAudioUnlocked() || PUBLIC_LOCAL_DEV) {
		return () => {
			cancelled = true;
		};
	}

	const startTime = performance.now();
	const audioCtx = new AudioContext();

	void getCoinTickBuffer(audioCtx)
		.then((buffer) => {
			if (cancelled) return;
			return audioCtx.resume().then(() => buffer);
		})
		.then((buffer) => {
			if (!buffer || cancelled) return;

			let lastTick = 0;

			const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

			const frame = () => {
				if (cancelled) return;

				const now = performance.now();
				const elapsed = now - startTime;
				const t = Math.min(elapsed / durationMs, 1);
				const easedT = easeOut(t);
				const pitch = 0.8 + easedT * 1.0;
				const interval = 120 - easedT * 85;

				if (now - lastTick >= interval) {
					const source = audioCtx.createBufferSource();
					source.buffer = buffer;
					source.playbackRate.value = pitch;

					const gain = audioCtx.createGain();
					gain.gain.value = 0.7 * sfxVolume();

					source.connect(gain);
					gain.connect(audioCtx.destination);
					source.start();

					lastTick = now;
				}

				if (t < 1) requestAnimationFrame(frame);
			};

			requestAnimationFrame(frame);
		})
		.catch(() => {
			/* silent — missing asset or decode failure */
		});

	return () => {
		cancelled = true;
		void audioCtx.close().catch(() => {});
	};
};
