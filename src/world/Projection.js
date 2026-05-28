/**
 * Pseudo-3D perspective projection. Maps world-space (lane, distance) to
 * screen pixels via a horizon point + a focal-length divisor.
 *
 * @typedef {{
 *   horizonRatio: number,
 *   roadVanishOffsetRatio?: number,
 *   groundRatio: number,
 *   focal: number,
 *   laneWidth: number,
 *   roadHalfLaneUnits: number,
 *   maxDistance: number,
 * }} ProjectionConfig
 *
 * @typedef {{ width: number, height: number }} CanvasConfig
 */
export class Projection {
  /**
   * @param {ProjectionConfig} config
   * @param {CanvasConfig} canvasConfig
   */
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

  /**
   * Project a (lane, distance) world-space point into screen coordinates.
   * Returned scale shrinks with distance and can be used to size art at
   * the same focal point.
   *
   * @param {number} lane
   * @param {number} distance
   * @returns {{ sx: number, sy: number, scale: number }}
   */
  project(lane, distance) {
    const d = Math.max(distance, -10);
    const scale = this.focal / (this.focal + d);
    return {
      sx: this.width / 2 + lane * this.laneWidth * scale,
      sy: this.roadVanishY + (this.groundY - this.roadVanishY) * scale,
      scale,
    };
  }

  /**
   * Screen X for a lane at a known projected scale. Cheaper than full
   * project() when you already have the scale.
   *
   * @param {number} lane
   * @param {number} [scale]
   */
  laneToScreenX(lane, scale = 1) {
    return this.width / 2 + lane * this.laneWidth * scale;
  }

  get roadBaseHalfWidth() {
    return this.roadHalfLaneUnits * this.laneWidth;
  }
}
