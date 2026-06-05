/**
 * Asset-type → draw-function dispatch for SceneryRenderer.
 *
 * Each entry handles one (or several alias) assetType keys. Drawing is
 * expressed as a function so per-type quirks (yOffset, variant picks,
 * dual-sprite fallback) stay local instead of leaking into the renderer.
 *
 * The `tryDraw` helper centralises the "try v3 key → try legacy key →
 * call a procedural fallback" chain so the per-row code only declares the
 * intent, not the loop.
 *
 * @typedef {{
 *   sprites: import('../../SpriteRenderer.js').SpriteRenderer,
 *   paint:   import('../../PixelPainter.js').PixelPainter,
 *   voxelBlocks: import('./VoxelBlockRenderer.js').VoxelBlockRenderer,
 * }} SceneryDrawDeps
 *
 * @typedef {(deps: SceneryDrawDeps, x: number, y: number, scale: number, variant: any) => void} SceneryDrawFn
 */

const TABLE = new Map();

/** @param {string[]} aliases @param {SceneryDrawFn} draw */
function register(aliases, draw) {
  for (const a of aliases) TABLE.set(a, draw);
}

/**
 * Try a list of sprite keys in order; the first one that draws wins.
 * If none draw and a procedural fallback is supplied, call it.
 *
 * @param {SceneryDrawDeps} deps
 * @param {string[]} keys           sprite keys, ordered by preference
 * @param {number} x  @param {number} y  @param {number} width
 * @param {(deps: SceneryDrawDeps) => void} [fallback]
 * @returns {boolean} true if any of the sprite keys actually drew
 */
function tryDraw({ sprites }, keys, x, y, width, fallback) {
  for (const k of keys) {
    if (sprites.draw(k, x, y, width)) return true;
  }
  if (fallback) fallback({ sprites });
  return false;
}

function drawByHeight({ sprites }, key, x, y, height) {
  const image = sprites.assets.get(key);
  if (!image?.naturalWidth || !image.naturalHeight) return false;
  return sprites.draw(key, x, y, height * (image.naturalWidth / image.naturalHeight));
}

// ── Structural wall elements ─────────────────────────────────────────────────

// v3.8: designer-delivered flat-pixel block variants take priority over
// the legacy keys. Variant index selects which one to draw:
//   0 = block_01, 1 = block_02, 2 = block_flower_01, 3 = block_flower_02
const NEW_TERRAIN_BLOCK_KEYS = ['grassDirtBlock01', 'grassDirtBlock02', 'grassDirtBlockFlower01', 'grassDirtBlockFlower02'];
const TERRAIN_BLOCK_KEYS = ['grassBlockFrontRect', 'grassBlockCube01', 'grassBlockCube02', 'grassBlockColumnTall'];
// v3.8.18 side-aware mapping — supports per-type override.
//
// Canonical semantic per docs/designer-asset-brief.md § 1.4.1:
//   _left.png  → asset placed on the road's LEFT shoulder  (placement convention)
//   _right.png → asset placed on the road's RIGHT shoulder
//
// Runtime audit: all accepted pairs follow that placement convention.
// Their LEFT files expose the road-facing right surface and recede inward;
// RIGHT files do the opposite. This also matches VoxelBlockRenderer's
// side=-1/+1 geometry.
//
// Two layers of control:
//   1. Per-type table — each side-aware type is 'normal' or 'swapped'.
//   2. Global `?sideMapping=swapped` URL flag XORs over the whole table.
const SIDE_MAPPING_BY_TYPE = new Map([
  ['grass_dirt_block',   'normal'],
  ['grass_dirt_step',    'normal'],
  ['terrainBlock',       'normal'],
  ['floating_platform',  'normal'],
  ['platform',           'normal'],
  ['stone_brick_single', 'normal'],
  ['stone_wall_low',     'normal'],
  ['stone_wall_stairs',  'normal'],
  ['planter_pot',        'normal'],
  ['grass_dirt_platform_long', 'normal'],
  ['purple_brick_single',      'normal'],
  ['hanging_platform_vines',   'normal'],
  ['fence_wood_short',         'normal'],
]);
// All currently registered pairs passed the side-aware re-export audit.
// Keep the marker set so future art deliveries can be quarantined without
// changing the renderer contract.
const QUARANTINED_SIDE_VARIANTS = new Set();
let globalSwap = false;

