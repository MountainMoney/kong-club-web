<script lang="ts">
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { assetUrl } from '../game/assetUrl';
	import { ensureFredokaOneFont } from '../game/introFont';
	import { readCanvasSize, usePortraitDesignSpace } from '../game/desktopLayout';
	import { getDesignSize, getMainLayoutScale } from '../game/summitToolbarLayout';
	import { splashFeaturePanels } from '../game/splashCarousel';
	import { splashHeroForPanel, splashHeroTextureKeys } from '../game/splashIntroContent';
	import './ui/summit/summitType.css';

	type Props = {
		oncontinue: () => void;
		/** Mount the playfield under the splash before the leave fade. */
		onleavestart?: () => void;
	};

	const SPLASH_LEAVE_MS = 560;

	const props: Props = $props();
	const context = getContext();

	let viewport = $state(readCanvasSize());
	let fontReady = $state(false);

	const portrait = $derived(usePortraitDesignSpace(viewport.width, viewport.height));
	const design = $derived(getDesignSize(viewport.width, viewport.height));
	const displayScale = $derived(getMainLayoutScale(viewport.width, viewport.height));
	const panels = $derived(splashFeaturePanels());
	const ready = $derived(context.stateApp.loaded && fontReady);
	let leaving = $state(false);

	const symbolSrc = (key: string) => assetUrl(`/assets/sprites/monkeySymbols/${key}.png`);
	const maxWinSrc = assetUrl('/assets/monkey/ui/intro_card_10000x.png');
	const titleSrc = assetUrl('/assets/sprites/monkeySymbols/title_art.png');

	let leaveTimer: ReturnType<typeof setTimeout> | undefined;

	const continueSplash = () => {
		if (!ready || leaving) return;
		leaving = true;
		props.onleavestart?.();
		leaveTimer = window.setTimeout(() => {
			props.oncontinue();
		}, SPLASH_LEAVE_MS);
	};

	onMount(() => {
		void ensureFredokaOneFont().then(() => {
			fontReady = true;
		});
		const sync = () => {
			viewport = readCanvasSize();
		};
		sync();
		window.addEventListener('resize', sync);
		window.visualViewport?.addEventListener('resize', sync);
		return () => {
			if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
			window.removeEventListener('resize', sync);
			window.visualViewport?.removeEventListener('resize', sync);
		};
	});
</script>

<section
	class="opening-splash summit-ui-type"
	class:intro-armed={ready}
	class:leaving
	class:splash-portrait={portrait}
	style={`--design-w:${design.width}px; --design-h:${design.height}px; --display-scale:${displayScale}; --canvas-w:${viewport.width}px; --canvas-h:${viewport.height}px;`}
	onclick={continueSplash}
	onkeydown={(e) => e.key === 'Enter' && continueSplash()}
	role="presentation"
