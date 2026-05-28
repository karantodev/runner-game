import { ObjectPool, compactInPlace } from '../utils/pool.js';

/**
 * Particle data shape — fields are mutated in place by the pool.
 * @typedef {{
 *   x: number, y: number,
 *   vx: number, vy: number,
 *   life: number, radius: number,
 *   color: string,
 * }} Particle
 */

const PARTICLE_INITIAL_CAPACITY = 256;

function createParticle() {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, radius: 0, color: '#fff' };
}

/** Shared pool — single instance for the entire game. */
export const particlePool = new ObjectPool(createParticle, null, PARTICLE_INITIAL_CAPACITY);

/**
 * Acquire a particle from the pool and copy the spec into it.
 * @param {Partial<Particle>} spec
 * @returns {Particle}
 */
export function spawnParticle(spec) {
  const p = particlePool.acquire();
  p.x = spec.x ?? 0;
  p.y = spec.y ?? 0;
  p.vx = spec.vx ?? 0;
  p.vy = spec.vy ?? 0;
  p.life = spec.life ?? 0;
  p.radius = spec.radius ?? 0;
  p.color = spec.color ?? '#fff';
  return p;
}

/**
 * In-place particle simulation. Compacts the array and releases dead particles
 * back into the pool so no array allocation happens per-frame.
 *
 * @param {Particle[]} particles
 * @param {number} delta
 */
export function updateParticles(particles, delta) {
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 0.25 * delta;
    p.life -= delta;
  }
  compactInPlace(particles, isAlive, particlePool);
}

function isAlive(p) {
  return p.life > 0;
}
