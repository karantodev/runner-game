import { ObjectPool, compactInPlace } from '../utils/pool.js';

/**
 * Pool-backed particle system. Particles live in a flat array of plain
 * objects (NOT registry entities) — every collect / hit-burst can spawn
 * dozens of them per frame, so going through `registry.create()` would
 * allocate 5 component objects per particle and stress GC.
 *
 * Lifecycle:
 *   - `spawn(opts)`  — acquire from pool, push onto `this.particles`
 *   - `update()`     — advance physics, then compact-in-place; dead items
 *                      are released back to the pool
 *   - `reset()`      — release everything (called by World.reset)
 *
 * Hard cap MAX_PARTICLES prevents runaway allocation if the spawn rate
 * ever outpaces the lifetime budget. At normal play the live count tops
 * out near 60–80 during a power-up burst.
 */
const POOL_INITIAL = 256;
const MAX_PARTICLES = 256;

function makeParticle() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 0,
    radius: 0, color: '', gravity: 0.25,
    // v3: optional sprite-sheet override. When set, EffectsRenderer picks
    // a frame from `${spriteKey}${01..spriteFrames}` based on age and draws
    // it instead of the procedural arc. Falls back to the arc if the
    // sprite isn't loaded yet (designer hasn't shipped that batch).
    spriteKey: null,
    spriteFrames: 0,
    spriteSize: 0,
  };
}

export class ParticleSystem {
  constructor() {
    /** @type {ReturnType<typeof makeParticle>[]} */
    this.particles = [];
    this.pool = new ObjectPool(makeParticle, null, POOL_INITIAL);
    /**
     * Soft cap on live particle count. AdaptiveQuality lowers this when
     * the device is struggling; spawn() drops new requests once the live
     * array hits this threshold instead of growing past it. Hard cap
     * (MAX_PARTICLES) remains the upper bound regardless.
     */
    this.softCap = MAX_PARTICLES;
  }

  /**
   * @param {{ x: number, y: number, vx: number, vy: number, life: number,
   *           radius: number, color: string, gravity?: number,
   *           spriteKey?: string|null, spriteFrames?: number,
   *           spriteSize?: number }} opts
   */
  spawn(opts) {
    if (this.particles.length >= Math.min(this.softCap, MAX_PARTICLES)) return;
    const p = this.pool.acquire();
    p.x = opts.x;
    p.y = opts.y;
    p.vx = opts.vx;
    p.vy = opts.vy;
    p.life = opts.life;
    p.maxLife = opts.life;
    p.radius = opts.radius;
    p.color = opts.color;
    p.gravity = opts.gravity ?? 0.25;
    p.spriteKey = opts.spriteKey ?? null;
    p.spriteFrames = opts.spriteFrames ?? 0;
    p.spriteSize = opts.spriteSize ?? 0;
    this.particles.push(p);
  }

  update(_world, delta) {
    const arr = this.particles;
    for (let i = 0; i < arr.length; i += 1) {
      const p = arr[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += p.gravity * delta;
      p.life -= delta;
    }
    compactInPlace(arr, isAlive, this.pool);
  }

  reset() {
    for (let i = 0; i < this.particles.length; i += 1) this.pool.release(this.particles[i]);
    this.particles.length = 0;
  }
}

function isAlive(p) {
  return p.life > 0;
}
