/**
 * Particles + score popups + full-screen hit flash. Sits on top of all
 * world geometry so VFX always read.
 */
export class EffectsRenderer {
  constructor({ ctx, projection }) {
    this.ctx = ctx;
    this.projection = projection;
  }

  render(world) {
    const ctx = this.ctx;
    if (world.config.gameFeel.particles) {
      for (const particle of world.particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = Math.min(1, particle.life / 22);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (world.config.gameFeel.scorePopups) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const popup of world.scorePopups) {
        const t = popup.life / popup.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.35);
        ctx.font = `900 ${Math.round(18 * popup.scale)}px system-ui, sans-serif`;
        ctx.strokeStyle = 'rgba(22,36,18,0.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(popup.text, popup.x, popup.y);
        ctx.fillStyle = popup.color;
        ctx.fillText(popup.text, popup.x, popup.y);
      }
    }

    if (world.hitFlash > 0) {
      ctx.globalAlpha = world.hitFlash * 0.12;
      ctx.fillStyle = '#ff6464';
      ctx.fillRect(0, 0, this.projection.width, this.projection.height);
    }
    ctx.globalAlpha = 1;
  }
}
