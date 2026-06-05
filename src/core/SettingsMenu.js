/**
 * Settings overlay. Owns the modal DOM + persists toggle state to
 * localStorage. Other systems consult `getSettings()` for live values.
 *
 * Shape:
 *   {
 *     sfx: boolean,         // toggle, stubbed until audio lands
 *     music: boolean,       // same
 *     cameraShake: boolean, // mirrors world.config.gameFeel.cameraShake
 *     particles: boolean,   // mirrors world.config.gameFeel.particles
 *     qualityLock: 0|1|2|3|null,  // null = auto-scale
 *     blockStyle: 'sprite'|'voxel' // 2D sprite blocks or 3D voxel blocks
 *   }
 *
 * Dependencies passed in:
 *   - world  → mutates gameFeel for camera shake / particles
 *   - renderer → switches structural block rendering
 *   - adaptiveQuality → locks/unlocks quality tier
 *   - playerStats / leaderboard → reset buttons
 *   - tutorial → reset-stats also re-arms the tutorial (re-onboard)
 */
import { setLang, getLang, availableLangs } from './i18n.js';

const DEFAULT_SETTINGS = Object.freeze({
  sfx: true,
  music: true,
  cameraShake: true,
  particles: true,
  qualityLock: null,
  blockStyle: 'sprite',
});

export class SettingsMenu {
  constructor({
    storageKey,
    world,
    renderer,
    adaptiveQuality,
    playerStats,
    leaderboard,
    tutorial,
    achievements,
    sound,
    defaultBlockStyle,
  }) {
    this.storageKey = storageKey;
    this.world = world;
    this.renderer = renderer ?? null;
    this.adaptiveQuality = adaptiveQuality;
    this.playerStats = playerStats;
    this.leaderboard = leaderboard;
    this.tutorial = tutorial;
    this.achievements = achievements;
    this.sound = sound ?? null;
    this.defaultBlockStyle = normalizeBlockStyle(defaultBlockStyle, DEFAULT_SETTINGS.blockStyle);
    this.blockStyleButtons = [];
    this.settings = this.#load();
    this.modalEl = null;
    this.#applyToWorld();
  }

  getSettings() { return { ...this.settings }; }

  setBlockStyle(style) {
    const next = normalizeBlockStyle(style, this.settings.blockStyle);
    this.#update('blockStyle', next);
    return this.settings.blockStyle;
  }

  toggleBlockStyle() {
    return this.setBlockStyle(this.settings.blockStyle === 'voxel' ? 'sprite' : 'voxel');
  }

