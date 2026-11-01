/**
 * Stress mid-bonus resume snapshot ordering (no browser).
 * Run: node scripts/stress-resume-snapshot.mjs
 */

const assert = (cond, msg) => {
	if (!cond) throw new Error(msg);
};

const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'kongClubMode',
	'updateLevelUpTiles',
	'updateGlobalMult',
	'updateFreeSpin',
	'setTotalWin',
	'progressFill',
];

const SNAPSHOT_RESTORE_STEP_ORDER = [
	'bonusEntry',
	'board',
	'freeSpinCounter',
	'tiles',
	'totalWin',
	'progressFill',
	'presentationReady',
];

const findLastBookEvent = (bookEvents, type) => {
	for (let i = bookEvents.length - 1; i >= 0; i -= 1) {
		if (bookEvents[i].type === type) return bookEvents[i];
	}
	return undefined;
};

const buildSnapshotRestorePlan = (bookEvents) => {
	const plan = ['bonusEntry'];
	if (findLastBookEvent(bookEvents, 'reveal')) plan.push('board');
	if (findLastBookEvent(bookEvents, 'updateFreeSpin')) plan.push('freeSpinCounter');
	if (findLastBookEvent(bookEvents, 'updateLevelUpTiles')) plan.push('tiles');
	if (findLastBookEvent(bookEvents, 'setTotalWin')) plan.push('totalWin');
	if (findLastBookEvent(bookEvents, 'progressFill')) plan.push('progressFill');
	plan.push('presentationReady');
	return plan;
};

const convertToResumableBet = (events, resumingIndex) => {
	const bookEventsBeforeResume = events.filter((_, i) => i < resumingIndex);
	const bookEventsAfterResume = events.filter((_, i) => i >= resumingIndex);
	const snapshotEvents = bookEventsBeforeResume.filter((event) =>
		BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(event.type),
	);
	return {
		snapshotEvents,
		eventsAfter: bookEventsAfterResume,
	};
};

const assertMonotonicOrder = (plan) => {
	const indices = plan.map((step) => SNAPSHOT_RESTORE_STEP_ORDER.indexOf(step));
	for (let i = 1; i < indices.length; i += 1) {
		assert(indices[i] > indices[i - 1], `restore steps out of order: ${plan.join(' → ')}`);
	}
};

/** Mirrors runBonusSnapshotRestore step recording for ordering checks. */
const simulateRestoreExecution = async (bookEvents) => {
	const executed = [];
	const record = (step) => executed.push(step);

	record('bonusEntry');
	if (findLastBookEvent(bookEvents, 'reveal')) record('board');
	if (findLastBookEvent(bookEvents, 'updateFreeSpin')) record('freeSpinCounter');
	if (findLastBookEvent(bookEvents, 'updateLevelUpTiles')) record('tiles');
	if (findLastBookEvent(bookEvents, 'setTotalWin')) record('totalWin');
	if (findLastBookEvent(bookEvents, 'progressFill')) record('progressFill');
	record('presentationReady');

	return executed;
};

const loadBonusHearBook = () => {
	/** Synthetic mid-bonus book with repeated FS-spin checkpoints (mirrors bonus_hear shape). */
	const spinCheckpoint = (spin, win, mult, progress) => [
		{ type: 'reveal', board: [[{ name: 'T' }]], gameType: 'freegame' },
		{ type: 'updateLevelUpTiles', tileLevels: [[[spin % 3]]], tileMultipliers: [[[2 * spin]]] },
		{ type: 'setTotalWin', amount: win },
		{ type: 'updateFreeSpin', amount: spin, total: 10 },
		{ type: 'updateGlobalMult', globalMult: mult },
		{ type: 'progressFill', value: progress.value, threshold: progress.threshold },
	];

	const events = [
		{ type: 'kongClubMode', state: 'start_bonus_hear', mode: 'bonus_hear', gameType: 'freegame' },
		{ type: 'updateLevelUpTiles', tileLevels: [[[0]]], tileMultipliers: [[[0]]] },
		{ type: 'updateFreeSpin', amount: 1, total: 10 },
		...spinCheckpoint(2, 500, 1, { value: 0, threshold: 1 }),
		...spinCheckpoint(3, 1200, 2, { value: 1, threshold: 1 }),
		...spinCheckpoint(4, 2400, 3, { value: 1, threshold: 1 }),
		...spinCheckpoint(5, 4100, 5, { value: 1, threshold: 1 }),
		...spinCheckpoint(6, 6800, 8, { value: 1, threshold: 1 }),
		{ type: 'freeSpinEnd', amount: 6800, winLevel: 3 },
	];

	return events;
};

