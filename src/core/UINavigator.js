/**
 * UI navigation for menus, settings, death overlay.
 *
 * Drives focus across <button>, <input>, <select> elements inside the
 * currently-active overlay container using:
 *   - keyboard: Arrow keys, Tab/Shift+Tab, Enter/Space, Esc
 *   - gamepad:  D-pad up/down/left/right, A (button 0), B (button 1)
 *               left-stick axes also count for d-pad style nav
 *
 * Why a separate class:
 *   - SRP: nothing here mutates world / sends input actions to systems;
 *     it just routes the player's intent over visible UI controls.
 *   - Doesn't conflict with gameplay input: poll() short-circuits when
 *     world.state === 'playing' AND no overlay is visible. During a real
 *     game session gamepad goes through InputManager only.
 *   - One class handles every screen: each overlay's container element
 *     is registered with `registerScene(id, root)`; whichever scene is
 *     currently visible owns focus.
 *
 * Public API:
 *   - registerScene(name, rootEl, { onBack?, autoFocus? })
 *   - setActive(name) — also called automatically when an overlay's
 *     visibility class changes
 *   - poll() — call once per frame from Game.#update
 *
 * Gamepad button index assumptions follow W3C "standard" mapping
 * (Xbox A / Sony ✕ on button 0; Xbox B / Sony ○ on button 1).
 */

const NAV_REPEAT_INITIAL_FRAMES = 18;   // ~300 ms first repeat
const NAV_REPEAT_INTERVAL_FRAMES = 9;   // ~150 ms thereafter
const STICK_ACTIVATE_THRESHOLD = 0.55;  // 55% deflection counts as a press
const STICK_RELEASE_THRESHOLD = 0.30;

/** @typedef {{
 *   root: HTMLElement,
 *   onBack: (() => void) | null,
 *   autoFocus: boolean,
 *   isVisible: () => boolean,
 * }} SceneSpec */

export class UINavigator {
  constructor() {
    /** @type {Map<string, SceneSpec>} */
    this.scenes = new Map();
    this.activeName = null;
    /** Held-state trackers so a button press fires once + auto-repeats. */
    this.holdFrames = { up: 0, down: 0, left: 0, right: 0, select: 0, back: 0 };
    this.world = null;
    this.#bindKeyboard();
  }

  /**
   * Attach a `world` reference so poll() can suppress UI nav while the
   * player is actively playing (no overlay is visible).
   */
  attachWorld(world) { this.world = world; }

  /**
   * Register a scene's root element + optional back-button handler.
   * If you don't supply `isVisible`, the navigator falls back to checking
   * the root element's `.on` class (matches the existing overlay convention).
   *
   * @param {string} name
   * @param {HTMLElement} root
   * @param {{ onBack?: () => void, autoFocus?: boolean, isVisible?: () => boolean }} [opts]
   */
  registerScene(name, root, opts = {}) {
    if (!root) return;
    /** @type {SceneSpec} */
    const spec = {
      root,
      onBack: opts.onBack ?? null,
      autoFocus: opts.autoFocus !== false,
      isVisible: opts.isVisible ?? (() => root.classList.contains('on')),
    };
    this.scenes.set(name, spec);
  }

  /**
   * Per-frame tick driven by Game.#update. Reads gamepad state directly
   * (independent of InputManager) and routes nav actions to the visible
   * scene.
   */
  poll() {
    const scene = this.#resolveActiveScene();
    if (!scene) {
      // Reset hold counters so the next overlay-open doesn't see stale
      // "still held" buttons that the player started pressing during play.
      for (const k of Object.keys(this.holdFrames)) this.holdFrames[k] = 0;
      return;
    }
    const buttons = this.#gamepadInputs();
    this.#tickAxis(buttons.up,    'up',    () => this.#move(-1));
    this.#tickAxis(buttons.down,  'down',  () => this.#move(+1));
    this.#tickAxis(buttons.left,  'left',  () => this.#sideways(scene, -1));
    this.#tickAxis(buttons.right, 'right', () => this.#sideways(scene, +1));
    this.#tickAxis(buttons.select, 'select', () => this.#activate());
    this.#tickAxis(buttons.back,   'back',   () => scene.onBack?.());
  }

  // ── Scene helpers ──────────────────────────────────────────────────────────

