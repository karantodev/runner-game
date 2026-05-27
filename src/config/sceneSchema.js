export const SCENE_ZONES = Object.freeze({
  MAIN_LANE_1: 'main_lane_1',
  MAIN_LANE_2: 'main_lane_2',
  MAIN_LANE_3: 'main_lane_3',
  SHOULDER_LEFT: 'shoulder_left',
  SHOULDER_RIGHT: 'shoulder_right',
  STRUCTURE_LEFT: 'structure_left',
  STRUCTURE_RIGHT: 'structure_right',
  NATURE_LEFT: 'nature_left',
  NATURE_RIGHT: 'nature_right',
  BACKGROUND_MID: 'background_mid',
  BACKGROUND_FAR: 'background_far',
  UI: 'ui',
});

export const LANE_BANDS = Object.freeze({
  PLAY: 'play',
  SHOULDER: 'shoulder',
  STRUCTURE: 'structure',
  NATURE: 'nature',
});

export const ASSET_TYPES = Object.freeze({
  road_lane_tile: { group: 'core_lanes', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '3 lanes' },
  road_perspective_lines: { group: 'core_lanes', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: false, footprint: 'overlay' },
  player_farmer: { group: 'core_lanes', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  golden_flower: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  heart_full: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  speed_tree_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  power_mushroom_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  vine_barrier: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '2-3 lanes' },
  spiky_bush_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  dry_grass_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  small_center_mushroom: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  stone_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  purple_brick_single: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  purple_brick_platform_3: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  question_block: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  green_pipe: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  floating_platform: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2-3 tiles' },
  grass_dirt_block: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  grass_dirt_step: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2 lanes' },
  grass_dirt_wall: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  purple_flower_single: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  yellow_flower_small: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  grass_tuft: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  wheat_tuft: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  sprout_soil: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  leaf_clump_small: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  leaf_clump_round: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'medium' },
  mushroom_red_big: { group: 'decor_large', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  mushroom_blue_big: { group: 'decor_large', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  tree_round: { group: 'decor_large', zone: SCENE_ZONES.NATURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  fence_wood_short: { group: 'decor_large', zone: SCENE_ZONES.NATURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  bush_large: { group: 'decor_large', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: '1-2 lanes' },
  bush_large_with_purple_flowers: { group: 'decor_large', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: '1-2 lanes' },
  bush_with_purple_flowers: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'medium' },
  hanging_platform_vines: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2-3 tiles' },
  grass_tuft_small: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  grass_tuft_large: { group: 'decor_small', zone: SCENE_ZONES.SHOULDER_LEFT, gameplay: false, footprint: 'small' },
  sky_gradient: { group: 'background', zone: SCENE_ZONES.BACKGROUND_FAR, gameplay: false, footprint: 'full screen' },
  cloud_large: { group: 'background', zone: SCENE_ZONES.BACKGROUND_FAR, gameplay: false, footprint: 'far layer' },
  mountains_far: { group: 'background', zone: SCENE_ZONES.BACKGROUND_FAR, gameplay: false, footprint: 'far layer' },
  mountains_mid: { group: 'background', zone: SCENE_ZONES.BACKGROUND_MID, gameplay: false, footprint: 'mid layer' },
  forest_far: { group: 'background', zone: SCENE_ZONES.BACKGROUND_MID, gameplay: false, footprint: 'mid layer' },
  meadow_far: { group: 'background', zone: SCENE_ZONES.BACKGROUND_MID, gameplay: false, footprint: 'mid layer' },
  castle_far: { group: 'background', zone: SCENE_ZONES.BACKGROUND_FAR, gameplay: false, footprint: 'focal point' },
});

export function zoneForMainLane(lane) {
  if (lane <= -1) return SCENE_ZONES.MAIN_LANE_1;
  if (lane >= 1) return SCENE_ZONES.MAIN_LANE_3;
  return SCENE_ZONES.MAIN_LANE_2;
}

export function zoneForSide(side, band) {
  if (band === LANE_BANDS.SHOULDER) return side < 0 ? SCENE_ZONES.SHOULDER_LEFT : SCENE_ZONES.SHOULDER_RIGHT;
  if (band === LANE_BANDS.STRUCTURE) return side < 0 ? SCENE_ZONES.STRUCTURE_LEFT : SCENE_ZONES.STRUCTURE_RIGHT;
  return side < 0 ? SCENE_ZONES.NATURE_LEFT : SCENE_ZONES.NATURE_RIGHT;
}

export const SIDE_DECORATION_PREFABS = Object.freeze([
  {
    id: 'cliff-flower-meadow',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.46, dist: 0.0, scale: 1.06, variant: 0 },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: 0.9, scale: 0.48 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.0, scale: 0.32 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 1.8, scale: 0.46 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: -2.0, scale: 0.29 },
    ],
  },
  {
    id: 'grass-wall-mushroom',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 2.42, dist: 0.2, scale: 1.04, variant: 1 },
      { assetType: 'mushroom_red_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist: -0.7, scale: 0.52, variant: 'red' },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: -1.8, scale: 0.44 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist: 1.3, scale: 0.30 },
      { assetType: 'dry_grass_obstacle', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: 2.1, scale: 0.43 },
    ],
  },
  {
    id: 'pipe-vine-garden',
    weight: 2,
    items: [
      { assetType: 'green_pipe', laneBand: LANE_BANDS.STRUCTURE, lane: 2.44, dist: -0.1, scale: 0.84 },
      { assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 1.1, scale: 0.58 },
      { assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: -1.6, scale: 0.54 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist: 1.9, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -0.7, scale: 0.31 },
    ],
  },
  {
    id: 'blockstack-platform',
    weight: 2,
    items: [
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.48, dist: 0.0, scale: 0.80, variant: 1 },
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.82, dist: -0.9, scale: 0.76, variant: 0 },
      { assetType: 'dry_grass_obstacle', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist: 1.2, scale: 0.45 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.5, scale: 0.30 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 2.2, scale: 0.28 },
    ],
  },
  {
    id: 'fence-flower-row',
    weight: 3,
    items: [
      { assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 2.52, dist: 0.1, scale: 0.74 },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: -1.0, scale: 0.46 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist: 1.5, scale: 0.30 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist: -1.7, scale: 0.44 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: 2.2, scale: 0.28 },
    ],
  },
  {
    id: 'platform-high-cliff',
    weight: 2,
    items: [
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.78, dist: 0.3, scale: 0.86, variant: 1 },
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.42, dist: -1.1, scale: 0.92, variant: 2 },
      { assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist: 0.8, scale: 0.54 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: -1.9, scale: 0.28 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 2.1, scale: 0.29 },
    ],
  },
  {
    id: 'organic-meadow',
    weight: 4,
    items: [
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist: 0.0, scale: 0.52 },
      { assetType: 'mushroom_red_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: -1.0, scale: 0.50, variant: 'purple' },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: 1.5, scale: 0.33 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: -1.9, scale: 0.28 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 2.3, scale: 0.47 },
    ],
  },
  {
    id: 'leaf-forest-edge',
    weight: 3,
    items: [
      { assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.78, dist: 0.0, scale: 0.64 },
      { assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist: -1.2, scale: 0.56 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.85, dist: 1.7, scale: 0.46 },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: -0.7, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: 2.3, scale: 0.29 },
    ],
  },
  {
    id: 'blue-mushroom-grove',
    weight: 2,
    items: [
      { assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 0.2, scale: 0.62 },
      { assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.1, scale: 0.52 },
      { assetType: 'dry_grass_obstacle', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 1.5, scale: 0.48 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.58, dist: -1.9, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.40, dist: 2.1, scale: 0.28 },
    ],
  },
  // ── Chunks using new high-quality sprites ───────────────────────────────────
  {
    id: 'large-bush-garden',
    weight: 3,
    items: [
      { assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist:  0.0, scale: 0.68 },
      { assetType: 'yellow_flower_small',            laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist: -1.1, scale: 0.30 },
      { assetType: 'grass_tuft_small',               laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist:  1.5, scale: 0.44 },
      { assetType: 'yellow_flower_small',            laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: -2.1, scale: 0.27 },
      { assetType: 'sprout_soil',                    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.3, scale: 0.28 },
    ],
  },
  {
    id: 'hanging-platform-garden',
    weight: 2,
    items: [
      { assetType: 'hanging_platform_vines', laneBand: LANE_BANDS.STRUCTURE, lane: 2.54, dist:  0.0, scale: 0.82 },
      { assetType: 'grass_dirt_block',       laneBand: LANE_BANDS.STRUCTURE, lane: 2.40, dist: -1.2, scale: 0.90, variant: 0 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist:  0.9, scale: 0.52 },
      { assetType: 'grass_tuft_large',       laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.7, scale: 0.50 },
      { assetType: 'yellow_flower_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.1, scale: 0.29 },
    ],
  },
  {
    id: 'big-bush-wall',
    weight: 2,
    items: [
      { assetType: 'grass_dirt_wall',              laneBand: LANE_BANDS.STRUCTURE, lane: 2.44, dist:  0.1, scale: 1.02, variant: 0 },
      { assetType: 'bush_large',                   laneBand: LANE_BANDS.SHOULDER, lane: 1.78, dist: -0.8, scale: 0.66 },
      { assetType: 'yellow_flower_small',          laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist:  1.4, scale: 0.30 },
      { assetType: 'grass_tuft_small',             laneBand: LANE_BANDS.SHOULDER, lane: 1.85, dist: -1.9, scale: 0.44 },
      { assetType: 'sprout_soil',                  laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist:  2.2, scale: 0.28 },
    ],
  },
]);

