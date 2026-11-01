/**
 * Lightweight simulation of wager-commit / skip guards (no browser).
 * Run: node scripts/stress-wager-guards.mjs
 */

const assert = (cond, msg) => {
	if (!cond) throw new Error(msg);
};

/** Mirrors gameplayLock.tryCommitWager + requestBet single-fire semantics. */
function createWagerGate() {
	let locked = false;
	let betDispatches = 0;

	return {
		requestBet() {
			if (locked) return false;
			locked = true;
			betDispatches += 1;
			return true;
		},
		unlock() {
			locked = false;
		},
		get locked() {
			return locked;
		},
		get betDispatches() {
			return betDispatches;
		},
	};
}

/** Mirrors stopButtonClick latch + requestSpinSkip eligibility. */
function createSkipGate() {
	let stopDisabled = false;
	let forceSkipCount = 0;
	let active = false;
	let tumbleAnimating = false;

	const canRequestSpinSkip = () => {
		if (tumbleAnimating) return false;
		return active;
	};

	return {
		beginPlayback() {
			active = true;
			stopDisabled = false;
		},
		endPlayback() {
			active = false;
			stopDisabled = false;
		},
		setTumbleAnimating(v) {
			tumbleAnimating = v;
		},
		onpressSkip() {
			if (stopDisabled) return;
			if (!active) return;
			if (!canRequestSpinSkip()) return;
			forceSkipCount += 1;
			stopDisabled = true;
		},
		get forceSkipCount() {
			return forceSkipCount;
		},
		get stopDisabled() {
			return stopDisabled;
		},
	};
}

/** Mirrors startBuyBonusRound acquire — second caller must not reset first buy. */
function createBuyGate() {
	let locked = false;
	let mode = 'base';
	let buyStarts = 0;

	return {
		startBuy() {
			if (locked) return false;
			locked = true;
			mode = 'bonus_see';
			buyStarts += 1;
			return true;
		},
		abortBuyOnAffordabilityFail() {
			mode = 'base';
		},
		finishBuy() {
			locked = false;
		},
		get mode() {
			return mode;
		},
		get buyStarts() {
			return buyStarts;
		},
		get locked() {
			return locked;
		},
	};
}

console.log('stress-wager-guards: double-click spin');
{
	const gate = createWagerGate();
	assert(gate.requestBet(), 'first spin commits');
	assert(!gate.requestBet(), 'second spin blocked');
	assert(gate.betDispatches === 1, 'only one wager dispatched');
	gate.unlock();
	assert(!gate.locked, 'unlocked after idle');
}

console.log('stress-wager-guards: rapid double-click spin (10 taps)');
{
	const gate = createWagerGate();
	let accepted = 0;
	for (let i = 0; i < 10; i++) {
		if (gate.requestBet()) accepted += 1;
	}
	assert(accepted === 1, `expected 1 accepted spin, got ${accepted}`);
}

console.log('stress-wager-guards: double-click buy');
{
	const buy = createBuyGate();
	assert(buy.startBuy(), 'first buy acquires');
	assert(!buy.startBuy(), 'second buy rejected');
	assert(buy.mode === 'bonus_see', 'mode not reset by duplicate click');
	assert(buy.buyStarts === 1, 'only one buy started');
	buy.finishBuy();
}

console.log('stress-wager-guards: duplicate buy while in-flight');
{
	const buy = createBuyGate();
	assert(buy.startBuy(), 'first buy in flight');
	assert(!buy.startBuy(), 'duplicate confirm rejected');
	assert(buy.mode === 'bonus_see', 'mode not reset by duplicate click');
	assert(buy.buyStarts === 1, 'still one buy');
	buy.finishBuy();
}

console.log('stress-wager-guards: rapid stop/skip');
{
	const skip = createSkipGate();
	skip.beginPlayback();
	for (let i = 0; i < 20; i++) skip.onpressSkip();
	assert(skip.forceSkipCount === 1, 'only first skip applies force skip');
	assert(skip.stopDisabled, 'stop latched until enable');
	skip.endPlayback();
	assert(!skip.stopDisabled, 'reset after round');
}

console.log('stress-wager-guards: skip blocked during tumble');
{
	const skip = createSkipGate();
	skip.beginPlayback();
	skip.setTumbleAnimating(true);
	skip.onpressSkip();
	assert(skip.forceSkipCount === 0, 'no skip during tumble');
	skip.setTumbleAnimating(false);
	skip.onpressSkip();
	assert(skip.forceSkipCount === 1, 'skip after tumble ends');
}

console.log('stress-wager-guards: space-hold loop (single lock, many fetches)');
{
	const gate = createWagerGate();
	assert(gate.requestBet(), 'initial tap commits');
	let spaceHoldFetches = 0;
	for (let i = 0; i < 5; i++) {
		// space-hold re-enters fetching without a new requestBet
		spaceHoldFetches += 1;
		assert(gate.locked, 'lock held across hold loop');
		assert(!gate.requestBet(), 'hold loop must not double-commit');
	}
	assert(gate.betDispatches === 1, 'still one wager');
	assert(spaceHoldFetches === 5, 'simulated hold iterations');
	gate.unlock();
}

console.log('stress-wager-guards: all passed');
