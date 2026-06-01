/**
 * Scrolls every entity carrying Position + Scrollable toward the player
 * by `world.speed * delta * factor`. Also advances the per-collectible
 * bobbing phase (`CollectibleData.t`) since it ties into the same tick.
 */
export class MovementSystem {
  update(world, delta) {
    const travel = world.speed * delta;
    for (const e of world.registry.query('Position', 'Scrollable')) {
      const pos = e.components.Position;
      pos.previousDistance = pos.distance;
      pos.distance -= travel * e.components.Scrollable.factor;
    }
    for (const e of world.registry.query('CollectibleData')) {
      e.components.CollectibleData.t += 0.2 * delta;
    }
  }
}
