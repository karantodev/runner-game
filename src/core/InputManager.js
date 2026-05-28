/**
 * Unified keyboard + touch + gamepad input.
 *
 * Edge-triggered actions are counted (not boolean), so that two rapid taps
 * within one frame are consumed as two distinct lane-switches instead of
 * one. Held actions stay as booleans.
 *
 * Public API:
 *   - consume(name)  — decrement edge counter, returns true if fired
 *   - isHeld(name)   — current state of a held action
 *   - pollGamepad()  — call once per frame to update gamepad-derived state
 *
 * @typedef {'moveLeft' | 'moveRight' | 'jump' | 'crouchDown' | 'restart' | 'pause' | 'start'} EdgeAction
 * @typedef {'jumpHeld' | 'crouchHeld'} HeldAction
 */
const EDGE_ACTIONS = ['moveLeft', 'moveRight', 'jump', 'crouchDown', 'restart', 'pause', 'start'];
const HELD_ACTIONS = ['jumpHeld', 'crouchHeld'];

export class InputManager {
  /** @type {Record<string, number>} edge-action counters */
  #edge = Object.create(null);
  /** @type {Record<string, boolean>} held-action booleans */
  #held = Object.create(null);

  #touchStart = null;
  #activeTouchId = null;
  #axisCooldown = 0;
  #buttonMemory = new Map();

  constructor(canvas) {
    this.canvas = canvas;
    for (const a of EDGE_ACTIONS) this.#edge[a] = 0;
    for (const a of HELD_ACTIONS) this.#held[a] = false;
    this.#bindKeyboard();
    this.#bindTouch();
    this.#bindFocus();
  }

  /**
   * Decrement and report whether an edge-action fired this frame.
   * @param {EdgeAction} actionName
   */
  consume(actionName) {
    if (this.#edge[actionName] > 0) {
      this.#edge[actionName] -= 1;
      return true;
    }
    return false;
  }

  /** @param {HeldAction} actionName */
  isHeld(actionName) {
    return Boolean(this.#held[actionName]);
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) return;

    if (this.#axisCooldown > 0) this.#axisCooldown -= 1;
    const xAxis = pad.axes[0] ?? 0;
    if (this.#axisCooldown <= 0 && Math.abs(xAxis) > 0.55) {
      if (xAxis < 0) this.#edge.moveLeft += 1;
      if (xAxis > 0) this.#edge.moveRight += 1;
      this.#axisCooldown = 14;
    }

    const jumpPressed = Boolean(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed);
    this.#setButtonEdge('jump', jumpPressed);
    this.#setButtonEdge('start', jumpPressed);
    this.#held.jumpHeld = jumpPressed;

    // D-pad-down (button 13) or right-stick / left-stick down. We do NOT
    // re-use button 0 — that's jump.
    const yAxis = pad.axes[1] ?? 0;
    const crouchPressed = Boolean(pad.buttons[13]?.pressed) || yAxis > 0.55;
    this.#setButtonEdge('crouchDown', crouchPressed);
    this.#held.crouchHeld = crouchPressed;

    this.#setButtonEdge('pause', Boolean(pad.buttons[9]?.pressed));
    this.#setButtonEdge('restart', Boolean(pad.buttons[8]?.pressed));
  }

  #setButtonEdge(actionName, pressed) {
    const wasPressed = this.#buttonMemory.get(actionName) ?? false;
    if (pressed && !wasPressed) this.#edge[actionName] += 1;
    this.#buttonMemory.set(actionName, pressed);
  }

  #bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          event.preventDefault();
          this.#edge.moveLeft += 1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          event.preventDefault();
          this.#edge.moveRight += 1;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          event.preventDefault();
          this.#edge.jump += 1;
          this.#edge.start += 1;
          this.#held.jumpHeld = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          event.preventDefault();
          this.#edge.crouchDown += 1;
          this.#held.crouchHeld = true;
          break;
        case 'KeyR':
          this.#edge.restart += 1;
          break;
        case 'Escape':
        case 'KeyP':
          event.preventDefault();
          this.#edge.pause += 1;
          break;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') {
        this.#held.jumpHeld = false;
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        this.#held.crouchHeld = false;
      }
    });
  }

  #bindTouch() {
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      // Ignore secondary fingers — single-touch swipe / tap only.
      if (this.#activeTouchId !== null) return;
      const touch = event.changedTouches[0];
      this.#activeTouchId = touch.identifier;
      this.#touchStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
    }, { passive: false });

    const finishTouch = (event) => {
      event.preventDefault();
      if (this.#touchStart === null) return;

      let touch = null;
      for (const t of event.changedTouches) {
        if (t.identifier === this.#activeTouchId) { touch = t; break; }
      }
      if (!touch) return;

      const dx = touch.clientX - this.#touchStart.x;
      const dy = touch.clientY - this.#touchStart.y;
      const dt = performance.now() - this.#touchStart.time;

      if (dt < 700) {
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
          this.#edge[dx > 0 ? 'moveRight' : 'moveLeft'] += 1;
        } else if (-dy > 34) {
          this.#edge.jump += 1;
          this.#edge.start += 1;
        } else if (dy > 34) {
          // Swipe down → crouch. crouchHeld stays false; Player's min-hold
          // logic keeps the duck visible for the tap-window.
          this.#edge.crouchDown += 1;
        } else if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
          this.#edge.jump += 1;
          this.#edge.start += 1;
        }
      }

      this.#touchStart = null;
      this.#activeTouchId = null;
      this.#held.jumpHeld = false;
    };

    this.canvas.addEventListener('touchend', finishTouch, { passive: false });
    this.canvas.addEventListener('touchcancel', finishTouch, { passive: false });
  }

  #bindFocus() {
    // Stuck-held bug: window loses focus while a key is down → keyup never fires,
    // so jumpHeld would remain true after returning.
    const releaseHeld = () => {
      this.#held.jumpHeld = false;
      this.#held.crouchHeld = false;
      this.#touchStart = null;
      this.#activeTouchId = null;
    };
    window.addEventListener('blur', releaseHeld);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseHeld();
    });
  }
}
