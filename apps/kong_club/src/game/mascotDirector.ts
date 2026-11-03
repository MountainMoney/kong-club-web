/**
 * Mascot one-shots play beside the round. Callers broadcast a cue and return.
 * Nothing in the book runner awaits the Spine clip.
 *
 * Priority (high wins): celebration > bananaphone > angry > randomidle > idle.
 */
export const MASCOT_ANIMS = ['idle', 'randomidle', 'angry', 'bananaphone', 'celebration'] as const;

export type MascotAnim = (typeof MASCOT_ANIMS)[number];

export const MASCOT_PRIORITY: Record<Exclude<MascotAnim, 'idle'>, number> = {
	randomidle: 1,
	angry: 2,
	bananaphone: 3,
	celebration: 4,
};

export const ANGRY_COOLDOWN_MS = 20_000;
export const RANDOM_IDLE_MIN_MS = 8_000;
export const RANDOM_IDLE_MAX_MS = 15_000;
export const DEAD_SPIN_STREAK = 5;
/** 3 stone tablets start a bonus, so 2 is one short. */
export const NEAR_MISS_SCATTERS = 2;
export const BIG_WIN_MULTIPLIER = 20;
export const BANANA_TAP_COUNT = 5;
export const BANANA_TAP_WINDOW_MS = 3_000;

/** Pose fraction used when `?mascotClip=` freezes a clip for screenshots. */
export const MASCOT_PREVIEW_POSE: Record<MascotAnim, number> = {
	idle: 0.18,
	randomidle: 0.45,
	angry: 0.55,
	bananaphone: 0.42,
	celebration: 0.5,
};

/** Seconds into each clip. Matches MM_Mascot_2 durations; preview only. */
export const MASCOT_PREVIEW_TIME: Record<MascotAnim, number> = {
	idle: 6 * MASCOT_PREVIEW_POSE.idle,
	randomidle: 1.5 * MASCOT_PREVIEW_POSE.randomidle,
	angry: 1.5 * MASCOT_PREVIEW_POSE.angry,
	bananaphone: 3.167 * MASCOT_PREVIEW_POSE.bananaphone,
	celebration: 1.5 * MASCOT_PREVIEW_POSE.celebration,
};

export type MascotCue =
	| { type: 'roundStart' }
	| { type: 'nearMiss' }
	| { type: 'bigWin' }
	| { type: 'bonusTrigger' }
	| { type: 'bonusEnded'; won: boolean }
	| { type: 'mysteryResult' }
	| { type: 'spinResolved'; winMultiplier: number; countDeadSpins: boolean }
	| { type: 'tap' }
	| { type: 'tick' }
	| { type: 'clipComplete'; anim: MascotAnim };

export type EmitterEventMascot = {
	type: 'mascotCue';
	cue: MascotCue;
};

export type MascotState = {
	current: MascotAnim;
	queue: MascotAnim[];
	deadSpins: number;
	lastAngryAt: number;
	nextRandomAt: number;
	tapMarks: number[];
	/** A 20× celebration already played this base spin. */
	celebratedSpin: boolean;
	/** Mystery Bonus mode event already celebrated this round. */
	mysteryRound: boolean;
};

export type MascotRuntime = {
	turbo: boolean;
	random?: () => number;
};

export type MascotBookEvent = {
	type: string;
	gameType?: string;
	board?: readonly (readonly ({ name?: string; scatter?: boolean } | undefined)[])[];
	totalWin?: number;
	amount?: number;
	mode?: string;
	state?: string;
};

export type MascotCueContext = {
	/** Base-game rounds count toward the dead-spin streak. Free spins do not. */
	countDeadSpins: boolean;
};

const ONE_SHOTS = new Set<MascotAnim>(['randomidle', 'angry', 'bananaphone', 'celebration']);

