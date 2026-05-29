import {
  AnimState,
  CollectibleData,
  CrouchState,
  Health,
  Hitbox,
  LaneState,
  PlayerIntent,
  PlayerTag,
  Position,
  ScenicData,
  Scrollable,
  Sprite,
  VerticalState,
} from './components.js';

const OBSTACLE_DEFAULT_ASSET = {
  vine: 'vine_barrier',
  bush: 'spiky_bush_obstacle',
  wheat: 'dry_grass_obstacle',
  wall: 'purple_brick_single',
  mushroom: 'small_center_mushroom',
  stone: 'stone_obstacle',
  overhang: 'low_branch_overhang',
};

const COLLECTIBLE_DEFAULT_ASSET = {
  life: 'heart_full',
  'power-tree': 'speed_tree_pickup',
  'power-mushroom': 'power_mushroom_pickup',
  // v3.1 — new power-up types + rare orchid
  'power-magnet': 'power_magnet_pickup',
  'power-shield': 'power_shield_pickup',
  'power-double': 'power_double_pickup',
  'rare-orchid': 'rare_orchid_pickup',
  flower: 'golden_flower',
};

/**
 * Build the single player entity. There's only ever one.
 * @param {import('./EntityRegistry.js').EntityRegistry} registry
 * @param {object} config — GAME_CONFIG
 */
export function createPlayer(registry, config) {
  return registry.create()
    .add('PlayerTag', PlayerTag())
    .add('LaneState', LaneState())
    .add('VerticalState', VerticalState())
    .add('CrouchState', CrouchState())
    .add('AnimState', AnimState())
    .add('PlayerIntent', PlayerIntent())
    .add('Health', Health(config.gameplay.startLives));
}

/**
 * Build an obstacle entity. `type` chooses default asset + collision rules;
 * `assetType` can override the visual; `overhang` is forced to allLanes.
 *
 * @param {import('./EntityRegistry.js').EntityRegistry} registry
 * @param {{
 *   type: string,
 *   assetType?: string,
 *   lane?: number,
 *   distance: number,
 *   variant?: any,
 *   allLanes?: boolean,
 *   zone?: any,
 * }} opts
 */
export function createObstacle(registry, opts) {
  const {
    type,
    assetType = OBSTACLE_DEFAULT_ASSET[type] ?? 'stone_obstacle',
    lane = 0,
    distance,
    variant = null,
    allLanes = false,
  } = opts;
  const allLanesEffective = type === 'overhang' ? true : allLanes;
  return registry.create()
    .add('Position', Position(lane, distance))
    .add('Hitbox', Hitbox(type, lane, allLanesEffective))
    .add('Sprite', Sprite(type, assetType, variant))
    .add('Scrollable', Scrollable());
}

/**
 * Build a collectible entity (flower / life / power-up).
 *
 * @param {import('./EntityRegistry.js').EntityRegistry} registry
 * @param {{
 *   type?: string,
 *   assetType?: string,
 *   lane?: number,
 *   distance: number,
 *   high?: boolean,
 *   zone?: any,
 * }} opts
 */
export function createCollectible(registry, opts) {
  const {
    type = 'flower',
    assetType = COLLECTIBLE_DEFAULT_ASSET[type] ?? 'golden_flower',
    lane = 0,
    distance,
    high = false,
  } = opts;
  return registry.create()
    .add('Position', Position(lane, distance))
    .add('CollectibleData', CollectibleData(type, high))
    .add('Sprite', Sprite(type, assetType))
    .add('Scrollable', Scrollable());
}

/**
 * Build a scenery entity (decorative midground / foreground side props).
 *
 * @param {import('./EntityRegistry.js').EntityRegistry} registry
 * @param {object} opts
 */
export function createScenery(registry, opts) {
  const {
    type,
    assetType = type,
    lane,
    distance,
    variant = 0,
    scale = 1,
    yOffset = 0,
    laneBand = null,
    zone = null,
    chunkId = null,
  } = opts;
  return registry.create()
    .add('Position', Position(lane, distance))
    .add('Sprite', Sprite(type, assetType, variant, scale, yOffset))
    .add('ScenicData', ScenicData(laneBand, zone, chunkId))
    .add('Scrollable', Scrollable());
}

