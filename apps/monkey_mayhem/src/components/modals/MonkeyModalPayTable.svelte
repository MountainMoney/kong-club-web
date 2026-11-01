<script lang="ts">
	import type { Snippet } from 'svelte';

	import { OnHotkey } from 'components-shared';
	import { stateModal } from 'state-shared';

	import MonkeyPaytablePanel from './MonkeyPaytablePanel.svelte';
	import MonkeyGameRuleSections from './MonkeyGameRuleSections.svelte';
	import { buildMonkeyMayhemGameRules } from '../../game/gameRulesContent';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
	const gameRules = $derived(buildMonkeyMayhemGameRules());
	const close = () => {
		stateModal.modal = null;
	};
</script>

{#if stateModal.modal?.name === 'payTable'}
	<OnHotkey hotkey="Escape" onpress={close} />
	<section class="info-overlay" aria-label="Monkey Mayhem paytable" role="dialog" aria-modal="true">
		<button type="button" class="bonus-scrim" aria-label="close info" onclick={close}></button>
		<button type="button" class="bonus-close" aria-label="close info" onclick={close}>×</button>
		<div class="info-panel summit-ui-type">
			<div class="info-scroll">
				<div class="info-column">
					<header class="info-header">
						<h2>Monkey Mayhem</h2>
					</header>
					<MonkeyPaytablePanel />
					<section class="mm-info-modal__rules info-section">
						<h2
							class="mm-info-modal__rules-title info-section-title yellow-type"
							data-mult="Game Rules"
						>
							Game Rules
						</h2>
						<MonkeyGameRuleSections sections={gameRules} />
					</section>
					<div class="mm-info-modal__footer">
						{@render props.children()}
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}

<style lang="scss">
	.info-overlay {
		position: fixed;
		inset: 0;
		z-index: 15000;
		display: grid;
		place-items: stretch;
		padding: 0;
		box-sizing: border-box;
		pointer-events: none;
	}

	.info-overlay > .bonus-scrim,
	.info-overlay > .bonus-close,
	.info-overlay > .info-panel {
		pointer-events: auto;
	}

	.bonus-scrim {
		position: absolute;
		inset: 0;
		z-index: 0;
		margin: 0;
		padding: 0;
		border: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		cursor: pointer;
	}

	.bonus-close {
		position: fixed;
		right: max(16px, env(safe-area-inset-right));
		top: max(16px, env(safe-area-inset-top));
		z-index: 2;
		width: 40px;
		height: 40px;
		padding: 0;
		margin: 0;
		border: 0;
		background: transparent;
		color: #fff;
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
	}

	.info-panel {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		max-height: none;
		display: block;
		overflow: hidden;
		border-radius: 0;
		background: transparent;
		border: 0;
		box-shadow: none;
		color: #fff;
		font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		font-weight: 500;
		-webkit-text-stroke: 0;
		text-shadow: none;
	}

	.info-header {
		padding: 8px 48px 14px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.16);
	}

	.info-header h2,
	.mm-info-modal__rules-title,
	.info-panel :global(.mm-paytable__title) {
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
		font-family: 'Fredoka One', Inter, sans-serif;
		font-weight: 400;
	}

	.info-panel :global(.mm-paytable__intro),
	.info-panel :global(.mm-paytable__subtitle),
	.info-panel :global(.mm-paytable__table),
	.info-panel :global(.mm-paytable__table th),
	.info-panel :global(.mm-paytable__table td),
	.info-panel :global(.mm-paytable__list),
	.info-panel :global(.mm-paytable__specials),
	.info-panel :global(.mm-rule-section),
	.info-panel :global(.mm-rule-section h3),
	.info-panel :global(.mm-rule-section h4),
	.info-panel :global(.mm-rule-text) {
		font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		-webkit-text-stroke: 0;
		text-shadow: none;
	}

	.info-header h2 {
		margin: 0;
		font-size: 24px;
		font-weight: 400;
		color: #fff;
	}

	.info-scroll {
		height: 100%;
		overflow: auto;
		box-sizing: border-box;
		padding: max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) 0
			calc(80px + env(safe-area-inset-bottom, 0px));
		-webkit-overflow-scrolling: touch;
		text-align: left;
	}

	.info-column {
		width: 100%;
		max-width: 920px;
		margin: 0 auto;
		padding: 0 max(22px, env(safe-area-inset-left, 16px));
		box-sizing: border-box;
	}

	.yellow-type {
		position: relative;
		isolation: isolate;
		color: #ffc933;
		text-shadow: none;
	}

	.yellow-type::before,
	.yellow-type::after {
		content: attr(data-mult);
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		display: block;
		font: inherit;
		letter-spacing: inherit;
		line-height: inherit;
		text-align: inherit;
		white-space: inherit;
		pointer-events: none;
	}

	.yellow-type::before {
		z-index: 2;
		color: transparent;
		-webkit-text-fill-color: transparent;
		-webkit-text-stroke: 1px #ffc02a;
	}

	.yellow-type::after {
		z-index: 1;
		color: #000;
		-webkit-text-fill-color: #000;
		mix-blend-mode: overlay;
		opacity: 0.4;
		clip-path: inset(50% 0 0 0);
	}

	.mm-info-modal__rules {
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 215, 0, 0.2);
	}

	.mm-info-modal__rules-title {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
		font-weight: 800;
		color: #ffffff;
		text-align: center;
	}

	.mm-info-modal__footer {
		margin-top: 1rem;
		padding-top: 0.5rem;
		text-align: center;
		font-size: 0.8rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
		font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		text-shadow: none;
	}
</style>
