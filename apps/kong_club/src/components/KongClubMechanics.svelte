<script lang="ts" module>
	import type { BookEventOfType } from '../game/typesBookEvent';
	import type { ModeStateBookEvent } from '../game/modeStateEvent';
	import type { Position } from '../game/types';

	export type EmitterEventKongClub =
		| { type: 'monkeyTilesUpdate'; payload: BookEventOfType<'updateLevelUpTiles'> }
		| { type: 'monkeyTilesClear' }
		| { type: 'monkeyTileWinPulse'; positions: Position[] }
		| { type: 'monkeyProgressUpdate'; payload: BookEventOfType<'progressFill'> }
		| { type: 'monkeyBoardActivation'; payload: BookEventOfType<'boardActivation'> }
		| { type: 'monkeyCoinSeed'; payload: BookEventOfType<'coinSeed'> }
		| { type: 'monkeyScatterPayout'; payload: BookEventOfType<'scatterPayout'> }
		| { type: 'monkeyStickyWilds'; payload: BookEventOfType<'stickyWilds'> }
		| { type: 'monkeyModeState'; payload: ModeStateBookEvent }
		| { type: 'peakBarTease'; hit: boolean }
		| { type: 'peakBarSpinReset' }
		| { type: 'monkeyMechanicsReset'; instant?: boolean }
		| { type: 'heldBoardSpinAway' }
		| { type: 'coinFeatureClear' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicIn, cubicOut, sineOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { Container, Graphics } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import MonkeyProgressBar, { stateProgressBar } from './MonkeyProgressBar.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS, zIndexes } from '../game/constants';
	import {
		getMonkeyProgressBarBoardLayout,
		PROGRESS_BAR_CANVAS,
		PROGRESS_BAR_FILL_RECT,
	} from '../game/kongClubLayout';
	import { stateBet } from 'state-shared';
	import {
		PROGRESS_THRESHOLD_BASE,
		PROGRESS_THRESHOLD_FEATURE,
		PROGRESS_THRESHOLD_PEAK,
		isFeatureSpinBetMode,
		isPeakSpinBetMode,
	} from '../game/betModes';
	import { skippableDelay } from '../game/spinSkip.svelte';
	import {
		SUMMIT_TEASE_CLIMB_MS,
		SUMMIT_TEASE_CONTINUE_MS,
		SUMMIT_TEASE_DUMP_DRAIN_MS,
		SUMMIT_TEASE_DUMP_HOLD_MS,
		SUMMIT_TEASE_EARLY_DIE_MAX,
		SUMMIT_TEASE_EARLY_DIE_MIN,
		SUMMIT_TEASE_HOLD_MS,
		SUMMIT_TEASE_STOP_MAX,
		SUMMIT_TEASE_STOP_MIN,
		SUMMIT_TEASE_STOP_MS,
		beginSummitTeaseOverlay,
		endSummitTeaseOverlay,
		pulseSummitTeaseShake,
		randomSummitRatio,
		resetSummitTeaseOverlay,
		rollSummitEarlyDie,
		stateSummitTease,
	} from '../game/summitTease.svelte';

	const context = getContext();

	const BOARD_H = BOARD_DIMENSIONS.y * SYMBOL_SIZE;
	const BOARD_W = BOARD_DIMENSIONS.x * SYMBOL_SIZE;

	/** Visual fill 0–1 — tweened so steps flow instead of jumping. */
	const fillTween = new Tween(0);
	/** Leftover bar drain when the next spin starts (not an instant snap). */
	const PROGRESS_BAR_SPIN_DRAIN_MS = 420;
	const punchScale = new Tween(1);
	const punchFlash = new Tween(0);

	type BarSpark = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		r: number;
		life: number;
		maxLife: number;
		color: number;
		bright: boolean;
	};

	const SPARK_CAP = 36;
	const IDLE_SPARKS = 9;
	const SPARK_GOLD = 0xffe066;
	const SPARK_CREAM = 0xfff3a0;

	let progress = $state({ value: 0, threshold: PROGRESS_THRESHOLD_BASE });
	let barPhase = $state(0);
	/** Madness vine wash — one hue cycle ~22s so it fades, not marches. */
	let rainbowPhase = $state(0);
	let modeLabel = $state('');
	/** Sticky HEAR positions (board-local reel/row, no padding). */
	let stickyPositions = $state<Position[]>([]);
	let stickyPulse = $state(0);
	/** True while fillTween is moving (cluster step or Feature Spin pulse). */
	let filling = $state(false);
	let fillSeq = 0;
	let sparks = $state<BarSpark[]>([]);
	const sparkPool: BarSpark[] = [];
	let sparkSpawnAcc = 0;
	let lastSparkTick = 0;

	const barLayout = $derived(getMonkeyProgressBarBoardLayout(BOARD_W, BOARD_H));
	const summitArmed = $derived(isPeakSpinBetMode(stateBet.activeBetModeKey));
	let summitDumpRed = $state(false);
	/** 5-scatter Monkey Madness — bar stays full + rainbow until bonus ends. */
	let madnessArmed = $state(false);

	const syncProgressBarView = () => {
		const track = trackLayout;
		const bar = barLayout;
		stateProgressBar.zIndex = barLayout.zIndex;
		stateProgressBar.barX = bar.x;
		stateProgressBar.barY = bar.y;
		stateProgressBar.trackX = track.x;
		stateProgressBar.trackY = track.y;
		stateProgressBar.trackW = track.w;
		stateProgressBar.trackH = track.h;
		stateProgressBar.barW = track.barW;
		stateProgressBar.barH = track.barH;
		stateProgressBar.fillVisual = Math.min(1, Math.max(0, fillTween.current));
		stateProgressBar.dumpRed = summitDumpRed;
		stateProgressBar.armed = summitArmed;
		stateProgressBar.scatterRainbow = !summitDumpRed && madnessArmed;
		stateProgressBar.goldWash = !summitDumpRed && summitArmed && !madnessArmed;
		stateProgressBar.modeLabel = modeLabel;
		stateProgressBar.sparks = sparks;
		stateProgressBar.barPhase = barPhase;
		stateProgressBar.rainbowPhase = rainbowPhase;
		stateProgressBar.boardW = BOARD_W;
		stateProgressBar.punchScale = punchScale.current;
		stateProgressBar.punchFlash = punchFlash.current;
	};

	/** Driven by barPhase RAF so fillTween.current stays live each frame. */
	const fillVisual = $derived.by(() => {
		barPhase;
		return Math.min(1, Math.max(0, fillTween.current));
	});

	/**
	 * Top-slot fill on the 1564×1194 canvas (same as board/border).
	 * Mask left→right against the yellow fill opaque rect.
	 */
	const trackLayout = $derived.by(() => {
		const { width: barW, height: barH } = barLayout;
		const { w, h } = PROGRESS_BAR_CANVAS;
		const { x: fillX, y: fillY, w: fillW, h: fillH } = PROGRESS_BAR_FILL_RECT;
		return {
			barW,
			barH,
			x: (fillX / w) * barW,
			y: (fillY / h) * barH,
			w: (fillW / w) * barW,
			h: (fillH / h) * barH,
		};
	});

	const fillRatioFor = (value: number, threshold: number) =>
		Math.min(1, Math.max(0, value / Math.max(threshold, 1)));

	const beginFillMotion = () => {
		fillSeq += 1;
		filling = true;
		return fillSeq;
	};

	const endFillMotion = (seq: number) => {
		if (seq === fillSeq) filling = false;
	};

	const claimSpark = (): BarSpark =>
		sparkPool.pop() ?? {
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			r: 1,
			life: 0,
			maxLife: 1,
			color: SPARK_GOLD,
			bright: false,
		};

	const releaseSpark = (spark: BarSpark) => {
		if (sparkPool.length < SPARK_CAP) sparkPool.push(spark);
	};

	const spawnSpark = (meniscus: boolean) => {
		if (sparks.length >= SPARK_CAP) return;
		const { w, h } = trackLayout;
		const fill = fillVisual;
		if (fill <= 0.001 || w <= 1 || h <= 1) return;
		const right = w * fill;
		const band = Math.max(4, right);
		const spark = claimSpark();
		spark.y = 2 + Math.random() * Math.max(1, h - 4);
		if (meniscus) {
			spark.x = right - Math.random() * 10;
			spark.vx = 26 + Math.random() * 30;
			spark.r = 1.55 + Math.random() * 1.45;
			spark.maxLife = 0.45 + Math.random() * 0.35;
			spark.bright = true;
			spark.color = SPARK_CREAM;
		} else {
			spark.x = Math.random() * band;
			spark.vx = 10 + Math.random() * 14;
			spark.r = 1.15 + Math.random() * 1.2;
			spark.maxLife = 1.1 + Math.random() * 0.85;
			spark.bright = false;
			spark.color = Math.random() < 0.55 ? SPARK_GOLD : SPARK_CREAM;
		}
		spark.vy = (Math.random() - 0.5) * 8;
		spark.life = 1;
		sparks.push(spark);
	};

	const stepSparks = (dt: number) => {
		const fill = fillVisual;
		if (fill <= 0.001) {
			if (sparks.length > 0) {
				for (const spark of sparks) releaseSpark(spark);
				sparks = [];
			}
			sparkSpawnAcc = 0;
			return;
		}

		const { w, h } = trackLayout;
		const left = -6;
		const right = w * fill;
		const top = -6;
		const bot = h + 3;

		if (filling) {
			sparkSpawnAcc += dt;
			while (sparkSpawnAcc >= 0.045 && sparks.length < SPARK_CAP) {
				sparkSpawnAcc -= 0.045;
				spawnSpark(true);
			}
		} else {
			sparkSpawnAcc += dt;
			if (sparks.length < IDLE_SPARKS && sparkSpawnAcc >= 0.11) {
				sparkSpawnAcc = 0;
				spawnSpark(false);
			}
		}

		for (let i = sparks.length - 1; i >= 0; i -= 1) {
			const spark = sparks[i]!;
			spark.x += spark.vx * dt;
			spark.y += spark.vy * dt;
			spark.life -= dt / spark.maxLife;
			if (spark.life <= 0 || spark.x < left || spark.x > right + 12 || spark.y < top || spark.y > bot) {
				sparks.splice(i, 1);
				releaseSpark(spark);
			}
		}
		sparks = sparks;
	};

	const burstSparks = (count: number) => {
		for (let i = 0; i < count; i += 1) spawnSpark(true);
	};

	const punchBar = (complete: boolean) => {
		const peak = complete ? 1.14 : 1.07;
		void punchScale.set(peak, { duration: complete ? 80 : 55, easing: cubicOut }).then(() =>
			punchScale.set(1, { duration: complete ? 240 : 150, easing: cubicOut }),
		);
		void punchFlash.set(complete ? 1 : 0.62, { duration: 45 }).then(() =>
			punchFlash.set(0, { duration: complete ? 320 : 170 }),
		);
		burstSparks(complete ? 14 : 7);
	};

	const flowFillTo = (
		value: number,
		threshold: number,
		opts?: { instant?: boolean; durationMs?: number; easing?: (t: number) => number },
	) => {
		const target = fillRatioFor(value, threshold);
		if (opts?.instant) {
			fillSeq += 1;
			filling = false;
			punchScale.set(1, { duration: 0 });
			punchFlash.set(0, { duration: 0 });
			return fillTween.set(target, { duration: 0 });
		}
		const from = fillTween.current;
		const rising = target > from + 0.012;
		const falling = target < from - 0.012;
		const complete = rising && target >= 0.999;
		const connectionTick = rising && opts?.durationMs == null;
		if (connectionTick && complete) punchBar(true);
		const duration =
			opts?.durationMs ??
			(connectionTick
				? 280
				: falling
					? PROGRESS_BAR_SPIN_DRAIN_MS
					: Math.round(Math.max(160, Math.abs(target - from) * Math.max(threshold, 1) * 340)));
		const seq = beginFillMotion();
		return fillTween
			.set(target, {
				duration,
				easing: opts?.easing ?? (connectionTick ? sineOut : falling ? cubicIn : cubicOut),
			})
			.then(() => endFillMotion(seq));
	};

	const showFeatureSpinArmed = (opts?: { instant?: boolean }) => {
		modeLabel = 'FEATURE SPIN';
		progress = {
			value: PROGRESS_THRESHOLD_FEATURE,
			threshold: PROGRESS_THRESHOLD_FEATURE,
		};
		flowFillTo(PROGRESS_THRESHOLD_FEATURE, PROGRESS_THRESHOLD_FEATURE, opts);
	};

	const showMadnessArmed = (opts?: { instant?: boolean }) => {
		madnessArmed = true;
		modeLabel = 'MONKEY MADNESS';
		progress = {
			value: PROGRESS_THRESHOLD_BASE,
			threshold: PROGRESS_THRESHOLD_BASE,
		};
		flowFillTo(PROGRESS_THRESHOLD_BASE, PROGRESS_THRESHOLD_BASE, opts);
	};

	const showPeakSpinArmed = (opts?: { instant?: boolean }) => {
		modeLabel = 'TRIFECTA SPIN';
		progress = {
			value: 0,
			threshold: PROGRESS_THRESHOLD_PEAK,
		};
		flowFillTo(0, PROGRESS_THRESHOLD_PEAK, { instant: true, ...opts });
	};

	const drainPeakBarOnSpinClick = () => {
		modeLabel = 'TRIFECTA SPIN';
		fillSeq += 1;
		filling = false;
		summitDumpRed = false;
		resetSummitTeaseOverlay();
		progress = { value: 0, threshold: PROGRESS_THRESHOLD_PEAK };
		void flowFillTo(0, PROGRESS_THRESHOLD_PEAK, {
			durationMs: SUMMIT_TEASE_DUMP_DRAIN_MS,
			easing: cubicIn,
		});
	};

	const playPeakBarTease = async (hit: boolean) => {
		modeLabel = 'TRIFECTA SPIN';
		summitDumpRed = false;
		const threshold = PROGRESS_THRESHOLD_PEAK;
		if (fillTween.current > 0.01) {
			await flowFillTo(0, threshold, { instant: true });
		}
		const earlyDie = !hit && rollSummitEarlyDie();
		const stopRatio = earlyDie
			? randomSummitRatio(SUMMIT_TEASE_EARLY_DIE_MIN, SUMMIT_TEASE_EARLY_DIE_MAX)
			: randomSummitRatio(SUMMIT_TEASE_STOP_MIN, SUMMIT_TEASE_STOP_MAX);
		syncProgressBarView();
		beginSummitTeaseOverlay();

		const climbTo = async (
			ratio: number,
			durationMs: number,
			easing: (t: number) => number = cubicOut,
		) => {
			const value = ratio * threshold;
			progress = { value, threshold };
			await flowFillTo(value, threshold, { durationMs, easing });
		};

		const dumpFromHere = async () => {
			summitDumpRed = true;
			await skippableDelay(SUMMIT_TEASE_DUMP_HOLD_MS);
			progress = { value: 0, threshold };
			await Promise.all([
				flowFillTo(0, threshold, { durationMs: SUMMIT_TEASE_DUMP_DRAIN_MS, easing: cubicIn }),
				endSummitTeaseOverlay(),
			]);
		};

		try {
			await skippableDelay(SUMMIT_TEASE_HOLD_MS);
			await climbTo(stopRatio, SUMMIT_TEASE_CLIMB_MS, cubicOut);
			await skippableDelay(SUMMIT_TEASE_STOP_MS);
			if (hit) {
				await climbTo(1, SUMMIT_TEASE_CONTINUE_MS);
				context.eventEmitter.broadcast({
					type: 'soundOnce',
					name: 'sfx_multiplier_explosion_a',
				});
				pulseSummitTeaseShake();
				return;
			}
			await dumpFromHere();
		} finally {
			await endSummitTeaseOverlay();
			summitDumpRed = false;
		}
	};

	const drawStickyRing = (g: import('pixi.js').Graphics) => {
		const half = SYMBOL_SIZE * 0.42;
		const expand = stickyPulse * 3;
		g.clear();
		g.roundRect(-half - expand, -half - expand, half * 2 + expand * 2, half * 2 + expand * 2, 10);
		g.stroke({ color: 0xffd700, width: 3 + stickyPulse * 2, alpha: 0.85 + stickyPulse * 0.15 });
		g.roundRect(-half * 0.7, -half * 0.7, half * 1.4, half * 1.4, 8);
		g.stroke({ color: 0xfff3a0, width: 1.5, alpha: 0.45 });
	};

	onMount(() => {
		let raf = 0;
		lastSparkTick = performance.now();
		const tick = () => {
			const now = performance.now();
			const dt = Math.min(0.05, (now - lastSparkTick) / 1000);
			lastSparkTick = now;
			barPhase = (now / 1800) % 1;
			rainbowPhase = (now / 22000) % 1;
			stepSparks(dt);
			syncProgressBarView();
			raf = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (context.stateGame.scatterCounter >= 5 && !madnessArmed) {
			showMadnessArmed();
		}
	});

	context.eventEmitter.subscribeOnMount({
		monkeyTilesUpdate: () => {},

		monkeyProgressUpdate: (event) => {
			if (
				event.payload.mode === 'feature_spin' ||
				isFeatureSpinBetMode(stateBet.activeBetModeKey)
			) {
				modeLabel = 'FEATURE SPIN';
			} else if (
				event.payload.mode === 'peak_spin' ||
				isPeakSpinBetMode(stateBet.activeBetModeKey)
			) {
				modeLabel = 'TRIFECTA SPIN';
			}

			if (isFeatureSpinBetMode(stateBet.activeBetModeKey) && event.payload.value <= 0) {
				showFeatureSpinArmed();
				return;
			}

			if (madnessArmed || event.payload.mode === 'bonus_madness') {
				showMadnessArmed();
				return;
			}

			if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
				modeLabel = 'TRIFECTA SPIN';
				return;
			}

			progress = {
				value: event.payload.value,
				threshold: event.payload.threshold,
			};
			flowFillTo(event.payload.value, event.payload.threshold);
		},

		peakBarTease: async (event) => {
			await playPeakBarTease(event.hit);
		},

		peakBarSpinReset: () => {
			drainPeakBarOnSpinClick();
		},

		monkeyBoardActivation: () => {
			if (isFeatureSpinBetMode(stateBet.activeBetModeKey)) {
				showFeatureSpinArmed();
				return;
			}

			if (madnessArmed) {
				showMadnessArmed();
				return;
			}

			if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
				return;
			}

			progress = { ...progress, value: 0 };
			flowFillTo(0, progress.threshold);
		},

		monkeyCoinSeed: () => {},

		monkeyScatterPayout: () => {},

		/** Phase A: sticky Hear parked — ignore events if stale books emit them. */
		monkeyStickyWilds: () => {},

		monkeyModeState: (event) => {
			const state = event.payload.state;
			if (state === 'feature_spin') modeLabel = 'FEATURE SPIN';
			else if (state === 'peak_spin') modeLabel = 'TRIFECTA SPIN';
			else if (state.includes('madness')) showMadnessArmed();
			else if (state.includes('hear')) {
				madnessArmed = false;
				modeLabel = 'HEAR NO EVIL';
			} else modeLabel = '';

			if (!state.includes('hear')) {
				stickyPositions = [];
				stickyPulse = 0;
			}
		},

		monkeyMechanicsReset: (event) => {
			fillSeq += 1;
			filling = false;
			punchScale.set(1, { duration: 0 });
			punchFlash.set(0, { duration: 0 });
			for (const spark of sparks) releaseSpark(spark);
			sparks = [];
			stickyPositions = [];
			stickyPulse = 0;
			summitDumpRed = false;
			resetSummitTeaseOverlay();
			if (isFeatureSpinBetMode(stateBet.activeBetModeKey)) {
				showFeatureSpinArmed({ instant: true });
			} else if (isPeakSpinBetMode(stateBet.activeBetModeKey)) {
				showPeakSpinArmed({ instant: true });
			} else {
				madnessArmed = false;
				modeLabel = '';
				progress = { value: 0, threshold: PROGRESS_THRESHOLD_BASE };
				flowFillTo(0, PROGRESS_THRESHOLD_BASE, event.instant
					? { instant: true }
					: { durationMs: PROGRESS_BAR_SPIN_DRAIN_MS, easing: cubicIn });
			}
		},
	});
</script>

<!--
  Board-local: top-slot meter on the frame canvas (behind vines).
  During SUMMIT tease the bar remounts with the vine frame above the wash.
-->
{#if !stateSummitTease.active}
	<MonkeyProgressBar />
{/if}

<BoardContainer zIndex={zIndexes.boardSymbols}>
	{#each stickyPositions as pos (pos.reel + ':' + pos.row)}
		<Container
			x={(pos.reel + 0.5) * SYMBOL_SIZE}
			y={(pos.row + 0.5) * SYMBOL_SIZE}
			zIndex={20}
		>
			<Graphics draw={drawStickyRing} />
		</Container>
	{/each}
</BoardContainer>

