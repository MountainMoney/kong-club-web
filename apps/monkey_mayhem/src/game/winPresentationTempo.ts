import { isFxLabActive, stateFxLab } from './fxLab.svelte';
import { WIN_COUNT_FADE_OUT_MS } from './winCountLayout';
import { winCountDurationMsRaw } from './winCountTier';
import { BOARD_DIMENSIONS } from './constants';
import { productionFeatureScale, productionIdleScale } from './presentationClocks';

export type PacingPreset = 'snappy' | 'standard' | 'cinematic';

const PACING_MULTIPLIERS: Record<PacingPreset, number> = {
	snappy: 1,
	standard: 1.35,
	cinematic: 1.75,
};

/** Slow-crawl values used by FX Lab dopamine previews. */
export const SLOW_CRAWL_REEL_MS = 180;
export const SLOW_CRAWL_HOLD_MS = 600;

const WIN_PRE_COUNTUP_HOLD_MS = 1000;
const WIN_PRE_COUNTUP_BIG_HOLD_MS = 2000;
const WIN_SYMBOL_ANIM_MIN_MULTIPLIER = 100;

const preCountUpHoldMs = (multiplier: number) => {
	const raw =
		multiplier >= WIN_SYMBOL_ANIM_MIN_MULTIPLIER
			? WIN_PRE_COUNTUP_BIG_HOLD_MS
			: WIN_PRE_COUNTUP_HOLD_MS;
	return scaleFeatureMs(raw, 350);
};

export const getActivePacingPreset = (): PacingPreset =>
	isFxLabActive() ? stateFxLab.pacingPreset : 'snappy';

export const getPacingMultiplier = (): number => PACING_MULTIPLIERS[getActivePacingPreset()];

const applyClock = (baseMs: number, floor: number, productionScale: () => number): number => {
	const mult = isFxLabActive() ? getPacingMultiplier() : productionScale();
	return Math.max(floor, Math.round(baseMs * mult));
};

/** Empty waits / lose settle / tumble column stagger. */
export const scaleIdleMs = (baseMs: number, floor = 0): number =>
	applyClock(baseMs, floor, productionIdleScale);

/** Cluster, coins, wins, scatters, bonus intro. */
export const scaleFeatureMs = (baseMs: number, floor = 0): number =>
	applyClock(baseMs, floor, productionFeatureScale);

/** @deprecated Idle clock — prefer scaleIdleMs / scaleFeatureMs. */
export const scalePresentationMs = (baseMs: number, floor = 0): number =>
	scaleIdleMs(baseMs, floor);

/** Paced count-up duration (tier table is unscaled raw ms). */
export const pacedWinCountDurationMs = (multiplier: number): number =>
	scaleFeatureMs(winCountDurationMsRaw(multiplier), 400);

/** Rough total for full win beat cleanup timeout in FX Lab. */
export const estimateFullWinBeatMs = (multiplier: number) => {
	const crawlMs =
		BOARD_DIMENSIONS.x * scaleFeatureMs(SLOW_CRAWL_REEL_MS, 120) +
		scaleFeatureMs(SLOW_CRAWL_HOLD_MS, 400);
	const snapshotMs = preCountUpHoldMs(multiplier);
	const countMs = pacedWinCountDurationMs(multiplier);
	const savorMs = isFxLabActive() ? scaleFeatureMs(600, 400) : 0;
	return crawlMs + snapshotMs + countMs + savorMs + WIN_COUNT_FADE_OUT_MS + 800;
};
