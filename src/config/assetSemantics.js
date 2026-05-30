/**
 * v3.8.36 — Asset Semantic Registry (Phase 1).
 *
 * The single source of truth for what each placeable world asset is, how
 * it relates to gameplay, where it may be placed, what it supports/needs,
 * and which neighbours are compatible.
 *
 * This is the FOUNDATION for the placement-rules system. Phase 1 ships
 * the data layer + audit integration; subsequent phases consume it:
 *   Phase 2 — generator + dispatcher read this to validate placement
 *   Phase 3 — debug overlay surfaces semantic info per entity
 *   Phase 4 — composition templates / re-balance / missing-art list
 *
 * Scope: assetTypes that participate in WORLD GENERATION. Player frames,
 * particle sprites, UI HUD, full-screen backgrounds, and effect sheets
 * are not registered here — they have their own consumers and don't need
 * placement rules.
 *
 * Each entry follows the AssetSemantic shape. Missing/incomplete entries
 * are surfaced by `scripts/audit-assets.mjs --check` as
 * NEEDS_SEMANTIC_CLASSIFICATION so the catalog grows under audit pressure.
 */

/**
 * @typedef {'obstacle' | 'pickup' | 'powerup' | 'scenery' | 'decor' | 'support' | 'platform' | 'landmark' | 'background'} AssetCategory
 *
 * @typedef {'blocking' | 'damaging' | 'collectible' | 'bonus' | 'none'} GameplayRole
 *
 * @typedef {'road' | 'road-edge' | 'side-left' | 'side-right' | 'both-sides' | 'background' | 'foreground'} PlacementZone
 *
 * @typedef {'front-facing' | 'left-facing' | 'right-facing' | 'side-aware' | 'neutral'} OrientationType
 *
 * @typedef {'ground-only' | 'platform-only' | 'brick-only' | 'pot-only' | 'support-required' | 'free-decor'} SupportType
 *
 * @typedef {'none' | 'left-lane' | 'center-lane' | 'right-lane' | 'multi-lane' | 'not-on-road'} LaneUsage
 *
 * @typedef {object} AdjacencyRules
 * @property {string[]} [allowedNear]      — asset keys this can sit next to
 * @property {string[]} [forbiddenNear]    — never adjacent
 * @property {number}   [minSpacing]       — world units of separation required
 * @property {number}   [preferredSpacing] — ideal spacing for visual rhythm
 * @property {number}   [maxCluster]       — max contiguous repeats
 *
 * @typedef {object} AssetSemantic
 * @property {string}          key                        — assetType name as used in sceneSchema / dispatcher
 * @property {AssetCategory}   category
 * @property {GameplayRole}    gameplayRole
 * @property {PlacementZone[]} placementZones             — multi-zone allowed
 * @property {OrientationType} orientationType
 * @property {boolean}         canMirror                  — safe to canvas-flip for the opposite side
 * @property {boolean}         requiresCanonicalSideArt   — true if mirror is forbidden (lighting / face direction)
 * @property {SupportType}     supportType
 * @property {boolean}         canSupportOthers
 * @property {boolean}         canStackOnTop
 * @property {string[]}        allowedParents             — what this can stand on
 * @property {string[]}        allowedChildren            — what can stand on this
 * @property {AdjacencyRules}  adjacencyRules
 * @property {LaneUsage}       laneUsage
 * @property {boolean}         collision
 * @property {boolean}         collectible
 * @property {number}          [scoreValue]
 * @property {string}          [bonusType]
 * @property {number}          [decorativeWeight]         — relative spawn weight for random decor
 * @property {number}          [priority]                 — render-order hint within zone
 * @property {string}          [notes]
 */

/**
 * Shared rule defaults for the common decor/structural buckets. Each
 * concrete entry overrides only the fields that differ from its preset
 * so the catalog stays terse and consistent.
 */