/** Same window as scatterAnticipation: 5 math rows, or padded reels with row 0 hidden. */
const countVisibleScatters = (
	board: readonly (readonly ({ name?: string; scatter?: boolean } | undefined)[])[],
) => {
	let count = 0;
	for (const reel of board) {
		const rows =
			reel.length <= 5
				? reel.map((_, index) => index)
				: [1, 2, 3, 4, 5].filter((row) => row < reel.length);
		for (const row of rows) {
			const symbol = reel[row];
			if (symbol?.name === 'ST' || symbol?.scatter === true) count += 1;
		}
	}
	return count;
};

export const mascotLoops = (anim: MascotAnim) => anim === 'idle';

export const isMascotAnim = (value: string | null | undefined): value is MascotAnim =>
	Boolean(value && (MASCOT_ANIMS as readonly string[]).includes(value));

export const mascotPreviewFromSearch = (search: string): MascotAnim | null => {
	const value = new URLSearchParams(search).get('mascotClip');
	return isMascotAnim(value) ? value : null;
};

export const randomIdleDelay = (random: () => number = Math.random) =>
	RANDOM_IDLE_MIN_MS + random() * (RANDOM_IDLE_MAX_MS - RANDOM_IDLE_MIN_MS);

export const createMascotState = (
	now: number,
	random: () => number = Math.random,
): MascotState => ({
	current: 'idle',
	queue: [],
	deadSpins: 0,
	lastAngryAt: Number.NEGATIVE_INFINITY,
	nextRandomAt: now + randomIdleDelay(random),
	tapMarks: [],
	celebratedSpin: false,
	mysteryRound: false,
});

const priority = (anim: MascotAnim) => (anim === 'idle' ? 0 : MASCOT_PRIORITY[anim]);

const enqueue = (queue: readonly MascotAnim[], anim: MascotAnim): MascotAnim[] => {
	if (anim === 'idle' || queue.includes(anim)) return [...queue];
	return [...queue, anim].sort((a, b) => priority(b) - priority(a));
};

const begin = (
	state: MascotState,
	anim: MascotAnim,
	queue: MascotAnim[],
	now: number,
	random: () => number,
): MascotState => ({
	...state,
	current: anim,
	queue,
	lastAngryAt: anim === 'angry' ? now : state.lastAngryAt,
	nextRandomAt: anim === 'idle' ? now + randomIdleDelay(random) : state.nextRandomAt,
});

const promote = (state: MascotState, now: number, runtime: MascotRuntime): MascotState => {
	const random = runtime.random ?? Math.random;
	const queue = [...state.queue];
	while (queue.length > 0) {
		const next = queue.shift()!;
		if (runtime.turbo && next !== 'celebration') continue;
		return begin(state, next, queue, now, random);
	}
	return begin(state, 'idle', [], now, random);
};

const request = (
	state: MascotState,
	anim: Exclude<MascotAnim, 'idle'>,
	now: number,
	runtime: MascotRuntime,
): MascotState => {
	if (runtime.turbo && anim !== 'celebration') return state;
	if (anim === 'angry' && now - state.lastAngryAt < ANGRY_COOLDOWN_MS) return state;
	if (state.current === anim) return state;

	const incoming = priority(anim);
	const playing = priority(state.current);
	if (incoming > playing) {
		const queue =
			ONE_SHOTS.has(state.current) && state.current !== 'randomidle'
				? enqueue(state.queue, state.current)
				: [...state.queue];
		return begin(state, anim, queue, now, runtime.random ?? Math.random);
	}
	return { ...state, queue: enqueue(state.queue, anim) };
};

const celebrate = (state: MascotState, now: number, runtime: MascotRuntime): MascotState => {
	if (state.celebratedSpin && (state.current === 'celebration' || state.queue.includes('celebration'))) {
		return state;
	}
	return request({ ...state, celebratedSpin: true, deadSpins: 0 }, 'celebration', now, runtime);
};

