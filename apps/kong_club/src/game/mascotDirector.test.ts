import assert from 'node:assert/strict';
import test from 'node:test';

import {
	ANGRY_COOLDOWN_MS,
	applyMascotCue,
	BANANA_TAP_COUNT,
	BIG_WIN_MULTIPLIER,
	createMascotState,
	DEAD_SPIN_STREAK,
	mascotCuesForBookEvent,
	mascotPreviewFromSearch,
	RANDOM_IDLE_GAP_MS,
	type MascotState,
} from './mascotDirector.ts';

const noRandom = () => 0;
const at = (now: number) => createMascotState(now, noRandom);

const play = (
	state: MascotState,
	cue: Parameters<typeof applyMascotCue>[1],
	now: number,
	turbo = false,
) => applyMascotCue(state, cue, now, { turbo, random: noRandom });

const boardWithScatters = (count: number) => {
	const row = (scatter: boolean) => ({ name: scatter ? 'ST' : 'K', scatter });
	return [
		[row(count > 0), row(false), row(false), row(false), row(false)],
		[row(count > 1), row(false), row(false), row(false), row(false)],
		[row(count > 2), row(false), row(false), row(false), row(false)],
		[row(false), row(false), row(false), row(false), row(false)],
		[row(false), row(false), row(false), row(false), row(false)],
		[row(false), row(false), row(false), row(false), row(false)],
	];
};

test('idle is the default and randomidle waits for RANDOM_IDLE_GAP_MS', () => {
	const [min, max] = RANDOM_IDLE_GAP_MS;
	const state = at(0);
	assert.equal(state.current, 'idle');
	assert.equal(state.nextRandomAt, min);
	const early = play(state, { type: 'tick' }, min - 1);
	assert.equal(early.current, 'idle');
	const due = play(state, { type: 'tick' }, min);
	assert.equal(due.current, 'randomidle');
	const back = play(due, { type: 'clipComplete', anim: 'randomidle' }, min + 10);
	assert.equal(back.current, 'idle');
	assert.equal(back.nextRandomAt, min + 10 + min);
	const late = createMascotState(0, () => 1);
	assert.equal(late.nextRandomAt, max);
});

test('near-miss and five dead spins play angry, then wait out the cooldown', () => {
	assert.equal(ANGRY_COOLDOWN_MS, 30_000);
	const near = mascotCuesForBookEvent(
		{ type: 'reveal', gameType: 'basegame', board: boardWithScatters(2) },
		{ countDeadSpins: true },
	);
	assert.deepEqual(near, [{ type: 'roundStart' }, { type: 'nearMiss' }]);
	let state = at(0);
	for (const cue of near) state = play(state, cue, 1_000);
	assert.equal(state.current, 'angry');

	const cooled = play(state, { type: 'nearMiss' }, 1_000 + ANGRY_COOLDOWN_MS - 1);
	assert.equal(cooled.current, 'angry');
	assert.equal(cooled.queue.includes('angry'), false);
	const ready = play(
		play(cooled, { type: 'clipComplete', anim: 'angry' }, 1_000 + ANGRY_COOLDOWN_MS),
		{ type: 'nearMiss' },
		1_000 + ANGRY_COOLDOWN_MS,
	);
	assert.equal(ready.current, 'angry');

	let dead = at(0);
	for (let spin = 1; spin <= DEAD_SPIN_STREAK - 1; spin += 1) {
		dead = play(dead, { type: 'spinResolved', winMultiplier: 0, countDeadSpins: true }, spin);
	}
	assert.equal(dead.current, 'idle');
	assert.equal(dead.deadSpins, 4);
	dead = play(dead, { type: 'spinResolved', winMultiplier: 0, countDeadSpins: true }, 5);
	assert.equal(dead.current, 'angry');
	assert.equal(dead.deadSpins, 5);

	const reset = play(dead, { type: 'spinResolved', winMultiplier: 2, countDeadSpins: true }, 50_000);
	assert.equal(reset.deadSpins, 0);
});

test('one scatter short is 2 tablets, not 1 or 3', () => {
	assert.deepEqual(
		mascotCuesForBookEvent(
			{ type: 'reveal', gameType: 'basegame', board: boardWithScatters(1) },
			{ countDeadSpins: true },
		),
		[{ type: 'roundStart' }],
	);
	assert.equal(
		mascotCuesForBookEvent(
			{ type: 'reveal', gameType: 'basegame', board: boardWithScatters(3) },
			{ countDeadSpins: true },
		).some((cue) => cue.type === 'nearMiss'),
		false,
	);
	assert.deepEqual(
		mascotCuesForBookEvent(
			{ type: 'reveal', gameType: 'freegame', board: boardWithScatters(2) },
			{ countDeadSpins: false },
		),
		[],
	);
});

