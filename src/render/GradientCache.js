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

    // v3.8.8 — haze layers redesigned to fade in/out smoothly instead
    // of reading as rectangular overlays. Each layer fades to alpha 0
    // at BOTH top and bottom so there is no visible hard edge.
    const haze = ctx.createLinearGradient(0, p.horizonY - 40, 0, p.horizonY + 200);
    haze.addColorStop(0.00, 'rgba(252,242,212,0)');
    haze.addColorStop(0.30, 'rgba(252,242,212,0.08)');
    haze.addColorStop(0.55, 'rgba(252,238,206,0.16)');
    haze.addColorStop(0.80, 'rgba(248,232,196,0.10)');
    haze.addColorStop(1.00, 'rgba(248,232,196,0)');

    // distantHaze — was the strongest "rectangular band" the user flagged.
    // Peak alpha 0.34 → 0.16; fades to 0 at both ends; wider Y range so the
    // peak sits behind the castle area, not as a hard stripe.
    const distantHaze = ctx.createLinearGradient(0, p.roadVanishY - 120, 0, p.roadVanishY + 160);
    distantHaze.addColorStop(0.00, 'rgba(196,232,248,0)');
    distantHaze.addColorStop(0.32, 'rgba(196,232,248,0.10)');
    distantHaze.addColorStop(0.56, 'rgba(232,242,250,0.16)');
    distantHaze.addColorStop(0.80, 'rgba(232,242,250,0.06)');
    distantHaze.addColorStop(1.00, 'rgba(232,242,250,0)');

    // depthHaze — softer too; fades in and out so the ground-meets-horizon
    // line reads as a soft transition rather than a coloured band.
    const depthHaze = ctx.createLinearGradient(0, p.roadVanishY + 20, 0, p.roadVanishY + 130);
    depthHaze.addColorStop(0.00, 'rgba(180,222,190,0)');
    depthHaze.addColorStop(0.45, 'rgba(150,212,166,0.13)');
    depthHaze.addColorStop(0.75, 'rgba(120,194,140,0.08)');
    depthHaze.addColorStop(1.00, 'rgba(80,170,100,0)');

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
      haze,
      distantHaze,
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
