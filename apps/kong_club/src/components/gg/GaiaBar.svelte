<script lang="ts">
	import { bookEventAmountToNormalisedAmount } from 'utils-shared/amount';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateUi } from 'state-shared';

	import { getContext } from '../../game/context';
	import { formatBoardWin, formatMoney } from '../../game/stakeMoney';
	import { capBookAmount } from '../../game/winCountTier';
	import { stateBonusIntro } from '../../game/bonusIntroPresentation.svelte';
	import { stateBonusOutro } from '../../game/bonusOutroPresentation.svelte';
	import { stateGame } from '../../game/stateGame.svelte';
	import { getSpinSpeedDisplayTier } from '../../game/spinSpeed.svelte';
	import { isAutoplayDisabled, isSpinSpeedControlDisabled } from '../../game/jurisdiction';
	import { isActivateBetMode } from '../../game/betModes';
	import { huntLevelFromModeKey } from '../../game/stateHunt.svelte';
	import {
		freeSpinProgressLabel,
		freeSpinsToolbarLabel,
		isSocialMode,
		paytableModeLabel,
		toolbarLabel,
		type PaytableModeKey,
	} from '../../game/socialCopy';
	import {
		DESIGN_PORTRAIT,
		UI_BAR,
		UI_BAR_PORTRAIT,
		UI_COLOR,
		UI_FONT_FAMILY,
	} from '../../game/ggUi/constants';
	import {
		changeBet,
		controlsLocked,
		cycleTurbo,
		holdSkipBonus,
		onSpinPress,
		openGameInfo,
		pickBetAmount,
		pressBonusButton,
		startAutoRounds,
		stopAutoplay,
	} from '../../game/ggUi/actions';
	import { darken } from '../../game/ggUi/dim';
	import { stateXstateDerived } from '../../game/stateXstate';
	import UiButton from './UiButton.svelte';
	import UiChip from './UiChip.svelte';
	import UiPopups, { type Popup } from './UiPopups.svelte';

	const { replay = false }: { replay?: boolean } = $props();
	const context = getContext();
	const canvasSizes = () => context.stateLayoutDerived.canvasSizes();

	/** `uiHide` / `uiShow` from the book flow (bonus entry/exit, max win). Ryan Nov 10. */
	let hiddenByEvent = $state(false);
	const hidden = $derived(
		hiddenByEvent ||
			stateModal.modal?.name === 'buyBonus' ||
			stateBonusIntro.overlayAlpha > 0.15 ||
			stateBonusOutro.overlayAlpha > 0.15 ||
			stateBonusOutro.holdPlayfieldHidden,
	);

	const winTween = new Tween(stateBet.winBookEventAmount);
	$effect(() => {
		winTween.set(capBookAmount(stateBet.winBookEventAmount), { duration: 0 });
	});

	let popup = $state<Popup>(null);
	const inBonus = $derived(stateGame.gameType === 'freegame');
	const idle = $derived(stateXstateDerived.isIdle());
	const spinning = $derived(!idle && !inBonus);
	const autoRunning = $derived(stateXstateDerived.isAutoBetting());
	const autoArmed = $derived(stateBetDerived.hasAutoBetCounter() && !autoRunning);
	const speedTier = $derived(getSpinSpeedDisplayTier());
	const turboOn = $derived(speedTier !== 'normal');
	const superTurbo = $derived(speedTier === 'superTurbo');

	$effect(() => {
		if (hidden || (spinning && popup === 'bets')) popup = null;
	});

	const isPortrait = () => canvasSizes().width < canvasSizes().height;
	const barFit = () => (canvasSizes().width * 0.94) / UI_BAR.width;
	const uiScale = () => Math.min(1, barFit(), canvasSizes().height / 1080);
	const compact = $derived(isPortrait() || barFit() < UI_BAR.compactBelow);

	const B = UI_BAR.bonus;
	const P = UI_BAR_PORTRAIT;
	type Type = { label: { y: number; size: number }; value: { y: number; size: number } };

	const scale = $derived(uiScale());
	const x = $derived(canvasSizes().width / 2);
	const y = $derived(canvasSizes().height - UI_BAR.marginBottom * scale);
	const mobile = $derived.by(() => {
		const { width, height } = canvasSizes();
		const D = DESIGN_PORTRAIT;
		const s = isPortrait()
			? Math.min(width / D.width, height / D.height)
			: Math.min(1, width / D.width, (height * P.maxShare) / (D.height - P.top));
		const originY = isPortrait() ? (height - D.height * s) / 2 : height - D.height * s;
		return { x: (width - D.width * s) / 2, y: originY, scale: s };
	});

	const font = (size: number, fill: number) => ({
		fontFamily: UI_FONT_FAMILY,
		fontSize: size,
		fontWeight: '600' as const,
		fill,
	});

	const bets = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const betIndex = $derived(bets.indexOf(stateBet.betAmount));
	const balanceText = $derived(formatMoney(stateBet.balanceAmount, 'balance'));
	const betCash = $derived(
		inBonus ? stateBet.wageredBetAmount || stateBet.betAmount : stateBetDerived.betCost(),
	);
	const betText = $derived(formatMoney(betCash, 'bet'));
	const winCash = $derived(bookEventAmountToNormalisedAmount(capBookAmount(winTween.current)));
	const winText = $derived(formatBoardWin(winCash));
	const showWin = $derived(winCash > 0);
	const spinsText = $derived(
		freeSpinProgressLabel(stateUi.freeSpinCounterCurrent || 0, stateUi.freeSpinCounterTotal || 0),
	);

	const modeOn = $derived(isActivateBetMode(stateBet.activeBetModeKey));
	const betLabel = $derived.by(() => {
		if (!modeOn) return toolbarLabel('bet');
		const huntLevel = huntLevelFromModeKey(stateBet.activeBetModeKey);
		if (huntLevel) return `HUNT SPINS ${huntLevel}`;
		const key = stateBet.activeBetModeKey as PaytableModeKey;
		return paytableModeLabel(key).toUpperCase();
	});
	const betFill = $derived(modeOn || popup === 'bets' ? UI_COLOR.accent : UI_COLOR.label);

	/**
	 * Bonus / DISABLE button states, GG pattern (shaft-ui UiChip): the dark body stays
	 * opaque and only the content darkens to UI_COLOR.disabledIconBrightness while controls are
	 * locked. The plain logo and the DISABLE face crossfade instead of hard-cutting.
	 */
	const BONUS_FACE_MS = 160;
	const bonusModeFade = new Tween(0, { duration: BONUS_FACE_MS });
	const bonusLockDim = new Tween(1, { duration: BONUS_FACE_MS });

	const locked = $derived(controlsLocked() || replay);
	$effect(() => {
		void bonusModeFade.set(modeOn ? 1 : 0);
	});
	$effect(() => {
		void bonusLockDim.set(locked ? UI_COLOR.disabledIconBrightness : 1);
	});
	const betLocked = $derived(locked || inBonus);
	const turboLocked = $derived(stateBet.isSpaceHold || isSpinSpeedControlDisabled());
	const autoLocked = $derived(isAutoplayDisabled());

	let autoPick = $state(10);
	const autoPress = () => {
		if (autoLocked) return;
		if (autoRunning || autoArmed) {
			stopAutoplay();
			popup = null;
			return;
		}
		if (locked) return;
		popup = popup === 'auto' ? null : 'auto';
	};
	const startAuto = (rounds: number) => {
		autoPick = rounds;
		if (startAutoRounds(rounds)) popup = null;
	};

	const bonusPress = () => {
		if (replay) return;
		if (pressBonusButton()) stateModal.modal = { name: 'buyBonus' };
	};
	const spin = () => {
		if (replay && idle) return;
		onSpinPress();
		if (autoArmed) popup = null;
	};

	// The book flow broadcasts uiHide/uiShow, but nothing listened. Safety net: an idle
	// base game never keeps a stale hide.
	$effect(() => {
		if (idle && !inBonus) hiddenByEvent = false;
	});
	context.eventEmitter.subscribeOnMount({
		uiHide: () => {
			hiddenByEvent = true;
		},
		uiShow: () => {
			hiddenByEvent = false;
		},
	});

	const shown = $derived(hidden ? 0 : 1);
