import type { Container, FederatedPointerEvent } from 'pixi.js';
import { Spring } from 'svelte/motion';

import { PRESS } from './constants';

/** A release further than this (screen px) from the press point is a drag, not a press. */
const RELEASE_SLOP = 12;

export const createPress = () => {
	const scale = new Spring(1, { stiffness: PRESS.stiffness, damping: PRESS.damping });
	let pressedAt: { x: number; y: number } | null = null;
	return {
		get scale() {
			return scale.current;
		},
		down: (event?: FederatedPointerEvent) => {
			pressedAt = event ? { x: event.global.x, y: event.global.y } : null;
			scale.target = PRESS.scale;
		},
		up: () => {
			scale.target = 1;
		},
		/**
		 * The press shrinks the button to PRESS.scale, so a press that starts near its edge
		 * ends outside the shrunk art and Pixi sends pointerupoutside instead of pointerup.
		 * Count that release as a press when it lands inside the button's unshrunk bounds
		 * and the pointer barely moved since the press.
		 */
		releasedInside: (event: FederatedPointerEvent) => {
			const from = pressedAt;
			pressedAt = null;
			const shrink = scale.current;
			scale.target = 1;
			const target = event.currentTarget as Container | null;
			if (!from || !target) return false;
			const { x, y } = event.global;
			if (Math.hypot(x - from.x, y - from.y) > RELEASE_SLOP) return false;
			const box = target.getBounds().rectangle;
			const grow = shrink > 0 ? 1 / shrink : 1;
			const cx = box.x + box.width / 2;
			const cy = box.y + box.height / 2;
			return (
				Math.abs(x - cx) <= (box.width * grow) / 2 && Math.abs(y - cy) <= (box.height * grow) / 2
			);
		},
		disarm: () => {
			pressedAt = null;
		},
	};
};
