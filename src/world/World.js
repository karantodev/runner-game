import { Player } from '../entities/Player.js';
import { updateParticles } from '../entities/Particle.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { DecorationSystem } from '../systems/DecorationSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { clamp } from '../utils/math.js';

export class World {
  constructor(config, projection, eventBus) {
    this.config = config;
    this.projection = projection;
    this.eventBus = eventBus;
    this.player = new Player(config.player);
    this.spawnSystem = new SpawnSystem(config, projection);
    this.collisionSystem = new CollisionSystem(config, eventBus);
    this.decorationSystem = new DecorationSystem(config, projection);
    this.powerUpSystem = new PowerUpSystem(config, eventBus);
    this.bestScore = this.#readBestScore();
    this.clouds = this.#makeClouds();
    this.state = 'menu';
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
    this.invulnerabilityFrames = 0;
    this.cameraShake = 0;
    this.cameraImpulseTime = 0;
    this.hitFlash = 0;
    this.scrollOffset = 0;
    this.player.reset();
    this.powerUpSystem.reset();
    this.obstacles = [];
    this.collectibles = [];
    this.scenery = [];
    this.particles = [];
    this.scorePopups = [];
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

  update(input, delta) {
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
      this.#updatePassive(delta);
      return;
    }

    input.consume('start');

    if (input.consume('moveLeft')) this.player.moveLane(-1);
    if (input.consume('moveRight')) this.player.moveLane(1);
    if (input.consume('jump')) {
      const jumped = this.player.jump(
        this.config.gameFeel.particles ? this.particles : null,
        this.projection.groundY,
        this.projection.laneWidth,
        this.projection.width / 2,
      );
      if (jumped) this.addCameraImpulse(1.8);
    }

    this.timeAlive += delta;
    this.invulnerabilityFrames = Math.max(0, this.invulnerabilityFrames - delta);
    this.cameraShake *= 0.84;
    this.cameraImpulseTime += delta;
    this.hitFlash = Math.max(0, this.hitFlash - 0.09 * delta);
    this.powerUpSystem.update(delta);

    this.baseSpeed = this.config.gameplay.startSpeed + Math.min(
      this.config.gameplay.maxSpeedBonus,
      this.timeAlive / this.config.gameplay.speedRampFrames,
    );
    this.speed = this.baseSpeed * this.powerUpSystem.speedMultiplier();
    this.distanceRun += this.speed * delta * this.config.gameplay.distanceScale;
    this.scrollOffset += this.speed * delta;
    this.#updateTier();

    const playerFeedback = this.player.update({
      delta,
      speed: this.speed,
      jumpHeld: input.isHeld('jumpHeld'),
      particles: this.config.gameFeel.particles ? this.particles : null,
      groundY: this.projection.groundY,
      laneWidth: this.projection.laneWidth,
      centerX: this.projection.width / 2,
    });
    if (playerFeedback.landed) this.addCameraImpulse(2.6);

    for (const obstacle of this.obstacles) obstacle.update(delta, this.speed);
    for (const item of this.collectibles) item.update(delta, this.speed);
    for (const item of this.scenery) item.update(delta, this.speed);

    this.spawnSystem.update(this, delta);
    this.decorationSystem.update(this, delta);
    this.collisionSystem.update(this);
    this.#cleanup();
    this.#updateClouds(delta);
    this.particles = updateParticles(this.particles, delta);
    this.#updateScorePopups(delta);
  }

  addScore(amount) {
    this.score = Math.max(0, this.score + amount);
    this.eventBus.emit('scoreChanged', this.score);
    this.#updateTier();
  }

  applyHazardPenalty(type) {
    const scorePenaltyTypes = new Set(['mushroom', 'bush', 'wheat']);
    if (!scorePenaltyTypes.has(type)) return;
    this.addScore(-this.config.gameplay.hazardScorePenalty);
  }

