export class Obstacle {
  constructor({ type, assetType = null, zone = null, lane = 0, distance, variant = null, allLanes = false }) {
    this.kind = 'obstacle';
    this.type = type;
    this.assetType = assetType ?? (type === 'vine'
      ? 'vine_barrier'
      : type === 'bush'
        ? 'spiky_bush_obstacle'
        : type === 'wheat'
          ? 'dry_grass_obstacle'
          : type === 'wall'
            ? 'purple_brick_single'
            : type === 'mushroom'
              ? 'small_center_mushroom'
              : 'stone_obstacle');
    this.zone = zone;
    this.lane = lane;
    this.distance = distance;
    this.variant = variant;
    this.allLanes = allLanes;
    this.hit = false;
    this.warning = false;
  }

  update(delta, speed) {
    this.distance -= speed * delta;
  }
}
