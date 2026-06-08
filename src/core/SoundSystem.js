/**
 * Audio routing. Event-driven, drop-in for designer audio delivery.
 *
 * Architecture:
 *   - Each gameplay event maps to ONE logical sound ID (`SOUND_MAP`).
 *   - Each sound ID has a config entry: file URL, polyphony, gain, pitch jitter.
 *   - The system silently no-ops when:
 *       * SFX is disabled in settings
 *       * The audio file isn't shipped yet (designer-pending)
 *       * The browser blocks autoplay (resumed after first user gesture)
 *
 * Why a separate class:
 *   - SRP: nothing else in the codebase needs to know about audio.
 *     Systems emit events; SoundSystem decides what to play.
 *   - Adds zero coupling to existing event producers.
 *   - When designer ships .ogg files, drop them into `assets/audio/` and
 *     enable a flag — no other code changes needed.
 *
 * Web Audio limitations:
 *   - Browsers require a user gesture before audio can play. We attach
 *     a one-shot listener that resumes the AudioContext on first click/key.
 *   - HTMLAudioElement is used for simplicity; a future upgrade to
 *     AudioBufferSourceNode could give per-instance pitch jitter.
 */

import { stringToSeed } from '../utils/rng.js';

/**
 * SFX whose audio files are not in `assets/audio/sfx/` yet (designer-pending).
 * Pre-seeded into `deadSounds` at construction so play() skips them WITHOUT
 * issuing a request: a missing-file request 404s in the console even from a
 * caught fetch, so the only way to keep the console clean is to never request
 * a file we know is absent. Remove an ID the moment its .ogg/.mp3 ships and the
 * sound goes live (a later regression to missing self-heals via the dead-set).
 */
const PENDING_SFX = new Set([
  'rare_collect', 'powerup_pickup', 'powerup_activate', 'hazard_cleared',
  'near_miss', 'shield_absorb', 'lane_switch', 'combo_mega', 'milestone',
  'speed_tier', 'death', 'menu_hover', 'menu_select', 'menu_back',
  'countdown_tick', 'countdown_go',
]);

/**
 * Logical sound IDs. Each gameplay event maps to one of these.
 * Adding a sound = one row here + one row in SOUND_LIBRARY.
 */
const SOUNDS = Object.freeze({
  ORCHID_COLLECT: 'orchid_collect',
  RARE_COLLECT:   'rare_collect',
  LIFE_GAIN:      'life_gain',
  POWERUP_PICKUP: 'powerup_pickup',
  POWERUP_ACTIVATE: 'powerup_activate',
  JUMP:           'jump',
  LAND:           'land',
  CROUCH:         'crouch',
  HAZARD_CLEARED: 'hazard_cleared',
  HAZARD_HIT:     'hazard_hit',
  NEAR_MISS:      'near_miss',
  SHIELD_ABSORB:  'shield_absorb',
  LANE_SWITCH:    'lane_switch',
  COMBO_UP:       'combo_up',
  COMBO_MEGA:     'combo_mega',
  MILESTONE:      'milestone',
  SPEED_TIER:     'speed_tier',
  DEATH:          'death',
  MENU_HOVER:     'menu_hover',
  MENU_SELECT:    'menu_select',
  MENU_BACK:      'menu_back',
  COUNTDOWN_TICK: 'countdown_tick',
  COUNTDOWN_GO:   'countdown_go',
});

/**
 * Per-sound config. `url` is the (eventually-shipped) file path; the
 * loader tolerates missing files silently. `poly` limits how many
 * instances can play at once (cheap orchid sparkles can stack; heavy
 * powerup-activate should not).
 */
