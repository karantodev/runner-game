/**
 * Detects player <-> obstacle and player <-> collectible interactions.
 *
 * Does NOT mutate score / lives / state — emits events instead. The
 * GameStateSystem listens and applies consequences; EffectsSystem listens
 * for the visual response.
 *
 * Events emitted:
 *   - flower:collected   { lane, high }
 *   - life:collected     { lane, high }
 *   - power:collected    { type, lane, high }
 *   - hazard:hit         { type, laneX } — only when player is vulnerable
 *   - hazard:cleared     { kind: 'jump' | 'crouch' }
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
    const playerLaneX = world.player.components.LaneState.laneX;
    const playerY = world.player.components.VerticalState.y;

    for (const e of world.registry.query('Position', 'CollectibleData')) {
      const pos = e.components.Position;
      const data = e.components.CollectibleData;
      if (data.collected || pos.distance <= -3 || pos.distance >= 3) continue;

      const inLane = occupiedLanes.some((lane) => Math.abs(lane - pos.lane) < 0.48)
        || Math.abs(playerLaneX - pos.lane) < 0.48;
      const heightOK = data.high ? playerY < -30 : true;
      if (!inLane || !heightOK) continue;

      data.collected = true;
      if (data.type === 'flower') {
        this.eventBus.emit('flower:collected', { lane: pos.lane, high: data.high });
      } else if (data.type === 'life') {
        this.eventBus.emit('life:collected', { lane: pos.lane, high: data.high });
      } else if (data.type === 'power-tree') {
        this.eventBus.emit('power:collected', { type: 'speed-burst', lane: pos.lane, high: data.high });
      } else if (data.type === 'power-mushroom') {
        this.eventBus.emit('power:collected', { type: 'split-clones', lane: pos.lane, high: data.high });
      }
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
      if (box.hit || pos.distance <= -3) continue;

      const inLane = box.allLanes
        ? true
        : occupiedLanes.some((lane) => Math.abs(lane - pos.lane) < 0.56)
          || Math.abs(playerLaneX - pos.lane) < 0.56;

      if (inLane && pos.distance > 3 && pos.distance < 18) box.warning = true;
      if (pos.distance >= 3) continue;
      if (!inLane) continue;

      const jumpingOver = playerY < -25;
      if (box.type === 'vine' && jumpingOver) {
        box.hit = true;
        this.eventBus.emit('hazard:cleared', { kind: 'jump' });
        continue;
      }
      if (box.type === 'overhang' && isCrouching) {
        box.hit = true;
        this.eventBus.emit('hazard:cleared', { kind: 'crouch' });
        continue;
      }

      box.hit = true;
      if (invulnerable) continue;
      this.eventBus.emit('hazard:hit', { type: box.type, laneX: playerLaneX });
    }
  }
}
