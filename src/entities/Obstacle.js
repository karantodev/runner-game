/** Maps a generic obstacle `type` to its default art `assetType`. */
const DEFAULT_ASSET_TYPE = {
  vine: 'vine_barrier',
  bush: 'spiky_bush_obstacle',
  wheat: 'dry_grass_obstacle',
  wall: 'purple_brick_single',
  mushroom: 'small_center_mushroom',
  stone: 'stone_obstacle',
  overhang: 'low_branch_overhang',
};

export class Obstacle {
  constructor({ type, assetType = null, zone = null, lane = 0, distance, variant = null, allLanes = false }) {
    this.kind = 'obstacle';
    this.type = type;
    this.assetType = assetType ?? DEFAULT_ASSET_TYPE[type] ?? 'stone_obstacle';
    this.zone = zone;
    this.lane = lane;
    // Overhangs always span the road — they're an overhead barrier, not a
    // single-lane block — so force allLanes regardless of how they were spawned.
    this.allLanes = type === 'overhang' ? true : allLanes;
    this.distance = distance;
    this.variant = variant;
    this.hit = false;
    this.warning = false;
  }

  update(delta, speed) {
    this.distance -= speed * delta;
  }
}
