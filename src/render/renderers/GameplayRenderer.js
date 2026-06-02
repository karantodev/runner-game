import { getCollectibleSpec } from '../../ecs/collectibleTypes.js';
import { ASSET_SEMANTICS, getCanonicalSemantic } from '../../config/assetSemantics.js';

// v4.0 — Reusable per-frame scratch for obstacle tint pass.
// One OffscreenCanvas per GameplayRenderer instance, created lazily.
// Avoids per-frame allocation in the hot path.
let _tintCanvas = null;
let _tintCtx = null;
function _getTintCtx(w, h) {
  if (!_tintCanvas || _tintCanvas.width < w || _tintCanvas.height < h) {
    try {
      _tintCanvas = new OffscreenCanvas(Math.max(w, 256), Math.max(h, 256));
    } catch (_) {
      // OffscreenCanvas unavailable (e.g. Node smoke-test). Return null;
      // caller must guard.
      return null;
    }
    _tintCtx = _tintCanvas.getContext('2d');
  }
  return _tintCtx;
}

// v4.4 — pull the alpha channel out of a css color so the obstacle outline
// stamp honours the strength baked into config (`rgba(20,12,40,0.55)` → 0.55).
// Opaque / non-rgba colors fall back to fully opaque.
function _cssAlpha(color) {
  if (typeof color !== 'string') return 1;
  const m = color.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
  return m ? Math.max(0, Math.min(1, parseFloat(m[1]))) : 1;
}

// v3.8.50 — Phase 8 canonical overlay palette. Keyed by canonical
// role (spec scheme: red/yellow/green/blue/gray/purple).
const COMPOSITION_COLORS = {
  GAMEPLAY_OBSTACLE:  '#ff5050',
  COLLECTIBLE:        '#ffd54a',
  BONUS_POWERUP:      '#6ee06e',
  SIDE_STRUCTURE:     '#5ab8ff',
  PLATFORM:           '#7fd0ff',
  ROAD_DECOR:         '#a0a0a0',
  SIDE_DECOR_SMALL:   '#a0a0a0',
  SIDE_DECOR_LARGE:   '#9aa0a8',
  SUPPORT_FOUNDATION: '#b78cff',
  STACKABLE_TOP:      '#c39cff',
  LANDMARK:           '#ffb0ff',
  BACKGROUND_ONLY:    '#666',
  unknown:            '#ff8030',
};
const COMPOSITION_FILTER_FN = (role, filter) => {
  if (filter === 'all' || !filter) return true;
  if (filter === 'obstacles') return role === 'GAMEPLAY_OBSTACLE';
  if (filter === 'pickups')   return role === 'COLLECTIBLE' || role === 'BONUS_POWERUP';
  if (filter === 'decor')     return role === 'SIDE_DECOR_SMALL' || role === 'SIDE_DECOR_LARGE' || role === 'ROAD_DECOR' || role === 'SUPPORT_FOUNDATION' || role === 'STACKABLE_TOP' || role === 'PLATFORM' || role === 'SIDE_STRUCTURE';
  if (filter === 'invalid')   return false;
  return true;
};

/**
 * In-lane gameplay items: obstacles (vine, overhang, single-lane hazards)
 * and collectibles (flowers, life, power-ups). Z-sorted by distance every
 * frame so far things sit behind near things.
 *
 * Does NOT paint the player — see PlayerRenderer.
 *
 * Collectible visuals are data-driven via `COLLECTIBLE_REGISTRY`. Each
 * entry's `render` block decides the kind, sprite key, glow colour, and
 * size — adding a new pickup never touches this renderer.
 */
export class GameplayRenderer {
  constructor({ ctx, projection, assets, sprites, paint }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.paint = paint;
    // Reused per-frame so we don't allocate an Array + N wrapper objects
    // for every render call. Entities themselves carry `kind` + `distance`
    // already, so we can push refs directly.
    this._renderQueue = [];
    // Flower halos share one cached offscreen sprite per colour. Building
    // two radial gradients for every visible orchid every frame was one
    // of the hottest Canvas paths once the breadcrumb trail became dense.
    this._flowerGlowCache = new Map();
  }

  render(world) {
    // v4.0 — cache config sub-objects for the duration of this frame so
    // drawer functions can read them via `self._glowCfg` without per-entity
    // property traversal. Assigned directly to `this`; reset to null after
    // the loop so stale refs don't leak across frames.
    this._glowCfg = world.config?.visual?.enabled
      ? (world.config.visual.collectibles?.glow ?? null)
      : null;

    const queue = this._renderQueue;
    queue.length = 0;
    for (const e of world.registry.query('Position', 'Sprite', 'Hitbox')) {
      const d = e.components.Position.distance;
      if (d >= -6 && d <= 180) queue.push(e);
    }
    for (const e of world.registry.query('Position', 'Sprite', 'CollectibleData')) {
      const d = e.components.Position.distance;
      if (d >= -6 && d <= 118) queue.push(e);
    }
    queue.sort(byDistanceComponent);

    for (const e of queue) {
      if ('Hitbox' in e.components) this.#obstacleEntity(e, world.scrollOffset, world);
      else if (!e.components.CollectibleData.collected) this.#collectibleEntity(e, world);
    }

    this._glowCfg = null;  // prevent stale ref across frames

    // v3.8.38 — Phase 3 composition overlay pass. Drawn after all
    // entities so labels sit on top of the scene. Walks the same queue;
    // honours compositionFilter URL param + ?debugComposition flag.
    if (world.config.debug?.showComposition) {
      this.#drawCompositionOverlay(queue, world);
    }
  }

