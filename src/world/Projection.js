export class Projection {
  constructor(config, canvasConfig) {
    this.config = config;
    this.width = canvasConfig.width;
    this.height = canvasConfig.height;
    this.horizonY = this.height * config.horizonRatio;
    this.roadVanishY = this.horizonY + this.height * (config.roadVanishOffsetRatio ?? 0.09);
    this.groundY = this.height * config.groundRatio;
    this.focal = config.focal;
    this.laneWidth = config.laneWidth;
    this.roadHalfLaneUnits = config.roadHalfLaneUnits;
    this.maxDistance = config.maxDistance;
  }

  project(lane, distance) {
    const d = Math.max(distance, -10);
    const scale = this.focal / (this.focal + d);
    return {
      sx: this.width / 2 + lane * this.laneWidth * scale,
      sy: this.roadVanishY + (this.groundY - this.roadVanishY) * scale,
      scale,
    };
  }

  laneToScreenX(lane, scale = 1) {
    return this.width / 2 + lane * this.laneWidth * scale;
  }

  get roadBaseHalfWidth() {
    return this.roadHalfLaneUnits * this.laneWidth;
  }
}
