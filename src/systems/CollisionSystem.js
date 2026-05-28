export class CollisionSystem {
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
  }

  update(world) {
    this.#collect(world);
    this.#hitObstacles(world);
  }

  #collect(world) {
    const player = world.player;
    const occupiedLanes = world.getOccupiedLanes();

    for (const item of world.collectibles) {
      if (item.collected || item.distance <= -3 || item.distance >= 3) continue;

      const inLane = occupiedLanes.some((lane) => Math.abs(lane - item.lane) < 0.48)
        || Math.abs(player.laneX - item.lane) < 0.48;
      const heightOK = item.high ? player.y < -30 : true;
      if (!inLane || !heightOK) continue;

      item.collected = true;

      if (item.type === 'flower') {
        world.addScore(1);
        world.addCollectParticles(item.lane, item.high, 'flower');
        continue;
      }

      if (item.type === 'life') {
        world.lives = Math.min(this.config.gameplay.maxLives, world.lives + 1);
        this.eventBus.emit('livesChanged', world.lives);
        world.addCollectParticles(item.lane, item.high, 'life');
        continue;
      }

      if (item.type === 'power-tree') {
        world.activatePowerUp('speed-burst');
        world.addCollectParticles(item.lane, item.high, 'power');
        continue;
      }

      if (item.type === 'power-mushroom') {
        world.activatePowerUp('split-clones');
        world.addCollectParticles(item.lane, item.high, 'power');
      }
    }
  }

  #hitObstacles(world) {
    const player = world.player;
    const occupiedLanes = world.getOccupiedLanes();

    for (const obstacle of world.obstacles) {
      obstacle.warning = false;
      if (obstacle.hit || obstacle.distance <= -3) continue;

      const inLane = obstacle.allLanes
        ? true
        : occupiedLanes.some((lane) => Math.abs(lane - obstacle.lane) < 0.56)
          || Math.abs(player.laneX - obstacle.lane) < 0.56;
      if (inLane && obstacle.distance > 3 && obstacle.distance < 18) obstacle.warning = true;
      if (obstacle.distance >= 3) continue;
      if (!inLane) continue;

      const jumpingOver = player.y < -25;
      if (obstacle.type === 'vine' && jumpingOver) {
        obstacle.hit = true;
        world.addClearParticles();
        continue;
      }
      if (obstacle.type === 'overhang' && player.isCrouching) {
        // Ducked under successfully — celebratory clear.
        obstacle.hit = true;
        world.addClearParticles();
        continue;
      }

      obstacle.hit = true;
      world.applyHazardPenalty(obstacle.type);
      world.damage();
    }
  }
}
