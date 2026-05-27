export class Scenery {
  constructor({ type, assetType = type, zone = null, laneBand = null, lane, distance, variant = 0, scale = 1, yOffset = 0, chunkId = null }) {
    this.kind = 'scenery';
    this.type = type;
    this.assetType = assetType;
    this.zone = zone;
    this.laneBand = laneBand;
    this.lane = lane;
    this.distance = distance;
    this.variant = variant;
    this.visualScale = scale;
    this.yOffset = yOffset;
    this.chunkId = chunkId;
  }

  update(delta, speed) {
    this.distance -= speed * delta;
  }
}
