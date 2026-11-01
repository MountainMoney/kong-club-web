/**
 * Simulates Play Again replay cycles — verifies presentation state resets cleanly.
 * Run: node scripts/stress-replay-reset.mjs
 */

const assert = (cond, msg) => {
	if (!cond) throw new Error(msg);
};

const REPLAY_RESET_EVENTS = [
	'stopButtonClick',
	'winHide',
	'paylineWinHide',
	'hideClusterWinAmounts',
	'freeSpinIntroHide',
	'freeSpinOutroHide',
	'freeSpinCounterHide',
	'freeSpinCounterUpdate',
	'tumbleWinAmountReset',
	'tumbleWinAmountHide',
	'tumbleBoardReset',
	'tumbleBoardHide',
	'monkeyTilesClear',
	'monkeyTileWinPulseClear',
	'monkeyMechanicsReset',
	'multiplierGridHide',
	'multiplierGridClear',
	'boardFrameGlowHide',
	'boardShow',
];

/** Mirrors resetGameplayPresentation + replay stopButtonEnable. */
function createReplayResetModel() {
	let playbackInFlight = false;
	let playCount = 0;
	const broadcasts = [];

	const game = {
		gameType: 'freegame',
		lineWinPresentation: true,
		tumbleBoardAdding: [[1]],
		tumbleBoardBase: [[2]],
		multiplierBoard: [[5]],
		scatterCounter: 3,
	};

	const ui = {
		freeSpinCounterShow: true,
		freeSpinCounterCurrent: 7,
		freeSpinCounterTotal: 10,
	};

	const bet = { winBookEventAmount: 1234.56 };

	const tiles = { levels: [[3, 2, 1]], progress: { value: 5, threshold: 5 }, modeLabel: 'HEAR NO EVIL' };
	const multiplier = { show: true, value: 25, grid: [[10, 5]] };
	const tumbleWin = { show: true, amount: 500 };
	const spinSkip = { active: true, forceSkip: true, tumbleAnimating: true };
	const deferredCoins = { queued: 2, progressBarFull: true };

	const broadcast = (type, payload = {}) => {
		broadcasts.push({ type, ...payload });
		applyBroadcast(type, payload);
	};

	const applyBroadcast = (type, payload) => {
		switch (type) {
			case 'freeSpinIntroHide':
			case 'freeSpinOutroHide':
			case 'freeSpinCounterHide':
				ui.freeSpinCounterShow = false;
				break;
			case 'freeSpinCounterUpdate':
				if (payload.current !== undefined) ui.freeSpinCounterCurrent = payload.current;
				if (payload.total !== undefined) ui.freeSpinCounterTotal = payload.total;
				break;
			case 'monkeyTilesClear':
			case 'monkeyMechanicsReset':
				tiles.levels = [];
				tiles.progress = { value: 0, threshold: 10 };
				tiles.modeLabel = '';
				break;
			case 'multiplierGridClear':
				multiplier.grid = [];
				break;
			case 'tumbleWinAmountReset':
				tumbleWin.amount = 0;
				break;
			case 'tumbleWinAmountHide':
				tumbleWin.show = false;
				break;
			case 'boardShow':
				game.gameType = 'basegame';
				break;
			default:
				break;
		}
	};

	const resetGameplayPresentation = () => {
		game.gameType = 'basegame';
		game.lineWinPresentation = false;
		game.tumbleBoardAdding = [];
		game.tumbleBoardBase = [];
		game.multiplierBoard = [];
		game.scatterCounter = 0;

		broadcast('stopButtonClick');

		ui.freeSpinCounterShow = false;
		ui.freeSpinCounterCurrent = 0;
		ui.freeSpinCounterTotal = 0;
		for (const type of [
			'freeSpinIntroHide',
			'freeSpinOutroHide',
			'freeSpinCounterHide',
		]) {
			broadcast(type);
		}
		broadcast('freeSpinCounterUpdate', { current: 0, total: 0 });

		broadcast('winHide');
		broadcast('paylineWinHide');
		broadcast('hideClusterWinAmounts');

		broadcast('tumbleWinAmountReset');
		broadcast('tumbleWinAmountHide');
		broadcast('tumbleBoardReset');
		broadcast('tumbleBoardHide');

		deferredCoins.queued = 0;
		deferredCoins.progressBarFull = false;
		broadcast('monkeyTilesClear');
		broadcast('monkeyTileWinPulseClear');
		broadcast('monkeyMechanicsReset');

		broadcast('multiplierGridHide');
		broadcast('multiplierGridClear');
		broadcast('boardFrameGlowHide');

		broadcast('boardShow');

		spinSkip.active = false;
		spinSkip.forceSkip = false;
		spinSkip.tumbleAnimating = false;

		bet.winBookEventAmount = 0;
	};

	const beginReplayPlayback = () => {
		if (playbackInFlight) return false;
		playbackInFlight = true;
		resetGameplayPresentation();
		broadcast('stopButtonEnable');
		return true;
	};

	const simulatePlayAgain = async () => {
		if (!beginReplayPlayback()) return { started: false, cleanAfterReset: false };
		playCount += 1;
		const cleanAfterReset = isClean();
		// Simulate a bonus round leaving dirty state before the next Play Again.
		game.gameType = 'freegame';
		ui.freeSpinCounterShow = true;
		ui.freeSpinCounterCurrent = playCount;
		ui.freeSpinCounterTotal = 10;
		tiles.levels = [[3]];
		tiles.progress = { value: 5, threshold: 5 };
		multiplier.grid = [[1]];
		tumbleWin.show = true;
		tumbleWin.amount = playCount * 100;
		bet.winBookEventAmount = playCount * 50;
		spinSkip.active = true;
		deferredCoins.queued = 1;
		deferredCoins.progressBarFull = true;
		playbackInFlight = false;
		return { started: true, cleanAfterReset };
	};

	const isClean = () =>
		game.gameType === 'basegame' &&
		!game.lineWinPresentation &&
		game.tumbleBoardAdding.length === 0 &&
		game.multiplierBoard.length === 0 &&
		game.scatterCounter === 0 &&
		!ui.freeSpinCounterShow &&
		ui.freeSpinCounterCurrent === 0 &&
		ui.freeSpinCounterTotal === 0 &&
		tiles.levels.length === 0 &&
		tiles.progress.value === 0 &&
		tiles.modeLabel === '' &&
		multiplier.grid.length === 0 &&
		!tumbleWin.show &&
		tumbleWin.amount === 0 &&
		bet.winBookEventAmount === 0 &&
		!spinSkip.active &&
		!spinSkip.forceSkip &&
		!spinSkip.tumbleAnimating &&
		deferredCoins.queued === 0 &&
		!deferredCoins.progressBarFull;

	return {
		beginReplayPlayback,
		simulatePlayAgain,
		isClean,
		get playCount() {
			return playCount;
		},
		broadcasts,
	};
}

