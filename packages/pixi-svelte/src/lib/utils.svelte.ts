import type { PixiPoint, Sizes } from './types';

export const REM = 16;
export const MIN_CLICKABLE_SIZE = 3 * REM; // 44 x 44 is minimum clickable size

export const getPointValues = ({
	point,
	defaultValue,
}: {
	point: PixiPoint;
	defaultValue: number;
}) => {
	const finalDefaultValue = defaultValue === undefined ? 0 : defaultValue;
	if (typeof point === 'number') return [point, point];
	return [point?.x || finalDefaultValue, point?.y || finalDefaultValue];
};

export const anchorToPivot = ({ anchor, sizes }: { anchor: PixiPoint; sizes: Sizes }) => {
	const { width, height } = sizes;
	const [anchorX, anchorY] = getPointValues({ point: anchor, defaultValue: 0 });
	return { x: width * anchorX, y: height * anchorY };
};

/**
 * Detects if WebGL is enabled.
 * Inspired from http://www.browserleaks.com/webgl#howto-detect-webgl
 *
 * @return { number } -1 for not Supported,
 *										0 for disabled
 *										1 for enabled
 */
export function detectWebGL() {
	// Check for the WebGL rendering context
	if (window && !!window.WebGLRenderingContext) {
		let canvas = document.createElement('canvas'),
			names = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'],
			context = false;

		for (const i in names) {
			try {
				// @ts-ignore
				context = canvas.getContext(names[i]);
				// @ts-ignore
				if (context && typeof context.getParameter === 'function') {
					// WebGL is enabled.
					return 1;
				}
			} catch (e) {}
		}

		// WebGL is supported, but disabled.
		return 0;
	}

	// WebGL not supported.
	return -1;
}

const FONT_PRELOAD_TIMEOUT_MS = 4_000;

export const preloadFont = () =>
	new Promise<void>((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			resolve();
		};

		const timeoutId = setTimeout(finish, FONT_PRELOAD_TIMEOUT_MS);

		try {
			// Main platform builds must not request external font providers.
			void document.fonts?.ready.then(finish, finish);
		} catch {
			// Font preload is cosmetic and must not block Pixi init.
			finish();
		}
	});

/**
 * Pixi 8 resets width/height when `texture` is assigned. Apply texture first,
 * then the rest, then size so cell-fit sprites stay cell-fit.
 */
export const applyPixiProps = <TProps extends object>(
	props: TProps,
	target: object,
	ignore?: (keyof TProps)[],
) => {
	const keys = (Object.keys(props) as (keyof TProps)[]).filter(
		(key) => props[key] !== undefined && (!ignore || !ignore.includes(key)),
	);
	const assign = (key: keyof TProps) => {
		const name = String(key);
		const value = props[key];
		const dest = (target as Record<string, { set?: (...args: number[]) => void }>)[name];
		if (
			(name === 'scale' || name === 'anchor' || name === 'pivot' || name === 'position') &&
			dest &&
			typeof dest.set === 'function'
		) {
			if (typeof value === 'number') dest.set(value);
			else if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
				const point = value as { x: number; y: number };
				dest.set(point.x, point.y);
			}
			return;
		}
		(target as Record<string, unknown>)[name] = value;
	};
	if (keys.includes('texture' as keyof TProps)) assign('texture' as keyof TProps);
	if (keys.includes('textures' as keyof TProps)) assign('textures' as keyof TProps);
	for (const key of keys) {
		if (
			key === 'texture' ||
			key === 'textures' ||
			key === 'scale' ||
			key === 'width' ||
			key === 'height'
		) {
			continue;
		}
		assign(key);
	}
	if (keys.includes('scale' as keyof TProps)) assign('scale' as keyof TProps);
	if (keys.includes('width' as keyof TProps)) assign('width' as keyof TProps);
	if (keys.includes('height' as keyof TProps)) assign('height' as keyof TProps);
};

export function propsSyncEffect<TProps extends object, TTarget>({
	props,
	target,
	ignore,
}: {
	props: TProps;
	target?: TTarget | (() => TTarget);
	ignore?: (keyof TProps)[];
}) {
	const run = () => {
		const targetInstance = target instanceof Function ? target() : target;
		if (targetInstance && typeof targetInstance === 'object') {
			applyPixiProps(props, targetInstance, ignore);
		}
	};
	run();
	$effect(run);
}
