/**
 * Event-driven side-effects: spawns particles + score popups + camera
 * shake + FOV punches in response to gameplay events.
 *
 * Data-driven: each visual effect is one row in the BURSTS / POPUPS tables.
 * Handler methods only translate gameplay context (lane / kind) into a
 * burst-preset name + override coordinates.
 *
 * Subscribed events:
 *   - flower:collected   { lane, high }
 *   - rare:collected     { lane, high }
 *   - life:collected     { lane, high }
 *   - power:collected    { type, lane, high }
 *   - hazard:hit         { type, laneX }
 *   - hazard:cleared     { kind }
 *   - hazard:nearMiss    { kind, type, laneX }
 *   - shield:absorbed    null
 *   - player:landed      { laneX }
 *   - player:jumped      null
 *   - player:laneSwitch  { direction, laneX }
 *   - powerup:activated  { type }
 *   - camera:shake       amount
 */

/**
 * Each burst spec describes ONE particle burst. Tuples are inclusive
 * ranges sampled with Math.random(). Sprite block is optional.
 *
 *   count      number of particles in the burst
 *   vx, vy     Math.abs() of the velocity range
 *                (vx is two-sided around 0, vy is one-sided upward — same
 *                 semantics as the legacy spawn calls)
 *   life       [min, max] life frames
 *   radius     [min, max] procedural circle radius
 *   color      CSS colour string for the fallback procedural arc
 *   gravity    optional override (default 0.25 from ParticleSystem)
 *   sprite     optional { key, frames, size: [min, max] }
 *   spread     optional { x: [min,max], y: [min,max] } — extra positional
 *              jitter added to (cx, baseY) per particle
 *   vyOffset   optional flat downward addition to vy after randomisation
 *              (used by lane-swoosh's direction-driven kick)
 */
const BURSTS = Object.freeze({
  // v4.1 — P0 reference-match: cut count ~42%, shorten life, reduce radius
  // and sprite size so the collect pop reads as a crisp accent, not a cloud.
  flowerCollect: {
    count: 7, vx: 5.5, vy: 4, life: [16, 24], radius: [1.5, 3.2],
    color: 'rgba(255,210,60,0.95)',
    sprite: { key: 'sparkle', frames: 4, size: [13, 19] },
  },
  // v4.1 — P0 reference-match: rare orchid stays celebratory but trimmed
  // ~27% on count and ~15% on life/size so it doesn't bury subsequent pickups.
  rareCollect: {
    count: 16, vx: 7, vy: 5, life: [24, 36], radius: [2, 4.2],
    color: 'rgba(90,184,255,0.95)',
    sprite: { key: 'sparkle', frames: 4, size: [20, 28] },
  },
  lifeCollect: {
    count: 18, vx: 7, vy: 5, life: [22, 32], radius: [2, 5.2],
    color: 'rgba(255,70,95,0.95)',
  },
  powerCollect: {
    count: 18, vx: 7, vy: 5, life: [22, 32], radius: [2, 5.2],
    color: 'rgba(100,255,120,0.95)',
  },
  hazardCleared: {
    count: 8, vx: 3, vy: 3, life: [20, 20], radius: [2, 4],
    color: 'rgba(255,230,120,0.90)',
    sprite: { key: 'sparkle', frames: 4, size: [16, 16] },
    spread: { x: [-30, 30], y: [0, 0] },
  },
  hazardHit: {
    count: 20, vx: 10, vy: 6, life: [30, 30], radius: [3, 6],
    color: 'rgba(255,80,80,0.90)', vyOffset: -2,
  },
  nearMiss: {
    count: 12, vx: 4, vy: 3, life: [26, 26], radius: [2, 4.5],
    color: 'rgba(255,222,140,0.95)',
    sprite: { key: 'sparkle', frames: 4, size: [22, 32] },
    spread: { x: [-45, 45], y: [-20, 20] },
  },
  shieldAbsorbed: {
    count: 18, vx: 7, vy: 7, life: [28, 28], radius: [2, 4],
    color: 'rgba(140,220,255,0.90)', vyOffset: -1, radial: true,
  },
  playerJumped: {
    count: 10, vx: 6, vy: 3, life: [24, 24], radius: [3, 6],
    color: 'rgba(200,170,120,0.8)',
    sprite: { key: 'jumpDust', frames: 4, size: [36, 48] },
  },
  playerLanded: {
    count: 10, vx: 4, vy: 2, life: [18, 18], radius: [2, 4],
    color: 'rgba(200,170,120,0.7)',
    sprite: { key: 'jumpDust', frames: 4, size: [28, 38] },
    spread: { x: [-15, 15], y: [0, 0] },
  },
  laneSwoosh: {
    count: 6, vx: 0, vy: 1.6, life: [16, 16], radius: [2, 4],
    color: 'rgba(200,170,120,0.78)', gravity: 0.32, vyOffset: -0.4,
    sprite: { key: 'dustPuff', frames: 4, size: [22, 28] },
  },
  powerActivated: {
    count: 24, vx: 5, vy: 5, life: [32, 32], radius: [2, 5],
    color: 'rgba(170,90,255,0.95)', vyOffset: -1,
    spread: { x: [-40, 40], y: [-30, 30] },
  },
});