console.log('stress-replay-reset: single Play Again clears dirty bonus state');
{
	const model = createReplayResetModel();
	const result = await model.simulatePlayAgain();
	assert(result.started, 'first replay starts');
	assert(result.cleanAfterReset, 'state clean after reset at replay start');
}

console.log('stress-replay-reset: 10 consecutive Play Again cycles');
{
	const model = createReplayResetModel();
	let started = 0;
	for (let i = 0; i < 10; i++) {
		const result = await model.simulatePlayAgain();
		if (result.started) started += 1;
		assert(result.cleanAfterReset, `cycle ${i + 1}: state not clean after reset`);
	}
	assert(started === 10, `expected 10 replays, got ${started}`);
	assert(model.playCount === 10, 'play count matches cycles');
}

console.log('stress-replay-reset: double-click Play Again while in-flight');
{
	const model = createReplayResetModel();
	assert(model.beginReplayPlayback(), 'first replay acquires');
	let accepted = 0;
	for (let i = 0; i < 5; i++) {
		if (model.beginReplayPlayback()) accepted += 1;
	}
	assert(accepted === 0, 'in-flight replay rejects duplicate starts');
}

console.log('stress-replay-reset: required reset events fire');
{
	const model = createReplayResetModel();
	await model.simulatePlayAgain();
	const types = model.broadcasts.map((b) => b.type);
	for (const type of REPLAY_RESET_EVENTS) {
		assert(types.includes(type), `missing reset broadcast: ${type}`);
	}
}

console.log('stress-replay-reset: all passed');
