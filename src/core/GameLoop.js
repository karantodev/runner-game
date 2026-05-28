/**
 * Fixed-timestep game loop with accumulator. Decouples physics (update)
 * from rendering (render): update is called exactly once per simulation
 * tick at 60 Hz (FIXED_DT = 1.0 frame-unit), render is called once per
 * requestAnimationFrame.
 *
 * Why fixed timestep:
 *   - Physics is deterministic regardless of display refresh (60 / 90 / 120 / 144 Hz)
 *   - Existing per-frame coefficients (gravity 0.95, jumpHoldBoost -0.8, etc.)
 *     are already calibrated for delta = 1.0, so they remain unchanged.
 *   - Spiral-of-death protection: if the tab is throttled or the device
 *     stutters, we cap catch-up to MAX_CATCHUP_STEPS so the simulation
 *     does not freeze the page trying to make up lost time.
 *
 * Pause behavior: requestAnimationFrame is naturally paused while the tab
 * is hidden, so on resume we reset the accumulator instead of fast-forwarding.
 */
const FRAME_MS = 1000 / 60;          // 16.6667 ms per simulation tick
const FIXED_DT = 1.0;                // one frame-unit per update call
const MAX_CATCHUP_STEPS = 5;         // burn at most 5 ticks of backlog per RAF
const RESYNC_THRESHOLD_MS = 250;     // gap larger than this → drop the backlog

export class GameLoop {
  #lastTime = 0;
  #accumulator = 0;
  #rafId = 0;
  #running = false;

  constructor({ update, render }) {
    this.update = update;
    this.render = render;
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#lastTime = 0;
    this.#accumulator = 0;
    const tick = (time) => {
      if (!this.#running) return;

      if (this.#lastTime === 0) {
        this.#lastTime = time;
        this.#rafId = requestAnimationFrame(tick);
        return;
      }

      const elapsedMs = time - this.#lastTime;
      this.#lastTime = time;

      if (elapsedMs > RESYNC_THRESHOLD_MS) {
        // Tab was hidden, breakpoint, or massive jank — skip the backlog
        // rather than burning CPU trying to catch up.
        this.#accumulator = 0;
      } else {
        this.#accumulator += elapsedMs / FRAME_MS;
      }

      let steps = 0;
      while (this.#accumulator >= FIXED_DT && steps < MAX_CATCHUP_STEPS) {
        this.update(FIXED_DT);
        this.#accumulator -= FIXED_DT;
        steps += 1;
      }

      // Discard remaining backlog if we hit the catch-up cap.
      if (this.#accumulator >= FIXED_DT) this.#accumulator = 0;

      this.render();
      this.#rafId = requestAnimationFrame(tick);
    };
    this.#rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.#running = false;
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
    this.#rafId = 0;
  }
}
