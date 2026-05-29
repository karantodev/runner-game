/**
 * Tracks the orchid-collection streak and exposes its multiplier.
 *
 * Single responsibility: this class only knows about the combo state.
 * It does NOT mutate score (GameStateSystem applies the multiplier when
 * adding score), and it does NOT decide WHAT counts as a streak event —
 * callers tell it explicitly via #bump (on a counted collect) or #reset
 * (on a hit).
 *
 * Per-frame: counts down grace timer; emits 'comboChanged' when the
 * multiplier crosses a step or grace expires.
 *
 * Pipeline signature: update(world, delta).
 */
export class ComboSystem {
  constructor(config, eventBus) {
    this.config = config.gameplay.combo;
    this.eventBus = eventBus;
    this.count = 0;
    this.multiplier = 1;
    this.graceFrames = 0;
    /**
     * Bumped per tick to limit how many bumps count toward the streak in
     * a single frame. Magnet can collect many orchids at once — but the
     * "streak" semantic should still represent skill, not power-up burst.
     * Each frame, ONE bump still counts; extras still grant score (via
     * GameStateSystem) but don't ladder the multiplier.
     */
    this.bumpsThisFrame = 0;
  }

  reset(reason = 'reset') {
    if (this.count === 0 && this.multiplier === 1) return;
    this.count = 0;
    this.multiplier = 1;
    this.graceFrames = 0;
    this.eventBus.emit('comboChanged', { count: 0, multiplier: 1, reason });
  }

  /**
   * Score-bearing event happened. Increment streak (rate-limited to 1
   * per frame to avoid magnet exploits), refresh grace window, step
   * the multiplier up one tier per `stepEvery` collects.
   *
   * @returns {boolean} true if this bump counted (visual hooks may want
   * to skip animation on rejected bumps).
   */
  bump() {
    if (this.bumpsThisFrame >= 1) return false;   // magnet/burst rate-cap
    this.bumpsThisFrame = 1;
    this.count += 1;
    this.graceFrames = this.config.graceFrames;
    const next = Math.min(
      this.config.maxMultiplier,
      1 + Math.floor(this.count / this.config.stepEvery),
    );
    if (next !== this.multiplier) {
      this.multiplier = next;
      this.eventBus.emit('comboChanged', { count: this.count, multiplier: next, reason: 'bump' });
    }
    return true;
  }

  update(_world, delta) {
    // Reset the per-frame bump counter at the START of each tick so the
    // next CollisionSystem pass (later in the pipeline) sees a fresh budget.
    this.bumpsThisFrame = 0;
    if (this.count <= 0) return;
    this.graceFrames = Math.max(0, this.graceFrames - delta);
    if (this.graceFrames <= 0) this.reset('timeout');
  }

  /**
   * UI hint: true when the streak is about to time out. HUD watches this
   * per-frame and flashes the badge so the player knows to grab the next
   * orchid. Threshold is one fifth of the grace window — short enough to
   * be actionable, long enough that the player can react.
   */
  isWarning() {
    if (this.count <= 0) return false;
    return this.graceFrames > 0 && this.graceFrames < this.config.graceFrames * 0.20;
  }
}
