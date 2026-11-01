<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { Container } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import { getContext } from 'components-ui-pixi/src/context';
	import { TURBO_DIAMETER } from '../../game/layoutScene';
	import { TURBO_TIER_CYCLE_PEAK_SCALE, TURBO_TIER_TINT } from '../../game/uiBarTheme';
	import {
		commitPendingSpinSpeedTier,
		cycleSpinSpeedTier,
		getSpinSpeedDisplayTier,
		type SpinSpeedTier,
	} from '../../game/spinSpeed.svelte';
	import { isSpinSpeedControlDisabled } from '../../game/jurisdiction';
	import UiCircleSpriteButton from './UiCircleSpriteButton.svelte';

	type Props = Partial<Omit<ButtonProps, 'children'>> & {
		width?: number;
		height?: number;
		diameter?: number;
		disabled?: boolean;
	};

	const props: Props = $props();
	const uiContext = getContext();
	const btnDiameter = $derived(
		props.width ?? props.diameter ?? props.height ?? TURBO_DIAMETER,
	);
	const sizes = $derived({ width: btnDiameter, height: btnDiameter });
	const tier = $derived(getSpinSpeedDisplayTier());
	const active = $derived(tier !== 'normal');
	const disabled = $derived(props.disabled ?? (stateBet.isSpaceHold || isSpinSpeedControlDisabled()));
	const activeTint = $derived(
		tier === 'superTurbo'
			? TURBO_TIER_TINT.superTurbo
			: tier === 'turbo'
				? TURBO_TIER_TINT.turbo
				: 0xffffff,
	);
	const tierScale = new Tween(1);
	let prevTier: SpinSpeedTier = getSpinSpeedDisplayTier();

	$effect(() => {
		const nextTier = getSpinSpeedDisplayTier();
		if (nextTier === prevTier) return;
		prevTier = nextTier;
		if (nextTier === 'normal') {
			tierScale.set(1, { duration: 0 });
			return;
		}
		tierScale.set(TURBO_TIER_CYCLE_PEAK_SCALE, { duration: 60 });
		const settle = setTimeout(() => tierScale.set(1, { duration: 120 }), 60);
		return () => clearTimeout(settle);
	});

	const onpress = () => {
		if (disabled) return;
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		cycleSpinSpeedTier();
	};

	// Commit queued tier between spins (SDK may touch isTurbo transiently).
	uiContext.eventEmitter.subscribeOnMount({
		stopButtonEnable: () => commitPendingSpinSpeedTier(),
	});
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center, hovered })}
		<Container {...center} scale={tierScale.current}>
			<UiCircleSpriteButton
				assetKey="btn_turbo"
				diameter={btnDiameter}
				{disabled}
				{active}
				{hovered}
				{activeTint}
			/>
		</Container>
	{/snippet}
</Button>
