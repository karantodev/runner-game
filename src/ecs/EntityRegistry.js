import { Entity } from './Entity.js';

/**
 * Owns the world's entities + queries them by component signature.
 *
 * Two storage shapes are maintained:
 *   - `list`: a dense Array for fast iteration (queries scan it).
 *   - `byId`: a Map for O(1) lookup / destroy.
 *
 * Queries are pure filters — they walk `list` once per call. For the
 * working set sizes in this game (≤ ~250 entities), this is plenty fast
 * and avoids the bookkeeping cost of per-component indices.
 *
 * Dead entities (alive = false) are NOT skipped automatically by every
 * query — the CleanupSystem compacts them out each frame, so a query
 * during the same frame may include them. Systems that mutate state on
 * "alive only" should call `isAlive()` themselves; renderers don't care.
 */
export class EntityRegistry {
  constructor() {
    this._nextId = 1;
    this._list = [];
    this._byId = new Map();
  }

  /** Create a fresh entity and register it. */
  create() {
    const e = new Entity(this._nextId++);
    this._list.push(e);
    this._byId.set(e.id, e);
    return e;
  }

  /** Get an entity by id. Returns undefined if it has been compacted. */
  get(id) {
    return this._byId.get(id);
  }

  /** Mark an entity dead; CleanupSystem removes it on the next sweep. */
  destroy(id) {
    const e = this._byId.get(id);
    if (e) e.alive = false;
  }

  /**
   * Iterate every live entity that owns ALL of `componentNames`.
   * Returns a generator — no array allocation. Callers that need a sort
   * order should push refs into a scratch array.
   *
   * @param {...string} componentNames
   */
  *query(...componentNames) {
    const len = componentNames.length;
    for (let i = 0; i < this._list.length; i += 1) {
      const e = this._list[i];
      if (!e.alive) continue;
      let ok = true;
      for (let j = 0; j < len; j += 1) {
        if (!(componentNames[j] in e.components)) { ok = false; break; }
      }
      if (ok) yield e;
    }
  }

  /**
   * Returns the first entity owning all of `componentNames`, or null.
   * Useful for singletons like the player.
   */
  first(...componentNames) {
    for (const e of this.query(...componentNames)) return e;
    return null;
  }

  /** Snapshot of all live entity ids. Debugging only. */
  ids() {
    const out = [];
    for (const e of this._list) if (e.alive) out.push(e.id);
    return out;
  }

  /**
   * Compact the entity list — drops dead entities. Optionally accepts a
   * predicate to mark additional entities dead before sweeping; the
   * predicate receives the entity and should return `true` to KEEP it.
   *
   * @param {(e: Entity) => boolean} [keep]
   */
  compact(keep) {
    let w = 0;
    for (let r = 0; r < this._list.length; r += 1) {
      const e = this._list[r];
      if (keep && !keep(e)) e.alive = false;
      if (!e.alive) {
        this._byId.delete(e.id);
        continue;
      }
      this._list[w++] = e;
    }
    this._list.length = w;
  }

  /** Drop every entity. Used on world.reset(). */
  clear() {
    this._list.length = 0;
    this._byId.clear();
    this._nextId = 1;
  }

  /** Diagnostics: total live entities. */
  get size() {
    let n = 0;
    for (const e of this._list) if (e.alive) n += 1;
    return n;
  }
}
