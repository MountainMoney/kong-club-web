import { browser } from '$app/environment';
import { PUBLIC_LOCAL_DEV } from 'envs';

const searchParams = () => (browser ? new URLSearchParams(window.location.search) : null);

/** Dev tools — only when `?debug=true` is in the URL. */
export const isDebugHudEnabled = () => searchParams()?.get('debug') === 'true';

/**
 * FX / WIP debug lab — `?debug=true` (local / Vite DEV only).
 * Optional `fxLab=0` still hides the panel if needed.
 */
export const isFxLabEnabled = () =>
	(PUBLIC_LOCAL_DEV || import.meta.env.DEV) &&
	isDebugHudEnabled() &&
	searchParams()?.get('fxLab') !== '0';

/** Enable expensive FX during lab — `?debug=true&perfFx=1` */
export const isFxLabPerfEnabled = () =>
	isFxLabEnabled() && searchParams()?.get('perfFx') === '1';
