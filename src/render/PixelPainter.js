/**
 * Thin facade over SpriteRenderer. Each method is a single
 * `sprites.draw(key, x, y, size, anchor)` call with the canonical
 * key + sizing for that art asset.
 *
 * The previous procedural fillRect-fallbacks were removed in phase 7:
 * every key referenced here is in src/config/gameConfig.js → assets,
 * shipped in the repo, and loaded by AssetManager on boot. If a future
 * sprite genuinely fails to load, the canvas draws nothing in that spot
 * (visible regression — fix the asset).
 */
export class PixelPainter {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./SpriteRenderer.js').SpriteRenderer} spriteRenderer
   */
  constructor(ctx, spriteRenderer) {
    this.ctx = ctx;
    this.sprites = spriteRenderer;
  }

  flower(x, y, scale = 1) {
    this.sprites.draw('collectibleFlower', x, y, 42 * scale, 'center');
  }

  heart(x, y, scale = 1) {
    this.sprites.draw('lifeHeart', x, y, 45 * scale, 'center');
  }

  mushroom(x, y, scale = 1, variant = 'red') {
    const key = variant === 'purple' ? 'mushroomPurple' : 'mushroomRed';
    this.sprites.draw(key, x, y, 90 * scale, 'bottom');
  }

  bush(x, y, scale = 1) {
    this.sprites.draw('bushSpiky', x, y, 100 * scale, 'bottom');
  }

  wheat(x, y, scale = 1) {
    this.sprites.draw('wheatTuft', x, y, 105 * scale, 'bottom');
  }

  wallBlock(x, y, scale = 1, columns = 1, rows = 1) {
    const key = (columns >= 3 || rows > 1) ? 'brickPurplePlatform3' : 'brickPurpleSingle';
    const size = (columns >= 3 || rows > 1) ? 150 : 72;
    this.sprites.draw(key, x, y, size * scale, 'bottom');
  }

  questionBlock(x, y, scale = 1) {
    this.sprites.draw('questionBlock', x, y, 70 * scale, 'center');
  }

  fence(x, y, scale = 1) {
    this.sprites.draw('fenceWoodShort', x, y, 105 * scale, 'bottom');
  }

  pipe(x, y, scale = 1) {
    this.sprites.draw('pipeGreen', x, y, 95 * scale, 'bottom');
  }

  tree(x, y, scale = 1) {
    this.sprites.draw('treeRound', x, y, 112 * scale, 'bottom');
  }

  flowerBush(x, y, scale = 1) {
    this.sprites.draw('flowerPurpleCluster', x, y, 92 * scale, 'bottom');
  }

  smallFlower(x, y, scale = 1) {
    this.sprites.draw('flowerYellowSmall', x, y, 50 * scale, 'bottom');
  }

  sprout(x, y, scale = 1) {
    this.sprites.draw('sprout', x, y, 48 * scale, 'bottom');
  }

  platform(x, y, scale = 1, variant = 0) {
    const key = variant === 1 ? 'terrainPlatformSmall' : 'terrainPlatformLong';
    const size = variant === 1 ? 90 : 160;
    this.sprites.draw(key, x, y, size * scale, 'bottom');
  }

  grassWall(x, y, scale = 1, variant = 0) {
    const key = variant === 1 ? 'terrainWallTallFlower' : 'terrainBlockFront';
    this.sprites.draw(key, x, y, 135 * scale, 'bottom');
  }

  terrainBlock(x, y, scale = 1, variant = 0) {
    const keys = ['terrainBlockLeftFlower', 'terrainBlockFront', 'terrainBlockRightFlower', 'terrainStepLeft', 'terrainWallTallFlower'];
    const key = keys[Math.abs(variant) % keys.length];
    const width = key === 'terrainStepLeft' ? 145 : key === 'terrainWallTallFlower' ? 110 : 125;
    this.sprites.draw(key, x, y, width * scale, 'bottom');
  }
}
