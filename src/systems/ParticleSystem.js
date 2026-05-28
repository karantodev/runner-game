/**
 * Per-frame particle physics + lifetime decay. Dead particles are
 * marked `alive = false`; CleanupSystem evicts them from the registry.
 */
export class ParticleSystem {
  update(world, delta) {
    for (const e of world.registry.query('ParticleTag', 'ScreenPos', 'ParticleData', 'Lifetime')) {
      const pos = e.components.ScreenPos;
      const data = e.components.ParticleData;
      const life = e.components.Lifetime;
      pos.x += data.vx * delta;
      pos.y += data.vy * delta;
      data.vy += data.gravity * delta;
      life.life -= delta;
      if (life.life <= 0) e.alive = false;
    }
  }
}
