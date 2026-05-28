import { clamp } from '../utils/math.js';
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
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';

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
 */
export class World {
  constructor(config, projection, eventBus) {
    this.config = config;
    this.projection = projection;
    this.eventBus = eventBus;
    this.registry = new EntityRegistry();

    // Subsystems with their own state (timers, snapshots, etc.).
    this.powerUpSystem = new PowerUpSystem(config, eventBus);
    this.spawnSystem = new SpawnSystem(config, projection);
    this.decorationSystem = new DecorationSystem(config, projection);
    this.collisionSystem = new CollisionSystem(config, eventBus);
    this.gameStateSystem = new GameStateSystem(config, eventBus);
    this.effectsSystem = new EffectsSystem(config, eventBus, projection);

    // Per-frame pipeline.
    this._pipeline = [
      new PlayerInputSystem(eventBus),
      this.gameStateSystem,
      new PlayerPhysicsSystem(eventBus),
      this.spawnSystem,
      this.decorationSystem,
      new MovementSystem(),
      this.collisionSystem,
      new ParticleSystem(),
      new ScorePopupSystem(),
      new CleanupSystem(),
    ];

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

    this.registry.clear();
    this.player = createPlayer(this.registry, this.config);
    this.powerUpSystem.reset();
    this.spawnSystem.reset();
    this.decorationSystem.reset();
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.spawnSystem.prepopulate(this);
    this.decorationSystem.prepopulate(this);
    this.eventBus.emit('scoreChanged', this.score);
    this.eventBus.emit('livesChanged', this.lives);
    this.eventBus.emit('tierChanged', this.currentTier);
    this.eventBus.emit('distanceChanged', this.distanceRun);
    this.eventBus.emit('powerUpsChanged', this.powerUpSystem.snapshot());
    this.eventBus.emit('stateChanged', this.state);
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
    if (input.consume('restart')) {
      this.start();
    }

    if (this.state !== 'playing') {
      if (this.state === 'dead') input.consume('start');
      this.#updateClouds(delta);
      // Particles/popups still animate so end screens feel alive.
      for (const sys of [this._pipeline[7], this._pipeline[8], this._pipeline[9]]) {
        sys.update(this, delta);
      }
      return;
    }

    input.consume('start');

    for (const sys of this._pipeline) sys.update(this, delta);
    this.#updateClouds(delta);
  }

  // ── Player-occupied lanes (used by CollisionSystem + renderers) ────────────

  /**
   * Reused mutable array. Callers must not retain.
   */
  getOccupiedLanes() {
    const minLane = this.config.player.minLane;
    const maxLane = this.config.player.maxLane;
    const targetLane = this.player.components.LaneState.targetLane;
    const center = clamp(Math.round(targetLane), minLane, maxLane);
    const out = this._occupiedLanes;
    out.length = 0;
    out.push(center);
    if (this.powerUpSystem.isSplitClonesActive()) {
      const left = clamp(center - 1, minLane, maxLane);
      const right = clamp(center + 1, minLane, maxLane);
      if (left !== center) out.push(left);
      if (right !== center && right !== left) out.push(right);
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

  /** Persist best-score. Called by GameStateSystem on player death. */
  saveBestScore() {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      window.localStorage.setItem(this.config.gameplay.localStorageBestKey, String(this.bestScore));
    } catch {
      // localStorage can be unavailable in some embedded/file contexts.
    }
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
    const width = this.projection.width;
    const height = this.projection.height;
    return [
      { x: width * 0.18, y: height * 0.118, widthPx: 190, speed: 0.24, key: 'backgroundCloud01' },
      { x: width * 0.38, y: height * 0.088, widthPx: 162, speed: 0.21, key: 'backgroundCloud02' },
      { x: width * 0.56, y: height * 0.150, widthPx: 118, speed: 0.18, key: 'backgroundCloud03' },
      { x: width * 0.82, y: height * 0.118, widthPx: 184, speed: 0.23, key: 'backgroundCloud01' },
      { x: width * 0.24, y: height * 0.218, widthPx: 112, speed: 0.16, key: 'backgroundCloud04' },
      { x: width * 0.71, y: height * 0.224, widthPx: 98,  speed: 0.14, key: 'backgroundCloud05' },
      { x: width * 0.88, y: height * 0.200, widthPx: 86,  speed: 0.18, key: 'backgroundCloud06' },
    ];
  }

  #readBestScore() {
    try {
      return Number(window.localStorage.getItem(this.config.gameplay.localStorageBestKey) ?? 0) || 0;
    } catch {
      return 0;
    }
  }
}
