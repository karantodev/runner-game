import { clamp } from '../utils/math.js';
import { Rng } from '../utils/rng.js';
import { ObjectPool } from '../utils/pool.js';
import { PlacementValidator } from './PlacementValidator.js';
import { EntityRegistry } from '../ecs/EntityRegistry.js';
import { createPlayer } from '../ecs/factories.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PlayerInputSystem } from '../systems/PlayerInputSystem.js';
import { PlayerPhysicsSystem } from '../systems/PlayerPhysicsSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { ScorePopupSystem } from '../systems/ScorePopupSystem.js';
import { CleanupSystem } from '../systems/CleanupSystem.js';
import { GameStateSystem } from '../systems/GameStateSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { DecorationSystem } from '../systems/DecorationSystem.js';
import { GroundScatterSystem } from '../systems/GroundScatterSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { AdaptiveSkill } from '../core/AdaptiveSkill.js';

/** v3.4 countdown: 3.0 seconds @ 60Hz, plus a small "GO" tail. */
const COUNTDOWN_TOTAL_FRAMES = 200;

/**
 * Per-frame system ordering. Each system has `update(world, delta)`.
 * Some "systems" don't run per-frame at all (EffectsSystem is purely
 * event-driven); those live as named properties on World but aren't
 * in this array.
 */

/**
 * Thin world container — owns the entity registry, the system pipeline,
 * input, the EventBus, and a few aggregate scalars (score, lives,
 * speed, etc.) that the HUD and several systems read.
 *
 * Pure shell — no spawning, no physics, no scoring logic lives here.
 * All of that has moved into purpose-built systems.
 *
 * @typedef {'menu' | 'playing' | 'paused' | 'dead'} WorldState
 *
 * @property {WorldState} state
 * @property {number} score
 * @property {number} lives
 * @property {number} speed
 * @property {number} baseSpeed
 * @property {number} distanceRun       — world units travelled, scaled to "m"
 * @property {number} timeAlive         — frames since the run started
 * @property {number} scrollOffset      — cyclic visual offset for VFX
 * @property {number} worldDistanceTotal — monotonic gameplay road distance
 * @property {number} cameraShake       — current shake amplitude
 * @property {number} cameraImpulseTime — frames since the most recent shake
 * @property {number} bestScore         — persisted best across sessions
 * @property {number} currentTier
 * @property {import('../ecs/EntityRegistry.js').EntityRegistry} registry
 * @property {import('../utils/rng.js').Rng} rng
 * @property {import('../ecs/Entity.js').Entity | null} player
 * @property {import('../core/InputManager.js').InputManager | null} input
 */