/** Score-popup presets — same DRY approach as bursts. */
const POPUPS = Object.freeze({
  flower:   { text: '+1',    color: '#ffe36a' },
  rare:     { text: '+RARE', color: '#5ab8ff' },
  life:     { text: '+LIFE', color: '#ff6b83' },
  power:    { text: 'POWER', color: '#a7ff7e' },
  nearMiss: { text: 'NEAR MISS', color: '#ffd54a' },
});

/** Power-up type → activation-burst colour override. */
const POWER_ACTIVATION_COLOR = Object.freeze({
  'speed-burst': 'rgba(90,255,100,0.95)',
  'split-clones': 'rgba(170,90,255,0.95)',
  'magnet':      'rgba(255,122,214,0.95)',
  'shield':      'rgba(140,220,255,0.95)',
  'score-x2':    'rgba(255,213,74,0.95)',
});

/** Power-up type → on-screen label + popup colour for the activation toast. */
const POWER_LABELS = Object.freeze({
  'speed-burst': { text: 'SPEED BURST', color: '#74ff66' },
  'split-clones': { text: 'SPLIT CLONES', color: '#b890ff' },
  'magnet':      { text: 'MAGNET', color: '#ff7ad6' },
  'shield':      { text: 'SHIELD', color: '#8cdcff' },
  'score-x2':    { text: '×2 SCORE', color: '#ffd54a' },
});

// v4.7 — power-up activation keeps a focal punch (rare, deliberate, tied to
// an explicit player action), softened 14→5 so even it doesn't lurch the far
// side scenery hard. The FREQUENT running-time punches (milestone / speed-tier
// / near-miss) were removed — with focal=58 they rescaled the side trees on
// every event and read as a periodic "acceleration" stutter while running.
const PLAYER_FOCAL_PUNCH = 5;