</script>

{#snippet readout(
	m: Type,
	x: number,
	anchorX: number,
	label: string,
	labelFill: number,
	value: string,
)}
	<Text
		text={label}
		{x}
		y={m.label.y}
		anchor={{ x: anchorX, y: 0.5 }}
		style={font(m.label.size, labelFill)}
	/>
	<Text
		text={value}
		{x}
		y={m.value.y}
		anchor={{ x: anchorX, y: 0.5 }}
		style={font(m.value.size, UI_COLOR.value)}
	/>
{/snippet}

{#snippet balance(m: Type, x: number)}
	{@render readout(m, x, 0, toolbarLabel('balance'), UI_COLOR.label, balanceText)}
{/snippet}

{#snippet win(m: Type, x: number, anchorX: number, label: string)}
	{#if showWin}
		{@render readout(m, x, anchorX, label, UI_COLOR.accent, winText)}
	{/if}
{/snippet}

{#snippet turbo(at: { x: number; y: number }, large = false)}
	<UiChip
		x={at.x}
		y={at.y}
		icon={large ? 'ggUiIconTurboLarge' : 'ggUiIconTurbo'}
		width={large ? B.chip.size : undefined}
		iconSize={large ? B.chip.iconSize : undefined}
		active={turboOn}
		solid={superTurbo}
		disabled={turboLocked}
		onpress={cycleTurbo}
	/>
{/snippet}

{#snippet auto(at: { x: number; y: number })}
	<UiChip
		x={at.x}
		y={at.y}
		icon="ggUiIconAuto"
		active={autoRunning || autoArmed || popup === 'auto'}
		disabled={autoLocked}
		onpress={autoPress}
	/>
{/snippet}

{#snippet bonusButton(x: number, y: number, compact = false)}
	<UiButton onpress={bonusPress} disabled={locked} disabledBrightness={1}>
		<!-- Logo stays opaque once DISABLE covers it, so a lock never shows the triangle through. -->
		<Sprite
			key={compact ? 'ggUiMobileLogo' : 'ggUiLogo'}
			{x}
			{y}
			tint={darken(1 - (1 - bonusModeFade.current) * (1 - bonusLockDim.current))}
		/>
		{#if bonusModeFade.current > 0.01}
			<Container alpha={bonusModeFade.current}>
				<Rectangle
					x={x + (compact ? 10 : 36)}
					y={y + (compact ? 16 : 28)}
					width={compact ? 49 : 88}
					height={compact ? 44 : 72}
					borderRadius={compact ? 8 : 12}
					backgroundColor={0x101010}
				/>
				<Container tint={darken(bonusLockDim.current)}>
					<Text
						text="×"
						x={x + (compact ? 34 : 80)}
						y={y + (compact ? 28 : 46)}
						anchor={0.5}
						style={font(compact ? 22 : 32, UI_COLOR.accent)}
					/>
					<Text
						text="DISABLE"
						x={x + (compact ? 34 : 80)}
						y={y + (compact ? 48 : 78)}
						anchor={0.5}
						style={font(compact ? 9 : 14, UI_COLOR.value)}
					/>
				</Container>
			</Container>
		{/if}
	</UiButton>
{/snippet}

{#snippet betZone(zone: { x: number; y: number; width: number; height: number })}
	<Rectangle
		x={zone.x}
		y={zone.y}
		width={zone.width}
		height={zone.height}
		backgroundColor={0x000000}
		backgroundAlpha={0.001}
		eventMode={betLocked ? 'none' : 'static'}
		cursor="pointer"
		onpointerdown={() => (popup = popup === 'bets' ? null : 'bets')}
	/>
{/snippet}

{#snippet dismiss()}
	<Rectangle
		width={canvasSizes().width}
		height={canvasSizes().height}
		backgroundColor={0x000000}
		backgroundAlpha={0.001}
		eventMode={popup ? 'static' : 'none'}
		onpointerdown={() => (popup = null)}
	/>
{/snippet}

{#snippet popups()}
	<UiPopups
		bind:popup
		mobile={compact}
		bonus={inBonus}
		{autoPick}
		currentBet={stateBet.betAmount}
		{bets}
		onauto={startAuto}
		onbet={(amount) => {
			pickBetAmount(amount);
			popup = null;
		}}
		oninfo={() => {
			popup = null;
			openGameInfo();
		}}
		onholdskip={holdSkipBonus}
	/>
{/snippet}

<Container alpha={shown} renderable={shown > 0} eventMode={shown === 1 ? 'passive' : 'none'}>
	{@render dismiss()}
	{#if compact}
		<Container x={mobile.x} y={mobile.y} scale={{ x: mobile.scale, y: mobile.scale }}>
			{#if inBonus}
				<Sprite key="ggUiMobilePanelBonus" x={P.bonus.panel.x} y={P.bonus.panel.y} />
				<UiChip
					x={P.bonus.menu.x}
					y={P.bonus.menu.y}
					icon="ggUiIconMenu"
					active={popup === 'menu'}
					onpress={() => (popup = popup === 'menu' ? null : 'menu')}
				/>
				{@render turbo(P.bonus.turbo)}
				{@render readout(
					P.bonus,
					P.bonus.spins,
					0,
					freeSpinsToolbarLabel(),
					UI_COLOR.label,
					spinsText,
				)}
				{@render win(P.bonus, P.bonus.win, 1, toolbarLabel('totalWin'))}
				{@render balance(P, P.left)}
				{@render readout(P, P.right, 1, toolbarLabel('bet'), UI_COLOR.label, betText)}
			{:else}
				{@render bonusButton(P.logo.x, P.logo.y, true)}
				<Sprite key="ggUiMobilePanel" x={P.panel.x} y={P.panel.y} />
				<UiButton onpress={() => (popup = popup === 'menu' ? null : 'menu')}>
					<Sprite key="ggUiMobileMenu" x={P.menuPanel.x} y={P.menuPanel.y} />
					<Sprite
						key="ggUiIconMenu"
						x={P.menu.x + UI_BAR.chip.size / 2}
						y={P.menu.y + UI_BAR.chip.size / 2}
						anchor={{ x: 0.5, y: 0.5 }}
						tint={popup === 'menu' ? UI_COLOR.accent : UI_COLOR.icon}
					/>
				</UiButton>
				<UiButton onpress={spinning ? spin : spin} disabled={replay && idle}>
					{#if spinning}
						<Sprite
							key="ggUiStop"
							x={P.spin.x}
							y={P.spin.y}
							scale={{ x: P.stopScale, y: P.stopScale }}
						/>
					{:else}
						<Sprite key="ggUiMobileSpin" x={P.spin.x} y={P.spin.y} />
					{/if}
				</UiButton>
				{@render turbo(P.turbo)}
				<UiChip
					x={P.betDown.x}
					y={P.betDown.y}
					icon="ggUiIconBetDown"
					rotation={Math.PI / 2}
					disabled={betLocked || betIndex <= 0}
					onpress={() => changeBet('down')}
				/>
				<UiChip
					x={P.betUp.x}
					y={P.betUp.y}
					icon="ggUiIconBetDown"
					rotation={-Math.PI / 2}
					disabled={betLocked || betIndex < 0 || betIndex >= bets.length - 1}
					onpress={() => changeBet('up')}
				/>
				{@render auto(P.auto)}
				{@render betZone(P.betZone)}
				{@render balance(P, P.left)}
				{@render win(P, P.centre, 0.5, isSocialMode() ? toolbarLabel('win') : 'WIN')}
				{@render readout(P, P.right, 1, betLabel, betFill, betText)}
			{/if}
			{@render popups()}
		</Container>
	{:else}
		<Container
			{x}
			{y}
			scale={{ x: scale, y: scale }}
			pivot={{ x: UI_BAR.width / 2, y: UI_BAR.height }}
		>
			{#if inBonus}
				<Sprite key="ggUiPanelBonus" x={B.panel.x} y={B.panel.y} />
				<Sprite key="ggUiPanelInfo" x={B.panelWin.x} y={B.panelWin.y} />
				<UiChip
					x={B.menu.x}
					y={B.menu.y}
					icon="ggUiIconMenuLarge"
					width={B.chip.size}
					iconSize={B.chip.iconSize}
					active={popup === 'menu'}
					onpress={() => (popup = popup === 'menu' ? null : 'menu')}
				/>
				{@render turbo(B.turbo, true)}
				{@render balance(UI_BAR, B.left)}
				{@render readout(UI_BAR, B.bet, 1, toolbarLabel('bet'), UI_COLOR.label, betText)}
				{@render readout(UI_BAR, B.spins, 0, freeSpinsToolbarLabel(), UI_COLOR.label, spinsText)}
				{@render win(UI_BAR, B.win, 1, toolbarLabel('totalWin'))}
			{:else}
				{@render bonusButton(UI_BAR.logo.x, UI_BAR.logo.y)}
				<Sprite key="ggUiPanelInfo" x={UI_BAR.panelInfo.x} y={UI_BAR.panelInfo.y} />
				<Sprite key="ggUiPanelBet" x={UI_BAR.panelBet.x} y={UI_BAR.panelBet.y} />
				<UiButton onpress={spin} disabled={replay && idle}>
					<Sprite key={spinning ? 'ggUiStop' : 'ggUiSpin'} x={UI_BAR.spin.x} y={UI_BAR.spin.y} />
				</UiButton>
				<UiChip
					x={UI_BAR.menu.x}
					y={UI_BAR.menu.y}
					icon="ggUiIconMenu"
					active={popup === 'menu'}
					onpress={() => (popup = popup === 'menu' ? null : 'menu')}
				/>
				<UiChip
					x={UI_BAR.betUp.x}
					y={UI_BAR.betUp.y}
					icon="ggUiIconBetUp"
					disabled={betLocked || betIndex < 0 || betIndex >= bets.length - 1}
					onpress={() => changeBet('up')}
				/>
				<UiChip
					x={UI_BAR.betDown.x}
					y={UI_BAR.betDown.y}
					icon="ggUiIconBetDown"
					disabled={betLocked || betIndex <= 0}
					onpress={() => changeBet('down')}
				/>
				{@render auto(UI_BAR.auto)}
				{@render turbo(UI_BAR.turbo)}
				{@render betZone(UI_BAR.betZone)}
				{@render balance(UI_BAR, UI_BAR.left)}
				{@render win(UI_BAR, UI_BAR.right, 1, toolbarLabel('totalWin'))}
				{@render readout(UI_BAR, UI_BAR.centre, 0.5, betLabel, betFill, betText)}
			{/if}
			{@render popups()}
		</Container>
	{/if}
</Container>
