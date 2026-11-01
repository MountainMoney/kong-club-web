<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

export type EmitterEventWin =
	| { type: 'winShow' }
	| { type: 'winHide' }
	| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToWinCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import WinAnimation from './WinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { ensureIntroFredokaFont } from '../game/introFont';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	let finishCountUpRef = $state<(() => void) | undefined>();
	let fontReady = $state(false);

	onMount(() => {
		void ensureIntroFredokaFont().then(() => {
			fontReady = true;
		});
	});

	const textRes = getPixiTextResolution();
	const amountStyle = $derived({
		fontFamily: fontReady ? 'Fredoka' : 'Arial',
		fontSize: winLevelData?.animation ? SYMBOL_SIZE * 3.6 : SYMBOL_SIZE,
		fontWeight: '700' as const,
		fill: 0xffffff,
		align: 'center' as const,
		stroke: { color: 0x000000, width: 8 },
	});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
		winSkip: () => {
			finishCountUpRef?.();
			oncomplete();
		},
		spinSkipPressToContinue: () => {
			if (show) {
				finishCountUpRef?.();
				oncomplete();
			}
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => (finishCountUpRef = finishCountUp)} />
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if winLevelData?.animation}
							<WinAnimation animationMap={winLevelData.animation}>
								<Text
									anchor={0.5}
									text={bookEventAmountToWinCurrencyString(countUpAmount)}
									style={amountStyle}
									resolution={textRes}
								/>
							</WinAnimation>
						{:else}
							<Text
								anchor={0.5}
								text={bookEventAmountToWinCurrencyString(countUpAmount)}
								style={amountStyle}
								resolution={textRes}
							/>
						{/if}
					</Container>
				</MainContainer>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
