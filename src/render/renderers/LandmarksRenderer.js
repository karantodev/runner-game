import { PARALLAX } from '../constants.js';
import { drawScrollingTile, parallaxOffset, roadBaseHalfWidth, roadTopHalfWidth } from '../helpers.js';

/**
 * Distant treeline + castle + forest + meadow + the haze stack that ties
 * the vanishing point into the foreground. Painted between the mountains
 * and the road.
 */
export class LandmarksRenderer {
  constructor({ ctx, projection, assets, sprites, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.gradients = gradients;
  }

  render(world) {
    const ctx = this.ctx;
    const p = this.projection;
    const width = p.width;
    const allowParallax = world.adaptiveQuality?.tier?.parallax !== false;
    const parallaxScale = allowParallax ? 1 : 0;
    // v3.8.12 visual gate calibration — math alignment from v3.8.11 was
    // mathematically correct (castleBaseY - DOOR_OFFSET == roadVanishY)
    // but VISUALLY the castle still floated because the door OPENING
    // (the recognisable dark gate rectangle) sits significantly above
    // the castle sprite's bottom edge — not at the bottom like a Mario
    // castle, but ~80-100 px up in the silhouette.
    //
    // Reframing: ACCEPTANCE is the VISIBLE GATE THRESHOLD reaching the
    // road's far end on screen, not a coordinate match. Two values to
    // empirically tune:
    //
    //   DOOR_OFFSET_FROM_BASE — how far below roadVanishY the SPRITE's
    //     bottom anchor must sit so the VISIBLE door opening lines up
    //     with the road's far end. Bumped 60 → 95 (estimated visible
    //     door bottom ~95 px above sprite bottom in castle_far_01).
    //   VISIBLE_GATE_WIDTH / HEIGHT — used by the debug overlay to
    //     draw the estimated gate rectangle. ~22% × 32% of sprite for
    //     this art.
    //
    // Castle's lower ~95 px now overlaps road tiles. That's intentional —
    // road draws OVER the castle's bottom, hiding the sprite portion
    // BELOW the visible gate, and the visible gate's bottom edge meets
    // the road tip seamlessly.
    const DOOR_OFFSET_FROM_BASE = 95;
    const VISIBLE_GATE_WIDTH_RATIO = 0.22;
    const VISIBLE_GATE_HEIGHT_RATIO = 0.32;
    const castleWidthPx = width * 0.122;
    const castleOffset = parallaxOffset(p, world.scrollOffset, PARALLAX.castle * parallaxScale, 1.1);
    // Keep the landmark gate on the same render-only axis as the road. The
    // gameplay lane model remains centred; only the visual corridor bends.
    const castleX = p.roadVanishX;
    const topHalf = roadTopHalfWidth(p);
    // gateThresholdY = visible bottom of the gate opening (target = roadVanishY)
    const gateThresholdY = p.roadVanishY;
    const castleBaseY = gateThresholdY + DOOR_OFFSET_FROM_BASE;
    const gateY = castleBaseY - 4;
    const moundY = castleBaseY - 4;

    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#3f8f44';
    ctx.beginPath();
    ctx.moveTo(0, p.roadVanishY + 78);
    // v3.8.8 — treeline peaks reshuffled so NO peak sits behind the castle.
    // Previously peaks at xRatio 0.46/0.54 were 28 px tall — they framed
    // the castle silhouette with competing verticals. New layout has a
    // LOW point around xRatio 0.50 and stronger peaks at 0.18 / 0.78
    // (off-axis), so the castle reads as the only vertical at center.
    const treeline = [[0.00, 26], [0.08, 18], [0.16, 30], [0.24, 16], [0.32, 28], [0.40, 22], [0.46, 14], [0.50, 12], [0.54, 14], [0.60, 22], [0.68, 28], [0.76, 16], [0.84, 30], [0.92, 18], [1.00, 26]];
    for (const [xRatio, yOffset] of treeline) {
      const px = xRatio * width + castleOffset * 0.45;
      // Cull window widened 132 → 168 so the immediate area behind the
      // castle has a low flat horizon, not jagged treeline competing
      // with the castle's silhouette.
      if (Math.abs(px - castleX) < 168) continue;
      ctx.lineTo(px, p.roadVanishY + 78 + yOffset);
    }
    ctx.lineTo(width, p.roadVanishY + 124);
    ctx.lineTo(0, p.roadVanishY + 124);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // v4.9 — focused haze behind the landmark. This keeps the horizon clean
    // while giving the castle a soft atmospheric pocket instead of a hard
    // sticker edge against the mountains.
    ctx.save();
    ctx.fillStyle = this.gradients.gradients.landmarkHaze;
    ctx.fillRect(castleX - 190, p.roadVanishY - 168, 380, 380);
    ctx.restore();

    // v3.8.12 — approach path = ROAD MATERIAL CONTINUATION. User flagged
    // the previous "thin light triangle". Now the approach trapezoid:
    //   - top edge MATCHES the road's full top-half-width (no inset)
    //   - alpha matches RoadRenderer's pathFill (0.30 → 0.66) verbatim
    //   - widens slightly at gate threshold for natural door entry
    // Mound is now nearly invisible — its job is residual ground hint,
    // not a separator between castle and road.
    ctx.save();

    // 1. Approach trapezoid — same colors AND alpha curve as the road's
    //    pathFill, so the eye treats it as the road continuing past the
    //    visible tile-grid boundary. Top matches the road tip exactly.
    //    v3.8.14 — bottom alpha bumped 0.74 → 0.82 so the final approach
    //    reads as a clearly defined path, not a dissolving gradient.
    const approachGrad = ctx.createLinearGradient(0, p.roadVanishY - 2, 0, castleBaseY);
    approachGrad.addColorStop(0, 'rgba(148,212,92,0.30)');
    approachGrad.addColorStop(1, 'rgba(126,196,78,0.82)');
    ctx.fillStyle = approachGrad;
    ctx.beginPath();
    ctx.moveTo(Math.round(castleX - topHalf), Math.round(p.roadVanishY - 2));
    ctx.lineTo(Math.round(castleX - 32),       Math.round(castleBaseY));
    ctx.lineTo(Math.round(castleX + 32),       Math.round(castleBaseY));
    ctx.lineTo(Math.round(castleX + topHalf),  Math.round(p.roadVanishY - 2));
    ctx.closePath();
    ctx.fill();
    // Edge stripes — natural perspective continuation of the dashed
    // dividers, cream tint, fading slightly toward the gate.
    ctx.strokeStyle = 'rgba(232,228,170,0.50)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.round(castleX - topHalf * 0.92), Math.round(p.roadVanishY));
    ctx.lineTo(Math.round(castleX - 28),             Math.round(castleBaseY - 1));
    ctx.moveTo(Math.round(castleX + topHalf * 0.92), Math.round(p.roadVanishY));
    ctx.lineTo(Math.round(castleX + 28),             Math.round(castleBaseY - 1));
    ctx.stroke();
    // v3.8.14 — center-lane hint inside the approach. Single soft cream
    // line down the middle of the trapezoid so the eye unmistakably
    // traces road→center axis→gate. Subtle (alpha 0.20) so it doesn't
    // compete with edge stripes, but visible enough to anchor the
    // direction.
    ctx.strokeStyle = 'rgba(232,228,170,0.20)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.round(castleX), Math.round(p.roadVanishY));
    ctx.lineTo(Math.round(castleX), Math.round(castleBaseY - 1));
    ctx.stroke();

    // 2. Mound — minimal residual hint only. Drops opacity 0.34 → 0.22,
    //    height 8 → 5, radius 130 → 100. No darker shadow band.
    const moundGrad = ctx.createRadialGradient(castleX, moundY, 8, castleX, moundY, 100);
    moundGrad.addColorStop(0.00, 'rgba(94,148,80,0.22)');
    moundGrad.addColorStop(0.65, 'rgba(74,124,62,0.10)');
    moundGrad.addColorStop(1.00, 'rgba(54,94,46,0)');
    ctx.fillStyle = moundGrad;
    ctx.beginPath();
    ctx.ellipse(castleX, moundY, 100, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    // v3.8.10 — castle scale 0.135 → 0.122 (-10%) so the silhouette feels
    // genuinely "in the distance", not a foreground sticker. Global alpha
    // reduced 0.96 → 0.88 so the castle absorbs a touch of atmospheric
    // haze instead of reading as a crisp cutout.
    //
    // v4.8 — depth treatment is masked to the castle pixels via ctx.filter.
    // The old bounding-box tint produced a visible translucent rectangle
    // around the focal point.
    const depthCfgL = world.config?.visual?.depth ?? {};
    const lmDesat = (depthCfgL.farDesaturate ?? 0.16) * 0.55;
    const lmDark  = (depthCfgL.farDarken     ?? 0.12) * 0.40;
    const visualOnL = world.config?.visual?.enabled !== false;

    ctx.globalAlpha = 0.88;
    if (visualOnL) {
      ctx.filter = `saturate(${Math.max(0.55, 1 - lmDesat)}) brightness(${Math.max(0.62, 1 - lmDark)})`;
    }
    const landmarkDrawn =
      this.sprites.draw('castleFarAlt',      castleX, castleBaseY, width * 0.122, 'bottom')
      || this.sprites.draw('backgroundCastle', castleX, castleBaseY, width * 0.105, 'bottom')
      || this.sprites.draw('greenhouseFar',  castleX, castleBaseY, width * 0.105, 'bottom');
    ctx.restore();

    if (!landmarkDrawn) {
      const flagWave = world.config.gameFeel.ambientMotion ? Math.sin(world.timeAlive * 0.09) : 0;
      this.#castle(castleX, gateY + 18, flagWave);
    }

    // Keep only a tiny ground join after the landscape. The main veil is
    // drawn once in BackgroundRenderer between mountain depth layers.
    ctx.fillStyle = this.gradients.gradients.depthHaze;
    ctx.fillRect(0, p.roadVanishY + 42, width, 84);

    // Forest + meadow now honestly scroll with the road so they look
    // like they're parallaxing past the camera. Castle stays at its
    // sin-drift anchor (it's a focal landmark, not a tiling background).
    const forestImg = this.assets.get('backgroundForestFar');
    if (forestImg?.naturalWidth) {
      const tileW = width + 68;
      const tileH = tileW * (forestImg.naturalHeight / forestImg.naturalWidth);
      drawScrollingTile(ctx, forestImg, -34, p.roadVanishY + 88, tileW, tileH, world.scrollOffset * 0.22 * parallaxScale, 0.82);
    } else {
      this.#drawSpriteRect('backgroundForestTreeline', -34, p.roadVanishY + 82, width + 68, 130, 0.68);
    }
    const meadowImg = this.assets.get('backgroundMeadowRolling');
    if (meadowImg?.naturalWidth) {
      drawScrollingTile(ctx, meadowImg, -24, p.roadVanishY + 122, width + 48, 76, world.scrollOffset * 0.32 * parallaxScale, 0.60);
    }

    // v3.8.12 — visual gate calibration overlay. Enable via ?debugAxis=1.
    // Shows BOTH the mathematical axis (v3.8.11 markers) AND the
    // estimated VISIBLE gate area so we calibrate against what the user
    // actually sees, not abstract sprite-bottom coordinates.
    //
    // Render markers:
    //   yellow line   — central axis (width/2)
    //   cyan dot      — roadVanishY (math vanishing point)
    //   green dot     — gateThresholdY (visible gate bottom target)
    //   magenta dot   — castleBaseY (sprite bottom anchor; HIDDEN by road)
    //   RED rectangle — estimated VISIBLE gate opening (what the user sees)
    //   RED line      — gate threshold (bottom edge of gate opening)
    //   ORANGE diagonals — road's outer edges projected toward gate corners
    if (world.config.debug?.showAxis) {
      ctx.save();
      // Central axis
      ctx.strokeStyle = 'rgba(255,210,80,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.width / 2, p.groundY);
      ctx.lineTo(castleX, p.roadVanishY);
      ctx.stroke();

      // Math markers (v3.8.11)
      ctx.fillStyle = '#00e6ff';
      ctx.beginPath();
      ctx.arc(castleX, p.roadVanishY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ff66';
      ctx.beginPath();
      ctx.arc(castleX, gateThresholdY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5cd6';
      ctx.beginPath();
      ctx.arc(castleX, castleBaseY, 4, 0, Math.PI * 2);
      ctx.fill();

      // VISIBLE gate rectangle (estimated from castle width + ratios).
      // gateThresholdY = bottom of visible gate; rectangle extends UP
      // by VISIBLE_GATE_HEIGHT_RATIO × castle height.
      const castleHeightPx = castleWidthPx * 1.2; // approximate aspect
      const gateWidthPx = castleWidthPx * VISIBLE_GATE_WIDTH_RATIO;
      const gateHeightPx = castleHeightPx * VISIBLE_GATE_HEIGHT_RATIO;
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        castleX - gateWidthPx / 2,
        gateThresholdY - gateHeightPx,
        gateWidthPx,
        gateHeightPx,
      );
      // Gate threshold line — solid red horizontal at gateThresholdY
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(castleX - gateWidthPx, gateThresholdY);
      ctx.lineTo(castleX + gateWidthPx, gateThresholdY);
      ctx.stroke();

      // Road-edge-to-gate-corner diagonals — visualises whether the
      // road's outer taper actually leads into the gate corners.
      ctx.strokeStyle = 'rgba(255,140,40,0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      // Left road edge at the foreground (groundY) → left gate corner
      ctx.moveTo(p.visualRoadCenterX(0) - roadBaseHalfWidth(p), p.groundY);
      ctx.lineTo(castleX - gateWidthPx / 2, gateThresholdY);
      // Right road edge at the foreground → right gate corner
      ctx.moveTo(p.visualRoadCenterX(0) + roadBaseHalfWidth(p), p.groundY);
      ctx.lineTo(castleX + gateWidthPx / 2, gateThresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('vanish', castleX + 10, p.roadVanishY - 4);
      ctx.fillText('gate threshold', castleX + 12, gateThresholdY + 14);
      ctx.fillText('sprite base (hidden by road)', castleX + 10, castleBaseY + 4);
      ctx.fillText(`DOOR_OFFSET=${DOOR_OFFSET_FROM_BASE}`, castleX - gateWidthPx + 4, gateThresholdY - gateHeightPx - 6);
      ctx.restore();
    }
  }

  #drawSpriteRect(key, x, y, width, height, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return true;
  }

  #drawSpriteFullWidth(key, x, y, width, alpha = 1) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;
    const height = width * (image.naturalHeight / image.naturalWidth);
    return this.#drawSpriteRect(key, x, y, width, height, alpha);
  }

  #castle(cx, baseY, flagWave = 0) {
    const ctx = this.ctx;
    const scale = this.projection.height / 864;
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(1.22 * scale, 1.22 * scale);
    ctx.fillStyle = 'rgba(56,80,86,0.16)';
    ctx.fillRect(-72, -10, 144, 14);

    ctx.fillStyle = '#9d8aa8';
    ctx.fillRect(-34, -76, 68, 76);
    for (let i = -3; i <= 2; i += 1) ctx.fillRect(-34 + i * 14 + 7, -83, 9, 7);
    ctx.fillStyle = '#8d7d9b';
    ctx.fillRect(-54, -60, 18, 60);
    ctx.fillRect(36, -60, 18, 60);
    ctx.fillStyle = '#d04040';
    ctx.beginPath();
    ctx.moveTo(-57, -60);
    ctx.lineTo(-45, -80);
    ctx.lineTo(-33, -60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(33, -60);
    ctx.lineTo(45, -80);
    ctx.lineTo(57, -60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, -83);
    ctx.lineTo(0, -110);
    ctx.lineTo(16, -83);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(-1, -126, 2, 16);
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.moveTo(1, -126);
    ctx.lineTo(14 + flagWave * 6, -121 + flagWave * 1.5);
    ctx.lineTo(1, -116 + flagWave * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a4a40';
    ctx.fillRect(-9, -26, 18, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(10, -76, 24, 76);
    ctx.fillRect(44, -60, 10, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(-30, -70, 7, 58);
    ctx.fillRect(-50, -55, 4, 45);
    ctx.restore();
  }
}
