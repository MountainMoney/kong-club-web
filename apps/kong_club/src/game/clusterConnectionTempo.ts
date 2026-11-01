/** Pacing for cluster connect → tile rank → poof → refill. */
export const CLUSTER_TILE_RANK_MS = 180;
/** Hold so the player can read the connection before clear (Le Bandit beat). */
export const CLUSTER_CONNECTION_ACK_MS = 420;
/** One inhale (scale breathe) on connected cells before poof — no overlay. */
export const CLUSTER_CONNECT_MOTION_MS = 320;
export const CLUSTER_CONNECT_SCALE_PEAK = 1.07;
export const CLUSTER_PRE_POOF_MS = 80;
export const CLUSTER_TUMBLE_DROP_MS = 153;
/** Fall time per cell — longer drops keep moving after short ones land. */
export const CLUSTER_TUMBLE_MS_PER_CELL = 140;
export const CLUSTER_TUMBLE_MIN_MS = 107;
export const CLUSTER_TUMBLE_BOUNCE_MS = 87;
export const CLUSTER_TUMBLE_BOUNCE_RATIO = 0.12;
/** Beat after on-board survivors land, before top refill drops in. */
export const CLUSTER_TUMBLE_INCOMING_PAUSE_MS = 187;
export const CLUSTER_TUMBLE_REEL_STAGGER_MS = 55;
export const CLUSTER_POOF_MS = 127;
export const CLUSTER_EXPLODE_MAX_MS = CLUSTER_POOF_MS + 33;
export const CLUSTER_LAND_MAX_MS = 140;
export const CLUSTER_WIN_POP_MS = 93;
export const CLUSTER_WIN_HOLD_MS = 213;
export const CLUSTER_WIN_FADE_MS = 120;
/** Wait until the previous $ floater is gone so two connections don’t stack. */
export const CLUSTER_CONNECT_STAGGER_MS = CLUSTER_WIN_POP_MS + CLUSTER_WIN_HOLD_MS;
/** Hard ceiling so a hung tween/spine cannot lock tumbleAnimating forever. */
export const CLUSTER_TUMBLE_SEQUENCE_MAX_MS = 3467;