export function setSideMappingSwap(swap) { globalSwap = !!swap; }
export function isSideMappingSwapped() { return globalSwap; }
export function setSideMappingForType(type, mode) {
  if (mode !== 'normal' && mode !== 'swapped') return false;
  SIDE_MAPPING_BY_TYPE.set(type, mode);
  return true;
}
export function getSideMappingForType(type) {
  return SIDE_MAPPING_BY_TYPE.get(type) ?? 'normal';
}
export function isSideVariantQuarantined(type) {
  return QUARANTINED_SIDE_VARIANTS.has(type);
}

/** Per-type SIDE_KEY_FOR. Resolves type's mapping mode + global swap. */
function SIDE_KEY_FOR(side, type) {
  const typeMode = SIDE_MAPPING_BY_TYPE.get(type) ?? 'normal';
  // XOR: type swapped XOR global swap → effective swap
  const swapped = (typeMode === 'swapped') !== globalSwap;
  if (swapped) return side === -1 ? 'Right' : 'Left';
  return side === -1 ? 'Left'  : 'Right';
}

// v3.8.16 — two-pass dispatch. side ∈ {-1, +1} = first pass; only side-
// variant is attempted. If it draws, return true. Otherwise return false
// and the renderer falls back per its policy (NO mirror flip for side-
// aware types — see SceneryRenderer.#drawSceneryType).
register(['grass_dirt_block', 'terrainBlock'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawCube(x, y, scale, {
      material: 'grass',
      side,
      variant,
    });
  }
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`grassDirtBlock${SIDE_KEY_FOR(side, 'grass_dirt_block')}`, x, y, 185 * scale);
  }
  const v = variant ?? 0;
  const newKey = NEW_TERRAIN_BLOCK_KEYS[v % 4];
  const legacyKey = TERRAIN_BLOCK_KEYS[v % 4];
  tryDraw(deps, [newKey, legacyKey], x, y, 185 * scale,
    () => deps.paint.terrainBlock(x, y, scale, v));
  return false;
});

// The shipped step pair has different source-canvas aspect ratios.
// Drawing both by a shared visual height keeps left/right placements
// stable while still using the correct road-facing art.
register(['grass_dirt_step'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawSteps(x, y, scale, {
      material: 'grass',
      side,
      variant,
    });
  }
  if (side === -1 || side === 1) {
    return drawByHeight(deps, `grassDirtStep${SIDE_KEY_FOR(side, 'grass_dirt_step')}`, x, y, 205 * scale);
  }
  tryDraw(deps, ['grassDirtStepLeft'], x, y, 154 * scale,
    () => deps.paint.terrainBlock(x, y, scale, variant ?? 3));
  return false;
});

// v3.8 — explicit left-facing step. SceneryRenderer auto-mirrors via
// canvas-flip when lane > 0, so right-side spawns get a flipped step
// without needing a separate _right asset.
register(['grass_dirt_step_left', 'grassDirtStepLeft'], (deps, x, y, scale) => {
  if (deps.voxelBlocks?.enabled) {
    deps.voxelBlocks.drawSteps(x, y, scale, { material: 'grass', side: -1 });
    return;
  }
  tryDraw(deps, ['grassDirtStepLeft'], x, y, 200 * scale,
    () => deps.paint.terrainBlock(x, y, scale, 3));
});

