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
    // M156 sky tune: shift hue from teal-blue (H213) toward violet-blue
    // (~H195) by warming the crown stops and pulling the mid-sky away from
    // cyan. Horizon kept warm-cream. This brings measured sky H closer to
    // the reference H192-200 target without touching the asset sky path.
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0.00, '#0a1e7a');   // M156: warmer indigo crown (was #082684)
    sky.addColorStop(0.12, '#0e32a8');   // M156: violet-blue (was #0c3fa2)
    sky.addColorStop(0.24, '#1448c0');   // M156: slightly warmer (was #1259c4)
    sky.addColorStop(0.40, '#2268cc');   // M156: pull cyan out, warmer blue
    sky.addColorStop(0.55, '#4090dc');   // M156: less cyan mid-sky
    sky.addColorStop(0.70, '#72b4e8');   // M156: warmer near-horizon
    sky.addColorStop(0.84, '#a8cee0');   // M156: slightly warmer haze
    sky.addColorStop(0.94, '#d0d8d8');   // M156: neutral horizon blend
    sky.addColorStop(1.00, '#ddd8b8');   // M156: warm amber horizon kept

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
    // treeline + structures back toward the reference.
    // M156: shift haze stops from teal-cyan toward a warmer pale tone so the
    // atmospheric veil does not drag the mid-band hue toward H180+ teal.
    const horizonVeil = ctx.createLinearGradient(0, p.horizonY - 54, 0, p.roadVanishY + 132);
    horizonVeil.addColorStop(0.00, 'rgba(220,230,210,0)');
    horizonVeil.addColorStop(0.34, 'rgba(218,228,200,0.055)');
    horizonVeil.addColorStop(0.58, 'rgba(200,220,180,0.12)');
    horizonVeil.addColorStop(0.80, 'rgba(180,210,160,0.05)');
    horizonVeil.addColorStop(1.00, 'rgba(160,200,140,0)');

    // v4.21 — M7B dynamic-scenery depth haze. SceneryRenderer draws this band
    // AFTER the scenery sprites (before gameplay/player), so far/mid scenery
    // recedes while the near foreground (below the band) and all gameplay /
    // player / effects (drawn later) stay crisp. Stops carry the RELATIVE alpha
    // shape (0→peak→0); SceneryRenderer scales the whole band by
    // visual.depth.sceneryHaze.alpha via globalAlpha. Geometry-only → cached
    // here, rebuilt on resize with the other gradients.
    // M156: shift stop colors from teal (rgba(214,230,226)) toward a warmer
    // yellow-green atmosphere so this haze doesn't bias mid-band toward H188+.
    const sceneryHazeY0 = p.roadVanishY - 90;
    const sceneryHazeY1 = p.roadVanishY + (p.groundY - p.roadVanishY) * 0.5;
    const sceneryHaze = ctx.createLinearGradient(0, sceneryHazeY0, 0, sceneryHazeY1);
    sceneryHaze.addColorStop(0.00, 'rgba(210,228,190,0)');
    sceneryHaze.addColorStop(0.32, 'rgba(210,228,190,1)');
    sceneryHaze.addColorStop(0.66, 'rgba(200,220,175,0.45)');
    sceneryHaze.addColorStop(1.00, 'rgba(190,215,160,0)');

    // A very small ground join keeps the road tip from looking pasted on.
    // It is intentionally separate from atmospheric haze and stays below
    // the mountain silhouettes.
    // M156: warmer yellow-green stops (was teal-leaning rgba(156,214,166))
    const depthHaze = ctx.createLinearGradient(0, p.roadVanishY + 42, 0, p.roadVanishY + 126);
    depthHaze.addColorStop(0.00, 'rgba(168,210,120,0)');
    depthHaze.addColorStop(0.52, 'rgba(154,200,108,0.055)');
    depthHaze.addColorStop(1.00, 'rgba(126,180,90,0)');

    // v4.9 — local atmospheric focus around the road-to-castle join. A
    // radial veil is less likely to read as a horizontal fog band than
    // another full-width gradient, while still softening the landmark edge.
    // M156: shift stops toward warm yellow-green (was teal-leaning greens)
    const landmarkHaze = ctx.createRadialGradient(
      p.roadVanishX, p.roadVanishY + 22, 8,
      p.roadVanishX, p.roadVanishY + 22, 190,
    );
    landmarkHaze.addColorStop(0.00, 'rgba(224,242,180,0.16)');
    landmarkHaze.addColorStop(0.46, 'rgba(192,224,148,0.070)');
    landmarkHaze.addColorStop(1.00, 'rgba(160,200,100,0)');

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
    // v4.27 — M15B reference juice: deepen + saturate the meadow toward the
    // reference's rich verdant grass. The far/mid stops were a washed-out
    // yellow-lime; pull them to a richer green and nudge the near a touch
    // deeper, WITHOUT collapsing the far→near value range (atmospheric depth
    // preserved). Deeper green also lifts gold-orchid contrast on the road.
    // M156: shift all ground stops toward warmer yellow-green (H85-100
    // range) by adding more red channel and reducing blue.
    // M157: darken far/mid stops (V.80/.67 → V.62/.52) so the measured
    // mid-band value drops toward the reference target V.41-.52. The near
    // stops already sit in range (V.42/.29) so they are left unchanged.
    ground.addColorStop(0,    '#759f2f');  // M157: darker far field H82 V.62 (was V.80)
    ground.addColorStop(0.30, '#53851f');  // M157: darker mid-field H90 V.52 (was V.67)
    ground.addColorStop(0.68, '#4a8818');  // M157: keep near-mid H93 V.53
    ground.addColorStop(1,    '#326014');  // M157: keep near H96 V.38

    // M141 — push road toward saturated yellow-green so it stays distinctly
    // greener and slightly brighter than the surrounding field. Was '#7ec64c'
    // family which blended into field under the warm overlay.
    // M156: warm road stops toward H85-95 (reference road H93).
    // M157: darken road far/mid (V.83/.72 → V.68/.59) so road band value
    // stays in target V.42-.55 range after the global brightness grade.
    const road = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    road.addColorStop(0, '#82ae3d');    // M157: darker far road H83 V.68 (was V.83)
    road.addColorStop(0.42, '#62972c'); // M157: darker mid H90 V.59 (was V.72)
    road.addColorStop(1, '#3d711e');    // M157: darker near H98 V.44 (was V.54)

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
    // M22A — soften toward the reference grass path: lower the cream
    // lane-divider alpha (was 0.22 / 0.62 / 0.92) so lanes read as worn
    // guides rather than a sports-field grid, while staying legible.
    const roadDividerStrong = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadDividerStrong.addColorStop(0,    'rgba(235,230,175,0.14)');
    roadDividerStrong.addColorStop(0.45, 'rgba(238,232,178,0.42)');
    roadDividerStrong.addColorStop(1,    'rgba(245,238,185,0.66)');

    // M22A — soften the bold edge lines (was 0.55 / 0.92) so the road
    // boundary frames the path without the highway/sports-field read.
    const roadEdgeStrong = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadEdgeStrong.addColorStop(0, 'rgba(245,238,190,0.38)');
    roadEdgeStrong.addColorStop(1, 'rgba(248,240,192,0.64)');

    // v4.11 — reference-match P4: stronger perspective "rungs" so the road
    // reads as panelled like the reference instead of a smooth fill.
    // M22A — calm the panel "rungs" (was 0.16 / 0.40 → 0.10 / 0.24 → 0.06 /
    // 0.15) so the road stops reading as a ruled grid/ladder.
    // M23A — the 0.06 / 0.15 over-softened it: the road lost its forward-depth
    // panelling and read as a flat runway. Restore PARTWAY (0.10 / 0.24, the
    // earlier intermediate) so the rungs give a soft sense of receding ground
    // again — still well under the old 0.16 / 0.40 grid, so no sports-field
    // read returns. Lane dividers + edge lines stay at their soft M22A alphas.
    const roadRungFade = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    roadRungFade.addColorStop(0, 'rgba(238,232,180,0.10)');
    roadRungFade.addColorStop(1, 'rgba(245,238,185,0.24)');

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
