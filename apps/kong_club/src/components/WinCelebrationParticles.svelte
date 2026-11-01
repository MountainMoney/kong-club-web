<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';
	import { GlowFilter } from 'pixi-filters';

	import { getContext } from '../game/context';
	import { spinWinOverlay } from '../game/spinWinOverlay.svelte';
	import { stateWinCelebration } from '../game/winCelebrationPresentation.svelte';
	import type { WinCelebrationTier } from '../game/winCelebrationFx';
	import { FOOTBALL_PERFORMANCE } from '../game/performance';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());

	type Particle = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		rot: number;
		rotV: number;
		w: number;
		h: number;
		life: number;
		maxLife: number;
		color: number;
		kind: 'confetti' | 'flare' | 'ticker';
	};

	const CONFETTI = [0xffd700, 0xffffff, 0x00c853, 0x1565c0, 0xff5252, 0xffeb3b];
	const TICKER = [0xffffff, 0xffd700, 0xffee58];

	const tierBurstScale: Record<WinCelebrationTier, number> = {
		big: 1,
		superwin: 1.15,
		mega: 1.35,
		epic: 1.55,
		max: 1.85,
	};

	let particles = $state<Particle[]>([]);
	const particlePool: Particle[] = [];
	let lastBurstId = 0;
	let raf = 0;

	const releaseParticle = (particle: Particle) => {
		if (particlePool.length < FOOTBALL_PERFORMANCE.particlePoolLimit) {
			particlePool.push(particle);
		}
	};

	const claimParticle = (): Particle =>
		particlePool.pop() ?? {
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			rot: 0,
			rotV: 0,
			w: 0,
			h: 0,
			life: 0,
			maxLife: 1,
			color: 0xffffff,
			kind: 'confetti',
		};

	const spawnBurst = (count: number, tier: WinCelebrationTier, cx: number, cy: number) => {
		const scale = tierBurstScale[tier];
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
			const speed = (4 + Math.random() * 10) * scale;
			const kindRoll = Math.random();
			const kind: Particle['kind'] =
				kindRoll < 0.55 ? 'confetti' : kindRoll < 0.8 ? 'ticker' : 'flare';
			const particle = claimParticle();
			particle.x = cx + (Math.random() - 0.5) * 40;
			particle.y = cy + (Math.random() - 0.5) * 30;
			particle.vx = Math.cos(angle) * speed;
			particle.vy = Math.sin(angle) * speed - (2 + Math.random() * 4) * scale;
			particle.rot = Math.random() * Math.PI;
			particle.rotV = (Math.random() - 0.5) * 0.2;
			particle.w = kind === 'ticker' ? 14 + Math.random() * 22 : 5 + Math.random() * 8;
			particle.h = kind === 'ticker' ? 3 + Math.random() * 4 : 8 + Math.random() * 10;
			particle.life = 1;
			particle.maxLife = 0.85 + Math.random() * 0.55;
			particle.color =
				kind === 'flare'
					? 0xffd700
					: kind === 'ticker'
						? TICKER[Math.floor(Math.random() * TICKER.length)]
						: CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
			particle.kind = kind;
			particles.push(particle);
		}
		while (particles.length > FOOTBALL_PERFORMANCE.particlePoolLimit) {
			const particle = particles.shift();
			if (particle) releaseParticle(particle);
		}
		particles = particles;
	};

	const glow = new GlowFilter({ distance: 12, outerStrength: 1.2, innerStrength: 0.2, color: 0xffd700, quality: 0.25 });

	onMount(() => {
		const tick = () => {
			const dt = 1 / 60;
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.35 * dt * 60;
				p.vx *= 0.992;
				p.rot += p.rotV;
				p.life -= dt / p.maxLife;
				if (p.life <= 0) {
					particles.splice(i, 1);
					releaseParticle(p);
				}
			}
			particles = particles;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		const burstId = spinWinOverlay.particleBurstId;
		const tier = stateWinCelebration.particleTier;
		const count = stateWinCelebration.particleCount;
		if (!tier || burstId === lastBurstId || count <= 0) return;
		lastBurstId = burstId;
		spawnBurst(count, tier, canvas.width * 0.5, canvas.height * 0.46);
	});
</script>

{#if particles.length > 0}
	<Container zIndex={3} eventMode="none" filters={[glow]}>
		<Graphics
			draw={(g) => {
				g.clear();
				for (const p of particles) {
					const a = Math.min(1, p.life * 1.4);
					if (p.kind === 'flare') {
						g.circle(p.x, p.y, p.w * p.life * 1.2);
						g.fill({ color: p.color, alpha: a * 0.85 });
						continue;
					}
					g.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, p.kind === 'ticker' ? 1 : 2);
					g.fill({ color: p.color, alpha: a });
				}
			}}
		/>
	</Container>
{/if}
