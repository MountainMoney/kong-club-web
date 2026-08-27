import type * as PIXI from 'pixi.js';
import { setContext, getContext as svelteGetContext, onMount } from 'svelte';
import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';

import type { App as ContextApp } from './createApp.svelte';

// App context
const APP_NS = '@@pixi_svelte';
export function setContextApp(value: ContextApp) {
	setContext(APP_NS, value);
}
export function getContextApp() {
	return svelteGetContext(APP_NS) as ContextApp;
}

// Parent context
const PARENT_NS = '@@pixi_parent';
export function createContextParent(value: PIXI.Container) {
	const addToParent = (node: PIXI.ContainerChild) => {
		// Attach immediately. Delayed `{#if}` trees (splash → playfield) often skip
		// Svelte onMount, so addChild-only-in-onMount leaves an empty stage.
		context.parent.addChild(node);
		context.parent.sortChildren();
		onMount(() => {
			return () => {
				if (node) node.destroy(); // Equivalent to onDestroy(); Leave this comment for searching.
			};
		});
	};

	const context = { parent: value, addToParent };

	setContext(PARENT_NS, context);

	return context;
}
export function getContextParent() {
	return svelteGetContext(PARENT_NS) as ReturnType<typeof createContextParent>;
}

// Particle context
const PARTICLE_PARENT_NS = '@@pixi_particle_parent';
export function setContextParticleParent(value: PIXI.ParticleContainer) {
	setContext(PARTICLE_PARENT_NS, value);
}
export function getContextParticleParent() {
	return svelteGetContext(PARTICLE_PARENT_NS) as PIXI.ParticleContainer;
}

// Spine context
const SPINE_NS = '@@pixi_spine';
export function setContextSpine(value: SPINE_PIXI.Spine) {
	setContext(SPINE_NS, value);
}
export function getContextSpine() {
	return svelteGetContext(SPINE_NS) as SPINE_PIXI.Spine;
}

// Spine event context
const SPINE_EVENT_EMITTER_NS = '@@pixi_spine_event_emitter';
export function setContextSpineEventEmitter(value: PIXI.EventEmitter) {
	setContext(SPINE_EVENT_EMITTER_NS, value);
}
export function getContextSpineEventEmitter() {
	return svelteGetContext(SPINE_EVENT_EMITTER_NS) as PIXI.EventEmitter;
}
