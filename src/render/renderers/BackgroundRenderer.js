import { drawScrollingTile, parallaxOffset } from '../helpers.js';

/**
 * Drifting clouds + three layers of mountain silhouettes behind the road.
 *
 * Mountains now scroll horizontally with wrap-around (honest parallax)
 * instead of the previous sin-drift fake. Each layer uses a different
 * factor so they separate visually as the camera moves.
 */
// v3.8.11 — mountain parallax cut sharply. User flagged mountains
// reading as "moving with the road"; the castle is the focal anchor and
// any visible mountain drift competes with the road→castle axis.
// Mountains now read as near-fixed background, with only the faintest
// drift to suggest depth.
//   far:  0.015 — visually static
//   mid:  0.04  — almost imperceptible
//   near: 0.10  — gentle drift only
// Midground hills + treeline_far still scroll at higher factors (0.34 /
// 0.46) so the road's foreground motion telegraph is preserved.
const MOUNTAIN_SCROLL_FACTOR = {
  far:  0.015,
  mid:  0.04,
  near: 0.10,
};

// v4.8 — depth desaturation / darkening per layer.
// The values are applied while each sprite is drawn, so transparent pixels
// stay transparent. Previous rectangular overlays were the source of the
// visible horizontal fog bands around the mountains.
const DEPTH_LAYER = {
  // [desaturateStrength, darkenStrength] relative to base config values
  far:      [1.00, 1.00],  // full farDesaturate + farDarken
  mid:      [0.60, 0.55],  // 60% desaturate, 55% darken (M158: V~.51 target)
  near:     [0.25, 0.00],  // slight desaturate only
  forest:   [0.34, 0.10],  // soft silhouette bridge before the hills
  mground:  [0.10, 0.00],  // barely touched (closer to player)
  treeline: [0.05, 0.00],  // nearly pristine
};

