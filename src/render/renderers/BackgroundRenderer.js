import { PARALLAX } from '../constants.js';
import { parallaxOffset } from '../helpers.js';

/**
 * Drifting clouds + three layers of mountain silhouettes behind the road.
 */
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
    const mountainOffset = parallaxOffset(p, world.scrollOffset, PARALLAX.farBackground, 0.2);

    for (let i = 0; i < world.clouds.length; i += 1) {
      const cloud = world.clouds[i];
      const key = cloud.key ?? `backgroundCloud0${1 + (i % 6)}`;
      const targetW = (cloud.widthPx ?? cloud.radius * 5.25) * (i < 2 || i === 3 ? 0.92 : 0.96);
      const x = cloud.x + parallaxOffset(p, world.scrollOffset, 0.05 + (i % 3) * 0.015, i * 0.9);
      if (!this.sprites.draw(key, x, cloud.y, targetW, 'center')) {
        this.sprites.draw('cloudLarge', x, cloud.y, targetW, 'center');
      }
    }

    this.#drawSpriteFullWidth('backgroundMountainsFar',  -60 + mountainOffset,        p.horizonY - 18, width + 120, 0.62);
    this.#drawSpriteFullWidth('backgroundMountainsMid',  -50 + mountainOffset * 1.18, p.horizonY + 8,  width + 100, 0.76);
    this.#drawSpriteFullWidth('backgroundMountainsNear', -42 + mountainOffset * 1.35, p.horizonY + 28, width + 84,  0.88);
  }

  #drawSpriteFullWidth(key, x, y, width, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const height = width * (image.naturalHeight / image.naturalWidth);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return true;
  }
}
