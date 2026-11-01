<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { Container, Text, REM } from 'pixi-svelte';

	import UiButton from 'components-ui-pixi/src/components/UiButton.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import { getContext } from 'components-ui-pixi/src/context';

	import { stateBetDerived } from 'state-shared';

	import { isGameplayInputAllowed } from '../../game/gameplayLock.svelte';
	import {
		commitPendingSpinSpeedTier,
		cycleSpinSpeedTier,
		getSpinSpeedDisplayTier,
		spinSpeedLabel,
	} from '../../game/spinSpeed.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => stateBetDerived.updateIsTurbo(true, { persistent: false }),
		stopButtonEnable: () => commitPendingSpinSpeedTier(),
	});
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const active = $derived(getSpinSpeedDisplayTier() !== 'normal');
	const label = $derived(spinSpeedLabel());

	const onpress = () => {
		if (!isGameplayInputAllowed()) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		cycleSpinSpeedTier();
	};
</script>

<Container>
	<UiButton {...props} {sizes} {active} {onpress} icon="turbo" />
	<Text
		anchor={0.5}
		x={0}
		y={UI_BASE_SIZE * 0.08}
		text={label}
		eventMode="none"
		style={{
			fontFamily: 'Inter',
			fontSize: REM * 0.38,
			fontWeight: '800',
			fill: active ? 0xffd700 : 0xffffff,
			stroke: { color: 0x000000, width: 3 },
		}}
	/>
</Container>
