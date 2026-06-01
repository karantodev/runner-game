/**
 * Caches CanvasGradient instances so the render loop does not call
 * ctx.createLinearGradient on every frame. Gradients depend only on the
 * projection geometry, so we rebuild them once on construction and again
 * whenever invalidate() is called (e.g. after a viewport resize).
 */
export class GradientCache {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../world/Projection.js').Projection} projection
   */
  constructor(ctx, projection) {
    this.ctx = ctx;
    this.projection = projection;
    this.gradients = {};
    this.rebuild();
  }

  invalidate() {
    this.rebuild();
  }

  rebuild() {
    const ctx = this.ctx;
    const p = this.projection;
    const skyH = Math.max(p.horizonY + 210, p.height * 0.66);

    // v3.8.8 sky tune — 9 stops instead of 5 to eliminate visible banding.
    // The previous 5-stop gradient produced perceptible stripes between
    // crown / mid / horizon zones. With 9 stops the transitions are
    // smooth enough that even the warm-horizon shift (#e0ddc8) reads as
    // genuine atmospheric perspective rather than an overlay.
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0.00, '#082684');
    sky.addColorStop(0.12, '#0c3fa2');
    sky.addColorStop(0.24, '#1259c4');
    sky.addColorStop(0.40, '#2580dc');
    sky.addColorStop(0.55, '#4ba6ef');
    sky.addColorStop(0.70, '#7ec3f4');
    sky.addColorStop(0.84, '#b2dbf6');
    sky.addColorStop(0.94, '#d6e4ec');
    sky.addColorStop(1.00, '#e0ddc8');

    const skyDepth = ctx.createLinearGradient(0, 0, 0, skyH);
    skyDepth.addColorStop(0,    'rgba(12,4,64,0.26)');
    skyDepth.addColorStop(0.34, 'rgba(0,28,120,0.08)');
    skyDepth.addColorStop(0.68, 'rgba(0,0,0,0)');
    skyDepth.addColorStop(1,    'rgba(255,184,60,0.12)');

    // One feathered atmospheric veil is enough. Older versions stacked
    // several haze rectangles around the horizon and then added per-layer
    // grey overlays in BackgroundRenderer. Even with transparent endpoints,
    // the overlap read as a hard horizontal fog strip. Keep the sky clean
    // and use this single veil between the distant and near landscape.
    const horizonVeil = ctx.createLinearGradient(0, p.horizonY - 54, 0, p.roadVanishY + 132);
    horizonVeil.addColorStop(0.00, 'rgba(206,236,236,0)');
    horizonVeil.addColorStop(0.34, 'rgba(206,236,236,0.035)');
    horizonVeil.addColorStop(0.58, 'rgba(196,230,220,0.085)');
    horizonVeil.addColorStop(0.80, 'rgba(170,218,184,0.045)');
    horizonVeil.addColorStop(1.00, 'rgba(150,206,164,0)');

    // A very small ground join keeps the road tip from looking pasted on.
    // It is intentionally separate from atmospheric haze and stays below
    // the mountain silhouettes.
    const depthHaze = ctx.createLinearGradient(0, p.roadVanishY + 42, 0, p.roadVanishY + 126);
    depthHaze.addColorStop(0.00, 'rgba(156,214,166,0)');
    depthHaze.addColorStop(0.52, 'rgba(142,204,150,0.055)');
    depthHaze.addColorStop(1.00, 'rgba(112,184,126,0)');

    const roadJoin = ctx.createLinearGradient(0, p.roadVanishY - 4, 0, p.roadVanishY + 78);
    roadJoin.addColorStop(0, 'rgba(198,236,146,0.12)');
    roadJoin.addColorStop(1, 'rgba(108,178,78,0.46)');

    const groundStartY = p.roadVanishY + 62;
    const ground = ctx.createLinearGradient(0, groundStartY, 0, p.height);
    ground.addColorStop(0, '#83c34f');
    ground.addColorStop(0.38, '#58a53d');
    ground.addColorStop(1, '#2d712f');

    const road = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    road.addColorStop(0, '#96dc64');
    road.addColorStop(0.42, '#6cba47');
    road.addColorStop(1, '#3f8f34');

    const roadEdge = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadEdge.addColorStop(0, 'rgba(220,248,120,0.14)');
    roadEdge.addColorStop(1, 'rgba(222,248,110,0.78)');

    const y0Foreground = p.groundY - 96;
    const foregroundLeft = ctx.createLinearGradient(0, y0Foreground, 0, p.height);
    foregroundLeft.addColorStop(0, 'rgba(58,150,46,0.00)');
    foregroundLeft.addColorStop(0.45, 'rgba(37,126,38,0.32)');
    foregroundLeft.addColorStop(1, 'rgba(20,86,33,0.72)');

    // Power-up vignettes: radial gradient that's transparent at the
    // center and tinted at the corners. Drawn as a full-screen fillRect
    // by EffectsRenderer when a burst is active.
    const burstVignette = makeVignette(ctx, p.width, p.height, '80, 255, 100', 0.42);
    const splitVignette = makeVignette(ctx, p.width, p.height, '170, 90, 255', 0.40);

    // Lane-divider taper. Stronger again — target reference has clearly
    // visible cream guides between lanes. Color shifted warmer toward
    // the target's "worn cream path" rather than yellow-green.
    const dividerFade = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    dividerFade.addColorStop(0,    'rgba(232,228,170,0.08)');
    dividerFade.addColorStop(0.45, 'rgba(232,228,170,0.40)');
    dividerFade.addColorStop(1,    'rgba(240,232,180,0.80)');

    this.gradients = {
      sky,
      skyDepth,
      horizonVeil,
      depthHaze,
      roadJoin,
      ground,
      road,
      roadEdge,
      foregroundSide: foregroundLeft,
      burstVignette,
      splitVignette,
      dividerFade,
      skyH,
      groundStartY,
      foregroundY0: y0Foreground,
    };
  }
}

function makeVignette(ctx, width, height, rgb, peakAlpha) {
  const cx = width / 2;
  const cy = height / 2;
  const inner = Math.min(width, height) * 0.22;
  const outer = Math.hypot(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  gradient.addColorStop(0, `rgba(${rgb}, 0)`);
  gradient.addColorStop(0.55, `rgba(${rgb}, ${peakAlpha * 0.20})`);
  gradient.addColorStop(1, `rgba(${rgb}, ${peakAlpha})`);
  return gradient;
}
