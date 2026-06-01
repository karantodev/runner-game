import { roadBaseHalfWidth, roadTopHalfWidth } from '../helpers.js';

/**
 * Painted ground + perspective road. The "road" no longer has its own
 * trapezoid fill — the player runs on the same grass as the surrounding
 * landscape, with two continuous cream-colored lane dividers defining
 * the playable lanes (reference: classic pixel-art runner).
 *
 * Static elements (ground gradient, side highlights) are baked once into
 * an offscreen layer and blitted with a single drawImage per frame.
 * Dynamic elements per frame:
 *   - scroll-driven perspective grass-row bands (motion feel, subtle)
 *   - lane dividers (cream solid lines, fade with distance via cached gradient)
 *   - shoulders (scrolling grass tiles at the road edge)
 */
export class RoadRenderer {
  constructor({ ctx, projection, assets, gradients, pixelRatio = 1, roadStyle = 'kit' }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.gradients = gradients;
    this.pixelRatio = pixelRatio;
    /** Either 'procedural' (fillRect tiles) or 'tiles' (SVG image tiles). */
    this.roadStyle = roadStyle;
    this._staticLayer = this.#buildStaticLayer();
    // Deterministic pseudo-random patterns for the procedural texture
    // passes — built once, scrolled per frame via scrollOffset modulo.
    // Loop length 420 (= maxDistance) means the pattern repeats every
    // ~8 seconds at base speed — long enough to not read as obvious.
    this._noisePoints = buildNoisePattern(120, 0x9e3779b9);
    this._fringePoints = buildFringePattern(72, 0x85ebca6b);
  }

  render(world) {
    // Single blit replaces ~50 ground / trapezoid / edge ops per frame.
    // Source canvas is dpr-scaled; we draw it into the LOGICAL dimensions
    // since our parent ctx transform already applies dpr.
    this.ctx.drawImage(this._staticLayer, 0, 0, this.projection.width, this.projection.height);
    const scroll = world.scrollOffset;
    // v4.4 — reference-match: draw the base surface per mode, THEN apply the
    // shared perspective-grid overlay in EVERY mode. Previously kit mode
    // returned early and skipped the converging edge/lane/shoulder cues, so
    // the road read as a flat green strip.
    if (this.roadStyle === 'kit') {
      this.#imageKitGrid(scroll);
    } else if (this.roadStyle === 'tiles') {
      this.#imageTileGrid(scroll);
    } else {
      this.#roadBands(scroll);
      this.#grassNoise(scroll);
      this.#roadShoulders(scroll);
      this.#shoulderFringe(scroll);
    }
    this.#perspectiveGridOverlay(scroll);
  }

