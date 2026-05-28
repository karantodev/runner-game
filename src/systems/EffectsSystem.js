import { spawnParticleEntity, spawnScorePopupEntity } from '../ecs/factories.js';

/**
 * EventBus-driven side-effects: spawns particles + score popups in
 * response to gameplay events. Holds no per-frame logic of its own —
 * the whole class is a set of subscribe callbacks.
 *
 * Subscribed events:
 *   - flower:collected   { lane, high }
 *   - life:collected     { lane, high }
 *   - power:collected    { type, lane, high }
 *   - hazard:hit         { type, laneX }
 *   - hazard:cleared     { kind }   // 'jump' or 'crouch'
 *   - player:landed      { laneX }
 *   - player:jumped      null
 *   - powerup:activated  { type }
 *   - camera:shake       amount
 */
export class EffectsSystem {
  /**
   * @param {object} config
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {object} projection
   */
  constructor(config, eventBus, projection) {
    this.config = config;
    this.projection = projection;
    this.eventBus = eventBus;
    /** @type {import('../world/World.js').World | null} */
    this.world = null;
    eventBus.on('flower:collected', (p) => this.#onCollect(p, 'flower'));
    eventBus.on('life:collected', (p) => this.#onCollect(p, 'life'));
    eventBus.on('power:collected', (p) => this.#onCollect(p, 'power'));
    eventBus.on('hazard:cleared', () => this.#onHazardCleared());
    eventBus.on('hazard:hit', (p) => this.#onHazardHit(p));
    eventBus.on('player:jumped', () => this.#onPlayerJumped());
    eventBus.on('player:landed', (p) => this.#onPlayerLanded(p));
    eventBus.on('powerup:activated', (p) => this.#onPowerUpActivated(p));
    eventBus.on('camera:shake', (amount) => this.#shake(amount));
  }

  /** Called once per frame by the world after construction so handlers see live world state. */
  attach(world) { this.world = world; }

  // ── No update() — fully event-driven. ──────────────────────────────────────

  #shake(amount) {
    const w = this.world;
    if (!w || !w.config.gameFeel.cameraShake) return;
    w.cameraShake = Math.max(w.cameraShake, amount);
    w.cameraImpulseTime = 0;
  }

  #onCollect({ lane, high }, kind) {
    const w = this.world;
    if (!w) return;
    if (!w.config.gameFeel.particles && !w.config.gameFeel.scorePopups) return;

    const y = this.projection.groundY - (high ? 100 : 52);
    const cx = this.projection.width / 2 + lane * this.projection.laneWidth;
    const color = kind === 'life'
      ? 'rgba(255,70,95,0.95)'
      : kind === 'power'
        ? 'rgba(100,255,120,0.95)'
        : 'rgba(255,210,60,0.95)';

    if (w.config.gameFeel.particles) {
      const burst = kind === 'flower' ? 12 : 18;
      for (let i = 0; i < burst; i++) {
        spawnParticleEntity(w.registry, {
          x: cx,
          y,
          vx: (Math.random() - 0.5) * (kind === 'flower' ? 5.5 : 7),
          vy: -Math.random() * (kind === 'flower' ? 4 : 5) - 1,
          life: 22 + Math.random() * 10,
          radius: 2 + Math.random() * (kind === 'flower' ? 2.4 : 3.2),
          color,
        });
      }
    }

    if (w.config.gameFeel.scorePopups) {
      const text = kind === 'life' ? '+LIFE' : kind === 'power' ? 'POWER' : '+1';
      const popupColor = kind === 'life' ? '#ff6b83' : kind === 'power' ? '#a7ff7e' : '#ffe36a';
      this.#spawnPopup(lane, high, text, popupColor);
    }
  }

  #spawnPopup(lane, high, text, color) {
    const w = this.world;
    if (!w || !w.config.gameFeel.scorePopups) return;
    const p = this.projection.project(lane, 0);
    spawnScorePopupEntity(w.registry, {
      x: p.sx,
      y: p.sy - (high ? 116 : 78),
      vy: high ? 1.8 : 1.4,
      text,
      color,
      scale: 0.78,
      life: 34,
    });
  }

  #onHazardCleared() {
    const w = this.world;
    if (!w || !w.config.gameFeel.particles) return;
    const cx = this.projection.width / 2 + w.player.components.LaneState.laneX * this.projection.laneWidth;
    const y = this.projection.groundY - 50;
    for (let i = 0; i < 8; i++) {
      spawnParticleEntity(w.registry, {
        x: cx + (Math.random() - 0.5) * 60,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 20,
        radius: 2 + Math.random() * 2,
        color: 'rgba(255,230,120,0.90)',
      });
    }
  }

  #onHazardHit({ laneX }) {
    const w = this.world;
    if (!w || !w.config.gameFeel.particles) return;
    const cx = this.projection.width / 2 + laneX * this.projection.laneWidth;
    const y = this.projection.groundY - 80;
    for (let i = 0; i < 20; i++) {
      spawnParticleEntity(w.registry, {
        x: cx,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 6 - 2,
        life: 30,
        radius: 3 + Math.random() * 3,
        color: 'rgba(255,80,80,0.90)',
      });
    }
  }

  #onPlayerJumped() {
    const w = this.world;
    if (!w || !w.config.gameFeel.particles) return;
    const laneX = w.player.components.LaneState.laneX;
    const cx = this.projection.width / 2 + laneX * this.projection.laneWidth;
    const groundY = this.projection.groundY;
    for (let i = 0; i < 10; i++) {
      spawnParticleEntity(w.registry, {
        x: cx,
        y: groundY + 4,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 3 - 1,
        life: 24,
        radius: 3 + Math.random() * 3,
        color: 'rgba(200,170,120,0.8)',
      });
    }
  }

  #onPlayerLanded({ laneX }) {
    const w = this.world;
    if (!w) return;
    this.#shake(2.6);
    if (!w.config.gameFeel.particles) return;
    const cx = this.projection.width / 2 + laneX * this.projection.laneWidth;
    const groundY = this.projection.groundY;
    for (let i = 0; i < 10; i++) {
      spawnParticleEntity(w.registry, {
        x: cx + (Math.random() - 0.5) * 30,
        y: groundY,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 2,
        life: 18,
        radius: 2 + Math.random() * 2,
        color: 'rgba(200,170,120,0.7)',
      });
    }
  }

  #onPowerUpActivated({ type }) {
    const w = this.world;
    if (!w) return;
    this.#shake(3.5);
    if (!w.config.gameFeel.particles) return;
    const laneX = w.player.components.LaneState.laneX;
    const cx = this.projection.width / 2 + laneX * this.projection.laneWidth;
    const color = type === 'speed-burst' ? 'rgba(90,255,100,0.95)' : 'rgba(170,90,255,0.95)';
    for (let i = 0; i < 24; i++) {
      spawnParticleEntity(w.registry, {
        x: cx + (Math.random() - 0.5) * 80,
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
