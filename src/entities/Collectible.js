export class Collectible {
  constructor({ type = 'flower', assetType = null, zone = null, lane = 0, distance, high = false }) {
    this.kind = 'collectible';
    this.type = type;
    this.assetType = assetType ?? (type === 'life'
      ? 'heart_full'
      : type === 'power-tree'
        ? 'speed_tree_pickup'
        : type === 'power-mushroom'
          ? 'power_mushroom_pickup'
          : 'golden_flower');
    this.zone = zone;
    this.lane = lane;
    this.distance = distance;
    this.high = high;
    this.collected = false;
    this.t = Math.random() * Math.PI * 2;
    this.laneJitter = type === 'flower' ? (Math.random() - 0.5) * 0.16 : 0;
  }

  update(delta, speed) {
    this.distance -= speed * delta;
    this.t += 0.2 * delta;
  }
}
