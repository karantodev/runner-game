import { AMBIENT_MOTES, LAYERS, PARALLAX } from '../constants.js';
import { parallaxOffset, roadBaseHalfWidth } from '../helpers.js';
import { LANE_BANDS, SCENE_ZONES } from '../../config/sceneSchema.js';

/**
 * v3.7 per-band visual-size multipliers. SceneryRenderer multiplies the
 * projected scale by this so each zone reads at its intended weight
 * without changing the individual prefab scales.
 */
const BAND_SIZE_BIAS = Object.freeze({
  [LANE_BANDS.SHOULDER]:  0.55,   // tiny buffer flora
  [LANE_BANDS.STRUCTURE]: 1.00,   // blocks / mushrooms / fences
  // v3.7.1 — trees were dominating the frame at 1.40. Reference shows
  // them as small background mass, not foreground props. Cut to 0.80 +
  // pair with the BAND_ALPHA_BIAS so they read as fading background.
  [LANE_BANDS.NATURE]:    0.80,
});

/** v3.7.1 — extra alpha multiplier so NATURE reads as washed-back. */
const BAND_ALPHA_BIAS = Object.freeze({
  [LANE_BANDS.NATURE]: 0.78,
});

/** v3.7.4 — prefab filter. Only tree assetTypes get rendered as static frame. */
function isTreeAssetType(assetType) {
  return assetType === 'tree_round' || assetType === 'tree';
}

/**
 * v3.7 lane-remap. Legacy prefab data hugged the road tightly
 * (STRUCTURE at lane 1.88-2.18, NATURE trees at lane 3.04-3.22). The
 * new zone scheme pushes them outward so the decor band reads as a real
 * 60-80 px corridor and the trees frame the horizon. Mapped at render-
 * time instead of mutating the data file — keeps SHOULDER (buffer)
 * untouched and lets us re-tune in a single place.
 */
function remapLaneForBand(lane, band) {
  const sign = Math.sign(lane) || 1;
  const abs = Math.abs(lane);
  if (band === LANE_BANDS.STRUCTURE) {
    // v3.8.8 Tier-3 — pulled decor in HARD. Was [2.40, 3.50] which left
    // ~53 px of empty grass between visual road edge and the nearest
    // block. Now [2.18, 2.78]: clusters sit 15-40 px outside the road
    // shoulder per the target reference's tight fantasy corridor.
    if (abs < 1.85) return lane;
    const t = Math.min(1, (abs - 1.85) / 0.40);
    return sign * (2.18 + t * (2.78 - 2.18));
  }
  if (band === LANE_BANDS.NATURE) {
    // v3.8.8 — NATURE remap follows: [3.00, 3.70]. Trees still frame the
    // horizon but no longer float in distant haze.
    if (abs < 2.40) return lane;
    const t = Math.min(1, (abs - 2.40) / 0.85);
    return sign * (3.00 + t * (3.70 - 3.00));
  }
  return lane;
}
import { FOREGROUND_FRAME_SCENERY, MIDGROUND_SCENERY } from '../../config/sceneSchema.data.js';
import { getSceneryDraw, isSideAwareSceneryType } from './scenery/sceneryDispatch.js';

/**
 * All non-gameplay world geometry: the static midground/foreground prefab
 * scenery, the per-tick spawned `world.scenery` items (split into a
 * structural pass and an organic pass so walls always sit behind shrubs),
 * the per-side foreground garden gradient + ambient motes, and the
 * dispatcher that paints every individual scenery asset type.
 */