  damage() {
    if (this.invulnerabilityFrames > 0) return;
    this.lives -= 1;
    this.invulnerabilityFrames = this.config.gameplay.invulnerabilityFrames;
    this.addCameraImpulse(7.5);
    this.hitFlash = 1;
    this.eventBus.emit('livesChanged', this.lives);

    if (this.config.gameFeel.particles) {
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: this.projection.width / 2 + this.player.laneX * this.projection.laneWidth,
          y: this.projection.groundY - 80,
          vx: (Math.random() - 0.5) * 10,
          vy: -Math.random() * 6 - 2,
          life: 30,
          radius: 3 + Math.random() * 3,
          color: 'rgba(255,80,80,0.90)',
        });
      }
    }

    if (this.lives <= 0) {
      this.#saveBestScore();
      this.state = 'dead';
      this.eventBus.emit('stateChanged', this.state);
    }
  }

  activatePowerUp(type) {
    this.powerUpSystem.activate(type);
    this.addCameraImpulse(3.5);
    const color = type === 'speed-burst' ? 'rgba(90,255,100,0.95)' : 'rgba(170,90,255,0.95)';
    if (this.config.gameFeel.particles) {
      for (let i = 0; i < 24; i++) {
        this.particles.push({
          x: this.projection.width / 2 + this.player.laneX * this.projection.laneWidth + (Math.random() - 0.5) * 80,
          y: this.projection.groundY - 100 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 5 - 1,
          life: 32,
          radius: 2 + Math.random() * 3,
          color,
        });
      }
    }
  }

  addCollectParticles(lane, high, type) {
    if (!this.config.gameFeel.particles && !this.config.gameFeel.scorePopups) return;
    const y = this.projection.groundY - (high ? 100 : 52);
    const color = type === 'life'
      ? 'rgba(255,70,95,0.95)'
      : type === 'power'
        ? 'rgba(100,255,120,0.95)'
        : 'rgba(255,210,60,0.95)';
    if (this.config.gameFeel.particles) {
      const burst = type === 'flower' ? 12 : 18;
      for (let i = 0; i < burst; i++) {
        this.particles.push({
          x: this.projection.width / 2 + lane * this.projection.laneWidth,
          y,
          vx: (Math.random() - 0.5) * (type === 'flower' ? 5.5 : 7),
          vy: -Math.random() * (type === 'flower' ? 4 : 5) - 1,
          life: 22 + Math.random() * 10,
          radius: 2 + Math.random() * (type === 'flower' ? 2.4 : 3.2),
          color,
        });
      }
    }
    if (this.config.gameFeel.scorePopups) {
      const text = type === 'life' ? '+LIFE' : type === 'power' ? 'POWER' : '+1';
      const popupColor = type === 'life' ? '#ff6b83' : type === 'power' ? '#a7ff7e' : '#ffe36a';
      this.addScorePopup(lane, high, text, popupColor);
    }
  }

  addClearParticles() {
    if (!this.config.gameFeel.particles) return;
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.projection.width / 2 + this.player.laneX * this.projection.laneWidth + (Math.random() - 0.5) * 60,
        y: this.projection.groundY - 50,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 20,
        radius: 2 + Math.random() * 2,
        color: 'rgba(255,230,120,0.90)',
      });
    }
  }

  addCameraImpulse(amount) {
    if (!this.config.gameFeel.cameraShake) return;
    this.cameraShake = Math.max(this.cameraShake, amount);
    this.cameraImpulseTime = 0;
  }

  addScorePopup(lane, high, text, color) {
    if (!this.config.gameFeel.scorePopups) return;
    const p = this.projection.project(lane, 0);
    this.scorePopups.push({
      text,
      color,
      x: p.sx,
      y: p.sy - (high ? 116 : 78),
      life: 34,
      maxLife: 34,
      vy: high ? 1.8 : 1.4,
      scale: 0.78,
    });
  }

  getOccupiedLanes() {
    const center = Math.round(this.player.targetLane);
    const lanes = [center];
    if (this.powerUpSystem.isSplitClonesActive()) {
      lanes.push(center - 1, center + 1);
    }
    return [...new Set(lanes.map((lane) => clamp(lane, this.config.player.minLane, this.config.player.maxLane)))];
  }

  getPlayerRenderLanes() {
    if (!this.powerUpSystem.isSplitClonesActive()) return [this.player.laneX];
    return [...new Set([
      clamp(this.player.laneX - 1, this.config.player.minLane, this.config.player.maxLane),
      this.player.laneX,
      clamp(this.player.laneX + 1, this.config.player.minLane, this.config.player.maxLane),
    ].map((lane) => Number(lane.toFixed(3))))];
  }

  #updateTier() {
    const nextTier = this.config.gameplay.scoreTiers.reduce((tier, threshold, index) => (
      this.score >= threshold ? index + 1 : tier
    ), 0);
    if (nextTier === this.currentTier) return;
    this.currentTier = nextTier;
    this.eventBus.emit('tierChanged', this.currentTier);
  }

  #updatePassive(delta) {
    this.#updateClouds(delta);
    this.particles = updateParticles(this.particles, delta);
    this.#updateScorePopups(delta);
  }

  #updateClouds(delta) {
    for (const cloud of this.clouds) {
      cloud.x -= 0.022 * cloud.speed * delta;
      if (cloud.x < -260) {
        cloud.x = this.projection.width + 260;
      }
    }
  }

  #cleanup() {
    // Remove passed gameplay items quickly so oversized near-camera sprites
    // do not stay visible long enough to be clipped by the canvas edges.
    this.obstacles = this.obstacles.filter((item) => item.distance > -4);
    this.collectibles = this.collectibles.filter((item) => item.distance > -4 && !item.collected);
    this.scenery = this.scenery.filter((item) => item.distance > this.config.spawn.sideDecorNearCullDistance);
    this.scorePopups = this.scorePopups.filter((item) => item.life > 0);
  }

  #updateScorePopups(delta) {
    for (const popup of this.scorePopups) {
      popup.y -= popup.vy * delta;
      popup.life -= delta;
      popup.scale = Math.min(1.18, popup.scale + 0.03 * delta);
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

  #saveBestScore() {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      window.localStorage.setItem(this.config.gameplay.localStorageBestKey, String(this.bestScore));
    } catch {
      // localStorage can be unavailable in some embedded/file contexts.
    }
  }
}
