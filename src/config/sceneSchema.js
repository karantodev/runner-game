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
  low_branch_overhang: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '3 lanes (overhead)' },
  spider_web_overhang: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '3 lanes (overhead)' },
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


// Scenery layout data (SIDE_DECORATION_PREFABS, MIDGROUND_SCENERY,
// FOREGROUND_FRAME_SCENERY) is in ./sceneSchema.data.js — import it
// directly from there. A re-export here would create an ES module cycle:
// data → schema (for enums) → data (for re-export).

export function getAssetTypeMeta(assetType) {
  return ASSET_TYPES[assetType] ?? null;
}
