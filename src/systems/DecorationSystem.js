import { createScenery } from '../ecs/factories.js';
import { LANE_BANDS, zoneForSide } from '../config/sceneSchema.js';
import { HERO_LAYOUT, SIDE_DECORATION_PREFABS, PREFAB_INTENT_BY_ID } from '../config/sceneSchema.data.js';

function assetTypeToSceneryType(assetType) {
  const typeMap = {
    grass_dirt_block: 'terrainBlock',
    grass_dirt_step: 'terrainBlock',
    grass_dirt_wall: 'grassWall',
    purple_flower_single: 'flowerbush',
    yellow_flower_small: 'smallFlower',
    grass_tuft: 'grassTuft',
    sprout_soil: 'sprout',
    mushroom_red_big: 'mushroom',
    mushroom_blue_big: 'mushroomBlue',
    dry_grass_obstacle: 'dryGrass',
    green_pipe: 'planter_pot',  // v3: pipe retired, sceneryDispatch redirects.
    planter_pot: 'planter_pot',
    leaf_clump_small: 'leafClusterLow',
    leaf_clump_round: 'leafClusterCompact',
    purple_brick_single: 'blockStack',
    floating_platform: 'platform',
    fence_wood_short: 'fence',
    tree_round: 'tree',
    bush_large: 'bushLarge',
    bush_large_with_purple_flowers: 'bushLargeFlower',
    bush_with_purple_flowers: 'flowerbush',
    hanging_platform_vines: 'hangingPlatform',
    grass_tuft_small: 'grassTuft',
    grass_tuft_large: 'grassTuftLarge',
  };
  return typeMap[assetType] ?? assetType;
}

