<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';

	import { uiDisplaySize, type UiAssetKey } from '../../game/uiAssetSizes';
	import { TOOLBAR_BUTTON_HOVER_ALPHA } from '../../game/uiBarTheme';

	type Props = {
		assetKey: UiAssetKey;
		diameter: number;
		disabled?: boolean;
		active?: boolean;
		activeTint?: number;
		hovered?: boolean;
	};

	const props: Props = $props();
	const size = $derived(uiDisplaySize(props.assetKey, props.diameter));
	const d = $derived(props.diameter);
</script>

<Container>
	<Sprite
		key={props.assetKey}
		anchor={0.5}
		width={size.width}
		height={size.height}
		alpha={props.disabled ? 0.45 : 1}
		tint={props.active ? (props.activeTint ?? 0xffaa44) : 0xffffff}
	/>
	{#if props.hovered && !props.disabled}
		<Rectangle
			anchor={0.5}
			width={d}
			height={d}
			borderRadius={d / 2}
			backgroundColor={0xffffff}
			backgroundAlpha={TOOLBAR_BUTTON_HOVER_ALPHA}
		/>
	{/if}
</Container>
