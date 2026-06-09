export const ASSET_ROOT = './assets/';

export const ASSETS = {
  sky: 'background/sky/sky_gradient.png',
  mountainsFar: 'background/mountains/mountains_far.png',
  mountainsMid: 'background/mountains/mountains_mid.png',
  mountainsNear: 'background/mountains/mountains-near.png',
  forest: 'background/landscape/forest-treeline.png',
  castle: 'background/castle/castle_far.png',
  cloudLarge: 'background/clouds/cloud_large.png',
  cloudMedium: 'background/clouds/cloud_medium.png',
  cloudSmall: 'background/clouds/cloud_small.png',
  goldFlower: 'collectibles/flower-golden-orchid.png',
  orchidGold: 'collectibles/orchid_gold/orchid_gold_main.png',
  heart: 'collectibles/life-heart.png',
  grassBlockLeft: 'terrain/blocks/grass_dirt_block_left.png',
  grassBlockRight: 'terrain/blocks/grass_dirt_block_right.png',
  grassBlock: 'terrain/blocks/grass_dirt_block_01.png',
  grassPlatform: 'terrain/blocks/grass_dirt_platform_long.png',
  purpleWall: 'structures/stone_brick/purple_brick_block_iso_01.png',
  purpleBrick: 'structures/stone_brick/purple_brick_single.png',
  purpleStairs: 'structures/stone_brick/purple_brick_stairs_01.png',
  questionBlock: 'structures/question_block/question_block.png',
  pipe: 'structures/pipe/green_pipe.png',
  mushroom: 'decor_large/mushrooms/mushroom_red_big.png',
  tree: 'decor_large/trees/tree_round.png',
  bush: 'decor_large/bushes/bush_large_with_purple_flowers.png',
  fence: 'decor_large/fence/fence_wood_short.png',
  flowersPurple: 'decor_small/flowers/purple_flower_cluster.png',
  flowersYellow: 'decor_small/flowers/yellow_flower_small.png',
  vineBarrier: 'obstacles/vines/vine_barrier_full.png',
  dryGrass: 'obstacles/dry_grass/dry_grass_obstacle.png',
  spikyBush: 'blocks/bush-spiky.png',
  grassTuft: 'decor_small/grass/grass_tuft_large.png',
};

export const FARMER_UNIT = 2.4;

export const PROP_METRICS = new Map([
  // M94: 2.65→1.8. top = 1.8*2.4=4.32m. At D=28.5m (z=-13): elev=atan(0.32/28.5)=0.64°
  // → screen 34.5% from top. Clears mountain zone (22-28%) which was blocked at 2.65× (top=16%).
  // M142: blobGrey (3rd slot) darkened ~18% across main props — stronger contact shadows
  // so blocks/mushrooms/trees read as planted, matching reference's solid dark blob shadows.
  [ASSETS.tree, [1.8, 0.78, 0.10]],
  [ASSETS.pipe, [1.25, 0.71, 0.05]],
  [ASSETS.mushroom, [1.6, 0.82, 0.23]],
  [ASSETS.fence, [0.60, 2.0, 0.15]],
  [ASSETS.bush, [0.55, 1.7, 0.12]],
  [ASSETS.grassBlock, [1.25, 1.15, 0.08]],
  [ASSETS.grassBlockLeft, [1.25, 1.15, 0.08]],
  [ASSETS.grassBlockRight, [1.25, 1.15, 0.08]],
  [ASSETS.grassPlatform, [0.7, 2.3, 0.10]],
  [ASSETS.purpleBrick, [0.75, 1.4, 0.08]],
  [ASSETS.purpleWall, [0.85, 1.5, 0.08]],
  [ASSETS.purpleStairs, [0.85, 1.55, 0.08]],
  [ASSETS.questionBlock, [0.88, 1.0, 0.15]],
  [ASSETS.flowersPurple, [0.34, 1.3, 0.30]],
  [ASSETS.flowersYellow, [0.30, 1.25, 0.30]],
  [ASSETS.dryGrass, [0.90, 1.2, 0.20]],
  [ASSETS.spikyBush, [0.85, 1.1, 0.17]],
  [ASSETS.grassTuft, [0.42, 1.25, 0.30]],
  [ASSETS.vineBarrier, [0.8, 2.4, 0.08]],
]);

export const FLORA_ASSETS = new Set([ASSETS.flowersPurple, ASSETS.flowersYellow]);
export const BLOB_SKIP = new Set([ASSETS.flowersPurple, ASSETS.flowersYellow, ASSETS.grassTuft]);
export const WINDY_ASSETS = new Set([
  ASSETS.tree, ASSETS.bush, ASSETS.flowersPurple, ASSETS.flowersYellow,
  ASSETS.grassTuft, ASSETS.spikyBush,
]);
export const ORGANIC_ASSETS = new Set([
  ASSETS.tree, ASSETS.bush, ASSETS.mushroom, ASSETS.flowersPurple, ASSETS.flowersYellow,
  ASSETS.grassTuft, ASSETS.spikyBush,
]);

export function prand(seed) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

export function propMetrics(assetPath) {
  const m = PROP_METRICS.get(assetPath);
  if (!m) return { width: 1, height: 1, blobGrey: 0.2 };
  const h = m[0] * FARMER_UNIT;
  return { height: h, width: h * m[1], blobGrey: m[2] };
}