export class EffectsSystem {
  constructor(config, eventBus, projection) {
    this.config = config;
    this.projection = projection;
    this.eventBus = eventBus;
    /** @type {import('../world/World.js').World | null} */
    this.world = null;
    eventBus.on('flower:collected', (p) => this.#onCollect(p, 'flower'));
    eventBus.on('rare:collected',   (p) => this.#onCollect(p, 'rare'));
    eventBus.on('life:collected',   (p) => this.#onCollect(p, 'life'));
    eventBus.on('power:collected',  (p) => this.#onCollect(p, 'power'));
    eventBus.on('hazard:cleared',   () => this.#burstAtPlayer('hazardCleared', { yOffset: -50 }));
    eventBus.on('hazard:hit',       ({ laneX }) => this.#burstAt('hazardHit', laneX, { yOffset: -80 }));
    eventBus.on('hazard:nearMiss',  (p) => this.#onNearMiss(p));
    eventBus.on('shield:absorbed',  () => this.#onShieldAbsorbed());
    eventBus.on('player:jumped',    () => this.#burstAtPlayer('playerJumped', { yOffset: 4 }));
    eventBus.on('player:landed',    (p) => this.#onPlayerLanded(p));
    eventBus.on('player:laneSwitch',(p) => this.#onLaneSwitch(p));
    eventBus.on('powerup:activated',(p) => this.#onPowerUpActivated(p));
    eventBus.on('milestone:reached',(p) => this.#onMilestone(p));
    eventBus.on('speed:tierUp',     (p) => this.#onSpeedTier(p));
    eventBus.on('camera:shake',     (amount) => this.#shake(amount));
  }

  /** Wire `world` after construction so handlers see live state. */
  attach(world) { this.world = world; }

  // ── Handlers ───────────────────────────────────────────────────────────────

  #onCollect({ lane, high }, kind) {
    const w = this.world;
    if (!w) return;
    const burstName = `${kind}Collect`;
    this.#burstAtLane(burstName, lane, { yOffset: high ? -100 : -52 });
    this.#popupAtLane(POPUPS[kind], lane, high);
  }

  #onPlayerLanded({ laneX }) {
    this.#shake(2.6);
    this.#burstAt('playerLanded', laneX, { yOffset: 0 });
  }

  #onLaneSwitch({ direction, laneX }) {
    // Skid puff at the player's feet, kicked OPPOSITE to the lane move
    // (Newton's third law for the eyes). vx is direction-dependent so we
    // pass it through the override hook rather than another preset row.
    this.#burstAt('laneSwoosh', laneX, {
      yOffset: -4,
      vxBuilder: (rng) => -direction * (1.6 + rng() * 2.4),
    });
  }

  #onNearMiss({ laneX, kind }) {
    const w = this.world;
    if (!w) return;
    const cfg = w.config.gameplay.nearMiss;
    this.#shake(cfg.shakeAmount);
    // v4.7 — no FOV punch here: focalImpulse rescaled the far side scenery
    // (trees lurched closer then settled) and read as a stutter while running.
    this.#popupAtLane({ ...POPUPS.nearMiss, text: `NEAR MISS +${cfg.bonusScore}` }, laneX, kind === 'jump');
    this.#burstAt('nearMiss', laneX, { yOffset: -70 });
  }

  #onShieldAbsorbed() {
    this.#shake(3.5);
    this.#burstAtPlayer('shieldAbsorbed', { yOffset: -90 });
  }

  /**
   * v3.4 speed-tier crossing — focal punch + side-edge particles so
   * the player feels the world lurch forward.
   */
  #onSpeedTier({ tier }) {
    const w = this.world;
    if (!w) return;
    this.#shake(2.6);
    // v4.7 — FOV punch removed (see #onNearMiss): it lurched the side trees.
    const laneX = w.player?.components.LaneState.laneX ?? 0;
    this.#popupAtLane({ text: `SPEED +${tier}`, color: '#a7ff7e' }, laneX, true);
  }

  /**
   * v3.4: score milestone (50/100/250/500/...) — fire-and-forget juice:
   *   - camera punch
   *   - radial sparkle burst at the player's position
   *   - center popup "MILESTONE • <N>"
   */
  #onMilestone({ score }) {
    const w = this.world;
    if (!w) return;
    this.#shake(4.0);
    // v4.7 — FOV punch removed (see #onNearMiss): the milestone fires often
    // (every 50/100/250/500/... score) so this was the main periodic lurch.
    const laneX = w.player?.components.LaneState.laneX ?? 0;
    this.#burstAt('nearMiss', laneX, { yOffset: -90 });
    this.#popupAtLane({ text: `MILESTONE +${score}`, color: '#ffd54a' }, laneX, true);
    // Tell EffectsRenderer to flash the combo-pulse style overlay one
    // beat — reuse the existing system so we don't carry two pulse fields.
    this.eventBus.emit('effects:milestoneFlash');
  }

  #onPowerUpActivated({ type }) {
    this.#shake(3.5);
    this.projection.focalImpulse = PLAYER_FOCAL_PUNCH;
    this.#burstAtPlayer('powerActivated', {
      yOffset: -100,
      color: POWER_ACTIVATION_COLOR[type],
    });
    // v3.4: floating name label so the player knows WHICH power-up just
    // activated. Reads above the burst at the player's lane.
    const label = POWER_LABELS[type];
    const w = this.world;
    if (label && w?.player) {
      const laneX = w.player.components.LaneState.laneX;
      this.#popupAtLane(label, laneX, true);
    }
  }

  // ── Burst / popup primitives ───────────────────────────────────────────────

  #shake(amount) {
    const w = this.world;
    if (!w || !w.config.gameFeel.cameraShake) return;
    w.cameraShake = Math.max(w.cameraShake, amount);
    w.cameraImpulseTime = 0;
  }

  /** Burst centred at the player's current lane (laneX). */
  #burstAtPlayer(burstName, opts = {}) {
    const w = this.world;
    if (!w || !w.player) return;
    this.#burstAt(burstName, w.player.components.LaneState.laneX, opts);
  }

  /** Burst centred at an explicit lane (integer lane). */
  #burstAtLane(burstName, lane, opts = {}) {
    this.#burstAt(burstName, lane, opts);
  }