  /** Attach DOM listeners to the #settings-modal markup. Idempotent. */
  bind() {
    this.modalEl = document.getElementById('settings-modal');
    if (!this.modalEl) return;

    bindCheckbox('settings-sfx',       this.settings.sfx,       (v) => this.#update('sfx', v));
    bindCheckbox('settings-music',     this.settings.music,     (v) => this.#update('music', v));
    bindCheckbox('settings-motion',    this.settings.cameraShake, (v) => this.#update('cameraShake', v));
    bindCheckbox('settings-particles', this.settings.particles, (v) => this.#update('particles', v));
    bindSelect('settings-quality',
      this.settings.qualityLock === null ? 'auto' : String(this.settings.qualityLock),
      (v) => this.#update('qualityLock', v === 'auto' ? null : Number(v)));
    bindSegmentedButtons('settings-block-style', this.settings.blockStyle, (v) => this.setBlockStyle(v));
    this.blockStyleButtons = Array.from(document.querySelectorAll('#settings-block-style [data-block-style]'));
    this.#syncBlockStyleControls();

    // v3.5 language dropdown. Populated dynamically so adding a language
    // in i18n.js doesn't require touching index.html.
    const langSel = document.getElementById('settings-lang');
    if (langSel) {
      langSel.innerHTML = availableLangs().map(
        (l) => `<option value="${l}">${l.toUpperCase()}</option>`,
      ).join('');
      langSel.value = getLang();
      langSel.addEventListener('change', (e) => setLang(e.target.value));
    }

    bindClick('settings-reset-stats', () => {
      if (!confirm('Reset all lifetime stats? This cannot be undone.')) return;
      this.playerStats?.clear();
      this.tutorial?.clearSeen();
      this.achievements?.clear();
    });
    bindClick('settings-reset-leaderboard', () => {
      if (!confirm('Reset the leaderboard?')) return;
      this.leaderboard?.clear();
    });
    bindClick('settings-close', () => this.hide());

    // Opening triggers (menu button + pause-menu button if present).
    bindClick('settings-button', () => this.show());

    // Backdrop click (anywhere outside .settings-card) → close.
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    // ESC anywhere on the document → close (when open). Filters out
    // typing in inputs / textareas / contenteditable so a future name-
    // entry field elsewhere doesn't accidentally dismiss.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.modalEl.classList.contains('on')) return;
      const target = e.target;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      this.hide();
      // Prevent the ESC from also triggering the global pause toggle.
      e.stopPropagation();
    });
  }

  show() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('on');
    this.modalEl.setAttribute('aria-hidden', 'false');
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('on');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  #update(key, value) {
    this.settings[key] = value;
    this.#persist();
    this.#applyToWorld();
    if (key === 'blockStyle') {
      this.#syncBlockStyleControls();
      window.dispatchEvent(new CustomEvent('orchid:blockStyleChanged', {
        detail: { blockStyle: this.settings.blockStyle },
      }));
    }
  }

  /** Push toggle state to the systems that actually care. */
  #applyToWorld() {
    if (this.world?.config?.gameFeel) {
      this.world.config.gameFeel.cameraShake = !!this.settings.cameraShake;
      this.world.config.gameFeel.particles   = !!this.settings.particles;
    }
    if (this.adaptiveQuality) {
      this.adaptiveQuality.setLocked(this.settings.qualityLock, this.world);
    }
    if (this.sound) {
      this.sound.setEnabled(!!this.settings.sfx);
    }
    if (this.renderer && this.renderer.blockStyle !== this.settings.blockStyle) {
      this.settings.blockStyle = this.renderer.setBlockStyle(this.settings.blockStyle);
    }
  }

  #load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return { ...DEFAULT_SETTINGS, blockStyle: this.defaultBlockStyle };
      const parsed = JSON.parse(raw);
      return {
        sfx: !!(parsed?.sfx ?? DEFAULT_SETTINGS.sfx),
        music: !!(parsed?.music ?? DEFAULT_SETTINGS.music),
        cameraShake: parsed?.cameraShake === undefined ? DEFAULT_SETTINGS.cameraShake : !!parsed.cameraShake,
        particles: parsed?.particles === undefined ? DEFAULT_SETTINGS.particles : !!parsed.particles,
        qualityLock: validQualityLock(parsed?.qualityLock),
        blockStyle: normalizeBlockStyle(parsed?.blockStyle, this.defaultBlockStyle),
      };
    } catch { return { ...DEFAULT_SETTINGS, blockStyle: this.defaultBlockStyle }; }
  }

  #persist() {
    try { window.localStorage.setItem(this.storageKey, JSON.stringify(this.settings)); }
    catch { /* unavailable — degrade to session-only */ }
  }

  #syncBlockStyleControls() {
    for (const button of this.blockStyleButtons) {
      const active = normalizeBlockStyle(button.dataset.blockStyle, DEFAULT_SETTINGS.blockStyle) === this.settings.blockStyle;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }
}

function validQualityLock(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 3 ? Math.floor(n) : null;
}

function bindCheckbox(id, initial, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = !!initial;
  el.addEventListener('change', (e) => onChange(e.target.checked));
}

function bindSelect(id, initial, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = initial;
  el.addEventListener('change', (e) => onChange(e.target.value));
}

function bindSegmentedButtons(id, initial, onChange) {
  const root = document.getElementById(id);
  if (!root) return;
  const current = normalizeBlockStyle(initial, DEFAULT_SETTINGS.blockStyle);
  for (const button of root.querySelectorAll('[data-block-style]')) {
    button.classList.toggle(
      'is-active',
      normalizeBlockStyle(button.dataset.blockStyle, DEFAULT_SETTINGS.blockStyle) === current,
    );
    button.addEventListener('click', () => onChange(button.dataset.blockStyle));
  }
}

function bindClick(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', fn);
}

function normalizeBlockStyle(value, fallback = DEFAULT_SETTINGS.blockStyle) {
  if (value === 'voxel' || value === '3d') return 'voxel';
  if (value === 'sprite' || value === '2d') return 'sprite';
  return fallback === 'voxel' ? 'voxel' : 'sprite';
}