export const MIDGROUND_SCENERY = Object.freeze([
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.06, distance: 184, scale: 1.42, variant: 0, yOffset: -18 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.88, distance: 174, scale: 1.10, variant: 1, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.00, distance: 163, scale: 1.30, variant: 0, yOffset: -14 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.90, distance: 153, scale: 0.62, variant: 0, yOffset: -2 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.94, distance: 138, scale: 1.06, variant: 0, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.04, distance: 124, scale: 1.22, variant: 0, yOffset: -16 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.88, distance: 114, scale: 0.58, variant: 0, yOffset: -4 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.92, distance: 97, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.02, distance: 84, scale: 1.18, variant: 0, yOffset: -14 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.90, distance: 73, scale: 0.56, variant: 0, yOffset: -2 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.94, distance: 60, scale: 1.02, variant: 0, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.06, distance: 48, scale: 1.14, variant: 0, yOffset: -12 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.90, distance: 38, scale: 0.54, variant: 0, yOffset: -4 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.86, distance: 27, scale: 0.98, variant: 1, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.02, distance: 18, scale: 1.10, variant: 0, yOffset: -10 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.92, distance: 10, scale: 0.52, variant: 0, yOffset: -2 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.90, distance: 188, scale: 1.14, variant: 0, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.04, distance: 178, scale: 1.38, variant: 0, yOffset: -16 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.90, distance: 168, scale: 0.60, variant: 0, yOffset: -2 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.00, distance: 157, scale: 1.26, variant: 0, yOffset: -14 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.88, distance: 143, scale: 1.08, variant: 1, yOffset: 0 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.92, distance: 131, scale: 0.56, variant: 0, yOffset: -4 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.06, distance: 119, scale: 1.20, variant: 0, yOffset: -16 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.90, distance: 104, scale: 1.04, variant: 0, yOffset: 0 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.88, distance: 91, scale: 0.54, variant: 0, yOffset: -2 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.02, distance: 78, scale: 1.16, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.92, distance: 65, scale: 1.02, variant: 1, yOffset: 0 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.88, distance: 54, scale: 0.52, variant: 0, yOffset: -4 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.04, distance: 42, scale: 1.12, variant: 0, yOffset: -10 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.90, distance: 31, scale: 0.98, variant: 0, yOffset: 0 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.92, distance: 21, scale: 0.50, variant: 0, yOffset: -2 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.02, distance: 12, scale: 1.08, variant: 0, yOffset: -10 },
]);

export const FOREGROUND_FRAME_SCENERY = Object.freeze([
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.94, distance: 28, scale: 1.16, variant: 1, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.08, distance: 20, scale: 1.22, variant: 0, yOffset: -8 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_LEFT, lane: -2.90, distance: 13, scale: 0.72, variant: 0, yOffset: -4 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.94, distance: 7, scale: 1.10, variant: 0, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.06, distance: 2, scale: 1.18, variant: 0, yOffset: -6 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.94, distance: 28, scale: 1.16, variant: 0, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.08, distance: 20, scale: 1.22, variant: 0, yOffset: -8 },
  { assetType: 'purple_flower_single', zone: SCENE_ZONES.SHOULDER_RIGHT, lane: 2.90, distance: 13, scale: 0.72, variant: 0, yOffset: -4 },
  { assetType: 'grass_dirt_wall', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.94, distance: 7, scale: 1.10, variant: 1, yOffset: 0 },
  { assetType: 'tree_round', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.06, distance: 2, scale: 1.18, variant: 0, yOffset: -6 },
]);

export function getAssetTypeMeta(assetType) {
  return ASSET_TYPES[assetType] ?? null;
}
