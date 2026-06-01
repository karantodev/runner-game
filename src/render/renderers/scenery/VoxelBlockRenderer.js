const BLOCK_STYLES = new Set(['sprite', 'voxel']);

const PALETTES = Object.freeze({
  grass: Object.freeze({
    front: '#9a572d',
    side: '#713b25',
    top: '#76c936',
    lip: '#4d9d2d',
    edge: '#315f26',
    accent: '#d78437',
    detail: '#61351f',
    highlight: '#a7df4c',
    outline: '#27391d',
  }),
  purple: Object.freeze({
    front: '#7444b5',
    side: '#4c2d82',
    top: '#a16bd9',
    lip: '#5d3595',
    edge: '#37205c',
    accent: '#9361cb',
    detail: '#4c2a79',
    highlight: '#bb88ea',
    outline: '#2b1948',
  }),
  stone: Object.freeze({
    front: '#77706d',
    side: '#504b4b',
    top: '#aaa29b',
    lip: '#615c5a',
    edge: '#403b3c',
    accent: '#938b85',
    detail: '#585353',
    highlight: '#c4bbb1',
    outline: '#343031',
  }),
  question: Object.freeze({
    front: '#d78a16',
    side: '#9d5b10',
    top: '#ffc742',
    lip: '#bb7110',
    edge: '#75400e',
    accent: '#f2aa24',
    detail: '#70400d',
    highlight: '#ffe064',
    outline: '#58320d',
  }),
});

function normalizedStyle(style) {
  if (style === '3d') return 'voxel';
  if (style === '2d') return 'sprite';
  return BLOCK_STYLES.has(style) ? style : 'sprite';
}

function snap(value) {
  return Math.round(value);
}

/**
 * Lightweight Canvas-only 3D-like blocks. This is deliberately not a
 * WebGL scene: the runner keeps its sprite pipeline and collision model,
 * while modular structures get one controllable source of truth for
 * proportions, palettes and road-facing perspective.
 */
export class VoxelBlockRenderer {
  constructor(ctx, { style = 'sprite' } = {}) {
    this.ctx = ctx;
    this.style = normalizedStyle(style);
  }

  get enabled() {
    return this.style === 'voxel';
  }

  setStyle(style) {
    this.style = normalizedStyle(style);
    return this.style;
  }

  toggleStyle() {
    return this.setStyle(this.enabled ? 'sprite' : 'voxel');
  }

