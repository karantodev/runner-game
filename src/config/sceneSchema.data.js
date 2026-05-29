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
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 1.06, variant: 0 },
      { assetType: 'purple_flower_single', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist: 0.9, scale: 0.48 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.0, scale: 0.32 },
      { assetType: 'grass_tuft', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 1.8, scale: 0.46 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.56, dist: -2.0, scale: 0.29 },
    ],
  },
  {
    id: 'grass-wall-mushroom',
    weight: 2,
    items: [
      { assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: 0.2, scale: 1.04, variant: 1 },
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
      { assetType: 'grass_dirt_wall', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -0.1, scale: 0.98, variant: 0 },
      { assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -0.8, scale: 0.72 },
      { assetType: 'leaf_clump_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.76, dist: 1.1, scale: 0.58 },
      { assetType: 'mushroom_blue_big', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: -1.6, scale: 0.54 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.54, dist: -0.7, scale: 0.31 },
    ],
  },
  {
    id: 'blockstack-platform',
    weight: 3,
    items: [
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: 0.0, scale: 0.84, variant: 1 },
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -0.9, scale: 0.78, variant: 0 },
      { assetType: 'question_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist: 0.5, scale: 0.70 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.44, dist: -1.5, scale: 0.30 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.82, dist: 2.2, scale: 0.28 },
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
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.88, variant: 0 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.4, scale: 0.86, variant: 1 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.7, scale: 0.74, yOffset: -42 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.4, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.9, scale: 0.30 },
    ],
  },
  {
    id: 'qblock-floating-cluster',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 0 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.0, scale: 0.72, yOffset: -90 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.70, yOffset: -150 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist:  1.3, scale: 0.42 },
      { assetType: 'grass_tuft',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.6, scale: 0.42 },
    ],
  },
  {
    id: 'wall-and-mushroom-grove',
    weight: 4,
    items: [
      { assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 0 },
      { assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.6, scale: 0.94, variant: 1 },
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.74, dist: -0.6, scale: 0.54, variant: 'red' },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.58, dist:  1.4, scale: 0.44 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist: -2.0, scale: 0.30 },
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
      { assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 0.92 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.0, scale: 0.48 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist: -0.8, scale: 0.42 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist:  1.6, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist: -1.8, scale: 0.30 },
    ],
  },
  {
    id: 'pipe-mushroom-platform',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.94, variant: 0 },
      { assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.6, scale: 0.84 },
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.42, variant: 'red', yOffset: -135 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.4, scale: 0.34 },
      { assetType: 'grass_tuft',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.9, scale: 0.42 },
    ],
  },
  {
    id: 'dense-platform-trio',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 1.00, variant: 1 },
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist: -1.4, scale: 0.92, variant: 2 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.70, yOffset: -125 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  1.4, scale: 0.78, variant: 0 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.9, scale: 0.30 },
    ],
  },
  {
    id: 'fence-bush-corner',
    weight: 3,
    items: [
      { assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.84 },
      { assetType: 'bush_large_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist: -1.0, scale: 0.62 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist:  1.2, scale: 0.32 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist: -1.8, scale: 0.40 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.80, dist:  1.9, scale: 0.40 },
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
      { assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.95 },
      { assetType: 'mushroom_red_big',         laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.50, variant: 'red',    yOffset: -120 },
      { assetType: 'purple_flower_single',     laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  1.0, scale: 0.44 },
      { assetType: 'yellow_flower_small',      laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -1.6, scale: 0.32 },
      { assetType: 'grass_tuft',               laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist:  1.7, scale: 0.42 },
    ],
  },
  {
    id: 'long-platform-question-stack',
    weight: 4,
    items: [
      { assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.92 },
      { assetType: 'question_block',           laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -0.7, scale: 0.78, yOffset: -118 },
      { assetType: 'question_block',           laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.7, scale: 0.74, yOffset: -118 },
      { assetType: 'grass_tuft_small',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist:  1.5, scale: 0.40 },
      { assetType: 'purple_flower_single',     laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist: -1.8, scale: 0.42 },
    ],
  },
  {
    id: 'platform-pipe-flowers',
    weight: 4,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 1 },
      { assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  1.5, scale: 0.88 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.68, dist: -1.1, scale: 0.52 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.52, dist:  1.2, scale: 0.46 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.40, dist: -1.9, scale: 0.30 },
    ],
  },
  {
    id: 'wall-stack-near',
    weight: 4,
    items: [
      // Near-depth cluster — tight, visually heavy. Spawns frequently with the
      // new sideDecorSpacing=18; fills middle depths.
      { assetType: 'grass_dirt_wall',  laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 0 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.74, variant: 1, yOffset: -110 },
      { assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.5, scale: 0.74 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist:  1.4, scale: 0.32 },
      { assetType: 'sprout_soil',      laneBand: LANE_BANDS.SHOULDER, lane: 1.42, dist: -1.8, scale: 0.30 },
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
      { assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 1.05 },
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.56, variant: 'red',    yOffset: -130 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.7, scale: 0.84, variant: 0 },
      { assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  1.6, scale: 0.78 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.62, dist:  0.8, scale: 0.46 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.6, scale: 0.32 },
    ],
  },
  {
    // (2) Platform with TWO question_blocks at different heights -- the
    // "arcade platformer" beat the user wants more of. Bricks below for
    // structural anchor.
    id: 'platform-qblock-stack',
    weight: 4,
    items: [
      { assetType: 'floating_platform',   laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.92, variant: 1 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.76, variant: 1, yOffset: -100 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.74, yOffset: -170 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist: -1.3, scale: 0.70, yOffset: -110 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist:  1.5, scale: 0.30 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.66, dist: -1.7, scale: 0.40 },
    ],
  },
  {
    // (3) Pipe + stairs identity beat. The stairs (grass_dirt_step_left)
    // auto-flips on right-side spawn so we get matching staircases on
    // both sides without a second asset.
    id: 'pipe-stairs-flower-bed',
    weight: 4,
    items: [
      { assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.0, scale: 0.96 },
      { assetType: 'grass_dirt_step_left',laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist: -1.4, scale: 0.94 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist:  1.2, scale: 0.54 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist: -0.8, scale: 0.46 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist:  1.9, scale: 0.30 },
    ],
  },
  {
    // (4) Tall vertical wall accent: two grass_dirt_blocks stacked +
    // mushroom on top + flowers at base. Mid-depth visual landmark.
    id: 'tall-block-stack-vertical',
    weight: 3,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.98, variant: 0 },
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.92, variant: 1, yOffset: -140 },
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.46, variant: 'red', yOffset: -250 },
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.4, scale: 0.46 },
      { assetType: 'sprout_soil',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.44, dist: -1.7, scale: 0.30 },
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
    weight: 5,
    items: [
      // INNER tier (right at road edge)
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.88, variant: 1 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist: -1.4, scale: 0.86, variant: 0 },
      // MID tier (longer platform set further out)
      { assetType: 'grass_dirt_platform_long', laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist:  0.7, scale: 1.00 },
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.02, dist:  0.7, scale: 0.54, variant: 'red', yOffset: -130 },
      // OUTER tier (extra mushroom + fence framing)
      { assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist: -1.0, scale: 0.86 },
      // Flower cascade across road-shoulder
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.2, scale: 0.48 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.46, dist: -1.7, scale: 0.32 },
    ],
  },
  {
    // LAYERED #2 — mid-depth platform hero with elevated question blocks.
    // v3.8.22 — qblock scales bumped (0.86/0.80 → 1.05/0.96) and yOffset
    // pushed up (-180/-120 → -215/-150) so they read as clearly visible
    // arcade beats per the user's request "qblocks выше и крупнее".
    id: 'hero-layered-platform-qblocks',
    weight: 4,
    items: [
      // INNER: low brick accent at road edge
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist:  0.0, scale: 0.78, variant: 0 },
      // MID: platform with two visible question_blocks on top
      { assetType: 'floating_platform',   laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.0, scale: 0.96, variant: 1 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.3, scale: 1.05, yOffset: -215 },
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist: -0.9, scale: 0.96, yOffset: -150 },
      // OUTER: brick wall + small mushroom on the outer frame
      { assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist:  1.5, scale: 0.94, variant: 1 },
      { assetType: 'mushroom_blue_big',   laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist:  1.5, scale: 0.48, yOffset: -120 },
      // SHOULDER flowers
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist:  1.4, scale: 0.32 },
    ],
  },
  {
    // LAYERED #3 — STRONG pipe landmark hero. The pipe is the centerpiece,
    // surrounded by a built-up cluster: brick base + platform + mushroom
    // + flowers + outer tree. This is the "single big pipe moment" the
    // user wants.
    id: 'hero-layered-pipe-landmark',
    weight: 4,
    items: [
      // INNER: pipe right at road edge
      { assetType: 'green_pipe',          laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 1.05 },
      // MID: brick base + flower bed behind/beside pipe
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.00, dist: -1.4, scale: 0.84, variant: 0 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.66, dist: -0.6, scale: 0.60 },
      // OUTER: fence + grass tuft frame the landmark
      { assetType: 'fence_wood_short',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.22, dist:  1.0, scale: 0.86 },
      { assetType: 'grass_tuft_large',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.70, dist:  1.6, scale: 0.48 },
      // SHOULDER flowers
      { assetType: 'purple_flower_single',laneBand: LANE_BANDS.SHOULDER,  lane: 1.48, dist:  0.8, scale: 0.46 },
    ],
  },
  {
    // LAYERED #4 — purple brick CASCADE (style anchor). Multiple bricks
    // staggered across all three tiers reading as a wall going INTO the
    // depth. Question block over the mid brick. The "purple/brick beat"
    // the user wants more of.
    id: 'hero-layered-brick-cascade',
    weight: 4,
    items: [
      // INNER bricks
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist:  0.0, scale: 0.86, variant: 1 },
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 1.86, dist: -1.2, scale: 0.84, variant: 0 },
      // MID brick + question_block on top
      { assetType: 'purple_brick_single', laneBand: LANE_BANDS.STRUCTURE, lane: 2.04, dist:  0.4, scale: 0.82, variant: 1 },
      // v3.8.22 — qblock scale 0.72 → 0.92, yOffset -90 → -130 for visibility
      { assetType: 'question_block',      laneBand: LANE_BANDS.STRUCTURE, lane: 2.04, dist:  0.4, scale: 0.92, yOffset: -130 },
      // OUTER big mushroom landmark
      { assetType: 'mushroom_red_big',    laneBand: LANE_BANDS.STRUCTURE, lane: 2.20, dist: -1.6, scale: 0.74, variant: 'red' },
      // SHOULDER flora at base
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.60, dist:  1.4, scale: 0.42 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.44, dist: -1.8, scale: 0.30 },
    ],
  },
  {
    id: 'fence-flower-row',
    weight: 5,
    items: [
      { assetType: 'fence_wood_short', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist: 0.1, scale: 0.78 },
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
      { assetType: 'floating_platform', laneBand: LANE_BANDS.STRUCTURE, lane: 2.18, dist: 0.3, scale: 0.82, variant: 1 },
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.88, dist: -1.1, scale: 0.90, variant: 2 },
      { assetType: 'leaf_clump_round', laneBand: LANE_BANDS.SHOULDER, lane: 1.74, dist: 0.8, scale: 0.54 },
      { assetType: 'sprout_soil', laneBand: LANE_BANDS.SHOULDER, lane: 1.52, dist: -1.9, scale: 0.28 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist: 2.1, scale: 0.29 },
    ],
  },
  {
    id: 'organic-meadow',
    weight: 2,
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
    weight: 5,
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
    weight: 1,
    items: [
      { assetType: 'hanging_platform_vines', laneBand: LANE_BANDS.STRUCTURE, lane: 1.98, dist:  0.0, scale: 0.82 },
      { assetType: 'grass_dirt_block',       laneBand: LANE_BANDS.STRUCTURE, lane: 2.16, dist: -1.2, scale: 0.90, variant: 0 },
      { assetType: 'bush_with_purple_flowers', laneBand: LANE_BANDS.SHOULDER, lane: 1.72, dist:  0.9, scale: 0.52 },
      { assetType: 'grass_tuft_large',       laneBand: LANE_BANDS.SHOULDER, lane: 1.50, dist: -1.7, scale: 0.50 },
      { assetType: 'yellow_flower_small',    laneBand: LANE_BANDS.SHOULDER, lane: 1.84, dist:  2.1, scale: 0.29 },
    ],
  },
  {
    id: 'big-bush-wall',
    weight: 1,
    items: [
      { assetType: 'grass_dirt_wall',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.90, dist:  0.1, scale: 1.02, variant: 0 },
      { assetType: 'bush_large',          laneBand: LANE_BANDS.SHOULDER,  lane: 1.78, dist: -0.8, scale: 0.66 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.SHOULDER,  lane: 1.50, dist:  1.4, scale: 0.30 },
      { assetType: 'grass_tuft_small',    laneBand: LANE_BANDS.SHOULDER,  lane: 1.85, dist: -1.9, scale: 0.44 },
      { assetType: 'sprout_soil',         laneBand: LANE_BANDS.SHOULDER,  lane: 1.42, dist:  2.2, scale: 0.28 },
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
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00, variant: 1 },
      { assetType: 'mushroom_red_big', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 0.48, variant: 'red', yOffset: -150 },
    ],
  },
  {
    id: 'block-flower-on-top',
    weight: 2,
    items: [
      { assetType: 'grass_dirt_block',    laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.96, variant: 0 },
      { assetType: 'yellow_flower_small', laneBand: LANE_BANDS.STRUCTURE, lane: 1.94, dist:  0.0, scale: 0.42, yOffset: -120 },
    ],
  },
  {
    id: 'block-grass-on-top',
    weight: 1,
    items: [
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 1.00, variant: 2 },
      { assetType: 'grass_tuft_large', laneBand: LANE_BANDS.STRUCTURE, lane: 1.92, dist:  0.0, scale: 0.52, yOffset: -145 },
    ],
  },
  {
    id: 'block-sprout-on-top',
    weight: 1,
    items: [
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.95, dist:  0.0, scale: 0.95, variant: 1 },
      { assetType: 'sprout_soil',      laneBand: LANE_BANDS.STRUCTURE, lane: 1.95, dist:  0.0, scale: 0.45, yOffset: -130 },
    ],
  },
  {
    id: 'block-flower-builtin',
    weight: 2,
    items: [
      // Designer-delivered composite: block with flower painted into it.
      // Variant 2 maps to grassDirtBlockFlower01 via the dispatcher.
      { assetType: 'grass_dirt_block', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00, variant: 2 },
    ],
  },
  {
    id: 'step-left-with-mushroom',
    weight: 1,
    items: [
      // Left-facing step. SceneryRenderer flips it on the right side so
      // we get a step that "leans inward" relative to the road on both
      // sides without needing a separate _right asset.
      { assetType: 'grass_dirt_step_left', laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 1.00 },
      { assetType: 'mushroom_red_big',     laneBand: LANE_BANDS.STRUCTURE, lane: 1.96, dist:  0.0, scale: 0.40, variant: 'red', yOffset: -120 },
    ],
  },
]);

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
export const HERO_LAYOUT = Object.freeze([
  // Bottom-corner anchors — these define the foreground framing
  { distance:  12, side: -1, prefabId: 'hero-layered-corner-brick' },     // LEFT  near anchor
  { distance:  16, side:  1, prefabId: 'hero-layered-pipe-landmark' },    // RIGHT pipe landmark
  // Mid-near: arcade beats (question blocks + brick cascade)
  { distance:  32, side: -1, prefabId: 'hero-layered-platform-qblocks' }, // LEFT  qblocks
  { distance:  38, side:  1, prefabId: 'hero-layered-brick-cascade' },    // RIGHT brick cascade
  // Mid: pipe identity again + stronger right anchor
  { distance:  56, side: -1, prefabId: 'pipe-stairs-flower-bed' },        // LEFT  pipe-stairs
  { distance:  64, side:  1, prefabId: 'corner-platform-mushroom-frame' },// RIGHT platform-mushroom
  // Mid-far: more qblocks, vertical landmark
  { distance:  88, side: -1, prefabId: 'platform-qblock-stack' },         // LEFT  qblocks again
  { distance:  96, side:  1, prefabId: 'tall-block-stack-vertical' },     // RIGHT vertical landmark
  // Far corridor tail — smaller density
  { distance: 122, side: -1, prefabId: 'wall-stack-near' },               // LEFT  small far wall
  { distance: 132, side:  1, prefabId: 'brick-corridor-segment' },        // RIGHT small far brick
]);