export class World {
  /**
   * @param {object} config
   * @param {import('./Projection.js').Projection} projection
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {{
   *   seed?: number | string,
   *   leaderboard?: import('../core/Leaderboard.js').Leaderboard,
   *   playerStats?: import('../core/PlayerStats.js').PlayerStats,
   *   adaptiveQuality?: import('../core/AdaptiveQuality.js').AdaptiveQuality,
   * }} [options]
   */
  constructor(config, projection, eventBus, options = {}) {
    this.config = config;
    this.projection = projection;
    this.eventBus = eventBus;
    this.registry = new EntityRegistry();
    this.rng = new Rng(options.seed);
    this.leaderboard = options.leaderboard ?? null;
    this.playerStats = options.playerStats ?? null;
    this.adaptiveQuality = options.adaptiveQuality ?? null;
    /** Optional ShareSystem hook (HudSystem reads it for death-screen buttons). */
    this.share = options.share ?? null;
    /** Set to the rank (1..N) of the most recent run if it placed on the board. */
    this.lastRunRank = 0;

    // Subsystems with their own state (timers, snapshots, pools, etc.).
    this.powerUpSystem = new PowerUpSystem(config, eventBus);
    this.comboSystem = new ComboSystem(config, eventBus);
    // v3.5: adaptive skill reads PlayerStats' recent-runs window and
    // biases the difficulty curve. SpawnSystem holds the DifficultyDirector
    // which consults it on every pattern pick.
    this.adaptiveSkill = new AdaptiveSkill(this.playerStats);
    // v3.8.37 — Phase 2 placement enforcement. SpawnSystem +
    // DecorationSystem consult this validator on every spawn attempt.
    this.placement = new PlacementValidator(config);
    this.spawnSystem = new SpawnSystem(config, projection, this.rng, this.adaptiveSkill, this.placement);
    this.decorationSystem = new DecorationSystem(config, projection, this.rng, this.placement);
    // v4.6 — reference-match: second decoration channel for the dense
    // shoulder-flora carpet, parallel to decorationSystem's structural pass.
    this.groundScatterSystem = new GroundScatterSystem(config, projection, this.rng);
    this.collisionSystem = new CollisionSystem(config, eventBus);
    this.gameStateSystem = new GameStateSystem(config, eventBus);
    this.effectsSystem = new EffectsSystem(config, eventBus, projection);
    this.particleSystem = new ParticleSystem();
    this.popupSystem = new ScorePopupSystem();
    this.cleanupSystem = new CleanupSystem();

    // Per-frame pipeline. powerUpSystem + comboSystem tick first so timer
    // expiry is visible to gameStateSystem (speedMultiplier / combo value)
    // and collisionSystem (magnet, shield) within the same frame.
    this._pipeline = [
      this.powerUpSystem,
      this.comboSystem,
      new PlayerInputSystem(eventBus),
      this.gameStateSystem,
      new PlayerPhysicsSystem(eventBus),
      this.spawnSystem,
      this.decorationSystem,
      // v4.6 — reference-match: ticks right after decorationSystem. Render
      // order is decided by the renderer's band/zLayer passes, not pipeline
      // order, so position here only governs spawn timing.
      this.groundScatterSystem,
      new MovementSystem(),
      this.collisionSystem,
      this.particleSystem,
      this.popupSystem,
      this.cleanupSystem,
    ];
    // Subset that still ticks in menu / dead / paused states so the end
    // screens stay alive (particles fall, popups fade, dead entities reaped).
    this._menuTickSystems = [this.particleSystem, this.popupSystem, this.cleanupSystem];

    // Event-driven systems still need a world handle for handlers.
    this.gameStateSystem.attach(this);
    this.effectsSystem.attach(this);

    this.bestScore = this.#readBestScore();
    this.clouds = this.#makeClouds();
    this.state = 'menu';
    this._occupiedLanes = [];
    this._renderLanes = [];
    this.input = null;
    this.player = null;
    /**
     * Bounded ring of motion-trail ghost snapshots — populated by
     * PlayerPhysicsSystem during speed-burst, drained by PlayerRenderer.
     * Backed by a pool so a burst (~120 spawns over 360 frames) does
     * not allocate fresh ghost objects.
     */
    this.playerTrail = [];
    this.playerTrailPool = new ObjectPool(
      () => ({ laneX: 0, y: 0, runFrame: 0, crouching: false, life: 0, maxLife: 0 }),
      null,
      16,
    );

    this.reset();
  }

  reset() {
    this.state = 'menu';
    this.speed = this.config.gameplay.startSpeed;
    this.baseSpeed = this.config.gameplay.startSpeed;
    this.timeAlive = 0;
    this.distanceRun = 0;
    this.score = 0;
    this.currentTier = 0;
    this.lives = this.config.gameplay.startLives;
    this.cameraShake = 0;
    this.cameraImpulseTime = 0;
    this.scrollOffset = 0;
    this.worldDistanceTotal = 0;
    this.lastRunRank = 0;
    // v3.1 — distance-baseline accumulator. Combo state lives in ComboSystem.
    this.distanceScoreCarry = 0;
    this.countdownFrames = 0;
    this.dyingFrames = 0;
    this.comboSystem.reset('start');
    // Run-scoped totals — fed into PlayerStats on death.
    this.orchidsCollectedThisRun = 0;
    this.rareOrchidsCollectedThisRun = 0;
    this.nearMissesThisRun = 0;
    this.lastHazardType = null;
    this.lastMilestoneIndex = -1;
    this.lastSpeedTier = 0;   // GameStateSystem watches baseSpeed crossings

    this.registry.clear();
    this.player = createPlayer(this.registry, this.config);
    this.powerUpSystem.reset();
    // v3.5: refresh skill bias so the upcoming run sees the most recent
    // death history (the previous run's distance was just recorded in
    // saveBestScore).
    this.adaptiveSkill?.refresh();
    this.spawnSystem.reset();
    this.decorationSystem.reset();
    this.groundScatterSystem.reset();
    this.particleSystem.reset();
    this.popupSystem.reset();
    this.placement.reset();
    this.projection.focalImpulse = 0;
    for (let i = 0; i < this.playerTrail.length; i += 1) this.playerTrailPool.release(this.playerTrail[i]);
    this.playerTrail.length = 0;
    // v3.8.2 — populate decor + orchids on reset so the menu / death /
    // pause overlay already shows a fully-stocked road behind the UI.
    // Entities sit still while state !== 'playing' (SpawnSystem and
    // physics bail in that case) — this is purely a visual fill.
    this.spawnSystem.prepopulate(this);
    this.decorationSystem.prepopulate(this);
    this.groundScatterSystem.prepopulate(this);
  }

