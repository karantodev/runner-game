import { drawScrollingTile } from '../helpers.js';

/**
 * Renders a far tree-line that fills the hazy band between the mountain
 * silhouettes and the playfield corridor vanishing point. This is the empty
 * gap visible in the native-scale comparison against the reference.
 *
 * Geometry:
 *   - Strip bottom Y = roadVanishY + landmarkOffset (just above the
 *     LandmarksRenderer ground polygon at roadVanishY + 78).
 *   - Strip top Y = stripBottomY - stripHeightPx, where stripHeightPx is
 *     sized so tree canopies reach up to (or just above) the horizon line,
 *     filling the hazy gap.
 *   - Each tree is sized to `treeHeightFraction × stripHeightPx`, keeping
 *     the silhouette proportional regardless of canvas resolution.
 *
 * Performance contract:
 *   - All tree sprites composed ONCE into an OffscreenCanvas; rebuilt only
 *     when viewport size or visual config changes.
 *   - Each frame: one `drawScrollingTile` call = at most 2 `drawImage` blits.
 *   - No per-frame object allocation, no ctx.save/restore in the hot path.
 *
 * Determinism:
 *   Layout uses a fixed linear-congruential sequence seeded by a constant.
 *   Never calls `Math.random()` or draws from `world.rng` — the treeline is a
 *   static visual backdrop, not part of the seeded simulation.
 */
export class HorizonTreelineRenderer {
  /**
   * @param {{ ctx: CanvasRenderingContext2D, projection: import('../../world/Projection.js').Projection, assets: import('../../core/AssetManager.js').AssetManager }} deps
   */
  constructor({ ctx, projection, assets }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;

    /** @type {HTMLCanvasElement | OffscreenCanvas | null} */
    this._strip = null;
    // Individual primitive config fields used for change-detection.
    // Avoids JSON.stringify(cfg) (~300-char string allocation at 60fps) — the
    // horizon config is static at runtime, so primitive comparison is sufficient
    // and keeps this hot path allocation-free as promised in the class header.
    /** @type {number} — viewport width at last build */
    this._builtForWidth = 0;
    /** @type {number} — viewport height at last build */
    this._builtForHeight = 0;
    /** @type {number} */ this._builtDensity = -1;
    /** @type {number} */ this._builtTreeHeightMin = -1;
    /** @type {number} */ this._builtTreeHeightMax = -1;
    /** @type {number} */ this._builtDarkenFactor = -1;
    /** @type {number} */ this._builtBaselineRatio = -1;
    /** @type {number} */ this._builtLandmarkOffset = -1;
    /** @type {number} */ this._builtAboveHorizon = -1;
  }

  render(world) {
    const cfg = world.config?.visual?.horizon;
    if (!cfg?.enabled) return;
    if (world.config?.visual?.enabled === false) return;

    const p = this.projection;
    const treeImg = this.assets.get('treeRoundSprite');
    if (!treeImg?.naturalWidth) return;

    this.#ensureStrip(treeImg, p, cfg);
    if (!this._strip) return;

    const scroll = world.scrollOffset;
    const allowParallax = world.adaptiveQuality?.tier?.parallax !== false;
    // Horizon treeline parallax: slower than mountains (0.015) but perceptibly
    // different from the static sky — reads as a mid-far layer.
    const factor = (cfg.scrollFactor ?? 0.09) * (allowParallax ? 1 : 0);
    const alpha = cfg.alpha ?? 0.80;

    const stripH = this._strip.height;
    const stripTopY = this.#stripTopY(p, cfg);
    drawScrollingTile(this.ctx, this._strip, 0, stripTopY, this._strip.width, stripH, scroll * factor, alpha);
  }

  // ── Strip lifecycle ────────────────────────────────────────────────────────

  /**
   * Rebuild the cached strip if viewport size or config changed.
   *
   * @param {HTMLImageElement} treeImg
   * @param {import('../../world/Projection.js').Projection} p
   * @param {object} cfg
   */
  #ensureStrip(treeImg, p, cfg) {
    const density       = cfg.density          ?? 14;
    const heightMin     = cfg.treeHeightMin    ?? 0.55;
    const heightMax     = cfg.treeHeightMax    ?? 0.95;
    const darken        = cfg.darkenFactor     ?? 0.62;
    const baseline      = cfg.baselineRatio    ?? 0.88;
    const landmark      = cfg.landmarkOffset   ?? 72;
    const aboveHorizon  = cfg.aboveHorizon     ?? 32;
    if (
      this._strip
      && this._builtForWidth      === p.width
      && this._builtForHeight     === p.height
      && this._builtDensity       === density
      && this._builtTreeHeightMin === heightMin
      && this._builtTreeHeightMax === heightMax
      && this._builtDarkenFactor  === darken
      && this._builtBaselineRatio === baseline
      && this._builtLandmarkOffset === landmark
      && this._builtAboveHorizon  === aboveHorizon
    ) return;

