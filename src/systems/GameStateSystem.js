/**
 * Owns score, lives, distance, tier, hit-flash, camera shake decay.
 * Listens to the EventBus and mutates `world.*` fields that the HUD
 * (and other systems) read.
 *
 * Splitting this out lets CollisionSystem emit pure events instead of
 * touching world.lives / world.score directly.
 *
 * Subscribed events:
 *   - flower:collected   { lane, high }
 *   - life:collected     { lane, high }
 *   - power:collected    { type, lane, high }
 *   - hazard:hit         { type, laneX }
 *   - powerup:expired    { type }
 *
 * Per-frame update advances timers (speed ramp, invulnerability,
 * camera shake decay, distance counter) and emits distance:changed.
 */
const HAZARD_PENALTY_TYPES = new Set(['mushroom', 'bush', 'wheat', 'overhang']);

export class GameStateSystem {
  /**
   * @param {object} config
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
    /** @type {import('../world/World.js').World | null} */
    this.world = null;
    eventBus.on('flower:collected', () => this.#addScore(1));
    eventBus.on('life:collected', () => this.#gainLife());
    eventBus.on('power:collected', ({ type }) => this.#activatePowerUp(type));
    eventBus.on('hazard:hit', ({ type }) => this.#takeHit(type));
  }

  attach(world) { this.world = world; }

  update(world, delta) {
    if (world.state !== 'playing') return;

    world.timeAlive += delta;
    world.cameraShake *= 0.84;
    world.cameraImpulseTime += delta;

    world.baseSpeed = this.config.gameplay.startSpeed + Math.min(
      this.config.gameplay.maxSpeedBonus,
      world.timeAlive / this.config.gameplay.speedRampFrames,
    );
    world.speed = world.baseSpeed * world.powerUpSystem.speedMultiplier();

    const previousDistance = Math.floor(world.distanceRun);
    world.distanceRun += world.speed * delta * this.config.gameplay.distanceScale;
    world.scrollOffset += world.speed * delta;

    if (Math.floor(world.distanceRun) !== previousDistance) {
      this.eventBus.emit('distanceChanged', world.distanceRun);
    }

    this.#updateTier(world);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  #addScore(amount) {
    const w = this.world;
    if (!w) return;
    w.score = Math.max(0, w.score + amount);
    this.eventBus.emit('scoreChanged', w.score);
    this.#updateTier(w);
  }

  #gainLife() {
    const w = this.world;
    if (!w) return;
    w.lives = Math.min(this.config.gameplay.maxLives, w.lives + 1);
    this.eventBus.emit('livesChanged', w.lives);
  }

  #activatePowerUp(type) {
    const w = this.world;
    if (!w) return;
    w.powerUpSystem.activate(type);
  }

  /**
   * CollisionSystem only emits hazard:hit when the player is vulnerable
   * (it checks invulnerabilityFrames itself), so this handler trusts the
   * event and always applies damage.
   */
  #takeHit(type) {
    const w = this.world;
    if (!w) return;
    const player = w.player;
    if (!player) return;
    const health = player.components.Health;

    if (HAZARD_PENALTY_TYPES.has(type)) {
      w.score = Math.max(0, w.score - this.config.gameplay.hazardScorePenalty);
      this.eventBus.emit('scoreChanged', w.score);
    }

    w.lives -= 1;
    health.invulnerabilityFrames = this.config.gameplay.invulnerabilityFrames;
    health.hitFlash = 1;
    this.eventBus.emit('camera:shake', 7.5);
    this.eventBus.emit('livesChanged', w.lives);

    if (w.lives <= 0) {
      w.saveBestScore();
      w.state = 'dead';
      this.eventBus.emit('stateChanged', w.state);
    }
  }

  #updateTier(w) {
    const nextTier = this.config.gameplay.scoreTiers.reduce(
      (tier, threshold, index) => (w.score >= threshold ? index + 1 : tier),
      0,
    );
    if (nextTier === w.currentTier) return;
    w.currentTier = nextTier;
    this.eventBus.emit('tierChanged', w.currentTier);
  }
}
