import { spinWinOverlay } from './spinWinOverlay.svelte';

let shakeRaf = 0;
let ambientIntensity = 0;
let pulseUntil = 0;
let pulseIntensity = 0;

const applyShakeFrame = () => {
	const now = performance.now();
	const pulseActive = now < pulseUntil;
	const pulseT = pulseActive ? 1 - (pulseUntil - now) / 420 : 0;
	const pulse = pulseActive ? pulseIntensity * pulseT : 0;
	const total = pulse + ambientIntensity;
	spinWinOverlay.shakeX = (Math.random() - 0.5) * total * 2;
	spinWinOverlay.shakeY = (Math.random() - 0.5) * total * 2;
	shakeRaf = requestAnimationFrame(applyShakeFrame);
};

export const startWinScreenShake = (ambient: number) => {
	ambientIntensity = ambient;
	if (!shakeRaf) shakeRaf = requestAnimationFrame(applyShakeFrame);
};

export const pulseWinScreenShake = (intensity: number, durationMs = 420) => {
	pulseIntensity = intensity;
	pulseUntil = performance.now() + durationMs;
	if (!shakeRaf) shakeRaf = requestAnimationFrame(applyShakeFrame);
};

export const stopWinScreenShake = () => {
	cancelAnimationFrame(shakeRaf);
	shakeRaf = 0;
	ambientIntensity = 0;
	pulseUntil = 0;
	pulseIntensity = 0;
	spinWinOverlay.shakeX = 0;
	spinWinOverlay.shakeY = 0;
};
