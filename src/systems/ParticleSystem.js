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
 *
 * v4.0 — run-dust emitter added. #tickRunDust() is called from update()
 * and spawns 1–2 tiny dust puffs at the player's feet while on the ground
 * at rate controlled by visual.juice.runDust.rate. Uses the existing pool;
 * no extra allocation.
 */
const POOL_INITIAL = 256;
const MAX_PARTICLES = 256;

/** v4.0 — run-dust accumulator (fractional frames between puffs). */
let _runDustAccum = 0;

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

  update(world, delta) {
    const arr = this.particles;
    for (let i = 0; i < arr.length; i += 1) {
      const p = arr[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += p.gravity * delta;
      p.life -= delta;
    }
    compactInPlace(arr, isAlive, this.pool);

    // v4.0 — run-dust emitter.
    if (world) this.#tickRunDust(world, delta);
  }

  /**
   * v4.0 — spawn tiny dust puffs at the player's feet while running on
   * the ground. Rate is gated by visual.juice.runDust.rate (0..1 puffs
   * per frame at 60Hz). Reads world.player for position; skips when
   * airborne, crouching, not playing, or particles disabled.
   *
   * Uses the existing pool — no extra allocation. Max 2 particles per call.
   */
  #tickRunDust(world, delta) {
    const runDustCfg = world.config.visual?.juice?.runDust;
    if (!runDustCfg?.enabled) return;
    if (!world.config.gameFeel.particles) return;
    if (world.state !== 'playing') return;
    const player = world.player;
    if (!player) return;

    const vert = player.components.VerticalState;
    const crouch = player.components.CrouchState;
    const laneState = player.components.LaneState;

    // Only on the ground, running (not crouching, not airborne).
    if (vert.isJumping || vert.y < -4 || crouch.isCrouching) return;

    const rate = runDustCfg.rate ?? 0.5;
    _runDustAccum += rate * delta;
    if (_runDustAccum < 1) return;
    _runDustAccum -= 1;

    // Screen position of the player's feet.
    const proj = world.projection;
    if (!proj) return;
    const footX = proj.width / 2 + laneState.laneX * proj.visualLaneWidth;
    const bottomMargin = world.config.player.bottomMargin ?? 0;
    const footY = proj.groundY - bottomMargin;

    // Spawn 1 puff (occasionally 2 for variety — every ~4 ticks).
    const count = (_runDustAccum > 0.6 || Math.random() < 0.25) ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const side = i === 0 ? -1 : 1;  // left / right foot
      this.spawn({
        x: footX + side * (8 + Math.random() * 10),
        y: footY - 2,
        vx: side * (0.4 + Math.random() * 1.2),
        vy: -(0.6 + Math.random() * 1.0),
        life: 12 + Math.random() * 8,
        radius: 2 + Math.random() * 2,
        color: 'rgba(200, 175, 130, 0.65)',
        gravity: 0.08,
        spriteKey: null,
        spriteFrames: 0,
        spriteSize: 0,
      });
    }
  }

  reset() {
    for (let i = 0; i < this.particles.length; i += 1) this.pool.release(this.particles[i]);
    this.particles.length = 0;
    _runDustAccum = 0;
  }
}

function isAlive(p) {
  return p.life > 0;
}
