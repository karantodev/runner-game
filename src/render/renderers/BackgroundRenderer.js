import { PARALLAX } from '../constants.js';
import { drawScrollingTile, parallaxOffset } from '../helpers.js';

/**
 * Drifting clouds + three layers of mountain silhouettes behind the road.
 *
 * Mountains now scroll horizontally with wrap-around (honest parallax)
 * instead of the previous sin-drift fake. Each layer uses a different
 * factor so they separate visually as the camera moves.
 */
const MOUNTAIN_SCROLL_FACTOR = {
  far:  0.08,
  mid:  0.13,
  near: 0.18,
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

    this.#drawMountainLayer('backgroundMountainsFar',  p.horizonY - 18, width + 120, MOUNTAIN_SCROLL_FACTOR.far,  scroll, 0.62);
    this.#drawMountainLayer('backgroundMountainsMid',  p.horizonY + 8,  width + 100, MOUNTAIN_SCROLL_FACTOR.mid,  scroll, 0.76);
    this.#drawMountainLayer('backgroundMountainsNear', p.horizonY + 28, width + 84,  MOUNTAIN_SCROLL_FACTOR.near, scroll, 0.88);
  }

  /**
   * Wrap-around horizontal tile for a single mountain layer. Anchors at
   * x = -((width - viewport)/2) so the sprite sits roughly centered on
   * the canvas when scroll = 0.
   */
  #drawMountainLayer(key, y, tileWidth, factor, scroll, alpha) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return;
    const height = tileWidth * (image.naturalHeight / image.naturalWidth);
    const viewW = this.projection.width;
    // Center the un-scrolled tile across the viewport.
    const x0 = (viewW - tileWidth) / 2;
    drawScrollingTile(this.ctx, image, x0, y, tileWidth, height, scroll * factor, alpha);
  }
}