/**
 * v3.8.22 — Deterministic ROAD GAMEPLAY beats for the first ~95 m.
 *
 * Parallel to HERO_LAYOUT (side decor): pins flower routes, the big
 * mid-near vine beat, and a lane-change zigzag to specific distances
 * so the opening of every run reads as authored gameplay, not random
 * sprinkle. After the last entry (~88) the road stays clean until
 * procedural patterns kick in past distance ~130 — gives the player a
 * visible breathing-room approach to the castle.
 *
 * Entry kinds (handled in SpawnSystem.#spawnHeroRoadEntry):
 *   flower-line       N orchids in one lane spaced evenly
 *   flower-arc        N orchids transitioning from fromLane → toLane
 *   flower-zigzag     orchids hopping across the explicit lanes list
 *   jump-obstacle     single-lane low obstacle (dry_grass) — jump cue
 *   vine-with-rewards full-lane vine + approach trail + exit reward
 */
export const HERO_ROAD_LAYOUT = Object.freeze([
  // 10-32: warm-up — center flower line then a guiding arc
  { distance: 10, kind: 'flower-line', lane: 0,  count: 4, spacing: 6 },
  { distance: 30, kind: 'flower-arc',  fromLane: -1, toLane: 1, count: 4 },
  // 40-52: small jump obstacle + reward trail
  { distance: 42, kind: 'jump-obstacle', lane: -1 },
  { distance: 50, kind: 'flower-line', lane: 0, count: 2, spacing: 5 },
  // 60-80: the BIG mid-near vine — visible foreground beat the user wants
  { distance: 64, kind: 'vine-with-rewards', lane: 0 },
  // 84-92: lane-change zigzag (recovery / lead into the clean approach)
  { distance: 86, kind: 'flower-zigzag', lanes: [1, 0, -1] },
  // 92+ → far gate approach stays clean until procedural fires at ~130
]);

