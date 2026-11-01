/** Sizes are design px inside MainContainer (MM desktop is 1422×800, not FF 1920×1080). */

export const BONUS_INTRO_TITLE_SIZE = 86;
export const BONUS_INTRO_SPINS_SIZE = 56;
export const BONUS_INTRO_DESC_SIZE = 28;
export const BONUS_INTRO_IMAGE_SIZE = 240;
export const BONUS_INTRO_FADE_MS = 450;
export const BONUS_INTRO_PANEL_W = 920;
export const BONUS_INTRO_PANEL_H = 520;
export const BONUS_INTRO_GROUP_GAP = 22;
export const BONUS_INTRO_SPINS_DESC_GAP = 10;
/** Lift as a fraction of main height so the stack sits above PRESS TO CONTINUE. */
export const BONUS_INTRO_GROUP_LIFT_RATIO = 0.06;
export const BONUS_INTRO_DESC_WRAP = 720;

export const bonusIntroLayoutCenter = (mainWidth: number, mainHeight: number) => ({
	x: Math.round(mainWidth * 0.5),
	y: Math.round(mainHeight * 0.5 - mainHeight * BONUS_INTRO_GROUP_LIFT_RATIO),
});
