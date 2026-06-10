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
import { VoxelBlockRenderer } from '../render/renderers/scenery/VoxelBlockRenderer.js';
import { RenderMetrics } from '../render/RenderMetrics.js';

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
  // In-flight dynamic import of ThreeModelRenderer (see #ensureThreeModels).
  #threeModelsPromise = null;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../core/AssetManager.js').AssetManager} assets
   * @param {import('../world/Projection.js').Projection} projection
   * @param {{ pixelRatio?: number, roadStyle?: 'procedural' | 'tiles' | 'kit', blockStyle?: 'sprite' | 'voxel', playerVoxelEnabled?: boolean }} [options]
   */
  constructor(canvas, assets, projection, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.projection = projection;
    this.pixelRatio = Math.max(1, options.pixelRatio ?? 1);
    this.roadStyle = ['procedural', 'tiles', 'kit'].includes(options.roadStyle)
      ? options.roadStyle
      // v4.13 — procedural pixel-art road is the default (see main.js).
      : 'procedural';
    this.blockStyle = options.blockStyle === 'voxel' ? 'voxel' : 'sprite';
    this.playerVoxelEnabled = options.playerVoxelEnabled !== false;

    // Retro chunky-pixel: clamp to (0,1]. 1.0 = full-res (no change).
    // Values below 1.0 shrink the backing buffer so CSS upscaling with
    // image-rendering:pixelated produces fat nearest-neighbor pixels at
    // zero extra per-frame cost (fewer pixels to fill, not more).
    this.retroPixelScale = Math.min(1, Math.max(0.1, options.retroPixelScale ?? 1));

    // Backing buffer = logical size × retroPixelScale × pixelRatio.
    // The canvas transform in render() maps logical → backing so every
    // downstream renderer keeps working in the 1536×864 design space.
    const backingW = Math.round(projection.width  * this.retroPixelScale * this.pixelRatio);
    const backingH = Math.round(projection.height * this.retroPixelScale * this.pixelRatio);
    canvas.width  = backingW;
    canvas.height = backingH;

    this.sprites = new SpriteRenderer(this.ctx, assets);
    this.paint = new PixelPainter(this.ctx, this.sprites);
    this.gradients = new GradientCache(this.ctx, projection);
    // Voxel models (3D farmer / voxel blocks) ride on three.js, which is a
    // ~0.6MB module graph the pure-sprite profile never needs. Start with
    // null — every consumer already falls back to sprites behind a
    // `threeModels?.enabled` guard — and lazy-import below only when a
    // voxel feature is actually on.
    this.threeModels = null;
    this.voxelBlocks = new VoxelBlockRenderer(this.ctx, {
      style: this.blockStyle,
      threeModels: null,
    });
    // Debug-only render-cost collector (?perf=1). null otherwise → every
    // `this.metrics?.…` increment site in the renderers is a zero-cost no-op.
    this.metrics = options.metrics ? new RenderMetrics() : null;

    const deps = {
      ctx: this.ctx,
      projection,
      assets,
      sprites: this.sprites,
      paint: this.paint,
      gradients: this.gradients,
      voxelBlocks: this.voxelBlocks,
      threeModels: this.threeModels,
      playerVoxelEnabled: this.playerVoxelEnabled,
      pixelRatio: this.pixelRatio,
      roadStyle: this.roadStyle,
      metrics: this.metrics,
    };

    // Kick the lazy import in parallel with asset preload when a voxel
    // feature starts enabled; the models pop in within the loading screen.
    if (this.playerVoxelEnabled || this.blockStyle === 'voxel') this.#ensureThreeModels();

    this.roadRenderer = new RoadRenderer(deps);
    this.effectsRenderer = new EffectsRenderer(deps);
    // v3.8.30 — playerRenderer is held on the instance so Sprite Lab mode
    // can call it directly (bypassing the gameplay pipeline) without
    // duplicating its construction.
    this.playerRenderer = new PlayerRenderer(deps);
    this.pipeline = new RenderPipeline([
      new SkyRenderer(deps),
      new BackgroundRenderer(deps),
      new LandmarksRenderer(deps),
      this.roadRenderer,
      new SceneryRenderer(deps),
      new GameplayRenderer(deps),
      this.playerRenderer,
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

  /**
   * Swap modular scenery blocks between delivered 2D sprites and the
   * Canvas-only 3D-like voxel renderer. Gameplay entities are untouched.
   */
  setBlockStyle(style) {
    this.blockStyle = this.voxelBlocks.setStyle(style);
    if (this.blockStyle === 'voxel') this.#ensureThreeModels();
    console.info(`[RenderSystem] blockStyle → ${this.blockStyle}`);
    return this.blockStyle;
  }

  toggleBlockStyle() {
    return this.setBlockStyle(this.voxelBlocks.enabled ? 'sprite' : 'voxel');
  }

  setPlayerVoxelEnabled(enabled) {
    this.playerVoxelEnabled = enabled !== false;
    if (this.playerVoxelEnabled) this.#ensureThreeModels();
    this.playerRenderer?.setVoxelEnabled(this.playerVoxelEnabled);
    console.info(`[RenderSystem] playerVoxelEnabled -> ${this.playerVoxelEnabled}`);
    return this.playerVoxelEnabled;
  }

  /**
   * Lazily import the three.js-backed model renderer and attach it to
   * every holder (voxelBlocks, playerRenderer). Consumers keep drawing
   * sprite fallbacks behind their `threeModels?.enabled` guards until the
   * import lands, so nothing blocks and a failed import (no WebGL, blocked
   * module) degrades to the pure-sprite look with a single warning.
   *
   * @returns {Promise<object | null>}
   */
  #ensureThreeModels() {
    if (this.#threeModelsPromise) return this.#threeModelsPromise;
    this.#threeModelsPromise = import('../render/renderers/three/ThreeModelRenderer.js')
      .then(({ ThreeModelRenderer }) => {
        const models = new ThreeModelRenderer({ enabled: true });
        this.threeModels = models;
        this.voxelBlocks.threeModels = models;
        if (this.playerRenderer) this.playerRenderer.threeModels = models;
        return models;
      })
      .catch((err) => {
        console.warn('[RenderSystem] voxel models unavailable, keeping sprite fallback:', err);
        return null;
      });
    return this.#threeModelsPromise;
  }

  render(world) {
    const ctx = this.ctx;
    const dpr = this.pixelRatio;
    // Combined backing-buffer scale: retroPixelScale (chunky-pixel
    // downscale) × pixelRatio (HiDPI). All downstream renderers draw in
    // logical 1536×864 space and never see this factor.
    const backingScale = this.retroPixelScale * dpr;
    const shake = cameraShakeOffset(world);
    // Bake the combined scale into the transform so every downstream
    // renderer keeps working in logical (1536×864) coordinates.
    // clearRect needs the logical size, since the transform applies to it.
    ctx.setTransform(backingScale, 0, 0, backingScale, shake.x * backingScale, shake.y * backingScale);
    ctx.clearRect(-shake.x, -shake.y, this.projection.width, this.projection.height);
    // Pixel-art aesthetic: bilinear filtering off for the whole frame.
    // Setting it once per frame replaces ~80 save/restore pairs that
    // used to wrap individual sprite draws.
    ctx.imageSmoothingEnabled = false;

    // Debug-only (?perf=1): wrap ctx.drawImage ONCE to count main-canvas
    // blits, then reset the per-frame counters. The wrapper calls the original
    // verbatim → identical pixels; it only increments. Never installed when
    // metrics is null, so production rendering is byte-for-byte unchanged.
    if (this.metrics) {
      if (!this._diWrapped) {
        const orig = ctx.drawImage.bind(ctx);
        const m = this.metrics;
        ctx.drawImage = function metricsDrawImage(...args) { m.countDrawImage(); return orig(...args); };
        this._diWrapped = true;
      }
      this.metrics.beginFrame();
    }

    // v3.8.30 — Sprite Lab mode hijacks the frame: neutral background +
    // ground baseline + ONLY the player renderer. Used for pose / pixel-
    // scale QA without any scene context (road, decor, effects, HUD
    // overlays). Toggled from the on-screen QA panel via debug config.
    if (world.config.debug?.spriteLabMode) {
      this.#renderSpriteLab(world);
    } else {
      this.pipeline.render(world);
    }

    // v4.0 — Post-process color grade: warm/cool overlay + vignette.
    // Applied AFTER the pipeline paints the full frame but BEFORE the
    // transform reset so the overlays sit in logical coordinates (same
    // space as the rest of the frame). Guard: visual.enabled AND
    // visual.grade.enabled — if either is off, zero overhead.
    const vCfg = world.config.visual;
    if (vCfg?.enabled
        && vCfg?.grade?.enabled
        && world.adaptiveQuality?.tier?.postProcessGrade !== false) {
      this.#applyColorGrade(
        ctx,
        this.projection,
        vCfg.grade,
        world.adaptiveQuality?.tier?.fullCanvasFilter !== false,
      );
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.metrics?.endFrame();
  }

  /**
   * v4.0 — Post-process color grade overlay pass.
   *
   * Cheap pipeline (no per-frame allocation after first frame):
   *   1. Warm→Cool vertical gradient with 'overlay' composite — punches
   *      highlights warm and shadows cool without changing luminance.
   *   2. Radial vignette with 'multiply' composite — darkens corners.
   *   3. ctx.filter saturate/contrast/brightness applied to an offscreen
   *      copy, then drawn back — done once on the offscreen canvas that
   *      is lazily allocated and reused every frame.
   *
   * Pixel-art safety: imageSmoothingEnabled is restored to false after
   * the filter pass (the offscreen draw temporarily needs the value
   * unchanged — we explicitly set false before drawing back).
   *
   * All operations wrapped in save/restore so globalAlpha,
   * globalCompositeOperation, and filter are never left dirty.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../world/Projection.js').Projection} p
   * @param {object} grade  — world.config.visual.grade
   * @param {boolean} allowFullCanvasFilter
   */
  #applyColorGrade(ctx, p, grade, allowFullCanvasFilter = true) {
    const W = p.width;
    const H = p.height;

    // ── 1. Warm (top) → cool (bottom) overlay pass ──────────────────
    if (grade.warmCool?.enabled) {
      const wc = grade.warmCool;
      // Lazy-init the warm/cool gradient. Invalidated on resize but
      // the canvas logical size never changes at runtime in this game.
      if (!this._wcGradient || this._wcGradientW !== W || this._wcGradientH !== H) {
        // Diagonal axis gives the existing one-pass grade a directional
        // upper-right sunlight read without adding another full-canvas blit.
        this._wcGradient = ctx.createLinearGradient(W * 0.92, 0, W * 0.18, H);
        this._wcGradient.addColorStop(0.00, wc.warm);
        this._wcGradient.addColorStop(0.55, 'rgba(0,0,0,0)');
        this._wcGradient.addColorStop(1.00, wc.cool);
        this._wcGradientW = W;
        this._wcGradientH = H;
      }
      ctx.save();
      ctx.globalAlpha = wc.strength;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = this._wcGradient;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── 2. Vignette — radial darkening at corners ────────────────────
    if (grade.vignette?.enabled) {
      if (!this._vigGradient || this._vigW !== W || this._vigH !== H) {
        const cx = W / 2;
        const cy = H / 2;
        const inner = Math.min(W, H) * 0.30;
        const outer = Math.hypot(cx, cy);
        this._vigGradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        this._vigGradient.addColorStop(0,    'rgba(0,0,0,0)');
        this._vigGradient.addColorStop(0.60, 'rgba(0,0,0,0)');
        this._vigGradient.addColorStop(1.00, `rgba(0,0,0,${grade.vignette.strength})`);
        this._vigW = W;
        this._vigH = H;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this._vigGradient;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── 3. Saturate / contrast / brightness via ctx.filter ──────────
    // Strategy: draw the current canvas onto an offscreen copy with a
    // filter string, then copy it back over itself with 'copy'. This
    // is a single GPU blit — cheap. The offscreen canvas is lazily
    // allocated once and reused every frame (no per-frame allocation).
    const sat = grade.saturate ?? 1;
    const con = grade.contrast ?? 1;
    const bri = grade.brightness ?? 1;
    const filterNeeded = (sat !== 1 || con !== 1 || bri !== 1);
    if (filterNeeded && allowFullCanvasFilter) {
      // Operate in RAW DEVICE PIXELS with an identity transform. This
      // makes the grade correct under HiDPI (canvas.width = logical*dpr)
      // and immune to the active camera-shake translate — both of which
      // would otherwise make the logical-space blit sample the wrong
      // region or leave a transparent edge under 'copy'. The outer
      // render() resets the transform to identity right after we return,
      // so leaving it identity here is safe; we still save/restore.
      const DW = ctx.canvas.width;
      const DH = ctx.canvas.height;
      if (!this._gradeCanvas || this._gradeCanvas.width !== DW || this._gradeCanvas.height !== DH) {
        this._gradeCanvas = (typeof OffscreenCanvas !== 'undefined')
          ? new OffscreenCanvas(DW, DH)
          : (() => { const c = document.createElement('canvas'); c.width = DW; c.height = DH; return c; })();
        this._gradeCtx = this._gradeCanvas.getContext('2d');
      }
      const oc = this._gradeCtx;
      // Copy the main canvas into the offscreen with the filter (1:1,
      // device-pixel exact).
      oc.save();
      oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.filter = `saturate(${sat}) contrast(${con}) brightness(${bri})`;
      oc.imageSmoothingEnabled = false;
      oc.clearRect(0, 0, DW, DH);
      oc.drawImage(ctx.canvas, 0, 0);
      oc.restore();
      // Stamp the grade back onto the main canvas — 'copy' replaces pixels
      // with no alpha compositing math (one cheap blit).
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.imageSmoothingEnabled = false;
      ctx.filter = 'none';
      ctx.drawImage(this._gradeCanvas, 0, 0);
      ctx.restore();
      // Restore pixel-art flag — pipeline already set it to false, but
      // save/restore may have popped it to a different value.
      ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * v3.8.30 — neutral scene used by Sprite Lab QA mode. Renders the
   * player on a flat backdrop with a horizontal baseline at the ground
   * level so cyan / magenta debug boxes can be compared frame-to-frame
   * without scene noise.
   */
  #renderSpriteLab(world) {
    const ctx = this.ctx;
    const p = this.projection;
    // Neutral background — vertical gradient that keeps the eye on the
    // player. Avoids pure black (loses sprite contrast on dark hats) and
    // pure white (loses sprite contrast on light skin).
    const grad = ctx.createLinearGradient(0, 0, 0, p.height);
    grad.addColorStop(0, '#1a2638');
    grad.addColorStop(1, '#0d1422');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, p.width, p.height);
    // Ground baseline at the player's foot Y.
    const bottomMargin = world.config.player.bottomMargin ?? 0;
    const groundY = p.groundY - bottomMargin;
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(p.width, groundY);
    ctx.stroke();
    // Tick marks every 64 logical units → matches the canonical canvas
    // width so QA can eyeball "is the farmer one canvas wide".
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.18)';
    for (let x = 0; x <= p.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, groundY - 6);
      ctx.lineTo(x, groundY + 6);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle = 'rgba(200, 230, 255, 0.48)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SPRITE LAB · baseline · 64u grid', 12, 20);
    // Player only.
    this.playerRenderer.render(world);
  }

  /**
   * Contract alias — delegates to resizeToViewport(0).
   * The canvas2d renderer has no separate width/height/pixelRatio concept
   * at resize time (it drives layout from the #app bounding rect), so
   * the contract parameters are accepted but ignored.
   */
  resize() {
    this.resizeToViewport(0);
  }

  /**
   * Release cached off-screen surfaces so a swapped-out renderer drops
   * its backing buffers for GC.
   *
   * Canvas2D holds no GPU handles — nothing to force-lose — but the
   * lazily-allocated offscreen grade canvas and the cached gradient
   * objects both pin memory that becomes dead weight once the renderer
   * is retired.
   */
  destroy() {
    // Drop the offscreen color-grade canvas so its backing store is GC'd.
    this._gradeCanvas = null;
    this._gradeCtx    = null;
    // Drop cached gradient objects (hold references to the 2D context).
    this._wcGradient  = null;
    this._vigGradient = null;
    // Drop the lazily-imported voxel model renderer (owns an offscreen
    // WebGL canvas) so its GPU resources can be reclaimed.
    this.threeModels = null;
    this.#threeModelsPromise = null;
    // Prevent further renders from accidentally using stale state.
    this.pipeline = null;
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
