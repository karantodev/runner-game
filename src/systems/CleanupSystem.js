/**
 * Final pass each tick — sweeps dead entities and culls scrollables
 * that have passed the player. Single registry.compact() call walks
 * the entity list once, so the cull predicate also evaluates "passed"
 * checks in line.
 */
export class CleanupSystem {
  update(world) {
    const sceneryCull = world.config.spawn.sideDecorNearCullDistance;
    world.registry.compact((e) => {
      if (!e.alive) return false;
      const pos = e.components.Position;
      if (pos) {
        // Obstacles + collectibles + scenery share the same culling rules.
        if ('Hitbox' in e.components && pos.distance <= -4) return false;
        if ('CollectibleData' in e.components) {
          if (pos.distance <= -4) return false;
          if (e.components.CollectibleData.collected) return false;
        }
        if ('ScenicData' in e.components && pos.distance <= sceneryCull) return false;
      }
      return true;
    });
  }
}