export class SceneryRenderer {
  constructor({ ctx, projection, assets, sprites, paint, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.paint = paint;
    this.gradients = gradients;
    this._drawDeps = { sprites, paint };
    this._structural = [];
    this._organic = [];
  }

  render(world) {
    // v3.8.16 — pull the debug flag once per frame instead of reading
    // it inside #drawSceneryType (called for every scenery entity).
    this._showSideLabels = !!world.config.debug?.showSides;
    // v3.8.17 — when the side-matrix debug overlay is on, skip the
    // dynamic scenery rendering entirely and draw the test grid
    // instead. Sky / mountains / road / castle still render in their
    // own renderers — gives context without scenery noise.
    if (world.config.debug?.showSideMatrix) {
      this.#drawSideMatrix(world);
      return;
    }
    this.#midgroundTerraces(world);
    // v3.7.5 — #foregroundGarden removed. It painted:
    //   1. a static side-gradient panel on each shoulder (light-green tint)
    //   2. 28 procedural fillRect grass blades re-seeded off scrollOffset
    //      every frame — caused the visible flicker on the left shoulder
    //   3. four sprite-flora items per side anchored to FIXED screen X —
    //      these were the "static bushes in the bottom corners"
    // The game is a treadmill: only true background (trees / mountains /
    // sky) should sit still, every other prop must flow with the road.
    // Dynamic decor through DecorationSystem covers the buffer/structure
    // zones with entities that actually scroll toward the camera.

    // Reuse the two scratch arrays — clearing length to 0 keeps the same
    // backing storage and avoids per-frame allocation of two new arrays.
    const structural = this._structural;
    const organic = this._organic;
    structural.length = 0;
    organic.length = 0;
    for (const e of world.registry.query('ScenicData', 'Position', 'Sprite')) {
      if (this.#isStructural(e)) structural.push(e);
      else organic.push(e);
    }
    structural.sort(byDistanceComponent);
    organic.sort(byDistanceComponent);
    for (const e of structural) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);
    for (const e of organic) this.#sceneryEntity(e, world, LAYERS.FOREGROUND_DECOR);

    this.#foregroundFrame(world);
  }

  // ── Static prefab layers ────────────────────────────────────────────────────

  #midgroundTerraces(world) {
    // v3.7.4: only TREE entries from the midground prefab are rendered.
    // Static blocks / walls / mushrooms / fences sat at fixed distance
    // and looked "frozen" while dynamic decor scrolled toward the player.
    // Trees are the one prop the user actually wants framing the road.
    for (const item of MIDGROUND_SCENERY) {
      if (!isTreeAssetType(item.assetType)) continue;
      this.#drawComposedSceneryItem(item, world, LAYERS.MIDGROUND_TERRAIN, 0.74);
    }
  }