  /**
   * @param {{ skipCountdown?: boolean }} [opts]
   *
   * v3.8 — countdown is OPT-IN. Default behaviour (no opts) jumps
   * straight into 'playing'. The user complained that clicking Start
   * appeared to "do nothing for 3 seconds"; we keep the countdown code
   * intact for callers that explicitly request it via
   * `start({ skipCountdown: false })`, but the menu / restart paths get
   * an instant start now.
   */
  start(opts = {}) {
    this.reset();
    // reset() already prepopulates the scene; no duplicate spawn here.
    if (opts.skipCountdown === false) {
      this.state = 'starting';
      this.countdownFrames = COUNTDOWN_TOTAL_FRAMES;
    } else {
      this.state = 'playing';
      this.countdownFrames = 0;
    }
    this.eventBus.emit('scoreChanged', this.score);
    this.eventBus.emit('livesChanged', this.lives);
    this.eventBus.emit('tierChanged', this.currentTier);
    this.eventBus.emit('distanceChanged', this.distanceRun);
    this.eventBus.emit('powerUpsChanged', this.powerUpSystem.snapshot());
    // ComboSystem.reset() emits comboChanged when state actually changes.
    this.eventBus.emit('stateChanged', this.state);
    if (this.state === 'starting') this.eventBus.emit('countdown:start');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.eventBus.emit('stateChanged', this.state);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.eventBus.emit('stateChanged', this.state);
  }

  /**
   * Per-frame tick. Reads input via `world.input` so systems don't need
   * to thread it themselves. Cloud drift and meta state (pause / dead /
   * menu) is handled here, in front of the system pipeline.
   */
  update(input, delta) {
    this.input = input;
    input.pollGamepad();

    if (input.consume('pause')) {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }
    if (this.state === 'menu' && input.consume('start')) {
      this.start();
    }
    // v3.1: restart only consumed in dead/paused. Previously a stray R
    // mid-run would silently nuke a long session — frustrating for casual
    // players. Speedrunners can still pause→restart in two key presses.
    if (this.state === 'dead' || this.state === 'paused') {
      if (input.consume('restart')) this.start();
    }

    if (this.state === 'dying') {
      // v3.5 slow-mo death moment. Keep ticking the simulation but at a
      // fraction of real speed so the player sees what hit them. After
      // dyingFrames expire, run the regular death close-out (save scores,
      // transition to 'dead' which spawns the score overlay).
      this.dyingFrames = Math.max(0, this.dyingFrames - delta);
      const slowDelta = delta * (this.config.gameplay.dyingSpeedScale ?? 0.25);
      for (const sys of this._pipeline) this.#tickSystem(sys, slowDelta);
      this.#updateClouds(slowDelta);
      if (this.dyingFrames <= 0) {
        this.saveBestScore();
        this.state = 'dead';
        this.eventBus.emit('stateChanged', this.state);
      }
      return;
    }

    if (this.state === 'starting') {
      // Drain countdown frames; emit per-second 'countdown:tick' events
      // so SoundSystem can chirp and EffectsRenderer can paint the
      // big 3 / 2 / 1 / GO overlay. Input is consumed to avoid burning
      // jump-buffer on accidental presses before the player is ready.
      input.consume('jump');
      input.consume('crouchDown');
      input.consume('moveLeft');
      input.consume('moveRight');
      const before = Math.ceil(this.countdownFrames / 60);
      this.countdownFrames = Math.max(0, this.countdownFrames - delta);
      const after = Math.ceil(this.countdownFrames / 60);
      if (after < before && after > 0) this.eventBus.emit('countdown:tick', { remaining: after });
      this.#updateClouds(delta);
      for (const sys of this._menuTickSystems) this.#tickSystem(sys, delta);
      if (this.countdownFrames <= 0) {
        this.state = 'playing';
        this.eventBus.emit('countdown:go');
        this.eventBus.emit('stateChanged', this.state);
      }
      return;
    }

    if (this.state !== 'playing') {
      if (this.state === 'dead') input.consume('start');
      this.#updateClouds(delta);
      // Particles/popups still animate so end screens feel alive.
      for (const sys of this._menuTickSystems) this.#tickSystem(sys, delta);
      return;
    }

    input.consume('start');

    for (const sys of this._pipeline) this.#tickSystem(sys, delta);
    this.#updateClouds(delta);
  }

