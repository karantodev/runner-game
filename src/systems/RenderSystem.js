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
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../core/AssetManager.js').AssetManager} assets
   * @param {import('../world/Projection.js').Projection} projection
   * @param {{ pixelRatio?: number, roadStyle?: 'procedural' | 'tiles' }} [options]
   */
  constructor(canvas, assets, projection, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.projection = projection;
    this.pixelRatio = Math.max(1, options.pixelRatio ?? 1);
    this.roadStyle = ['procedural', 'tiles', 'kit'].includes(options.roadStyle)
      ? options.roadStyle
      : 'procedural';

    // Resize the backing store to logical * pixelRatio. The projection
    // and renderers keep operating in logical units; setTransform() in
    // render() handles the scale conversion.
    if (this.pixelRatio !== 1) {
      canvas.width = projection.width * this.pixelRatio;
      canvas.height = projection.height * this.pixelRatio;
    }

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
      pixelRatio: this.pixelRatio,
      roadStyle: this.roadStyle,
    };

    this.roadRenderer = new RoadRenderer(deps);
    this.effectsRenderer = new EffectsRenderer(deps);
    this.pipeline = new RenderPipeline([
      new SkyRenderer(deps),
      new BackgroundRenderer(deps),
      new LandmarksRenderer(deps),
      this.roadRenderer,
      new SceneryRenderer(deps),
      new GameplayRenderer(deps),
      new PlayerRenderer(deps),
      this.effectsRenderer,
    ]);
  }

  /**
   * Cycle through the three road-rendering modes (procedural → tiles →
   * kit → procedural). Bound to the `T` key in main.js so the user
   * can A/B/C-compare live.
   */
  toggleRoadStyle() {
    const order = ['procedural', 'tiles', 'kit'];
    const next = order[(order.indexOf(this.roadStyle) + 1) % order.length];
    this.roadStyle = next;
    this.roadRenderer.roadStyle = next;
    console.info(`[RenderSystem] roadStyle → ${next}`);
    return next;
  }

  render(world) {
    const ctx = this.ctx;
    const dpr = this.pixelRatio;
    const shake = cameraShakeOffset(world);
    // Bake DPR into the transform so every downstream renderer keeps
    // working in logical (1536×864) coordinates. clearRect needs the
    // logical size, since the transform applies to it too.
    ctx.setTransform(dpr, 0, 0, dpr, shake.x * dpr, shake.y * dpr);
    ctx.clearRect(-shake.x, -shake.y, this.projection.width, this.projection.height);
    // Pixel-art aesthetic: bilinear filtering off for the whole frame.
    // Setting it once per frame replaces ~80 save/restore pairs that
    // used to wrap individual sprite draws.
    ctx.imageSmoothingEnabled = false;

    this.pipeline.render(world);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  resizeToViewport(padding = 0) {
    // Read from the #app element instead of window.innerWidth so that the
    // safe-area-inset (iPhone notch + console TV overscan margins) is
    // respected automatically. #app is sized via `inset: env(safe-area-inset-*)`
    // in style.css; getBoundingClientRect reflects the resulting box.
    const appEl = document.getElementById('app');
    const rect = appEl ? appEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const maxWidth = rect.width - padding;
    const maxHeight = rect.height - padding;
    // Aspect ratio is always logical projection's, regardless of dpr
    // (canvas pixel-buffer may be dpr-scaled but we want CSS box to
    // match the game's intended 1536:864 frame).
    const ratio = this.projection.width / this.projection.height;
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