export const MIDGROUND_SCENERY = Object.freeze([
  // ── Left: structures pulled tight to road (lane ≈-2.18…-2.28), trees at lane ≈-3.04…-3.10 ──
  // variant 1=cube01, 2=cube02, 3=column_tall for grass_dirt_block
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.08, distance: 184, scale: 1.02, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance: 174, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance: 174, scale: 0.96, variant: 2, yOffset: -50 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.98, distance: 163, scale: 1.02, variant: 0, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.96, distance: 154, scale: 1.00, variant: 0, yOffset: -110 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.82, distance: 143, scale: 0.98, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.10, distance: 131, scale: 0.90, variant: 0, yOffset: -10 },
  { assetType: 'purple_brick_single', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.92, distance: 119, scale: 0.88, variant: 1, yOffset: 0 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance: 104, scale: 0.88, variant: 0, yOffset: 0 },
  { assetType: 'floating_platform', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.96, distance:  91, scale: 1.10, variant: 0, yOffset: -35 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.92, distance:  78, scale: 0.92, variant: 0, yOffset: -52 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.06, distance:  65, scale: 0.84, variant: 0, yOffset: -8 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.90, distance:  54, scale: 0.90, variant: 3, yOffset: 0 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.94, distance:  42, scale: 0.86, variant: 0, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.92, distance:  31, scale: 0.80, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_LEFT, lane: -1.88, distance:  18, scale: 0.80, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_LEFT,    lane: -3.04, distance:  12, scale: 0.70, variant: 0, yOffset: -6 },
  // ── Right: asymmetric mix — more walls left, more cubes/pipes right ──
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.96, distance: 188, scale: 1.04, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.10, distance: 178, scale: 1.00, variant: 0, yOffset: -12 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance: 168, scale: 1.02, variant: 2, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance: 168, scale: 0.94, variant: 0, yOffset: -50 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.96, distance: 157, scale: 0.92, variant: 2, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.94, distance: 145, scale: 0.96, variant: 0, yOffset: -95 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.84, distance: 131, scale: 0.92, variant: 'red', yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.08, distance: 119, scale: 0.86, variant: 0, yOffset: -10 },
  { assetType: 'fence_wood_short', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.98, distance: 104, scale: 0.90, yOffset: 0 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.90, distance:  91, scale: 0.88, variant: 1, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance:  78, scale: 0.58, variant: 0, yOffset: -52 },
  { assetType: 'hanging_platform_vines', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92, distance:  65, scale: 0.82, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.06, distance:  54, scale: 0.78, variant: 0, yOffset: -8 },
  { assetType: 'grass_dirt_wall',  zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.96, distance:  42, scale: 0.86, variant: 1, yOffset: 0 },
  { assetType: 'question_block',   zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.90, distance:  31, scale: 0.52, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block', zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.94, distance:  18, scale: 0.74, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',       zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.04, distance:  12, scale: 0.66, variant: 0, yOffset: -6 },
]);