export const applyMascotCue = (
	state: MascotState,
	cue: MascotCue,
	now: number,
	runtime: MascotRuntime = { turbo: false },
): MascotState => {
	switch (cue.type) {
		case 'roundStart':
			if (state.mysteryRound) return state;
			return { ...state, celebratedSpin: false };
		case 'nearMiss':
			return request(state, 'angry', now, runtime);
		case 'bigWin':
			return celebrate(state, now, runtime);
		case 'bonusTrigger':
			return request(state, 'bananaphone', now, runtime);
		case 'bonusEnded':
			if (!cue.won) return state;
			return request({ ...state, deadSpins: 0 }, 'celebration', now, runtime);
		case 'mysteryResult':
			if (state.mysteryRound) return state;
			return request(
				{ ...state, mysteryRound: true, celebratedSpin: true, deadSpins: 0 },
				'celebration',
				now,
				runtime,
			);
		case 'spinResolved': {
			if (state.mysteryRound) {
				return { ...state, mysteryRound: false, deadSpins: 0 };
			}
			if (cue.winMultiplier >= BIG_WIN_MULTIPLIER) {
				return celebrate({ ...state, deadSpins: 0 }, now, runtime);
			}
			if (cue.winMultiplier > 0) return { ...state, deadSpins: 0 };
			if (!cue.countDeadSpins) return state;
			const deadSpins = state.deadSpins + 1;
			const next = { ...state, deadSpins };
			if (deadSpins >= DEAD_SPIN_STREAK) return request(next, 'angry', now, runtime);
			return next;
		}
		case 'tap': {
			if (runtime.turbo) return state;
			const tapMarks = [...state.tapMarks.filter((mark) => now - mark <= BANANA_TAP_WINDOW_MS), now];
			if (tapMarks.length >= BANANA_TAP_COUNT) {
				return request({ ...state, tapMarks: [] }, 'bananaphone', now, runtime);
			}
			return { ...state, tapMarks };
		}
		case 'tick': {
			if (runtime.turbo) {
				if (state.current === 'celebration') {
					return { ...state, queue: state.queue.filter((anim) => anim === 'celebration') };
				}
				if (state.current === 'idle' && state.queue.every((anim) => anim === 'celebration')) return state;
				const random = runtime.random ?? Math.random;
				return begin(
					state,
					'idle',
					state.queue.filter((anim) => anim === 'celebration'),
					now,
					random,
				);
			}
			if (state.current !== 'idle' || state.queue.length > 0) return state;
			if (now < state.nextRandomAt) return state;
			return begin(state, 'randomidle', [], now, runtime.random ?? Math.random);
		}
		case 'clipComplete':
			if (cue.anim !== state.current || state.current === 'idle') return state;
			return promote(state, now, runtime);
		default:
			return state;
	}
};

const isMysteryMode = (mode: string | undefined) => mode === 'bonus_pick' || mode === 'bonus_gamble';

const isModeState = (type: string) => type === 'kongClubMode' || type === 'monkeyMayhemMode';

/** Map one book event to mascot cues. Pure and synchronous. */
export const mascotCuesForBookEvent = (
	event: MascotBookEvent,
	ctx: MascotCueContext,
): MascotCue[] => {
	if (event.type === 'reveal') {
		const cues: MascotCue[] = [];
		if (event.gameType !== 'freegame') cues.push({ type: 'roundStart' });
		if (
			event.gameType !== 'freegame' &&
			event.board &&
			countVisibleScatters(event.board) === NEAR_MISS_SCATTERS
		) {
			cues.push({ type: 'nearMiss' });
		}
		return cues;
	}
	if (event.type === 'winInfo' && (event.totalWin ?? 0) >= BIG_WIN_MULTIPLIER) {
		return [{ type: 'bigWin' }];
	}
	if (event.type === 'freeSpinTrigger' || event.type === 'freeSpinRetrigger') {
		return [{ type: 'bonusTrigger' }];
	}
	if (event.type === 'freeSpinEnd') {
		return [{ type: 'bonusEnded', won: (event.amount ?? 0) > 0 }];
	}
	if (isModeState(event.type) && isMysteryMode(event.mode)) {
		return [{ type: 'mysteryResult' }];
	}
	if (event.type === 'finalWin') {
		return [
			{
				type: 'spinResolved',
				winMultiplier: event.amount ?? 0,
				countDeadSpins: ctx.countDeadSpins,
			},
		];
	}
	return [];
};