  /**
   * Run one system tick with error containment so a thrown system doesn't
   * cancel the rest of the frame. We log the first failure per system
   * (system name + the actual error), then suppress so a per-frame bug
   * doesn't drown the console.
   */
  #tickSystem(sys, delta) {
    try {
      sys.update(this, delta);
    } catch (err) {
      if (!sys._tickErrLogged) {
        sys._tickErrLogged = true;
        const name = sys.constructor?.name ?? 'system';
        console.error(`[World] ${name}.update() threw — subsequent failures suppressed:`, err);
      }
    }
  }

  // ── Player-occupied lanes (used by CollisionSystem + renderers) ────────────

  /**
   * Reused mutable array. Callers must not retain.
   */
  getOccupiedLanes() {
    const minLane = this.config.player.minLane;
    const maxLane = this.config.player.maxLane;
    const center = this.player.components.LaneState.laneX;
    const out = this._occupiedLanes;
    out.length = 0;
    out.push(center);
    if (this.powerUpSystem.isSplitClonesActive()) {
      const left = clamp(center - 1, minLane, maxLane);
      const right = clamp(center + 1, minLane, maxLane);
      if (Math.abs(left - center) > 0.001) out.push(left);
      if (Math.abs(right - center) > 0.001 && Math.abs(right - left) > 0.001) out.push(right);
    }
    return out;
  }

  /**
   * Reused mutable array. Used by PlayerRenderer to draw clones.
   */
  getPlayerRenderLanes() {
    const out = this._renderLanes;
    out.length = 0;
    const center = this.player.components.LaneState.laneX;
    if (!this.powerUpSystem.isSplitClonesActive()) {
      out.push(center);
      return out;
    }
    const minLane = this.config.player.minLane;
    const maxLane = this.config.player.maxLane;
    const left = clamp(center - 1, minLane, maxLane);
    const right = clamp(center + 1, minLane, maxLane);
    out.push(center);
    if (Math.abs(left - center) > 0.001) out.push(left);
    if (Math.abs(right - center) > 0.001 && Math.abs(right - left) > 0.001) out.push(right);
    return out;
  }

  /**
   * Persist best-score + leaderboard submission. Called by GameStateSystem
   * on player death. lastRunRank ends up populated if the run made the
   * top-N (HudSystem reads it to decide whether to prompt for a name).
   */
  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        window.localStorage.setItem(this.config.gameplay.localStorageBestKey, String(this.bestScore));
      } catch {
        // localStorage can be unavailable in some embedded/file contexts.
      }
    }
    this.lastRunRank = 0;
    if (this.leaderboard && this.leaderboard.qualifies(this.score)) {
      // The HUD's death-state prompt will call leaderboard.submit() with a
      // name; we only stash whether it qualified so the HUD knows to ask.
      this.lastRunRank = -1; // sentinel for "qualified, awaiting name"
    }
    // v3.1: aggregate per-run totals into lifetime stats. Quiet no-op
    // when PlayerStats is unavailable so unit tests / embed contexts
    // still terminate cleanly.
    if (this.playerStats) {
      this.playerStats.recordRun({
        orchids: this.orchidsCollectedThisRun,
        rareOrchids: this.rareOrchidsCollectedThisRun,
        distance: this.distanceRun,
        nearMisses: this.nearMissesThisRun,
      });
    }
    // v3.2: signal end-of-run to subscribers (achievements, telemetry).
    // Emitted AFTER stats are updated so achievement predicates see the
    // freshest lifetime numbers.
    this.eventBus.emit('run:ended', {
      score: this.score,
      distance: Math.floor(this.distanceRun),
      daily: !!this.dailyMode,
    });
  }

  #updateClouds(delta) {
    for (const cloud of this.clouds) {
      cloud.x -= 0.022 * cloud.speed * delta;
      if (cloud.x < -260) {
        cloud.x = this.projection.width + 260;
      }
    }
  }

  #makeClouds() {
    const width  = this.projection.width;
    const height = this.projection.height;
    const keys   = this.config.visual?.background?.cloudKeys ?? ['backgroundCloud03'];
    const pick   = (i) => keys[i % keys.length];
    return [
      { x: width * 0.18, y: height * 0.118, widthPx: 190, speed: 0.24 },
      { x: width * 0.38, y: height * 0.088, widthPx: 162, speed: 0.21 },
      { x: width * 0.56, y: height * 0.150, widthPx: 118, speed: 0.18 },
      { x: width * 0.82, y: height * 0.118, widthPx: 184, speed: 0.23 },
      { x: width * 0.24, y: height * 0.218, widthPx: 112, speed: 0.16 },
      { x: width * 0.71, y: height * 0.224, widthPx: 98,  speed: 0.14 },
      { x: width * 0.88, y: height * 0.200, widthPx: 86,  speed: 0.18 },
    ].map((c, i) => ({ ...c, key: pick(i) }));
  }

  #readBestScore() {
    try {
      return Number(window.localStorage.getItem(this.config.gameplay.localStorageBestKey) ?? 0) || 0;
    } catch {
      return 0;
    }
  }
}
