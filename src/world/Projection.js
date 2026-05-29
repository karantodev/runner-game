/**
 * Pseudo-3D perspective projection. Maps world-space (lane, distance) to
 * screen pixels via a horizon point + a focal-length divisor.
 *
 * v3.8.7 — gameplay/visual model split:
 *
 *   GAMEPLAY MODEL (`project`, `laneWidth`) is the canonical lane→pixel
 *   conversion. Used by code that depends on collision-readable lane
 *   positions: nothing renders through this anymore in the production
 *   path, but it's kept as the canonical API for tools / debug overlays
 *   that need raw lane positions in pixels.
 *
 *   VISUAL MODEL (`projectVisual`, `visualLaneWidth`) applies an extra
 *   render-only multiplier (`visualLaneScale`, default 1.0). All renderers
 *   use this so the visual road, decor, player and obstacles stay aligned
 *   relative to each other. Tuning visualLaneScale tightens or widens the
 *   entire rendered scene WITHOUT touching collision math (which lives in
 *   lane units, unitless).
 *
 *   Decoupling rationale: the reference asks for a tighter, deeper visual
 *   road without sacrificing the 3-lane gameplay's reaction window. The
 *   split lets us tighten purely-visual elements (road silhouette, decor
 *   placement, perspective convergence) by changing one number, while the
 *   collision / lane-index math remains a clean lane-unit space.
 *
 * @typedef {{
 *   horizonRatio: number,
 *   roadVanishOffsetRatio?: number,
 *   groundRatio: number,
 *   focal: number,
 *   laneWidth: number,
 *   visualLaneScale?: number,
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
    // visualLaneScale defaults to 1.0 — the project / projectVisual split is
    // architecturally present even when the two models are tuned the same.
    this.visualLaneScale = config.visualLaneScale ?? 1.0;
    this.visualLaneWidth = this.laneWidth * this.visualLaneScale;
    this.roadHalfLaneUnits = config.roadHalfLaneUnits;
    this.maxDistance = config.maxDistance;
    /**
     * Transient focal offset for "FOV punch" effects (power-up activation,
     * hazard impact). Positive = zoom-in, negative = zoom-out. Decays back
     * to 0 each frame via GameStateSystem.
     */
    this.focalImpulse = 0;
  }

  /**
   * GAMEPLAY model. Canonical lane→pixel projection. Most renderers should
   * use `projectVisual` instead — see class JSDoc.
   *
   * @param {number} lane
   * @param {number} distance
   * @returns {{ sx: number, sy: number, scale: number }}
   */
  project(lane, distance) {
    const d = Math.max(distance, -10);
    const f = this.focal + this.focalImpulse;
    const scale = f / (f + d);
    return {
      sx: this.width / 2 + lane * this.laneWidth * scale,
      sy: this.roadVanishY + (this.groundY - this.roadVanishY) * scale,
      scale,
    };
  }

  /**
   * VISUAL model. Applies visualLaneScale on top of the gameplay
   * projection. All renderers (road, decor, player sprite, obstacles)
   * use this so they stay aligned with each other when the visual scene
   * is tightened or widened.
   *
   * @param {number} lane
   * @param {number} distance
   * @returns {{ sx: number, sy: number, scale: number }}
   */
  projectVisual(lane, distance) {
    const d = Math.max(distance, -10);
    const f = this.focal + this.focalImpulse;
    const scale = f / (f + d);
    return {
      sx: this.width / 2 + lane * this.visualLaneWidth * scale,
      sy: this.roadVanishY + (this.groundY - this.roadVanishY) * scale,
      scale,
    };
  }

  /**
   * GAMEPLAY: screen X for a lane at a known scale. Use `visualLaneToScreenX`
   * for visual placement.
   */
  laneToScreenX(lane, scale = 1) {
    return this.width / 2 + lane * this.laneWidth * scale;
  }

  /** VISUAL: screen X for a lane at a known scale. */
  visualLaneToScreenX(lane, scale = 1) {
    return this.width / 2 + lane * this.visualLaneWidth * scale;
  }

  /** GAMEPLAY road extent at base in pixels. */
  get roadBaseHalfWidth() {
    return this.roadHalfLaneUnits * this.laneWidth;
  }

  /** VISUAL road extent at base in pixels. Used by every road / decor renderer. */
  get roadVisualBaseHalfWidth() {
    return this.roadHalfLaneUnits * this.visualLaneWidth;
  }
}