const DEFAULTS = {
  TINY_DECOR: {
    category: 'decor',
    gameplayRole: 'none',
    placementZones: ['side-left', 'side-right', 'road-edge', 'foreground'],
    orientationType: 'neutral',
    canMirror: true,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: true,
    allowedParents: ['ground', 'grass_dirt_block', 'stone_brick_single', 'planter_pot'],
    allowedChildren: [],
    // v3.8.37 — preferredSpacing kept as a hint for future composition
    // templates; minSpacing NOT enforced for decor because prefabs
    // legitimately cluster items at the same depth (intentional
    // designer composition).
    adjacencyRules: { preferredSpacing: 0.8, maxCluster: 6 },
    laneUsage: 'not-on-road',
    collision: false,
    collectible: false,
  },
  LARGE_DECOR: {
    category: 'decor',
    gameplayRole: 'none',
    placementZones: ['side-left', 'side-right'],
    orientationType: 'neutral',
    canMirror: true,
    requiresCanonicalSideArt: false,
    supportType: 'ground-only',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: ['ground'],
    allowedChildren: [],
    adjacencyRules: { preferredSpacing: 3.0, maxCluster: 2 },
    laneUsage: 'not-on-road',
    collision: false,
    collectible: false,
  },
  STRUCTURE: {
    category: 'support',
    gameplayRole: 'none',
    placementZones: ['side-left', 'side-right'],
    orientationType: 'side-aware',
    canMirror: false,
    requiresCanonicalSideArt: true,
    supportType: 'ground-only',
    canSupportOthers: true,
    canStackOnTop: true,
    allowedParents: ['ground'],
    allowedChildren: ['mushroom_red_big', 'mushroom_blue_big', 'yellow_flower_small', 'purple_flower_single', 'grass_tuft', 'sprout_soil'],
    adjacencyRules: { preferredSpacing: 1.0, maxCluster: 4 },
    laneUsage: 'not-on-road',
    collision: false,
    collectible: false,
  },
  OBSTACLE: {
    category: 'obstacle',
    gameplayRole: 'blocking',
    placementZones: ['road'],
    orientationType: 'front-facing',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'ground-only',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: ['road'],
    allowedChildren: [],
    adjacencyRules: { minSpacing: 4, preferredSpacing: 10, maxCluster: 1 },
    laneUsage: 'center-lane',
    collision: true,
    collectible: false,
  },
  PICKUP: {
    category: 'pickup',
    gameplayRole: 'collectible',
    placementZones: ['road', 'road-edge'],
    orientationType: 'front-facing',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: ['road', 'air'],
    allowedChildren: [],
    // v3.8.37 — flowers and small pickups intentionally form lines/arcs
    // at the same world-distance across multiple lanes. minSpacing is
    // overridden per concrete entry where a rare item needs spacing.
    adjacencyRules: { preferredSpacing: 2, maxCluster: 8 },
    laneUsage: 'multi-lane',
    collision: false,
    collectible: true,
  },
};

const make = (preset, overrides) => Object.freeze({ ...preset, ...overrides });

/**
 * The catalog. Keyed by assetType (as referenced in sceneSchema.js +
 * sceneryDispatch.js). Add new placement assets here BEFORE wiring them
 * into generators so the audit catches missing classification early.
 */
