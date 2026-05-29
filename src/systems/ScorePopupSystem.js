import { ObjectPool, compactInPlace } from '../utils/pool.js';

/**
 * Pool-backed score-popup system. Same shape as ParticleSystem — popups
 * are plain pooled objects, not registry entities, so the per-collect
 * "+1 / +LIFE / POWER" tags do not allocate component bags every frame.
 *
 * Hard cap MAX_POPUPS keeps the pool bounded. The on-screen count
 * usually peaks at 2–4 during a flower line; 32 is the upper bound.
 */
const POOL_INITIAL = 32;
const MAX_POPUPS = 32;

function makePopup() {
  return {
    x: 0, y: 0, vy: 0,
    text: '', color: '#fff', scale: 0.78,
    life: 0, maxLife: 0,
  };
}

export class ScorePopupSystem {
  constructor() {
    /** @type {ReturnType<typeof makePopup>[]} */
    this.popups = [];
    this.pool = new ObjectPool(makePopup, null, POOL_INITIAL);
  }

  /**
   * @param {{ x: number, y: number, vy: number, text: string, color: string,
   *           scale?: number, life: number }} opts
   */
  spawn(opts) {
    if (this.popups.length >= MAX_POPUPS) return;
    const p = this.pool.acquire();
    p.x = opts.x;
    p.y = opts.y;
    p.vy = opts.vy;
    p.text = opts.text;
    p.color = opts.color;
    p.scale = opts.scale ?? 0.78;
    p.life = opts.life;
    p.maxLife = opts.life;
    this.popups.push(p);
  }

  update(_world, delta) {
    const arr = this.popups;
    for (let i = 0; i < arr.length; i += 1) {
      const p = arr[i];
      p.y -= p.vy * delta;
      p.scale = Math.min(1.18, p.scale + 0.03 * delta);
      p.life -= delta;
    }
    compactInPlace(arr, isAlive, this.pool);
  }

  reset() {
    for (let i = 0; i < this.popups.length; i += 1) this.pool.release(this.popups[i]);
    this.popups.length = 0;
  }
}

function isAlive(p) {
  return p.life > 0;
}
