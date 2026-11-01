import { waitForTimeout } from 'utils-shared/wait';

export const SUMMIT_TEASE_OVERLAY_ALPHA = 0.3;
export const SUMMIT_TEASE_OVERLAY_IN_MS = 180;
export const SUMMIT_TEASE_OVERLAY_OUT_MS = 220;
/** Dim holds this long before the climb. Skippable with turbo/skip. */
export const SUMMIT_TEASE_HOLD_MS = 550;

export const SUMMIT_TEASE_STOP_MIN = 0.7;
export const SUMMIT_TEASE_STOP_MAX = 0.85;
export const SUMMIT_TEASE_EARLY_DIE_MIN = 0.3;
export const SUMMIT_TEASE_EARLY_DIE_MAX = 0.45;
export const SUMMIT_TEASE_EARLY_DIE_CHANCE = 1 / 12;
export const SUMMIT_TEASE_CLIMB_MS = 1700;
export const SUMMIT_TEASE_STOP_MS = 360;
export const SUMMIT_TEASE_CONTINUE_MS = 820;
export const SUMMIT_TEASE_DUMP_HOLD_MS = 320;
export const SUMMIT_TEASE_DUMP_DRAIN_MS = 420;

export const randomSummitRatio = (min: number, max: number) => min + Math.random() * (max - min);

export const rollSummitEarlyDie = () => Math.random() < SUMMIT_TEASE_EARLY_DIE_CHANCE;

export const stateSummitTease = $state({
	active: false,
	hiding: false,
	shakeX: 0,
	shakeY: 0,
});

let shakeRaf = 0;

const stopShake = () => {
	if (shakeRaf) {
		cancelAnimationFrame(shakeRaf);
		shakeRaf = 0;
	}
	stateSummitTease.shakeX = 0;
	stateSummitTease.shakeY = 0;
};

export const beginSummitTeaseOverlay = () => {
	stateSummitTease.active = true;
	stateSummitTease.hiding = false;
};

export const endSummitTeaseOverlay = async () => {
	if (!stateSummitTease.active) return;
	stateSummitTease.hiding = true;
	await waitForTimeout(SUMMIT_TEASE_OVERLAY_OUT_MS);
	if (!stateSummitTease.hiding) return;
	stateSummitTease.active = false;
	stateSummitTease.hiding = false;
};

export const resetSummitTeaseOverlay = () => {
	stopShake();
	stateSummitTease.active = false;
	stateSummitTease.hiding = false;
};

export const pulseSummitTeaseShake = (intensity = 8, durationMs = 240) => {
	stopShake();
	const until = performance.now() + durationMs;
	const tick = () => {
		const now = performance.now();
		if (now >= until) {
			shakeRaf = 0;
			stateSummitTease.shakeX = 0;
			stateSummitTease.shakeY = 0;
			return;
		}
		const t = 1 - (until - now) / durationMs;
		const mag = intensity * (1 - t);
		stateSummitTease.shakeX = (Math.random() - 0.5) * mag * 2;
		stateSummitTease.shakeY = (Math.random() - 0.5) * mag * 2;
		shakeRaf = requestAnimationFrame(tick);
	};
	shakeRaf = requestAnimationFrame(tick);
};