    this._strip = this.#buildStrip(treeImg, p, cfg);
    this._builtForWidth       = p.width;
    this._builtForHeight      = p.height;
    this._builtDensity        = density;
    this._builtTreeHeightMin  = heightMin;
    this._builtTreeHeightMax  = heightMax;
    this._builtDarkenFactor   = darken;
    this._builtBaselineRatio  = baseline;
    this._builtLandmarkOffset = landmark;
    this._builtAboveHorizon   = aboveHorizon;
  }

  /**
   * Build the immutable offscreen tree-line strip.
   *
   * Trees are bottom-anchored at `baselineRatio × stripH` inside the strip.
   * Each tree height = `treeHeightFraction × stripH`, so the silhouette fills
   * the band vertically without any absolute pixel numbers.
   *
   * @param {HTMLImageElement} treeImg
   * @param {import('../../world/Projection.js').Projection} p
   * @param {object} cfg
   * @returns {HTMLCanvasElement | OffscreenCanvas}
   */
  #buildStrip(treeImg, p, cfg) {
    const stripH = this.#stripHeight(p, cfg);
    // 2× viewport width for seamless wrap-around tiling on a single blit.
    const stripW = p.width * 2;

    const canvas = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(stripW, stripH)
      : Object.assign(document.createElement('canvas'), { width: stripW, height: stripH });
    const t = canvas.getContext('2d');

    const treeAspect = treeImg.naturalHeight / treeImg.naturalWidth;
    const density          = cfg.density          ?? 14;
    const treeHeightMin    = cfg.treeHeightMin    ?? 0.55;
    const treeHeightMax    = cfg.treeHeightMax    ?? 0.95;
    const darkenFactor     = cfg.darkenFactor     ?? 0.62;
    const baselineRatio    = cfg.baselineRatio    ?? 0.88;

    // Deterministic LCG — fixed seed 0xdeadbeef, never calls Math.random() or
    // world.rng. The treeline is a static backdrop; constant layout is correct.
    const LCG_A = 1664525;
    const LCG_C = 1013904223;
    let state = 0xdeadbeef;
    const lcg = () => { state = ((LCG_A * state + LCG_C) >>> 0); return state / 0x100000000; };

    t.imageSmoothingEnabled = false;

    const baselineY = Math.round(stripH * baselineRatio);
    // Strip is 2× viewport wide; density controls trees per viewport-width.
    const count = Math.round(density * 2);

    for (let i = 0; i < count; i += 1) {
      // Tree height as a fraction of strip height, so they scale with the band.
      const heightFrac = treeHeightMin + lcg() * (treeHeightMax - treeHeightMin);
      const treeHpx = Math.round(stripH * heightFrac);
      const treeWpx = Math.round(treeHpx / treeAspect);

      // Spread evenly across the strip with per-tree jitter (±12% of spacing).
      const spacing = stripW / count;
      const jitter  = (lcg() - 0.5) * spacing * 0.24;
      const cx = i * spacing + spacing * 0.5 + jitter;
      const x  = Math.round(cx - treeWpx / 2);
      const y  = baselineY - treeHpx;

      // Raw sprite pass.
      t.globalCompositeOperation = 'source-over';
      t.globalAlpha = 1;
      t.drawImage(treeImg, x, y, treeWpx, treeHpx);

      // Darken + desaturate via source-atop so the tint stays inside each
      // sprite's alpha channel — no rectangular halos around transparent edges.
      // Dark forest-green fill at darkenFactor alpha.
      t.globalCompositeOperation = 'source-atop';
      t.globalAlpha = darkenFactor;
      t.fillStyle = 'rgb(12, 28, 10)';
      t.fillRect(x, y, treeWpx, treeHpx);
    }

    // Restore safe defaults.
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'source-over';
    return canvas;
  }

  // ── Geometry helpers ───────────────────────────────────────────────────────

  /**
   * Top Y of the strip on the main canvas.
   * Strip bottom = roadVanishY + landmarkOffset; strip top = bottom − stripH.
   */
  #stripTopY(p, cfg) {
    const landmarkOffset = cfg.landmarkOffset ?? 72;
    return p.roadVanishY + landmarkOffset - this.#stripHeight(p, cfg);
  }

  /**
   * Strip pixel height.
   *
   * Sized so trees tall enough to reach just above the near-mountain layer
   * (which ends at roughly horizonY + 70). The strip extends from
   * `roadVanishY + landmarkOffset` upward by this amount, so:
   *   stripBottomY - stripH ≤ horizonY + 38   (fill the gap, overlap a touch)
   *
   * Concretely: height = roadVanishY + landmarkOffset - (horizonY + aboveHorizon),
   * clamped to a minimum for tiny viewports.
   */
  #stripHeight(p, cfg) {
    const landmarkOffset = cfg.landmarkOffset ?? 72;
    const aboveHorizon   = cfg.aboveHorizon   ?? 32;
    // Span from just above the mountains down to the landmark polygon.
    const h = (p.roadVanishY + landmarkOffset) - (p.horizonY + aboveHorizon);
    return Math.max(8, Math.round(h));
  }
}