console.log('stress-resume-snapshot: canonical step order');
assertMonotonicOrder(SNAPSHOT_RESTORE_STEP_ORDER);

console.log('stress-resume-snapshot: mid-bonus resume indices (bonus_hear book)');
{
	const events = loadBonusHearBook();
	const resumeIndices = [
		8, // after spin 2 checkpoint
		14,
		20,
		26,
		32,
		events.length - 3,
	];

	for (const index of resumeIndices) {
		const { snapshotEvents, eventsAfter } = convertToResumableBet(events, index);
		const plan = buildSnapshotRestorePlan(snapshotEvents);
		assertMonotonicOrder(plan);
		assert(plan[0] === 'bonusEntry', `index ${index}: must start with bonusEntry`);
		assert(plan.at(-1) === 'presentationReady', `index ${index}: must end with presentationReady`);
		assert(plan.includes('board'), `index ${index}: board missing from plan`);
		assert(plan.includes('freeSpinCounter'), `index ${index}: freeSpinCounter missing`);
		assert(plan.includes('tiles'), `index ${index}: tiles missing`);
		assert(plan.includes('totalWin'), `index ${index}: totalWin missing`);

		const executed = await simulateRestoreExecution(snapshotEvents);
		assert(
			executed.join(',') === plan.join(','),
			`index ${index}: execution order diverged from plan`,
		);
		assert(eventsAfter.length > 0, `index ${index}: no events left to resume`);
		assert(
			eventsAfter[0].type !== 'createBonusSnapshot',
			`index ${index}: resume state should not start with snapshot`,
		);
	}
}

console.log('stress-resume-snapshot: board before tiles');
{
	const events = loadBonusHearBook();
	const { snapshotEvents } = convertToResumableBet(events, 20);
	const plan = buildSnapshotRestorePlan(snapshotEvents);
	assert(plan.indexOf('board') < plan.indexOf('tiles'), 'board must restore before tiles');
	assert(
		plan.indexOf('freeSpinCounter') < plan.indexOf('tiles'),
		'freeSpinCounter must restore before tiles',
	);
}

console.log('stress-resume-snapshot: 20 random mid-bonus resume points');
{
	const events = loadBonusHearBook();
	const minIndex = 8;
	const maxIndex = events.length - 2;
	let tested = 0;

	for (let n = 0; n < 20; n += 1) {
		const index = minIndex + Math.floor(((maxIndex - minIndex) * (n + 1)) / 21);
		const { snapshotEvents } = convertToResumableBet(events, index);
		if (snapshotEvents.length === 0) continue;
		const plan = buildSnapshotRestorePlan(snapshotEvents);
		assertMonotonicOrder(plan);
		tested += 1;
	}

	assert(tested === 20, `expected 20 resume points, got ${tested}`);
}

console.log('stress-resume-snapshot: snapshot uses last event of each type');
{
	const snapshotEvents = [
		{ type: 'updateFreeSpin', amount: 1, total: 10 },
		{ type: 'updateFreeSpin', amount: 4, total: 10 },
		{ type: 'setTotalWin', amount: 100 },
		{ type: 'setTotalWin', amount: 250 },
		{ type: 'updateGlobalMult', globalMult: 2 },
		{ type: 'updateGlobalMult', globalMult: 5 },
		{ type: 'progressFill', value: 2, threshold: 5 },
		{ type: 'progressFill', value: 5, threshold: 5 },
	];

	const fs = findLastBookEvent(snapshotEvents, 'updateFreeSpin');
	const win = findLastBookEvent(snapshotEvents, 'setTotalWin');
	const mult = findLastBookEvent(snapshotEvents, 'updateGlobalMult');
	const progress = findLastBookEvent(snapshotEvents, 'progressFill');

	assert(fs.amount === 4, 'last updateFreeSpin should win');
	assert(win.amount === 250, 'last setTotalWin should win');
	assert(mult.globalMult === 5, 'last updateGlobalMult should win');
	assert(progress.value === 5, 'last progressFill should win');
}

console.log('stress-resume-snapshot: no scatter intro replay step');
{
	const plan = buildSnapshotRestorePlan([
		{ type: 'freeSpinTrigger', totalFs: 10, positions: [] },
		{ type: 'reveal', board: [], gameType: 'freegame' },
	]);
	assert(!plan.includes('freeSpinTrigger'), 'snapshot must not replay scatter intro');
	assert(plan.includes('bonusEntry'), 'minimal bonus entry only');
}

console.log('stress-resume-snapshot: all passed');
