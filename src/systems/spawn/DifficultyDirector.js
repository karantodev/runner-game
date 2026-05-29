/**
 * Translates {score, timeAlive, speed} into pattern-spacing / orchid-spacing
 * / level numbers used by SpawnSystem. RNG is injected so the spawn
 * sequence is reproducible under a fixed seed.
 */
export class DifficultyDirector {
  /**
   * @param {import('../../utils/rng.js').Rng} [rng]
   * @param {import('../../core/AdaptiveSkill.js').AdaptiveSkill | null} [skill]
   */
  constructor(rng = null, skill = null) {
    this.rng = rng;
    this.skill = skill;
  }

  get(world) {
    const level = this.#applySkillBias(this.#level(world));
    return {
      level,
      patternSpacing: this.#patternSpacing(level, world.speed),
      orchidSpacing: this.#orchidSpacing(level),
    };
  }

  /**
   * v3.5: shift the level up/down by one tier based on skill heuristic.
   * Struggling players see one level lower (max 1); skilled players see
   * one level higher. Caps still respected at both ends.
   */
  #applySkillBias(level) {
    if (!this.skill) return level;
    const tag = this.skill.level();
    if (tag === 'struggling') return Math.max(1, level - 1);
    if (tag === 'skilled')    return Math.min(6, level + 1);
    return level;
  }

  // v3.1: open-ended difficulty. Levels 1-4 still drive the PatternLibrary
  // (which only knows those buckets). Levels 5-6 reuse the level-4 pool
  // but tighten spacing / orchid density further, so seasoned players
  // keep feeling pressure deep into a run.
  //
  // v3.4 fairness: the first ~20 seconds are clamped to level 1 so the
  // player gets a warm-up regardless of how fast they collect orchids.
  // Without this, a quick early streak could vault them into level 3+
  // before they've even seen one obstacle.
  #level({ score, timeAlive }) {
    if (timeAlive < 1200) return 1;                  // ~20 s warm-up
    if (score >= 600 || timeAlive >= 6000) return 6;
    if (score >= 350 || timeAlive >= 4000) return 5;
    if (score >= 200 || timeAlive >= 2600) return 4;
    if (score >= 100 || timeAlive >= 1200) return 3;
    if (score >= 50 || timeAlive >= 600) return 2;
    return 1;
  }

  /**
   * PatternLibrary is keyed on 1-4. Hand it a clamped level so spawns
   * succeed, but keep our internal #level value for spacing math.
   */
  patternLevel(world) {
    return Math.min(4, this.#level(world));
  }

  // Scale by current speed so faster play still gives fair reaction time.
  #patternSpacing(level, speed) {
    const specs = [[46, 18], [38, 16], [30, 14], [22, 12], [18, 10], [15, 9]];
    const [base, jitter] = specs[Math.min(specs.length, level) - 1];
    const r = this.rng ? this.rng.next() : Math.random();
    return (base + r * jitter) * Math.max(1, speed / 0.9);
  }

  #orchidSpacing(level) {
    const specs = [[30, 18], [27, 16], [23, 12], [19, 10], [16, 9], [14, 8]];
    const [base, jitter] = specs[Math.min(specs.length, level) - 1];
    const r = this.rng ? this.rng.next() : Math.random();
    return base + r * jitter;
  }
}
