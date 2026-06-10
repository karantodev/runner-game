import { PATTERNS, SPLIT_BONUS, SAFE_FALLBACK, LIFE_PICKUP_SPECIAL, POWERUP_INTRO_SPECIAL } from './patterns.data.js';

/**
 * Picks pattern entries from the data table by difficulty level, expanded
 * by weight so frequently-occurring patterns get proportionally more
 * representation in the random pool.
 */
export class PatternLibrary {
  /** @type {Map<number, ReadonlyArray<any>>} level → weighted-expanded list */
  #weighted = new Map();

  /** @type {string[]} ids returned in the last few picks, to avoid repeats */
  #recent = [];

  /** @param {import('../../utils/rng.js').Rng} [rng] — optional seeded RNG */
  constructor(rng = null) {
    this.rng = rng;
    for (const p of PATTERNS) {
      const weight = p.weight ?? 1;
      const pool = this.#weighted.get(p.difficulty) ?? [];
      for (let i = 0; i < weight; i += 1) pool.push(p);
      this.#weighted.set(p.difficulty, pool);
    }
  }

  /** @param {number} level */
  pick(level) {
    const pool = this.#weighted.get(level) ?? this.#weighted.get(1);
    // Cooldown shrinks for small pools so it can never exclude every option.
    const cooldown = Math.min(3, Math.floor(pool.length / 2));
    let pattern;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const index = this.rng ? this.rng.integer(0, pool.length - 1) : Math.floor(Math.random() * pool.length);
      pattern = pool[index];
      if (cooldown === 0 || !this.#recent.includes(pattern.id)) break;
    }
    this.#recent.push(pattern.id);
    while (this.#recent.length > cooldown) this.#recent.shift();
    return pattern;
  }

  pickSplitBonus()   { return SPLIT_BONUS; }
  pickFallback()     { return SAFE_FALLBACK; }
  pickLifePickup()   { return LIFE_PICKUP_SPECIAL; }
  pickPowerUpIntro() { return POWERUP_INTRO_SPECIAL; }

  /** Returns every named pattern exactly once — used by the test harness. */
  allPatterns() {
    const seen = new Set();
    const result = [];
    for (const p of PATTERNS) {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    }
    result.push(SPLIT_BONUS, SAFE_FALLBACK, LIFE_PICKUP_SPECIAL, POWERUP_INTRO_SPECIAL);
    return result;
  }
}
