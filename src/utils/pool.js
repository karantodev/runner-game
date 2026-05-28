/**
 * Generic object pool. Holds a fixed-capacity ring of pre-allocated items
 * and recycles them on release to keep the per-frame GC quiet.
 *
 * @template T
 */
export class ObjectPool {
  /**
   * @param {() => T} factory       — creates a fresh item when the pool is empty
   * @param {(item: T) => void} [reset] — clears an item before it is reused
   * @param {number} [initialSize]  — pre-allocate this many items up-front
   */
  constructor(factory, reset, initialSize = 0) {
    this._factory = factory;
    this._reset = reset ?? null;
    this._free = [];
    for (let i = 0; i < initialSize; i += 1) this._free.push(factory());
  }

  /** @returns {T} */
  acquire() {
    const item = this._free.length > 0 ? this._free.pop() : this._factory();
    if (this._reset) this._reset(item);
    return item;
  }

  /** @param {T} item */
  release(item) {
    this._free.push(item);
  }

  /** Returns currently free (idle) count — for diagnostics. */
  get freeCount() {
    return this._free.length;
  }
}

/**
 * Compact an array in place by predicate, releasing rejected items into a pool.
 * Avoids the per-frame array allocation that `arr.filter(...)` causes.
 *
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => boolean} keep
 * @param {ObjectPool<T> | null} [pool]
 */
export function compactInPlace(arr, keep, pool = null) {
  let write = 0;
  for (let read = 0; read < arr.length; read += 1) {
    const item = arr[read];
    if (keep(item)) {
      arr[write++] = item;
    } else if (pool) {
      pool.release(item);
    }
  }
  arr.length = write;
}
