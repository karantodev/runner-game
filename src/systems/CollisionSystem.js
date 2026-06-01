import { getCollectibleSpec } from '../ecs/collectibleTypes.js';
import { getObstacleRule } from '../ecs/obstacleRules.js';

/**
 * Detects player <-> obstacle and player <-> collectible interactions.
 *
 * Does NOT mutate score / lives / state — emits events instead. The
 * GameStateSystem listens and applies consequences; EffectsSystem listens
 * for the visual response.
 *
 * Events emitted:
 *   - flower:collected   { lane, high }
 *   - rare:collected     { lane, high }                v3.1
 *   - life:collected     { lane, high }
 *   - power:collected    { type, lane, high }
 *   - hazard:hit         { type, laneX } — only when player is vulnerable
 *   - hazard:cleared     { kind: 'jump' | 'crouch', type }
 *   - hazard:nearMiss    { kind, type, laneX, clearance } v3.1 — narrow escape
 */
export class CollisionSystem {
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
  }

  update(world) {
    if (world.state !== 'playing') return;
    if (!world.player) return;
    this.#collect(world);
    this.#hitObstacles(world);
  }

  #collect(world) {
    const occupiedLanes = world.getOccupiedLanes();
    const playerY = world.player.components.VerticalState.y;

    for (const e of world.registry.query('Position', 'CollectibleData')) {
      const pos = e.components.Position;
      const data = e.components.CollectibleData;
      if (data.collected || !crossedDepthWindow(pos, -3, 3)) continue;

      const inLane = occupiedLanes.some((lane) => Math.abs(lane - pos.lane) < 0.48);
      const heightOK = data.high ? playerY < -30 : true;
      if (!inLane || !heightOK) continue;

      data.collected = true;
      this.#emitCollect(world, data.type, { lane: pos.lane, high: data.high });
    }

    // v3.1: magnet bend. Pull un-collected orchids toward the player when
    // power-up is active, so they "fly" within reach for the next tick.
    if (world.powerUpSystem.isMagnetActive()) {
      this.#applyMagnet(world);
    }
  }

  /**
   * Lerp each un-collected orchid lane toward the player's lane when it
   * is within the magnet radius. Distance is unchanged — only horizontal
   * pull so collection happens naturally on the next #collect pass.
   * Pulls anything whose render kind is 'flower' or 'rare' — the data
   * table decides, not a hard-coded type list.
   */
  #applyMagnet(world) {
    const cfg = world.config.powerUps.magnet;
    const playerLaneX = world.player.components.LaneState.laneX;
    for (const e of world.registry.query('Position', 'CollectibleData')) {
      const data = e.components.CollectibleData;
      if (data.collected) continue;
      const spec = getCollectibleSpec(data.type);
      if (!spec || (spec.render.kind !== 'flower' && spec.render.kind !== 'rare')) continue;
      const pos = e.components.Position;
      if (pos.distance < -3 || pos.distance > cfg.radius * 14) continue;
      const dx = playerLaneX - pos.lane;
      if (Math.abs(dx) > cfg.radius) continue;
      const pull = Math.sign(dx) * Math.min(cfg.pullStrength, Math.abs(dx));
      pos.lane += pull;
    }
  }

  /**
   * Look the collectible spec up in the registry, fire its event, bump
   * the per-run stat field if there is one. Power-up types are forwarded
   * through 'power:collected' with the `powerUpType` payload PowerUpSystem
   * already knows how to activate.
   */
  #emitCollect(world, type, payload) {
    const spec = getCollectibleSpec(type);
    if (!spec) return;
    if (spec.runStatField) world[spec.runStatField] += 1;
    if (spec.powerUpType) {
      this.eventBus.emit(spec.event, { ...payload, type: spec.powerUpType });
    } else {
      this.eventBus.emit(spec.event, payload);
    }
  }

  #hitObstacles(world) {
    const occupiedLanes = world.getOccupiedLanes();
    const player = world.player;
    const playerLaneX = player.components.LaneState.laneX;
    const playerY = player.components.VerticalState.y;
    const isCrouching = player.components.CrouchState.isCrouching;
    const invulnerable = player.components.Health.invulnerabilityFrames > 0;

    for (const e of world.registry.query('Position', 'Hitbox')) {
      const pos = e.components.Position;
      const box = e.components.Hitbox;
      box.warning = false;
      if (box.hit || passedDepthWindow(pos, -3)) continue;

      const inLane = box.allLanes
        ? true
        : occupiedLanes.some((lane) => Math.abs(lane - pos.lane) < 0.56);

      // Widened from 18 → 32 so a striped warning band has time to read.
      // At base speed 0.9 that's ~36 frames (~0.6 sec) of advance notice;
      // at full burst (×1.58) about 22 frames (~0.37 sec) — still readable.
      if (inLane && pos.distance > 3 && pos.distance < 32) box.warning = true;
      if (!crossedDepthWindow(pos, -3, 3)) continue;
      if (!inLane) continue;

      const jumpingOver = playerY < -25;
      const rule = getObstacleRule(box.type);
      const cfgNearMiss = this.config.gameplay.nearMiss;
      if (rule.clearBy === 'jump' && jumpingOver) {
        box.hit = true;
        this.eventBus.emit('hazard:cleared', { kind: 'jump', type: box.type });
        // v3.1: a "near miss" is a jump hazard cleared with low vertical clearance.
        // playerY between -25 and -(25+verticalWindow) is the narrow band.
        const clearance = Math.abs(playerY) - 25;
        if (clearance >= 0 && clearance <= cfgNearMiss.verticalWindow) {
          world.nearMissesThisRun += 1;
          this.eventBus.emit('hazard:nearMiss', { kind: 'jump', type: box.type, laneX: playerLaneX, clearance });
        }
        continue;
      }
      if (rule.clearBy === 'crouch' && isCrouching) {
        box.hit = true;
        this.eventBus.emit('hazard:cleared', { kind: 'crouch', type: box.type });
        // For overhang, "near miss" = crouched within last few frames of
        // the collision zone (didn't react until the very edge).
        if (pos.distance > -1.5 && pos.distance < 0.5) {
          world.nearMissesThisRun += 1;
          this.eventBus.emit('hazard:nearMiss', { kind: 'crouch', type: box.type, laneX: playerLaneX, clearance: 0 });
        }
        continue;
      }

      box.hit = true;
      if (invulnerable) continue;
      // v3.4: remember what killed the player so the death screen can
      // tell them. Cleared on world.reset().
      world.lastHazardType = box.type;
      this.eventBus.emit('hazard:hit', { type: box.type, laneX: playerLaneX });
    }
  }
}

function crossedDepthWindow(pos, min, max) {
  const previous = pos.previousDistance ?? pos.distance;
  return Math.min(previous, pos.distance) < max
    && Math.max(previous, pos.distance) > min;
}

function passedDepthWindow(pos, min) {
  const previous = pos.previousDistance ?? pos.distance;
  return Math.max(previous, pos.distance) <= min;
}
