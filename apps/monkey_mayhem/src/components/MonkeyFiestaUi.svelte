<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateUi } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';

	import MonkeyFiestaLayoutDesktop from './ui/MonkeyFiestaLayoutDesktop.svelte';
	import MonkeyFiestaLayoutPortrait from './ui/MonkeyFiestaLayoutPortrait.svelte';
	import MonkeyFiestaLayoutLandscape from './ui/MonkeyFiestaLayoutLandscape.svelte';
	import MonkeyFiestaLayoutTablet from './ui/MonkeyFiestaLayoutTablet.svelte';
	import MonkeyEnableSpaceHold from './MonkeyEnableSpaceHold.svelte';
	import { getEffectiveMonkeyLayoutType } from '../game/responsiveProfile.svelte';

	type Props = {
		logo: Snippet;
		showInReplay?: boolean;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();

	const LAYOUT_MAP = {
		desktop: MonkeyFiestaLayoutDesktop,
		portrait: MonkeyFiestaLayoutPortrait,
		landscape: MonkeyFiestaLayoutLandscape,
		tablet: MonkeyFiestaLayoutTablet,
	} as const;

	const effectiveLayoutType = $derived.by(() => {
		const { width, height } = stateLayoutDerived.canvasSizes();
		return getEffectiveMonkeyLayoutType(width, height, stateLayoutDerived.layoutType());
	});

	const LayoutComponent = $derived(LAYOUT_MAP[effectiveLayoutType]);
	const showToolbar = $derived(stateUi.config.mode !== 'replay' || props.showInReplay);
</script>

{#if showToolbar}
	{#if stateUi.config.mode !== 'replay'}
		<MonkeyEnableSpaceHold />
	{/if}

	<UiFadeContainer>
		<LayoutComponent replayMode={props.showInReplay ?? false}>
			{#snippet logo()}
				{@render props.logo()}
			{/snippet}
		</LayoutComponent>
	</UiFadeContainer>
{/if}