const SOUND_LIBRARY = Object.freeze({
  [SOUNDS.ORCHID_COLLECT]:   { url: './assets/audio/sfx/orchid_collect.ogg', poly: 6, gain: 0.55, pitchJitter: 0.08, debounceMs: 40 },
  [SOUNDS.RARE_COLLECT]:     { url: './assets/audio/sfx/rare_collect.ogg',   poly: 2, gain: 0.75 },
  [SOUNDS.LIFE_GAIN]:        { url: './assets/audio/sfx/life_gain.ogg',      poly: 1, gain: 0.65 },
  [SOUNDS.POWERUP_PICKUP]:   { url: './assets/audio/sfx/powerup_pickup.ogg', poly: 2, gain: 0.6 },
  [SOUNDS.POWERUP_ACTIVATE]: { url: './assets/audio/sfx/powerup_activate.ogg', poly: 1, gain: 0.8 },
  [SOUNDS.JUMP]:             { url: './assets/audio/sfx/jump.ogg',           poly: 2, gain: 0.45, pitchJitter: 0.06 },
  [SOUNDS.LAND]:             { url: './assets/audio/sfx/land.ogg',           poly: 2, gain: 0.5 },
  [SOUNDS.CROUCH]:           { url: './assets/audio/sfx/crouch.ogg',         poly: 2, gain: 0.4 },
  [SOUNDS.HAZARD_CLEARED]:   { url: './assets/audio/sfx/hazard_cleared.ogg', poly: 2, gain: 0.55 },
  [SOUNDS.HAZARD_HIT]:       { url: './assets/audio/sfx/hazard_hit.ogg',     poly: 1, gain: 0.85 },
  [SOUNDS.NEAR_MISS]:        { url: './assets/audio/sfx/near_miss.ogg',      poly: 1, gain: 0.7 },
  [SOUNDS.SHIELD_ABSORB]:    { url: './assets/audio/sfx/shield_absorb.ogg',  poly: 1, gain: 0.75 },
  [SOUNDS.LANE_SWITCH]:      { url: './assets/audio/sfx/lane_switch.ogg',    poly: 3, gain: 0.35 },
  [SOUNDS.COMBO_UP]:         { url: './assets/audio/sfx/combo_up.ogg',       poly: 1, gain: 0.6 },
  [SOUNDS.COMBO_MEGA]:       { url: './assets/audio/sfx/combo_mega.ogg',     poly: 1, gain: 0.8 },
  [SOUNDS.MILESTONE]:        { url: './assets/audio/sfx/milestone.ogg',      poly: 1, gain: 0.75 },
  [SOUNDS.SPEED_TIER]:       { url: './assets/audio/sfx/speed_tier.ogg',     poly: 1, gain: 0.6 },
  [SOUNDS.DEATH]:            { url: './assets/audio/sfx/death.ogg',          poly: 1, gain: 0.9 },
  [SOUNDS.MENU_HOVER]:       { url: './assets/audio/sfx/menu_hover.ogg',     poly: 2, gain: 0.3 },
  [SOUNDS.MENU_SELECT]:      { url: './assets/audio/sfx/menu_select.ogg',    poly: 2, gain: 0.45 },
  [SOUNDS.MENU_BACK]:        { url: './assets/audio/sfx/menu_back.ogg',      poly: 2, gain: 0.4 },
  [SOUNDS.COUNTDOWN_TICK]:   { url: './assets/audio/sfx/countdown_tick.ogg', poly: 1, gain: 0.6 },
  [SOUNDS.COUNTDOWN_GO]:     { url: './assets/audio/sfx/countdown_go.ogg',   poly: 1, gain: 0.75 },
});

/**
 * Event → sound mapping. Single source of truth; SoundSystem walks this
 * map at construction to subscribe each entry.
 */
const SOUND_MAP = Object.freeze({
  'flower:collected':  SOUNDS.ORCHID_COLLECT,
  'rare:collected':    SOUNDS.RARE_COLLECT,
  'life:collected':    SOUNDS.LIFE_GAIN,
  'power:collected':   SOUNDS.POWERUP_PICKUP,
  'powerup:activated': SOUNDS.POWERUP_ACTIVATE,
  'player:jumped':     SOUNDS.JUMP,
  'player:landed':     SOUNDS.LAND,
  'hazard:cleared':    SOUNDS.HAZARD_CLEARED,
  'hazard:hit':        SOUNDS.HAZARD_HIT,
  'hazard:nearMiss':   SOUNDS.NEAR_MISS,
  'shield:absorbed':   SOUNDS.SHIELD_ABSORB,
  'player:laneSwitch': SOUNDS.LANE_SWITCH,
  'player:crouch':     SOUNDS.CROUCH,
});

