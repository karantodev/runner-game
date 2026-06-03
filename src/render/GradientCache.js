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
    // v4.20 — M7A horizon-haze pass: lift the veil alpha so more atmospheric
    // air sits over the far-scenery / mid-background band, pushing the distant
    // treeline + structures back toward the reference. Peak (~horizon) raised
    // 0.085→0.13, faint-start 0.035→0.055, road-side stop 0.045→0.06. Hues and
    // extent are UNCHANGED so the road tip stays readable and the scene reads
    // airy rather than foggy. Render-only; one already-drawn fillRect — no new
    // draw ops, no per-sprite work.
    const horizonVeil = ctx.createLinearGradient(0, p.horizonY - 54, 0, p.roadVanishY + 132);
    horizonVeil.addColorStop(0.00, 'rgba(206,236,236,0)');
    horizonVeil.addColorStop(0.34, 'rgba(206,236,236,0.055)');
    horizonVeil.addColorStop(0.58, 'rgba(196,230,220,0.13)');
    horizonVeil.addColorStop(0.80, 'rgba(170,218,184,0.06)');
    horizonVeil.addColorStop(1.00, 'rgba(150,206,164,0)');

    // v4.21 — M7B dynamic-scenery depth haze. SceneryRenderer draws this band
    // AFTER the scenery sprites (before gameplay/player), so far/mid scenery
    // recedes while the near foreground (below the band) and all gameplay /
    // player / effects (drawn later) stay crisp. Stops carry the RELATIVE alpha
    // shape (0→peak→0); SceneryRenderer scales the whole band by
    // visual.depth.sceneryHaze.alpha via globalAlpha. Geometry-only → cached
    // here, rebuilt on resize with the other gradients.
    const sceneryHazeY0 = p.roadVanishY - 90;
    const sceneryHazeY1 = p.roadVanishY + (p.groundY - p.roadVanishY) * 0.5;
    const sceneryHaze = ctx.createLinearGradient(0, sceneryHazeY0, 0, sceneryHazeY1);
    sceneryHaze.addColorStop(0.00, 'rgba(214,230,226,0)');
    sceneryHaze.addColorStop(0.32, 'rgba(214,230,226,1)');
    sceneryHaze.addColorStop(0.66, 'rgba(206,226,220,0.45)');
    sceneryHaze.addColorStop(1.00, 'rgba(198,222,212,0)');

    // A very small ground join keeps the road tip from looking pasted on.
    // It is intentionally separate from atmospheric haze and stays below
    // the mountain silhouettes.
    const depthHaze = ctx.createLinearGradient(0, p.roadVanishY + 42, 0, p.roadVanishY + 126);
    depthHaze.addColorStop(0.00, 'rgba(156,214,166,0)');
    depthHaze.addColorStop(0.52, 'rgba(142,204,150,0.055)');
    depthHaze.addColorStop(1.00, 'rgba(112,184,126,0)');

    // v4.9 — local atmospheric focus around the road-to-castle join. A
    // radial veil is less likely to read as a horizontal fog band than
    // another full-width gradient, while still softening the landmark edge.
    const landmarkHaze = ctx.createRadialGradient(
      p.roadVanishX, p.roadVanishY + 22, 8,
      p.roadVanishX, p.roadVanishY + 22, 190,
    );
    landmarkHaze.addColorStop(0.00, 'rgba(218,242,202,0.18)');
    landmarkHaze.addColorStop(0.46, 'rgba(184,224,184,0.075)');
    landmarkHaze.addColorStop(1.00, 'rgba(150,206,164,0)');

    const roadJoin = ctx.createLinearGradient(0, p.roadVanishY - 4, 0, p.roadVanishY + 78);
    roadJoin.addColorStop(0, 'rgba(198,236,146,0.12)');
    roadJoin.addColorStop(1, 'rgba(108,178,78,0.46)');

    const groundStartY = p.roadVanishY + 62;
    const ground = ctx.createLinearGradient(0, groundStartY, 0, p.height);
    // v4.11 — reference-match P3: deeper, more saturated greens. The old
    // high-key lime (#83c34f / #96dc64) read as washed-out next to the
    // reference's rich field. Lowering value + raising saturation on the
    // light stops and deepening the dark stops widens tonal range so the
    // corridor reads as lush rather than pale.
    // v4.14 — reference-match: warm the field toward golden-hour and widen
    // the value range — yellower far/mid stops + a deeper, richer near stop.
    ground.addColorStop(0, '#7cb83e');     // warmer, more yellow-green in the far field
    ground.addColorStop(0.38, '#519632');  // warmer mid
    ground.addColorStop(1, '#205a23');     // a touch deeper/richer near field (still readable)

    const road = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    road.addColorStop(0, '#7ec64c');
    road.addColorStop(0.42, '#5dae3e');
    road.addColorStop(1, '#347d2b');

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

    // v4.9 — production road-overlay gradients. These depend only on the
    // projection geometry, so cache them here instead of allocating three
    // CanvasGradient objects on every rendered frame.
    const roadDividerStrong = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadDividerStrong.addColorStop(0,    'rgba(235,230,175,0.22)');
    roadDividerStrong.addColorStop(0.45, 'rgba(238,232,178,0.62)');
    roadDividerStrong.addColorStop(1,    'rgba(245,238,185,0.92)');

    const roadEdgeStrong = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadEdgeStrong.addColorStop(0, 'rgba(245,238,190,0.55)');
    roadEdgeStrong.addColorStop(1, 'rgba(248,240,192,0.92)');

    // v4.11 — reference-match P4: stronger perspective "rungs" so the road
    // reads as panelled like the reference instead of a smooth fill.
    const roadRungFade = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadRungFade.addColorStop(0, 'rgba(238,232,180,0.16)');
    roadRungFade.addColorStop(1, 'rgba(245,238,185,0.40)');

    this.gradients = {
      sky,
      skyDepth,
      horizonVeil,
      sceneryHaze,
      sceneryHazeY0,
      sceneryHazeY1,
      depthHaze,
      landmarkHaze,
      roadJoin,
      ground,
      road,
      roadEdge,
      foregroundSide: foregroundLeft,
      burstVignette,
      splitVignette,
      dividerFade,
      roadDividerStrong,
      roadEdgeStrong,
      roadRungFade,
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
