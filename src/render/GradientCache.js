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

    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0,    '#05348c');
    sky.addColorStop(0.26, '#1264cc');
    sky.addColorStop(0.58, '#3a98ee');
    sky.addColorStop(0.84, '#82ccfa');
    sky.addColorStop(1,    '#c2ecff');

    const skyDepth = ctx.createLinearGradient(0, 0, 0, skyH);
    skyDepth.addColorStop(0,    'rgba(12,4,64,0.26)');
    skyDepth.addColorStop(0.34, 'rgba(0,28,120,0.08)');
    skyDepth.addColorStop(0.68, 'rgba(0,0,0,0)');
    skyDepth.addColorStop(1,    'rgba(255,184,60,0.12)');

    const haze = ctx.createLinearGradient(0, p.horizonY - 12, 0, p.horizonY + 164);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(1, 'rgba(255,245,220,0.22)');

    const distantHaze = ctx.createLinearGradient(0, p.roadVanishY - 90, 0, p.roadVanishY + 120);
    distantHaze.addColorStop(0, 'rgba(170,230,255,0.34)');
    distantHaze.addColorStop(0.52, 'rgba(255,255,255,0.22)');
    distantHaze.addColorStop(1, 'rgba(255,255,255,0.00)');

    const depthHaze = ctx.createLinearGradient(0, p.roadVanishY + 40, 0, p.roadVanishY + 110);
    depthHaze.addColorStop(0, 'rgba(180,230,190,0.00)');
    depthHaze.addColorStop(0.5, 'rgba(140,210,160,0.18)');
    depthHaze.addColorStop(1, 'rgba(80,170,100,0.10)');

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
      skyH,
      groundStartY,
      foregroundY0: y0Foreground,
    };
  }
}
