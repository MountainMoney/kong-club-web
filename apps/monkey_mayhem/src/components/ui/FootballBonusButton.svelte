<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import { uiDisplaySize } from '../../game/uiAssetSizes';
	import { FEATURE_SPIN_BET_MODE_KEY, ANTE_BET_MODE_KEY, PEAK_SPIN_BET_MODE_KEY, GAMBLE_BET_MODE_KEY } from '../../game/betModes';

	type Props = {
		size?: number;
		disabled?: boolean;
		onpress: () => void;
	};

	const props: Props = $props();
	const diameter = $derived(props.size ?? 88);
	const featureToggleActive = $derived(
		stateBet.activeBetModeKey === ANTE_BET_MODE_KEY ||
			stateBet.activeBetModeKey === FEATURE_SPIN_BET_MODE_KEY ||
			stateBet.activeBetModeKey === PEAK_SPIN_BET_MODE_KEY ||
			stateBet.activeBetModeKey === GAMBLE_BET_MODE_KEY,
	);
	const spriteKey = $derived(featureToggleActive ? 'btn_disable' : 'bonus_button');
	const spriteSize = $derived(uiDisplaySize(spriteKey, diameter));
</script>

<Button
	sizes={{ width: diameter, height: diameter }}
	disabled={props.disabled}
	onpress={props.onpress}
>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key={spriteKey}
				anchor={0.5}
				width={spriteSize.width}
				height={spriteSize.height}
				alpha={props.disabled ? 0.45 : 1}
			/>
		</Container>
	{/snippet}
</Button>
