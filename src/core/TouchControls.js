/**
 * Maps the on-screen touch controls (DOM buttons in #touch-controls) to
 * InputManager edge / held actions.
 *
 * Visibility is controlled purely by CSS (@media touch query) — this
 * class doesn't care whether the buttons are shown. If the element is
 * absent (e.g. dev.html doesn't include it), the constructor is a no-op.
 *
 * Each button has `data-action="..."` matching one of:
 *   moveLeft | moveRight | jump | crouch
 * "crouch" maps to the InputManager edge action `crouchDown` AND the held
 * action `crouchHeld`; "jump" maps to `jump` + `jumpHeld`.
 *
 * Uses Pointer Events so the same code handles touch, mouse, and stylus.
 */

const BUTTON_ACTION_MAP = {
  moveLeft:  { edge: 'moveLeft',   held: null },
  moveRight: { edge: 'moveRight',  held: null },
  jump:      { edge: 'jump',       held: 'jumpHeld' },
  crouch:    { edge: 'crouchDown', held: 'crouchHeld' },
};

export class TouchControls {
  /**
   * @param {import('./InputManager.js').InputManager} input
   * @param {string} [containerId]
   */
  constructor(input, containerId = 'touch-controls') {
    this.input = input;
    const container = document.getElementById(containerId);
    if (!container) return;
    this.container = container;
    for (const btn of container.querySelectorAll('button[data-action]')) {
      const action = btn.dataset.action;
      const mapping = BUTTON_ACTION_MAP[action];
      if (!mapping) continue;
      this.#bindButton(btn, mapping);
    }
  }

  #bindButton(btn, { edge, held }) {
    const onDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      try { btn.setPointerCapture?.(event.pointerId); } catch { /* synthetic events lack a captured pointer */ }
      this.input.triggerEdge(edge);
      // The keyboard Space binding doubles as the menu start button —
      // touch jump should do the same so a first tap kicks off the run.
      if (edge === 'jump') this.input.triggerEdge('start');
      if (held) this.input.setHeld(held, true);
      btn.classList.add('is-active');
    };
    const onUp = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (held) this.input.setHeld(held, false);
      btn.classList.remove('is-active');
    };

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
    btn.addEventListener('pointerleave', onUp);
    // Suppress synthetic click/contextmenu so the button never steals focus
    // or pops a long-press menu on iOS Safari.
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
