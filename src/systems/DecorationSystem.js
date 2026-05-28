import { createScenery } from '../ecs/factories.js';
import { LANE_BANDS, zoneForSide } from '../config/sceneSchema.js';
import { SIDE_DECORATION_PREFABS } from '../config/sceneSchema.data.js';

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
    green_pipe: 'pipe',
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
  constructor(config, projection, rng) {
    this.config = config;
    this.projection = projection;
    this.rng = rng;
    this.weightedChunks = this.#buildWeightedChunks();
    this.reset();
  }

  reset() {
    this.nextLeft = 0;
    this.nextRight = 3.6;
    this.lastChunk = { '-1': null, '1': null };
  }

  prepopulate(world) {
    const start = this.config.spawn.decorStartDistance;
    for (let distance = start; distance < this.projection.maxDistance + 24; distance += this.config.spawn.sideDecorSpacing) {
      this.#spawnSideChunk(world, -1, distance + this.rng.range(-0.7, 0.7));
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

  #spawnSideChunk(world, side, distance) {
    const chunk = this.#pickChunk(side);
    this.lastChunk[String(side)] = chunk.id;

    for (const item of chunk.items) {
      const mirroredLane = side * item.lane;
      const jitter = this.rng.range(-0.028, 0.028);
      const scaleJitter = this.rng.range(0.96, 1.05);
      const variant = this.#resolveVariant(item.variant, item.assetType);
      const zone = zoneForSide(side, item.laneBand ?? LANE_BANDS.SHOULDER);
      createScenery(world.registry, {
        type: assetTypeToSceneryType(item.assetType),
        assetType: item.assetType,
        laneBand: item.laneBand ?? LANE_BANDS.SHOULDER,
        zone,
        lane: mirroredLane + side * jitter,
        distance: distance + item.dist,
        variant,
        scale: item.scale * scaleJitter,
        yOffset: item.yOffset ?? 0,
        chunkId: chunk.id,
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
    let chunk = this.rng.choice(this.weightedChunks);
    const last = this.lastChunk[String(side)];
    for (let i = 0; i < 4 && chunk.id === last; i++) chunk = this.rng.choice(this.weightedChunks);
    return chunk;
  }

  #buildWeightedChunks() {
    const result = [];
    for (const chunk of SIDE_DECORATION_PREFABS) {
      for (let i = 0; i < chunk.weight; i++) result.push(chunk);
    }
    return result;
  }
}
