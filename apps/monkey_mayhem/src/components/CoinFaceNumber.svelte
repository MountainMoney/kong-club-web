<script lang="ts">
	import { BaseSprite, Container } from 'pixi-svelte';

	import { makeCoinFaceNumberTexture, resolveCoinFaceFill, type CoinFaceStyleId } from '../game/coinFaceStyles';
	import {
		getActiveCoinFaceFill,
		getActiveCoinFaceMidCrease,
		getCoinFaceBandFillLab,
	} from '../game/fxLab.svelte';
	import { getPixiTextResolution } from '../game/pixiTextCrisp';

	type Props = {
		label: string;
		symbol: string;
		fontSize: number;
		fontFamily: string;
		preset: CoinFaceStyleId;
		scale?: number;
		alpha?: number;
	};

	const props: Props = $props();
	const textRes = getPixiTextResolution();

	const fillLook = $derived(getActiveCoinFaceFill());
	const midCrease = $derived(getActiveCoinFaceMidCrease());
	const painted = $derived({
		...resolveCoinFaceFill(props.symbol, fillLook, {
			top: getCoinFaceBandFillLab(props.symbol, 'top'),
			bot: getCoinFaceBandFillLab(props.symbol, 'bot'),
		}),
		midCrease,
	});

	const atlas = $derived(
		makeCoinFaceNumberTexture({
			label: props.label,
			fontSize: props.fontSize,
			fontFamily: props.fontFamily,
			fill: painted,
			resolution: textRes,
		}),
	);

	const faceScale = $derived(props.scale ?? 1);
	const faceAlpha = $derived(props.alpha ?? 1);
	const faceKey = $derived(
		`${props.label}:${props.fontSize}:${props.symbol}:${fillLook}:${painted.top}:${painted.bot}:${painted.mid ?? 'x'}:${midCrease ? 'crease-soft' : 'plain'}:${props.fontFamily}`,
	);
</script>

<Container alpha={faceAlpha}>
	{#key faceKey}
		<BaseSprite
			anchor={0.5}
			texture={atlas.texture}
			width={atlas.width * faceScale}
			height={atlas.height * faceScale}
		/>
	{/key}
</Container>
