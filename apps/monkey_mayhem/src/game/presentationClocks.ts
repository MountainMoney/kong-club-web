import { isSuperTurbo, isTurboOrFaster } from './spinSpeed.svelte';

/** Empty waits / lose settle / non-show gaps. */
export const productionIdleScale = (): number => {
	if (isSuperTurbo()) return 0.25;
	if (isTurboOrFaster()) return 0.55;
	return 1;
};

/** Cluster, coins, wins, scatters, bonus intro — only a little faster. */
export const productionFeatureScale = (): number => {
	if (isSuperTurbo()) return 0.65;
	if (isTurboOrFaster()) return 0.85;
	return 1;
};
