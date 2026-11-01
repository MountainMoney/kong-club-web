<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateUi } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';

	import FootballFiestaLayoutDesktop from './ui/FootballFiestaLayoutDesktop.svelte';
	import FootballFiestaLayoutPortrait from './ui/FootballFiestaLayoutPortrait.svelte';
	import FootballFiestaLayoutLandscape from './ui/FootballFiestaLayoutLandscape.svelte';
	import FootballFiestaLayoutTablet from './ui/FootballFiestaLayoutTablet.svelte';
	import FootballEnableSpaceHold from './FootballEnableSpaceHold.svelte';
	import { getEffectiveFootballLayoutType } from '../game/responsiveProfile.svelte';

	type Props = {
		logo: Snippet;
		showInReplay?: boolean;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();

	const LAYOUT_MAP = {
		desktop: FootballFiestaLayoutDesktop,
		portrait: FootballFiestaLayoutPortrait,
		landscape: FootballFiestaLayoutLandscape,
		tablet: FootballFiestaLayoutTablet,
	} as const;

	const effectiveLayoutType = $derived.by(() => {
		const { width, height } = stateLayoutDerived.canvasSizes();
		return getEffectiveFootballLayoutType(width, height, stateLayoutDerived.layoutType());
	});

	const LayoutComponent = $derived(LAYOUT_MAP[effectiveLayoutType]);
	const showToolbar = $derived(stateUi.config.mode !== 'replay' || props.showInReplay);
</script>

{#if showToolbar}
	{#if stateUi.config.mode !== 'replay'}
		<FootballEnableSpaceHold />
	{/if}

	<UiFadeContainer>
		<LayoutComponent replayMode={props.showInReplay ?? false}>
			{#snippet logo()}
				{@render props.logo()}
			{/snippet}
		</LayoutComponent>
	</UiFadeContainer>
{/if}
