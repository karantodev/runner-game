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

// ── Structural wall elements ─────────────────────────────────────────────────

// v3.8: designer-delivered flat-pixel block variants take priority over
// the legacy keys. Variant index selects which one to draw:
//   0 = block_01, 1 = block_02, 2 = block_flower_01, 3 = block_flower_02
const NEW_TERRAIN_BLOCK_KEYS = ['grassDirtBlock01', 'grassDirtBlock02', 'grassDirtBlockFlower01', 'grassDirtBlockFlower02'];
const TERRAIN_BLOCK_KEYS = ['grassBlockFrontRect', 'grassBlockCube01', 'grassBlockCube02', 'grassBlockColumnTall'];
register(['grass_dirt_block', 'grass_dirt_step', 'terrainBlock'], (deps, x, y, scale, variant) => {
  const v = variant ?? 0;
  const newKey = NEW_TERRAIN_BLOCK_KEYS[v % 4];
  const legacyKey = TERRAIN_BLOCK_KEYS[v % 4];
  tryDraw(deps, [newKey, legacyKey], x, y, 185 * scale,
    () => deps.paint.terrainBlock(x, y, scale, v));
});

// v3.8 — explicit left-facing step. SceneryRenderer auto-mirrors via
// canvas-flip when lane > 0, so right-side spawns get a flipped step
// without needing a separate _right asset.
register(['grass_dirt_step_left', 'grassDirtStepLeft'], (deps, x, y, scale) => {
  tryDraw(deps, ['grassDirtStepLeft'], x, y, 200 * scale,
    () => deps.paint.terrainBlock(x, y, scale, 3));
});

// v3.8 — long platform variant.
register(['grass_dirt_platform_long', 'grassDirtPlatformLong'], (deps, x, y, scale) => {
  tryDraw(deps, ['grassDirtPlatformLong2', 'grassDirtPlatformLong'], x, y, 290 * scale,
    () => deps.paint.platform(x, y, scale, 0));
});

register(['grass_dirt_wall', 'grassWall', 'stone_wall_low', 'stone_wall_stairs'], (deps, x, y, scale, variant) => {
  const v = variant ?? 0;
  const stoneKey  = v % 2 === 0 ? 'stoneWallLow'  : 'stoneWallStairs';
  const legacyKey = v % 2 === 0 ? 'purpleWallLow' : 'purpleWallStairs';
  tryDraw(deps, [stoneKey, legacyKey], x, y, 200 * scale,
    () => deps.paint.grassWall(x, y, scale, v % 2));
});

register(['purple_brick_single', 'blockStack', 'stone_brick_single'], (deps, x, y, scale, variant) => {
  tryDraw(deps, ['stoneBrickSingle', 'purpleBrick01'], x, y, 110 * scale,
    () => deps.paint.wallBlock(x, y, scale, variant === 2 ? 3 : 1, 1));
});

register(['floating_platform', 'platform'], (deps, x, y, scale, variant) => {
  const v = variant ?? 0;
  tryDraw(deps, ['platformFloating', 'purplePlatformRow04'], x, y, 290 * scale,
    () => deps.paint.platform(x, y, scale, v % 2));
});

register(['question_block', 'questionBlock'], (deps, x, y, scale) => {
  const yShifted = y - 62 * scale;
  // 4-frame idle bounce when designer ships animated question block.
  // Frame picked off performance.now() so the loop has no per-entity state.
  const animFrame = (Math.floor(performance.now() / 166) & 3) + 1;
  tryDraw(deps, [`questionBlockAnim0${animFrame}`, 'questionBlockSprite'], x, yShifted, 90 * scale,
    () => deps.paint.questionBlock(x, yShifted, scale));
});

// Legacy 'green_pipe' / 'pipe' redirects to planter_pot per v3 brief.
register(['green_pipe', 'pipe', 'planter_pot', 'planterPot'], (deps, x, y, scale) => {
  tryDraw(deps, ['planterPot', 'pipeGreenSprite'], x, y, 130 * scale,
    () => deps.paint.pipe(x, y, scale));
});

register(['fence_wood_short', 'fence'], (deps, x, y, scale) => {
  tryDraw(deps, ['fenceWoodSprite'], x, y, 220 * scale,
    () => deps.paint.fence(x, y, scale));
});

register(['hanging_platform_vines', 'hangingPlatform'], (deps, x, y, scale) => {
  tryDraw(deps, ['platformHangingVines', 'hangingPlatformVines'], x, y, 280 * scale);
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