  #drawCompositionOverlay(queue, world) {
    const ctx = this.ctx;
    const p = this.projection;
    const filter = world.config.debug?.compositionFilter ?? 'all';
    ctx.save();
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const entity of queue) {
      const sprite = entity.components.Sprite;
      const pos = entity.components.Position;
      const assetType = sprite.assetType ?? sprite.type;
      const canonical = getCanonicalSemantic(assetType);
      const role = canonical?.role ?? 'UNKNOWN';
      const invalid = !canonical;
      if (filter === 'invalid' && !invalid) continue;
      if (filter !== 'invalid' && !COMPOSITION_FILTER_FN(role, filter)) continue;
      const proj = p.project(pos.lane, pos.distance);
      if (!proj || proj.sy < 60 || proj.sy > p.height - 20) continue;
      const color = invalid ? COMPOSITION_COLORS.unknown : (COMPOSITION_COLORS[role] ?? '#fff');
      // Runtime zone derived from lane sign (vs. canonical allowedZones).
      const runtimeZone =
        pos.lane <= -1.5 ? 'LEFT_SHOULDER' :
        pos.lane >=  1.5 ? 'RIGHT_SHOULDER' :
        Math.abs(pos.lane) > 1.0 ? 'ROAD_EDGE' : 'ROAD_CORE';
      const collision = canonical?.gameplayCollision ?? '?';
      const sideFacing = canonical?.sideFacing ?? '?';
      const support = canonical?.supportRules
        ? (canonical.supportRules.canStandAlone
            ? 'standalone'
            : canonical.supportRules.requiresPlatform
              ? 'needs-platform'
              : 'needs-ground')
        : '?';
      const lines = [
        assetType,
        `${role}${invalid ? ' · INVALID' : ''}`,
        `zone: ${runtimeZone}`,
        `side: ${sideFacing}`,
        `coll: ${collision} · sup: ${support}`,
      ];
      let maxW = 0;
      for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
      const lineH = 11;
      const padX = 4;
      const padY = 2;
      const boxW = maxW + padX * 2;
      const boxH = lineH * lines.length + padY * 2;
      const lx = Math.round(proj.sx);
      const top = Math.round(proj.sy - 90 * (proj.scale || 1)) - boxH;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(lx - boxW / 2, top, boxW, boxH);
      ctx.fillStyle = color;
      for (let i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], lx, top + padY + i * lineH);
      }
    }
    ctx.restore();
  }

  // ── Collectibles ────────────────────────────────────────────────────────────

  #collectibleEntity(entity, world) {
    const pos = entity.components.Position;
    const data = entity.components.CollectibleData;
    // v4.2 — P2 reference-match: extend far-gate 90 → 118 so the orchid
    // trail reaches toward the castle (road is visible to ~120). Fade
    // window shifted to 98→118 (was 70→90) — flowers appear gradually
    // rather than popping in. Near flowers are unaffected.
    if (pos.distance > 118) return;
    const distanceFadeT = pos.distance > 98 ? Math.max(0, 1 - (pos.distance - 98) / 20) : 1;
    const p = this.projection.projectVisual(pos.lane, pos.distance);
    const yOffset = data.high ? -86 : -40;
    const wobble = Math.sin(data.t) * 4 * p.scale;
    const x = p.sx + data.laneJitter * this.projection.visualLaneWidth;
    const y = p.sy + yOffset * p.scale + wobble;
    const pop = world.config.gameFeel.ambientMotion ? 1 + Math.sin(data.t * 2.1) * 0.05 : 1;

    const spec = getCollectibleSpec(data.type);
    if (!spec) return;
    if (world.powerUpSystem?.isMagnetActive() && (spec.render.kind === 'flower' || spec.render.kind === 'rare')) {
      this.#drawMagnetStreak(world, pos, x, y, p.scale);
    }
    const draw = COLLECTIBLE_DRAWERS[spec.render.kind];
    const prevAlpha = this.ctx.globalAlpha;
    if (distanceFadeT < 1) this.ctx.globalAlpha = prevAlpha * distanceFadeT;
    draw?.(this, x, y, p.scale, pop, spec.render, data);
    if (distanceFadeT < 1) this.ctx.globalAlpha = prevAlpha;
  }

  /**
   * v3.5 — thin pink streak from orchid toward player while magnet is
   * active. Visual confirmation that the pickup is being pulled. Kept
   * fully procedural (no particles, no allocation) so it scales with
   * dense orchid trails.
   */
  #drawMagnetStreak(world, pos, x, y, scale) {
    if (!world.player) return;
    const cfg = world.config.powerUps.magnet;
    const playerLaneX = world.player.components.LaneState.laneX;
    const laneDelta = playerLaneX - pos.lane;
    if (Math.abs(laneDelta) > cfg.radius) return;
    if (pos.distance < -3 || pos.distance > cfg.radius * 14) return;

    const playerX = this.projection.width / 2 + playerLaneX * this.projection.visualLaneWidth;
    const playerY = this.projection.groundY - 50;
    const ctx = this.ctx;
    ctx.save();
    // Fade strength based on distance: closer = brighter. radius * 14 is
    // the cull window, so normalise to [0,1].
    const t = Math.max(0, Math.min(1, 1 - (pos.distance / (cfg.radius * 14))));
    ctx.globalAlpha = 0.18 + t * 0.42;
    ctx.strokeStyle = '#ff7ad6';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(playerX, playerY);
    ctx.stroke();
    ctx.restore();
  }

  // Public helpers used by COLLECTIBLE_DRAWERS (module-level dispatch table
  // sits outside the class so `#private` would be inaccessible). Module
  // boundary remains the encapsulation layer.
  drawPowerGlow(x, y, scale, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 4 * scale);
    ctx.beginPath();
    ctx.arc(x, y, 34 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 42 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFallbackPowerDot(x, y, scale, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * v4.4 — Flower/collectible halo drawn with globalCompositeOperation='source-over'
   * (was 'lighter' in v4.0) so a dense line of halos stays as discrete warm auras
   * instead of stacking additively into one blown-out gold band.
   * Reads from GAME_CONFIG.visual.collectibles.glow when available.
   *
   * @param {number} x  — screen x (already projected + jitter)
   * @param {number} y  — screen y
   * @param {number} scale — projection scale
   * @param {number} t  — time in seconds for pulse animation (data.t)
   * @param {string} color — hex / css color string
   * @param {number} spriteHalfSize — half-width of the sprite in screen px
   * @param {object} [glowCfg] — optional GAME_CONFIG.visual.collectibles.glow
   */
  drawFlowerGlow(x, y, scale, t, color, spriteHalfSize, glowCfg) {
    const ctx = this.ctx;
    const radiusScale = glowCfg?.radiusScale ?? 1.12;
    const pulse       = glowCfg?.pulse       ?? 0.10;
    const radius = spriteHalfSize * radiusScale * (1 + Math.sin(t * 3.1) * pulse);
    let glow = this._flowerGlowCache.get(color);
    if (!glow) {
      const size = 128;
      glow = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(size, size)
        : (() => { const c = document.createElement('canvas'); c.width = size; c.height = size; return c; })();
      const glowCtx = glow.getContext('2d');
      const center = size / 2;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, center);
      grad.addColorStop(0, color);
      grad.addColorStop(0.28, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      glowCtx.globalAlpha = 0.72;
      glowCtx.fillStyle = grad;
      glowCtx.fillRect(0, 0, size, size);
      this._flowerGlowCache.set(color, glow);
    }
    ctx.save();
    // v4.4 — reference-match: tighter non-additive flower glow so the trail reads as discrete blooms.
    // 'source-over' (was 'lighter') stops a line of halos summing into a blown-out band;
    // alpha + radius are pulled in so each orchid keeps a soft warm aura instead of a smear.
    ctx.globalCompositeOperation = 'source-over';
    // ~0.16 target; min() keeps it tight even if config dials glow alpha lower.
    ctx.globalAlpha = Math.min(glowCfg?.alpha ?? 0.28, 0.16);
    const tightRadius = radius * 0.7;
    ctx.drawImage(glow, x - tightRadius, y - tightRadius, tightRadius * 2, tightRadius * 2);
    ctx.restore();
  }

  /**
   * v4.1 — P0 reference-match: soft elliptical contact shadow under the
   * obstacle foot. Replaces the old bounding-box fillRect + strokeRect which
   * painted an ugly rectangular purple box over every sprite's transparent
   * corners. A contact shadow is sprite-agnostic (no per-pixel work) and
   * grounds the obstacle on the road without any visible rectangle.
   *
   * The shadow is centred at (cx, cy) — the foot-y returned by projectVisual.
   * halfW drives the ellipse x-radius; shadow depth is fixed at 0.28 × halfW.
   * The existing `obstacleCfg` object gates the draw (same guard as before);
   * per-property `tint`/`outline` sub-objects are no longer read here since
   * we no longer use a box-fill approach — the shadow is always a dark oval.
   *
   * @param {number} cx — horizontal centre of the obstacle in screen px
   * @param {number} cy — foot y (sy from projectVisual)
   * @param {number} halfW — half-width in screen px (used for ellipse rx)
   * @param {number} halfH — half-height in screen px (unused visually; kept
   *                         for call-site stability)
   * @param {object} obstacleCfg — GAME_CONFIG.visual.obstacles (presence gates draw)
   */
  #drawObstacleTintOverlay(cx, cy, halfW, halfH, _obstacleCfg) {
    const ctx = this.ctx;
    // v4.1 — P0 reference-match: soft contact shadow — radial gradient oval
    // on the road surface under the sprite. rx matches sprite half-width so
    // it stays proportional at every depth. ry is 28% of rx (flat perspective
    // read on the ground plane). Alpha 0.38 keeps it readable without
    // darkening the road noticeably for well-lit sprites.
    const rx = halfW;
    const ry = halfW * 0.28;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0,   'rgba(10,6,20,0.38)');
    grad.addColorStop(0.5, 'rgba(10,6,20,0.18)');
    grad.addColorStop(1,   'rgba(10,6,20,0)');
    ctx.fillStyle = grad;
    ctx.scale(1, ry / rx);   // squash circle → ellipse (no matrix alloc)
    ctx.beginPath();
    ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * v4.4 — reference-match: cool tint + silhouette outline on obstacles for road separation.
   *
   * Draws a sprite-keyed obstacle with (1) a sprite-following dark OUTLINE
   * stamped in 4 directions behind it (mirrors the PlayerRenderer technique —
   * `filter:'brightness(0)'` keeps the real alpha shape, so the edge hugs the
   * silhouette, NOT a rectangle) and (2) a cool-purple TINT scoped to the
   * sprite's own pixels.
   *
   * The tint is composited on an offscreen scratch with `source-atop` so it
   * stays inside the sprite's alpha — tinting the bounding rect directly with
   * `source-atop` on the main canvas would wash the textured road behind it
   * (the very rectangular smudge v4.1 removed). Falls back to a plain blit
   * when the scratch / OffscreenCanvas is unavailable (e.g. Node smoke-test).
   *
   * Replicates `SpriteRenderer.draw` geometry exactly (bottom anchor, integer
   * snap) so outline + tint align pixel-for-pixel with the real sprite, and
   * returns the same boolean so caller fallbacks (`if (!draw) paint…`) hold.
   *
   * @returns {boolean} true if the sprite drew, false if the asset was missing
   */
  #drawObstacleSpriteWithFx(key, cx, baseY, targetWidth, obstacleCfg) {
    const image = this.assets.get(key);
    if (!image || !image.naturalWidth) return false;

    const ctx = this.ctx;
    const height = targetWidth * (image.naturalHeight / image.naturalWidth);
    // Match SpriteRenderer's snapped bottom-anchored rect 1:1.
    const dx = Math.round(cx - targetWidth / 2);
    const dy = Math.round(baseY - height);
    const dw = Math.round(targetWidth);
    const dh = Math.round(height);

    const outlineCfg = obstacleCfg?.outline;
    const tintCfg = obstacleCfg?.tint;

    // (1) Silhouette outline behind the sprite — 4-direction brightness(0) stamp.
    if (outlineCfg?.enabled) {
      const o = Math.max(1, outlineCfg.width ?? 2);
      ctx.save();
      ctx.filter = 'brightness(0)';
      ctx.globalAlpha = _cssAlpha(outlineCfg.color);
      ctx.drawImage(image, dx - o, dy, dw, dh);
      ctx.drawImage(image, dx + o, dy, dw, dh);
      ctx.drawImage(image, dx, dy - o, dw, dh);
      ctx.drawImage(image, dx, dy + o, dw, dh);
      ctx.restore();
    }

    // (2) Cool tint scoped to the sprite alpha, composited offscreen so the
    // road behind the sprite is never touched.
    if (tintCfg?.enabled) {
      const tctx = _getTintCtx(dw, dh);
      if (tctx) {
        tctx.save();
        tctx.clearRect(0, 0, dw, dh);
        tctx.imageSmoothingEnabled = false;  // local scratch ctx, not the frame ctx
        tctx.globalCompositeOperation = 'source-over';
        tctx.globalAlpha = 1;
        tctx.drawImage(image, 0, 0, dw, dh);
        tctx.globalCompositeOperation = 'source-atop';  // tint hugs sprite alpha only
        tctx.globalAlpha = tintCfg.strength ?? 0.20;
        tctx.fillStyle = tintCfg.color ?? '#7a4fd0';
        tctx.fillRect(0, 0, dw, dh);
        tctx.restore();
        ctx.drawImage(tctx.canvas, 0, 0, dw, dh, dx, dy, dw, dh);
        return true;
      }
      // No offscreen scratch available — fall through to a plain blit so the
      // obstacle still renders (untinted) rather than vanishing.
    }

    ctx.drawImage(image, dx, dy, dw, dh);
    return true;
  }

  // ── Obstacles ───────────────────────────────────────────────────────────────

  #obstacleEntity(entity, scrollOffset, world) {
    const pos = entity.components.Position;
    const sprite = entity.components.Sprite;
    const box = entity.components.Hitbox;
    const assetType = sprite.assetType ?? sprite.type;
    if (assetType === 'vine_barrier' || box.type === 'vine') {
      this.#vine(pos.distance, scrollOffset, box.warning);
      return;
    }
    if (box.type === 'overhang') {
      this.#overhang(pos.distance, assetType, box.warning, world.timeAlive);
      return;
    }

    const p = this.projection.projectVisual(pos.lane, pos.distance);
    if (box.warning) this.#warningPulse(p.sx, p.sy - 58 * p.scale, p.scale, world.timeAlive);

    // v4.4 — reference-match: cool tint + silhouette outline on obstacles for road separation.
    // Resolved up-front so the sprite-keyed draws below can route through the
    // fx helper. Null when the visual system is off → helper plain-blits.
    const obstacleCfg = world.config?.visual?.obstacles;
    const fxCfg = world.config?.visual?.enabled ? obstacleCfg : null;

    // v4.0 — track which draw path fires so we know sprite dimensions
    // for the tint overlay. All variants share the same overlay call below.
    let spriteHalfW = 65 * p.scale;  // conservative default
    let spriteHalfH = 48 * p.scale;

    if (assetType === 'spiky_bush_obstacle' || box.type === 'bush') {
      this.paint.bush(p.sx, p.sy, p.scale);   // painter path — no sprite fx (see #drawObstacleSpriteWithFx)
      spriteHalfW = 55 * p.scale; spriteHalfH = 44 * p.scale;
    }
    if (assetType === 'dry_grass_obstacle' || box.type === 'wheat') {
      // v4.4 — sprite-keyed path: tint + outline via fx helper; painter fallback unchanged.
      if (!this.#drawObstacleSpriteWithFx('dryGrassObstacle', p.sx, p.sy, 130 * p.scale, fxCfg)) this.paint.wheat(p.sx, p.sy, p.scale);
      spriteHalfW = 65 * p.scale; spriteHalfH = 40 * p.scale;
    }
    if (assetType === 'purple_brick_single' || box.type === 'wall') {
      this.paint.wallBlock(p.sx, p.sy, p.scale, 1, sprite.variant === 2 ? 2 : 1);  // painter path — no sprite fx
      spriteHalfW = 50 * p.scale; spriteHalfH = 52 * p.scale;
    }
    if (assetType === 'small_center_mushroom' || box.type === 'mushroom') {
      // v4.4 — sprite-keyed path: tint + outline via fx helper; painter fallback unchanged.
      if (!this.#drawObstacleSpriteWithFx('mushroomSmallRed', p.sx, p.sy, 140 * p.scale, fxCfg)) this.paint.mushroom(p.sx, p.sy, p.scale, sprite.variant);
      spriteHalfW = 58 * p.scale; spriteHalfH = 58 * p.scale;
    }
    // (the legacy `stone` type has no sprite + no paint backend; intentionally a no-op now)

    // v4.1 — P0 reference-match: contact shadow for obstacle readability.
    // Guard: only when visual system enabled and obstacle config present.
    if (fxCfg) {
      this.#drawObstacleTintOverlay(p.sx, p.sy, spriteHalfW, spriteHalfH, obstacleCfg);
    }
  }

  #vine(distance, scrollOffset, warning = false) {
    const ctx = this.ctx;
    const p = this.projection;
    // v3.8.3 — vine span clamped to ±1.4 lane units (the playable area).
    // Previously vines used roadHalfLaneUnits (visual road extent) and
    // grew with the wider road, dominating the entire frame. Players
    // only ever interact with lanes -1/0/+1, so the vine just needs to
    // cover that span — visually narrower, height proportional.
    const VINE_LANE_HALF = 1.4;
    const p1 = p.projectVisual(-VINE_LANE_HALF, distance);
    const p2 = p.projectVisual(VINE_LANE_HALF, distance);
    const scale = p1.scale;
    const vineCx = (p1.sx + p2.sx) / 2;
    // v3.8.6 — vine width padding 60 → 32 so the obstacle reads as a
    // controlled lane-spanning bar, not a wall that eats the whole
    // visual frame. Combined with the alpha drop on the ground shadow,
    // the vine telegraphs "duck under" without dominating composition.
    const vineW = (p2.sx - p1.sx) + 32 * scale;

    // Warning lane painted on the road IN FRONT of the vine. Drawn first
    // so the vine's own shadow bar sits on top and grounds the obstacle.
    if (warning) this.#warningBand(distance, 'up', scrollOffset);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = '#1a4a20';
    ctx.fillRect(vineCx - vineW / 2, p1.sy - 6 * scale, vineW, 8 * scale);
    ctx.restore();

    const drewSprite = this.sprites.draw('vineBarrierFull', vineCx, p1.sy, vineW, 'bottom');
    if (!drewSprite) {
      this.sprites.draw('vineCoiled', vineCx, p1.sy + 4 * scale, 220 * scale, 'bottom');
      const baseY = p1.sy - 8 * scale;
      ctx.strokeStyle = '#2f7d3a';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, 16 * scale);
      ctx.beginPath();
      const segments = 14;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const x = p1.sx + (p2.sx - p1.sx) * t;
        const y = baseY - Math.sin(t * Math.PI * 3 + scrollOffset * 0.05) * 8 * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#5fbf52';
      for (let i = 2; i < segments; i += 3) {
        const t = i / segments;
        const x = p1.sx + (p2.sx - p1.sx) * t;
        const y = baseY - Math.sin(t * Math.PI * 3 + scrollOffset * 0.05) * 8 * scale;
        ctx.beginPath();
        ctx.ellipse(x, y - 8 * scale, 8 * scale, 5 * scale, t * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  }

  #overhang(distance, assetType, warning, _timeAlive) {
    const ctx = this.ctx;
    const p = this.projection;
    // v3.8.3 — overhang also clamped to playable lane span ±1.4 (same
    // reasoning as vines: covers the lanes the player can actually
    // occupy without bleeding into the shoulder/decor zone).
    const PLAY_HALF = 1.4;
    const p1 = p.projectVisual(-PLAY_HALF, distance);
    const p2 = p.projectVisual(PLAY_HALF, distance);
    const scale = p1.scale;
    const cx = (p1.sx + p2.sx) / 2;
    const roadW = (p2.sx - p1.sx) + 80 * scale;

    // Warning lane painted on the road UNDER the overhang. Drawn first so
    // the obstacle (and its ground-shadow ellipse) cover the band's far edge.
    if (warning) this.#warningBand(distance, 'down', 0);

    const key = assetType === 'spider_web_overhang' ? 'spiderWebOverhang' : 'lowBranchOverhang';
    const image = this.assets.get(key);

    // v4.3 — P3 reference-match: anchor the branch bottom at head height
    // above the road contact so it always hangs overhead. Old code anchored
    // the TOP and drew downward, causing the tall branch to extend below the
    // road at close range and drape through the player's torso. Now we pin
    // the BOTTOM at (p1.sy - headroom) and grow UPWARD by drawH.
    const headroom = 150 * scale;          // branch lowest point ~head height above road
    const overhangBottomY = p1.sy - headroom;

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = '#1a4a20';
    ctx.beginPath();
    ctx.ellipse(cx, p1.sy - 4 * scale, roadW * 0.42, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (image?.naturalWidth) {
      const aspect = image.naturalHeight / image.naturalWidth;
      const drawW = roadW;
      const drawH = drawW * aspect;
      const overhangTopY = overhangBottomY - drawH;   // grow UPWARD into the sky
      // imageSmoothingEnabled is set false once per frame in RenderSystem.
      ctx.drawImage(image, cx - drawW / 2, overhangTopY, drawW, drawH);
    } else {
      // Pass topY computed from the same bottom anchor so the fallback's
      // lowest rendered pixel also sits at overhangBottomY.
      const fallbackH = (26 + 88) * scale;  // trunkH + leafH from #paintOverhangFallback
      this.#paintOverhangFallback(cx, overhangBottomY - fallbackH, roadW, scale, assetType);
    }
  }

  /**
   * Striped trapezoidal warning band painted on the road in front of an
   * all-lane obstacle. The 4 bands alternate base-color and dark for the
   * standard "danger zone" stripe pattern; a chevron arrow on top points
   * up (jump) or down (duck). Intensity fades in as the obstacle nears.
   *
   * @param {number} distance — world-distance of the obstacle
   * @param {'up' | 'down'} direction — required player action
   * @param {number} scrollOffset — used to tie pulse phase to road scroll
   */
  #warningBand(distance, direction, scrollOffset) {
    const p = this.projection;
    const ctx = this.ctx;

    // Closeness goes 0 → 1 as the obstacle approaches from distance 30 to 4.
    const closeness = Math.max(0, Math.min(1, (30 - distance) / 26));
    if (closeness <= 0.02) return;

    // Band extends 6 world-units back from the obstacle base distance.
    const distFar = Math.max(0.5, distance);
    const distNear = Math.max(0.2, distance - 6);

    const baseColor = direction === 'up' ? '255,220,80' : '120,220,255';
    const darkColor = '40,30,10';
    const pulse = 0.55 + 0.45 * Math.sin(scrollOffset * (0.12 + closeness * 0.2));
    const alpha = (0.30 + closeness * 0.36) * (0.7 + pulse * 0.3);

    // 4 alternating stripes — each is its own perspective-correct quad.
    const bands = 4;
    for (let i = 0; i < bands; i += 1) {
      const t1 = i / bands;
      const t2 = (i + 1) / bands;
      const d1 = distFar - (distFar - distNear) * t1;
      const d2 = distFar - (distFar - distNear) * t2;
      const lL1 = p.projectVisual(-p.roadHalfLaneUnits + 0.1, d1);
      const lR1 = p.projectVisual( p.roadHalfLaneUnits - 0.1, d1);
      const lL2 = p.projectVisual(-p.roadHalfLaneUnits + 0.1, d2);
      const lR2 = p.projectVisual( p.roadHalfLaneUnits - 0.1, d2);
      ctx.fillStyle = i % 2 === 0
        ? `rgba(${baseColor},${alpha})`
        : `rgba(${darkColor},${alpha * 0.62})`;
      ctx.beginPath();
      ctx.moveTo(lL1.sx, lL1.sy);
      ctx.lineTo(lR1.sx, lR1.sy);
      ctx.lineTo(lR2.sx, lR2.sy);
      ctx.lineTo(lL2.sx, lL2.sy);
      ctx.closePath();
      ctx.fill();
    }

    // Chevron arrow centered above the band, scaled to the band's depth.
    const midDist = (distFar + distNear) / 2;
    const pMid = p.projectVisual(0, midDist);
    const size = 56 * pMid.scale;
    const dirSign = direction === 'up' ? -1 : 1;
    const cy = pMid.sy + (direction === 'up' ? -size * 0.9 : -size * 0.3);
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.strokeStyle = `rgb(${baseColor})`;
    ctx.lineWidth = Math.max(2, 7 * pMid.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 2; i += 1) {
      const yOff = i * size * 0.36 * dirSign;
      ctx.beginPath();
      ctx.moveTo(pMid.sx - size * 0.5, cy + yOff + size * 0.32 * dirSign);
      ctx.lineTo(pMid.sx,               cy + yOff);
      ctx.lineTo(pMid.sx + size * 0.5, cy + yOff + size * 0.32 * dirSign);
      ctx.stroke();
    }
    ctx.restore();
  }

  #paintOverhangFallback(cx, topY, width, scale, assetType) {
    const ctx = this.ctx;
    const trunkH = 26 * scale;
    const leafH = 88 * scale;

    if (assetType === 'spider_web_overhang') {
      ctx.save();
      ctx.strokeStyle = 'rgba(240,244,255,0.78)';
      ctx.lineWidth = Math.max(1, 2 * scale);
      const cy = topY + leafH * 0.5;
      const halfW = width * 0.5;
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI + 0.1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * halfW, cy + Math.sin(angle) * leafH * 0.4);
        ctx.stroke();
      }
      for (let r = 1; r <= 3; r += 1) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, halfW * (r / 3), leafH * 0.4 * (r / 3), 0, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#3a2454';
      ctx.beginPath();
      ctx.arc(cx, cy + 4 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = '#6e4a26';
    ctx.fillRect(cx - width / 2, topY + leafH * 0.4, width, trunkH);
    ctx.fillStyle = '#2e8b2e';
    const leafCount = 12;
    for (let i = 0; i < leafCount; i += 1) {
      const t = i / (leafCount - 1);
      const x = cx - width / 2 + t * width;
      ctx.beginPath();
      ctx.arc(x, topY + leafH * (0.3 + (i % 2) * 0.18), 28 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#48a948';
    for (let i = 0; i < leafCount; i += 2) {
      const t = i / (leafCount - 1);
      const x = cx - width / 2 + t * width;
      ctx.beginPath();
      ctx.arc(x - 6 * scale, topY + leafH * 0.22, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  #warningPulse(x, y, scale, time) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.32);
    ctx.save();
    ctx.globalAlpha = 0.24 + pulse * 0.18;
    ctx.strokeStyle = '#ffe07a';
    ctx.lineWidth = Math.max(1.5, 4 * scale);
    ctx.beginPath();
    ctx.arc(x, y, 24 * scale + pulse * 9 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function byDistanceComponent(a, b) {
  const depthOrder = b.components.Position.distance - a.components.Position.distance;
  if (depthOrder !== 0) return depthOrder;
  return gameplayPriority(a) - gameplayPriority(b) || a.id - b.id;
}

function gameplayPriority(entity) {
  // Obstacles render after collectibles at the same depth so collision
  // silhouettes stay readable when authored or procedural content aligns.
  return 'Hitbox' in entity.components ? 1 : 0;
}

/**
 * One renderer per collectible `render.kind`. Each receives:
 *   self  — the GameplayRenderer instance (for #powerGlow, sprites, paint)
 *   x, y  — already projected + wobble-adjusted screen coords
 *   scale — projection.scale
 *   pop   — ambient-motion size pulse (1 ± 0.05)
 *   r     — render block from the registry (kind, spriteKey?, glowColor?, size?)
 *   data  — raw CollectibleData (for laneJitter on the flower size mod)
 */
const COLLECTIBLE_DRAWERS = {
  life(self, x, y, scale, pop) {
    self.paint.heart(x, y, scale * 1.35 * pop);
  },

  power(self, x, y, scale, pop, r) {
    self.drawPowerGlow(x, y - 22 * scale, scale * pop, r.glowColor ?? '#a7ff7e');
    // Speed-burst + split-clones reuse painter routines for back-compat;
    // every other power-up renders from a sprite key + fallback dot.
    if (r.glowColor === '#72ff66') { self.paint.tree(x, y + 28 * scale, scale * 0.64 * pop); return; }
    if (r.glowColor === '#ad72ff') { self.paint.mushroom(x, y + 18 * scale, scale * 0.82 * pop, 'purple'); return; }
    if (r.spriteKey && self.sprites.draw(r.spriteKey, x, y, (r.size ?? 76) * scale * pop)) return;
    // v3.8.9 — prefer canonical pickup icons shipped in pickups/. Fall
    // back to the v3.6 misc/ stand-ins (sign_wooden_shield etc.) if the
    // canonical PNG didn't load.
    const canonicalKey =
      r.glowColor === '#8cdcff' ? 'pickupShield'  :
      r.glowColor === '#ff7ad6' ? 'pickupMagnet'  :
      r.glowColor === '#ffd54a' ? 'pickupScoreX2' : null;
    if (canonicalKey && self.sprites.draw(canonicalKey, x, y, (r.size ?? 76) * scale * pop)) return;
    const miscKey =
      r.glowColor === '#8cdcff' ? 'miscShieldSign'   :
      r.glowColor === '#ff7ad6' ? 'miscPotionEmerald':
      r.glowColor === '#ffd54a' ? 'miscHourglass'    : null;
    if (miscKey && self.sprites.draw(miscKey, x, y, (r.size ?? 76) * scale * pop)) return;
    self.drawFallbackPowerDot(x, y, scale, r.glowColor ?? '#ffffff');
  },

  rare(self, x, y, scale, pop, r) {
    // v3.8.9 — designer-delivered halo PNG drawn beneath the orchid
    // (when present); procedural glow stays as fallback so empty-asset
    // builds still get a glow. Halo size ~1.6× sprite for the "aura"
    // read.
    const haloSize = (r.size ?? 92) * scale * pop * 1.6;
    if (!self.sprites.draw('orchidBlueRareHalo', x, y, haloSize)) {
      self.drawPowerGlow(x, y - 28 * scale, scale * pop * 1.15, r.glowColor ?? '#5ab8ff');
    }
    if (r.spriteKey && self.sprites.draw(r.spriteKey, x, y, (r.size ?? 92) * scale * pop)) return;
    const flowerKey = scale > 0.55 ? 'goldenFlowerBig' : 'goldenFlowerSmall';
    if (self.sprites.draw(flowerKey, x, y, (r.size ?? 92) * scale * pop)) return;
    self.paint.flower(x, y, scale * 1.95 * pop);
  },

  flower(self, x, y, scale, pop, r, data) {
    // Keep the flower readable without turning the whole center lane into
    // a permanent bloom strip.
    const szMod = 1 + data.laneJitter * 0.5;  // ±8% size variation
    // r.sizeScale lets a jackpot orchid read bigger; absent for plain flowers (×1).
    const w = 82 * (r.sizeScale ?? 1) * scale * pop * szMod;

    // v4.0 — warm golden halo drawn BEFORE the sprite so it sits behind
    // the orchid. v4.4: drawFlowerGlow now uses a tight 'source-over' halo
    // (no longer additive) so a dense trail reads as discrete blooms. Config
    // overrides the registry glowColor if visual system is active. data.t
    // drives the pulse animation.
    const glowCfg  = self._glowCfg;   // injected by render() setup below
    const glowColor = glowCfg?.flowerColor ?? r.glowColor ?? '#ffcf3a';
    if (!glowCfg || glowCfg.enabled !== false) {
      self.drawFlowerGlow(x, y, scale, data.t, glowColor, w * 0.5, glowCfg);
    }

    // v4.5 — the designer's orchid_gold art is now at canonical 96px (the
    // 1254² "flame-noise" source that forced the v4.4 workaround was
    // downscaled), so the real orchid is the primary sprite again.
    // goldenFlowerBig / Small stay as ordered fallbacks.
    if (self.sprites.draw('orchidGoldMain', x, y, w)) return;
    const flowerKey = scale > 0.5 ? 'goldenFlowerBig' : 'goldenFlowerSmall';
    if (self.sprites.draw(flowerKey, x, y, w)) return;
    if (self.sprites.draw('orchidGoldBig', x, y, w * 0.9)) return;
    self.paint.flower(x, y, scale * 1.65 * pop);
  },
};
