/**
 * Particle entities + score-popup entities + full-screen hit flash.
 * Sits on top of all world geometry so VFX always read.
 */
export class EffectsRenderer {
  constructor({ ctx, projection }) {
    this.ctx = ctx;
    this.projection = projection;
  }

  render(world) {
    const ctx = this.ctx;
    if (world.config.gameFeel.particles) {
      for (const e of world.registry.query('ParticleTag', 'ScreenPos', 'ParticleData', 'Lifetime')) {
        const pos = e.components.ScreenPos;
        const data = e.components.ParticleData;
        const life = e.components.Lifetime;
        ctx.fillStyle = data.color;
        ctx.globalAlpha = Math.min(1, life.life / 22);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, data.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (world.config.gameFeel.scorePopups) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const e of world.registry.query('ScorePopupTag', 'ScreenPos', 'ScorePopupData', 'Lifetime')) {
        const pos = e.components.ScreenPos;
        const data = e.components.ScorePopupData;
        const life = e.components.Lifetime;
        const t = life.life / life.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.35);
        ctx.font = `900 ${Math.round(18 * data.scale)}px system-ui, sans-serif`;
        ctx.strokeStyle = 'rgba(22,36,18,0.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(data.text, pos.x, pos.y);
        ctx.fillStyle = data.color;
        ctx.fillText(data.text, pos.x, pos.y);
      }
    }

    // Hit flash now lives on the player's Health component.
    const flash = world.player?.components.Health.hitFlash ?? 0;
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.12;
      ctx.fillStyle = '#ff6464';
      ctx.fillRect(0, 0, this.projection.width, this.projection.height);
    }
    ctx.globalAlpha = 1;
  }
}
