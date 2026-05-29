/**
 * Derives a "skill bias" from the player's recent run history. Read by
 * DifficultyDirector to gently shift the difficulty curve so:
 *
 *   - new / struggling players get a softer ramp (fewer level-2+ patterns
 *     before they survive 30+ s)
 *   - skilled players see tier-up sooner so the run stays engaging
 *
 * Why a separate class:
 *   - SRP: PlayerStats handles persistence; this class handles the
 *     classification heuristic. Either can change independently.
 *   - Pure function over snapshot — easy to test, no globals.
 *   - Cached so DifficultyDirector.get() (per-pattern) isn't recomputing
 *     stats inspection on every spawn.
 */
const STRUGGLE_THRESHOLD = 240;   // m — < this average → struggling
const SKILLED_THRESHOLD  = 720;   // m — > this average → skilled
const MIN_SAMPLES = 3;

/** @typedef {'struggling' | 'normal' | 'skilled'} SkillLevel */

export class AdaptiveSkill {
  /** @param {import('./PlayerStats.js').PlayerStats | null} playerStats */
  constructor(playerStats) {
    this.playerStats = playerStats;
    /** @type {SkillLevel} */
    this.cached = 'normal';
    this.cachedRunCount = -1;
    this.refresh();
  }

  /**
   * Recompute the bias from the latest stats snapshot. Cheap; safe to
   * call every world.start() so the next run sees up-to-date guidance.
   */
  refresh() {
    if (!this.playerStats) { this.cached = 'normal'; return; }
    const stats = this.playerStats.snapshot();
    if (stats.runCount === this.cachedRunCount) return;
    this.cachedRunCount = stats.runCount;
    const recent = stats.recentRunDistances ?? [];
    if (recent.length < MIN_SAMPLES) {
      this.cached = 'normal';
      return;
    }
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (avg < STRUGGLE_THRESHOLD) this.cached = 'struggling';
    else if (avg > SKILLED_THRESHOLD) this.cached = 'skilled';
    else this.cached = 'normal';
  }

  /** @returns {SkillLevel} */
  level() { return this.cached; }
}