export const FOREGROUND_FRAME_SCENERY = Object.freeze([
  // Left frame: walls brought tight to road (lane ≈-2.22…-2.26); trees stay wide
  { assetType: 'grass_dirt_wall',     zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -1.94, distance: 28, scale: 0.78, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_LEFT,     lane: -3.16, distance: 20, scale: 0.84, variant: 0, yOffset: -6 },
  { assetType: 'question_block',      zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -1.96, distance: 16, scale: 0.58, variant: 0, yOffset: -52 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_LEFT,  lane: -1.92, distance:  8, scale: 0.68, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_LEFT,     lane: -3.22, distance:  3, scale: 0.76, variant: 0, yOffset: -4 },
  // Left shoulder — small flowers/grass between road edge and walls
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.36, distance: 15, scale: 0.48, variant: 0 },
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.40, distance: 10, scale: 0.44 },
  { assetType: 'purple_flower_single',zone: SCENE_ZONES.SHOULDER_LEFT,   lane: -2.34, distance:  6, scale: 0.40 },
  // Right frame: brought tight to road; trees stay wide
  { assetType: 'grass_dirt_wall',     zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.94,  distance: 28, scale: 0.70, variant: 0, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.16,  distance: 20, scale: 0.84, variant: 0, yOffset: -6 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.96,  distance: 16, scale: 0.66, variant: 0, yOffset: 0 },
  { assetType: 'grass_dirt_block',    zone: SCENE_ZONES.STRUCTURE_RIGHT, lane: 1.92,  distance:  8, scale: 0.62, variant: 1, yOffset: 0 },
  { assetType: 'tree_round',          zone: SCENE_ZONES.NATURE_RIGHT,    lane: 3.22,  distance:  3, scale: 0.76, variant: 0, yOffset: -4 },
  // Right shoulder — mirrored, slightly varied
  { assetType: 'grass_tuft',          zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.38,  distance: 13, scale: 0.46 },
  { assetType: 'yellow_flower_small', zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.36,  distance:  8, scale: 0.44, variant: 1 },
  { assetType: 'purple_flower_single',zone: SCENE_ZONES.SHOULDER_RIGHT,  lane: 2.42,  distance:  5, scale: 0.38 },
  // Small foreground accent mushrooms — kept as historical entries even
  // though SceneryRenderer.#foregroundFrame now filters non-trees out;
  // removing would risk breaking any tooling that walks this list.
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_LEFT,  lane: -2.42, distance: 6, scale: 0.78, variant: 'red',    yOffset: 0 },
  { assetType: 'mushroom_red_big', zone: SCENE_ZONES.NATURE_RIGHT, lane:  2.46, distance: 5, scale: 0.72, variant: 'purple', yOffset: 0 },
]);