>
	<button class="opening-splash-hitbox" aria-label="Press to continue" disabled={!ready || leaving}></button>
	<div class="opening-splash-world">
		<div class="opening-splash-fit">
			<div class="opening-splash-pan">
				<div
					class="opening-splash-scaler"
					class:splash-portrait={portrait}
					class:splash-landscape={!portrait}
				>
					<div class="opening-splash-content">
						<img class="opening-splash-logo" src={titleSrc} alt="Monkey Mayhem" />
						<div class="opening-splash-cards" class:carousel={portrait}>
							{#each panels as panel, i (panel.id)}
								{@const hero = splashHeroForPanel(panel.id)}
								{@const heroKeys = splashHeroTextureKeys(hero)}
								<article
									class="opening-splash-feature"
									style={`--card-delay:${i * 130}ms; --card-out-delay:${(panels.length - 1 - i) * 70}ms`}
								>
									<div
										class="opening-splash-art"
										class:art-scatters={hero === 'scatterFive'}
										class:art-max={hero === 'maxWin'}
										class:art-coins={hero === 'coinTrio'}
									>
										{#if hero === 'maxWin'}
											<img class="max-win-plate" src={maxWinSrc} alt="25,000×" />
										{:else if hero === 'scatterFive'}
											{#each heroKeys as key, hi (`${key}-${hi}`)}
												<img class="scatter-hero" src={symbolSrc(key)} alt="" />
											{/each}
										{:else}
											{#each heroKeys as key, hi (`${key}-${hi}`)}
												<img class="coin-disc" src={symbolSrc(key)} alt="" />
											{/each}
										{/if}
									</div>
									<strong>{panel.title}</strong>
									<p>{panel.subtitle}</p>
								</article>
							{/each}
						</div>
					</div>
					<button type="button" class="opening-splash-cta" disabled={!ready || leaving} onclick={continueSplash}>
						<span class="opening-splash-cta-spacer">PRESS TO CONTINUE</span>
						<span class="opening-splash-cta-label continue">{ready ? 'PRESS TO CONTINUE' : 'LOADING'}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.opening-splash {
		position: fixed;
		inset: 0;
		z-index: 12000;
		overflow: hidden;
		background: transparent;
		cursor: pointer;
	}

	.opening-splash.leaving {
		pointer-events: none;
		cursor: default;
	}

	.opening-splash-hitbox {
		position: absolute;
		inset: 0;
		z-index: 2;
		border: 0;
		background: transparent;
		pointer-events: none;
		cursor: default;
	}

	.opening-splash-world {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 1;
		width: var(--canvas-w);
		height: var(--canvas-h);
		transform: translate(-50%, -50%);
		overflow: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
		background: transparent;
		pointer-events: none;
	}

	.opening-splash-fit {
		width: var(--design-w);
		height: var(--design-h);
		transform: scale(var(--display-scale));
		transform-origin: center center;
	}

	.opening-splash-pan {
		width: var(--design-w);
		height: var(--design-h);
	}

	.opening-splash-scaler {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		width: var(--design-w);
		height: var(--design-h);
		padding: calc(var(--design-h) * 0.018) calc(var(--design-w) * 0.012) calc(var(--design-h) * 0.04);
		pointer-events: auto;
	}

	.opening-splash-content {
		position: relative;
		z-index: 3;
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 0;
		width: min(calc(var(--design-w) * 0.99), 100%);
	}

	.opening-splash-logo {
		position: relative;
		z-index: 4;
		width: min(42%, 640px);
		max-height: 28%;
		object-fit: contain;
		pointer-events: none;
	}

	.opening-splash-cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 28px;
		width: min(96%, 1680px);
		margin-top: calc(var(--design-h) * 0.06);
		align-items: end;
	}

	.opening-splash-feature {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
		text-align: center;
		color: #fff;
		opacity: 0;
		transform: translateY(22px);
	}

	.opening-splash.intro-armed:not(.leaving) .opening-splash-feature {
		animation: splash-card-in 520ms cubic-bezier(0.215, 0.61, 0.355, 1) both;
		animation-delay: var(--card-delay, 0ms);
	}

	.opening-splash.leaving .opening-splash-feature {
		animation: splash-card-out 420ms ease-in both;
		animation-delay: var(--card-out-delay, 0ms);
	}

	.opening-splash.leaving .opening-splash-logo,
	.opening-splash.leaving .opening-splash-cta {
		animation: splash-chrome-out 420ms ease-in both;
	}

	@keyframes splash-card-in {
		from {
			opacity: 0;
			transform: translateY(22px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes splash-card-out {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(-14px);
		}
	}

	@keyframes splash-chrome-out {
		to {
			opacity: 0;
		}
	}

	.opening-splash-art {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		width: 100%;
		min-height: calc(var(--design-h) * 0.28);
	}

	.opening-splash-art.art-scatters {
		flex-wrap: wrap;
		max-width: 460px;
		gap: 0 2px;
	}

	.opening-splash-art.art-scatters .scatter-hero {
		width: 31%;
		height: auto;
		max-height: calc(var(--design-h) * 0.16);
		object-fit: contain;
		filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45));
	}

	.opening-splash-art.art-coins {
		gap: 4px;
	}

	.opening-splash-art.art-coins .coin-disc {
		width: calc(var(--design-h) * 0.2);
		height: calc(var(--design-h) * 0.2);
		object-fit: contain;
		filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.4));
	}

	.opening-splash-art.art-max .max-win-plate {
		width: 100%;
		height: calc(var(--design-h) * 0.2);
		object-fit: contain;
		filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45));
	}

	.opening-splash-feature strong,
	.opening-splash-feature p {
		-webkit-text-stroke: 0;
		text-shadow: var(--type-stroke-outside);
		font-family: 'Fredoka One', Inter, sans-serif;
		font-weight: 400;
	}

	.opening-splash-feature strong {
		display: block;
		margin-top: 16px;
		font-size: clamp(22px, calc(var(--design-w) * 0.022), 34px);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #ffec9a;
	}

	.opening-splash-feature p {
		margin: 8px 0 0;
		max-width: 92%;
		font-size: clamp(14px, calc(var(--design-w) * 0.014), 20px);
		line-height: 1.25;
	}

	.opening-splash-cta {
		position: relative;
		z-index: 3;
		flex: 0 0 auto;
		width: 100%;
		margin: 0;
		padding-top: 8px;
		border: 0;
		background: transparent;
		text-align: center;
		pointer-events: auto;
		cursor: pointer;
		font-family: 'Fredoka One', Inter, sans-serif;
		font-size: 32px;
		font-weight: 400;
		letter-spacing: -0.02em;
		color: #fff;
		-webkit-text-stroke: 0;
		paint-order: stroke fill;
		text-shadow: var(--type-stroke-outside);
	}

	.opening-splash-cta:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.opening-splash-cta-spacer {
		visibility: hidden;
		display: block;
	}

	.opening-splash-cta-label {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.opening-splash-scaler.splash-portrait {
		justify-content: flex-start;
	}

	.opening-splash-scaler.splash-portrait .opening-splash-cards {
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		width: min(86%, 720px);
		margin-top: calc(var(--design-h) * 0.02);
		overflow: auto;
		max-height: 58%;
		align-items: center;
	}

	.opening-splash-scaler.splash-portrait .opening-splash-cta {
		position: absolute;
		left: 0;
		right: 0;
		bottom: max(3%, 24px);
		font-size: clamp(48px, calc(var(--design-w) * 0.085), 108px);
	}

	.opening-splash-scaler.splash-landscape .opening-splash-logo {
		position: absolute;
		left: 50%;
		top: 2%;
		transform: translateX(-50%);
		width: min(42%, 640px);
		max-height: 22%;
		margin: 0;
	}

	.opening-splash-scaler.splash-landscape .opening-splash-cards {
		margin-top: calc(var(--design-h) * 0.22);
	}
</style>
