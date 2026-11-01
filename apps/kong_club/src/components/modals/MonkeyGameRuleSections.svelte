<script lang="ts">
	import type { GameRuleData } from 'state-shared';

	type Props = {
		sections: GameRuleData[];
	};

	const props: Props = $props();
</script>

{#each props.sections as section}
	<section class="mm-rule-section">
		<h3>{section.title}</h3>
		{#each section.containers as block}
			{#if block.title}
				<h4>{block.title}</h4>
			{/if}
			<p class="mm-rule-text">{block.text}</p>
		{/each}
	</section>
{/each}

<style lang="scss">
	.mm-rule-section {
		margin-bottom: 1.25rem;
		color: #ffffff;
		font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		text-shadow: none;
	}

	h3 {
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: #ffffff;
		margin: 0 0 0.5rem;
	}

	h4 {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0.5rem 0 0.25rem;
		color: #ffffff;
	}

	.mm-rule-text {
		font-size: 0.95rem;
		line-height: 1.55;
		font-weight: 500;
		white-space: pre-line;
		margin: 0;
		color: rgba(255, 255, 255, 0.94);
	}
</style>
