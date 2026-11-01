<script lang="ts">
	import { Text } from 'pixi-svelte';

	import UiThemedPanel from './UiThemedPanel.svelte';
	import { UI_THEME } from '../../game/uiTheme';

	type Props = {
		label: string;
		value: string;
		width?: number;
		height?: number;
	};

	const props: Props = $props();
	const panelW = $derived(props.width ?? 200);
	const panelH = $derived(props.height ?? 72);
</script>

<UiThemedPanel width={panelW} height={panelH}>
	<Text
		anchor={{ x: 0.5, y: 0 }}
		y={-panelH * 0.22}
		text={props.label}
		style={{
			fontFamily: 'Inter',
			fontSize: 18,
			fontWeight: '700',
			fill: UI_THEME.labelFill,
		}}
	/>
	<Text
		anchor={{ x: 0.5, y: 0 }}
		y={panelH * 0.08}
		text={props.value}
		style={{
			fontFamily: 'Inter',
			fontSize: 26,
			fontWeight: '800',
			fill: UI_THEME.valueFill,
		}}
	/>
</UiThemedPanel>
