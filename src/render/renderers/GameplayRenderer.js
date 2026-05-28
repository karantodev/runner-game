/**
 * In-lane gameplay items: obstacles (vine, overhang, single-lane hazards)
 * and collectibles (flowers, life, power-ups). Z-sorted by distance every
 * frame so far things sit behind near things.
 *
 * Does NOT paint the player — see PlayerRenderer.
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
    const sprite = entity.components.Sprite;
    const data = entity.components.CollectibleData;
    const p = this.projection.project(pos.lane, pos.distance);
    const yOffset = data.high ? -86 : -40;
    const wobble = Math.sin(data.t) * 4 * p.scale;
    const x = p.sx + data.laneJitter * this.projection.laneWidth;
    const y = p.sy + yOffset * p.scale + wobble;
    const pop = world.config.gameFeel.ambientMotion ? 1 + Math.sin(data.t * 2.1) * 0.05 : 1;
    const assetType = sprite.assetType ?? sprite.type;

    if (assetType === 'heart_full' || data.type === 'life') {
      this.paint.heart(x, y, p.scale * 1.35 * pop);
      return;
    }

    if (assetType === 'speed_tree_pickup' || data.type === 'power-tree') {
      this.#powerGlow(x, y - 22 * p.scale, p.scale * pop, '#72ff66');
      this.paint.tree(x, y + 28 * p.scale, p.scale * 0.64 * pop);
      return;
    }

    if (assetType === 'power_mushroom_pickup' || data.type === 'power-mushroom') {
      this.#powerGlow(x, y - 22 * p.scale, p.scale * pop, '#ad72ff');
      this.paint.mushroom(x, y + 18 * p.scale, p.scale * 0.82 * pop, 'purple');
      return;
    }

    const flowerKey = p.scale > 0.55 ? 'goldenFlowerBig' : 'goldenFlowerSmall';
    const szMod = 1 + data.laneJitter * 0.5;  // ±8% size variation
    if (!this.sprites.draw(flowerKey, x, y, 72 * p.scale * pop * szMod)) this.paint.flower(x, y, p.scale * 1.65 * pop);
  }

  #powerGlow(x, y, scale, color) {
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

    const p = this.projection.project(pos.lane, pos.distance);
    if (box.warning) this.#warningPulse(p.sx, p.sy - 58 * p.scale, p.scale, world.timeAlive);
    if (assetType === 'spiky_bush_obstacle' || box.type === 'bush') this.paint.bush(p.sx, p.sy, p.scale);
    if (assetType === 'dry_grass_obstacle' || box.type === 'wheat') {
      if (!this.sprites.draw('dryGrassObstacle', p.sx, p.sy, 130 * p.scale)) this.paint.wheat(p.sx, p.sy, p.scale);
    }
    if (assetType === 'purple_brick_single' || box.type === 'wall') this.paint.wallBlock(p.sx, p.sy, p.scale, 1, sprite.variant === 2 ? 2 : 1);
    if (assetType === 'small_center_mushroom' || box.type === 'mushroom') {
      if (!this.sprites.draw('mushroomSmallRed', p.sx, p.sy, 140 * p.scale)) this.paint.mushroom(p.sx, p.sy, p.scale, sprite.variant);
    }
    if (assetType === 'stone_obstacle' || box.type === 'stone') this.paint.stone(p.sx, p.sy, p.scale);
  }

  #vine(distance, scrollOffset, warning = false) {
    const ctx = this.ctx;
    const p = this.projection;
    const p1 = p.project(-p.roadHalfLaneUnits + 0.1, distance);
    const p2 = p.project(p.roadHalfLaneUnits - 0.1, distance);
    const scale = p1.scale;
    const vineCx = (p1.sx + p2.sx) / 2;
    const vineW = (p2.sx - p1.sx) + 90 * scale;

    // Shadow bar grounding the vine regardless of sprite load.
    ctx.save();
    ctx.globalAlpha = 0.32;
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

    if (warning) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,220,120,${0.30 + Math.sin(scrollOffset * 0.1) * 0.08})`;
      ctx.lineWidth = Math.max(2, 10 * scale);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy - 20 * scale);
      ctx.lineTo(p2.sx, p2.sy - 20 * scale);
      ctx.stroke();
      ctx.restore();
    }
  }

  #overhang(distance, assetType, warning, timeAlive) {
    const ctx = this.ctx;
    const p = this.projection;
    const p1 = p.project(-p.roadHalfLaneUnits + 0.1, distance);
    const p2 = p.project(p.roadHalfLaneUnits - 0.1, distance);
    const scale = p1.scale;
    const cx = (p1.sx + p2.sx) / 2;
    const roadW = (p2.sx - p1.sx) + 110 * scale;

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
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, cx - drawW / 2, overhangTopY, drawW, drawH);
      ctx.restore();
    } else {
      this.#paintOverhangFallback(cx, overhangTopY, roadW, scale, assetType);
    }

    if (warning) {
      const pulse = 0.5 + 0.5 * Math.sin(timeAlive * 0.32);
      ctx.save();
      ctx.strokeStyle = `rgba(255,220,120,${0.28 + pulse * 0.14})`;
      ctx.lineWidth = Math.max(2, 9 * scale);
      ctx.setLineDash([12 * scale, 8 * scale]);
      ctx.beginPath();
      ctx.moveTo(p1.sx, overhangTopY + headroom + 16 * scale);
      ctx.lineTo(p2.sx, overhangTopY + headroom + 16 * scale);
      ctx.stroke();
      ctx.restore();
    }
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