// v3.8 — long platform variant.
register(['grass_dirt_platform_long', 'grassDirtPlatformLong'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawPlatform(x, y, scale, {
      material: 'grass',
      side,
      variant,
      units: 4,
    });
  }
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`grassDirtPlatformLong${SIDE_KEY_FOR(side, 'grass_dirt_platform_long')}`, x, y, 290 * scale);
  }
  tryDraw(deps, ['grassDirtPlatformLong2', 'grassDirtPlatformLong'], x, y, 290 * scale,
    () => deps.paint.platform(x, y, scale, 0));
  return false;
});

function drawStoneWall(deps, x, y, scale, variant, side, forcedType) {
  const v = variant ?? 0;
  const stoneType = forcedType ?? (v % 2 === 0 ? 'stone_wall_low' : 'stone_wall_stairs');
  const stairs = stoneType === 'stone_wall_stairs';
  if (deps.voxelBlocks?.enabled) {
    if (stairs) {
      return deps.voxelBlocks.drawSteps(x, y, scale, {
        material: 'stone',
        side,
        variant: v,
      });
    }
    return deps.voxelBlocks.drawPlatform(x, y, scale, {
      material: 'stone',
      side,
      variant: v,
      units: 2,
    });
  }
  const stoneKey = stairs ? 'stoneWallStairs' : 'stoneWallLow';
  // v3.8.34 — side-aware variant pass. Variant index selects low vs stairs
  // for legacy aliases; canonical types force their matching sprite.
  // SIDE_KEY_FOR then picks the road-facing _left or _right delivery.
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`${stoneKey}${SIDE_KEY_FOR(side, stoneType)}`, x, y, 200 * scale);
  }
  const legacyKey = stairs ? 'purpleWallStairs' : 'purpleWallLow';
  tryDraw(deps, [stoneKey, legacyKey], x, y, 200 * scale,
    () => deps.paint.grassWall(x, y, scale, stairs ? 1 : 0));
  return false;
}

register(['grass_dirt_wall', 'grassWall'], (deps, x, y, scale, variant, side) => {
  return drawStoneWall(deps, x, y, scale, variant, side);
});

register(['stone_wall_low'], (deps, x, y, scale, variant, side) => {
  return drawStoneWall(deps, x, y, scale, variant, side, 'stone_wall_low');
});

register(['stone_wall_stairs'], (deps, x, y, scale, variant, side) => {
  return drawStoneWall(deps, x, y, scale, variant, side, 'stone_wall_stairs');
});

// v4.3 — P3 reference-match: purple_brick_single / blockStack must render the
// purple brick sprite, not the gray stone that previously appeared first in the
// shared fallback chain. Split into two registrations so each type uses its
// own sprite preference without cross-contaminating the gray stone path.
register(['purple_brick_single', 'blockStack'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawCube(x, y, scale, {
      material: 'purple',
      side,
      variant,
      width: 78,
      height: 62,
      depth: 15,
      topRise: 12,
    });
  }
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`purpleBrickSingle${SIDE_KEY_FOR(side, 'purple_brick_single')}`, x, y, 110 * scale);
  }
  tryDraw(deps, ['purpleBrick01', 'brickPurpleSingle', 'stoneBrickSingle'], x, y, 110 * scale,
    () => deps.paint.wallBlock(x, y, scale, variant === 2 ? 3 : 1, 1));
  return false;
});

register(['stone_brick_single'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawCube(x, y, scale, {
      material: 'stone',
      side,
      variant,
      width: 78,
      height: 62,
      depth: 15,
      topRise: 12,
    });
  }
  // v3.8.34 — side-aware variant pass.
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`stoneBrickSingle${SIDE_KEY_FOR(side, 'stone_brick_single')}`, x, y, 110 * scale);
  }
  tryDraw(deps, ['stoneBrickSingle'], x, y, 110 * scale,
    () => deps.paint.wallBlock(x, y, scale, variant === 2 ? 3 : 1, 1));
  return false;
});

