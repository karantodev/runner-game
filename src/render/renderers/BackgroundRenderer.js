import { PARALLAX } from '../constants.js';
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

export class BackgroundRenderer {
  constructor({ ctx, projection, assets, sprites }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
  }

  render(world) {
    const p = this.projection;
    const width = p.width;
    const scroll = world.scrollOffset;

    // Clouds — keep the existing custom drift (each cloud has its own
    // x and speed handled by world.#updateClouds).
    for (let i = 0; i < world.clouds.length; i += 1) {
      const cloud = world.clouds[i];
      const key = cloud.key ?? `backgroundCloud0${1 + (i % 6)}`;
      const targetW = (cloud.widthPx ?? cloud.radius * 5.25) * (i < 2 || i === 3 ? 0.92 : 0.96);
      const x = cloud.x + parallaxOffset(p, scroll, 0.05 + (i % 3) * 0.015, i * 0.9);
      if (!this.sprites.draw(key, x, cloud.y, targetW, 'center')) {
        this.sprites.draw('cloudLarge', x, cloud.y, targetW, 'center');
      }
    }

    // v3.8.8 castle alignment — far further pulled into haze (0.42 → 0.30),
    // and the layer tile widths shifted to break peak alignment with the
    // castle's center. Wider far (+130 → +220) means the visible portion
    // is offset by half a peak; mid widened too. This prevents a mountain
    // peak from sitting directly behind / under the castle silhouette.
    this.#drawMountainLayer(['mountainsFarAlt', 'backgroundMountainsFar'], p.horizonY - 32, width + 220, MOUNTAIN_SCROLL_FACTOR.far,  scroll, 0.30);
    this.#drawMountainLayer(['backgroundMountainsMid'],  p.horizonY + 8,  width + 180, MOUNTAIN_SCROLL_FACTOR.mid,  scroll, 0.62);
    this.#drawMountainLayer(['backgroundMountainsNear'], p.horizonY + 28, width + 140, MOUNTAIN_SCROLL_FACTOR.near, scroll, 0.88);

    // v3.8.9 wave — midground layer (designer delivery, was brief priority #5).
    // rolling_hills sits between mountains and treeline — gentle wave-form
    // mass that fills the gap mountains+treeline previously left.
    // treeline_far is a dark silhouette band closer to the road horizon —
    // ties the mountains' bottom into the foreground green field.
    // Scroll factors midway between near mountains (0.22) and the upcoming
    // foreground decor (~0.95) so the depth ramp is continuous.
    this.#drawMountainLayer(['midgroundHills'],    p.horizonY + 52, width + 110, 0.34, scroll, 0.82);
    this.#drawMountainLayer(['midgroundTreeline'], p.horizonY + 78, width + 90,  0.46, scroll, 0.86);
  }

  /**
   * Wrap-around horizontal tile for a single mountain layer. Anchors at
   * x = -((width - viewport)/2) so the sprite sits roughly centered on
   * the canvas when scroll = 0.
   */
  #drawMountainLayer(keys, y, tileWidth, factor, scroll, alpha) {
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
    drawScrollingTile(this.ctx, image, x0, y, tileWidth, height, scroll * factor, alpha);
  }
}
