import { SpriteRenderer } from '../render/SpriteRenderer.js';
import { PixelPainter } from '../render/PixelPainter.js';
import { GradientCache } from '../render/GradientCache.js';
import { RenderPipeline } from '../render/RenderPipeline.js';
import { cameraShakeOffset } from '../render/helpers.js';
import { SkyRenderer } from '../render/renderers/SkyRenderer.js';
import { BackgroundRenderer } from '../render/renderers/BackgroundRenderer.js';
import { LandmarksRenderer } from '../render/renderers/LandmarksRenderer.js';
import { RoadRenderer } from '../render/renderers/RoadRenderer.js';
import { SceneryRenderer } from '../render/renderers/SceneryRenderer.js';
import { GameplayRenderer } from '../render/renderers/GameplayRenderer.js';
import { PlayerRenderer } from '../render/renderers/PlayerRenderer.js';
import { EffectsRenderer } from '../render/renderers/EffectsRenderer.js';

/**
 * Composition root for rendering. Owns the canvas + drawing dependencies
 * (SpriteRenderer, PixelPainter, GradientCache) and dispatches frame
 * painting through a fixed RenderPipeline of layer renderers.
 *
 * Per-frame responsibilities:
 *   1. apply camera-shake transform
 *   2. clear the canvas
 *   3. let the pipeline paint every layer back-to-front
 *   4. reset the transform
 *
 * Layer composition lives in the constructor — change order there.
 */
export class RenderSystem {
  constructor(canvas, assets, projection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.projection = projection;
    this.sprites = new SpriteRenderer(this.ctx, assets);
    this.paint = new PixelPainter(this.ctx, this.sprites);
    this.gradients = new GradientCache(this.ctx, projection);

    const deps = {
      ctx: this.ctx,
      projection,
      assets,
      sprites: this.sprites,
      paint: this.paint,
      gradients: this.gradients,
    };

    this.pipeline = new RenderPipeline([
      new SkyRenderer(deps),
      new BackgroundRenderer(deps),
      new LandmarksRenderer(deps),
      new RoadRenderer(deps),
      new SceneryRenderer(deps),
      new GameplayRenderer(deps),
      new PlayerRenderer(deps),
      new EffectsRenderer(deps),
    ]);
  }

  render(world) {
    const ctx = this.ctx;
    const shake = cameraShakeOffset(world);
    ctx.setTransform(1, 0, 0, 1, shake.x, shake.y);
    ctx.clearRect(-shake.x, -shake.y, this.canvas.width, this.canvas.height);

    this.pipeline.render(world);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  resizeToViewport(padding = 0) {
    const maxWidth = window.innerWidth - padding;
    const maxHeight = window.innerHeight - padding;
    const ratio = this.canvas.width / this.canvas.height;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    width = Math.max(320, width);
    height = Math.max(180, height);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const stage = this.canvas.parentElement;
    if (stage) {
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
    }
  }
}
