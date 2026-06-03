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
    weight: 2,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 1.06, variant: 0 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: 0.9, scale: 0.48 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.0, scale: 0.32 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 1.8, scale: 0.46 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: -2.0, scale: 0.29 },
    ],
  },
  {
    id: 'grass-wall-mushroom',
    weight: 2,
    items: [
      { id: 'wall', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: 0.2, scale: 1.04, variant: 1 },
      { id: 'mushroom_shoulder', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist: -0.7, scale: 0.52, variant: 'red' },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: -1.8, scale: 0.44 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist: 1.3, scale: 0.30 },
      // v3.8.51 — replaced 'dry_grass_obstacle' shoulder decor with
      // canonical SIDE_DECOR_SMALL 'grass_tuft_large'. The asset is
      // visually similar but unambiguously decor in the semantic
      // registry, resolving the OBSTACLE_AS_DECOR validator finding.
      { id: 'shoulder_tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: 2.1, scale: 0.43 },
    ],
  },
  {
    id: 'pipe-vine-garden',
    weight: 3,
    items: [
      { id: 'wall', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -0.1, scale: 0.98, variant: 0 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -0.8, scale: 0.72 },
      { id: 'leaf', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 1.1, scale: 0.58 },
      { id: 'mushroom_shoulder', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: -1.6, scale: 0.54 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -0.7, scale: 0.31 },
    ],
  },
  {
    id: 'blockstack-platform',
    weight: 3,
    items: [
      { id: 'brick', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 0.84, variant: 1 },
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -0.9, scale: 0.78, variant: 0 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist: 0.5, scale: 0.70 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.5, scale: 0.30 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 2.2, scale: 0.28 },
    ],
  },
  // v3.8.5 environment density pass — new corridor prefabs.
  // The reference image shows continuous "wall + question-block + small
  // accents" repeating along the road. These three prefabs fill the
  // corridor with that exact rhythm without stacking with the static
  // MIDGROUND_SCENERY frame (which only places one item per ~10 units).
  {
    id: 'brick-corridor-segment',
    weight: 4,
    items: [
      { id: 'brick_a', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.88, variant: 0 },
      { id: 'brick_b', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.4, scale: 0.86, variant: 1 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.7, scale: 0.74, yOffset: -42 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.4, scale: 0.42 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.9, scale: 0.30 },
      // v4.16 — replace the tree with a lower flowering mass so the lane
      // reads as open garden, not a repeating tree wall.
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.74, dist: 7.4, scale: 0.58 },
    ],
  },
  {
    id: 'qblock-floating-cluster',
    weight: 3,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 0 },
      { id: 'qblock_low', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.0, scale: 0.72, yOffset: -90 },
      { id: 'qblock_high', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.70, yOffset: -150 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist:  1.3, scale: 0.42 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.6, scale: 0.42 },
    ],
  },
  {
    id: 'wall-and-mushroom-grove',
    weight: 4,
    items: [
      { id: 'wall_a', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 0 },
      { id: 'wall_b', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.6, scale: 0.94, variant: 1 },
      { id: 'mushroom_shoulder', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.74, dist: -0.6, scale: 0.54, variant: 'red' },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.58, dist:  1.4, scale: 0.44 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist: -2.0, scale: 0.30 },
      // v4.16 — same open-garden swap as brick-corridor-segment.
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.74, dist: 7.4, scale: 0.60 },
    ],
  },
  // v3.8.6 Tier-2 composition pass — new cluster prefabs.
  // Goal: dense corridor instead of empty grass field. Each cluster mixes
  // structure (wall/block/pipe) + decor (mushroom/flowers/grass) so a
  // single spawn slot delivers a cohesive composition rather than one
  // floating prop. lane values nudged tighter (1.86-1.94) to sit closer
  // to the road edge.
  {
    id: 'pipe-with-flowers',
    weight: 4,
    items: [
      // green_pipe canonical name; dispatcher redirects to planter_pot sprite.
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 0.92 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.0, scale: 0.48 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist: -0.8, scale: 0.42 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist:  1.6, scale: 0.42 },
      { id: 'flower_c', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist: -1.8, scale: 0.30 },
      // v4.3 — P3 reference-match: tree removed — pipe is already a strong
      // landmark; a tree here contributed to the wall-of-forest effect.
    ],
  },
  {
    id: 'pipe-mushroom-platform',
    weight: 5,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.94, variant: 0 },
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.6, scale: 0.84 },
      { id: 'mushroom_top', role: 'topper', parentId: 'block', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.42, variant: 'red', yOffset: -135 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.4, scale: 0.34 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.9, scale: 0.42 },
    ],
  },
  {
    id: 'dense-platform-trio',
    // v4.6 — reference-match (P2): third-widest structural span (2.8 units,
    // block→brick across dist -1.4..+1.4). Weight 3→5 so mid-width spans
    // back up the two continuous-wall prefabs and tighten the gaps further.
    weight: 5,
    items: [
      { id: 'block_a', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 1.00, variant: 1 },
      { id: 'block_b', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -1.4, scale: 0.92, variant: 2 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.70, yOffset: -125 },
      { id: 'brick', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  1.4, scale: 0.78, variant: 0 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.9, scale: 0.30 },
    ],
  },
  {
    id: 'fence-bush-corner',
    weight: 3,
    items: [
      // v4.8 — reference-match: heavier fence (0.84→0.98) so the right
      // bottom-corner frame matches the left in visual weight.
      { id: 'fence', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.98 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist: -1.0, scale: 0.62 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist:  1.2, scale: 0.32 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist: -1.8, scale: 0.40 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist:  1.9, scale: 0.40 },
    ],
  },

  // ── v3.8.8 Tier-3 cluster prefabs ─────────────────────────────────────────
  // Goal: full corridor compositions, not single props. Each cluster mixes
  // platform + wall + accessory + flowers so the side band reads as one
  // intentional grouping. New `grass_dirt_platform_long` (designer wave)
  // anchors the long platform variants.

  {
    id: 'long-platform-with-mushroom',
    weight: 5,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.95 },
      { id: 'mushroom_top', role: 'topper', parentId: 'platform', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big',         laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.50, variant: 'red',    yOffset: -120 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',     laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.0, scale: 0.44 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small',      laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.6, scale: 0.32 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft',               laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist:  1.7, scale: 0.42 },
      // v4.3 — P3 reference-match: tree removed — mushroom topper already
      // provides visual height; adding a tree crowded the silhouette band.
    ],
  },
  {
    id: 'long-platform-question-stack',
    weight: 4,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.92 },
      { id: 'qblock_a', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',           laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.7, scale: 0.78, yOffset: -118 },
      { id: 'qblock_b', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',           laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.7, scale: 0.74, yOffset: -118 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist:  1.5, scale: 0.40 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',     laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist: -1.8, scale: 0.42 },
    ],
  },
  {
    id: 'platform-pipe-flowers',
    weight: 4,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 1 },
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  1.5, scale: 0.88 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: -1.1, scale: 0.52 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.52, dist:  1.2, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.40, dist: -1.9, scale: 0.30 },
      // v4.3 — P3 reference-match: tree removed — bush already fills the
      // background-accent slot; a tree on top read as forest clutter.
    ],
  },
  {
    id: 'wall-stack-near',
    weight: 4,
    items: [
      // Near-depth cluster — tight, visually heavy. Spawns frequently with the
      // new sideDecorSpacing=18; fills middle depths.
      { id: 'wall', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall',  laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 0 },
      { id: 'brick_top', role: 'loose-decor', anchor: 'top', zLayer: 18,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.74, variant: 1, yOffset: -110 },
      { id: 'fence', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.5, scale: 0.74 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist:  1.4, scale: 0.32 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil',      laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist: -1.8, scale: 0.30 },
      // v4.3 — P3 reference-match: tree removed — wall + fence + brick
      // already compose a dense structural cluster; tree added to the
      // forest-wall effect without contributing readable depth.
    ],
  },

  // ── v3.8.19 Side Corridor Density Pass ──────────────────────────────────────
  // Four dense cluster templates targeting the gaps the user flagged:
  // (1) bottom-corner foreground framing, (2) mid-depth platform+question
  // stack, (3) pipe + stairs identity beat, (4) tall vertical wall accent.
  // Each cluster mixes >= 4 items at staggered dist so the prefab
  // occupies 3-4 worldscale units of road depth.

  {
    // (1) Heavy near-corner block: large platform + mushroom on top +
    // purple-brick accent + flowers + fence behind. Lane 1.86 keeps the
    // platform anchor close to road edge after the remap.
    id: 'corner-platform-mushroom-frame',
    weight: 5,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 1.05 },
      { id: 'mushroom_top', role: 'topper', parentId: 'platform', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.56, variant: 'red',    yOffset: -130 },
      { id: 'brick', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.7, scale: 0.84, variant: 0 },
      { id: 'fence', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  1.6, scale: 0.78 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  0.8, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.6, scale: 0.32 },
    ],
  },
  {
    // (2) Platform with TWO question_blocks at different heights -- the
    // "arcade platformer" beat the user wants more of. Bricks below for
    // structural anchor.
    id: 'platform-qblock-stack',
    weight: 4,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform',   laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.92, variant: 1 },
      { id: 'brick_top', role: 'loose-decor', anchor: 'top', zLayer: 18,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.76, variant: 1, yOffset: -100 },
      { id: 'qblock_a', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.74, yOffset: -170 },
      { id: 'qblock_b', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.3, scale: 0.70, yOffset: -110 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist:  1.5, scale: 0.30 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist: -1.7, scale: 0.40 },
    ],
  },
  {
    // (3) Pipe + stairs identity beat. The stairs (grass_dirt_step_left)
    // auto-flips on right-side spawn so we get matching staircases on
    // both sides without a second asset.
    id: 'pipe-stairs-flower-bed',
    weight: 4,
    items: [
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 0.96 },
      { id: 'step', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_step_left',laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.4, scale: 0.94 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist:  1.2, scale: 0.54 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -0.8, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist:  1.9, scale: 0.30 },
    ],
  },
  {
    // (4) Tall vertical wall accent: two grass_dirt_blocks stacked +
    // mushroom on top + flowers at base. Mid-depth visual landmark.
    id: 'tall-block-stack-vertical',
    weight: 3,
    items: [
      { id: 'block_lower', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.98, variant: 0 },
      { id: 'block_upper', role: 'loose-decor', anchor: 'top', zLayer: 18,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.92, variant: 1, yOffset: -140 },
      { id: 'mushroom_top', role: 'topper', parentId: 'block_lower', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.46, variant: 'red', yOffset: -250 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.4, scale: 0.46 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.44, dist: -1.7, scale: 0.30 },
    ],
  },
  // ── v4.21 Phase 2 step 2B — one new mid-structure prefab ────────────────────
  // A 3-high grass-dirt block stack for pronounced mid-corridor verticality.
  // STRUCTURE band (remaps off-road, lane ≥ 2.55); blocks stack via yOffset
  // (vertical only — no lane change, no road intrusion). Base flora are purple +
  // leaf ONLY — NO gold, so nothing competes with the on-road orchid trail; no
  // mushroom, no qblock. HERO-only (proceduralOk:false, NOT in the procedural
  // pool) so Step 2B changes ONLY the swapped 112 R beat — it must never
  // reshuffle the rest of the procedural corridor.
  {
    id: 'mid-grass-block-stack',
    weight: 0,
    proceduralOk: false,
    items: [
      { id: 'block_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.98, variant: 0 },
      { id: 'block_mid', role: 'loose-decor', anchor: 'top', zLayer: 14,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.94, variant: 1, yOffset: -140 },
      { id: 'block_top', role: 'loose-decor', anchor: 'top', zLayer: 18,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.90, variant: 2, yOffset: -280 },
      { id: 'flower_base', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.2, scale: 0.44 },
      { id: 'leaf_base', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.56, dist: -1.4, scale: 0.42 },
    ],
  },

  // ── v3.8.20 Hero Composition Pass — LAYERED prefabs ─────────────────────────
  // The previous "density" pass clustered everything at lane 1.86-1.96, which
  // after the STRUCTURE remap collapsed to a narrow 5-15 px band right next
  // to the road edge. Result: corridor felt like two flat lines of decor.
  //
  // These four prefabs spread items DELIBERATELY across three lane tiers:
  //   INNER  (lane 1.86)  → road-edge structures (close to shoulder)
  //   MID    (lane 2.00)  → mid-depth platforms / pipes / walls
  //   OUTER  (lane 2.20)  → outer-frame trees, big mushrooms, deep walls
  // Combined with the v3.8.20 wider remap [2.05, 2.95] the result is a
  // 3-layer corridor that reads as a small WORLD, not a roadside ribbon.

  {
    // LAYERED #1 — corner hero with foreground brick + mid platform +
    // outer tree shadow + cascade of flowers.
    id: 'hero-layered-corner-brick',
    weight: 3,
    // v4.5 — opened for procedural pool at reduced weight (5→3) so the
    // 3-tier layout appears in the mid corridor without dominating.
    proceduralOk: true,
    // v3.8.39 — Phase 5 structured slots. INNER tier is two
    // ground-anchored bricks; MID tier is a platform with a mushroom
    // topper; OUTER tier is loose foreground/background framing.
    items: [
      // INNER tier (right at road edge)
      { id: 'brick_inner_a', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.88, variant: 1 },
      { id: 'brick_inner_b', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist: -1.4, scale: 0.86, variant: 0 },
      // MID tier (longer platform set further out)
      { id: 'platform_mid', role: 'base', anchor: 'ground',
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist:  0.7, scale: 1.00 },
      { id: 'mushroom_top', role: 'topper', parentId: 'platform_mid', anchor: 'top',
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist: 0.7, scale: 0.54, variant: 'red', yOffset: -130 },
      // OUTER tier (extra fence framing)
      { id: 'fence_outer', role: 'foreground-accent', anchor: 'ground',
        assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist: -1.0, scale: 0.86 },
      // Flower cascade across road-shoulder
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground',
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.2, scale: 0.48 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground',
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.7, scale: 0.32 },
    ],
  },
  {
    // LAYERED #2 — mid-depth platform hero with elevated question blocks.
    // v3.8.22 — qblock scales bumped (0.86/0.80 → 1.05/0.96) and yOffset
    // pushed up (-180/-120 → -215/-150) so they read as clearly visible
    // arcade beats per the user's request "qblocks higher and bigger".
    id: 'hero-layered-platform-qblocks',
    weight: 4,
    proceduralOk: false,
    items: [
      // INNER: low brick accent at road edge
      { id: 'brick_inner', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist:  0.0, scale: 0.78, variant: 0 },
      // MID: platform with two visible question_blocks "floating" above it
      { id: 'platform_mid', role: 'base', anchor: 'ground',
        assetType: 'floating_platform',   laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.0, scale: 0.96, variant: 1 },
      { id: 'qblock_a', role: 'loose-decor', anchor: 'ground',
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.3, scale: 1.05, yOffset: -215 },
      { id: 'qblock_b', role: 'loose-decor', anchor: 'ground',
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist: -0.9, scale: 0.96, yOffset: -150 },
      // OUTER: wall with a mushroom topper on the outer frame
      { id: 'wall_outer', role: 'base', anchor: 'ground',
        assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist:  1.5, scale: 0.94, variant: 1 },
      { id: 'mushroom_top', role: 'topper', parentId: 'wall_outer', anchor: 'top',
        assetType: 'mushroom_blue_big',   laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist:  1.5, scale: 0.48, yOffset: -120 },
      // SHOULDER flowers
      { id: 'flower_shoulder', role: 'loose-decor', anchor: 'ground',
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist:  1.4, scale: 0.32 },
    ],
  },
  {
    // LAYERED #3 — STRONG pipe landmark hero. The pipe is the centerpiece,
    // surrounded by a built-up cluster: brick base + platform + mushroom
    // + flowers + outer tree. This is the "single big pipe moment" the
    // user wants.
    id: 'hero-layered-pipe-landmark',
    weight: 4,
    proceduralOk: false,
    items: [
      // INNER: pipe right at road edge — the centerpiece landmark
      { id: 'pipe_inner', role: 'base', anchor: 'ground',
        assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 1.05 },
      // MID: brick base + flower bed behind/beside pipe
      { id: 'brick_mid', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.00, dist: -1.4, scale: 0.84, variant: 0 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground',
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist: -0.6, scale: 0.60 },
      // OUTER: fence + grass tuft frame the landmark
      { id: 'fence_outer', role: 'foreground-accent', anchor: 'ground',
        assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist:  1.0, scale: 0.86 },
      { id: 'tuft_outer', role: 'loose-decor', anchor: 'ground',
        assetType: 'grass_tuft_large',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.70, dist:  1.6, scale: 0.48 },
      // SHOULDER flowers
      { id: 'flower_front', role: 'loose-decor', anchor: 'ground',
        assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist:  0.8, scale: 0.46 },
    ],
  },
  {
    // LAYERED #4 — purple brick CASCADE (style anchor). Multiple bricks
    // staggered across all three tiers reading as a wall going INTO the
    // depth. Question block over the mid brick. The "purple/brick beat"
    // the user wants more of.
    id: 'hero-layered-brick-cascade',
    weight: 3,
    // v4.5 — opened for procedural pool at reduced weight (4→3).
    proceduralOk: true,
    items: [
      // INNER bricks
      { id: 'brick_inner_a', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.86, variant: 1 },
      { id: 'brick_inner_b', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist: -1.2, scale: 0.84, variant: 0 },
      // MID brick + question_block "topper" (renders above brick via yOffset)
      { id: 'brick_mid', role: 'base', anchor: 'ground',
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.04, dist:  0.4, scale: 0.82, variant: 1 },
      { id: 'qblock_mid', role: 'loose-decor', anchor: 'top',
        assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 2.04, dist:  0.4, scale: 0.92, yOffset: -130 },
      // OUTER big mushroom — ground-anchored, no parent needed (role 'base'
      // lets it sit on the ground without violating support-required).
      { id: 'mushroom_outer', role: 'base', anchor: 'ground',
        assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: -1.6, scale: 0.74, variant: 'red' },
      // SHOULDER flora at base
      { id: 'tuft_a', role: 'loose-decor', anchor: 'ground',
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.4, scale: 0.42 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground',
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.44, dist: -1.8, scale: 0.30 },
    ],
  },
  {
    id: 'fence-flower-row',
    weight: 5,
    items: [
      // v4.8 — reference-match: heavier fence (0.78→0.96) so the left
      // bottom-corner frame reads clearly at the new near distance.
      { id: 'fence', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist: 0.1, scale: 0.96 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: -1.0, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist: 1.5, scale: 0.30 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist: -1.7, scale: 0.44 },
      { id: 'flower_c', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: 2.2, scale: 0.28 },
    ],
  },
  {
    id: 'platform-high-cliff',
    weight: 4,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist: 0.3, scale: 0.82, variant: 1 },
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist: -1.1, scale: 0.90, variant: 2 },
      { id: 'leaf', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist: 0.8, scale: 0.54 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: -1.9, scale: 0.28 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 2.1, scale: 0.29 },
    ],
  },
  {
    id: 'organic-meadow',
    weight: 5,
    items: [
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist: 0.0, scale: 0.54 },
      { id: 'flower_a2', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.58, dist: -0.8, scale: 0.46 },
      { id: 'mushroom_shoulder', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: -1.0, scale: 0.50, variant: 'purple' },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: 1.5, scale: 0.42 },
      { id: 'flower_c', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: -1.9, scale: 0.28 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 2.3, scale: 0.47 },
      { id: 'bush_mid', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist: 2.0, scale: 0.48 },
      { id: 'leaf_outer', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.NATURE, lane: 2.58, dist: 2.8, scale: 0.44 },
    ],
  },
  {
    id: 'leaf-forest-edge',
    weight: 5,
    items: [
      { id: 'leaf_a', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.78, dist: 0.0, scale: 0.64 },
      { id: 'leaf_b', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist: -1.2, scale: 0.56 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.85, dist: 1.7, scale: 0.46 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: -0.7, scale: 0.46 },
      { id: 'flower_a2', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: 1.0, scale: 0.40 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: 2.3, scale: 0.29 },
      { id: 'bush_outer', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.62, dist: 2.8, scale: 0.42 },
    ],
  },
  {
    id: 'blue-mushroom-grove',
    weight: 2,
    items: [
      { id: 'mushroom_shoulder', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 0.2, scale: 0.62 },
      { id: 'leaf', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.1, scale: 0.52 },
      // v3.8.51 — see grass-wall-mushroom: 'dry_grass_obstacle' replaced
      // with semantically-unambiguous 'grass_tuft_large' decor.
      { id: 'shoulder_tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 1.5, scale: 0.48 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.58, dist: -1.9, scale: 0.42 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.40, dist: 2.1, scale: 0.28 },
    ],
  },
  // ── Chunks using new high-quality sprites ───────────────────────────────────
  {
    id: 'large-bush-garden',
    weight: 8,
    items: [
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist:  0.0, scale: 0.68 },
      { id: 'violet_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',            laneBand: LANE_BANDS.SHOULDER, lane: 1.62, dist:  0.7, scale: 0.42 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small',            laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist: -1.1, scale: 0.30 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',               laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist:  1.5, scale: 0.44 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single',           laneBand: LANE_BANDS.SHOULDER, lane: 1.38, dist: -2.1, scale: 0.38 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil',                    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.3, scale: 0.28 },
    ],
  },
  {
    id: 'hanging-platform-garden',
    weight: 1,
    items: [
      { id: 'hanging', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'hanging_platform_vines', laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.0, scale: 0.82 },
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',       laneBand: LANE_BANDS.STRUCTURE, lane: 2.16, dist: -1.2, scale: 0.90, variant: 0 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist:  0.9, scale: 0.52 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large',       laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.7, scale: 0.50 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.1, scale: 0.29 },
    ],
  },
  {
    id: 'big-bush-wall',
    weight: 1,
    items: [
      { id: 'wall', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.1, scale: 1.02, variant: 0 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist: -0.8, scale: 0.66 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist:  1.4, scale: 0.30 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.85, dist: -1.9, scale: 0.44 },
      { id: 'sprout', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'sprout_soil',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist:  2.2, scale: 0.28 },
    ],
  },

  // ── v4.5 continuous-wall prefabs ────────────────────────────────────────────
  // Three-block span + tree background — at spacing 10 these overlap the
  // adjacent clusters slightly, creating the continuous side-wall look of the
  // reference image. dist range [-3.2, +3.2] covers ~6.4 world units so gaps
  // between cluster spawns are filled even with slight jitter.

  {
    id: 'wall-continuous-3block',
    // v4.6 — reference-match (P2): widest dist-spanning structural prefab
    // (6.4 units). Weight 6→9 so consecutive procedural structural spawns
    // (spacing ~10) are more often this span and overlap into a continuous
    // corridor instead of leaving ~8-unit gaps.
    weight: 6,
    items: [
      { id: 'block_a', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -3.2, scale: 0.98, variant: 0 },
      { id: 'block_b', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 1 },
      { id: 'block_c', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  3.2, scale: 0.96, variant: 2 },
      { id: 'mushroom', role: 'topper', parentId: 'block_b', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 0.50, variant: 'red', yOffset: -130 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: -2.0, scale: 0.44 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist:  1.5, scale: 0.30 },
    ],
  },
  {
    // Wall anchors the near edge; a floating platform with q-block hovers at
    // mid depth; a purple brick fills the outer frame. Three distinct height
    // levels — reads as the stacked "world" from the reference.
    id: 'elevated-platform-wall',
    // v4.6 — reference-match (P2): second-widest structural span (4.8 units).
    // Weight 5→8 to reinforce wide overlapping spans in the rotation.
    weight: 5,
    items: [
      { id: 'wall', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 1.02, variant: 0 },
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -2.8, scale: 0.88, variant: 0 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -2.8, scale: 0.82, yOffset: -160 },
      { id: 'brick_back', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist:  2.0, scale: 0.80, variant: 1 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist:  1.4, scale: 0.48 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.6, scale: 0.44 },
    ],
  },
  {
    // A complete garden-side chain in one spawn beat. The reference rarely
    // leaves a platform isolated: a structural run is softened by foliage,
    // capped by a mushroom landmark, and closed with a short fence.
    id: 'garden-chain-platform-fence',
    weight: 7,
    items: [
      { id: 'platform', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -3.2, scale: 0.88, variant: 0 },
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.8, scale: 0.98, variant: 1 },
      { id: 'bush', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.76, dist: 1.0, scale: 0.72 },
      { id: 'mushroom', role: 'base', anchor: 'ground', zLayer: 12,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 2.08, dist: 2.4, scale: 0.56, variant: 'red' },
      { id: 'fence', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: 3.6, scale: 0.72 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: 1.7, scale: 0.42 },
    ],
  },

  // ── v3.8 composite prefabs: green block as base + smaller decor on top ────
  // Two items share lane+dist so they read as ONE stacked composition.
  // Top item gets a negative yOffset (world-pixels, scaled by perspective)
  // to sit on top of the block's flat surface. Block scale > top scale —
  // base reads as the foundation, top reads as an accent. SceneryRenderer
  // auto-mirrors structural assets on lane > 0 so the same prefab serves
  // both road sides; the left-facing `grass_dirt_step_left` flips to a
  // right-facing step automatically.
  // v3.8.1 — composites at low weights (1-2). They're an accent, not the
  // baseline; baseline prefabs (cliff-flower-meadow, fence-flower-row,
  // etc.) carry the spawn rotation. Weight 2 ≈ 5% chance per spawn slot,
  // weight 1 ≈ 2.5% — exactly the "occasional accent" feel.
  {
    id: 'block-mushroom-on-top',
    weight: 1,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00, variant: 1 },
      { id: 'mushroom_top', role: 'topper', parentId: 'block', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 0.48, variant: 'red', yOffset: -150 },
    ],
  },
  {
    id: 'block-flower-on-top',
    weight: 2,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 0 },
      { id: 'flower_top', role: 'topper', parentId: 'block', anchor: 'top', zLayer: 20,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.42, yOffset: -120 },
    ],
  },
  {
    id: 'block-grass-on-top',
    weight: 1,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 2 },
      { id: 'tuft_top', role: 'topper', parentId: 'block', anchor: 'top', zLayer: 20,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.52, yOffset: -145 },
    ],
  },
  {
    id: 'block-sprout-on-top',
    weight: 1,
    items: [
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.95, dist:  0.0, scale: 0.95, variant: 1 },
      { id: 'sprout_top', role: 'topper', parentId: 'block', anchor: 'top', zLayer: 20,
        assetType: 'sprout_soil',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.95, dist:  0.0, scale: 0.45, yOffset: -130 },
    ],
  },
  {
    id: 'block-flower-builtin',
    weight: 2,
    items: [
      // Designer-delivered composite: block with flower painted into it.
      // Variant 2 maps to grassDirtBlockFlower01 via the dispatcher.
      { id: 'block', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00, variant: 2 },
    ],
  },
  {
    id: 'step-left-with-mushroom',
    weight: 1,
    items: [
      // Left-facing step. SceneryRenderer flips it on the right side so
      // we get a step that "leans inward" relative to the road on both
      // sides without needing a separate _right asset.
      { id: 'step', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_step_left', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00 },
      { id: 'mushroom_top', role: 'topper', parentId: 'step', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 0.40, variant: 'red', yOffset: -120 },
      ],
  },

  // ── v4.0 Scatter flora patches ────────────────────────────────────────────
  // Pure SHOULDER clusters — no STRUCTURE items so the validator has nothing
  // to object to. Used to fill gaps between structural beats with small
  // organic life matching the reference (violets + grass tufts in the
  // foreground). Weight 4 so they appear frequently but yield to heavier
  // structural beats in the procedural rotation.
  {
    id: 'scatter-violet-tuft',
    weight: 6,
    items: [
      { id: 'violet_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist:  0.0, scale: 0.50 },
      { id: 'violet_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -1.4, scale: 0.40 },
      { id: 'violet_c', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist:  1.6, scale: 0.36 },
      { id: 'tuft_a',   role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_small',     laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist:  1.2, scale: 0.44 },
      { id: 'yellow_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small',  laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist:  2.0, scale: 0.30 },
      { id: 'tuft_b',   role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft',           laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: -2.2, scale: 0.42 },
    ],
  },

  // ── v3.8.42 Phase 7b — Foreground anchor prefabs ─────────────────────────
  // Two large, hand-composed compositions used exclusively as HERO_LAYOUT's
  // NEAR-FOREGROUND anchors. Heavier than the previous hero-layered-* set
  // (block + topper + support + flora at intentional scales), and offset
  // far enough from the road centre that they frame the scene without
  // touching the gameplay corridor. proceduralOk:false so they never land
  // by random roll.

  {
    id: 'foreground-left-anchor',
    weight: 0,
    proceduralOk: false,
    items: [
      // Outer block + mushroom topper — the dominant left mass.
      { id: 'block_outer', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist:  0.0, scale: 1.10, variant: 0 },
      { id: 'mushroom_top', role: 'topper', parentId: 'block_outer', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist: 0.0, scale: 0.58, variant: 'red', yOffset: -140 },
      // Inner brick — smaller, closer to road, reinforces perspective.
      { id: 'brick_inner', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.4, scale: 0.78, variant: 0 },
      // Front flora — fills the bottom-left corner.
      { id: 'flower_front', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.62, dist:  1.0, scale: 0.50 },
      { id: 'tuft_front', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.78, dist:  1.7, scale: 0.50 },
    ],
  },
  {
    id: 'foreground-right-anchor',
    weight: 0,
    proceduralOk: false,
    items: [
      // Pipe landmark + bush behind — the dominant right mass.
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'green_pipe', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist: 0.0, scale: 1.08 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: -0.7, scale: 0.68 },
      // Inner brick + fence — small, close to road.
      { id: 'brick_inner', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  1.5, scale: 0.74, variant: 1 },
      { id: 'fence_front', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 2.06, dist:  1.8, scale: 0.80 },
      { id: 'flower_front', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist:  1.2, scale: 0.34 },
    ],
  },
  // ── v4.21 Phase 1 — near-foreground frame ────────────────────────────────
  // A small curated composition that fills the empty lower corners CLOSER to
  // the camera than the existing fence frames (HERO_LAYOUT d11/d14). Wired
  // ONLY through HERO_LAYOUT (proceduralOk:false, weight:0) so it never lands
  // by random roll and draws ZERO world.rng — seeded gameplay is unaffected.
  // Solids sit in STRUCTURE at lane ≥1.88 (remapped to visual ≥2.6, well past
  // the road edge at 2.30); flora in SHOULDER. No obstacle assetTypes — uses
  // the decor-registered grass_tuft_large / leaf_clump_small (validator-safe).
  {
    id: 'near-foreground-frame',
    weight: 0,
    proceduralOk: false,
    items: [
      // Large red mushroom — the near anchor mass.
      { id: 'mushroom', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 0.64, variant: 'red' },
      // Short fence segment frames the corner front.
      { id: 'fence_front', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist:  1.8, scale: 0.62 },
      // Tall grass clump (decor asset, NOT the dry-grass obstacle).
      { id: 'grass_tall', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist: -1.4, scale: 0.52 },
      // Small flower + leaf clump fill the remaining gaps.
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist:  0.9, scale: 0.46 },
      { id: 'leaf', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: -2.0, scale: 0.50 },
    ],
  },
  // ── v3.8.51 Phase 9 — Garden Corridor Reference clusters ───────────────
  // Five hand-composed clusters with strong signature elements (purple
  // brick, green pipe, question block, mushroom, stone step). These are
  // the primary clusters wired through HERO_LAYOUT. proceduralOk:false so
  // they only ever appear at hand-composed depths — never as procedural
  // fill mistakes.
  {
    id: 'garden_foreground_left_platform_cluster',
    weight: 0,
    proceduralOk: false,
    items: [
      // Foundation block — the visual platform the cluster sits on.
      // v4.2 — P2 reference-match: lanes flipped to positive so side * lane
      // mirrors correctly (HERO_LAYOUT side:-1 → mirroredLane = -1 * +2.00 = -2.00,
      // placing the cluster on the LEFT as intended). Previously negative lanes
      // caused double-negation and the cluster rendered on the right side.
      { id: 'platform_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.00, dist: 0.0, scale: 1.06, variant: 0 },
      // Mushroom topper — child of base.
      { id: 'mushroom_top', role: 'topper', parentId: 'platform_base', anchor: 'top', zLayer: 12,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 2.00, dist: 0.0, scale: 0.54, variant: 'red', yOffset: -64 },
      // Signature purple brick — visible accent behind the platform.
      { id: 'brick_back', role: 'support', anchor: 'ground', zLayer: 8,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist: -1.4, scale: 0.78, variant: 0 },
      // Outer shrub mass closes the foreground corner without moving any
      // structural item toward the collision corridor.
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.82, dist: -2.1, scale: 0.86 },
      // Fence — frames the platform front.
      { id: 'fence_front', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  1.6, scale: 0.80 },
      // Shoulder flora.
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.62, dist: -0.8, scale: 0.46 },
      { id: 'tuft_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.55, dist:  1.1, scale: 0.42 },
    ],
  },
  {
    id: 'garden_foreground_right_pipe_cluster',
    weight: 0,
    proceduralOk: false,
    items: [
      // Pipe — the signature right-side landmark. Anchored to its own
      // grass-dirt base so it doesn't read as floating.
      { id: 'pipe_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.00, dist: 0.2, scale: 0.92, variant: 0 },
      // Pipe sits adjacent to the grass_dirt_block at the same dist —
      // no graph parenting (green_pipe.allowedParents = ['ground'] in
      // the semantic registry; visual layering achieved through lane
      // proximity + yOffset for a slight lift above the soil).
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 12,
        assetType: 'green_pipe', laneBand: LANE_BANDS.STRUCTURE, lane: 2.12, dist: 0.0, scale: 1.04, yOffset: -10 },
      // Background bush mass for visual weight.
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: -1.2, scale: 0.72 },
      // Signature small purple brick behind pipe.
      { id: 'brick_back', role: 'support', anchor: 'ground', zLayer: 8,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist:  1.6, scale: 0.72, variant: 1 },
      // Low front fence makes the right corner read as one composed garden
      // group instead of a pipe floating beside loose flora.
      { id: 'fence_front', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist:  2.1, scale: 0.88 },
      // Shoulder flora.
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: -0.6, scale: 0.36 },
      { id: 'tuft_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist:  1.0, scale: 0.42 },
    ],
  },
  {
    id: 'garden_mid_left_purple_wall_cluster',
    weight: 0,
    proceduralOk: false,
    items: [
      // Two-brick wall row — clear "wall" silhouette in the mid band.
      { id: 'brick_a', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.94, variant: 0 },
      { id: 'brick_b', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.2, scale: 0.94, variant: 1 },
      { id: 'brick_c', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist:  1.4, scale: 0.86, variant: 0 },
      // Question block — visually floats ABOVE the brick row via
      // yOffset. No graph parenting (question_block.allowedParents =
      // ['ground'] in the semantic registry; QBLOCK_FLOATING validator
      // accepts proximity to a structural sibling instead).
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.5, scale: 0.78, yOffset: -52 },
      // v4.2 — P2 reference-match: pushed +8 beyond structural items (dist 0.0/−1.2)
      // so the tree sorts clearly behind the wall cluster and avoids z-fighting.
      { id: 'tree_back', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'tree_round', laneBand: LANE_BANDS.NATURE, lane: 2.94, dist:  8.6, scale: 0.78, yOffset: -8 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.72, dist:  3.8, scale: 0.66 },
      // Single flower on shoulder.
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist:  0.7, scale: 0.34 },
    ],
  },
  {
    id: 'garden_mid_right_stone_step_cluster',
    weight: 0,
    proceduralOk: false,
    items: [
      // Stone step — signature side structure.
      { id: 'step', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_step', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 0.96 },
      // Foundation block behind the step — visual support / volume.
      { id: 'block_support', role: 'support', anchor: 'ground', zLayer: 9,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.4, scale: 0.92, variant: 1 },
      { id: 'brick_back', role: 'support', anchor: 'ground', zLayer: 8,
        assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.14, dist:  1.8, scale: 0.78, variant: 0 },
      // Mushroom topper on the support block.
      { id: 'mushroom_top', role: 'topper', parentId: 'block_support', anchor: 'top', zLayer: 12,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.4, scale: 0.52, variant: 'red', yOffset: -60 },
      // Bush accent on shoulder.
      { id: 'bush_front', role: 'loose-decor', anchor: 'ground', zLayer: 6,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.62, dist: 0.8, scale: 0.62 },
      { id: 'fence_front', role: 'foreground-accent', anchor: 'ground', zLayer: 25,
        assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: 2.5, scale: 0.70 },
      // Single flower for shoulder fill.
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: 1.6, scale: 0.40 },
    ],
  },
  {
    id: 'garden_far_castle_approach_cluster',
    weight: 0,
    proceduralOk: false,
    items: [
      // Tiny side-local silhouettes, mirrored by DecorationSystem. Keeps
      // the castle-approach band from looking empty without spawning one
      // prefab across both sides and muddying the road axis.
      { id: 'tuft_edge', role: 'loose-decor', anchor: 'ground', zLayer: 4,
        assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane:  1.74, dist:  0.0, scale: 0.34 },
      { id: 'leaf_back', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane:  1.66, dist:  0.9, scale: 0.40 },
      { id: 'leaf_outer', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.NATURE, lane:  2.54, dist:  1.8, scale: 0.36 },
      { id: 'flower_edge', role: 'loose-decor', anchor: 'ground', zLayer: 4,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane:  1.52, dist: -1.0, scale: 0.22 },
    ],
  },

  // ── v4.23 — M11 Reference-Match Garden Setpieces ─────────────────────────
  // Five hand-composed garden setpieces built ENTIRELY from existing,
  // already-rendered assets (verified via DecorationSystem.assetTypeToSceneryType
  // — no stone_* / un-wired keys). Three are dual-use (HERO swap + procedural
  // pool, replacing the 3 weakest generic stacks); two are HERO/far-only.
  // All solids live in STRUCTURE (lane ≥1.92) or NATURE (lane ≥2.6) — well off
  // the road; flora in SHOULDER. Gold flowers are kept minimal and away from
  // the road so the on-road orchid trail stays the dominant gold element.
  {
    // (1) TERRACE — stepped grass-dirt blocks + platform edge + purple flower
    // bed + bush mass + mushroom crown. Reads as a designed garden terrace,
    // not isolated blocks. Dual-use (HERO 70 L + procedural).
    id: 'garden-terrace-setpiece',
    weight: 4,
    proceduralOk: true,
    items: [
      { id: 'block_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.98, variant: 0 },
      { id: 'block_upper', role: 'loose-decor', anchor: 'top', zLayer: 14,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.90, variant: 1, yOffset: -138 },
      { id: 'platform_edge', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 2.08, dist:  1.4, scale: 0.84 },
      { id: 'mushroom_crown', role: 'topper', parentId: 'block_base', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.48, variant: 'red', yOffset: -248 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.78, dist: -1.8, scale: 0.80 },
      { id: 'flower_bed_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist:  1.0, scale: 0.48 },
      { id: 'flower_bed_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -1.2, scale: 0.44 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist:  1.9, scale: 0.46 },
    ],
  },
  {
    // (2) PIPE GARDEN — green pipe integrated with blue mushroom, flowers,
    // bush + grass. Pipe is DECORATIVE on the side (lane 2.12, off-road) —
    // never a lane obstacle. Dual-use (HERO 112 R + procedural).
    id: 'pipe-garden-setpiece',
    weight: 4,
    proceduralOk: true,
    items: [
      { id: 'block_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.4, scale: 0.92, variant: 0 },
      { id: 'pipe', role: 'base', anchor: 'ground', zLayer: 12,
        assetType: 'green_pipe', laneBand: LANE_BANDS.STRUCTURE, lane: 2.12, dist:  0.0, scale: 1.02, yOffset: -8 },
      { id: 'mushroom_blue', role: 'base', anchor: 'ground', zLayer: 11,
        assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist:  1.2, scale: 0.56 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.64, dist: -1.0, scale: 0.56 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist:  0.8, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.46, dist: -1.6, scale: 0.40 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist:  1.9, scale: 0.46 },
    ],
  },
  {
    // (3) VERTICAL PLATFORM GARDEN — block base + floating platform +
    // hanging-vine platform (OUTER) + two staggered question blocks: height &
    // silhouette variety. STRUCTURE band, off-road — reads as a vertical
    // garden structure, NOT a playable obstacle. HERO-only (kept OUT of the
    // procedural pool to avoid vertical repetition in the deep corridor).
    id: 'vertical-platform-garden',
    weight: 0,
    proceduralOk: false,
    items: [
      { id: 'block_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.96, variant: 0 },
      { id: 'platform_mid', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist: -0.6, scale: 0.90, variant: 1 },
      { id: 'hanging', role: 'base', anchor: 'ground', zLayer: 14,
        assetType: 'hanging_platform_vines', laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist:  1.5, scale: 0.82 },
      { id: 'qblock_a', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist: -0.6, scale: 0.80, yOffset: -150 },
      { id: 'qblock_b', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.74, yOffset: -232 },
      { id: 'leaf_base', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.62, dist: -1.4, scale: 0.50 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist:  1.2, scale: 0.44 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist:  1.9, scale: 0.44 },
    ],
  },
  {
    // (4) TREE & BUSH ISLAND — one tree + two low bushes + leaf + flora.
    // Organic mass that breaks up empty side fields. NATURE-band background
    // depth (lane ≥2.66) so it never becomes a road-edge wall. Dual-use
    // (HERO 97 R + 130 L + procedural).
    id: 'tree-bush-island',
    weight: 4,
    proceduralOk: true,
    items: [
      { id: 'tree', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'tree_round', laneBand: LANE_BANDS.NATURE, lane: 2.92, dist:  0.0, scale: 0.82, variant: 0, yOffset: -8 },
      { id: 'bush_a', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large', laneBand: LANE_BANDS.NATURE, lane: 2.66, dist: -1.4, scale: 0.72 },
      { id: 'bush_b', role: 'background-accent', anchor: 'ground', zLayer: 5,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.80, dist:  1.6, scale: 0.70 },
      { id: 'leaf', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.78, dist:  0.8, scale: 0.54 },
      { id: 'flower_a', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.60, dist: -0.8, scale: 0.46 },
      { id: 'flower_b', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.48, dist:  1.4, scale: 0.30 },
      { id: 'tuft', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'grass_tuft_large', laneBand: LANE_BANDS.SHOULDER, lane: 1.70, dist: -1.8, scale: 0.48 },
    ],
  },
  {
    // (5) DISTANT LANDMARK — larger far-side scenic island: stacked blocks +
    // platform edge + qblock + mushroom crown + tree backdrop + bush mass.
    // Far-side lanes (block 2.10, platform/qblock 2.32, tree 3.00) keep it
    // well off the corridor — a 300-600m "wow" silhouette with ZERO road /
    // orchid risk. HERO/far-landmark only (proceduralOk:false).
    id: 'distant-garden-landmark',
    weight: 0,
    proceduralOk: false,
    items: [
      { id: 'block_base', role: 'base', anchor: 'ground', zLayer: 10,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist:  0.0, scale: 1.00, variant: 0 },
      { id: 'block_upper', role: 'loose-decor', anchor: 'top', zLayer: 14,
        assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist:  0.0, scale: 0.92, variant: 1, yOffset: -140 },
      { id: 'platform_edge', role: 'base', anchor: 'ground', zLayer: 15,
        assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 2.32, dist:  1.7, scale: 0.92 },
      { id: 'mushroom_crown', role: 'topper', parentId: 'block_base', anchor: 'top', zLayer: 20,
        assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 2.10, dist:  0.0, scale: 0.54, variant: 'red', yOffset: -250 },
      { id: 'qblock', role: 'loose-decor', anchor: 'ground', zLayer: 18,
        assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 2.32, dist:  1.7, scale: 0.78, yOffset: -150 },
      { id: 'tree_back', role: 'background-accent', anchor: 'ground', zLayer: 3,
        assetType: 'tree_round', laneBand: LANE_BANDS.NATURE, lane: 3.00, dist:  2.6, scale: 0.92, variant: 0, yOffset: -10 },
      { id: 'bush_back', role: 'background-accent', anchor: 'ground', zLayer: 4,
        assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.NATURE, lane: 2.74, dist: -2.0, scale: 0.80 },
      { id: 'flower', role: 'loose-decor', anchor: 'ground', zLayer: 5,
        assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist:  1.2, scale: 0.46 },
    ],
  },
]);

/**
 * v3.8.38 — Phase 4 composition intents. Each prefab is annotated with
 * a `kind` describing its role in the visible-corridor composition.
 * DecorationSystem reads this map to avoid consecutive prefabs of the
 * same intent on the same side, producing visible variety without
 * rewriting every prefab definition.
 *
 *   flora-mix         soft cluster of small flora + minor structure
 *   pipe-landmark     pipe-anchored cluster — the corridor's iconic beat
 *   support-stack     brick / wall stack — vertical mass + readable form
 *   platform-cluster  floating platform + child decor — mid-band depth
 *   cluster           dense multi-element cluster (visual heat)
 *   fence-row         repeating fence sections
 *   corner-anchor     bottom-corner foreground framing
 *   vertical-landmark tall column to break the silhouette
 *   hero-landmark     curated HERO_LAYOUT-specific composition
 *   step-feature      step-block + small accent
 *   landscape         large soft landscape band (cliff, meadow)
 */
export const PREFAB_INTENT_BY_ID = Object.freeze({
  'cliff-flower-meadow':              'landscape',
  'grass-wall-mushroom':              'flora-mix',
  'pipe-vine-garden':                 'pipe-landmark',
  'blockstack-platform':              'support-stack',
  'brick-corridor-segment':           'support-stack',
  'qblock-floating-cluster':          'cluster',
  'wall-and-mushroom-grove':          'flora-mix',
  'pipe-with-flowers':                'pipe-landmark',
  'pipe-mushroom-platform':           'pipe-landmark',
  'dense-platform-trio':              'platform-cluster',
  'fence-bush-corner':                'fence-row',
  'long-platform-with-mushroom':      'platform-cluster',
  'long-platform-question-stack':     'platform-cluster',
  'platform-pipe-flowers':            'platform-cluster',
  'wall-stack-near':                  'support-stack',
  'corner-platform-mushroom-frame':   'corner-anchor',
  'platform-qblock-stack':            'cluster',
  'pipe-stairs-flower-bed':           'pipe-landmark',
  'tall-block-stack-vertical':        'vertical-landmark',
  'hero-layered-corner-brick':        'hero-landmark',
  'hero-layered-platform-qblocks':    'hero-landmark',
  'hero-layered-pipe-landmark':       'hero-landmark',
  'hero-layered-brick-cascade':       'hero-landmark',
  'fence-flower-row':                 'fence-row',
  'near-foreground-frame':            'foreground-frame',
  'platform-high-cliff':              'vertical-landmark',
  'organic-meadow':                   'landscape',
  'leaf-forest-edge':                 'flora-mix',
  'blue-mushroom-grove':              'flora-mix',
  'large-bush-garden':                'landscape',
  'hanging-platform-garden':          'platform-cluster',
  'big-bush-wall':                    'flora-mix',
  'wall-continuous-3block':           'support-stack',
  'elevated-platform-wall':           'platform-cluster',
  'garden-chain-platform-fence':      'platform-cluster',
  'step-left-with-mushroom':          'step-feature',
  // v3.8.42 — Phase 7b foreground anchors.
  'foreground-left-anchor':           'hero-landmark',
  'foreground-right-anchor':          'hero-landmark',
  'garden_foreground_left_platform_cluster': 'hero-landmark',
  'garden_foreground_right_pipe_cluster':    'hero-landmark',
  'garden_mid_left_purple_wall_cluster':     'hero-landmark',
  'garden_mid_right_stone_step_cluster':     'hero-landmark',
  'garden_far_castle_approach_cluster':      'landscape',
  // v4.0 — scatter flora patches.
  'scatter-violet-tuft':              'flora-mix',
  // v4.23 — M11 garden setpieces.
  'garden-terrace-setpiece':          'platform-cluster',
  'pipe-garden-setpiece':             'pipe-landmark',
  'vertical-platform-garden':         'vertical-landmark',
  'tree-bush-island':                 'flora-mix',
  'distant-garden-landmark':          'landscape',
});

/**
 * v3.8.43 — Phase 7c composition metadata for hero-tier prefabs.
 *
 * Each entry is the rule sheet for one prefab — zone it belongs in,
 * compositional role, density policy, distance range, and clearance
 * requirements. HERO_LAYOUT slots and (future) composition validators
 * read this map; absent entries default to "free procedural decor"
 * with no constraints.
 *
 * Fields:
 *   zone               foreground | nearMid | mid | midFar | far | castleApproach
 *   side               left | right | either
 *   role               frame (anchors the scene) | structural (mid landmark) |
 *                      filler (soft transition) | landmark (deep silhouette)
 *   densityWeight      0-5 — how often this is acceptable on a screen
 *   allowedDepthRange  [min, max] in world units
 *   minSpacingFromSameType  world units between two of these on the same side
 *   requiresSupport    true if all heavy items need a ground/parent
 *   roadClearance      min lane distance from road centre (1.5 = road edge)
 */
export const PREFAB_COMPOSITION_METADATA = Object.freeze({
  'foreground-left-anchor': {
    zone: 'foreground', side: 'left', role: 'frame',
    densityWeight: 1, allowedDepthRange: [16, 32],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'foreground-right-anchor': {
    zone: 'foreground', side: 'right', role: 'frame',
    densityWeight: 1, allowedDepthRange: [16, 32],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'fence-flower-row': {
    zone: 'nearMid', side: 'either', role: 'filler',
    densityWeight: 3, allowedDepthRange: [40, 60],
    minSpacingFromSameType: 60, requiresSupport: false, roadClearance: 1.5,
  },
  'hero-layered-platform-qblocks': {
    zone: 'mid', side: 'either', role: 'structural',
    densityWeight: 2, allowedDepthRange: [60, 90],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'corner-platform-mushroom-frame': {
    zone: 'mid', side: 'either', role: 'structural',
    densityWeight: 2, allowedDepthRange: [70, 95],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'brick-corridor-segment': {
    zone: 'midFar', side: 'either', role: 'structural',
    densityWeight: 2, allowedDepthRange: [95, 115],
    minSpacingFromSameType: 50, requiresSupport: true, roadClearance: 1.6,
  },
  'leaf-forest-edge': {
    zone: 'far', side: 'either', role: 'landmark',
    densityWeight: 1, allowedDepthRange: [125, 155],
    minSpacingFromSameType: 40, requiresSupport: false, roadClearance: 1.4,
  },
  'organic-meadow': {
    zone: 'far', side: 'either', role: 'landmark',
    densityWeight: 1, allowedDepthRange: [140, 165],
    minSpacingFromSameType: 40, requiresSupport: false, roadClearance: 1.4,
  },
  // v3.8.51 Phase 9 — Garden Corridor Reference cluster metadata.
  'garden_foreground_left_platform_cluster': {
    zone: 'foreground', side: 'left', role: 'frame',
    densityWeight: 1, allowedDepthRange: [12, 32],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'garden_foreground_right_pipe_cluster': {
    zone: 'foreground', side: 'right', role: 'frame',
    densityWeight: 1, allowedDepthRange: [18, 38],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'garden_mid_left_purple_wall_cluster': {
    zone: 'mid', side: 'left', role: 'structural',
    densityWeight: 2, allowedDepthRange: [60, 140],
    minSpacingFromSameType: 50, requiresSupport: true, roadClearance: 1.7,
  },
  'garden_mid_right_stone_step_cluster': {
    zone: 'mid', side: 'right', role: 'structural',
    densityWeight: 2, allowedDepthRange: [70, 130],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'garden_far_castle_approach_cluster': {
    zone: 'far', side: 'either', role: 'landmark',
    densityWeight: 1, allowedDepthRange: [155, 200],
    minSpacingFromSameType: 25, requiresSupport: false, roadClearance: 1.4,
  },
  'garden-chain-platform-fence': {
    zone: 'nearMid', side: 'either', role: 'structural',
    densityWeight: 3, allowedDepthRange: [28, 70],
    minSpacingFromSameType: 32, requiresSupport: true, roadClearance: 1.7,
  },
  // v4.23 — M11 garden setpiece metadata (audit-only hints).
  'garden-terrace-setpiece': {
    zone: 'mid', side: 'either', role: 'structural',
    densityWeight: 2, allowedDepthRange: [55, 150],
    minSpacingFromSameType: 50, requiresSupport: true, roadClearance: 1.7,
  },
  'pipe-garden-setpiece': {
    zone: 'mid', side: 'either', role: 'structural',
    densityWeight: 2, allowedDepthRange: [90, 150],
    minSpacingFromSameType: 50, requiresSupport: true, roadClearance: 1.7,
  },
  'vertical-platform-garden': {
    zone: 'mid', side: 'either', role: 'structural',
    densityWeight: 1, allowedDepthRange: [80, 120],
    minSpacingFromSameType: 999, requiresSupport: true, roadClearance: 1.7,
  },
  'tree-bush-island': {
    zone: 'mid', side: 'either', role: 'filler',
    densityWeight: 2, allowedDepthRange: [90, 150],
    minSpacingFromSameType: 40, requiresSupport: false, roadClearance: 1.6,
  },
  'distant-garden-landmark': {
    zone: 'far', side: 'either', role: 'landmark',
    densityWeight: 1, allowedDepthRange: [230, 470],
    minSpacingFromSameType: 25, requiresSupport: true, roadClearance: 1.4,
  },
});

/**
 * v3.8.51 — Phase 9 Garden Corridor Reference theme.
 *
 * Declarative theme constant. The default visual composition for the
 * current game. Owns:
 *   - heroLayoutPrefabs: the set of prefab IDs HERO_LAYOUT is allowed
 *     to reference. Tests enforce membership.
 *   - procedural:        curated subset of SIDE_DECORATION_PREFABS that
 *     procedural fill (DecorationSystem, distance > 200m) is allowed
 *     to pick from. Filters out generic clusters that don't match the
 *     garden look.
 *   - palette:           designer-facing notes on signature elements
 *     and zone targets per depth band.
 */
export const THEMES = Object.freeze({
  GARDEN_CORRIDOR_REFERENCE: Object.freeze({
    heroLayoutPrefabs: Object.freeze([
      'garden_foreground_left_platform_cluster',
      'garden_foreground_right_pipe_cluster',
      'garden_mid_left_purple_wall_cluster',
      'garden_mid_right_stone_step_cluster',
      'garden_far_castle_approach_cluster',
      'fence-flower-row',
      'hero-layered-platform-qblocks',
      'corner-platform-mushroom-frame',
      'brick-corridor-segment',
      'leaf-forest-edge',
      'organic-meadow',
      // v4.10 — larger near transition groups replace two light fence rows.
      'hero-layered-corner-brick',
      'hero-layered-pipe-landmark',
      // v4.5 — new continuous-wall prefabs used in HERO_LAYOUT gap-fills.
      'wall-continuous-3block',
      'elevated-platform-wall',
      'garden-chain-platform-fence',
      // v4.6 — reference-match (P3a): fence/bush prefab used for the
      // right-corner foreground framing (left corner uses fence-flower-row,
      // already listed above).
      'fence-bush-corner',
      // v4.23 — M11 garden setpieces + far landmark + de-mirror grove.
      'garden-terrace-setpiece',
      'pipe-garden-setpiece',
      'vertical-platform-garden',
      'tree-bush-island',
      'distant-garden-landmark',
      'blue-mushroom-grove',
    ]),
    procedural: Object.freeze([
      // Procedural pool — garden-aesthetic clusters only. Excludes any
      // prefab that doesn't use a signature element (purple_brick,
      // green_pipe, question_block, mushroom, fence) or that reads as
      // generic flower-scatter.
      'cliff-flower-meadow',
      'grass-wall-mushroom',
      'pipe-vine-garden',
      'brick-corridor-segment',
      'qblock-floating-cluster',
      'wall-and-mushroom-grove',
      'pipe-with-flowers',
      'pipe-mushroom-platform',
      'fence-bush-corner',
      'long-platform-with-mushroom',
      'long-platform-question-stack',
      'platform-pipe-flowers',
      'platform-qblock-stack',
      // v4.23 — M11 C2: 3 weakest generic stacks (blockstack-platform,
      // dense-platform-trio, wall-stack-near) replaced by composed setpieces.
      'garden-terrace-setpiece',
      'pipe-garden-setpiece',
      'tree-bush-island',
      'pipe-stairs-flower-bed',
      'tall-block-stack-vertical',
      'fence-flower-row',
      'hanging-platform-garden',
      'big-bush-wall',
      // v4.10 — coherent organic masses supplement structural clusters;
      // the independent GroundScatterSystem owns small-flora patches.
      'scatter-violet-tuft',
      'leaf-forest-edge',
      'organic-meadow',
      'large-bush-garden',
      'blue-mushroom-grove',
      // v4.5 — continuous-wall clusters + unlocked hero-layered compositions.
      'wall-continuous-3block',
      'elevated-platform-wall',
      'hero-layered-corner-brick',
      'hero-layered-brick-cascade',
      'garden-chain-platform-fence',
    ]),
    palette: Object.freeze({
      signatureSideStructure: ['purple_brick_single', 'green_pipe', 'stone_wall_low', 'fence_wood_short'],
      signatureStackable:     ['mushroom_red_big', 'mushroom_blue_big', 'question_block'],
      signaturePlatform:      ['floating_platform', 'hanging_platform_vines', 'grass_dirt_platform_long'],
      signatureBackground:    ['tree_round', 'bush_large_with_purple_flowers'],
      signatureFlora:         ['yellow_flower_small', 'purple_flower_single', 'grass_tuft', 'grass_tuft_large'],
      signatureGameplay:      ['vine_barrier', 'dry_grass_obstacle', 'golden_flower', 'rare_orchid_pickup'],
    }),
  }),
});

/**
 * v3.8.51 — Phase 9 explicit depth bands.
 *
 * Range = [minDistance, maxDistance) in world-distance units. HERO_LAYOUT
 * entries must respect maxClustersPerSide per band per side.
 *
 * IMPORTANT: `maxClustersPerSide` is an AUDIT-ONLY budget — enforced solely
 * by the build-time composition audit (scripts/validate-composition.mjs). NO
 * runtime system reads it; it is NOT part of placement/spawn logic. Changing
 * it only affects whether `npm run audit:composition` passes, never in-game
 * behaviour. `targetScale` is likewise a designer HINT — not enforced.
 */
export const DEPTH_BANDS = Object.freeze({
  // v4.6 — reference-match (P3a): 1→2 so each bottom corner carries both a
  // garden anchor cluster AND a low fence/bush framing prefab (the
  // reference frames the foreground corners with fences + bushes).
  // v4.21 — Phase 1: 2→3 to admit the curated `near-foreground-frame` layer
  // planted in FRONT of the corner fences. This cap is a BUILD-TIME audit
  // guard (validate-composition.mjs) on HERO_LAYOUT authoring only — the
  // runtime never reads maxClustersPerSide, so this is a static-check
  // allowance, not a gameplay/spawn change. Procedural fill floors at 200m,
  // so FOREGROUND stays fully HERO_LAYOUT-curated.
  FOREGROUND:       { range: [  0,  30], maxClustersPerSide: 3, targetScale: 1.00, roadClearanceMin: 1.7 },
  NEAR:             { range: [ 30,  80], maxClustersPerSide: 2, targetScale: 0.80, roadClearanceMin: 1.5 },
  // MID is the corridor band — spec calls for "smaller repeated corridor
  // beats" so 3 clusters per side fits the dense-but-readable target.
  // v4.6 — reference-match (P2): both sides were already at the cap of 3,
  // so it was the limiting factor preventing a continuous mid corridor.
  // 3→4 opens one slot/side for a wide continuous-wall beat in the largest
  // gap (still spread across a 70-unit band — continuous-feeling, not solid).
  MID:              { range: [ 80, 150], maxClustersPerSide: 4, targetScale: 0.55, roadClearanceMin: 1.6 },
  // CASTLE_APPROACH is the longest band (70m). Allows 2 small clusters
  // per side — one symmetric tiny accent ~165/175 + one fade-in
  // background landmark ~195/210 — without competing with the castle.
  CASTLE_APPROACH:  { range: [150, 220], maxClustersPerSide: 2, targetScale: 0.40, roadClearanceMin: 1.4 },
  FAR:              { range: [220, 999], maxClustersPerSide: 1, targetScale: 0.30, roadClearanceMin: 1.2 },
});

/** Resolve a world distance to a DEPTH_BANDS key. */
export function bandForDistance(distance) {
  for (const [name, b] of Object.entries(DEPTH_BANDS)) {
    if (distance >= b.range[0] && distance < b.range[1]) return name;
  }
  return 'FAR';
}

/**
 * v3.8.21 — Deterministic HERO LAYOUT for the first ~150 m of every run.
 *
 * The user flagged: weighted-random prefab rotation sometimes lands a
 * great composition, sometimes a sparse one. Target reference is clearly
 * authored — fixed foreground anchors, visible question blocks, a
 * dedicated pipe landmark — not procedural scatter. This list pins
 * SPECIFIC prefabs at SPECIFIC distances + sides so the opening of every
 * run reads as a curated scene. Procedural decor still spawns AFTER the
 * last hero entry (distance > 150) and during gameplay.
 *
 * Each entry: { distance, side, prefabId } where prefabId references an
 * `id` in SIDE_DECORATION_PREFABS. Read by DecorationSystem.prepopulate.
 *
 * Layout philosophy:
 *   12-20  → strong bottom-corner anchors (left first, then right)
 *   30-40  → mid-near question blocks + brick beats
 *   55-70  → mid pipe landmark + foreground frame
 *   85-100 → mid-far depth layers
 *   120-140 → small far-corridor tail
 *   > 150  → handed off to weighted random
 */
/**
 * v3.8.42 — Phase 7b aggressive recomposition. The Phase 7 v2 layout
 * (11 entries) still felt like dense procedural scattering. v3 cuts to
 * the brief's "4-6 hand-composed hero clusters" target and adds a
 * `scaleMultiplier` per entry so each depth zone has a different visual
 * weight — driving perspective through scale, not just position.
 *
 *   NEAR FOREGROUND  (20-30m)  — 1 anchor per side, scale 1.0.
 *                                Hand-composed foreground-*-anchor
 *                                prefabs lean against the road frame
 *                                without crossing into the gameplay
 *                                corridor.
 *   MID              (60-80m)  — 1 structural per side, scale 0.75.
 *                                Reused hero-layered-platform-qblocks +
 *                                corner-platform-mushroom-frame, scaled
 *                                down so they read smaller than the
 *                                near anchors (perspective sells the
 *                                depth).
 *   FAR              (130-150m)— tiny silhouettes only, scale 0.40.
 *                                Soft organic-meadow + leaf-forest-edge.
 *   CASTLE APPROACH  (150m+)   — DELIBERATELY EMPTY. No HERO_LAYOUT
 *                                entries, no procedural fill before
 *                                ~200m (see DecorationSystem). The
 *                                road→castle axis must own this band.
 *
 * Removed vs Phase 7 v2 (5 entries dropped):
 *   - brick-corridor-segment @ 82       (left brick clutter)
 *   - long-platform-with-mushroom @ 100 (mid mushroom repeat)
 *   - fence-flower-row @ 118            (mid fence noise)
 *   - fence-flower-row @ 188            (castle-approach noise)
 *   - large-bush-garden @ 196           (castle-approach noise)
 * Replaced (2 entries swapped to new foreground anchors):
 *   - hero-layered-corner-brick @ 16  → foreground-left-anchor @ 20
 *   - hero-layered-pipe-landmark @ 22 → foreground-right-anchor @ 30
 * Repositioned + rescaled (2 entries):
 *   - hero-layered-platform-qblocks 42 → 60 @ 0.75
 *   - corner-platform-mushroom-frame 58 → 80 @ 0.75
 *
 * Net change: 11 entries → 6. ~45% lower beat density.
 */
/**
 * v3.8.43 — Phase 7c richness restoration. Phase 7b's 6-entry layout
 * went too far in the trim direction — the side band read as "empty
 * grass field" instead of "intentional perspective corridor". v3 adds
 * back two intermediate beats (a soft filler at near-mid 48m + a
 * purple-brick mid-far at 108m) so each depth band has a composed
 * landmark instead of a gap. Total: 6 → 8 entries.
 *
 * Composition variety across the layout:
 *   ANCHOR LEFT  — mushroom + block + brick + flora
 *   ANCHOR RIGHT — pipe + bush + brick + fence + flower
 *   FILLER       — fence + flowers (low-density transition beat)
 *   MID LEFT     — platform + qblocks + wall + mushroom topper
 *   MID RIGHT    — platform + mushroom topper + brick + fence
 *   MID-FAR LEFT — bricks + qblock + small flora (purple beat)
 *   FAR RIGHT    — leaves cluster
 *   FAR LEFT     — meadow + ground mushroom
 *
 * CASTLE APPROACH (155m+) stays deliberately empty so the road→castle
 * axis remains the dominant visual line.
 */
/**
 * v3.8.51 — Phase 9 Garden Corridor Reference layout (14 entries).
 *
 * Density-tuned for the reference look: every depth band has a
 * composed cluster on at least one side. Signature elements (purple
 * brick, green pipe, mushroom, question block, stone step) appear
 * within the first 90m so the foreground frame reads immediately.
 *
 *   FOREGROUND  (0–30)    2 hand-composed garden anchors
 *   NEAR        (30–80)   2 transition filler + 2 structural mid prefabs
 *   MID         (80–150)  4 structural beats with rhythm reuse
 *   CASTLE_APPR (150–220) 2 symmetric tiny side accents (no large mass)
 *   FAR         (220+)    2 background landmarks for silhouette only
 *
 * 215m+ is deliberately empty for the road→castle axis (preserved).
 */
export const HERO_LAYOUT = Object.freeze([
  // v4.6 — reference-match (P3a): symmetric low fence/bush corner framing
  // anchoring the bottom corners (like the reference). Distinct prefabs so
  // the corners aren't a mirror-identical copy: left fence+flowers,
  // right fence+bush. Nearest-entry scale ~0.95-1.05.
  // v4.8 — reference-match: pull both corner fences to the very front edge
  // and enlarge them so they read as a clear foreground frame instead of a
  // faint picket. Left nearer/larger than right keeps the corners framed
  // without being a mirror-identical copy. With the near-foreground-frame
  // added below, FOREGROUND [0,30) now holds 3 clusters/side (DEPTH_BANDS cap
  // raised 2→3 for the v4.21 near layer).
  // v4.21 Phase 1 — near-foreground frame, planted IN FRONT of the corner
  // fences so the very-near bottom corners read rich instead of empty grass.
  // Curated (useRng=false in DecorationSystem) → zero world.rng draws.
  { distance:   6, side: -1, prefabId: 'near-foreground-frame',                   scaleMultiplier: 1.22 },
  { distance:   8, side:  1, prefabId: 'near-foreground-frame',                   scaleMultiplier: 1.18 },
  { distance:  11, side: -1, prefabId: 'fence-flower-row',                        scaleMultiplier: 1.28 },
  { distance:  14, side:  1, prefabId: 'fence-bush-corner',                       scaleMultiplier: 1.24 },
  // FOREGROUND — left platform + mushroom + brick / right pipe + brick.
  { distance:  18, side: -1, prefabId: 'garden_foreground_left_platform_cluster', scaleMultiplier: 1.18 },
  { distance:  25, side:  1, prefabId: 'garden_foreground_right_pipe_cluster',    scaleMultiplier: 1.16 },
  // NEAR — layered transition groups keep the corridor composed instead of
  // falling back to two light rows of evenly distributed flora.
  { distance:  46, side: -1, prefabId: 'garden-chain-platform-fence',              scaleMultiplier: 0.88 },
  // v4.22 — M8 de-mirror: the 46(L)/58(R) garden-chain-platform-fence pair read
  // as copy-paste. Swap the RIGHT echo to a softer organic flora beat (existing
  // prefab, flora-mix) so the two sides differ in silhouette. NEAR cluster count
  // per side is unchanged (2) → composition audit unaffected. Left opener kept.
  { distance:  58, side:  1, prefabId: 'grass-wall-mushroom',                      scaleMultiplier: 0.84 },
  // v4.16 — soften the early right-side wall beat into a lower bush/fence
  // composition so the opening reads as a garden edge, not a corridor wall.
  { distance:  68, side:  1, prefabId: 'fence-bush-corner',                        scaleMultiplier: 0.80 },
  // NEAR/MID — signature structural clusters.
  { distance:  70, side: -1, prefabId: 'garden-terrace-setpiece',     scaleMultiplier: 0.78 },
  { distance:  82, side:  1, prefabId: 'garden_mid_right_stone_step_cluster',     scaleMultiplier: 0.75 },
  // MID — existing strong prefabs as rhythm beats.
  // v4.6 — reference-match (P2): MID continuity beats filling the largest
  // per-side gaps (left 80→100, right 82→112) with wide continuous-span
  // walls so the mid corridor reads near-continuous, not clustered.
  { distance:  88, side: -1, prefabId: 'vertical-platform-garden',                 scaleMultiplier: 0.70 },
  { distance:  97, side:  1, prefabId: 'tree-bush-island',               scaleMultiplier: 0.68 },
  { distance: 100, side: -1, prefabId: 'hero-layered-platform-qblocks',           scaleMultiplier: 0.65 },
  { distance: 112, side:  1, prefabId: 'pipe-garden-setpiece',          scaleMultiplier: 0.62 },
  // MID — second purple-wall beat + brick-corridor for visual rhythm.
  { distance: 130, side: -1, prefabId: 'tree-bush-island',     scaleMultiplier: 0.50 },
  // v4.5 — gap-fill: left side had no MID entry between 100 and 130.
  // MID left: 100 (1/3), 130 (2/3) → adding third at 118.
  { distance: 118, side: -1, prefabId: 'platform-qblock-stack',                   scaleMultiplier: 0.58 },
  { distance: 142, side:  1, prefabId: 'brick-corridor-segment',                  scaleMultiplier: 0.48 },
  // CASTLE_APPROACH — symmetric tiny accents only.
  { distance: 165, side: -1, prefabId: 'garden_far_castle_approach_cluster',      scaleMultiplier: 0.40 },
  { distance: 175, side:  1, prefabId: 'blue-mushroom-grove',      scaleMultiplier: 0.38 },
  // FAR — low-detail silhouettes.
  { distance: 195, side: -1, prefabId: 'leaf-forest-edge',                        scaleMultiplier: 0.34 },
  { distance: 210, side:  1, prefabId: 'organic-meadow',                          scaleMultiplier: 0.32 },
  // 215–250m — deliberately empty so the road→castle axis (150–220m) stays clean.
  // v4.23 — M11 C1: two one-shot far-landmark "wow" beats PAST the castle axis
  // (FAR band, prepopulate-only). distant-garden-landmark is HERO/far-only.
  { distance: 260, side: -1, prefabId: 'distant-garden-landmark',                 scaleMultiplier: 0.46 },
  { distance: 430, side:  1, prefabId: 'distant-garden-landmark',                 scaleMultiplier: 0.40 },
]);

/**
 * v3.8.23 — REPEATING road gameplay rhythm. Previously the road beats
 * were a one-shot opening layout (HERO_ROAD_LAYOUT); after distance 88
 * the road went quiet until procedural ticks took over, leaving the
 * player visibly running on an empty corridor in the mid-window.
 *
 * Now: HERO_ROAD_SEQUENCE is a CYCLE TEMPLATE. Entries are offsets
 * WITHIN a cycle of length HERO_ROAD_CYCLE_LENGTH. SpawnSystem stamps
 * the cycle at distances 0, CYCLE_LENGTH, 2 × CYCLE_LENGTH, ... so the
 * visible window always has flower routes, an obstacle beat, and a
 * reward path regardless of how far the player has run.
 *
 * Entry kinds (SpawnSystem.#spawnHeroRoadEntry):
 *   flower-line       N orchids in one lane spaced evenly
 *   flower-arc        N orchids transitioning from fromLane → toLane
 *   flower-zigzag     orchids hopping across explicit lanes list
 *   reward-cluster    N orchids tight at a single lane (post-obstacle)
 *   jump-obstacle     single-lane low obstacle (dry_grass / wheat)
 *   vine-with-rewards full-lane vine + approach trail + exit reward
 */
export const HERO_ROAD_CYCLE_LENGTH = 105;

export const HERO_ROAD_SEQUENCE = Object.freeze([
  // v3.8.26 — first flower-line slimmed (5 → 3, spacing 6 → 8) so a
  // hit happening right at cycle start isn't masked by a wall of bright
  // golden orchids around the player. The route still reads as
  // line→arc→vine but with breathing room near the player's body.
  { offsetInCycle:  4, kind: 'flower-line',  lane: 0, count: 3, spacing: 8 },
  { offsetInCycle: 28, kind: 'flower-arc',   fromLane: -1, toLane: 1, count: 4 },
  // 36-50: small jump obstacle + dense reward cluster after
  { offsetInCycle: 36, kind: 'jump-obstacle', lane: -1 },
  { offsetInCycle: 46, kind: 'reward-cluster', lane: 0, count: 4 },
  // 58-72: the strong mid-near vine + auto approach trail + exit reward
  { offsetInCycle: 60, kind: 'vine-with-rewards', lane: 0 },
  // 80-92: lane-change zigzag + final reward cluster
  { offsetInCycle: 80, kind: 'flower-zigzag', lanes: [1, 0, -1, 0, 1] },
  { offsetInCycle: 96, kind: 'reward-cluster', lane: 0, count: 4 },
]);

/**
 * v3.8.42 — Phase 7b aggressive trim. Previous list was 34 entries
 * (17 per side) placing a structure every ~12 distance units, which
 * dominated the corridor visually regardless of HERO_LAYOUT changes.
 *
 * Trimmed to 17 entries total (9 left, 8 right) — every-other
 * structure dropped, no near-distance (< 70m) heavy clutter. Trees
 * stay at varied depths as silhouette anchors. Single mid mushroom
 * + single qblock per side max.
 *
 * Removed (per side, near to far):
 *   LEFT  18 block, 31 qblock, 42 wall, 54 block, 78 qblock,
 *         119 brick, 174 block-2nd-variant.
 *   RIGHT 18 block, 31 qblock, 42 wall, 78 qblock, 104 fence,
 *         157 block, 168 block-2nd-variant.
 */
export const MIDGROUND_SCENERY = Object.freeze([
  // ── Left: trees as silhouettes, structures only at mid-far depths ──
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.08, distance: 184, scale: 1.02, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance: 174, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.98, distance: 163, scale: 1.02, variant: 0, yOffset: 0 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.82, distance: 143, scale: 0.98, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.10, distance: 131, scale: 0.90, variant: 0, yOffset: -10 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance: 104, scale: 0.88, variant: 0, yOffset: 0 },
  { assetType: 'floating_platform', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.96, distance:  91, scale: 1.10, variant: 0, yOffset: -35 },
  // v4.6 — reference-match (P3b): low hedge bridging the 20→131 treeline
  // gap so the far silhouette reads continuous. A bush (not a tree) keeps
  // the v4.3 anti-forest-wall thinning intact — low mass, no canopy.
  { assetType: 'bush_large_with_purple_flowers', zone: SCENE_ZONES.NATURE_LEFT, lane: -3.02, distance: 78, scale: 0.90 },
  // v4.3 — P3 reference-match: removed left tree @65 (too close to @131,
  // doubled the treeline density) and left tree @12 (foreground already
  // framed by FOREGROUND_FRAME_SCENERY; two overlapping near-trees read
  // as a forest wall).
  // ── Right: same trim, mirrored ──
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.96, distance: 188, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.10, distance: 178, scale: 1.00, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance: 168, scale: 1.02, variant: 2, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.94, distance: 145, scale: 0.96, variant: 0, yOffset: -95 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.84, distance: 131, scale: 0.92, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.08, distance: 119, scale: 0.86, variant: 0, yOffset: -10 },
  { assetType: 'hanging_platform_vines', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance:  65, scale: 0.82, yOffset: 0 },
  // v4.6 — reference-match (P3b): mirror low hedge bridging the right
  // 20→119 treeline gap. Bush, not tree — continuous low silhouette
  // without reintroducing the forest wall.
  { assetType: 'bush_large_with_purple_flowers', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.02, distance: 72, scale: 0.90 },
  // v4.3 — P3 reference-match: removed right tree @12 — mirrors left
  // side trim; FOREGROUND_FRAME_SCENERY handles the close-camera treeline.
]);

/**
 * v3.8.42 — Phase 7b foreground trim. Previous frame placed walls
 * + qblocks + blocks at distance 3-28 right under the camera. Result:
 * thick visual rail walking with the player. Now: trees + small
 * shoulder flora only. Walls/blocks/qblocks removed — HERO_LAYOUT's
 * foreground anchors at distance 20-30 carry the structural framing.
 */
export const FOREGROUND_FRAME_SCENERY = Object.freeze([
  // Left frame — a single tree remains as the lone tall foreground accent.
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_LEFT,     lane: -3.14, distance: 24, scale: 0.80, variant: 0, yOffset: -4 },
  // Left shoulder — small flowers / grass between road edge and frame.
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.36, distance: 15, scale: 0.48, variant: 0 },
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.40, distance: 10, scale: 0.44 },
  // Right frame — lower flowering mass instead of a second tall tree so
  // the player gets one open side-window in the opening view.
  { assetType: 'bush_large_with_purple_flowers', zone: SCENE_ZONES.NATURE_RIGHT, lane: 3.04, distance: 28, scale: 0.82, variant: 0 },
  // Right shoulder.
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.38,  distance: 13, scale: 0.46 },
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.36,  distance:  8, scale: 0.44, variant: 1 },
]);
