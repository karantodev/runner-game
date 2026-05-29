/**
 * Three-step tutorial shown on the very first run.
 *
 * Persistence: a single localStorage flag (`tutorialSeenKey`) prevents the
 * overlay from re-appearing once dismissed. Settings → "Reset stats"
 * leaves it alone; only `clearSeen()` resets the flag (useful for QA).
 *
 * Touch detection: chooses icons appropriate to the input mode. We assume
 * coarse pointer / `body.force-touch` → touch hints; otherwise keyboard.
 */
const DEFAULT_STEPS = Object.freeze([
  { kbd: '← →',    touch: 'TAP',   text: 'Move between lanes' },
  { kbd: 'SPACE',  touch: 'SWIPE ↑', text: 'Jump over vines' },
  { kbd: '↓',      touch: 'SWIPE ↓', text: 'Duck under branches' },
]);

const STEP_DURATION_MS = 2400;  // hold per step
const FADE_OUT_MS = 320;

export class TutorialOverlay {
  /**
   * @param {string} storageKey
   * @param {{ steps?: typeof DEFAULT_STEPS }} [opts]
   */
  constructor(storageKey, opts = {}) {
    this.storageKey = storageKey;
    this.steps = opts.steps ?? DEFAULT_STEPS;
    this.el = null;
    this.iconEl = null;
    this.textEl = null;
    this.timer = 0;
    this.cancelled = false;
  }

  hasBeenSeen() {
    try { return Boolean(window.localStorage.getItem(this.storageKey)); }
    catch { return false; }
  }

  markSeen() {
    try { window.localStorage.setItem(this.storageKey, '1'); }
    catch { /* localStorage unavailable — degrade to session-only. */ }
  }

  clearSeen() {
    try { window.localStorage.removeItem(this.storageKey); } catch { /* noop */ }
  }

  /**
   * Run the overlay sequence. If `hasBeenSeen()` returns true (or `force`
   * is false), this is a no-op. Resolves when the last step fades out.
   *
   * @param {{ force?: boolean }} [opts]
   * @returns {Promise<void>}
   */
  async run(opts = {}) {
    if (!opts.force && this.hasBeenSeen()) return;
    this.el = document.getElementById('tutorial');
    if (!this.el) return;
    this.iconEl = this.el.querySelector('.tutorial-icon');
    this.textEl = this.el.querySelector('.tutorial-text');
    this.el.setAttribute('aria-hidden', 'false');
    this.cancelled = false;

    const isTouch = this.#isTouchPrimary();
    for (const step of this.steps) {
      if (this.cancelled) break;
      if (this.iconEl) this.iconEl.textContent = isTouch ? step.touch : step.kbd;
      if (this.textEl) this.textEl.textContent = step.text;
      this.el.classList.add('on');
      await delay(STEP_DURATION_MS);
      this.el.classList.remove('on');
      await delay(FADE_OUT_MS);
    }

    this.el.setAttribute('aria-hidden', 'true');
    // Only mark as seen if the sequence ran to completion. A cancel mid-
    // run (death / pause) leaves the flag untouched so the tutorial
    // replays on the next fresh start.
    if (!this.cancelled) this.markSeen();
  }

  /** Abort the running sequence early (e.g. on user game-over). */
  cancel() {
    this.cancelled = true;
    if (this.el) {
      this.el.classList.remove('on');
      this.el.setAttribute('aria-hidden', 'true');
    }
  }

  #isTouchPrimary() {
    if (typeof window === 'undefined') return false;
    if (document.body.classList.contains('force-touch')) return true;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
