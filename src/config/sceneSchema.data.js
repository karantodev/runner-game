/**
 * Static scenery layout data: side-decoration prefab chunks + the
 * midground/foreground frame composition lists used by SceneryRenderer.
 * Pure data — no logic. References the asset types and lane bands
 * defined in sceneSchema.js.
 */

import { LANE_BANDS, SCENE_ZONES } from './sceneSchema.js';

export const SIDE_DECORATION_PREFABS = Object.freeze([
  {
    id: 'cliff-flower-meadow',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist: 0.0, scale: 1.06, variant: 0 },
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
      { assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: 0.2, scale: 1.04, variant: 1 },
      { assetType: 'mushroom_red_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist: -0.7, scale: 0.52, variant: 'red' },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: -1.8, scale: 0.44 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist: 1.3, scale: 0.30 },
      { assetType: 'dry_grass_obstacle', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: 2.1, scale: 0.43 },
    ],
  },
  {
    id: 'pipe-vine-garden',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: -0.1, scale: 0.98, variant: 0 },
      { assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: -0.8, scale: 0.72 },
      { assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 1.1, scale: 0.58 },
      { assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: -1.6, scale: 0.54 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -0.7, scale: 0.31 },
    ],
  },
  {
    id: 'blockstack-platform',
    weight: 3,
    items: [
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist: 0.0, scale: 0.84, variant: 1 },
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.56, dist: -0.9, scale: 0.78, variant: 0 },
      { assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.28, dist: 0.5, scale: 0.70 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.5, scale: 0.30 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 2.2, scale: 0.28 },
    ],
  },
  {
    id: 'fence-flower-row',
    weight: 3,
    items: [
      { assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 2.26, dist: 0.1, scale: 0.78 },
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
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.52, dist: 0.3, scale: 0.82, variant: 1 },
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist: -1.1, scale: 0.90, variant: 2 },
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
      { assetType: 'hanging_platform_vines', laneBand: LANE_BANDS.STRUCTURE, lane: 2.28, dist:  0.0, scale: 0.82 },
      { assetType: 'grass_dirt_block',       laneBand: LANE_BANDS.STRUCTURE, lane: 2.16, dist: -1.2, scale: 0.90, variant: 0 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist:  0.9, scale: 0.52 },
      { assetType: 'grass_tuft_large',       laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.7, scale: 0.50 },
      { assetType: 'yellow_flower_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.1, scale: 0.29 },
    ],
  },
  {
    id: 'big-bush-wall',
    weight: 2,
    items: [
      { assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist:  0.1, scale: 1.02, variant: 0 },
      { assetType: 'bush_large',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist: -0.8, scale: 0.66 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist:  1.4, scale: 0.30 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.85, dist: -1.9, scale: 0.44 },
      { assetType: 'sprout_soil',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist:  2.2, scale: 0.28 },
    ],
  },
]);