export class BackgroundRenderer {
  constructor({ ctx, projection, assets, sprites, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.gradients = gradients;
  }

  render(world) {
    const p = this.projection;
    const width = p.width;
    const scroll = world.scrollOffset;

    // Read depth config (safe fallback to gameConfig defaults).
    const depthCfg = world.config?.visual?.depth ?? {};
    const farDesat    = depthCfg.farDesaturate ?? 0.16;
    const farDarken   = depthCfg.farDarken     ?? 0.12;
    // M157: hue-rotate far/mid mountain layers so their measured teal hue
    // (H186) shifts toward the reference's green-grey (H150-165). Applied
    // only to the far and mid mountain layers; near mountains and forest
    // layers stay unrotated so the scene transition reads naturally.
    const farHueRot   = depthCfg.farHueRotate  ?? 0;
    const visualOn  = world.config?.visual?.enabled !== false;
    const allowParallax = world.adaptiveQuality?.tier?.parallax !== false;
    const parallaxScale = allowParallax ? 1 : 0;

    // Clouds — keep the existing custom drift (each cloud has its own
    // x and speed handled by world.#updateClouds).
    for (let i = 0; i < world.clouds.length; i += 1) {
      const cloud = world.clouds[i];
      const key = cloud.key;
      // v4.9 — keep the sky active without letting the largest clouds steal
      // focus from the road-to-castle axis.
      const targetW = (cloud.widthPx ?? cloud.radius * 5.25) * (i < 2 || i === 3 ? 0.86 : 0.92);
      const x = cloud.x + parallaxOffset(p, scroll, (0.05 + (i % 3) * 0.015) * parallaxScale, i * 0.9);
      this.sprites.draw(key, x, cloud.y, targetW, 'center');
    }

    // v3.8.8 castle alignment — far further pulled into haze (0.42 → 0.30),
    // and the layer tile widths shifted to break peak alignment with the
    // castle's center. Wider far (+130 → +220) means the visible portion
    // is offset by half a peak; mid widened too. This prevents a mountain
    // peak from sitting directly behind / under the castle silhouette.
    this.#drawMountainLayer(['mountainsFarAlt', 'backgroundMountainsFar'], p.horizonY - 12, width + 30, MOUNTAIN_SCROLL_FACTOR.far * parallaxScale, scroll, 0.78, visualOn ? this.#depthFilter(farDesat, farDarken, farHueRot, DEPTH_LAYER.far) : 'none');
    this.#drawMountainLayer(['backgroundMountainsMid'], p.horizonY, width + 20, MOUNTAIN_SCROLL_FACTOR.mid * parallaxScale, scroll, 0.88, visualOn ? this.#depthFilter(farDesat, farDarken, farHueRot, DEPTH_LAYER.mid) : 'none');

    // The only atmospheric transition over the mountains. Its transparent
    // endpoints and low peak alpha make the horizon soft without a fog bar.
    this.ctx.fillStyle = this.gradients.gradients.horizonVeil;
    this.ctx.fillRect(0, p.horizonY - 24, width, p.roadVanishY - p.horizonY + 100);

    this.#drawMountainLayer(['backgroundMountainsNear'], p.horizonY + 8, width + 10, MOUNTAIN_SCROLL_FACTOR.near * parallaxScale, scroll, 0.95, visualOn ? this.#depthFilter(farDesat, farDarken, 0, DEPTH_LAYER.near) : 'none');

    // v4.18 — replace the spiky horizon treelines with a soft compressed
    // forest band. This restores vegetation behind the road without the
    // conifer-like peaks that were poking awkwardly into the mountain layer.
    const distantForest = this.assets.get('backgroundForestFar');
    if (distantForest?.naturalWidth) {
      this.ctx.save();
      this.ctx.filter = visualOn ? this.#depthFilter(farDesat, farDarken, 0, DEPTH_LAYER.forest) : 'none';
      drawScrollingTile(
        this.ctx,
        distantForest,
        -52,
        p.horizonY + 38,
        width + 104,
        32,
        scroll * 0.18 * parallaxScale,
        0.24,
      );
      this.ctx.restore();
    }
  }

  #depthFilter(farDesat, farDark, hueRotateDeg, [desatScale, darkScale]) {
    const saturation = Math.max(0.4, 1 - farDesat * desatScale);
    // M157: lower the brightness floor from 0.55 → 0.38 so that far mountain
    // layers can reach the reference's darker value (V~0.50-0.58) without
    // hitting an artificial ceiling. Minimum 0.38 keeps silhouettes visible.
    const brightness = Math.max(0.38, 1 - farDark * darkScale);
    // M157: optional hue-rotate shifts mountain teal (H186) toward the
    // reference's green-grey (H150-165). Zero means no rotation so the
    // near/forest layers are unaffected.
    const hueRotate = hueRotateDeg !== 0 ? ` hue-rotate(${hueRotateDeg}deg)` : '';
    return `saturate(${saturation}) brightness(${brightness})${hueRotate}`;
  }

  /**
   * Wrap-around horizontal tile for a single mountain layer. Anchors at
   * x = -((width - viewport)/2) so the sprite sits roughly centered on
   * the canvas when scroll = 0.
   */
  #drawMountainLayer(keys, y, tileWidth, factor, scroll, alpha, filter = 'none') {
    // v3.6: accept either a single key (legacy) or an ordered fallback list.
    const list = Array.isArray(keys) ? keys : [keys];
    let image = null;
    for (const k of list) {
      const img = this.assets.get(k);
      if (img && img.naturalWidth) { image = img; break; }
    }
    if (!image) return;
    const height = tileWidth * (image.naturalHeight / image.naturalWidth);
    const viewW = this.projection.width;
    // Center the un-scrolled tile across the viewport.
    const x0 = (viewW - tileWidth) / 2;
    const ctx = this.ctx;
    ctx.save();
    ctx.filter = filter;
    drawScrollingTile(ctx, image, x0, y, tileWidth, height, scroll * factor, alpha);
    ctx.restore();
  }
}