  /**
   * v4.4 — reference-match: perspective grid in all modes. Shared overlay
   * drawn on TOP of whatever base surface each mode produced — completes the
   * "green floor receding to a vanishing point" read with shoulder darkening,
   * horizontal rungs, lane dividers, and bold converging edge lines.
   * Rungs go UNDER the lines so the cream lines stay crisp on top.
   */
  #perspectiveGridOverlay(scrollOffset) {
    this.#shoulderStrips();
    this.#roadRungs(scrollOffset);
    this.#laneDividers(scrollOffset);
    this.#roadEdgeLines(scrollOffset);
  }

  /**
   * Bake the ground gradient to an offscreen canvas. Sized to logical*dpr
   * so blit-back stays crisp on Hi-DPI. Caller invalidates via
   * rebuildStaticLayer() if the projection changes.
   */
  #buildStaticLayer() {
    const p = this.projection;
    const dpr = this.pixelRatio;
    const layer = document.createElement('canvas');
    layer.width = p.width * dpr;
    layer.height = p.height * dpr;
    const c = layer.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.#paintGround(c);
    this.#paintPathFill(c);
    return layer;
  }

  rebuildStaticLayer() {
    this._staticLayer = this.#buildStaticLayer();
  }

  // ── Static elements (baked into the offscreen layer) ────────────────────────

  #paintGround(ctx) {
    const { width, height } = this.projection;
    const startY = this.gradients.gradients.groundStartY;

    ctx.fillStyle = this.gradients.gradients.ground;
    ctx.fillRect(0, startY, width, height - startY);

    // Soft darker rolling shapes on either side of the road give the
    // landscape a touch of depth at the horizon — purely decorative.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#317a35';
    ctx.beginPath();
    ctx.moveTo(0, startY + 56);
    ctx.quadraticCurveTo(width * 0.24, startY + 8, width * 0.46, startY + 52);
    ctx.lineTo(width * 0.40, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width, startY + 56);
    ctx.quadraticCurveTo(width * 0.76, startY + 8, width * 0.54, startY + 52);
    ctx.lineTo(width * 0.60, height);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Subtle path fill baked into the static layer. Distinguishes the road
   * trapezoid from the surrounding meadow at LOW contrast — not a
   * highway-style block, just enough that the eye reads "the path goes
   * THIS way". Tile-checker + noise + shoulder strips layer on top.
   */
  #paintPathFill(ctx) {
    const p = this.projection;
    const vpX = p.width / 2;
    const vpY = p.roadVanishY;
    const baseHalf = roadBaseHalfWidth(p);
    const topHalf = roadTopHalfWidth(p);

    // Bumped toward the target reference's more saturated kelly-green
    // path color. Previous tone was too desaturated — the path blended
    // into the meadow even with all the tile passes on top.
    // v4.4 — reference-match: nudge stops brighter/more saturated so the
    // road tone differs from the meadow even under sparse tiles.
    const pathFill = ctx.createLinearGradient(0, vpY, 0, p.groundY);
    pathFill.addColorStop(0, 'rgba(150,214,96,0.36)');
    pathFill.addColorStop(1, 'rgba(120,196,74,0.72)');
    ctx.fillStyle = pathFill;
    ctx.beginPath();
    ctx.moveTo(vpX - topHalf, vpY);
    ctx.lineTo(vpX + topHalf, vpY);
    ctx.lineTo(vpX + baseHalf, p.groundY);
    ctx.lineTo(vpX - baseHalf, p.groundY);
    ctx.closePath();
    ctx.fill();
  }

  // ── Dynamic elements (per-frame, scrolling) ─────────────────────────────────

  /**
   * Perspective tile-grid built from **world-aligned** tiles (NOT screen
   * bands). Each tile has a stable variant derived from its world (row,
   * column) coords — so as the road scrolls, individual tiles flow
   * smoothly toward the camera without flickering through variants.
   *
   * The previous screen-band approach computed variant from a
   * scroll-driven `rowVariant` that cycled 0→1→2 every ~2 world-units —
   * producing the visible 30Hz "ripple". This version is spatially
   * coherent: a tile that's "light" stays light its whole life.
   *
   * Tiles are 6 world-units deep × 0.2 lane-units wide ≈ square at
   * gameplay scale. Only the first ~80 world-units are drawn (foreground
   * emphasis); beyond that the baked path-fill carries the color alone.
   */
  #roadBands(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    const ROAD_HALF = p.roadHalfLaneUnits;
    // v3.8.9 Tier-4 — finer tile grid for the "pixel-art garden path" feel.
    //   TILE_DEPTH 5 → 3 (40% shorter depth strips)
    //   TILE_LANE_W 0.18 → 0.11 (39% narrower lateral cells)
    //   MAX_ROWS 20 → 32 (covers same depth at smaller tile size)
    // Net: ~2.6× more tiles in the same road area — surface reads as
    // mottled pixel texture rather than a low-res checker.
    const TILE_DEPTH = 3;
    const TILE_LANE_W = 0.11;
    const FAR_VISIBLE = 84;
    const MAX_ROWS = 32;
    const NUM_LATERAL = Math.ceil(ROAD_HALF / TILE_LANE_W);

    const off = ((scrollOffset % TILE_DEPTH) + TILE_DEPTH) % TILE_DEPTH;
    // World-row offset — stays stable per world-distance so a tile keeps
    // its (row, col) identity across frames.
    const rowOffset = Math.floor(scrollOffset / TILE_DEPTH);

    for (let dIdx = 0; dIdx < MAX_ROWS; dIdx += 1) {
      const dNear = dIdx * TILE_DEPTH - off;
      const dFar  = dNear + TILE_DEPTH;
      if (dFar <= 0) continue;
      if (dNear > FAR_VISIBLE) break;

      const dN = Math.max(0, dNear);
      // Depth fade — full at the camera, vanishes by FAR_VISIBLE so the
      // tile grid emphasises the foreground (reference behaviour).
      const fadeT = 1 - Math.min(1, dN / FAR_VISIBLE);
      if (fadeT <= 0.02) continue;
      const worldRow = rowOffset + dIdx;
      // v4.1 — P1 reference-match: compress checker luminance range so the
      // road surface reads as a cohesive green track rather than a loud
      // chessboard. Geometry/tile sizing/perspective math untouched.
      //
      // Before:
      //   lightAlpha  = 0.080 + 0.160*t  (peak 0.240, color #C4F280 bright lime)
      //   mediumAlpha = 0.055 + 0.115*t  (peak 0.170, color #7EC258 mid-green)
      //   darkAlpha   = 0.120 + 0.210*t  (peak 0.330, color #26622A deep dark)
      // → peak contrast ratio (light vs dark color×alpha): ~3×, reads checkerboard.
      //
      // After:
      //   lightAlpha  = 0.060 + 0.100*t  (peak 0.160, same hue — dimmer)
      //   mediumAlpha = 0.050 + 0.095*t  (peak 0.145, unchanged hue)
      //   darkAlpha   = 0.055 + 0.095*t  (peak 0.150, hue shifted #4A8C4E
      //                                   — lighter/more-saturated mid-green)
      // → peak contrast ratio: ~1.3×, reads as mottled texture not a grid.
      const lightAlpha = 0.060 + 0.100 * fadeT;
      const mediumAlpha = 0.050 + 0.095 * fadeT;
      const darkAlpha   = 0.055 + 0.095 * fadeT;
      const lightFill  = `rgba(196,242,128,${lightAlpha})`;
      const mediumFill = `rgba(126,194,88,${mediumAlpha})`;
      const darkFill   = `rgba(74,140,78,${darkAlpha})`;

      for (let cIdx = -NUM_LATERAL; cIdx < NUM_LATERAL; cIdx += 1) {
        let laneL = cIdx * TILE_LANE_W;
        let laneR = laneL + TILE_LANE_W;
        if (laneR <= -ROAD_HALF) continue;
        if (laneL >=  ROAD_HALF) continue;
        // Clip to the road extent so outer tiles don't bleed into the meadow.
        if (laneL < -ROAD_HALF) laneL = -ROAD_HALF;
        if (laneR >  ROAD_HALF) laneR =  ROAD_HALF;

        // v3.8.10 — broke the 3-bucket variant into a 7-bucket
        // distribution to defeat the visible "checker" reading. Now:
        //   buckets 0-2 (43%) → light
        //   buckets 3-5 (43%) → medium
        //   bucket 6   (14%) → dark
        // Dark variant is now rare (was ~33%) so the road reads as
        // mottled-grass, not a chessboard with dark squares.
        const hash = (((worldRow * 17) ^ (cIdx * 31) ^ (worldRow + cIdx) * 7) & 0xFF) % 7;
        ctx.fillStyle = hash < 3 ? lightFill
                       : hash < 6 ? mediumFill
                       : darkFill;
        const nl = p.projectVisual(laneL, dN);
        const nr = p.projectVisual(laneR, dN);
        const fr = p.projectVisual(laneR, dFar);
        const fl = p.projectVisual(laneL, dFar);
        // v3.8.13 flicker fix — pixel-snap the trapezoid vertices.
        // Sub-pixel projected coords (sx, sy float) caused Canvas2D
        // antialiasing to render different fractional coverage at the
        // tile edges between frames, producing the "shimmer / highlight
        // flicker" the user reported. Rounding to int snaps adjacent
        // tiles to the same pixel grid so seams stay solid.
        ctx.beginPath();
        ctx.moveTo(Math.round(nl.sx), Math.round(nl.sy));
        ctx.lineTo(Math.round(nr.sx) + 1, Math.round(nr.sy));
        ctx.lineTo(Math.round(fr.sx) + 1, Math.round(fr.sy) - 1);
        ctx.lineTo(Math.round(fl.sx), Math.round(fl.sy) - 1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  #roadShoulders(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    const laneOuter = p.roadHalfLaneUnits + 0.04;
    const shoulderOuter = p.roadHalfLaneUnits + 0.42;
    const far = 780;
    const period = 7;
    const offset = scrollOffset % period;

    for (const side of [-1, 1]) {
      const shoulderKey = side < 0 ? 'roadShoulderLeftGrass' : 'roadShoulderRightGrass';
      for (let dStart = -offset; dStart < far; dStart += period) {
        const dEnd = dStart + period * 0.64;
        const near = p.projectVisual(side * shoulderOuter, Math.max(0, dStart));
        const farP = p.projectVisual(side * shoulderOuter, dEnd);
        const innerNear = p.projectVisual(side * laneOuter, Math.max(0, dStart));
        const innerFar = p.projectVisual(side * laneOuter, dEnd);
        const alpha = 0.14 + 0.32 * near.scale;
        const drewShoulder = this.#drawQuadSprite(
          shoulderKey,
          innerNear.sx, innerNear.sy,
          near.sx, near.sy,
          farP.sx, farP.sy,
          innerFar.sx, innerFar.sy,
          Math.min(0.82, alpha + 0.10),
        );
        if (!drewShoulder) {
          // v3.8.13 — pixel-snap shoulder strip vertices.
          ctx.fillStyle = `rgba(206,235,92,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(Math.round(innerNear.sx), Math.round(innerNear.sy));
          ctx.lineTo(Math.round(near.sx),      Math.round(near.sy));
          ctx.lineTo(Math.round(farP.sx),      Math.round(farP.sy));
          ctx.lineTo(Math.round(innerFar.sx),  Math.round(innerFar.sy));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  /**
   * Two continuous cream-colored lane dividers between the three lanes.
   * Each one is a perspective-correct trapezoidal strip — wider near the
   * camera, tapering toward the vanishing horizon — filled with a cached
   * vertical gradient that fades the divider out into the distance.
   *
   * Replaces the old yellow dashed pattern which (a) didn't match the
   * pixel-art reference and (b) cost ~30+ trapezoidal fills per frame.
   */
  /**
   * Dashed pixel-segment lane guides between the 3 playable lanes —
   * NOT continuous highway lines. Each dash is a small perspective-
   * correct trapezoid filled with the cached yellow-green `dividerFade`
   * gradient (so alpha auto-fades toward the castle).
   *
   * The dashes scroll with the road so they read as worn grass markers,
   * not as a fixed striped pattern.
   */
  #laneDividers(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    // v4.1 — P1 reference-match: override the cached dividerFade with a
    // locally-built gradient that has stronger alphas so the cream lines
    // hold at mid-depth and read clearly as lane separators.
    // Before: stop(0)=0.08, stop(0.45)=0.40, stop(1)=0.80 → lines fade
    // out before mid-distance. After: 0.22 / 0.62 / 0.92 — ~2.75× brighter
    // at the far end while still receding into the horizon.
    const strongDividerFade = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    strongDividerFade.addColorStop(0,    'rgba(235,230,175,0.22)');
    strongDividerFade.addColorStop(0.45, 'rgba(238,232,178,0.62)');
    strongDividerFade.addColorStop(1,    'rgba(245,238,185,0.92)');

    // v4.1 — P1 reference-match: widthPx 3.0 → 4.5 — slightly heavier
    // stroke so the dividers are legible at a glance without becoming
    // highway-thick. Far-floor 0.18 → 0.28 keeps a visible pixel even
    // at the furthest rendered dashes.
    const widthPx = 4.5;
    const segLen = 1.2;
    const segGap = 0.9;
    const period = segLen + segGap;
    // v4.1 — P1 reference-match: maxVisibleDistance 120 → 160 so dashes
    // persist well into the middle of the road (toward the castle).
    const maxVisibleDistance = 160;
    const off = ((scrollOffset % period) + period) % period;

    ctx.save();
    ctx.fillStyle = strongDividerFade;
    for (const laneLine of [-0.5, 0.5]) {
      for (let dStart = -off; dStart < maxVisibleDistance; dStart += period) {
        const start = Math.max(0, dStart);
        const end = dStart + segLen;
        if (end <= 0) continue;
        const near = p.projectVisual(laneLine, start);
        const farP = p.projectVisual(laneLine, end);
        const wNear = Math.max(1.0, widthPx * near.scale);
        const wFar  = Math.max(0.28, widthPx * farP.scale);
        // v3.8.13 — pixel-snap dash vertices so the divider doesn't
        // shimmer between frames as scroll advances.
        const farLx  = Math.round(farP.sx - wFar / 2);
        const farRx  = Math.round(farP.sx + wFar / 2);
        const nearLx = Math.round(near.sx - wNear / 2);
        const nearRx = Math.round(near.sx + wNear / 2);
        const farY   = Math.round(farP.sy);
        const nearY  = Math.round(near.sy);
        ctx.beginPath();
        ctx.moveTo(farLx,  farY);
        ctx.lineTo(farRx,  farY);
        ctx.lineTo(nearRx, nearY);
        ctx.lineTo(nearLx, nearY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * v4.2 — P2 reference-match: bold cream perspective edge lines at the
   * playable road boundary (lane ±1.5), converging toward the castle vanish
   * point. Each line is a continuous (not dashed) trapezoidal strip — wide
   * near the camera (~8–12 px) tapering to ~2 px at the horizon — filled
   * with a vertical cream gradient bolder than the inner lane dividers.
   * Pixel-snapped to avoid shimmer (same rounding style as #laneDividers).
   * Only runs in procedural mode — tiles/kit modes have their own edge art.
   */
  #roadEdgeLines(scrollOffset) {
    const ctx = this.ctx;
    const p   = this.projection;

    // v4.2 — P2 reference-match: bolder gradient than inner dividers.
    // stop(0) near-transparent at the vanish horizon, stop(1) near-opaque
    // cream at the camera ground so the lines converge visually like the
    // reference photo.
    const edgeGrad = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    // v4.3 — P3 reference-match: raised far-end alpha 0.30 → 0.55 so the
    // cream edge lines hold through mid-distance and read as a clear frame,
    // not a ghost tint that vanishes before reaching the castle.
    edgeGrad.addColorStop(0, 'rgba(245,238,190,0.55)');
    edgeGrad.addColorStop(1, 'rgba(248,240,192,0.92)');

    // v4.2 — P2 reference-match: edge line half-width in screen px at a
    // given projection scale. Near camera scale≈1 → ~5 px either side of
    // the lane centre = 10 px total strip; at the far horizon scale≈0.10
    // → ~1 px either side = 2 px total. Clamped so far lines keep 1 px.
    // v4.3 — P3 reference-match: widened near strip 10 → 14 px so both
    // cream borders are immediately legible as bold framing lines rather
    // than thin accents — still scale-tapers toward the vanish point.
    const widthPx     = 14;
    const farFloorPx  = 1.0;
    const maxDistance = 120;

    ctx.save();
    ctx.fillStyle = edgeGrad;

    for (const laneLine of [-1.5, 1.5]) {
      const near = p.projectVisual(laneLine, 0);
      const far  = p.projectVisual(laneLine, maxDistance);

      const wNear = Math.max(farFloorPx, widthPx * near.scale);
      const wFar  = Math.max(farFloorPx, widthPx * far.scale);

      // Pixel-snap vertices — same style as #laneDividers to avoid shimmer.
      const nearLx = Math.round(near.sx - wNear / 2);
      const nearRx = Math.round(near.sx + wNear / 2);
      const farLx  = Math.round(far.sx  - wFar  / 2);
      const farRx  = Math.round(far.sx  + wFar  / 2);
      const nearY  = Math.round(near.sy);
      const farY   = Math.round(far.sy);

      ctx.beginPath();
      ctx.moveTo(farLx,  farY);
      ctx.lineTo(farRx,  farY);
      ctx.lineTo(nearRx, nearY);
      ctx.lineTo(nearLx, nearY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * v4.4 — reference-match: perspective grid in all modes. Subtle horizontal
   * "rung" lines crossing the playable road (lane -1.5 → +1.5) at regular
   * world-depth intervals, scrolling toward the camera like the lane dashes.
   * Completes the grid read as a SECONDARY cue — markedly fainter than the
   * cream edge/lane lines (peak ~0.22 near, ~0.08 far). Pixel-snapped vertices
   * (same rounding style as #laneDividers) keep rungs from shimmering on scroll.
   */
  #roadRungs(scrollOffset) {
    const ctx = this.ctx;
    const p   = this.projection;

    // Faint cream that fades toward the horizon — same vertical-gradient
    // idiom as #laneDividers / #roadEdgeLines, but lower alphas so rungs
    // stay a background cue beneath the bold lines.
    const rungFade = ctx.createLinearGradient(0, p.roadVanishY, 0, p.groundY);
    rungFade.addColorStop(0, 'rgba(238,232,180,0.08)');
    rungFade.addColorStop(1, 'rgba(245,238,185,0.22)');

    const period       = 5;
    const maxDistance  = 120;
    const thicknessPx  = 1.5;
    const off = ((scrollOffset % period) + period) % period;

    ctx.save();
    ctx.fillStyle = rungFade;
    for (let d = -off; d < maxDistance; d += period) {
      if (d <= 0) continue;
      const left  = p.projectVisual(-1.5, d);
      const right = p.projectVisual( 1.5, d);
      // Skip horizon rungs too small to read — avoids clutter / overdraw.
      if (left.scale < 0.05) continue;
      const halfH = Math.max(0.5, (thicknessPx * left.scale) / 2);
      // Pixel-snap every vertex so the rung doesn't shimmer between frames.
      const lx   = Math.round(left.sx);
      const rx   = Math.round(right.sx);
      const yTop = Math.round(left.sy - halfH);
      const yBot = Math.round(left.sy + halfH);
      ctx.beginPath();
      ctx.moveTo(lx, yTop);
      ctx.lineTo(rx, yTop);
      ctx.lineTo(rx, yBot);
      ctx.lineTo(lx, yBot);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Image-tile mode using the designer's 7 pixel-art PNGs (128×128) —
   * world-aligned tiles drawn via drawImage. Replaces the procedural
   * fillRect checker with hand-crafted grass texture.
   *
   * Tile selection logic per (worldRow, cIdx):
   *   - midLane in shoulder strip (|midLane| > PLAYABLE_HALF) → edge tile
   *   - midLane crosses a lane divider (±0.5) → path-divider tile
   *   - rare deterministic accent → flowers tile (~5% of playable cells)
   *   - otherwise → base v1/v2/v3 cycled by (worldRow + cIdx) % 3
   *
   * No clip path — earlier clip+drawImage combo dropped FPS to ~27.
   * Tile bounds + the shoulder-strip overlay contain visible texture.
   */
  #imageTileGrid(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    const baseV1 = this.assets.get('grassTileBaseV1');
    if (!baseV1?.naturalWidth) {
      // Designer tiles not loaded — fall back to procedural so the road
      // doesn't disappear if the PNG fetch ever fails in production.
      this.#roadBands(scrollOffset);
      return;
    }
    const baseV2     = this.assets.get('grassTileBaseV2') ?? baseV1;
    const baseV3     = this.assets.get('grassTileBaseV3') ?? baseV1;
    const edgeLeft   = this.assets.get('grassTileEdgeLeft') ?? baseV1;
    const edgeRight  = this.assets.get('grassTileEdgeRight') ?? baseV1;
    const divider    = this.assets.get('grassTilePathDivider') ?? baseV1;
    const flowers    = this.assets.get('grassTileFlowers') ?? baseV1;
    const baseTiles = [baseV1, baseV2, baseV3];

    const ROAD_HALF = p.roadHalfLaneUnits;
    const PLAYABLE_HALF = 1.50;
    const TILE_DEPTH = 6;
    // Wider — was 0.35 (75 px at near, squashing the 128-px PNG by
    // ~40%). 0.55 → ~118 px at near, near-native size so the PNG's
    // hand-crafted grass detail isn't compressed away.
    const TILE_LANE_W = 0.55;
    // Extended dramatically — earlier 84 cut tiles off in the foreground
    // only, so the road past mid-distance looked like a flat green
    // panel and the perspective convergence wasn't readable. 220 covers
    // the whole visible road; the skip-if-too-small check below culls
    // micro-tiles at the horizon to keep overdraw bounded.
    const FAR_VISIBLE = 220;
    const MAX_ROWS = 38;
    const NUM_LATERAL = Math.ceil(ROAD_HALF / TILE_LANE_W) + 1;
    const DIVIDER_LANE = 0.5;
    const DIVIDER_HALF_TOL = TILE_LANE_W * 0.5;

    const off = ((scrollOffset % TILE_DEPTH) + TILE_DEPTH) % TILE_DEPTH;
    const rowOffset = Math.floor(scrollOffset / TILE_DEPTH);

    ctx.save();
    for (let dIdx = 0; dIdx < MAX_ROWS; dIdx += 1) {
      const dNear = dIdx * TILE_DEPTH - off;
      const dFar  = dNear + TILE_DEPTH;
      if (dFar <= 0) continue;
      if (dNear > FAR_VISIBLE) break;

      const dN = Math.max(0, dNear);
      const fadeT = 1 - Math.min(1, dN / FAR_VISIBLE);
      if (fadeT <= 0.04) continue;
      // Bumped — designer PNGs were ~30% transparent on the back rows,
      // which read as a smooth green wash. Now near-camera tiles draw
      // at near-full opacity so the hand-crafted pixel grass + flowers
      // + edge shading actually read.
      ctx.globalAlpha = 0.78 + 0.22 * fadeT;
      const worldRow = rowOffset + dIdx;

      for (let cIdx = -NUM_LATERAL; cIdx < NUM_LATERAL; cIdx += 1) {
        const laneL = cIdx * TILE_LANE_W;
        const laneR = laneL + TILE_LANE_W;
        if (laneR <= -ROAD_HALF) continue;
        if (laneL >=  ROAD_HALF) continue;
        const midLane = (laneL + laneR) * 0.5;

        // Pick tile variant.
        let tile;
        if (midLane < -PLAYABLE_HALF) {
          tile = edgeLeft;
        } else if (midLane > PLAYABLE_HALF) {
          tile = edgeRight;
        } else if (Math.abs(Math.abs(midLane) - DIVIDER_LANE) < DIVIDER_HALF_TOL) {
          tile = divider;
        } else {
          // Deterministic accent: ~6% of playable cells become flower tile.
          const accent = ((worldRow * 31 + cIdx * 17) & 0x1F) === 0;
          if (accent) tile = flowers;
          // Hash variant — no diagonal correlation.
          else tile = baseTiles[(((worldRow * 7) ^ (cIdx * 13)) % 3 + 3) % 3];
        }

        // Clip lane bounds to road extent — outer tiles get a sliver of
        // the road only, but drawImage stretches the tile to fit that
        // sliver so the edge tile's dark side stays at the outer edge.
        const clampL = laneL < -ROAD_HALF ? -ROAD_HALF : laneL;
        const clampR = laneR >  ROAD_HALF ?  ROAD_HALF : laneR;

        const nL = p.projectVisual(clampL, dN);
        const nR = p.projectVisual(clampR, dN);
        const fL = p.projectVisual(clampL, dFar);
        const fR = p.projectVisual(clampR, dFar);
        // Round to integer pixels so adjacent tiles share exact edges
        // (no hairline gaps OR double-rendered seams from subpixel
        // bias). Each tile slightly OVERLAPS its neighbour by 1px on
        // the right/bottom so anti-aliasing can't carve gaps either.
        const xMin = Math.floor(Math.min(nL.sx, fL.sx));
        const xMax = Math.ceil(Math.max(nR.sx, fR.sx)) + 1;
        const yTop = Math.floor(Math.min(fL.sy, fR.sy));
        const yBot = Math.ceil(Math.max(nL.sy, nR.sy)) + 1;
        const w = xMax - xMin;
        const h = yBot - yTop;
        // Skip horizon tiles smaller than ~1 px — invisible result, but
        // each costs a drawImage call (NUM_LATERAL * deep-rows = many).
        if (w <= 1.5 || h <= 1.0) continue;

        ctx.drawImage(tile, xMin, yTop, w, h);

        // Dark seam at bottom + right edge — adjacent tiles share these
        // edges, so the combined seam reads as a tile-grid boundary
        // (the PNGs themselves don't have visible borders). Only at
        // close-to-mid distance; far tiles skip to keep horizon clean.
        if (fadeT > 0.35 && w > 4 && h > 3) {
          ctx.fillStyle = 'rgba(20,58,28,0.30)';
          ctx.fillRect(xMin, yBot - 1, w, 1);
          ctx.fillRect(xMax - 1, yTop, 1, h);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Road-kit mode — third option, uses the 18-tile hand-crafted set
   * organised by depth zone (foreground / mid / far). Each depth row
   * picks an appropriate (left, center, right) triplet PLUS a divider
   * tile between each lane pair, PLUS edge tiles at the road boundary.
   *
   * Depth zones (in world-units from camera):
   *   - 0…25  → foreground tiles (high detail)
   *   - 25…70 → mid tiles (medium detail)
   *   - 70…200 → far strip (single horizontal band, low detail)
   *
   * Falls back to `#roadBands` if the kit tiles aren't loaded yet — so
   * the visual doesn't break before the designer's PNGs arrive at the
   * expected paths in `assets/terrain/road/kit/`.
   */
  #imageKitGrid(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;

    // Check kit availability up-front — if the first foreground center
    // tile isn't loaded, fall back to procedural so the road stays
    // visible while the designer hands files in.
    const fgCenter = this.assets.get('roadKitForegroundCenter');
    if (!fgCenter?.naturalWidth) {
      this.#roadBands(scrollOffset);
      return;
    }

    // Cache all kit tiles once per frame. v2 spec — 14 tiles.
    const tiles = {
      fgLeft:           this.assets.get('roadKitForegroundLeft'),
      fgCenter:         fgCenter,
      fgRight:          this.assets.get('roadKitForegroundRight'),
      midLeft:          this.assets.get('roadKitMidLeft'),
      midCenter:        this.assets.get('roadKitMidCenter'),
      midRight:         this.assets.get('roadKitMidRight'),
      farStrip:         this.assets.get('roadKitFarStrip'),
      shoulderLeft:     this.assets.get('roadKitShoulderInnerLeft'),
      shoulderRight:    this.assets.get('roadKitShoulderInnerRight'),
      dividerLeft:      this.assets.get('roadKitLaneDividerLeftCenter'),
      dividerRight:     this.assets.get('roadKitLaneDividerCenterRight'),
      flowerPatch:      this.assets.get('roadKitEdgeFlowerPatch01'),
      grassPatch:       this.assets.get('roadKitEdgeGrassPatch01'),
      darkPatch:        this.assets.get('roadKitEdgeDarkPatch01'),
    };

    const ROAD_HALF = p.roadHalfLaneUnits;
    const TILE_DEPTH = 5;
    const FAR_VISIBLE = 200;
    const MAX_ROWS = 42;
    const FG_BOUND = 25;
    const MID_BOUND = 70;
    // Lane boundaries in lane-units (the 3 playable lanes sit at -1, 0, +1).
    const LANE_BOUNDS = [-1.5, -0.5, 0.5, 1.5];
    const SHOULDER_OUTER = ROAD_HALF;

    const off = ((scrollOffset % TILE_DEPTH) + TILE_DEPTH) % TILE_DEPTH;
    const rowOffset = Math.floor(scrollOffset / TILE_DEPTH);

    ctx.save();
    for (let dIdx = 0; dIdx < MAX_ROWS; dIdx += 1) {
      const dNear = dIdx * TILE_DEPTH - off;
      const dFar  = dNear + TILE_DEPTH;
      if (dFar <= 0) continue;
      if (dNear > FAR_VISIBLE) break;
      const dN = Math.max(0, dNear);
      const fadeT = 1 - Math.min(1, dN / FAR_VISIBLE);
      if (fadeT <= 0.04) continue;
      ctx.globalAlpha = 0.78 + 0.22 * fadeT;
      const worldRow = rowOffset + dIdx;

      // FAR ZONE — single horizontal strip across the road
      if (dN >= MID_BOUND) {
        if (tiles.farStrip?.naturalWidth) {
          const left = p.projectVisual(-ROAD_HALF, dN);
          const right = p.projectVisual( ROAD_HALF, dN);
          const farLeft = p.projectVisual(-ROAD_HALF, dFar);
          const xMin = Math.floor(Math.min(left.sx, farLeft.sx));
          const xMax = Math.ceil(right.sx) + 1;
          const yTop = Math.floor(p.projectVisual(0, dFar).sy);
          const yBot = Math.ceil(left.sy) + 1;
          if (xMax - xMin > 2 && yBot - yTop > 1) {
            ctx.drawImage(tiles.farStrip, xMin, yTop, xMax - xMin, yBot - yTop);
          }
        }
        continue;
      }

      // FG / MID ZONE — pick the triplet by depth
      const inFg = dN < FG_BOUND;
      const tileLeft   = inFg ? tiles.fgLeft   : (tiles.midLeft   ?? tiles.fgLeft);
      const tileCenter = inFg ? tiles.fgCenter : (tiles.midCenter ?? tiles.fgCenter);
      const tileRight  = inFg ? tiles.fgRight  : (tiles.midRight  ?? tiles.fgRight);

      // Three playable lane tiles (cover lane -1.5..+1.5)
      this.#drawKitCell(tileLeft,   -1.5,  -0.5, dN, dFar);
      this.#drawKitCell(tileCenter, -0.5,   0.5, dN, dFar);
      this.#drawKitCell(tileRight,   0.5,   1.5, dN, dFar);

      // Shoulder transition tiles (between playable edge and road outer)
      this.#drawKitCell(tiles.shoulderLeft,  -SHOULDER_OUTER, -1.5, dN, dFar);
      this.#drawKitCell(tiles.shoulderRight,  1.5,  SHOULDER_OUTER, dN, dFar);

      // Lane dividers — narrow vertical strips on top of lane edges
      const dividerHalfWidth = 0.06;
      this.#drawKitCell(tiles.dividerLeft,  -0.5 - dividerHalfWidth, -0.5 + dividerHalfWidth, dN, dFar);
      this.#drawKitCell(tiles.dividerRight,  0.5 - dividerHalfWidth,  0.5 + dividerHalfWidth, dN, dFar);

      // v3.8.8 Tier-3 — road patch density 22/256 → 36/256 (~14%) so the
      // near road never reads as a smooth empty surface. Flower/grass
      // weighted heavier than dark; dark patches scale by distance so
      // far road still reads light (avoids the "dark blanket" failure).
      const patchHash = (worldRow * 41) & 0xFF;
      if (patchHash < 14 && tiles.flowerPatch) {
        const side = (worldRow & 1) === 0 ? -1 : 1;
        this.#drawKitCell(tiles.flowerPatch, side * 1.66, side * 1.66 + side * 0.28, dN, dFar);
      } else if (patchHash < 28 && tiles.grassPatch) {
        const side = (worldRow & 2) === 0 ? -1 : 1;
        this.#drawKitCell(tiles.grassPatch, side * 1.62, side * 1.62 + side * 0.30, dN, dFar);
      } else if (patchHash < 36 && tiles.darkPatch) {
        const side = (worldRow & 1) === 0 ? 1 : -1;
        this.#drawKitCell(tiles.darkPatch, side * 1.64, side * 1.64 + side * 0.26, dN, dFar);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Helper: project a lane-range × depth-range world rectangle to its
   * perspective-correct screen rectangle and drawImage the tile into it.
   * Integer-rounded + 1px overlap to prevent hairline seams.
   */
  #drawKitCell(tile, laneL, laneR, dN, dFar) {
    if (!tile?.naturalWidth) return;
    const p = this.projection;
    const nL = p.projectVisual(laneL, dN);
    const nR = p.projectVisual(laneR, dN);
    const fL = p.projectVisual(laneL, dFar);
    const fR = p.projectVisual(laneR, dFar);
    const xMin = Math.floor(Math.min(nL.sx, fL.sx));
    const xMax = Math.ceil(Math.max(nR.sx, fR.sx)) + 1;
    const yTop = Math.floor(Math.min(fL.sy, fR.sy));
    const yBot = Math.ceil(Math.max(nL.sy, nR.sy)) + 1;
    const w = xMax - xMin;
    const h = yBot - yTop;
    if (w <= 1.5 || h <= 1.0) return;
    this.ctx.drawImage(tile, xMin, yTop, w, h);
  }

  /**
   * Darker-green tint over the outer shoulder strip zone (between the
   * playable-lane outer edge ±1.50 and the visual road edge at
   * ±roadHalfLaneUnits). Visually splits the road into three zones:
   *   shoulder strip · 3 playable lanes · shoulder strip
   *
   * This is the key change that makes the road read as a "corridor with
   * decorated edges" instead of one flat green surface.
   */
  #shoulderStrips() {
    const ctx = this.ctx;
    const p = this.projection;
    const PLAYABLE_HALF = 1.50;
    if (p.roadHalfLaneUnits <= PLAYABLE_HALF + 0.02) return;
    const farDist = p.maxDistance * 0.92;

    ctx.save();
    // Darker green vs the inner playable corridor — the eye now reads
    // 3 lanes flanked by 2 shoulder strips rather than one flat surface.
    // v4.4 — reference-match: alpha 0.34 → 0.52 so the corridor frame pops
    // clearly against the meadow, still reading as grass not a black band.
    ctx.fillStyle = 'rgba(30,88,38,0.52)';
    for (const side of [-1, 1]) {
      const inN  = p.projectVisual(side * PLAYABLE_HALF, 0);
      const inF  = p.projectVisual(side * PLAYABLE_HALF, farDist);
      const outN = p.projectVisual(side * p.roadHalfLaneUnits, 0);
      const outF = p.projectVisual(side * p.roadHalfLaneUnits, farDist);
      ctx.beginPath();
      ctx.moveTo(inF.sx,  inF.sy);
      ctx.lineTo(outF.sx, outF.sy);
      ctx.lineTo(outN.sx, outN.sy);
      ctx.lineTo(inN.sx,  inN.sy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Scrolling tiny grass-pixel noise scattered across the road surface.
   * Sells the "lived-in garden path" feel — the tile checker alone reads
   * as too clean. Each point is 1-2 px at base scale, alpha + size shrink
   * with distance.
   */
  #grassNoise(scrollOffset) {
    const p = this.projection;
    const ctx = this.ctx;
    const loop = p.maxDistance;
    const off = ((scrollOffset % loop) + loop) % loop;
    const points = this._noisePoints;

    for (let i = 0; i < points.length; i += 1) {
      const pt = points[i];
      let d = pt.distance - off;
      if (d < -1) d += loop;
      if (d > loop * 0.96) continue;

      const proj = p.projectVisual(pt.lane, d);
      if (proj.scale < 0.06) continue;
      const sz = Math.max(1, Math.round(2 * proj.scale));
      // Foreground gets noticeably stronger texture — far end stays
      // light so the visual hierarchy still points toward the castle.
      // v4.4 — reference-match: alpha dialed down ~40% so the clean
      // perspective grid reads over the texture (geometry unchanged).
      const alpha = 0.14 + 0.38 * proj.scale;
      ctx.fillStyle = pt.dark
        ? `rgba(46,118,40,${alpha * 0.72})`
        : `rgba(196,238,124,${alpha})`;
      ctx.fillRect(Math.round(proj.sx - sz / 2), Math.round(proj.sy - sz), sz, sz);
    }
  }

  /**
   * Grass tufts + occasional tiny pixel flowers hugging the road edge
   * AND filling the shoulder zone between road edge and side structures.
   * Softens the hard boundary so the lanes blend into the garden.
   *
   * Each fringe point has a `shoulderDepth` (0 = at edge, ~0.4 = into
   * shoulder zone toward structures at ±1.88-1.98) and a `kind`
   * (grass / yellow flower / purple flower).
   */
  #shoulderFringe(scrollOffset) {
    const p = this.projection;
    const ctx = this.ctx;
    const loop = p.maxDistance;
    const off = ((scrollOffset % loop) + loop) % loop;
    const points = this._fringePoints;

    const PLAYABLE_HALF = 1.50;
    const shoulderWidth = Math.max(0.05, p.roadHalfLaneUnits - PLAYABLE_HALF);

    for (let i = 0; i < points.length; i += 1) {
      const f = points[i];
      let d = f.distance - off;
      if (d < -1) d += loop;
      if (d > loop * 0.96) continue;

      // Position inside the shoulder strip (between playable lane edge
      // and the outer road edge). shoulderDepth 0..1 maps the full strip.
      const lane = f.side * (PLAYABLE_HALF + f.shoulderDepth * shoulderWidth);
      const proj = p.projectVisual(lane, d);
      if (proj.scale < 0.06) continue;
      // v4.4 — reference-match: fringe alpha dialed down ~40% to match the
      // quieter grass noise so the perspective grid stays the dominant cue.
      const alpha = 0.13 + 0.31 * proj.scale;

      if (f.kind === 'yellowFlower') {
        const sz = Math.max(1, Math.round(2.4 * proj.scale));
        ctx.fillStyle = `rgba(255,216,82,${alpha})`;
        ctx.fillRect(proj.sx - sz / 2, proj.sy - sz, sz, sz);
        // Tiny green stem below the flower head.
        const stemH = Math.max(1, Math.round(2 * proj.scale));
        ctx.fillStyle = `rgba(58,148,46,${alpha * 0.7})`;
        ctx.fillRect(proj.sx - 1, proj.sy - stemH, Math.max(1, Math.round(proj.scale)), stemH);
        continue;
      }

      if (f.kind === 'purpleFlower') {
        const sz = Math.max(1, Math.round(2.2 * proj.scale));
        ctx.fillStyle = `rgba(178,118,222,${alpha})`;
        ctx.fillRect(proj.sx - sz / 2, proj.sy - sz, sz, sz);
        const stemH = Math.max(1, Math.round(2 * proj.scale));
        ctx.fillStyle = `rgba(58,148,46,${alpha * 0.7})`;
        ctx.fillRect(proj.sx - 1, proj.sy - stemH, Math.max(1, Math.round(proj.scale)), stemH);
        continue;
      }

      // Default: grass tuft (vertical stroke + lighter cap).
      const tuftH = Math.max(1, Math.round(4 * proj.scale));
      const tuftW = Math.max(1, Math.round(2 * proj.scale));
      ctx.fillStyle = `rgba(64,164,52,${alpha})`;
      ctx.fillRect(proj.sx - tuftW / 2, proj.sy - tuftH, tuftW, tuftH);
      ctx.fillStyle = `rgba(176,232,118,${alpha * 0.62})`;
      ctx.fillRect(proj.sx - tuftW / 2, proj.sy - tuftH, tuftW, Math.max(1, Math.round(tuftH * 0.4)));
    }
  }

  #drawQuadSprite(key, x1, y1, x2, y2, x3, y3, x4, y4, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const minX = Math.min(x1, x2, x3, x4);
    const maxX = Math.max(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxY = Math.max(y1, y2, y3, y4);
    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0.5 || height <= 0.5) return false;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, minX, minY, width, height);
    ctx.restore();
    return true;
  }
}

// ── Procedural pattern builders ──────────────────────────────────────────────

/**
 * Tiny mulberry32 PRNG — used only for one-shot pattern initialization
 * so the noise and fringe placements are stable across page reloads
 * without polluting the seedable world RNG.
 */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a fixed list of (lane, distance, dark) points spanning the full
 * draw range. Each point is a tiny grass pixel rendered by #grassNoise.
 */
function buildNoisePattern(count, seed) {
  const rng = mulberry32(seed);
  const points = new Array(count);
  // Span the full visual road extent so noise covers both the playable
  // corridor and the shoulder strips — the shoulder tint pass darkens
  // those shoulder pixels naturally via the tint overlay.
  const halfLaneSpan = 1.85;
  for (let i = 0; i < count; i += 1) {
    points[i] = {
      lane: (rng() - 0.5) * (halfLaneSpan * 2),
      distance: rng() * 420,
      dark: rng() < 0.42,
    };
  }
  return points;
}

/**
 * Build the shoulder fringe pattern. Each point has:
 *   - side: -1 / +1 (left or right shoulder)
 *   - shoulderDepth: 0..0.40 — distance OUTWARD from road edge toward
 *                    side structures. Spreads tufts across the gap.
 *   - kind: 'grass' / 'yellowFlower' / 'purpleFlower' — varies the
 *           visual; flowers are kept rare (~7% each) so the dominant
 *           texture is still grass.
 *   - distance: 0..420 — world-distance, scrolled per frame.
 */
function buildFringePattern(count, seed) {
  const rng = mulberry32(seed);
  const points = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const kindRoll = rng();
    points[i] = {
      side: i % 2 === 0 ? -1 : 1,
      // 0..1 — fraction of the shoulder-strip width (between playable
      // edge at ±1.50 and the outer road edge at ±roadHalfLaneUnits).
      shoulderDepth: rng(),
      distance: rng() * 420,
      kind: kindRoll < 0.07 ? 'yellowFlower'
          : kindRoll < 0.14 ? 'purpleFlower'
          : 'grass',
    };
  }
  return points;
}
