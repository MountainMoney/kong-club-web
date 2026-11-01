<script lang="ts">
	type Props = {
		kind: 'volume' | 'music';
		scale?: number;
		src: string;
	};

	const props: Props = $props();
	const scale = $derived(props.scale ?? 1);

	const RING_XY: [number, number][] = [
		[1, 0],
		[0.9239, 0.3827],
		[0.7071, 0.7071],
		[0.3827, 0.9239],
		[0, 1],
		[-0.3827, 0.9239],
		[-0.7071, 0.7071],
		[-0.9239, 0.3827],
		[-1, 0],
		[-0.9239, -0.3827],
		[-0.7071, -0.7071],
		[-0.3827, -0.9239],
		[0, -1],
		[0.3827, -0.9239],
		[0.7071, -0.7071],
		[0.9239, -0.3827],
	];

	const stampStyle = $derived(`--icon-src:url('${props.src}');--menu-icon-scale:${scale}`);
</script>

<span class="toolbar-menu-icon" style={stampStyle} aria-hidden="true">
	<span class="icon-layer icon-shadow">
		{#each RING_XY as [ox, oy]}
			<span class="icon-stamp" style={`--ox:${ox};--oy:${oy}`}></span>
		{/each}
		<span class="icon-stamp icon-stamp-center"></span>
	</span>
	<span class="icon-layer icon-stroke">
		{#each RING_XY as [ox, oy]}
			<span class="icon-stamp" style={`--ox:${ox};--oy:${oy}`}></span>
		{/each}
	</span>
	<span class="icon-stamp icon-fill"></span>
</span>

<style>
	.toolbar-menu-icon {
		position: relative;
		display: block;
		justify-self: center;
		align-self: center;
		width: calc(26px * var(--menu-scale, 1));
		height: calc(26px * var(--menu-scale, 1));
		overflow: visible;
		font-size: calc(var(--menu-label-size) * 1.7);
		pointer-events: none;
		user-select: none;
	}

	.icon-layer,
	.icon-fill {
		position: absolute;
		inset: 0;
	}

	.icon-shadow {
		color: var(--type-shadow-color, #000);
		transform: translateY(var(--type-shadow-y, 0.08em));
	}

	.icon-stroke {
		color: #000;
	}

	.icon-stamp {
		position: absolute;
		inset: 0;
		background: currentColor;
		-webkit-mask: var(--icon-src) center / contain no-repeat;
		mask: var(--icon-src) center / contain no-repeat;
		transform: translate(
			calc(var(--ox, 0) * var(--type-stroke, 0.08em)),
			calc(var(--oy, 0) * var(--type-stroke, 0.08em))
		);
	}

	.icon-stamp-center {
		--ox: 0;
		--oy: 0;
	}

	.icon-fill {
		background: #fff;
		-webkit-mask: var(--icon-src) center / contain no-repeat;
		mask: var(--icon-src) center / contain no-repeat;
		transform: none;
	}
</style>
