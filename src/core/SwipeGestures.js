/**
 * Canvas-level swipe → input action mapping.
 *
 * Adds an alternative to the on-screen touch buttons:
 *   - swipe left / right → lane change
 *   - swipe up           → jump
 *   - swipe down         → crouch
 *   - tap (no swipe)     → jump (start menu / spacebar-equivalent)
 *
 * Listens directly on the game canvas via Pointer Events so it works
 * with touch + stylus + (optionally) mouse drag. Button-area pointer
 * events still pass through to the touch buttons because they sit
 * above the canvas and call event.stopPropagation().
 *
 * Tunable thresholds:
 *   - minSwipeDistance — px; below this counts as a tap.
 *   - directionRatio   — main-axis must beat secondary-axis by this
 *                        ratio to commit (suppresses diagonals).
 */
const MIN_SWIPE_DISTANCE_PX = 36;
const DIRECTION_RATIO = 1.4;
const MAX_SWIPE_AGE_MS = 600;

export class SwipeGestures {
  /**
   * @param {import('./InputManager.js').InputManager} input
   * @param {HTMLElement} target
   */
  constructor(input, target) {
    this.input = input;
    this.target = target;
    this.activePointer = null;
    this.start = null;

    target.addEventListener('pointerdown', (e) => this.#onDown(e), { passive: false });
    target.addEventListener('pointerup',   (e) => this.#onUp(e),   { passive: false });
    target.addEventListener('pointercancel', () => { this.activePointer = null; this.start = null; });
  }

  // (helpers are defined at module scope to keep the class lean)

  #onDown(event) {
    // Only handle the primary contact; secondary fingers are ignored so
    // a two-finger zoom doesn't fire spurious swipes.
    if (this.activePointer !== null) return;
    // Safe zones: a tap that lands on an interactive HUD chip (pause
    // button, score chip, tool panel, touch-controls) must NOT also
    // count as a canvas swipe. event.target gives us the actual element
    // even though pointer events fire on the canvas via bubbling.
    if (isInSafeZone(event.target)) return;
    this.activePointer = event.pointerId;
    this.start = { x: event.clientX, y: event.clientY, t: performance.now() };
  }

  #onUp(event) {
    if (this.activePointer !== event.pointerId) return;
    const start = this.start;
    this.activePointer = null;
    this.start = null;
    if (!start) return;
    if (performance.now() - start.t > MAX_SWIPE_AGE_MS) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < MIN_SWIPE_DISTANCE_PX && absY < MIN_SWIPE_DISTANCE_PX) {
      // Tap → jump (also doubles as menu start, same as keyboard Space).
      this.input.triggerEdge('jump');
      this.input.triggerEdge('start');
      return;
    }

    if (absX > absY * DIRECTION_RATIO) {
      this.input.triggerEdge(dx > 0 ? 'moveRight' : 'moveLeft');
    } else if (absY > absX * DIRECTION_RATIO) {
      if (dy < 0) {
        this.input.triggerEdge('jump');
      } else {
        this.input.triggerEdge('crouchDown');
      }
    }
    // Otherwise it was a diagonal swipe — ignore (player should commit
    // to one direction).
  }
}

/**
 * Walks the event target up the DOM looking for an interactive HUD
 * element. Returns true if the pointerdown originated on or inside one
 * — those owners handle the gesture themselves.
 */
function isInSafeZone(node) {
  while (node && node !== document) {
    if (node.closest) {
      const hit = node.closest('button, .hud-box, #touch-controls, .overlay.on, .settings-modal.on, .achievement-toast.on');
      if (hit) return true;
    }
    node = node.parentNode;
  }
  return false;
}