  #foregroundFrame(world) {
    // Same filter as #midgroundTerraces — only trees survive.
    for (const item of FOREGROUND_FRAME_SCENERY) {
      if (!isTreeAssetType(item.assetType)) continue;
      this.#drawComposedSceneryItem(item, world, LAYERS.FOREGROUND_DECOR, 0.95);
    }
  }

  #drawComposedSceneryItem(item, world, layer, alpha = 1) {
    // v3.7: project against the zone-remapped lane so the prefab pushes
    // outward into the new wider decor / nature bands.
    const band = this.#bandForZone(item.zone);
    const projLane = remapLaneForBand(item.lane, band);
    const p = this.#projectWithParallax(projLane, item.distance, world, layer);
    const layerBoost = layer === LAYERS.MIDGROUND_TERRAIN ? 1.12 : layer === LAYERS.FOREGROUND_DECOR ? 1.06 : 1;
    const sizeBias = BAND_SIZE_BIAS[band] ?? 1;
    const scale = p.scale * (item.scale ?? item.visualScale ?? 1) * layerBoost * sizeBias;
    const alphaBias = BAND_ALPHA_BIAS[band] ?? 1;
    const y = p.sy + (item.yOffset ?? 0) * scale;
    // v3.8.14 — pixel-snap projected position so decor sprites don't
    // jitter at sub-pixel boundaries when scroll advances.
    this.#drawSceneryType(item.assetType ?? item.type, Math.round(p.sx), Math.round(y), scale, item.variant, alpha * alphaBias);
  }

  // ── Dynamic per-side scenery ────────────────────────────────────────────────

  #isStructural(entity) {
    const scenic = entity.components.ScenicData;
    return scenic.laneBand === LANE_BANDS.STRUCTURE
      || scenic.zone === SCENE_ZONES.STRUCTURE_LEFT
      || scenic.zone === SCENE_ZONES.STRUCTURE_RIGHT;
  }

  /**
   * Map a SCENE_ZONES.* literal to its LANE_BANDS.* equivalent so prefab
   * data (which tags zones, not bands) drives the same remap logic that
   * dynamically-spawned scenery (which tags bands) uses.
   */
  #bandForZone(zone) {
    if (zone === SCENE_ZONES.NATURE_LEFT || zone === SCENE_ZONES.NATURE_RIGHT) return LANE_BANDS.NATURE;
    if (zone === SCENE_ZONES.STRUCTURE_LEFT || zone === SCENE_ZONES.STRUCTURE_RIGHT) return LANE_BANDS.STRUCTURE;
    if (zone === SCENE_ZONES.SHOULDER_LEFT || zone === SCENE_ZONES.SHOULDER_RIGHT) return LANE_BANDS.SHOULDER;
    return LANE_BANDS.PLAY;
  }

  #sceneryEntity(entity, world, layer) {
    const pos = entity.components.Position;
    const sprite = entity.components.Sprite;
    const scenic = entity.components.ScenicData;
    if (pos.distance < -5.5) return;
    // v3.7: remap entity lane into the wider zones before projecting.
    const projLane = remapLaneForBand(pos.lane, scenic.laneBand);
    const p = this.#projectWithParallax(projLane, pos.distance, world, layer);
    // v3.7 per-band size bias. Each LANE_BAND has a target visual weight:
    //   SHOULDER  — buffer flowers, grass tufts: tiny, soft (≤30% lane)
    //   STRUCTURE — blocks, mushrooms, fences: full-bodied (100%)
    //   NATURE    — trees, hedges: imposing (140%) to read as background mass
    // Falls back to 1.0 for any band that hasn't been classified.
    const sizeBias = BAND_SIZE_BIAS[scenic.laneBand] ?? 1.0;
    const scale = p.scale * sprite.visualScale * sizeBias;
    const y = p.sy + sprite.yOffset * scale;

    const isStructural = this.#isStructural(entity);
    const nearFade = isStructural ? 1 : Math.max(0, Math.min(1, (pos.distance + 5.5) / 12));
    const farFade = Math.max(0.62, Math.min(1, p.scale * 3.1));
    let alpha = nearFade * farFade;
    // v3.8.6 Tier-2 — SHOULDER base bias raised 0.74 → 0.85 so corridor
    // reads denser. Close-fade floor raised 0 → 0.55 so props at distance
    // 0-16 stay readable instead of vanishing — the empty-bottom-corner
    // problem the user kept flagging traces to this fade-to-zero.
    if (scenic.laneBand === LANE_BANDS.SHOULDER) alpha *= 0.85;
    if (scenic.laneBand === LANE_BANDS.SHOULDER && pos.distance < 16) {
      alpha *= Math.max(0.55, pos.distance / 16);
    }
    // v3.7.1: NATURE alpha-fade so trees read as background mass even at
    // closer depths. Combined with the 0.80 size bias they stop dominating
    // the frame.
    const bandAlphaBias = BAND_ALPHA_BIAS[scenic.laneBand];
    if (bandAlphaBias != null) alpha *= bandAlphaBias;
    if (!isStructural && layer === LAYERS.FOREGROUND_DECOR && this.#intrudesOnGameplayCorridor(p.sx, scale)) {
      alpha = Math.min(alpha, (pos.distance / 20) * 0.22);
    }
    if (pos.distance < 10 && (sprite.assetType === 'tree_round' || sprite.assetType === 'purple_flower_single' || sprite.assetType === 'mushroom_red_big')) alpha *= 0.82;
    if (alpha <= 0.03) return;

    const mirrored = isStructural && pos.lane > 0;
    // v3.8.14 — pixel-snap projected position. Same rationale as the
    // composed-prefab path above.
    this.#drawSceneryType(sprite.assetType ?? sprite.type, Math.round(p.sx), Math.round(y), scale, sprite.variant, alpha, mirrored);
  }

  #intrudesOnGameplayCorridor(x, scale) {
    const center = this.projection.width / 2;
    const safeHalfWidth = roadBaseHalfWidth(this.projection) * 0.72;
    return Math.abs(x - center) < safeHalfWidth + 80 * scale;
  }

  #projectWithParallax(lane, distance, world, layer) {
    // v3.8.7 — projectVisual so decor placement scales with visualLaneScale
    // alongside the road silhouette. Keeps the gap between road edge and
    // structure decor constant as the visual model is tuned.
    const projected = this.projection.projectVisual(lane, distance);
    const amount = layer === LAYERS.MIDGROUND_TERRAIN ? PARALLAX.midground : PARALLAX.foreground;
    return {
      ...projected,
      sx: projected.sx + parallaxOffset(this.projection, world.scrollOffset, amount, distance * 0.02),
    };
  }

  // ── Foreground garden (side flora + ambient motes) ──────────────────────────

  #foregroundGarden(scrollOffset, world = null) {
    const ctx = this.ctx;
    const p = this.projection;
    const vpX = p.width / 2;
    const baseHalf = roadBaseHalfWidth(p);
    const y0 = p.groundY - 96;
    const y1 = p.height;

    ctx.save();
    // The foreground-side gradient is pre-built in GradientCache once per
    // viewport size — re-creating it here every frame allocated two
    // CanvasGradient objects and was visible in the GC trace.
    const sideGradient = this.gradients.foregroundSide;
    for (const side of [-1, 1]) {
      const edgeX = vpX + side * baseHalf;
      const outerX = side < 0 ? 0 : p.width;
      ctx.fillStyle = sideGradient;
      ctx.beginPath();
      ctx.moveTo(edgeX, y0);
      ctx.lineTo(outerX, y0 + 48);
      ctx.lineTo(outerX, y1);
      ctx.lineTo(edgeX + side * 34, y1);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 28; i += 1) {
        const seed = (i * 41 + Math.floor(scrollOffset * 0.2)) % 997;
        const rx = (seed * 37) % 240;
        const ry = (seed * 19) % 145;
        const x = side < 0 ? 32 + rx : p.width - 32 - rx;
        const sway = world?.config.gameFeel.ambientMotion ? Math.sin((scrollOffset + seed) * 0.03) * 2.2 : 0;
        const y = p.groundY - 18 - ry + sway;
        if ((side < 0 && x > edgeX - 14) || (side > 0 && x < edgeX + 14)) continue;
        ctx.fillStyle = seed % 6 === 0 ? '#8fdc5d' : '#74d648';
        ctx.fillRect(x, y, 3, 4);
        ctx.fillStyle = '#277b35';
        ctx.fillRect(x - 2, y + 4, 8, 3);
        if (world?.config.gameFeel.ambientMotion && seed % 4 === 0) {
          const bend = Math.sin((scrollOffset + seed) * 0.03) * 2.5;
          ctx.fillStyle = 'rgba(98,188,78,0.58)';
          ctx.fillRect(x + bend, y + 8, 2, 10);
        }
      }

      // Sprite-based flora anchors on near shoulder, just outside road edge
      const FLORA = [
        { xOff: 22, yOff: 24, sz: 74, key: 'grassTuftSmall' },
        { xOff: 62, yOff: 14, sz: 62, key: 'yellowFlowerSmall' },
        { xOff: 104, yOff: 20, sz: 78, key: 'grassTuftLarge' },
        { xOff: 152, yOff: 12, sz: 66, key: 'purpleFlowerCluster' },
        { xOff: 200, yOff: 18, sz: 70, key: 'grassTuftSmall' },
      ];
      for (const f of FLORA) {
        const fx = side < 0 ? edgeX - f.xOff : edgeX + f.xOff;
        if (fx > 0 && fx < p.width) this.sprites.draw(f.key, fx, p.groundY - f.yOff, f.sz);
      }
    }

    if (world?.config.gameFeel.ambientMotion) {
      for (const mote of AMBIENT_MOTES) {
        const drift = Math.sin(scrollOffset * 0.01 * mote.speed + mote.x * 9) * 24;
        ctx.fillStyle = mote.color;
        ctx.beginPath();
        ctx.arc(
          p.width * mote.x + drift,
          p.height * mote.y + Math.cos(scrollOffset * 0.012 + mote.y * 12) * 12,
          mote.size,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Asset-type dispatch (Strategy Map — sceneryDispatch.js) ───────────────

  #drawSceneryType(assetType, x, y, scale, variant, alpha = 1, mirrored = false) {
    const draw = getSceneryDraw(assetType);
    if (!draw) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const side = mirrored ? 1 : -1;
    let usedSideVariant = false;
    let usedFallback = false;
    // v3.8.16 — side-aware dispatch ONLY for types that registered as
    // such (see SIDE_AWARE_TYPES in sceneryDispatch.js).
    if (isSideAwareSceneryType(assetType)) {
      usedSideVariant = !!draw(this._drawDeps, x, y, scale, variant, side);
      if (!usedSideVariant) {
        // v3.8.16: NO mirror fallback for side-aware types. A canvas
        // flip would reverse the sun direction on the right side and
        // mis-orient the road-facing face. Instead draw the generic
        // billboard WITHOUT flip so the misorientation is visible to
        // QA, and warn once per asset type so the missing pair is loud.
        this.#warnMissingSideVariant(assetType, side);
        draw(this._drawDeps, x, y, scale, variant, undefined);
        usedFallback = true;
      }
    } else {
      if (mirrored) {
        this.ctx.translate(x, 0);
        this.ctx.scale(-1, 1);
        this.ctx.translate(-x, 0);
      }
      draw(this._drawDeps, x, y, scale, variant);
    }
    this.ctx.restore();
    // v3.8.16 debug labels — toggle via ?debugSides=1. Draws a small
    // overlay near each side-aware prop showing type, side, variant
    // used, and X position relative to road center.
    if (this._showSideLabels && isSideAwareSceneryType(assetType)) {
      this.#drawSideLabel(assetType, x, y, scale, side, usedSideVariant, usedFallback);
    }
  }

  /** v3.8.16 — warn-once on missing side-variant. */
  #warnMissingSideVariant(assetType, side) {
    if (!this._missingVariantWarned) this._missingVariantWarned = new Set();
    const key = `${assetType}|${side}`;
    if (this._missingVariantWarned.has(key)) return;
    this._missingVariantWarned.add(key);
    const sideName = side === -1 ? 'left' : 'right';
    // eslint-disable-next-line no-console
    console.warn(`[scenery] side-aware "${assetType}" missing ${sideName} variant; drew billboard fallback (lighting may misalign)`);
  }

  /**
   * v3.8.17 side-matrix overlay — isolated A/B test grid for side-aware
   * sprite variants. Enabled via ?debugSideMatrix=1.
   *
   * Layout: for each side-aware type, four cells in a row:
   *   [LEFT-placed, _Left.png]  [LEFT-placed, _Right.png]
   *   [RIGHT-placed, _Left.png] [RIGHT-placed, _Right.png]
   *
   * Sprite content is independent of placement X — the position only
   * affects WHERE the cell is drawn on screen. QA reads each pair and
   * picks the variant whose lighting + 3/4-view face the road centre.
   * The conclusion is then either "normal" or "swapped" — flip
   * ?sideMapping= accordingly.
   */
  #drawSideMatrix(world) {
    const ctx = this.ctx;
    const p = this.projection;
    const types = [
      { key: 'grass_dirt_block', baseKey: 'grassDirtBlock',  size: 185 },
      { key: 'floating_platform', baseKey: 'platformFloating', size: 290 },
    ];
    // Semi-transparent backdrop so labels read against any sky.
    ctx.save();
    ctx.fillStyle = 'rgba(10,18,32,0.55)';
    ctx.fillRect(0, 0, p.width, p.height);
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIDE-AWARE VARIANT MATRIX  —  pick the variant whose road-facing face is on the road side', p.width / 2, 36);
    ctx.font = '12px monospace';
    ctx.fillText('Column 1: drawn at LEFT placement   |   Column 2: drawn at RIGHT placement', p.width / 2, 58);
    ctx.fillText('Row "_L" = sprites named _left.png   |   Row "_R" = sprites named _right.png', p.width / 2, 76);
    // Grid: 2 columns × 2 rows per type. Columns span screen halves.
    const colXLeft  = p.width * 0.28;
    const colXRight = p.width * 0.72;
    const rowHGap = 220;
    let rowY = 200;
    for (const t of types) {
      // Type header
      ctx.fillStyle = '#ffd54a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`type: ${t.key}`, 40, rowY - 80);
      // Cells
      const cells = [
        { x: colXLeft,  y: rowY,           variant: 'Left',  placement: 'LEFT'  },
        { x: colXLeft,  y: rowY + rowHGap, variant: 'Right', placement: 'LEFT'  },
        { x: colXRight, y: rowY,           variant: 'Left',  placement: 'RIGHT' },
        { x: colXRight, y: rowY + rowHGap, variant: 'Right', placement: 'RIGHT' },
      ];
      for (const c of cells) {
        const key = `${t.baseKey}${c.variant}`;
        // Sprite draw
        const drew = this.sprites.draw(key, c.x, c.y, t.size, 'bottom');
        // Label
        ctx.fillStyle = drew ? '#00ff66' : '#ff3030';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        const text = drew ? `${c.placement} placement · _${c.variant.toLowerCase()}` : `${key} (MISSING)`;
        ctx.fillRect(c.x - 110, c.y + 10, 220, 16);
        ctx.fillStyle = drew ? '#0a1c1f' : '#440000';
        ctx.fillStyle = drew ? '#00ff66' : '#ff3030';
        ctx.fillText(text, c.x, c.y + 22);
      }
      // Center vertical line per row pair (visual guide for "which side")
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(p.width / 2, rowY - 100);
      ctx.lineTo(p.width / 2, rowY + rowHGap + 30);
      ctx.stroke();
      rowY += rowHGap * 2 + 60;
    }
    // Footer with current mapping mode
    ctx.fillStyle = '#ffe8a8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const mapMode = world.config.debug?.showSides ? '(also: ?debugSides=1 active)' : '';
    ctx.fillText(`Toggle: ?sideMapping=normal | ?sideMapping=swapped  ${mapMode}`, p.width / 2, p.height - 24);
    ctx.restore();
  }

  /** v3.8.16 — per-prop debug label. */
  #drawSideLabel(assetType, x, y, scale, side, usedSideVariant, usedFallback) {
    const ctx = this.ctx;
    const w = this.projection.width;
    const roadCenterX = w / 2;
    const dx = x - roadCenterX;
    const status = usedSideVariant ? 'OK' : (usedFallback ? 'FALLBACK' : '?');
    const color = usedSideVariant ? '#00ff66' : '#ff3030';
    const labelY = Math.round(y - 120 * scale);
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const text = `${assetType} | side=${side === -1 ? 'L' : 'R'} | dx=${Math.round(dx)} | ${status}`;
    const tw = ctx.measureText(text).width;
    ctx.fillRect(Math.round(x - tw / 2 - 3), labelY - 11, tw + 6, 14);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), labelY);
    ctx.restore();
  }
}

function byDistanceComponent(a, b) {
  return b.components.Position.distance - a.components.Position.distance;
}