  drawCube(x, y, scale = 1, {
    material = 'grass',
    side = -1,
    variant = 0,
    width = 92,
    height = 68,
    depth = 18,
    topRise = 14,
  } = {}) {
    const ctx = this.ctx;
    const palette = PALETTES[material] ?? PALETTES.grass;
    const direction = side > 0 ? -1 : 1;
    const w = Math.max(10, snap(width * scale));
    const h = Math.max(8, snap(height * scale));
    const d = Math.max(3, snap(depth * scale));
    const rise = Math.max(2, snap(topRise * scale));
    const left = snap(x - w / 2);
    const right = left + w;
    const top = snap(y - h);
    const bottom = snap(y);
    const backShift = direction * d;

    ctx.save();
    ctx.lineJoin = 'miter';
    ctx.lineWidth = Math.max(1, snap(scale * 2));
    ctx.strokeStyle = palette.outline;

    this.#polygon([
      [direction > 0 ? right : left, top],
      [direction > 0 ? right + d : left - d, top - rise],
      [direction > 0 ? right + d : left - d, bottom - rise],
      [direction > 0 ? right : left, bottom],
    ], palette.side);

    this.#polygon([
      [left, top],
      [left + backShift, top - rise],
      [right + backShift, top - rise],
      [right, top],
    ], palette.top);

    ctx.fillStyle = palette.front;
    ctx.fillRect(left, top, w, h);
    ctx.strokeRect(left, top, w, h);

    this.#frontTexture(left, top, w, h, scale, palette, material, variant);
    this.#topTexture(left, right, top, rise, backShift, scale, palette);
    ctx.restore();
    return true;
  }

  drawPlatform(x, y, scale = 1, {
    material = 'grass',
    side = -1,
    variant = 0,
    units = 3,
  } = {}) {
    return this.drawCube(x, y, scale, {
      material,
      side,
      variant,
      width: 72 + Math.max(1, units) * 58,
      height: material === 'grass' ? 46 : 54,
      depth: 20,
      topRise: 14,
    });
  }

  drawSteps(x, y, scale = 1, {
    material = 'stone',
    side = -1,
    variant = 0,
    steps = 3,
  } = {}) {
    const direction = side > 0 ? -1 : 1;
    const stepScale = scale * 0.78;
    for (let i = steps - 1; i >= 0; i -= 1) {
      this.drawCube(
        x + direction * i * 35 * scale,
        y - i * 9 * scale,
        stepScale,
        {
          material,
          side,
          variant: variant + i,
          width: 82,
          height: 52 + i * 25,
          depth: 16,
          topRise: 12,
        },
      );
    }
    return true;
  }

  drawQuestionCube(x, y, scale = 1) {
    this.drawCube(x, y, scale, {
      material: 'question',
      width: 74,
      height: 64,
      depth: 14,
      topRise: 11,
    });
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#fff2aa';
    ctx.strokeStyle = '#70400d';
    ctx.lineWidth = Math.max(1, snap(scale * 2));
    ctx.font = `bold ${Math.max(10, snap(34 * scale))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('?', snap(x), snap(y - 30 * scale));
    ctx.fillText('?', snap(x), snap(y - 30 * scale));
    ctx.restore();
    return true;
  }

  #polygon(points, fill) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(snap(points[0][0]), snap(points[0][1]));
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(snap(points[i][0]), snap(points[i][1]));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  #frontTexture(left, top, w, h, scale, palette, material, variant) {
    const ctx = this.ctx;
    const px = Math.max(1, snap(3 * scale));
    if (material === 'grass') {
      const lipH = Math.max(2, snap(10 * scale));
      ctx.fillStyle = palette.lip;
      ctx.fillRect(left + 1, top + 1, w - 2, lipH);
      ctx.fillStyle = palette.highlight;
      for (let x = left + px; x < left + w - px; x += px * 4) {
        ctx.fillRect(x, top + 1, px * 2, px);
      }
      ctx.fillStyle = palette.detail;
      for (let i = 0; i < 8; i += 1) {
        const rx = left + px + ((i * 17 + variant * 7) % Math.max(px, w - px * 4));
        const ry = top + lipH + px + ((i * 13 + variant * 5) % Math.max(px, h - lipH - px * 3));
        ctx.fillRect(snap(rx), snap(ry), px * 2, px);
      }
      ctx.fillStyle = palette.accent;
      for (let i = 0; i < 5; i += 1) {
        const rx = left + px + ((i * 23 + variant * 11) % Math.max(px, w - px * 4));
        const ry = top + lipH + px + ((i * 19 + variant * 3) % Math.max(px, h - lipH - px * 3));
        ctx.fillRect(snap(rx), snap(ry), px, px);
      }
      return;
    }

    const rowH = Math.max(px * 3, snap(16 * scale));
    const colW = Math.max(px * 5, snap(30 * scale));
    ctx.strokeStyle = palette.detail;
    ctx.lineWidth = px;
    for (let rowY = top + rowH; rowY < top + h; rowY += rowH) {
      ctx.beginPath();
      ctx.moveTo(left, rowY);
      ctx.lineTo(left + w, rowY);
      ctx.stroke();
    }
    let row = 0;
    for (let rowY = top; rowY < top + h; rowY += rowH) {
      const offset = row % 2 ? colW / 2 : 0;
      for (let colX = left + offset; colX < left + w; colX += colW) {
        ctx.beginPath();
        ctx.moveTo(snap(colX), rowY);
        ctx.lineTo(snap(colX), Math.min(top + h, rowY + rowH));
        ctx.stroke();
      }
      row += 1;
    }
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(left + px * 2, top + px * 2, Math.max(px * 2, snap(w * 0.23)), px);
  }

  #topTexture(left, right, top, rise, backShift, scale, palette) {
    const ctx = this.ctx;
    const px = Math.max(1, snap(3 * scale));
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = px;
    ctx.beginPath();
    ctx.moveTo(left + backShift, top - rise + px);
    ctx.lineTo(right + backShift, top - rise + px);
    ctx.stroke();
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(
      snap(Math.min(left, left + backShift) + px * 2),
      snap(top - rise + px * 2),
      Math.max(px * 3, snap((right - left) * 0.28)),
      px,
    );
  }
}