export class SoundSystem {
  /**
   * @param {{
   *   eventBus: import('./EventBus.js').EventBus,
   *   settings?: import('./SettingsMenu.js').SettingsMenu,
   *   masterVolume?: number,
   * }} opts
   */
  constructor({ eventBus, settings, masterVolume = 0.85 }) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.masterVolume = masterVolume;
    /** @type {Map<string, HTMLAudioElement[]>} per-id polyphony pool */
    this.pools = new Map();
    /**
     * Sound IDs whose first load attempt 404'd or otherwise failed.
     * Future play() calls for these IDs short-circuit silently — no more
     * spam in the console while designer audio is in flight.
     */
    this.deadSounds = new Set();
    this.enabled = true;
    this.unlocked = false;
    /** Per-sound last-played timestamp (ms) for the audio-only debounce. */
    this._lastPlay = new Map();
    /** File extension the browser can decode (.ogg, else .mp3). Detected once. */
    this.ext = this.#detectExt();
    // Designer-pending sounds have no file yet — mark them dead up front so
    // play() never requests them (a missing-file request 404s in the console).
    for (const soundId of PENDING_SFX) this.deadSounds.add(soundId);
    this.#wire();
    this.#armAutoplayUnlock();
  }

  /** Toggle from SettingsMenu — disables every future playback. */
  setEnabled(value) {
    this.enabled = !!value;
  }

  /**
   * Fire a sound by logical ID. Public API for code that wants to play
   * a sound NOT tied to an EventBus event (e.g. menu hover, countdown).
   */
  play(soundId, opts = {}) {
    if (!this.enabled) return;
    if (this.deadSounds.has(soundId)) return;
    if (this.settings && this.settings.getSettings().sfx === false) return;
    const cfg = SOUND_LIBRARY[soundId];
    if (!cfg) return;
    // Audio-only debounce (e.g. orchid pickup): collapse rapid repeats so dense
    // collectible trails don't machine-gun the same clip. Draws no RNG and
    // mutates no gameplay/scoring state — purely a playback gate.
    if (cfg.debounceMs) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - (this._lastPlay.get(soundId) ?? -Infinity) < cfg.debounceMs) return;
      this._lastPlay.set(soundId, now);
    }
    const audio = this.#acquire(soundId, cfg);
    if (!audio) return;
    audio.volume = Math.min(1, (opts.gain ?? cfg.gain) * this.masterVolume);
    if (cfg.pitchJitter && audio.playbackRate !== undefined) {
      audio.playbackRate = 1 + (Math.random() - 0.5) * 2 * cfg.pitchJitter;
    }
    try {
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => { /* autoplay block — silently ignore */ });
    } catch {
      // Some browsers throw synchronously when autoplay is blocked
      // before the first user gesture. Already armed below.
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  #wire() {
    for (const [eventName, soundId] of Object.entries(SOUND_MAP)) {
      this.eventBus.on(eventName, () => this.play(soundId));
    }
    // Combo crossings: big sound at ×5+, smaller at every tier.
    this.eventBus.on('comboChanged', (snap) => {
      if (snap?.reason !== 'bump' || snap.multiplier <= 1) return;
      this.play(snap.multiplier >= 5 ? SOUNDS.COMBO_MEGA : SOUNDS.COMBO_UP);
    });
    this.eventBus.on('milestone:reached', () => this.play(SOUNDS.MILESTONE));
    this.eventBus.on('speed:tierUp', () => this.play(SOUNDS.SPEED_TIER));
    this.eventBus.on('countdown:tick', () => this.play(SOUNDS.COUNTDOWN_TICK));
    this.eventBus.on('countdown:go', () => this.play(SOUNDS.COUNTDOWN_GO));
    this.eventBus.on('run:ended', () => this.play(SOUNDS.DEATH));
  }

  /**
   * Pick the audio extension the browser can actually decode, once. Chrome /
   * Firefox decode Ogg Vorbis; Safari / iOS need MP3. SOUND_LIBRARY keeps .ogg
   * URLs and #acquire swaps the extension when ogg isn't supported. Audio-only.
   */
  #detectExt() {
    try {
      const ogg = new Audio().canPlayType('audio/ogg; codecs="vorbis"');
      return ogg === 'probably' || ogg === 'maybe' ? '.ogg' : '.mp3';
    } catch {
      return '.ogg';
    }
  }

  /**
   * Lazy-init per-sound pool of HTMLAudioElements. First call constructs
   * `poly` clones; subsequent calls find the first idle one (currentTime
   * at end / paused). Silently returns null if pool full and all playing.
   */
  #acquire(soundId, cfg) {
    let pool = this.pools.get(soundId);
    if (!pool) {
      pool = [];
      for (let i = 0; i < cfg.poly; i += 1) {
        try {
          const audio = new Audio();
          // v3.7.3: preload=none so the browser doesn't fetch the file
          // until we actually play it. Combined with the dead-soundId set
          // below, this kills the 404 spam from designer-pending audio.
          audio.preload = 'none';
          audio.src = cfg.url.replace(/\.ogg$/, this.ext);
          // First error on ANY clip in the pool marks the whole sound as
          // dead — no point keeping the others around.
          audio.addEventListener('error', () => {
            this.deadSounds.add(soundId);
            this.pools.delete(soundId);
          }, { once: true });
          pool.push(audio);
        } catch { /* Audio constructor unavailable */ }
      }
      this.pools.set(soundId, pool);
    }
    if (!pool.length) return null;
    // Reuse the first idle clip — paused or ended; otherwise round-robin.
    for (const audio of pool) {
      if (audio.paused || audio.ended) return audio;
    }
    // All busy — use seeded index for determinism in tests.
    const idx = stringToSeed(soundId) % pool.length;
    return pool[idx];
  }

  /**
   * Browsers block audio until the first user gesture. We listen for
   * pointerdown / keydown once, then mark the system unlocked. The first
   * sound played BEFORE the gesture is dropped silently; everything after
   * works normally.
   */
  #armAutoplayUnlock() {
    const unlock = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
  }
}

/** Re-export so other modules can play sounds by symbolic name. */
export { SOUNDS };
