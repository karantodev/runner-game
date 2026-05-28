import { PARALLAX } from '../constants.js';
import { drawScrollingTile, parallaxOffset, roadTopHalfWidth } from '../helpers.js';

/**
 * Distant treeline + castle + forest + meadow + the haze stack that ties
 * the vanishing point into the foreground. Painted between the mountains
 * and the road.
 */
export class LandmarksRenderer {
  constructor({ ctx, projection, assets, sprites, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.gradients = gradients;
  }

  render(world) {
    const ctx = this.ctx;
    const p = this.projection;
    const width = p.width;
    const castleOffset = parallaxOffset(p, world.scrollOffset, PARALLAX.castle, 1.1);
    const castleX = width / 2 + castleOffset;
    const gateY = p.roadVanishY + 34;
    const topHalf = roadTopHalfWidth(p);

    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = '#3f8f44';
    ctx.beginPath();
    ctx.moveTo(0, p.roadVanishY + 78);
    const treeline = [[0.00, 24], [0.08, 18], [0.16, 28], [0.24, 16], [0.32, 30], [0.40, 20], [0.46, 28], [0.54, 28], [0.60, 20], [0.68, 30], [0.76, 16], [0.84, 28], [0.92, 18], [1.00, 24]];
    for (const [xRatio, yOffset] of treeline) {
      const px = xRatio * width + castleOffset * 0.45;
      if (Math.abs(px - castleX) < 132) continue;
      ctx.lineTo(px, p.roadVanishY + 78 + yOffset);
    }
    ctx.lineTo(width, p.roadVanishY + 124);
    ctx.lineTo(0, p.roadVanishY + 124);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.88;
    const castleDrawn = this.sprites.draw('backgroundCastle', castleX, gateY + 6, width * 0.076, 'bottom');
    ctx.restore();
    if (!castleDrawn) {
      const flagWave = world.config.gameFeel.ambientMotion ? Math.sin(world.timeAlive * 0.09) : 0;
      this.#castle(castleX, gateY + 18, flagWave);
    }

    ctx.save();
    ctx.fillStyle = this.gradients.gradients.roadJoin;
    ctx.beginPath();
    ctx.moveTo(castleX - topHalf * 0.42, p.roadVanishY - 4);
    ctx.lineTo(castleX - 26, gateY + 16);
    ctx.lineTo(castleX + 26, gateY + 16);
    ctx.lineTo(castleX + topHalf * 0.42, p.roadVanishY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(235,255,182,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(castleX - topHalf * 0.38, p.roadVanishY - 2);
    ctx.lineTo(castleX - 26, gateY + 14);
    ctx.moveTo(castleX + topHalf * 0.38, p.roadVanishY - 2);
    ctx.lineTo(castleX + 26, gateY + 14);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = this.gradients.gradients.distantHaze;
    ctx.fillRect(0, p.roadVanishY - 90, width, 210);

    ctx.fillStyle = this.gradients.gradients.depthHaze;
    ctx.fillRect(0, p.roadVanishY + 40, width, 70);

    // Forest + meadow now honestly scroll with the road so they look
    // like they're parallaxing past the camera. Castle stays at its
    // sin-drift anchor (it's a focal landmark, not a tiling background).
    const forestImg = this.assets.get('backgroundForestFar');
    if (forestImg?.naturalWidth) {
      const tileW = width + 68;
      const tileH = tileW * (forestImg.naturalHeight / forestImg.naturalWidth);
      drawScrollingTile(ctx, forestImg, -34, p.roadVanishY + 88, tileW, tileH, world.scrollOffset * 0.22, 0.82);
    } else {
      this.#drawSpriteRect('backgroundForestTreeline', -34, p.roadVanishY + 82, width + 68, 130, 0.68);
    }
    const meadowImg = this.assets.get('backgroundMeadowRolling');
    if (meadowImg?.naturalWidth) {
      drawScrollingTile(ctx, meadowImg, -24, p.roadVanishY + 122, width + 48, 76, world.scrollOffset * 0.32, 0.60);
    }
  }

  #drawSpriteRect(key, x, y, width, height, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return true;
  }

  #drawSpriteFullWidth(key, x, y, width, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const height = width * (image.naturalHeight / image.naturalWidth);
    return this.#drawSpriteRect(key, x, y, width, height, alpha);
  }

  #castle(cx, baseY, flagWave = 0) {
    const ctx = this.ctx;
    const scale = this.projection.height / 864;
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(1.22 * scale, 1.22 * scale);
    ctx.fillStyle = 'rgba(56,80,86,0.16)';
    ctx.fillRect(-72, -10, 144, 14);

    ctx.fillStyle = '#9d8aa8';
    ctx.fillRect(-34, -76, 68, 76);
    for (let i = -3; i <= 2; i += 1) ctx.fillRect(-34 + i * 14 + 7, -83, 9, 7);
    ctx.fillStyle = '#8d7d9b';
    ctx.fillRect(-54, -60, 18, 60);
    ctx.fillRect(36, -60, 18, 60);
    ctx.fillStyle = '#d04040';
    ctx.beginPath();
    ctx.moveTo(-57, -60);
    ctx.lineTo(-45, -80);
    ctx.lineTo(-33, -60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(33, -60);
    ctx.lineTo(45, -80);
    ctx.lineTo(57, -60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, -83);
    ctx.lineTo(0, -110);
    ctx.lineTo(16, -83);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(-1, -126, 2, 16);
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.moveTo(1, -126);
    ctx.lineTo(14 + flagWave * 6, -121 + flagWave * 1.5);
    ctx.lineTo(1, -116 + flagWave * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a4a40';
    ctx.fillRect(-9, -26, 18, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(10, -76, 24, 76);
    ctx.fillRect(44, -60, 10, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(-30, -70, 7, 58);
    ctx.fillRect(-50, -55, 4, 45);
    ctx.restore();
  }
}
