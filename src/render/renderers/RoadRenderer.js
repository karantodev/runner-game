import { roadBaseHalfWidth, roadTopHalfWidth } from '../helpers.js';

/**
 * Painted ground + perspective road (trapezoid, scrolling stripe bands,
 * shoulder strips, dashed lane lines, edge highlights).
 *
 * Phase 3a keeps the implementation 1:1 with the original RenderSystem
 * methods. Phase 3b will move the static portion onto an offscreen canvas.
 */
export class RoadRenderer {
  constructor({ ctx, projection, assets, gradients }) {
    this.ctx = ctx;
    this.projection = projection;
    this.assets = assets;
    this.gradients = gradients;
  }

  render(world) {
    this.#ground();
    this.#road(world.scrollOffset);
  }

  #ground() {
    const ctx = this.ctx;
    const { width, height } = this.projection;
    const startY = this.gradients.gradients.groundStartY;

    ctx.fillStyle = this.gradients.gradients.ground;
    ctx.fillRect(0, startY, width, height - startY);

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

  #road(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    const vpX = p.width / 2;
    const vpY = p.roadVanishY;
    const baseHalf = roadBaseHalfWidth(p);
    const topHalf = roadTopHalfWidth(p);

    ctx.fillStyle = this.gradients.gradients.road;
    ctx.beginPath();
    ctx.moveTo(vpX - topHalf, vpY);
    ctx.lineTo(vpX + topHalf, vpY);
    ctx.lineTo(vpX + baseHalf, p.groundY);
    ctx.lineTo(vpX - baseHalf, p.groundY);
    ctx.closePath();
    ctx.fill();

    // Perspective-correct scrolling stripe surface — no image dependency.
    const numBands = 98;
    const STRIPE_PERIOD = 6.2; // world units per full stripe repeat
    for (let i = 0; i < numBands; i += 1) {
      const s1 = Math.max(0.010, i / numBands);
      const s2 = Math.max(0.010, (i + 1) / numBands);
      const d1 = p.focal * (1 - s1) / s1;
      const halfW1 = topHalf + (baseHalf - topHalf) * s1;
      const halfW2 = topHalf + (baseHalf - topHalf) * s2;
      const y1 = vpY + (p.groundY - vpY) * s1;
      const y2 = vpY + (p.groundY - vpY) * s2;
      const bandH = Math.max(1, Math.ceil(y2 - y1));
      const halfW = (halfW1 + halfW2) * 0.5;
      const tMid = (s1 + s2) * 0.5;

      const rawV = (d1 + scrollOffset) % STRIPE_PERIOD;
      const v = ((rawV % STRIPE_PERIOD) + STRIPE_PERIOD) % STRIPE_PERIOD / STRIPE_PERIOD;

      ctx.fillStyle = v < 0.50
        ? `rgba(168,244,100,${0.07 + 0.22 * tMid})`
        : `rgba(32,96,30,${0.04 + 0.12 * tMid})`;
      ctx.fillRect(vpX - halfW, y1, halfW * 2, bandH);

      if (i > 14) {
        const cols = 12;
        for (let c = -cols; c <= cols; c += 1) {
          if ((c + i) % 3 !== 0) continue;
          const laneT = c / cols;
          const x = vpX + laneT * (halfW1 + halfW2) * 0.48;
          const w = Math.max(1, 9 * s2);
          const h = Math.max(1, 5 * s2);
          const alpha = 0.08 + 0.16 * s2;
          ctx.fillStyle = (c + i) % 2 === 0 ? `rgba(222,246,126,${alpha})` : `rgba(28,102,38,${alpha})`;
          ctx.fillRect(x - w / 2, (y1 + y2) / 2 - h / 2, w, h);
        }
      }
    }