export const MIDGROUND_SCENERY = Object.freeze([
  // ── Left: structures pulled tight to road (lane ≈-2.18…-2.28), trees at lane ≈-3.04…-3.10 ──
  // variant 1=cube01, 2=cube02, 3=column_tall for grass_dirt_block
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.08, distance: 184, scale: 1.02, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.24, distance: 174, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.24, distance: 174, scale: 0.96, variant: 2, yOffset: -50 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.28, distance: 163, scale: 1.02, variant: 0, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.26, distance: 154, scale: 1.00, variant: 0, yOffset: -110 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.12, distance: 143, scale: 0.98, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.10, distance: 131, scale: 0.90, variant: 0, yOffset: -10 },
  { assetType: 'purple_brick_single', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.22, distance: 119, scale: 0.88, variant: 1, yOffset: 0 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.24, distance: 104, scale: 0.88, variant: 0, yOffset: 0 },
  { assetType: 'floating_platform', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.26, distance:  91, scale: 1.10, variant: 0, yOffset: -35 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.22, distance:  78, scale: 0.92, variant: 0, yOffset: -52 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.06, distance:  65, scale: 0.84, variant: 0, yOffset: -8 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.20, distance:  54, scale: 0.90, variant: 3, yOffset: 0 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.24, distance:  42, scale: 0.86, variant: 0, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.22, distance:  31, scale: 0.80, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -2.18, distance:  18, scale: 0.80, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.04, distance:  12, scale: 0.70, variant: 0, yOffset: -6 },
  // ── Right: asymmetric mix — more walls left, more cubes/pipes right ──
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.26, distance: 188, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.10, distance: 178, scale: 1.00, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.22, distance: 168, scale: 1.02, variant: 2, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.22, distance: 168, scale: 0.94, variant: 0, yOffset: -50 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.26, distance: 157, scale: 0.92, variant: 2, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.24, distance: 145, scale: 0.96, variant: 0, yOffset: -95 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.14, distance: 131, scale: 0.92, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.08, distance: 119, scale: 0.86, variant: 0, yOffset: -10 },
  { assetType: 'fence_wood_short', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.28, distance: 104, scale: 0.90, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.20, distance:  91, scale: 0.88, variant: 1, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.22, distance:  78, scale: 0.58, variant: 0, yOffset: -52 },
  { assetType: 'hanging_platform_vines', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.22, distance:  65, scale: 0.82, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.06, distance:  54, scale: 0.78, variant: 0, yOffset: -8 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.26, distance:  42, scale: 0.86, variant: 1, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.20, distance:  31, scale: 0.52, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.24, distance:  18, scale: 0.74, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.04, distance:  12, scale: 0.66, variant: 0, yOffset: -6 },
]);

export const FOREGROUND_FRAME_SCENERY = Object.freeze([
  // Left frame: walls brought tight to road (lane ≈-2.22…-2.26); trees stay wide
  { assetType: 'grass_dirt_wall',     zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -2.24, distance: 28, scale: 0.78, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_LEFT,     lane: -3.16, distance: 20, scale: 0.84, variant: 0, yOffset: -6 },
  { assetType: 'question_block',      zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -2.26, distance: 16, scale: 0.58, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -2.22, distance:  8, scale: 0.68, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_LEFT,     lane: -3.22, distance:  3, scale: 0.76, variant: 0, yOffset: -4 },
  // Left shoulder — small flowers/grass between road edge and walls
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.36, distance: 15, scale: 0.48, variant: 0 },
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.40, distance: 10, scale: 0.44 },
  { assetType: 'purple_flower_single',zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.34, distance:  6, scale: 0.40 },
  // Right frame: brought tight to road; trees stay wide
  { assetType: 'grass_dirt_wall',     zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.24,  distance: 28, scale: 0.70, variant: 0, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.16,  distance: 20, scale: 0.84, variant: 0, yOffset: -6 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.26,  distance: 16, scale: 0.66, variant: 0, yOffset: 0 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 2.22,  distance:  8, scale: 0.62, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.22,  distance:  3, scale: 0.76, variant: 0, yOffset: -4 },
  // Right shoulder — mirrored, slightly varied
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.38,  distance: 13, scale: 0.46 },
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.36,  distance:  8, scale: 0.44, variant: 1 },
  { assetType: 'purple_flower_single',zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.42,  distance:  5, scale: 0.38 },
  // Very large near-foreground mushrooms flanking both sides of road
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_LEFT,  lane: -2.58, distance: 7, scale: 1.42, variant: 'red', yOffset: 0 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_RIGHT, lane:  2.58, distance: 7, scale: 1.42, variant: 'red', yOffset: 0 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_LEFT,  lane: -2.64, distance: 3, scale: 1.72, variant: 'red', yOffset: 0 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_RIGHT, lane:  2.64, distance: 3, scale: 1.72, variant: 'red', yOffset: 0 },
]);
