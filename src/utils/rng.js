/**
 * Seedable PRNG using sfc32 — small, fast, full-period uint32 generator.
 *
 * Reference: PractRand-passing 32-bit chaotic-RNG with cycle length on
 * the order of 2^127 worst case (typically full-period).
 *
 * Usage:
 *   const rng = new Rng(12345);
 *   rng.next();         // [0, 1)
 *   rng.range(0, 100);  // [0, 100)
 *   rng.choice(arr);    // random element
 *   rng.chance(0.3);    // true 30% of the time
 *   rng.integer(0, 9);  // inclusive integer in [0, 9]
 *
 * Seeds are hashed through a deterministic mixer so close seeds (1, 2,
 * 3, ...) still produce uncorrelated streams.
 */

/**
 * Mulberry-style integer hash. Spreads small numeric seeds so adjacent
 * input values don't produce neighboring output streams.
 * @param {number} a
 * @returns {number} uint32
 */
function hashUint32(a) {
  a |= 0;
  a = (a + 0x9e3779b9) | 0;
  a ^= a >>> 16;
  a = Math.imul(a, 0x85ebca6b);
  a ^= a >>> 13;
  a = Math.imul(a, 0xc2b2ae35);
  a ^= a >>> 16;
  return a >>> 0;
}

/**
 * Convert an arbitrary string into a uint32 seed via FNV-1a 32-bit.
 * Useful for `?seed=run-2026-05-28` style URLs.
 * @param {string} s
 * @returns {number} uint32
 */
export function stringToSeed(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  /** @param {number | string} [seed] — uint32 or arbitrary string */
  constructor(seed = (Math.random() * 0x100000000) >>> 0) {
    this.reseed(seed);
  }

  /**
   * Mutate state words in place to a fresh seed. Existing callers that
   * hold a reference to this Rng (DifficultyDirector, PatternLibrary,
   * SpawnSystem) keep working without re-wiring — useful for switching
   * into a daily-challenge run mid-session.
   *
   * @param {number | string} seed
   */
  reseed(seed) {
    const numericSeed = typeof seed === 'string' ? stringToSeed(seed) : seed >>> 0;
    this.seed = numericSeed;
    this._a = hashUint32(numericSeed);
    this._b = hashUint32(this._a);
    this._c = hashUint32(this._b);
    this._d = hashUint32(this._c) | 1;
    for (let i = 0; i < 12; i += 1) this._uint32();
  }

  /** @returns {number} uint32 */
  _uint32() {
    let a = this._a;
    let b = this._b;
    let c = this._c;
    let d = this._d;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
    return t >>> 0;
  }

  /** Float in `[0, 1)`. */
  next() {
    return this._uint32() / 0x100000000;
  }

  /** Float in `[min, max)`. */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** Integer in `[min, max]` (both ends inclusive). */
  integer(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** `true` with probability `p`. */
  chance(p) {
    return this.next() < p;
  }

  /**
   * Uniformly pick one element from a non-empty array.
   * @template T
   * @param {ReadonlyArray<T>} items
   * @returns {T}
   */
  choice(items) {
    return items[Math.floor(this.next() * items.length)];
  }
}
