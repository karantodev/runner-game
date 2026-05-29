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
    eventBus.on('flower:collected', () => this.#addScore(1, 'orchid'));
    eventBus.on('rare:collected', () => this.#addScore(this.config.spawn.rareOrchidBaseScore, 'rare'));
    eventBus.on('life:collected', () => this.#gainLife());
    eventBus.on('power:collected', ({ type }) => this.#activatePowerUp(type));
    eventBus.on('hazard:hit', ({ type }) => this.#takeHit(type));
    // v3.1 game-feel events
    eventBus.on('hazard:nearMiss', () => this.#addScore(this.config.gameplay.nearMiss.bonusScore, 'nearmiss'));
    eventBus.on('hazard:cleared', () => this.#addScore(1, 'cleared'));
  }

  attach(world) { this.world = world; }

  update(world, delta) {
    if (world.state !== 'playing') return;

    world.timeAlive += delta;
    world.cameraShake *= 0.84;
    world.cameraImpulseTime += delta;
    // FOV punch decay — fires on power-up activation in EffectsSystem.
    world.projection.focalImpulse *= 0.86;
    if (Math.abs(world.projection.focalImpulse) < 0.05) world.projection.focalImpulse = 0;

    world.baseSpeed = this.config.gameplay.startSpeed + Math.min(
      this.config.gameplay.maxSpeedBonus,
      world.timeAlive / this.config.gameplay.speedRampFrames,
    );
    world.speed = world.baseSpeed * world.powerUpSystem.speedMultiplier();
    this.#checkSpeedTier(world);

    const previousDistance = Math.floor(world.distanceRun);
    world.distanceRun += world.speed * delta * this.config.gameplay.distanceScale;
    world.scrollOffset += world.speed * delta;
    // v3.1: prevent FP precision loss on multi-hour sessions. scrollOffset
    // feeds Math.sin / parallax math; once it crosses ~2²³ the visual
    // sway starts juddering. Modulating by a large period (≈ 2¹⁸ units)
    // keeps the periodic functions stable without disturbing anything
    // that only reads adjacent-frame diffs.
    if (world.scrollOffset > 262144) world.scrollOffset -= 262144;

    if (Math.floor(world.distanceRun) !== previousDistance) {
      this.eventBus.emit('distanceChanged', world.distanceRun);
    }

    // Distance baseline score — accumulates +1 per gameplay.distanceScoreEvery
    // travel units. Multiplier-aware via #addScore.
    this.#distanceScoreTick(world, delta);

    this.#updateTier(world);
  }

  #distanceScoreTick(world, delta) {
    const step = this.config.gameplay.distanceScoreEvery;
    if (!step || step <= 0) return;
    world.distanceScoreCarry += world.speed * delta * this.config.gameplay.distanceScale;
    while (world.distanceScoreCarry >= step) {
      world.distanceScoreCarry -= step;
      this.#addScore(1, 'distance');
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  /**
   * Mutate score with multiplier routing.
   * @param {number} amount  base score before multipliers
   * @param {'orchid' | 'rare' | 'distance' | 'nearmiss' | 'cleared' | 'manual'} [source]
   *   How the points were earned. Orchid + rare bump the combo streak;
   *   distance / nearmiss / cleared / manual do not (so passive scoring
   *   doesn't ladder up the multiplier on its own).
   */
  #addScore(amount, source = 'manual') {
    const w = this.world;
    if (!w) return;
    const isComboSource = source === 'orchid' || source === 'rare';
    const combo = isComboSource ? w.comboSystem.multiplier : 1;
    const x2 = w.powerUpSystem.isScoreX2Active() ? this.config.powerUps.scoreX2.multiplier : 1;
    w.score = Math.max(0, w.score + amount * combo * x2);
    if (isComboSource) w.comboSystem.bump();
    this.eventBus.emit('scoreChanged', w.score);
    this.#updateTier(w);
    this.#checkMilestones(w);
  }

  /**
   * v3.4: emit `milestone:reached` once per gameplay.scoreMilestones
   * threshold crossing. world.lastMilestoneIndex remembers the highest
   * index already fired so repeats are impossible. Distinct from tier
   * crossings (which drive difficulty); milestones are pure dopamine.
   */
  /**
   * v3.4 speed-tier feedback. baseSpeed climbs continuously from 0.9 to
   * roughly 2.55; we step it into 4 visible buckets and fire
   * `speed:tierUp` when the player crosses into a new one. Listeners
   * (EffectsSystem, SoundSystem) translate that into a punch / sting.
   */
  #checkSpeedTier(w) {
    const tier =
      w.baseSpeed >= 2.10 ? 4 :
      w.baseSpeed >= 1.80 ? 3 :
      w.baseSpeed >= 1.40 ? 2 :
      w.baseSpeed >= 1.15 ? 1 : 0;
    if (tier > w.lastSpeedTier) {
      w.lastSpeedTier = tier;
      this.eventBus.emit('speed:tierUp', { tier, baseSpeed: w.baseSpeed });
    }
  }

  #checkMilestones(w) {
    const list = this.config.gameplay.scoreMilestones ?? [];
    let highest = w.lastMilestoneIndex;
    for (let i = highest + 1; i < list.length; i += 1) {
      if (w.score >= list[i]) highest = i;
      else break;
    }
    if (highest !== w.lastMilestoneIndex) {
      w.lastMilestoneIndex = highest;
      this.eventBus.emit('milestone:reached', { score: list[highest], index: highest });
    }
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
   * event and always applies damage — UNLESS a shield power-up absorbs it.
   *
   * v3.1: shield consumed before applying damage; combo always resets on
   * a real hit (consumed shield still resets combo — a shielded mistake
   * still breaks the streak, by design).
   */
  #takeHit(type) {
    const w = this.world;
    if (!w) return;
    const player = w.player;
    if (!player) return;
    const health = player.components.Health;

    // Shield consumption first: if active, absorb damage but still break
    // combo + flash the player. Players should feel the save but lose
    // their streak so shield isn't a free combo lock.
    if (w.powerUpSystem.isShieldActive()) {
      w.powerUpSystem.consumeShield();
      health.invulnerabilityFrames = this.config.gameplay.invulnerabilityFrames;
      health.hitFlash = 0.6;
      this.eventBus.emit('camera:shake', 3.5);
      this.eventBus.emit('shield:absorbed', { type });
      w.comboSystem.reset('hit');
      return;
    }

    // Legacy penalty hook kept for compatibility — but value defaults to 0
    // in v3.1 config. Skipped entirely when penalty is 0 to avoid empty events.
    if (this.config.gameplay.hazardScorePenalty > 0 && HAZARD_PENALTY_TYPES.has(type)) {
      w.score = Math.max(0, w.score - this.config.gameplay.hazardScorePenalty);
      this.eventBus.emit('scoreChanged', w.score);
    }

    w.comboSystem.reset('hit');
    w.lives -= 1;
    health.invulnerabilityFrames = this.config.gameplay.invulnerabilityFrames;
    health.hitFlash = 1;
    this.eventBus.emit('camera:shake', 7.5);
    this.eventBus.emit('livesChanged', w.lives);

    if (w.lives <= 0) {
      // v3.5: enter the 'dying' slow-mo state instead of jumping straight
      // to 'dead'. World.update drains dyingFrames; after the timer fires
      // we save + transition. saveBestScore() runs ONCE at the transition.
      w.state = 'dying';
      w.dyingFrames = this.config.gameplay.dyingFrames;
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
