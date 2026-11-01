<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';

	import { getContext } from 'components-ui-pixi/src/context';
	import { AUTO_DIAMETER } from '../../game/layoutScene';
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
		props.width ?? props.diameter ?? props.height ?? AUTO_DIAMETER,
	);
	const sizes = $derived({ width: btnDiameter, height: btnDiameter });
	const active = $derived(stateBetDerived.hasAutoBetCounter());
	const disabled = $derived.by(() => {
		if (props.disabled) return true;
		if (stateBet.isSpaceHold) return true;
		if (
			!uiContext.stateXstateDerived.isIdle() &&
			!stateBetDerived.hasAutoBetCounter() &&
			!uiContext.stateXstateDerived.isAutoBetting()
		) {
			return true;
		}
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const onpress = () => {
		if (disabled) return;
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (
			stateBetDerived.hasAutoBetCounter() ||
			uiContext.stateXstateDerived.isAutoBetting()
		) {
			stateBet.autoSpinsCounter = 0;
		} else {
			stateModal.modal = { name: 'autoSpin' };
		}
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiCircleSpriteButton
				assetKey="btn_autospin"
				diameter={btnDiameter}
				{disabled}
				{active}
			/>
		</Container>
	{/snippet}
</Button>
