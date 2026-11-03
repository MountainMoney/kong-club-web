/** MixBlend.replace, MixDirection.mixIn, Physics.update — spine-core 4.2. */
const MIX_REPLACE = 2;
const MIX_IN = 0;
const PHYSICS_UPDATE = 2;
const SAMPLES = 12;

export type BarrelArtFit = {
	scale: number;
	x: number;
	y: number;
};

type ProbeSkeleton = {
	data: {
		findAnimation: (name: string) => {
			duration: number;
			apply: (
				skeleton: ProbeSkeleton,
				lastTime: number,
				time: number,
				loop: boolean,
				events: unknown[],
				alpha: number,
				blend: number,
				direction: number,
			) => void;
		} | null;
	};
	slots: ProbeSlot[];
	drawOrder: ProbeSlot[];
	setToSetupPose: () => void;
	updateWorldTransform: (physics: number) => void;
	findSlot: (name: string) => ProbeSlot | null;
};

type ProbeSlot = {
	getAttachment: () => {
		computeWorldVertices: (...args: never[]) => void;
		worldVerticesLength?: number;
	} | null;
	setAttachment: (attachment: null) => void;
	data: { name: string };
};

type BarrelSpine = {
	skeleton: ProbeSkeleton & { constructor: new (skeletonData: unknown) => ProbeSkeleton };
	beforeUpdateWorldTransforms?: () => void;
};

const cache = new WeakMap<object, Map<number, BarrelArtFit>>();

export const hideBarrelGuang = (spine: BarrelSpine) => {
	spine.skeleton.findSlot('guang')?.setAttachment(null);
};

const hideGuang = (skeleton: ProbeSkeleton) => {
	skeleton.findSlot('guang')?.setAttachment(null);
};

const unionArtBounds = (skeleton: ProbeSkeleton) => {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const verts = new Float32Array(4096);
	for (const slot of skeleton.drawOrder) {
		if (slot.data.name === 'guang') continue;
		const attachment = slot.getAttachment();
		if (!attachment || typeof attachment.computeWorldVertices !== 'function') continue;
		const worldLen = attachment.worldVerticesLength;
		const tagged = attachment as { uvs?: unknown; offset?: unknown };
		const isMesh = typeof worldLen === 'number' && worldLen > 8;
		const isRegion = !isMesh && tagged.uvs != null && tagged.offset != null;
		if (!isMesh && !isRegion) continue;
		let count = 8;
		if (typeof worldLen === 'number' && worldLen > 8) {
			if (verts.length < worldLen) continue;
			(attachment.computeWorldVertices as (
				slot: ProbeSlot,
				start: number,
				count: number,
				worldVertices: Float32Array,
				offset: number,
				stride: number,
			) => void)(slot, 0, worldLen, verts, 0, 2);
			count = worldLen;
		} else {
			(attachment.computeWorldVertices as (
				slot: ProbeSlot,
				worldVertices: Float32Array,
				offset: number,
				stride: number,
			) => void)(slot, verts, 0, 2);
		}
		for (let i = 0; i < count; i += 2) {
			const x = verts[i]!;
			const y = verts[i + 1]!;
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}
	return { minX, minY, maxX, maxY };
};

/**
 * Uniform scale into `target` px and an offset that puts the measured art
 * centre on the cell. Samples `mutong` so the barrel's own motion stays inside
 * the cell. The guang sweep is hidden before measuring so it does not inflate
 * the box. Skeleton JSON AABB is not used.
 */
export const measureBarrelArtFit = (spine: BarrelSpine, target: number): BarrelArtFit | null => {
	const data = spine.skeleton.data;
	const byTarget = cache.get(data);
	const cached = byTarget?.get(target);
	if (cached) return cached;

	const Skeleton = spine.skeleton.constructor as new (skeletonData: unknown) => ProbeSkeleton;
	const skeleton = new Skeleton(data);
	const animation = skeleton.data.findAnimation('mutong');
	const duration = animation?.duration ?? 0;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (let i = 0; i <= SAMPLES; i += 1) {
		skeleton.setToSetupPose();
		animation?.apply(skeleton, 0, duration * (i / SAMPLES), false, [], 1, MIX_REPLACE, MIX_IN);
		hideGuang(skeleton);
		skeleton.updateWorldTransform(PHYSICS_UPDATE);
		const box = unionArtBounds(skeleton);
		if (!Number.isFinite(box.minX)) continue;
		minX = Math.min(minX, box.minX);
		minY = Math.min(minY, box.minY);
		maxX = Math.max(maxX, box.maxX);
		maxY = Math.max(maxY, box.maxY);
	}

	if (!Number.isFinite(minX) || maxX - minX < 1 || maxY - minY < 1) return null;

	const width = maxX - minX;
	const height = maxY - minY;
	const scale = target / Math.max(width, height);
	const fit = {
		scale,
		x: -((minX + maxX) / 2) * scale,
		y: -((minY + maxY) / 2) * scale,
	};
	const next = byTarget ?? new Map<number, BarrelArtFit>();
	next.set(target, fit);
	cache.set(data, next);
	return fit;
};