register(['floating_platform', 'platform'], (deps, x, y, scale, variant, side) => {
  if (deps.voxelBlocks?.enabled) {
    return deps.voxelBlocks.drawPlatform(x, y, scale, {
      material: 'grass',
      side,
      variant,
      units: 4,
    });
  }
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`platformFloating${SIDE_KEY_FOR(side, 'floating_platform')}`, x, y, 290 * scale);
  }
  const v = variant ?? 0;
  tryDraw(deps, ['platformFloating', 'purplePlatformRow04'], x, y, 290 * scale,
    () => deps.paint.platform(x, y, scale, v % 2));
  return false;
});

register(['question_block', 'questionBlock'], (deps, x, y, scale) => {
  const yShifted = y - 62 * scale;
  if (deps.voxelBlocks?.enabled) {
    deps.voxelBlocks.drawQuestionCube(x, yShifted, scale);
    return;
  }
  // 4-frame idle bounce when designer ships animated question block.
  // Frame picked off performance.now() so the loop has no per-entity state.
  const animFrame = (Math.floor(performance.now() / 166) & 3) + 1;
  tryDraw(deps, [`questionBlockAnim0${animFrame}`, 'questionBlockSprite'], x, yShifted, 90 * scale,
    () => deps.paint.questionBlock(x, yShifted, scale));
});

// v4.3 — P3 reference-match: green_pipe / pipe should render the actual pipe
// sprite so the reference's green pipe appears. planter_pot / planterPot keep
// the planter sprite with side-aware variant support as before.
register(['green_pipe', 'pipe'], (deps, x, y, scale) => {
  tryDraw(deps, ['pipeGreenSprite', 'planterPot'], x, y, 130 * scale,
    () => deps.paint.pipe(x, y, scale));
  return false;
});

register(['planter_pot', 'planterPot'], (deps, x, y, scale, variant, side) => {
  // v3.8.34 — side-aware variant pass.
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`planterPot${SIDE_KEY_FOR(side, 'planter_pot')}`, x, y, 130 * scale);
  }
  tryDraw(deps, ['planterPot', 'pipeGreenSprite'], x, y, 130 * scale,
    () => deps.paint.pipe(x, y, scale));
  return false;
});

register(['fence_wood_short', 'fence'], (deps, x, y, scale, variant, side) => {
  // M22A — fence dispatch scale 220 → 160 so the foreground fence frames the
  // scene like the reference instead of dominating it (retuned 175 → 160).
  // Render-only; no PNG / prefab / collision change. Bump back up if too small.
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`fenceWoodSprite${SIDE_KEY_FOR(side, 'fence_wood_short')}`, x, y, 160 * scale);
  }
  tryDraw(deps, ['fenceWoodSprite'], x, y, 160 * scale,
    () => deps.paint.fence(x, y, scale));
  return false;
});

register(['hanging_platform_vines', 'hangingPlatform'], (deps, x, y, scale, variant, side) => {
  if (side === -1 || side === 1) {
    return deps.sprites.draw(`platformHangingVines${SIDE_KEY_FOR(side, 'hanging_platform_vines')}`, x, y, 280 * scale);
  }
  tryDraw(deps, ['platformHangingVines', 'hangingPlatformVines'], x, y, 280 * scale);
  return false;
});

// ── Large organic / flora ────────────────────────────────────────────────────

register(['tree_round', 'tree'], (deps, x, y, scale, variant) => {
  tryDraw(deps, ['treeRoundSprite'], x, y, 280 * scale,
    () => deps.paint.tree(x, y, scale, variant ?? 0));
});

register(['mushroom_red_big', 'mushroom'], (deps, x, y, scale, variant) => {
  const key = variant === 'red' ? 'mushroomRed' : 'mushroomPurple';
  tryDraw(deps, [key], x, y, 180 * scale,
    () => deps.paint.mushroom(x, y, scale, variant));
});