    this.#roadShoulders(scrollOffset, topHalf);
    this.#laneDashes(scrollOffset);
    this.#roadEdges(topHalf);
  }

  #roadShoulders(scrollOffset, topHalf) {
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
        const near = p.project(side * shoulderOuter, Math.max(0, dStart));
        const farP = p.project(side * shoulderOuter, dEnd);
        const innerNear = p.project(side * laneOuter, Math.max(0, dStart));
        const innerFar = p.project(side * laneOuter, dEnd);
        const alpha = 0.18 + 0.40 * near.scale;
        const drewShoulder = this.#drawQuadSprite(
          shoulderKey,
          innerNear.sx, innerNear.sy,
          near.sx, near.sy,
          farP.sx, farP.sy,
          innerFar.sx, innerFar.sy,
          Math.min(0.92, alpha + 0.12),
        );
        if (!drewShoulder) {
          ctx.fillStyle = `rgba(206,235,92,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(innerNear.sx, innerNear.sy);
          ctx.lineTo(near.sx, near.sy);
          ctx.lineTo(farP.sx, farP.sy);
          ctx.lineTo(innerFar.sx, innerFar.sy);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Tiny scrolling grass blades at the inner road-shoulder edge
      for (let d = -offset * 0.7; d < far * 0.75; d += period * 0.58) {
        if (d < 0) continue;
        const ep = p.project(side * laneOuter, d);
        if (ep.scale < 0.10) continue;
        const h = Math.max(1, Math.round(ep.scale * 9));
        const w = Math.max(1, Math.round(ep.scale * 2.5));
        const a = Math.min(0.46, 0.12 + 0.40 * ep.scale);
        ctx.fillStyle = `rgba(48,168,40,${a})`;
        ctx.fillRect(ep.sx - (side < 0 ? w : 0), ep.sy - h, w, h);
        ctx.fillStyle = `rgba(72,208,56,${a * 0.6})`;
        ctx.fillRect(ep.sx + side * w, ep.sy - Math.max(1, Math.round(h * 0.55)), Math.max(1, w - 1), Math.max(1, Math.round(h * 0.55)));
      }
    }

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#e8ffb8';
    ctx.beginPath();
    ctx.moveTo(p.width / 2 - topHalf * 1.0, p.roadVanishY + 3);
    ctx.lineTo(p.width / 2 + topHalf * 1.0, p.roadVanishY + 3);
    ctx.lineTo(p.width / 2 + topHalf * 2.0, p.roadVanishY + 30);
    ctx.lineTo(p.width / 2 - topHalf * 2.0, p.roadVanishY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  #laneDashes(scrollOffset) {
    const ctx = this.ctx;
    const p = this.projection;
    const far = 1300;
    for (const laneLine of [-0.5, 0.5]) {
      const dashLength = 7.2;
      const gapLength = 7.0;
      const period = dashLength + gapLength;
      const offset = scrollOffset % period;
      for (let dStart = -offset; dStart < far; dStart += period) {
        const dEnd = dStart + dashLength;
        if (dEnd < 0) continue;
        const p1 = p.project(laneLine, Math.max(0, dStart));
        const p2 = p.project(laneLine, dEnd);
        const w1 = Math.max(0.45, 4.6 * p1.scale);
        const w2 = Math.max(0.25, 4.6 * p2.scale);
        const alpha = 0.48 + 0.38 * p1.scale;
        const drewDivider = this.#drawQuadSprite(
          'roadDividerYellow',
          p1.sx - w1, p1.sy,
          p1.sx + w1, p1.sy,
          p2.sx + w2, p2.sy,
          p2.sx - w2, p2.sy,
          Math.min(0.96, alpha + 0.08),
        );
        if (!drewDivider) {
          ctx.fillStyle = `rgba(236,255,168,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.sx - w1, p1.sy);
          ctx.lineTo(p1.sx + w1, p1.sy);
          ctx.lineTo(p2.sx + w2, p2.sy);
          ctx.lineTo(p2.sx - w2, p2.sy);
          ctx.closePath();
          ctx.fill();
        }
      }
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
    ctx.imageSmoothingEnabled = false;
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

  #roadEdges(topHalf) {
    const ctx = this.ctx;
    const p = this.projection;
    const vpX = p.width / 2;
    const vpY = p.roadVanishY;
    const baseHalf = roadBaseHalfWidth(p);
    ctx.save();
    ctx.strokeStyle = this.gradients.gradients.roadEdge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(vpX - baseHalf, p.groundY);
    ctx.lineTo(vpX - topHalf, vpY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vpX + baseHalf, p.groundY);
    ctx.lineTo(vpX + topHalf, vpY);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#194f24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vpX - baseHalf - 8, p.groundY);
    ctx.lineTo(vpX - topHalf - 4, vpY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vpX + baseHalf + 8, p.groundY);
    ctx.lineTo(vpX + topHalf + 4, vpY);
    ctx.stroke();
    ctx.restore();
  }
}