export const ASSET_SEMANTICS = Object.freeze({
  // ── Obstacles (on-road, blocking) ─────────────────────────────────────────
  vine_barrier: make(DEFAULTS.OBSTACLE, {
    key: 'vine_barrier',
    gameplayRole: 'damaging',
    laneUsage: 'multi-lane',
    adjacencyRules: { minSpacing: 30, preferredSpacing: 80, maxCluster: 1 },
    notes: 'All-lane vine — requires jump. Min spacing matches the obstacle-rhythm rule.',
  }),
  low_branch_overhang: make(DEFAULTS.OBSTACLE, {
    key: 'low_branch_overhang',
    gameplayRole: 'damaging',
    laneUsage: 'multi-lane',
    adjacencyRules: { minSpacing: 20, preferredSpacing: 60, maxCluster: 1 },
    notes: 'All-lane overhang — requires crouch.',
  }),
  spider_web_overhang: make(DEFAULTS.OBSTACLE, {
    key: 'spider_web_overhang',
    gameplayRole: 'damaging',
    laneUsage: 'multi-lane',
    adjacencyRules: { minSpacing: 20, preferredSpacing: 60, maxCluster: 1 },
    notes: 'Alt-art for overhang. Same gameplay.',
  }),
  spiky_bush_obstacle: make(DEFAULTS.OBSTACLE, {
    key: 'spiky_bush_obstacle',
    gameplayRole: 'damaging',
    notes: 'Single-lane bush — lane-change to avoid.',
  }),
  dry_grass_obstacle: make(DEFAULTS.OBSTACLE, {
    key: 'dry_grass_obstacle',
    placementZones: ['road', 'side-left', 'side-right'],
    notes: 'Single-lane low hazard on road. Also used as ambient shoulder decor in a few SIDE_DECORATION_PREFABS; placement zones accept either.',
  }),
  small_center_mushroom: make(DEFAULTS.OBSTACLE, {
    key: 'small_center_mushroom',
    notes: 'On-road obstacle variant. Distinct from decor mushroom_*.',
  }),
  stone_obstacle: make(DEFAULTS.OBSTACLE, {
    key: 'stone_obstacle',
    notes: 'Single-lane blocker.',
  }),

  // ── Pickups (on-road, collectible) ────────────────────────────────────────
  golden_flower: make(DEFAULTS.PICKUP, {
    key: 'golden_flower',
    scoreValue: 10,
    notes: 'Primary collectible. Drives the line / arc / cluster patterns.',
  }),
  heart_full: make(DEFAULTS.PICKUP, {
    key: 'heart_full',
    gameplayRole: 'bonus',
    bonusType: 'restore-life',
    laneUsage: 'center-lane',
    adjacencyRules: { minSpacing: 80, preferredSpacing: 200, maxCluster: 1 },
    notes: 'Rare heart. Spaced like power-ups.',
  }),

  // ── Powerups (on-road, bonus effect) ──────────────────────────────────────
  speed_tree_pickup: make(DEFAULTS.PICKUP, {
    key: 'speed_tree_pickup',
    category: 'powerup',
    gameplayRole: 'bonus',
    bonusType: 'speed-burst',
    adjacencyRules: { minSpacing: 120, preferredSpacing: 240, maxCluster: 1 },
  }),
  power_mushroom_pickup: make(DEFAULTS.PICKUP, {
    key: 'power_mushroom_pickup',
    category: 'powerup',
    gameplayRole: 'bonus',
    bonusType: 'split-clones',
    adjacencyRules: { minSpacing: 120, preferredSpacing: 240, maxCluster: 1 },
  }),
  // v3.8.37 — extra power-up types used by factories.js
  // (COLLECTIBLE_DEFAULT_ASSET). Not yet in sceneSchema's catalog but
  // spawned at runtime via SpawnSystem.#tickPowerUp.
  power_magnet_pickup: make(DEFAULTS.PICKUP, {
    key: 'power_magnet_pickup',
    category: 'powerup',
    gameplayRole: 'bonus',
    bonusType: 'magnet',
    adjacencyRules: { minSpacing: 120, preferredSpacing: 240, maxCluster: 1 },
  }),
  power_shield_pickup: make(DEFAULTS.PICKUP, {
    key: 'power_shield_pickup',
    category: 'powerup',
    gameplayRole: 'bonus',
    bonusType: 'shield',
    adjacencyRules: { minSpacing: 120, preferredSpacing: 240, maxCluster: 1 },
  }),
  power_double_pickup: make(DEFAULTS.PICKUP, {
    key: 'power_double_pickup',
    category: 'powerup',
    gameplayRole: 'bonus',
    bonusType: 'score-multiplier',
    adjacencyRules: { minSpacing: 120, preferredSpacing: 240, maxCluster: 1 },
  }),
  rare_orchid_pickup: make(DEFAULTS.PICKUP, {
    key: 'rare_orchid_pickup',
    category: 'pickup',
    gameplayRole: 'collectible',
    scoreValue: 50,
    adjacencyRules: { minSpacing: 180, preferredSpacing: 360, maxCluster: 1 },
    notes: 'Rare blue orchid hunt target.',
  }),

  // ── Structures (side-aware support tiles) ─────────────────────────────────
  grass_dirt_block: make(DEFAULTS.STRUCTURE, {
    key: 'grass_dirt_block',
    category: 'support',
    canStackOnTop: true,
    adjacencyRules: { preferredSpacing: 1.2, maxCluster: 3 },
    notes: 'Foundation block — supports flowers / small mushroom / sprout.',
  }),
  grass_dirt_step: make(DEFAULTS.STRUCTURE, {
    key: 'grass_dirt_step',
    category: 'support',
    notes: 'Step block — same support semantics as grass_dirt_block.',
  }),
  grass_dirt_step_left: make(DEFAULTS.STRUCTURE, {
    key: 'grass_dirt_step_left',
    orientationType: 'left-facing',
    canMirror: true,
    requiresCanonicalSideArt: false,
    notes: 'Mirrors safely (sun upper-right preserved on flip).',
  }),
  grass_dirt_wall: make(DEFAULTS.STRUCTURE, {
    key: 'grass_dirt_wall',
    canStackOnTop: false,
    notes: 'Wall variant — no top-stacking children.',
  }),
  grass_dirt_platform_long: make(DEFAULTS.STRUCTURE, {
    key: 'grass_dirt_platform_long',
    category: 'platform',
    adjacencyRules: { maxCluster: 1 },
  }),
  stone_brick_single: make(DEFAULTS.STRUCTURE, {
    key: 'stone_brick_single',
    notes: 'P1 side-aware pair shipped v3.8.34 — variants left/right registered.',
  }),
  stone_wall_low: make(DEFAULTS.STRUCTURE, {
    key: 'stone_wall_low',
    notes: 'P1 side-aware pair shipped v3.8.34.',
  }),
  stone_wall_stairs: make(DEFAULTS.STRUCTURE, {
    key: 'stone_wall_stairs',
    notes: 'P1 side-aware pair shipped v3.8.34.',
  }),
  purple_brick_single: make(DEFAULTS.STRUCTURE, {
    key: 'purple_brick_single',
    orientationType: 'side-aware',
    notes: 'Legacy brick — still in SIDE_PAIR_PENDING bucket; awaits left/right re-export.',
  }),
  purple_brick_platform_3: make(DEFAULTS.STRUCTURE, {
    key: 'purple_brick_platform_3',
    category: 'platform',
    notes: '3-tile platform variant. Treats as platform — no children today.',
  }),
  question_block: make(DEFAULTS.STRUCTURE, {
    key: 'question_block',
    category: 'landmark',
    canSupportOthers: false,
    allowedChildren: [],
    notes: 'Iconic landmark — does not host children; mostly floats above support.',
  }),
  planter_pot: make(DEFAULTS.STRUCTURE, {
    key: 'planter_pot',
    canStackOnTop: true,
    allowedChildren: ['sprout_soil', 'yellow_flower_small', 'purple_flower_single'],
    notes: 'Pot — hosts ONLY sprout / small flower children (not random decor).',
  }),
  green_pipe: make(DEFAULTS.STRUCTURE, {
    key: 'green_pipe',
    category: 'support',
    notes: 'DEPRECATED — sceneSchema redirects to planter_pot. Keep for back-compat decoding.',
  }),
  floating_platform: make(DEFAULTS.STRUCTURE, {
    key: 'floating_platform',
    category: 'platform',
    supportType: 'platform-only',
    allowedParents: ['air'],
    canStackOnTop: false,
    notes: 'Platform floats. Does not host children in current spec.',
  }),
  hanging_platform_vines: make(DEFAULTS.STRUCTURE, {
    key: 'hanging_platform_vines',
    category: 'platform',
    supportType: 'platform-only',
    allowedParents: ['air'],
    canStackOnTop: false,
  }),

  // ── Decor large (side flora, ground-only) ────────────────────────────────
  mushroom_red_big: make(DEFAULTS.LARGE_DECOR, {
    key: 'mushroom_red_big',
    supportType: 'support-required',
    allowedParents: ['ground', 'grass_dirt_block', 'stone_brick_single'],
    notes: 'Large mushroom — sits on ground OR on top of a support block.',
  }),
  mushroom_blue_big: make(DEFAULTS.LARGE_DECOR, {
    key: 'mushroom_blue_big',
    supportType: 'support-required',
    allowedParents: ['ground', 'grass_dirt_block', 'stone_brick_single'],
  }),
  tree_round: make(DEFAULTS.LARGE_DECOR, {
    key: 'tree_round',
    placementZones: ['side-left', 'side-right'],
    adjacencyRules: { preferredSpacing: 5.0, maxCluster: 1 },
    notes: 'Background-band tree (NATURE zone).',
  }),
  fence_wood_short: make(DEFAULTS.LARGE_DECOR, {
    key: 'fence_wood_short',
    orientationType: 'side-aware',
    canMirror: true,
    canSupportOthers: false,
    adjacencyRules: { preferredSpacing: 0.8, maxCluster: 6 },
    notes: 'Chains naturally — let the cluster fill a fence run.',
  }),
  bush_large: make(DEFAULTS.LARGE_DECOR, {
    key: 'bush_large',
    adjacencyRules: { preferredSpacing: 2.5, maxCluster: 2 },
  }),
  bush_large_with_purple_flowers: make(DEFAULTS.LARGE_DECOR, {
    key: 'bush_large_with_purple_flowers',
    adjacencyRules: { preferredSpacing: 3.0, maxCluster: 1 },
    notes: 'Higher-impact accent — limit cluster to 1.',
  }),

  // ── Decor small (shoulder flora, anywhere-ish) ───────────────────────────
  yellow_flower_small: make(DEFAULTS.TINY_DECOR, { key: 'yellow_flower_small' }),
  purple_flower_single: make(DEFAULTS.TINY_DECOR, { key: 'purple_flower_single' }),
  grass_tuft: make(DEFAULTS.TINY_DECOR, { key: 'grass_tuft' }),
  grass_tuft_small: make(DEFAULTS.TINY_DECOR, { key: 'grass_tuft_small' }),
  grass_tuft_large: make(DEFAULTS.TINY_DECOR, { key: 'grass_tuft_large' }),
  wheat_tuft: make(DEFAULTS.TINY_DECOR, { key: 'wheat_tuft' }),
  sprout_soil: make(DEFAULTS.TINY_DECOR, {
    key: 'sprout_soil',
    allowedParents: ['ground', 'planter_pot'],
    notes: 'Sprout — prefers planter; fine on ground too.',
  }),
  leaf_clump_small: make(DEFAULTS.TINY_DECOR, { key: 'leaf_clump_small' }),
  leaf_clump_round: make(DEFAULTS.TINY_DECOR, {
    key: 'leaf_clump_round',
    adjacencyRules: { preferredSpacing: 1.5, maxCluster: 2 },
  }),
  bush_with_purple_flowers: make(DEFAULTS.TINY_DECOR, {
    key: 'bush_with_purple_flowers',
    adjacencyRules: { preferredSpacing: 2.0, maxCluster: 2 },
  }),

  // ── Backgrounds (full-layer, no placement rules) ─────────────────────────
  sky_gradient: Object.freeze({
    key: 'sky_gradient',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
    notes: 'Full-screen layer. No placement validation needed.',
  }),
  cloud_large: Object.freeze({
    key: 'cloud_large',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: true,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: ['air'],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
  }),
  mountains_far: Object.freeze({
    key: 'mountains_far',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
  }),
  mountains_mid: Object.freeze({
    key: 'mountains_mid',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
  }),
  forest_far: Object.freeze({
    key: 'forest_far',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
  }),
  meadow_far: Object.freeze({
    key: 'meadow_far',
    category: 'background',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
  }),
  castle_far: Object.freeze({
    key: 'castle_far',
    category: 'landmark',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'front-facing',
    canMirror: false,
    requiresCanonicalSideArt: true,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
    notes: 'Focal castle at the road vanishing point. Anchored by LandmarksRenderer; no placement randomisation.',
  }),
  greenhouse_far: Object.freeze({
    key: 'greenhouse_far',
    category: 'landmark',
    gameplayRole: 'none',
    placementZones: ['background'],
    orientationType: 'front-facing',
    canMirror: false,
    requiresCanonicalSideArt: true,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'none',
    collision: false,
    collectible: false,
    notes: 'Alt focal landmark variant.',
  }),

  // ── Core-lane assets (not placement-driven; here for full audit coverage) ─
  road_lane_tile: Object.freeze({
    key: 'road_lane_tile',
    category: 'scenery',
    gameplayRole: 'none',
    placementZones: ['road'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'multi-lane',
    collision: false,
    collectible: false,
    notes: 'Road tile — driven by RoadRenderer, not the placement system.',
  }),
  road_perspective_lines: Object.freeze({
    key: 'road_perspective_lines',
    category: 'scenery',
    gameplayRole: 'none',
    placementZones: ['road'],
    orientationType: 'neutral',
    canMirror: false,
    requiresCanonicalSideArt: false,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'multi-lane',
    collision: false,
    collectible: false,
    notes: 'Lane-divider overlay; rendered by RoadRenderer.',
  }),
  player_farmer: Object.freeze({
    key: 'player_farmer',
    category: 'scenery',
    gameplayRole: 'none',
    placementZones: ['road'],
    orientationType: 'front-facing',
    canMirror: false,
    requiresCanonicalSideArt: true,
    supportType: 'free-decor',
    canSupportOthers: false,
    canStackOnTop: false,
    allowedParents: [],
    allowedChildren: [],
    adjacencyRules: {},
    laneUsage: 'center-lane',
    collision: false,
    collectible: false,
    notes: 'Player avatar — rendered by PlayerRenderer; placement is the player input, not the placement system.',
  }),
});

/** @returns {AssetSemantic | undefined} */
export function getAssetSemantic(assetType) {
  return ASSET_SEMANTICS[assetType];
}

/** @returns {string[]} every key in the registry */
export function listSemanticKeys() {
  return Object.keys(ASSET_SEMANTICS);
}

/**
 * Validate that an asset is allowed in a given zone. Returns
 * `{ ok: boolean, reason?: string }`. Phase 1 returns ok=true with notes;
 * Phase 2 turns this into hard rejection at generation time.
 */
export function isPlacementAllowed(assetType, zone) {
  const semantic = ASSET_SEMANTICS[assetType];
  if (!semantic) return { ok: false, reason: 'NEEDS_SEMANTIC_CLASSIFICATION' };
  if (!semantic.placementZones.includes(zone)) {
    return { ok: false, reason: `zone '${zone}' not in allowed [${semantic.placementZones.join(', ')}]` };
  }
  return { ok: true };
}

/**
 * Check whether `child` may stand on `parent` per allowedParents /
 * allowedChildren. Either side missing the relation → not allowed.
 */
export function isSupportAllowed(parentType, childType) {
  const parent = ASSET_SEMANTICS[parentType];
  const child = ASSET_SEMANTICS[childType];
  if (!parent || !child) return { ok: false, reason: 'NEEDS_SEMANTIC_CLASSIFICATION' };
  const parentAccepts = parent.allowedChildren.includes(childType);
  const childAccepts = child.allowedParents.includes(parentType);
  if (!parentAccepts && !childAccepts) {
    return { ok: false, reason: `${childType} cannot sit on ${parentType}` };
  }
  return { ok: true };
}

/**
 * v3.8.39 — Phase 5 Prefab Composition Graph.
 *
 * @typedef {'base' | 'support' | 'topper' | 'child-decor' | 'foreground-accent' | 'background-accent' | 'road-facing-face' | 'loose-decor'} PrefabItemRole
 *
 * @typedef {'ground' | 'top' | 'front' | 'back' | 'left-edge' | 'right-edge' | 'road-facing-side' | 'outer-side'} PrefabItemAnchor
 *
 * @typedef {object} PrefabItem
 * @property {string} assetType                     — required, e.g. 'grass_dirt_block'
 * @property {string} [id]                          — local within prefab, e.g. 'base_01'
 * @property {PrefabItemRole} [role]                — defaults to 'loose-decor'
 * @property {string} [parentId]                    — another item's id within this prefab
 * @property {PrefabItemAnchor} [anchor]            — where this item attaches to its parent / ground
 * @property {number} [zLayer]                      — render-order hint (Phase 6)
 * — plus the existing geometry: laneBand, lane, dist, scale, yOffset, variant
 */

const SUPPORT_REQUIRED_GROUND_FALLBACK_ROLES = new Set(['base', 'support', 'loose-decor', 'foreground-accent', 'background-accent']);

/**
 * v3.8.39 — Runtime prefab composition validator.
 *
 * Walks a prefab's items and checks the support graph:
 *   - referenced parentId must resolve to a sibling item
 *   - child's assetType must be allowed on parent's assetType via
 *     allowedParents / allowedChildren in the semantic registry
 *   - support-required items must declare a parent OR sit on 'ground'
 *     (the default role 'base' / unrolled items)
 *   - side-aware items get a warning so QA can spot facing mismatches
 *
 * Errors block strict-mode spawning; warnings are surfaced via
 * console + compositionReport but don't block.
 *
 * @param {{ id: string, items: PrefabItem[] }} prefab
 * @param {-1 | 1} [side]
 * @returns {{ ok: boolean, errors: object[], warnings: object[] }}
 */
export function validatePrefab(prefab, side) {
  const errors = [];
  const warnings = [];
  if (!prefab || !Array.isArray(prefab.items) || prefab.items.length === 0) {
    return { ok: false, errors: [{ kind: 'NO_ITEMS', prefab: prefab?.id ?? '?' }], warnings };
  }
  const itemById = new Map();
  for (const item of prefab.items) {
    if (item.id) itemById.set(item.id, item);
  }
  for (const item of prefab.items) {
    const semantic = ASSET_SEMANTICS[item.assetType];
    if (!semantic) continue; // unknown — defer to audit/registry layer
    const role = item.role ?? 'loose-decor';
    // Check 1 — parent reference resolves.
    if (item.parentId) {
      const parent = itemById.get(item.parentId);
      if (!parent) {
        errors.push({ kind: 'PARENT_MISSING', prefab: prefab.id, item: item.id ?? item.assetType, parentId: item.parentId });
        continue;
      }
      // Check 2 — child allowed on parent. Accept if EITHER side declares
      // the relationship (parent's allowedChildren or child's allowedParents).
      const parentAccepts = ASSET_SEMANTICS[parent.assetType]?.allowedChildren?.includes(item.assetType);
      const childAccepts = semantic.allowedParents?.includes(parent.assetType);
      if (!parentAccepts && !childAccepts) {
        errors.push({
          kind: 'INVALID_PARENT_CHILD',
          prefab: prefab.id,
          item: item.id ?? item.assetType,
          parent: parent.assetType,
          child: item.assetType,
        });
      }
    } else if (semantic.supportType === 'support-required'
            && !SUPPORT_REQUIRED_GROUND_FALLBACK_ROLES.has(role)) {
      // Check 3 — support-required item with no parent. Allowed only
      // when the role indicates ground placement (base/support/loose).
      // A 'topper' or 'child-decor' role without parent is a floating
      // element and the generator should reject it.
      errors.push({
        kind: 'FLOATING_SUPPORT_REQUIRED',
        prefab: prefab.id,
        item: item.id ?? item.assetType,
        assetType: item.assetType,
        role,
      });
    }
    // Check 4 — side-aware items warning so QA panels can spot
    // facing/mirroring problems. Not an error; SIDE_MAPPING_BY_TYPE
    // handles direction at draw time.
    if (semantic.orientationType === 'side-aware' && side !== undefined) {
      warnings.push({
        kind: 'SIDE_AWARE_PRESENT',
        prefab: prefab.id,
        item: item.id ?? item.assetType,
        assetType: item.assetType,
        side,
      });
    }
  }
  // v3.8.40 — Phase 6 spatial overlap check. Two structural items
  // (role: base / support) that occupy roughly the same lane AND
  // distance — without an explicit parent-child relationship — are
  // visually overlapping. Warning, not error, because the existing
  // catalog has a few intentional stacks (e.g., grass_dirt_block
  // stacked via yOffset) that legitimately share the same (lane, dist).
  for (let i = 0; i < prefab.items.length; i += 1) {
    for (let j = i + 1; j < prefab.items.length; j += 1) {
      const a = prefab.items[i];
      const b = prefab.items[j];
      const semA = ASSET_SEMANTICS[a.assetType];
      const semB = ASSET_SEMANTICS[b.assetType];
      if (!semA || !semB) continue;
      const aStruct = a.role === 'base' || a.role === 'support';
      const bStruct = b.role === 'base' || b.role === 'support';
      if (!aStruct || !bStruct) continue;
      // Parent-child relationships are explicit stacks; not overlaps.
      if (a.parentId === b.id || b.parentId === a.id) continue;
      const laneClose = Math.abs((a.lane ?? 0) - (b.lane ?? 0)) < 0.1;
      const distClose = Math.abs((a.dist ?? 0) - (b.dist ?? 0)) < 0.5;
      if (laneClose && distClose) {
        warnings.push({
          kind: 'SPATIAL_OVERLAP',
          prefab: prefab.id,
          itemA: a.id ?? a.assetType,
          itemB: b.id ?? b.assetType,
          lane: a.lane,
          dist: a.dist,
        });
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
