<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateModal } from 'state-shared';

	import FootballThemedButton from './FootballThemedButton.svelte';
	import { getContext } from 'components-ui-pixi/src/context';

	const props: Partial<Omit<ButtonProps, 'children'>> & { size?: number } = $props();
	const uiContext = getContext();

	const onpress = () => {
		uiContext.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'payTable' };
	};
</script>

<FootballThemedButton
	{...props}
	label="INFO"
	accent="gold"
	{onpress}
	size={props.size ?? 52}
/>