  /**
   * Resolve a burst preset, project lane → screen-x, then spawn N particles
   * via #spawnBurst. opts allows per-call overrides (yOffset, colour,
   * directional vx via vxBuilder).
   */
  #burstAt(burstName, lane, opts = {}) {
    const w = this.world;
    if (!w || !w.config.gameFeel.particles) return;
    const preset = BURSTS[burstName];
    if (!preset) return;
    const cx = this.projection.width / 2 + lane * this.projection.visualLaneWidth;
    const baseY = this.projection.groundY + (opts.yOffset ?? 0);
    this.#spawnBurst(preset, cx, baseY, opts);
  }

  /**
   * The single place that touches ParticleSystem.spawn. Builds N particles
   * by sampling the preset ranges and applying caller overrides.
   */
  #spawnBurst(preset, cx, baseY, opts) {
    const w = this.world;
    const color = opts.color ?? preset.color;
    const spriteKey = preset.sprite?.key ?? null;
    const spriteFrames = preset.sprite?.frames ?? 0;
    const spread = preset.spread ?? null;
    for (let i = 0; i < preset.count; i += 1) {
      let vx;
      if (typeof opts.vxBuilder === 'function') {
        vx = opts.vxBuilder(Math.random);
      } else if (preset.radial) {
        vx = Math.cos(i * 0.55) * (3 + Math.random() * 4);
      } else {
        vx = (Math.random() - 0.5) * preset.vx;
      }
      let vy;
      if (preset.radial) {
        vy = Math.sin(i * 0.55) * (3 + Math.random() * 4) + (preset.vyOffset ?? 0);
      } else {
        vy = -Math.random() * preset.vy + (preset.vyOffset ?? -1);
      }
      const x = spread ? cx + range(spread.x) : cx;
      const y = spread ? baseY + range(spread.y) : baseY;
      const life = range(preset.life);
      const radius = range(preset.radius);
      const spriteSize = preset.sprite ? range(preset.sprite.size) : 0;
      w.particleSystem.spawn({
        x, y, vx, vy, life, radius, color,
        gravity: preset.gravity ?? 0.25,
        spriteKey, spriteFrames, spriteSize,
      });
    }
  }

  /** Drive ScorePopupSystem from a preset (text + colour) and a lane. */
  #popupAtLane(preset, lane, high) {
    const w = this.world;
    if (!w || !w.config.gameFeel.scorePopups || !preset) return;
    const p = this.projection.projectVisual(lane, 0);
    w.popupSystem.spawn({
      x: p.sx,
      y: p.sy - (high ? 116 : 78),
      vy: high ? 1.8 : 1.4,
      text: preset.text,
      color: preset.color,
      scale: 0.78,
      life: 34,
    });
  }
}

/** Sample uniformly from an inclusive [min, max] tuple. */
function range([min, max]) {
  return min + Math.random() * (max - min);
}