test('bonus trigger calls bananaphone and five taps do too', () => {
	const cues = mascotCuesForBookEvent({ type: 'freeSpinTrigger' }, { countDeadSpins: true });
	assert.deepEqual(cues, [{ type: 'bonusTrigger' }]);
	const played = play(at(0), cues[0]!, 10);
	assert.equal(played.current, 'bananaphone');
	const done = play(played, { type: 'clipComplete', anim: 'bananaphone' }, 20);
	assert.equal(done.current, 'idle');

	let taps = at(0);
	for (let i = 0; i < BANANA_TAP_COUNT - 1; i += 1) taps = play(taps, { type: 'tap' }, 100 + i);
	assert.equal(taps.current, 'idle');
	taps = play(taps, { type: 'tap' }, 104);
	assert.equal(taps.current, 'bananaphone');

	let slow = at(0);
	for (let i = 0; i < BANANA_TAP_COUNT; i += 1) slow = play(slow, { type: 'tap' }, i * 4_000);
	assert.equal(slow.current, 'idle');
});

test('20x, mystery result, and a winning bonus end celebrate', () => {
	assert.deepEqual(
		mascotCuesForBookEvent({ type: 'winInfo', totalWin: BIG_WIN_MULTIPLIER }, { countDeadSpins: true }),
		[{ type: 'bigWin' }],
	);
	assert.deepEqual(
		mascotCuesForBookEvent({ type: 'winInfo', totalWin: BIG_WIN_MULTIPLIER - 1 }, { countDeadSpins: true }),
		[],
	);
	assert.equal(play(at(0), { type: 'bigWin' }, 5).current, 'celebration');

	const mystery = mascotCuesForBookEvent(
		{ type: 'kongClubMode', state: 'start_dead', mode: 'bonus_pick' },
		{ countDeadSpins: true },
	);
	assert.deepEqual(mystery, [{ type: 'mysteryResult' }]);
	const legacy = mascotCuesForBookEvent(
		{ type: 'monkeyMayhemMode', state: 'start_bonus_see', mode: 'bonus_gamble' },
		{ countDeadSpins: true },
	);
	assert.equal(legacy[0]?.type, 'mysteryResult');
	let round = play(at(0), { type: 'mysteryResult' }, 1);
	assert.equal(round.current, 'celebration');
	round = play(round, { type: 'spinResolved', winMultiplier: 0, countDeadSpins: true }, 2);
	assert.equal(round.deadSpins, 0);
	assert.equal(round.mysteryRound, false);

	const ending = mascotCuesForBookEvent({ type: 'freeSpinEnd', amount: 12 }, { countDeadSpins: false });
	assert.deepEqual(ending, [{ type: 'bonusEnded', won: true }]);
	assert.equal(play(at(0), ending[0]!, 3).current, 'celebration');
	const lost = mascotCuesForBookEvent({ type: 'freeSpinEnd', amount: 0 }, { countDeadSpins: false });
	assert.equal(play(at(0), lost[0]!, 3).current, 'idle');

	const finalCue = mascotCuesForBookEvent({ type: 'finalWin', amount: 20 }, { countDeadSpins: true })[0]!;
	assert.equal(play(at(0), finalCue, 4).current, 'celebration');
});

test('priority is celebration, then bananaphone, then angry, then randomidle', () => {
	const [gapMin] = RANDOM_IDLE_GAP_MS;
	let state = play(at(0), { type: 'tick' }, gapMin);
	assert.equal(state.current, 'randomidle');
	state = play(state, { type: 'nearMiss' }, gapMin);
	assert.equal(state.current, 'angry');
	state = play(state, { type: 'bonusTrigger' }, gapMin);
	assert.equal(state.current, 'bananaphone');
	assert.deepEqual(state.queue, ['angry']);
	state = play(state, { type: 'bigWin' }, gapMin);
	assert.equal(state.current, 'celebration');
	assert.deepEqual(state.queue, ['bananaphone', 'angry']);
	state = play(state, { type: 'clipComplete', anim: 'celebration' }, gapMin + 1);
	assert.equal(state.current, 'bananaphone');
	state = play(state, { type: 'clipComplete', anim: 'bananaphone' }, gapMin + 2);
	assert.equal(state.current, 'angry');
	state = play(state, { type: 'clipComplete', anim: 'angry' }, gapMin + 3);
	assert.equal(state.current, 'idle');
});

test('turbo keeps celebration and skips the other cues', () => {
	const idle = at(0);
	assert.equal(play(idle, { type: 'bonusTrigger' }, 10, true).current, 'idle');
	assert.equal(play(idle, { type: 'nearMiss' }, 10, true).current, 'idle');
	assert.equal(play(idle, { type: 'tap' }, 10, true).current, 'idle');
	assert.equal(play(idle, { type: 'tick' }, RANDOM_IDLE_GAP_MS[0], true).current, 'idle');
	assert.equal(play(idle, { type: 'bigWin' }, 10, true).current, 'celebration');
	assert.equal(play(idle, { type: 'mysteryResult' }, 10, true).current, 'celebration');

	const phone = play(idle, { type: 'bonusTrigger' }, 10, false);
	const cut = play(phone, { type: 'tick' }, 11, true);
	assert.equal(cut.current, 'idle');
});

test('mascotClip query picks a preview pose and ignores unknown names', () => {
	assert.equal(mascotPreviewFromSearch('?mascotClip=angry'), 'angry');
	assert.equal(mascotPreviewFromSearch('?mascotClip=nope'), null);
	assert.equal(mascotPreviewFromSearch(''), null);
});