  /** Return the spec of the first visible scene (later registrations win). */
  #resolveActiveScene() {
    // Iterate in reverse — overlays opened later (settings on top of menu,
    // death over gameplay) should own focus when multiple are 'on'.
    const names = [...this.scenes.keys()].reverse();
    for (const name of names) {
      const spec = this.scenes.get(name);
      if (spec && spec.isVisible()) {
        if (this.activeName !== name) this.#onSceneActivated(name, spec);
        return spec;
      }
    }
    this.activeName = null;
    return null;
  }

  /**
   * Side-effect of "the active scene changed": move focus to the first
   * focusable element so keyboard / gamepad users can act immediately.
   */
  #onSceneActivated(name, spec) {
    this.activeName = name;
    if (!spec.autoFocus) return;
    const first = this.#focusableIn(spec.root)[0];
    if (first) setTimeout(() => first.focus(), 0);  // wait for the overlay's own transition
  }

  /**
   * DOM-order list of focusable interactive elements within the scene root.
   * Excludes hidden / disabled controls.
   */
  #focusableIn(root) {
    const all = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return Array.from(all).filter(el =>
      !el.disabled
      && el.tabIndex !== -1
      && el.offsetParent !== null
    );
  }

  // ── Navigation actions ─────────────────────────────────────────────────────

  /** Step focus forward / backward through the active scene. */
  #move(direction) {
    const scene = this.#resolveActiveScene();
    if (!scene) return;
    const items = this.#focusableIn(scene.root);
    if (!items.length) return;
    const currentIdx = items.indexOf(document.activeElement);
    const nextIdx = currentIdx < 0
      ? (direction > 0 ? 0 : items.length - 1)
      : (currentIdx + direction + items.length) % items.length;
    items[nextIdx].focus();
  }

  /**
   * Horizontal nav: for <select> elements step the value; for buttons in
   * a horizontal row (.share-row, .menu-buttons) hop to the next button;
   * otherwise behave like vertical nav. Keeps single-row UIs (settings
   * select, share buttons) intuitive.
   */
  #sideways(scene, direction) {
    const el = document.activeElement;
    if (el?.tagName === 'SELECT') {
      const next = el.selectedIndex + direction;
      if (next >= 0 && next < el.options.length) {
        el.selectedIndex = next;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (el?.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !el.checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    // Fall back to vertical-style cycling.
    this.#move(direction);
  }

  #activate() {
    const el = document.activeElement;
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !el.checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    // .ui-pressed mirrors :active for keyboard/gamepad — wire briefly so
    // the player gets visual confirmation.
    el.classList.add('ui-pressed');
    setTimeout(() => el.classList.remove('ui-pressed'), 90);
    el.click();
  }

  // ── Input sources ──────────────────────────────────────────────────────────

  /**
   * Aggregate state from the first connected gamepad into the six
   * directional / action signals UI navigation needs. Returns 1/0 per
   * channel; the tickAxis helper handles repeat timing.
   */
  #gamepadInputs() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) return BLANK_INPUTS;
    // D-pad: standard mapping 12 (up) 13 (down) 14 (left) 15 (right).
    const dUp    = pad.buttons[12]?.pressed ? 1 : 0;
    const dDown  = pad.buttons[13]?.pressed ? 1 : 0;
    const dLeft  = pad.buttons[14]?.pressed ? 1 : 0;
    const dRight = pad.buttons[15]?.pressed ? 1 : 0;
    // Left stick — Y is +down on most browsers.
    const sx = pad.axes[0] ?? 0;
    const sy = pad.axes[1] ?? 0;
    const sUp    = sy < -STICK_ACTIVATE_THRESHOLD ? 1 : 0;
    const sDown  = sy >  STICK_ACTIVATE_THRESHOLD ? 1 : 0;
    const sLeft  = sx < -STICK_ACTIVATE_THRESHOLD ? 1 : 0;
    const sRight = sx >  STICK_ACTIVATE_THRESHOLD ? 1 : 0;
    return {
      up:     dUp    | sUp,
      down:   dDown  | sDown,
      left:   dLeft  | sLeft,
      right:  dRight | sRight,
      select: pad.buttons[0]?.pressed ? 1 : 0,   // Xbox A / Sony ✕
      back:   pad.buttons[1]?.pressed ? 1 : 0,   // Xbox B / Sony ○
    };
  }

  /**
   * Edge-detect + auto-repeat for one input channel. Fires `fn` on the
   * very first frame the input is held, then after NAV_REPEAT_INITIAL,
   * then every NAV_REPEAT_INTERVAL while still held.
   */
  #tickAxis(value, name, fn) {
    const held = this.holdFrames[name];
    if (value) {
      if (held === 0) {
        // Edge: first frame held → fire.
        fn();
        this.holdFrames[name] = 1;
      } else if (held >= NAV_REPEAT_INITIAL_FRAMES &&
                 (held - NAV_REPEAT_INITIAL_FRAMES) % NAV_REPEAT_INTERVAL_FRAMES === 0) {
        fn();
        this.holdFrames[name] = held + 1;
      } else {
        this.holdFrames[name] = held + 1;
      }
    } else {
      this.holdFrames[name] = 0;
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  /**
   * Keyboard arrows / Enter / ESC for UI nav. Tab is still handled by
   * the browser natively (we just add the focus styles). Filter out
   * key-repeats inside <input> / contenteditable so typing in the
   * leaderboard name field isn't interrupted.
   */
  #bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const scene = this.#resolveActiveScene();
      if (!scene) return;
      const t = e.target;
      const inField = t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable;
      switch (e.key) {
        case 'ArrowUp':
          if (inField) return;
          e.preventDefault();
          this.#move(-1);
          break;
        case 'ArrowDown':
          if (inField) return;
          e.preventDefault();
          this.#move(+1);
          break;
        case 'ArrowLeft':
          if (inField) return;
          e.preventDefault();
          this.#sideways(scene, -1);
          break;
        case 'ArrowRight':
          if (inField) return;
          e.preventDefault();
          this.#sideways(scene, +1);
          break;
        case 'Enter':
          // Allow Enter in text inputs to submit forms naturally.
          if (inField && t.tagName === 'INPUT') return;
          e.preventDefault();
          this.#activate();
          break;
        case 'Escape':
          if (inField) return;
          if (scene.onBack) {
            e.preventDefault();
            scene.onBack();
          }
          break;
      }
    });
  }
}

const BLANK_INPUTS = Object.freeze({ up: 0, down: 0, left: 0, right: 0, select: 0, back: 0 });
