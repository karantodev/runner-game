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
  // v4.7 — reference-match: wide low-flora carpet band. Used only by
  // GroundScatterSystem to spread the violet/tuft bed across the green
  // field between structure clusters; SHOULDER alone is a thin road-edge
  // strip (its remap clamps to a 0.23 lane-unit band). Renders in the
  // "organic" decor pass like SHOULDER, just remapped wider.
  MEADOW: 'meadow',
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
  // v3.8.37 — extra power-up + rare-orchid pickups spawned by
  // SpawnSystem ticks (procedural, not in composition prefabs).
  power_magnet_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  power_shield_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  power_double_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  rare_orchid_pickup: { group: 'pickups', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  vine_barrier: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '2-3 lanes' },
  low_branch_overhang: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '3 lanes (overhead)' },
  spider_web_overhang: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '3 lanes (overhead)' },
  spiky_bush_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  dry_grass_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  small_center_mushroom: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  stone_obstacle: { group: 'obstacles', zone: SCENE_ZONES.MAIN_LANE_2, gameplay: true, footprint: '1 lane' },
  purple_brick_single: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  purple_brick_platform_3: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  // v3: 'stone_*' replaces purple-Mario bricks. Aliases below keep legacy
  // composition data alive until designer ships the new stone palette.
  stone_brick_single: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  stone_wall_low: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  stone_wall_stairs: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1-2 lanes' },
  question_block: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  // green_pipe retired — kept as a no-op redirect to planter_pot so any
  // legacy spawn data that still references it draws the new sprite.
  green_pipe: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile', deprecated: true, redirectTo: 'planter_pot' },
  planter_pot: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 tile' },
  floating_platform: { group: 'structures', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2-3 tiles' },
  grass_dirt_block: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  grass_dirt_step: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2 lanes' },
  grass_dirt_wall: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '1 lane' },
  // v3.8 — designer-delivered explicit-side step. SceneryRenderer mirrors
  // structural items on lane > 0 so this also visually serves the right side.
  grass_dirt_step_left: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2 lanes' },
  grass_dirt_platform_long: { group: 'terrain', zone: SCENE_ZONES.STRUCTURE_LEFT, gameplay: false, footprint: '2-3 tiles' },
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
  // v3 focal landmark: Victorian botanical greenhouse — replaces castle.
  // LandmarksRenderer tries greenhouse* first and falls back to castle*.
  greenhouse_far: { group: 'background', zone: SCENE_ZONES.BACKGROUND_FAR, gameplay: false, footprint: 'focal point' },
  // B2 — mid-field decorative garland (brown arch branches + flowers). Pure scenery:
  // no collision, no gameplay interaction. Placed at center (lane 0) at mid distance
  // and rendered spanning the full road+shoulder width so it reads as strung between
  // the side structures like a decorative arch. Visually distinct from vine_barrier
  // (brown arch vs green thorny vines, arch vs straight strip, flowers vs none).
  decorative_branch_garland: { group: 'decor_midfield', zone: SCENE_ZONES.BACKGROUND_MID, gameplay: false, footprint: 'full-width arch' },
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
