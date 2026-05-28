import { AMBIENT_MOTES, LAYERS, PARALLAX } from '../constants.js';
import { parallaxOffset, roadBaseHalfWidth } from '../helpers.js';
import {
  FOREGROUND_FRAME_SCENERY,
  LANE_BANDS,
  MIDGROUND_SCENERY,
  SCENE_ZONES,
} from '../../config/sceneSchema.js';
import { getSceneryDraw } from './scenery/sceneryDispatch.js';

/**
 * All non-gameplay world geometry: the static midground/foreground prefab
 * scenery, the per-tick spawned `world.scenery` items (split into a
 * structural pass and an organic pass so walls always sit behind shrubs),
 * the per-side foreground garden gradient + ambient motes, and the
 * dispatcher that paints every individual scenery asset type.
 */
export class SceneryRenderer {
  constructor({ ctx, projection, assets, sprites, paint }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.sprites = sprites;
    this.paint = paint;
    this._drawDeps = { sprites, paint };
    this._structural = [];
    this._organic = [];
  }

  render(world) {
    this.#midgroundTerraces(world);
    this.#foregroundGarden(world.scrollOffset, world);

    // Reuse the two scratch arrays — clearing length to 0 keeps the same
    // backing storage and avoids the per-frame allocation of two new arrays.
    const structural = this._structural;
    const organic = this._organic;
    structural.length = 0;
    organic.length = 0;
    for (const item of world.scenery) {
      if (this.#isStructural(item)) structural.push(item);
      else organic.push(item);
    }
    structural.sort(distanceFarToNear);
    organic.sort(distanceFarToNear);
    for (const item of structural) this.#scenery(item, world, LAYERS.FOREGROUND_DECOR);
    for (const item of organic) this.#scenery(item, world, LAYERS.FOREGROUND_DECOR);

    this.#foregroundFrame(world);
  }

  // ── Static prefab layers ────────────────────────────────────────────────────

  #midgroundTerraces(world) {
    for (const item of MIDGROUND_SCENERY) this.#drawComposedSceneryItem(item, world, LAYERS.MIDGROUND_TERRAIN, 0.92);
  }

  #foregroundFrame(world) {
    for (const item of FOREGROUND_FRAME_SCENERY) this.#drawComposedSceneryItem(item, world, LAYERS.FOREGROUND_DECOR, 0.95);
  }

  #drawComposedSceneryItem(item, world, layer, alpha = 1) {
    const p = this.#projectWithParallax(item.lane, item.distance, world, layer);
    const layerBoost = layer === LAYERS.MIDGROUND_TERRAIN ? 1.12 : layer === LAYERS.FOREGROUND_DECOR ? 1.06 : 1;
    const scale = p.scale * (item.scale ?? item.visualScale ?? 1) * layerBoost;
    const y = p.sy + (item.yOffset ?? 0) * scale;
    this.#drawSceneryType(item.assetType ?? item.type, p.sx, y, scale, item.variant, alpha);
  }

  // ── Dynamic per-side scenery ────────────────────────────────────────────────

  #isStructural(s) {
    return s.laneBand === LANE_BANDS.STRUCTURE
      || s.zone === SCENE_ZONES.STRUCTURE_LEFT
      || s.zone === SCENE_ZONES.STRUCTURE_RIGHT;
  }

  #scenery(item, world, layer) {
    if (item.distance < -5.5) return;
    const p = this.#projectWithParallax(item.lane, item.distance, world, layer);
    const scale = p.scale * item.visualScale;
    const y = p.sy + item.yOffset * scale;

    const isStructural = this.#isStructural(item);
    const nearFade = isStructural ? 1 : Math.max(0, Math.min(1, (item.distance + 5.5) / 12));
    const farFade = Math.max(0.62, Math.min(1, p.scale * 3.1));
    let alpha = nearFade * farFade;
    if (item.laneBand === LANE_BANDS.SHOULDER) alpha *= 0.74;
    // Extra fade for shoulder items approaching the player — prevents close-range clipping reads.
    if (item.laneBand === LANE_BANDS.SHOULDER && item.distance < 16) {
      alpha *= Math.max(0, item.distance / 16);
    }
    if (!isStructural && layer === LAYERS.FOREGROUND_DECOR && this.#intrudesOnGameplayCorridor(p.sx, scale)) {
      // Fade intruders to near-invisible — close items disappear completely, distant ones stay subtle.
      alpha = Math.min(alpha, (item.distance / 20) * 0.22);
    }
    if (item.distance < 10 && (item.assetType === 'tree_round' || item.assetType === 'purple_flower_single' || item.assetType === 'mushroom_red_big')) alpha *= 0.82;
    if (alpha <= 0.03) return;

    const mirrored = isStructural && item.lane > 0;
    this.#drawSceneryType(item.assetType ?? item.type, p.sx, y, scale, item.variant, alpha, mirrored);
  }

  #intrudesOnGameplayCorridor(x, scale) {
    const center = this.projection.width / 2;
    const safeHalfWidth = roadBaseHalfWidth(this.projection) * 0.72;
    return Math.abs(x - center) < safeHalfWidth + 80 * scale;
  }

  #projectWithParallax(lane, distance, world, layer) {
    const projected = this.projection.project(lane, distance);
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
    for (const side of [-1, 1]) {
      const edgeX = vpX + side * baseHalf;
      const outerX = side < 0 ? 0 : p.width;
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, 'rgba(58,150,46,0.00)');
      grad.addColorStop(0.45, 'rgba(37,126,38,0.32)');
      grad.addColorStop(1, 'rgba(20,86,33,0.72)');
      ctx.fillStyle = grad;
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
    if (mirrored) {
      this.ctx.translate(x, 0);
      this.ctx.scale(-1, 1);
      this.ctx.translate(-x, 0);
    }
    draw(this._drawDeps, x, y, scale, variant);
    this.ctx.restore();
  }
}

function distanceFarToNear(a, b) {
  return b.distance - a.distance;
}
