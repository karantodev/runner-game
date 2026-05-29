import { getCollectibleSpec } from '../../ecs/collectibleTypes.js';

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
  }

  render(world) {
    const queue = this._renderQueue;
    queue.length = 0;
    for (const e of world.registry.query('Position', 'Sprite', 'Hitbox')) queue.push(e);
    for (const e of world.registry.query('Position', 'Sprite', 'CollectibleData')) queue.push(e);
    queue.sort(byDistanceComponent);

    for (const e of queue) {
      if ('Hitbox' in e.components) this.#obstacleEntity(e, world.scrollOffset, world);
      else if (!e.components.CollectibleData.collected) this.#collectibleEntity(e, world);
    }
  }

  // ── Collectibles ────────────────────────────────────────────────────────────

  #collectibleEntity(entity, world) {
    const pos = entity.components.Position;
    const data = entity.components.CollectibleData;
    // v3.8.14 — clean far-gate approach. Collectibles past distance 90
    // are well inside the road's tile-fade-out zone (FAR_VISIBLE=84) and
    // sit visually near the castle gate. Skipping them keeps the final
    // approach to the gate clear, and players still have ~90 world-units
    // of warning before any pickup. distance 70-90 fades smoothly so
    // pickups don't pop in.
    if (pos.distance > 90) return;
    const distanceFadeT = pos.distance > 70 ? Math.max(0, 1 - (pos.distance - 70) / 20) : 1;
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
    if (assetType === 'spiky_bush_obstacle' || box.type === 'bush') this.paint.bush(p.sx, p.sy, p.scale);
    if (assetType === 'dry_grass_obstacle' || box.type === 'wheat') {
      if (!this.sprites.draw('dryGrassObstacle', p.sx, p.sy, 130 * p.scale)) this.paint.wheat(p.sx, p.sy, p.scale);
    }
    if (assetType === 'purple_brick_single' || box.type === 'wall') this.paint.wallBlock(p.sx, p.sy, p.scale, 1, sprite.variant === 2 ? 2 : 1);
    if (assetType === 'small_center_mushroom' || box.type === 'mushroom') {
      if (!this.sprites.draw('mushroomSmallRed', p.sx, p.sy, 140 * p.scale)) this.paint.mushroom(p.sx, p.sy, p.scale, sprite.variant);
    }
    // (the legacy `stone` type has no sprite + no paint backend; intentionally a no-op now)
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

    const headroom = 132 * scale;
    const overhangTopY = p1.sy - headroom - 110 * scale;

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
      // imageSmoothingEnabled is set false once per frame in RenderSystem.
      ctx.drawImage(image, cx - drawW / 2, overhangTopY, drawW, drawH);
    } else {
      this.#paintOverhangFallback(cx, overhangTopY, roadW, scale, assetType);
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
  return b.components.Position.distance - a.components.Position.distance;
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

  flower(self, x, y, scale, pop, _r, data) {
    // v3.8.5 — bump orchid base 52 → 60. Reference shows golden flowers
    // as crisp, unmistakable markers; at 52 the mid-depth flowers were
    // getting lost in road texture. 60 keeps depth scaling honest
    // (still shrinks at distance) while giving near pickups proper
    // weight and presence.
    const szMod = 1 + data.laneJitter * 0.5;  // ±8% size variation
    const w = 60 * scale * pop * szMod;
    if (self.sprites.draw('orchidGoldMain', x, y, w)) return;
    if (self.sprites.draw('orchidGoldBig', x, y, w * 0.9)) return;
    const legacyKey = scale > 0.55 ? 'goldenFlowerBig' : 'goldenFlowerSmall';
    if (self.sprites.draw(legacyKey, x, y, 72 * scale * pop * szMod)) return;
    self.paint.flower(x, y, scale * 1.65 * pop);
  },
};
