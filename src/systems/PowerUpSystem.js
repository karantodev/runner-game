/**
 * Generic power-up registry. Every power-up is one row in `gameConfig.powerUps`
 * + one row in POWER_UP_DEFS below.
 *
 * Why this shape:
 *   - SRP: this class only tracks "is power-up X active and for how long?".
 *     Anything PowerUp-specific (speed multiplier, score x2 factor, magnet
 *     pull radius) is read by the system that cares about it via this
 *     class's `isActive(type)` / config lookup.
 *   - Open/closed: adding a new power-up = one row in POWER_UP_DEFS, one
 *     gameConfig entry. No new fields, no new isXActive methods, no edits
 *     to update / snapshot / activate.
 *   - DRY: the previous version had 5 hardcoded x_Frames pairs and 5
 *     isXActive() methods that all did the same thing.
 *
 * Legacy convenience getters (isSpeedBurstActive, isMagnetActive, etc.)
 * remain as one-line aliases so call-sites that read like English keep
 * working.
 */

/**
 * Slot definitions. Each entry maps a power-up type to:
 *   - configPath:  property under gameConfig.powerUps (for duration + extras)
 *   - label:       display string emitted on activation
 *   - charges:     optional finite-use semantics (e.g. shield = 1 hit)
 */
const POWER_UP_DEFS = Object.freeze({
  'speed-burst':   { configPath: 'speedBurst',  label: 'Speed Burst'  },
  'split-clones':  { configPath: 'splitClones', label: 'Split Clones' },
  'magnet':        { configPath: 'magnet',      label: 'Magnet'       },
  'shield':        { configPath: 'shield',      label: 'Shield', chargesKey: 'hits' },
  'score-x2':      { configPath: 'scoreX2',     label: 'x2 Score'     },
});

/** Per-instance state for a single active power-up slot. */
function makeSlot() {
  return { frames: 0, charges: 0 };
}

export class PowerUpSystem {
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
    /** @type {Map<string, ReturnType<typeof makeSlot>>} */
    this.slots = new Map();
    for (const type of Object.keys(POWER_UP_DEFS)) this.slots.set(type, makeSlot());
  }

  reset() {
    for (const slot of this.slots.values()) {
      slot.frames = 0;
      slot.charges = 0;
    }
  }

  /**
   * Per-frame tick. Pipeline signature is (world, delta); world unused but
   * accepted for consistency with the other systems.
   */
  update(_world, delta) {
    const before = this.#activeMask();
    for (const slot of this.slots.values()) {
      if (slot.frames > 0) slot.frames = Math.max(0, slot.frames - delta);
      if (slot.charges > 0 && slot.frames === 0) slot.charges = 0;
    }
    if (before !== this.#activeMask()) {
      this.eventBus.emit('powerUpsChanged', this.snapshot());
    }
  }

  /**
   * Activate a power-up by type. No-op for unknown types.
   * Emits both 'powerUpActivated' (label) and 'powerup:activated' (raw type,
   * used by EffectsSystem for the activation burst).
   */
  activate(type) {
    const def = POWER_UP_DEFS[type];
    const slot = this.slots.get(type);
    if (!def || !slot) return;
    const upCfg = this.config.powerUps[def.configPath];
    if (!upCfg) return;
    slot.frames = upCfg.durationFrames;
    slot.charges = def.chargesKey ? upCfg[def.chargesKey] : 0;
    this.eventBus.emit('powerUpActivated', { type, label: def.label });
    this.eventBus.emit('powerup:activated', { type });
    this.eventBus.emit('powerUpsChanged', this.snapshot());
  }

  /** Consume one charge (only meaningful for chargesKey power-ups). */
  consumeShield() {
    const slot = this.slots.get('shield');
    if (!slot || slot.charges <= 0) return false;
    slot.charges -= 1;
    if (slot.charges <= 0) {
      slot.frames = 0;
      this.eventBus.emit('powerUpsChanged', this.snapshot());
    }
    return true;
  }

  /** Generic "is this type active right now?". */
  isActive(type) {
    const slot = this.slots.get(type);
    if (!slot || slot.frames <= 0) return false;
    const def = POWER_UP_DEFS[type];
    return def?.chargesKey ? slot.charges > 0 : true;
  }

  // ── Back-compat convenience accessors ──────────────────────────────────────
  // Existing call-sites (PlayerRenderer, EffectsRenderer, World, GameState)
  // read like English; keep them as one-liners so we don't churn 30 imports.
  isSpeedBurstActive()  { return this.isActive('speed-burst'); }
  isSplitClonesActive() { return this.isActive('split-clones'); }
  isMagnetActive()      { return this.isActive('magnet'); }
  isShieldActive()      { return this.isActive('shield'); }
  isScoreX2Active()     { return this.isActive('score-x2'); }

  speedMultiplier() {
    return this.isSpeedBurstActive() ? this.config.powerUps.speedBurst.speedMultiplier : 1;
  }

  /**
   * Bitfield of currently-active slots — cheap before/after equality check
   * for emitting `powerUpsChanged`.
   */
  #activeMask() {
    let mask = 0;
    let bit = 1;
    for (const type of Object.keys(POWER_UP_DEFS)) {
      if (this.isActive(type)) mask |= bit;
      bit <<= 1;
    }
    return mask;
  }

  /**
   * HUD-facing snapshot. Preserves the legacy speedBurstFrames /
   * splitClonesFrames / etc. keys so HudSystem keeps working without
   * a touch — generated mechanically from POWER_UP_DEFS so adding a new
   * power-up doesn't require editing this method.
   */
  snapshot() {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [type, def] of Object.entries(POWER_UP_DEFS)) {
      const slot = this.slots.get(type);
      const key = legacyKeyForType(def.configPath); // 'speedBurst' → 'speedBurst'
      out[`${key}Frames`] = Math.ceil(slot?.frames ?? 0);
      out[`${key}Active`] = this.isActive(type);
      if (def.chargesKey) out[`${key}Charges`] = slot?.charges ?? 0;
    }
    return out;
  }
}

/**
 * Snapshot key for a slot. Equal to the configPath (e.g. 'speedBurst' →
 * 'speedBurstFrames', 'speedBurstActive'). Exists as a separate function
 * so a future change of naming convention only touches one place.
 */
function legacyKeyForType(configPath) {
  return configPath;
}
