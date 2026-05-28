/**
 * Asset-type → draw-function dispatch for SceneryRenderer.
 *
 * Each entry handles one (or several alias) assetType keys. Drawing is
 * expressed as a function so per-type quirks (yOffset, multi-key
 * variant resolution, dual sprite fallback) stay local instead of
 * leaking into the renderer.
 *
 * Adding a new scenery type = call register([alias1, alias2, ...], fn).
 *
 * @typedef {{
 *   sprites: import('../../SpriteRenderer.js').SpriteRenderer,
 *   paint:   import('../../PixelPainter.js').PixelPainter,
 * }} SceneryDrawDeps
 *
 * @typedef {(deps: SceneryDrawDeps, x: number, y: number, scale: number, variant: any) => void} SceneryDrawFn
 */

const TABLE = new Map();

/**
 * @param {string[]} aliases
 * @param {SceneryDrawFn} draw
 */
function register(aliases, draw) {
  for (const a of aliases) TABLE.set(a, draw);
}

// ── Structural wall elements ─────────────────────────────────────────────────

const TERRAIN_BLOCK_KEYS = ['grassBlockFrontRect', 'grassBlockCube01', 'grassBlockCube02', 'grassBlockColumnTall'];
register(['grass_dirt_block', 'grass_dirt_step', 'terrainBlock'], ({ sprites, paint }, x, y, scale, variant) => {
  const v = variant ?? 0;
  const key = TERRAIN_BLOCK_KEYS[v % 4];
  if (!sprites.draw(key, x, y, 185 * scale)) paint.terrainBlock(x, y, scale, v);
});

register(['grass_dirt_wall', 'grassWall'], ({ sprites, paint }, x, y, scale, variant) => {
  const v = variant ?? 0;
  const key = v % 2 === 0 ? 'purpleWallLow' : 'purpleWallStairs';
  if (!sprites.draw(key, x, y, 200 * scale)) paint.grassWall(x, y, scale, v % 2);
});

register(['purple_brick_single', 'blockStack'], ({ sprites, paint }, x, y, scale, variant) => {
  if (!sprites.draw('purpleBrick01', x, y, 110 * scale)) paint.wallBlock(x, y, scale, variant === 2 ? 3 : 1, 1);
});

register(['floating_platform', 'platform'], ({ sprites, paint }, x, y, scale, variant) => {
  const v = variant ?? 0;
  if (!sprites.draw('purplePlatformRow04', x, y, 290 * scale)) paint.platform(x, y, scale, v % 2);
});

register(['question_block', 'questionBlock'], ({ sprites, paint }, x, y, scale) => {
  const yShifted = y - 62 * scale;
  if (!sprites.draw('questionBlockSprite', x, yShifted, 90 * scale)) paint.questionBlock(x, yShifted, scale);
});

register(['green_pipe', 'pipe'], ({ sprites, paint }, x, y, scale) => {
  if (!sprites.draw('pipeGreenSprite', x, y, 130 * scale)) paint.pipe(x, y, scale);
});

register(['fence_wood_short', 'fence'], ({ sprites, paint }, x, y, scale) => {
  if (!sprites.draw('fenceWoodSprite', x, y, 220 * scale)) paint.fence(x, y, scale);
});

register(['hanging_platform_vines', 'hangingPlatform'], ({ sprites }, x, y, scale) => {
  sprites.draw('hangingPlatformVines', x, y, 280 * scale);
});

// ── Large organic / flora ────────────────────────────────────────────────────

register(['tree_round', 'tree'], ({ sprites, paint }, x, y, scale, variant) => {
  if (!sprites.draw('treeRoundSprite', x, y, 280 * scale)) paint.tree(x, y, scale, variant ?? 0);
});

register(['mushroom_red_big', 'mushroom'], ({ sprites, paint }, x, y, scale, variant) => {
  const key = variant === 'red' ? 'mushroomRed' : 'mushroomPurple';
  if (!sprites.draw(key, x, y, 180 * scale)) paint.mushroom(x, y, scale, variant);
});

register(['purple_flower_single', 'flowerbush'], ({ sprites, paint }, x, y, scale) => {
  if (!sprites.draw('bushWithFlowers', x, y, 160 * scale)) paint.flowerBush(x, y, scale);
});

register(['bush_large', 'bushLarge'], ({ sprites }, x, y, scale) => {
  sprites.draw('bushLarge', x, y, 240 * scale);
});

register(['bush_large_with_purple_flowers', 'bushLargeFlower'], ({ sprites }, x, y, scale) => {
  sprites.draw('bushLargeFlower', x, y, 240 * scale);
});

// ── Small organic / ground cover ─────────────────────────────────────────────

register(['yellow_flower_small', 'smallFlower'], ({ sprites, paint }, x, y, scale, variant) => {
  const v = variant ?? 0;
  const key = v % 2 === 0 ? 'yellowFlowerSmall' : 'purpleFlowerCluster';
  if (!sprites.draw(key, x, y, 80 * scale)) paint.smallFlower(x, y, scale);
});

register(['sprout_soil', 'sprout'], ({ sprites, paint }, x, y, scale) => {
  if (!sprites.draw('sproutSoil', x, y, 75 * scale)) paint.sprout(x, y, scale);
});

register(['wheat_tuft', 'wheat'], ({ paint }, x, y, scale) => {
  paint.wheat(x, y, scale);
});

register(['mushroom_blue_big', 'mushroomBlue'], ({ sprites }, x, y, scale) => {
  sprites.draw('mushroomBlue', x, y, 170 * scale);
});

register(['leaf_clump_small', 'leafClusterLow'], ({ sprites }, x, y, scale) => {
  sprites.draw('leafClusterLow', x, y, 190 * scale);
});

register(['leaf_clump_round', 'leafClusterCompact'], ({ sprites }, x, y, scale) => {
  if (!sprites.draw('leafClumpRound', x, y, 150 * scale)) sprites.draw('leafClusterCompact', x, y, 150 * scale);
});

register(['grass_tuft', 'grass_tuft_small', 'grassTuft'], ({ sprites }, x, y, scale, variant) => {
  const v = variant ?? 0;
  const key = v % 2 === 0 ? 'grassTuftSmall' : 'grassTuftLarge';
  if (!sprites.draw(key, x, y, 130 * scale)) sprites.draw('grassTuft', x, y, 130 * scale);
});

register(['grass_tuft_large'], ({ sprites }, x, y, scale) => {
  if (!sprites.draw('grassTuftLarge', x, y, 150 * scale)) sprites.draw('grassTuft', x, y, 130 * scale);
});

register(['dry_grass_obstacle', 'dryGrass'], ({ sprites }, x, y, scale) => {
  sprites.draw('dryGrass', x, y, 150 * scale);
});

register(['bush_with_purple_flowers'], ({ sprites, paint }, x, y, scale) => {
  if (!sprites.draw('bushWithFlowers', x, y, 160 * scale)) paint.flowerBush(x, y, scale);
});

/**
 * @param {string} assetType
 * @returns {SceneryDrawFn | undefined}
 */
export function getSceneryDraw(assetType) {
  return TABLE.get(assetType);
}
