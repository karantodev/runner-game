import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * Translates {score, timeAlive, speed} into pattern-spacing / orchid-spacing
 * / level numbers used by SpawnSystem. RNG is injected so the spawn
 * sequence is reproducible under a fixed seed.
 */
export class DifficultyDirector {
  /**
   * @param {import('../../utils/rng.js').Rng} [rng]
   * @param {import('../../core/AdaptiveSkill.js').AdaptiveSkill | null} [skill]
   * @param {typeof GAME_CONFIG} [config]
   */
  constructor(rng = null, skill = null, config = GAME_CONFIG) {
    this.rng = rng;
    this.skill = skill;
    this.config = config;
  }

  get(world) {
    const intensity = this.#intensity(world);
    const level = this.#applySkillBias(this.#level(world));
    return {
      level,
      intensity,
      patternSpacing: this.#patternSpacing(intensity, world.speed),
      orchidSpacing: this.#orchidSpacing(intensity),
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

  // Smooth 0..1 pressure curve blending elapsed time and collected score, with
  // periodic "rest" dips so the run breathes instead of ramping monotonically.
  // Pure function of {score, timeAlive} — never draws RNG, so seeded placement
  // tests stay deterministic.
  #intensity({ score = 0, timeAlive = 0 }) {
    const d = this.config.gameplay.difficulty;
    if (timeAlive < d.warmupFrames) return 0;
    const t = Math.min(1, (timeAlive - d.warmupFrames) / d.timeToFullFrames);
    const s = Math.min(1, score / d.scoreToFull);
    const base = Math.min(1, d.timeWeight * t + d.scoreWeight * s);
    // Periodic release windows: dip (never boost) intensity so the player gets
    // rhythmic breathers; amplitude shrinks as base rises so peaks stay tense.
    const dip = Math.max(0, -Math.sin(timeAlive / d.wavePeriodFrames)) * d.waveAmplitude * (1 - base);
    return Math.max(0, Math.min(1, base - dip));
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
  #level(world) {
    if (world.timeAlive < this.config.gameplay.difficulty.warmupFrames) return 1;
    return 1 + Math.min(5, Math.floor(this.#intensity(world) * 6)); // 1..6
  }

  /**
   * PatternLibrary is keyed on 1-4. Hand it a clamped level so spawns
   * succeed, but keep our internal #level value for spacing math.
   */
  patternLevel(world) {
    return Math.min(4, this.#level(world));
  }

  // Scale by current speed so faster play still gives fair reaction time.
  #patternSpacing(intensity, speed) {
    const base = 46 - 31 * intensity;     // 46 → 15
    const jitter = 18 - 9 * intensity;    // 18 → 9
    const r = this.rng ? this.rng.next() : Math.random();
    return (base + r * jitter) * Math.max(1, speed / this.config.gameplay.startSpeed);
  }

  #orchidSpacing(intensity) {
    const base = 30 - 16 * intensity;     // 30 → 14
    const jitter = 18 - 10 * intensity;   // 18 → 8
    const r = this.rng ? this.rng.next() : Math.random();
    return base + r * jitter;
  }
}
