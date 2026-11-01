import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

import { winPresentationSpeedScale } from './winCountTier';

/** Bonus transition screens: tap to continue, or auto-advance after this delay. */
export const BONUS_SCREEN_AUTO_ADVANCE_MS = 30_000;

export const bonusScreenAutoAdvanceMs = () =>
	Math.max(8000, Math.round(BONUS_SCREEN_AUTO_ADVANCE_MS * winPresentationSpeedScale()));

/** Scale bonus intro/outro animation durations with turbo tier. */
export const bonusScreenAnimMs = (baseMs: number) =>
	Math.max(100, Math.round(baseMs * winPresentationSpeedScale()));
