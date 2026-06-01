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
  mid:      [0.60, 0.40],  // 60% desaturate, 40% darken
  near:     [0.25, 0.00],  // slight desaturate only
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
    const farDesat  = depthCfg.farDesaturate ?? 0.16;
    const farDarken = depthCfg.farDarken     ?? 0.12;
    const visualOn  = world.config?.visual?.enabled !== false;
    const allowParallax = world.adaptiveQuality?.tier?.parallax !== false;
    const parallaxScale = allowParallax ? 1 : 0;

    // Clouds — keep the existing custom drift (each cloud has its own
    // x and speed handled by world.#updateClouds).
    for (let i = 0; i < world.clouds.length; i += 1) {
      const cloud = world.clouds[i];
      const key = cloud.key ?? `backgroundCloud0${3 + (i % 4)}`;
      const targetW = (cloud.widthPx ?? cloud.radius * 5.25) * (i < 2 || i === 3 ? 0.92 : 0.96);
      const x = cloud.x + parallaxOffset(p, scroll, (0.05 + (i % 3) * 0.015) * parallaxScale, i * 0.9);
      this.sprites.draw(key, x, cloud.y, targetW, 'center');
    }

    // v3.8.8 castle alignment — far further pulled into haze (0.42 → 0.30),
    // and the layer tile widths shifted to break peak alignment with the
    // castle's center. Wider far (+130 → +220) means the visible portion
    // is offset by half a peak; mid widened too. This prevents a mountain
    // peak from sitting directly behind / under the castle silhouette.
    this.#drawMountainLayer(['mountainsFarAlt', 'backgroundMountainsFar'], p.horizonY - 32, width + 220, MOUNTAIN_SCROLL_FACTOR.far * parallaxScale, scroll, 0.42, visualOn ? this.#depthFilter(farDesat, farDarken, DEPTH_LAYER.far) : 'none');
    this.#drawMountainLayer(['backgroundMountainsMid'], p.horizonY + 8, width + 180, MOUNTAIN_SCROLL_FACTOR.mid * parallaxScale, scroll, 0.68, visualOn ? this.#depthFilter(farDesat, farDarken, DEPTH_LAYER.mid) : 'none');

    // The only atmospheric transition over the mountains. Its transparent
    // endpoints and low peak alpha make the horizon soft without a fog bar.
    this.ctx.fillStyle = this.gradients.gradients.horizonVeil;
    this.ctx.fillRect(0, p.horizonY - 54, width, p.roadVanishY - p.horizonY + 186);

    this.#drawMountainLayer(['backgroundMountainsNear'], p.horizonY + 28, width + 140, MOUNTAIN_SCROLL_FACTOR.near * parallaxScale, scroll, 0.90, visualOn ? this.#depthFilter(farDesat, farDarken, DEPTH_LAYER.near) : 'none');

    // v3.8.9 wave — midground layer (designer delivery, was brief priority #5).
    // rolling_hills sits between mountains and treeline — gentle wave-form
    // mass that fills the gap mountains+treeline previously left.
    // treeline_far is a dark silhouette band closer to the road horizon —
    // ties the mountains' bottom into the foreground green field.
    // Scroll factors midway between near mountains (0.22) and the upcoming
    // foreground decor (~0.95) so the depth ramp is continuous.
    this.#drawMountainLayer(['midgroundHills'], p.horizonY + 52, width + 110, 0.34 * parallaxScale, scroll, 0.86, visualOn ? this.#depthFilter(farDesat, farDarken, DEPTH_LAYER.mground) : 'none');
    this.#drawMountainLayer(['midgroundTreeline'], p.horizonY + 78, width + 90, 0.46 * parallaxScale, scroll, 0.90, visualOn ? this.#depthFilter(farDesat, farDarken, DEPTH_LAYER.treeline) : 'none');
    // treeline is closest — no depth overlay (crisp foreground silhouette).
  }

  #depthFilter(farDesat, farDark, [desatScale, darkScale]) {
    const saturation = Math.max(0.4, 1 - farDesat * desatScale);
    const brightness = Math.max(0.55, 1 - farDark * darkScale);
    return `saturate(${saturation}) brightness(${brightness})`;
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
