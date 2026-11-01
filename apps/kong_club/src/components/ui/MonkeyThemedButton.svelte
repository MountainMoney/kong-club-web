<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

	import { UI_THEME } from '../../game/uiTheme';

	type Props = Partial<Omit<ButtonProps, 'children'>> & {
		label: string;
		onpress: () => void;
		disabled?: boolean;
		/** Greyed presentation without blocking pointer (e.g. unaffordable activate modes). */
		dimmed?: boolean;
		active?: boolean;
		accent?: 'gold' | 'cyan';
		size?: number;
	};

	const props: Props = $props();
	const size = $derived(props.size ?? 72);
	const sizes = $derived({ width: size, height: size });
	const accentColor = $derived(props.accent === 'cyan' ? UI_THEME.cyan : UI_THEME.gold);
	const compactLabel = $derived((props.label?.length ?? 0) <= 4);
	const showDimmed = $derived(Boolean(props.dimmed ?? props.disabled));
</script>

<Button {...props} {sizes} onpress={props.onpress} disabled={props.disabled}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center}>
			<Rectangle
				anchor={0.5}
				width={sizes.width}
				height={sizes.height}
				borderRadius={12}
				backgroundColor={showDimmed
					? 0x444444
					: props.active
						? accentColor
						: hovered || pressed
							? UI_THEME.pitchLight
							: UI_THEME.pitchMid}
				borderColor={accentColor}
				borderWidth={props.active ? 4 : 2}
			/>
			<Text
				anchor={0.5}
				text={props.label}
				style={{
					fontFamily: 'Inter',
					fontSize: compactLabel ? Math.max(10, size * 0.24) : Math.max(11, size * 0.16),
					fontWeight: '800',
					fill: props.active ? UI_THEME.spinText : UI_THEME.white,
					align: 'center',
					wordWrap: !compactLabel,
					wordWrapWidth: compactLabel ? size : size - 8,
				}}
			/>
		</Container>
	{/snippet}
</Button>
