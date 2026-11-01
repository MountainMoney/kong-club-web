<script lang="ts">
	import type { Snippet } from 'svelte';

	import ModalError from 'components-ui-html/src/components/ModalError.svelte';
	import ModalInsufficientBalance from './modals/ModalInsufficientBalance.svelte';
	import ModalBetMenu from 'components-ui-html/src/components/ModalBetMenu.svelte';
	import MonkeyModalBuyBonus from './modals/MonkeyModalBuyBonus.svelte';
	import ModalAutoSpin from 'components-ui-html/src/components/ModalAutoSpin.svelte';
	import ModalAutoSpinMessage from 'components-ui-html/src/components/ModalAutoSpinMessage.svelte';
	import MonkeyModalPayTable from './modals/MonkeyModalPayTable.svelte';
	import ModalSettings from 'components-ui-html/src/components/ModalSettings.svelte';

	type Props = {
		version: Snippet;
	};

	const props: Props = $props();
</script>

<ModalError />
<ModalInsufficientBalance />
<ModalBetMenu />
<MonkeyModalBuyBonus />
<ModalAutoSpin />
<ModalAutoSpinMessage />
<MonkeyModalPayTable>
	{@render props.version()}
</MonkeyModalPayTable>
<ModalSettings />

<style lang="scss">
	:global(html) {
		font-size: 16px;
		@media screen and (max-width: 500px) {
			font-size: 50%;
		}
	}

	:global(.buy-bonus-screen) {
		position: fixed;
		z-index: 50;
	}
</style>
