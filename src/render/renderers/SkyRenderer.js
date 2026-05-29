/**
 * Sky, sun, atmospheric depth & haze, ambient sun rays.
 * Stateless — reads everything from the world and the gradient cache.
 */
export class SkyRenderer {
  constructor({ ctx, projection, assets, sprites, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.gradients = gradients;
  }

  render(world) {
    const ctx = this.ctx;
    const { width, height, horizonY } = this.projection;
    const g = this.gradients.gradients;
    const skyH = g.skyH;

    const skyImg = this.assets.get('backgroundSkyGradient');
    if (skyImg?.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(skyImg, 0, 0, width, skyH);
      ctx.restore();
    } else {
      ctx.fillStyle = g.sky;
      ctx.fillRect(0, 0, width, skyH);
    }
    ctx.fillStyle = g.skyDepth;
    ctx.fillRect(0, 0, width, skyH);

    // v3.8.8 — haze rect widened to match the gradient's new fade-in/out
    // extents (was horizonY-12..+164; now -40..+200). The gradient itself
    // now fades to alpha 0 at both ends, so the rect no longer reads as
    // a hard "atmospheric stripe".
    ctx.fillStyle = g.haze;
    ctx.fillRect(0, horizonY - 40, width, 240);

    if (!this.sprites.draw('backgroundSun', width * 0.28, height * 0.172, height * 0.082, 'center')) {
      ctx.fillStyle = 'rgba(255,248,196,0.40)';
      ctx.beginPath();
      ctx.arc(width * 0.28, height * 0.172, height * 0.082, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,226,0.92)';
      ctx.beginPath();
      ctx.arc(width * 0.28, height * 0.172, height * 0.050, 0, Math.PI * 2);
      ctx.fill();
    }

    if (world.config.gameFeel.ambientMotion) {
      const time = world.timeAlive * 0.012;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fff8cf';
      for (const direction of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(width * (0.28 + direction * 0.04), 88);
        ctx.lineTo(width * (0.28 + direction * 0.13), height * 0.58);
        ctx.lineTo(width * (0.28 + direction * 0.06 + Math.sin(time + direction) * 0.01), height * 0.58);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
