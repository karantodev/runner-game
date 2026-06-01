/**
 * Sky, sun, atmospheric depth & haze, ambient sun rays.
 * Stateless — reads everything from the world and the gradient cache.
 *
 * v4.0 — richer sky gradient and warmer sun fallback to match the
 * reference's saturated blue sky + bright warm sun. The asset-driven
 * path is unchanged; the procedural fallback is what we tune here.
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

    // ── Sky base ────────────────────────────────────────────────────
    if (!this._skyFallback || this._skyFallbackH !== skyH) {
      // v4.0: richer procedural sky — deeper blue crown, saturated mid,
      // warm amber near horizon. Built lazily and reused every frame.
      const s = ctx.createLinearGradient(0, 0, 0, skyH);
      s.addColorStop(0.00, '#041a6e');   // deep indigo crown
      s.addColorStop(0.10, '#0830a8');   // strong royal blue
      s.addColorStop(0.22, '#1050c8');   // vivid blue
      s.addColorStop(0.38, '#2072e0');   // sky blue
      s.addColorStop(0.54, '#48a4f0');   // lighter mid-sky
      s.addColorStop(0.70, '#80c8f6');   // near-horizon pale blue
      s.addColorStop(0.84, '#b8dcf8');   // horizon haze
      s.addColorStop(0.93, '#e0eeee');   // warm-cool horizon blend
      s.addColorStop(1.00, '#f0e8c0');   // warm amber at horizon
      this._skyFallback = s;
      this._skyFallbackH = skyH;
    }

    const skyImg = this.assets.get('backgroundSkyGradient');
    if (skyImg?.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(skyImg, 0, 0, width, skyH);
      ctx.restore();
      // v4.0: overlay a subtle blue-tint to punch saturation even on the
      // asset version — keeps color-grade consistent with the fallback.
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = this._skyFallback;
      ctx.fillRect(0, 0, width, skyH);
      ctx.restore();
    } else {
      ctx.fillStyle = this._skyFallback;
      ctx.fillRect(0, 0, width, skyH);
    }

    // Depth vignette on crown (was skyDepth from cache — preserve it).
    ctx.fillStyle = g.skyDepth;
    ctx.fillRect(0, 0, width, skyH);

    // ── Sun ─────────────────────────────────────────────────────────
    // v4.0: larger, warmer, more visible sun. Sprite path unchanged;
    // procedural fallback upgraded from pale yellow to warm golden corona
    // with a bright white-yellow core and a soft atmospheric halo.
    // v4.1 — P1 reference-match: shrink sprite draw size so sun doesn't dominate.
    if (!this.sprites.draw('backgroundSun', width * 0.28, height * 0.172, height * 0.072, 'center')) {
      const sx = width * 0.28;
      const sy = height * 0.172;
      // v4.1 — P1 reference-match: soften halo — smaller radius and lower alpha
      // so the fallback sun doesn't blow out the top-left.
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#ffd060';
      ctx.beginPath();
      ctx.arc(sx, sy, height * 0.085, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Mid glow — golden ring
      ctx.fillStyle = 'rgba(255,218,80,0.55)';
      ctx.beginPath();
      ctx.arc(sx, sy, height * 0.060, 0, Math.PI * 2);
      ctx.fill();
      // Core — bright warm white
      ctx.fillStyle = 'rgba(255,248,200,0.96)';
      ctx.beginPath();
      ctx.arc(sx, sy, height * 0.036, 0, Math.PI * 2);
      ctx.fill();
    }

    // v4.3 — P3 reference-match: god-ray beam drawing removed; the art
    // reference has no beams — just gradient, clouds, and a clean sun.
    // The ambientMotion gate is kept here as a comment so other systems
    // can still reference world.config.gameFeel.ambientMotion freely.
    // if (world.config.gameFeel.ambientMotion) { /* rays removed */ }
  }
}