register(['purple_flower_single', 'flowerbush', 'bush_with_purple_flowers'], (deps, x, y, scale) => {
  tryDraw(deps, ['bushWithFlowers'], x, y, 160 * scale,
    () => deps.paint.flowerBush(x, y, scale));
});

register(['bush_large', 'bushLarge'], (deps, x, y, scale) => {
  tryDraw(deps, ['bushLarge'], x, y, 240 * scale);
});

register(['bush_large_with_purple_flowers', 'bushLargeFlower'], (deps, x, y, scale) => {
  tryDraw(deps, ['bushLargeFlower'], x, y, 240 * scale);
});

// ── Small organic / ground cover ─────────────────────────────────────────────

register(['yellow_flower_small', 'smallFlower'], (deps, x, y, scale, variant) => {
  const key = (variant ?? 0) % 2 === 0 ? 'yellowFlowerSmall' : 'purpleFlowerCluster';
  tryDraw(deps, [key], x, y, 80 * scale,
    () => deps.paint.smallFlower(x, y, scale));
});

register(['sprout_soil', 'sprout'], (deps, x, y, scale) => {
  tryDraw(deps, ['sproutSoil'], x, y, 75 * scale,
    () => deps.paint.sprout(x, y, scale));
});

register(['wheat_tuft', 'wheat'], (deps, x, y, scale) => {
  deps.paint.wheat(x, y, scale);
});

register(['mushroom_blue_big', 'mushroomBlue'], (deps, x, y, scale) => {
  tryDraw(deps, ['mushroomBlue'], x, y, 170 * scale);
});

register(['leaf_clump_small', 'leafClusterLow'], (deps, x, y, scale) => {
  tryDraw(deps, ['leafClusterLow'], x, y, 190 * scale);
});

register(['leaf_clump_round', 'leafClusterCompact'], (deps, x, y, scale) => {
  tryDraw(deps, ['leafClumpRound', 'leafClusterCompact'], x, y, 150 * scale);
});

register(['grass_tuft', 'grass_tuft_small', 'grassTuft'], (deps, x, y, scale, variant) => {
  const key = (variant ?? 0) % 2 === 0 ? 'grassTuftSmall' : 'grassTuftLarge';
  tryDraw(deps, [key, 'grassTuft'], x, y, 130 * scale);
});

register(['grass_tuft_large'], (deps, x, y, scale) => {
  tryDraw(deps, ['grassTuftLarge', 'grassTuft'], x, y, 150 * scale);
});

register(['dry_grass_obstacle', 'dryGrass'], (deps, x, y, scale) => {
  tryDraw(deps, ['dryGrass'], x, y, 150 * scale);
});

/**
 * @param {string} assetType
 * @returns {SceneryDrawFn | undefined}
 */
export function getSceneryDraw(assetType) {
  return TABLE.get(assetType);
}

/**
 * v3.8.15 — assetTypes whose dispatcher knows how to prefer a designer-
 * shipped LEFT/RIGHT 3/4-view variant before falling back to the generic
 * billboard. Renderer uses this to decide whether to run the two-pass
 * dispatch protocol (try side-variant first, then generic) or just do
 * a single legacy draw + optional canvas mirror.
 */
const SIDE_AWARE_TYPES = new Set([
  'grass_dirt_block', 'grass_dirt_step', 'terrainBlock',
  'floating_platform', 'platform',
  'hanging_platform_vines', 'hangingPlatform',
  // v3.8.34 — P1 Golden Rule batch.
  'stone_brick_single', 'stone_wall_low', 'stone_wall_stairs',
  // v4.10 — canonical side-pair re-export batch.
  'grass_dirt_platform_long', 'grassDirtPlatformLong',
  'purple_brick_single', 'blockStack',
  'planter_pot', 'planterPot',
  'fence_wood_short', 'fence',
]);

/** @param {string} assetType */
export function isSideAwareSceneryType(assetType) {
  return SIDE_AWARE_TYPES.has(assetType);
}
