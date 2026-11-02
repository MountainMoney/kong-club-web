<script lang="ts">
	// https://lingui.dev/installation#vite
	// https://lingui.dev/tutorials/javascript
	// https://lingui.dev/ref/vite-plugin

	import { stateI18nDerived } from 'state-shared';

	import { onMount, type Snippet } from 'svelte';

	import { stateUrlDerived, type Language } from 'state-shared';
	import { resolveLocaleMessages, type MessagesMap } from 'utils-shared/i18n';

	type Props = {
		debug?: boolean;
		children: Snippet;
		messagesMap: MessagesMap;
	};

	const props: Props = $props();

	let loaded = $state(false);

	const loadMessages = (lang: Language) => {
		const { locale, messages } = resolveLocaleMessages(lang, props.messagesMap);
		if (props.debug) console.log({ locale, messages });
		return { locale, messages };
	};

	onMount(() => {
		const initLocale = (lang: Language) => {
			const { locale, messages } = loadMessages(lang);
			stateI18nDerived.init(locale, messages);
			return locale;
		};

		try {
			initLocale(stateUrlDerived.lang());
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("[i18n] Failed to init locale; falling back to 'en'.", error);
			}
			try {
				initLocale('en');
			} catch (fallbackError) {
				if (import.meta.env.DEV) {
					console.error("[i18n] Failed to init 'en' fallback; using empty catalog.", fallbackError);
				}
				stateI18nDerived.init('en', {});
			}
		}
		loaded = true;
	});
</script>

{#if loaded}
	{@render props.children()}
{/if}
