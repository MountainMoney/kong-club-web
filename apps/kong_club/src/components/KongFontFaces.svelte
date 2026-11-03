<script lang="ts">
	import { onDestroy } from 'svelte';

	import { cssFontEntries, useAssetPlaceholders } from '../assets/manifest';
	import { assetUrl } from '../game/assetUrl';

	const placeholders = useAssetPlaceholders();
	const faces = cssFontEntries().filter((entry) => {
		return typeof entry.src === 'string' && Boolean(entry.family && entry.weight && entry.format);
	});

	const css = faces
		.map((face) => {
			const src = face.src;
			if (typeof src !== 'string') return '';
			return `@font-face {
	font-family: '${face.family}';
	src: url('${assetUrl(src)}') format('${face.format}');
	font-weight: ${face.weight};
	font-style: normal;
	font-display: swap;
}`;
		})
		.join('\n');

	const preloaded = new Set(['font_fredoka', 'font_fredoka_one', 'font_lilita']);
	const nodes: HTMLElement[] = [];

	if (typeof document !== 'undefined' && !placeholders) {
		const style = document.createElement('style');
		style.dataset.kongFonts = 'manifest';
		style.textContent = css;
		document.head.appendChild(style);
		nodes.push(style);
		for (const face of faces) {
			if (!preloaded.has(face.key) || !face.mime || typeof face.src !== 'string') continue;
			const link = document.createElement('link');
			link.rel = 'preload';
			link.as = 'font';
			link.href = assetUrl(face.src);
			link.type = face.mime;
			link.crossOrigin = 'anonymous';
			document.head.appendChild(link);
			nodes.push(link);
		}
	}

	onDestroy(() => {
		for (const node of nodes) node.remove();
	});
</script>
