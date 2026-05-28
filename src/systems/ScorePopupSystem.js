/**
 * Per-frame score popup motion + lifetime decay. Popups rise, grow
 * slightly, then expire; CleanupSystem reaps the dead ones.
 */
export class ScorePopupSystem {
  update(world, delta) {
    for (const e of world.registry.query('ScorePopupTag', 'ScreenPos', 'ScorePopupData', 'Lifetime')) {
      const pos = e.components.ScreenPos;
      const data = e.components.ScorePopupData;
      const life = e.components.Lifetime;
      pos.y -= data.vy * delta;
      life.life -= delta;
      data.scale = Math.min(1.18, data.scale + 0.03 * delta);
      if (life.life <= 0) e.alive = false;
    }
  }
}
