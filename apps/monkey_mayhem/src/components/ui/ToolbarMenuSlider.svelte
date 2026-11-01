<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Container, Graphics, Rectangle } from 'pixi-svelte';

	import {
		TOOLBAR_MENU_SLIDER_H,
		TOOLBAR_MENU_SLIDER_THUMB_R,
	} from '../../game/toolbarMenuTheme';

	type Props = {
		scale: number;
		width: number;
		value: number;
		onchange: (value: number) => void;
		/** Live volume preview while dragging (optional). */
		onpreview?: (value: number) => void;
	};

	const props: Props = $props();

	const trackH = $derived(TOOLBAR_MENU_SLIDER_H * props.scale);
	const thumbR = $derived(TOOLBAR_MENU_SLIDER_THUMB_R * props.scale);
	const hitH = $derived(Math.max(28 * props.scale, thumbR * 2 + 8 * props.scale));

	let dragging = $state(false);
	let draftValue = $state<number | null>(null);

	const clampValue = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

	const displayValue = $derived(draftValue ?? props.value);

	const applyLocalX = (localX: number, commit: boolean) => {
		const t = props.width <= 0 ? 0 : localX / props.width;
		const next = clampValue(t * 100);
		if (commit) {
			draftValue = null;
			props.onchange(next);
			return;
		}
		draftValue = next;
		props.onpreview?.(next);
	};

	const pointerLocalX = (e: PIXI.FederatedPointerEvent) => {
		const target = e.currentTarget as PIXI.Container;
		return e.getLocalPosition(target).x;
	};

	const onPointerDown = (e: PIXI.FederatedPointerEvent) => {
		dragging = true;
		const x = pointerLocalX(e);
		if (props.onpreview) {
			applyLocalX(x, false);
		} else {
			applyLocalX(x, true);
		}
	};

	const onGlobalMove = (e: PIXI.FederatedPointerEvent) => {
		if (!dragging) return;
		applyLocalX(pointerLocalX(e), !props.onpreview);
	};

	const onPointerUp = () => {
		if (!dragging) return;
		dragging = false;
		if (props.onpreview && draftValue != null) {
			props.onchange(draftValue);
		}
		draftValue = null;
	};

	const fillW = $derived((displayValue / 100) * props.width);
	const trackY = $derived((hitH - trackH) / 2);
	const centerY = $derived(hitH / 2);
</script>

<Container
	eventMode="static"
	cursor="pointer"
	onpointerdown={onPointerDown}
	onglobalpointermove={onGlobalMove}
	onpointerup={onPointerUp}
	onpointerupoutside={onPointerUp}
>
	<Rectangle width={props.width} height={hitH} backgroundAlpha={0} />

	<Graphics
		draw={(g) => {
			const w = props.width;
			const h = trackH;
			const y = trackY;
			const r = h / 2;
			g.clear();

			// Unfilled track: white stroke only
			g.roundRect(0, y, w, h, r);
			g.stroke({ width: 1, color: 0xffffff, alpha: 1 });

			const fw = fillW;
			if (fw > 0) {
				// Filled portion: solid white
				g.roundRect(0, y, Math.max(fw, h), h, r);
				g.fill({ color: 0xffffff });
			}

			const thumbX = Math.max(thumbR, Math.min(w - thumbR, fw));
			g.circle(thumbX, centerY, thumbR);
			g.fill({ color: 0xffffff });
		}}
	/>
</Container>
