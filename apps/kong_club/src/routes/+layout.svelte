<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { LoadI18n } from 'components-shared';
	import { setContext } from '../game/context';
	import KongFontFaces from '../components/KongFontFaces.svelte';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	setContext();
</script>

<KongFontFaces />

<GlobalStyle>
	<LoadI18n {messagesMap}>
		{@render props.children()}
	</LoadI18n>
</GlobalStyle>
