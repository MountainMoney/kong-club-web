<script lang="ts">
	import { onDestroy } from 'svelte';

	type Props = {
		scale?: number;
		value?: number;
		nativeRange?: boolean;
		onchange?: (value: number) => void;
		onpreview?: (value: number) => void;
	};

	let { scale = 1, value = $bindable(75), nativeRange = false, onchange, onpreview }: Props = $props();

	let dragging = $state(false);
	let dragPointerId = $state<number | null>(null);
	let draftValue = $state<number | null>(null);
	let trackEl = $state<HTMLDivElement | undefined>(undefined);

	const displayValue = $derived(draftValue ?? value);
	const fillPct = $derived(`${displayValue}%`);
	const thumbLeft = $derived(`${displayValue}%`);

	const clampValue = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

	const valueFromClientX = (clientX: number) => {
		if (!trackEl) return value;
		const rect = trackEl.getBoundingClientRect();
		if (rect.width <= 0) return value;
		return clampValue(((clientX - rect.left) / rect.width) * 100);
	};

	const applyValue = (next: number, commit: boolean) => {
		if (commit) {
			draftValue = null;
			value = next;
			onchange?.(next);
			return;
		}
		draftValue = next;
		onpreview?.(next);
	};

	const unbindDrag = () => {
		if (typeof window === 'undefined') return;
		window.removeEventListener('pointermove', onWindowMove);
		window.removeEventListener('pointerup', onWindowUp);
		window.removeEventListener('pointercancel', onWindowUp);
	};

	const onWindowMove = (event: PointerEvent) => {
		if (!dragging || (dragPointerId != null && event.pointerId !== dragPointerId)) return;
		event.preventDefault();
		applyValue(valueFromClientX(event.clientX), !onpreview);
	};

	const onWindowUp = (event: PointerEvent) => {
		endDrag(event);
	};

	const endDrag = (event: PointerEvent) => {
		if (!dragging) return;
		if (dragPointerId != null && event.pointerId !== dragPointerId) return;
		event.stopPropagation();
		unbindDrag();
		dragging = false;
		dragPointerId = null;
		if (onpreview && draftValue != null) applyValue(draftValue, true);
		else draftValue = null;
	};

	const onPointerDown = (event: PointerEvent) => {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		event.stopPropagation();
		event.preventDefault();
		unbindDrag();
		dragging = true;
		dragPointerId = event.pointerId;
		window.addEventListener('pointermove', onWindowMove, { passive: false });
		window.addEventListener('pointerup', onWindowUp);
		window.addEventListener('pointercancel', onWindowUp);
		applyValue(valueFromClientX(event.clientX), !onpreview);
	};

	const nativeValue = (event: Event) =>
		clampValue(Number((event.currentTarget as HTMLInputElement).value));

	const onNativeInput = (event: Event) => {
		const next = nativeValue(event);
		value = next;
		onpreview?.(next);
	};

	const onNativeChange = (event: Event) => {
		const next = nativeValue(event);
		value = next;
		onchange?.(next);
	};

	onDestroy(unbindDrag);
</script>

{#if nativeRange}
	<div class="toolbar-menu-slider native" style={`--menu-scale:${scale}`}>
		<input
			class="native-range"
			type="range"
			min="0"
			max="100"
			step="1"
			value={value}
			aria-label="Volume"
			oninput={onNativeInput}
			onchange={onNativeChange}
		/>
	</div>
{:else}
<div
	class="toolbar-menu-slider"
	style={`--menu-scale:${scale}`}
	onpointerdown={onPointerDown}
	onpointerup={endDrag}
	onpointercancel={endDrag}
	role="slider"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={displayValue}
	tabindex="0"
>
	<div class="slider-hit" bind:this={trackEl}>
		<div class="slider-track">
			<div class="slider-fill" style={`width:${fillPct}`}></div>
		</div>
		<div class="slider-thumb" style={`left:${thumbLeft}`}></div>
	</div>
</div>
{/if}

<style>
	.toolbar-menu-slider {
		box-sizing: border-box;
		width: 100%;
		height: calc(36px * var(--menu-scale, 1));
		padding: 0;
		cursor: pointer;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.slider-hit {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.slider-track {
		position: relative;
		width: 100%;
		height: calc(10px * var(--menu-scale, 1));
		border: 1px solid #fff;
		border-radius: 999px;
		overflow: hidden;
		background: transparent;
	}

	.slider-fill {
		height: 100%;
		background: #fff;
		border-radius: inherit;
	}

	.slider-thumb {
		position: absolute;
		top: 50%;
		width: calc(20px * var(--menu-scale, 1));
		height: calc(20px * var(--menu-scale, 1));
		border: calc(3px * var(--menu-scale, 1)) solid #000;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.native-range {
		display: block;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		accent-color: #fff;
		touch-action: manipulation;
	}
</style>