export class DecorationSystem {
  /**
   * @param {object} config
   * @param {import('../world/Projection.js').Projection} projection
   * @param {import('../utils/rng.js').Rng} rng
   */
  constructor(config, projection, rng, placement = null) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    // v3.8.37 — Phase 2 placement enforcement. Optional so legacy
    // unit-test paths constructing DecorationSystem standalone don't break.
    this.placement = placement;
    this.weightedChunks = this.#buildWeightedChunks();
    // v3.8.21 — index prefabs by id for HERO_LAYOUT lookups.
    this.prefabsById = new Map(SIDE_DECORATION_PREFABS.map((p) => [p.id, p]));
    this.reset();
  }

  reset() {
    this.nextLeft = 0;
    this.nextRight = 3.6;
    this.lastChunk = { '-1': null, '1': null };
    // v3.8.38 — Phase 4 intent tracking. Avoids consecutive prefabs of
    // the same intent on the same side (e.g., two 'support-stack' beats
    // in a row) so the procedural fill reads as a varied corridor
    // instead of a repeated single composition style.
    this.lastIntent = { '-1': null, '1': null };
  }

  /**
   * v3.8.21 — two-phase prepopulate.
   *
   * PHASE 1: HERO_LAYOUT — place specific prefabs at specific distances
   *          + sides. Deterministic per-run, no RNG noise. The opening
   *          120-150 m always looks like a curated scene.
   *
   * PHASE 2: Procedural variation — weighted random chunks fill the
   *          stretch FROM after the last hero entry TO the horizon, so
   *          deeper visible distances still have variety.
   *
   * Each side runs its own continuation cursor so hero placements on
   * different distances per side don't collide.
   */
  prepopulate(world) {
    const start = this.config.spawn.decorStartDistance;
    const spacing = this.config.spawn.sideDecorSpacing;
    const maxDist = this.projection.maxDistance + 24;

    // Phase 1 — hero entries, jitterless. Track the furthest distance
    // we placed per side so the procedural loop continues from there.
    let lastHeroDistLeft = start - spacing;
    let lastHeroDistRight = start - spacing;
    for (const entry of HERO_LAYOUT) {
      const prefab = this.prefabsById.get(entry.prefabId);
      if (!prefab) continue;
      // v3.8.42 — Phase 7b per-entry scale multiplier. HERO_LAYOUT zones
      // declare a multiplier (1.0 near, 0.75 mid, 0.40 far) so the
      // perspective reads as actual depth instead of "everything is the
      // same size at different positions".
      this.#spawnChunk(world, entry.side, entry.distance, prefab, entry.scaleMultiplier ?? 1);
      if (entry.side < 0) lastHeroDistLeft  = Math.max(lastHeroDistLeft,  entry.distance);
      else                 lastHeroDistRight = Math.max(lastHeroDistRight, entry.distance);
    }

    // Phase 2 — procedural variation past the hero stretch. Step from
    // the last hero distance + spacing so we don't overlap the hand-
    // placed clusters.
    // v3.8.42 — Phase 7b clean castle approach. Hard-floor procStart at
    // 200m so the 150-200m band stays empty (HERO_LAYOUT itself ends at
    // 150m). Without this, procedural fill would creep into the castle
    // approach with even our soft pool, breaking the road→castle axis.
    const PROC_FLOOR = 200;
    const procStartLeft  = Math.max(PROC_FLOOR, lastHeroDistLeft  + spacing);
    const procStartRight = Math.max(PROC_FLOOR, lastHeroDistRight + spacing);
    for (let distance = procStartLeft; distance < maxDist; distance += spacing) {
      this.#spawnSideChunk(world, -1, distance + this.rng.range(-0.7, 0.7));
    }
    for (let distance = procStartRight; distance < maxDist; distance += spacing) {
      this.#spawnSideChunk(world, 1, distance + 3.4 + this.rng.range(-0.7, 0.7));
    }
  }

  update(world, delta) {
    if (world.state !== 'playing') return;
    this.nextLeft -= world.speed * delta;
    this.nextRight -= world.speed * delta;

    if (this.nextLeft <= 0) {
      this.#spawnSideChunk(world, -1, this.projection.maxDistance + this.rng.range(0, 8));
      this.nextLeft = this.#nextSpacing();
    }
    if (this.nextRight <= 0) {
      this.#spawnSideChunk(world, 1, this.projection.maxDistance + this.rng.range(0, 8));
      this.nextRight = this.#nextSpacing();
    }
  }

  /** Procedural path: weighted-random chunk + RNG noise. */
  #spawnSideChunk(world, side, distance) {
    const chunk = this.#pickChunk(side);
    this.lastChunk[String(side)] = chunk.id;
    // v3.8.39 — Phase 5 prefab composition validation. Strict mode skips
    // the whole prefab if support graph is invalid; warn-mode logs once
    // per prefab id and proceeds.
    if (this.placement && !this.placement.shouldSpawnPrefab(chunk, side)) return;
    this.#spawnChunkItems(world, side, distance, chunk, /* useRng */ true);
  }

  /** Deterministic path: explicit prefab, no RNG noise (used by HERO_LAYOUT). */
  #spawnChunk(world, side, distance, prefab, scaleMultiplier = 1) {
    this.lastChunk[String(side)] = prefab.id;
    if (this.placement && !this.placement.shouldSpawnPrefab(prefab, side)) return;
    this.#spawnChunkItems(world, side, distance, prefab, /* useRng */ false, scaleMultiplier);
  }

  #spawnChunkItems(world, side, distance, chunk, useRng, scaleMultiplier = 1) {
    for (const item of chunk.items) {
      const mirroredLane = side * item.lane;
      const jitter = useRng ? this.rng.range(-0.028, 0.028) : 0;
      const scaleJitter = useRng ? this.rng.range(0.96, 1.05) : 1;
      const variant = this.#resolveVariant(item.variant, item.assetType);
      const zone = zoneForSide(side, item.laneBand ?? LANE_BANDS.SHOULDER);
      // v3.8.37 — Phase 2 placement enforcement. Decor items live on
      // side-left / side-right; the validator maps each item's assetType
      // against ASSET_SEMANTICS.placementZones. Adjacency tracking is
      // per-assetType across left+right (so a mushroom cluster on the
      // right counts toward the global min spacing for that mushroom).
      const semanticZone = side === -1 ? 'side-left' : 'side-right';
      if (this.placement
          && !this.placement.shouldSpawn(item.assetType, {
            zone: semanticZone,
            distance: distance + item.dist,
            side,
          })) {
        continue;
      }
      createScenery(world.registry, {
        type: assetTypeToSceneryType(item.assetType),
        assetType: item.assetType,
        laneBand: item.laneBand ?? LANE_BANDS.SHOULDER,
        zone,
        lane: mirroredLane + side * jitter,
        distance: distance + item.dist,
        variant,
        // v3.8.42 — Phase 7b: per-entry scaleMultiplier propagates to
        // every item in the prefab. Multiplied with the per-item scale
        // and the procedural scaleJitter so a single HERO_LAYOUT entry
        // can shrink an entire cluster for perspective depth.
        scale: item.scale * scaleJitter * scaleMultiplier,
        yOffset: (item.yOffset ?? 0) * scaleMultiplier,
        chunkId: chunk.id,
        // v3.8.39 — Phase 5 slot metadata. null when the prefab item
        // hasn't been annotated yet.
        role: item.role ?? null,
        prefabId: chunk.id,
        // v3.8.40 — Phase 6 item identity + zLayer for parent-child
        // line drawing + render-order tie-break.
        itemId: item.id ?? null,
        parentItemId: item.parentId ?? null,
        zLayer: item.zLayer ?? 0,
      });
    }
  }

  #nextSpacing() {
    return this.config.spawn.sideDecorSpacing + this.rng.range(-this.config.spawn.sideDecorJitter, this.config.spawn.sideDecorJitter);
  }

  #resolveVariant(variant, type) {
    if (variant !== undefined) return variant;
    if (type === 'mushroom_red_big') return this.rng.chance(0.55) ? 'red' : 'purple';
    return this.rng.integer(0, 3);
  }

  #pickChunk(side) {
    // v3.8.38 — Phase 4 intent variety. Up to 4 re-rolls to avoid both
    // the same prefab id AND the same intent as the last chunk on this
    // side. Falls back to whatever we picked if 4 attempts can't find a
    // distinct intent (small prefab pools, edge case).
    const key = String(side);
    const lastId = this.lastChunk[key];
    const lastIntent = this.lastIntent[key];
    let chunk = this.rng.choice(this.weightedChunks);
    for (let i = 0; i < 4; i++) {
      const intent = PREFAB_INTENT_BY_ID[chunk.id];
      if (chunk.id !== lastId && intent !== lastIntent) break;
      chunk = this.rng.choice(this.weightedChunks);
    }
    this.lastIntent[key] = PREFAB_INTENT_BY_ID[chunk.id] ?? null;
    return chunk;
  }

  #buildWeightedChunks() {
    // v3.8.41 — Phase 7 art-direction. Prefabs flagged proceduralOk:false
    // (the four hero-layered-* compositions) live exclusively in
    // HERO_LAYOUT's hand-placed anchor slots. Excluding them from the
    // procedural pool prevents heavy hero clusters from landing on top
    // of the curated near-foreground beats.
    const result = [];
    for (const chunk of SIDE_DECORATION_PREFABS) {
      if (chunk.proceduralOk === false) continue;
      for (let i = 0; i < chunk.weight; i++) result.push(chunk);
    }
    return result;
  }
}
