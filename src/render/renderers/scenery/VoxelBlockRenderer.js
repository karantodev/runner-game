const BLOCK_STYLES = new Set(['sprite', 'voxel']);

// v4.26 — M15A art-direction polish. Richer, more contrasty material palettes:
// brighter saturated tops + highlights, deeper sides + crisper darker outlines,
// warmer dirt and a more premium violet — pushing material definition and
// light→dark separation toward the reference WITHOUT going neon.
const PALETTES = Object.freeze({
  grass: Object.freeze({
    front: '#a35c27',
    side: '#5b2d1a',
    top: '#7ed53d',
    lip: '#57b232',
    edge: '#27531f',
    accent: '#e28f3b',
    detail: '#4f2b18',
    highlight: '#bef15e',
    outline: '#1b2a14',
  }),
  purple: Object.freeze({
    front: '#7b3ec6',
    side: '#422178',
    top: '#ad71e6',
    lip: '#5f34a2',
    edge: '#2b1950',
    accent: '#9d68db',
    detail: '#391f62',
    highlight: '#cd98f7',
    outline: '#1f123d',
  }),
  stone: Object.freeze({
    front: '#746d6a',
    side: '#4a4646',
    top: '#aaa29b',
    lip: '#615c5a',
    edge: '#3b3637',
    accent: '#938b85',
    detail: '#545050',
    highlight: '#c8bfb5',
    outline: '#2a2727',
  }),
  wood: Object.freeze({
    front: '#b8662d',
    side: '#74401f',
    top: '#d58a3d',
    lip: '#8f4b23',
    edge: '#4c2a18',
    accent: '#e3a456',
    detail: '#663719',
    highlight: '#f1bd67',
    outline: '#2b1a12',
  }),
  leaf: Object.freeze({
    front: '#3fa34d',
    side: '#1f6f38',
    top: '#74c957',
    lip: '#2e8c43',
    edge: '#174b2b',
    accent: '#5dbd48',
    detail: '#1b5a33',
    highlight: '#9ce36a',
    outline: '#123720',
  }),
  question: Object.freeze({
    front: '#e0900f',
    side: '#94530c',
    top: '#ffce4d',
    lip: '#bb7110',
    edge: '#6e3c0c',
    accent: '#f7b22b',
    detail: '#6a3c0c',
    highlight: '#ffe87c',
    outline: '#482809',
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

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Lightweight Canvas-only 3D-like blocks. This is deliberately not a
 * WebGL scene: the runner keeps its sprite pipeline and collision model,
 * while modular structures get one controllable source of truth for
 * proportions, palettes and road-facing perspective.
 */
export class VoxelBlockRenderer {
  constructor(ctx, { style = 'sprite', threeModels = null } = {}) {
    this.ctx = ctx;
    this.style = normalizedStyle(style);
    this.threeModels = threeModels;
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
    if (this.#drawThree('cube', x, y, scale, { material, side, variant, width, height })) return true;
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
    this.#contactShadow(x, y + 2 * scale, w * 0.62, Math.max(4, h * 0.11), scale, 0.20);
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
    this.#materialAccents(left, top, w, h, scale, palette, material, variant);
    // v4.26 — M15A: bottom-of-front depth band. A darker base strip gives the
    // face a light→dark vertical read (ambient occlusion at the planting line),
    // so blocks/bricks read 3D and grounded instead of flat. One fillRect/block;
    // uses the side shade and inherits the entity's globalAlpha (fades with it).
    const bandH = Math.max(2, snap(h * 0.2));
    ctx.fillStyle = palette.side;
    ctx.fillRect(left + 1, top + h - bandH, w - 2, bandH - 1);
    this.#topTexture(left, right, top, rise, backShift, scale, palette);
    this.#blockBevel(left, top, w, h, scale, palette);
    this.#sideRibs(direction > 0 ? right : left, top, h, d, rise, direction, scale, palette);
    ctx.restore();
    return true;
  }

  drawPlatform(x, y, scale = 1, {
    material = 'grass',
    side = -1,
    variant = 0,
    units = 3,
  } = {}) {
    if (this.#drawThree('platform', x, y, scale, { material, side, variant })) return true;
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
    if (this.#drawThree('steps', x, y, scale, { material, side, variant })) return true;
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

  drawQuestionCube(x, y, scale = 1, { variant = 0 } = {}) {
    if (this.#drawThree('question', x, y, scale, { variant })) return true;
    this.drawCube(x, y, scale, {
      material: 'question',
      variant,
      width: 74,
      height: 64,
      depth: 14,
      topRise: 11,
    });
    const ctx = this.ctx;
    ctx.save();
    this.#pixelQuestionGlyph(x, y - 30 * scale, scale);
    ctx.fillStyle = '#ffe87c';
    const stud = Math.max(2, snap(5 * scale));
    for (const [dx, dy] of [[-24, -50], [24, -50], [-24, -12], [24, -12]]) {
      ctx.fillRect(snap(x + dx * scale - stud / 2), snap(y + dy * scale - stud / 2), stud, stud);
    }
    ctx.restore();
    return true;
  }

  drawHangingPlatform(x, y, scale = 1, {
    side = -1,
    variant = 0,
  } = {}) {
    if (this.#drawThree('hangingPlatform', x, y, scale, { side, variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    const direction = side > 0 ? -1 : 1;
    const palette = PALETTES.wood;
    const deckY = y - 18 * s;

    ctx.save();
    this.#contactShadow(x, y + 6 * s, 74 * s, 11 * s, s, 0.18);
    this.#board3d(x, deckY, 126 * s, 18 * s, 9 * s, direction, palette);
    this.#board3d(x - 36 * s, deckY + 7 * s, 22 * s, 20 * s, 5 * s, direction, palette);
    this.#board3d(x + 36 * s, deckY + 7 * s, 22 * s, 20 * s, 5 * s, direction, palette);
    this.#plankLines(x, deckY, 126 * s, 18 * s, s, palette);

    ctx.strokeStyle = '#1b5a33';
    ctx.lineWidth = Math.max(1, snap(3 * s));
    for (let i = 0; i < 4; i += 1) {
      const vx = x - 48 * s + i * 32 * s + direction * ((variant + i) % 2) * 4 * s;
      ctx.beginPath();
      ctx.moveTo(snap(vx), snap(deckY - 70 * s));
      ctx.bezierCurveTo(snap(vx + direction * 13 * s), snap(deckY - 47 * s), snap(vx - direction * 10 * s), snap(deckY - 28 * s), snap(vx + direction * 3 * s), snap(deckY - 4 * s));
      ctx.stroke();
      this.#leafBlade(vx + direction * 8 * s, deckY - 36 * s, 8 * s, 15 * s, direction * 0.65, PALETTES.leaf.top, PALETTES.leaf.outline);
      this.#leafBlade(vx - direction * 6 * s, deckY - 18 * s, 7 * s, 13 * s, direction * -0.55, PALETTES.leaf.front, PALETTES.leaf.outline);
    }

    this.#grassTuft(x - 52 * s, y + 2 * s, s * 0.6, variant);
    this.#grassTuft(x + 50 * s, y + 2 * s, s * 0.58, variant + 2);
    ctx.restore();
    return true;
  }

  drawSmallFlower(x, y, scale = 1, {
    variant = 0,
  } = {}) {
    if (this.#drawThree('smallFlower', x, y, scale, { variant })) return true;
    const s = scale;
    const ctx = this.ctx;
    const purple = (variant ?? 0) % 2 === 1;
    ctx.save();
    this.#contactShadow(x, y + 1 * s, 13 * s, 3 * s, s, 0.14);
    ctx.strokeStyle = PALETTES.leaf.outline;
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x), snap(y));
    ctx.lineTo(snap(x + (((variant ?? 0) % 3) - 1) * 3 * s), snap(y - 31 * s));
    ctx.stroke();
    this.#leafBlade(x - 7 * s, y - 12 * s, 6 * s, 13 * s, -0.65, PALETTES.leaf.front, null);
    this.#leafBlade(x + 8 * s, y - 17 * s, 6 * s, 12 * s, 0.62, PALETTES.leaf.top, null);
    this.#flowerDot(x, y - 36 * s, Math.max(2, 6 * s), purple ? '#b05cff' : '#ffd94d');
    ctx.restore();
    return true;
  }

  drawSprout(x, y, scale = 1, {
    variant = 0,
  } = {}) {
    if (this.#drawThree('sprout', x, y, scale, { variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    ctx.save();
    this.#contactShadow(x, y + 1 * s, 18 * s, 4 * s, s, 0.14);
    this.#ellipse(x, y - 2 * s, 20 * s, 5 * s, '#5b2d1a', '#2b1a12');
    ctx.strokeStyle = PALETTES.leaf.outline;
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x), snap(y - 4 * s));
    ctx.lineTo(snap(x + ((variant & 1) ? 3 : -3) * s), snap(y - 32 * s));
    ctx.stroke();
    this.#leafBlade(x - 8 * s, y - 25 * s, 9 * s, 18 * s, -0.8, PALETTES.leaf.top, PALETTES.leaf.outline);
    this.#leafBlade(x + 9 * s, y - 27 * s, 9 * s, 18 * s, 0.75, PALETTES.leaf.front, PALETTES.leaf.outline);
    ctx.restore();
    return true;
  }

  drawWheat(x, y, scale = 1, {
    dry = false,
    variant = 0,
  } = {}) {
    if (this.#drawThree('wheat', x, y, scale, { dry, variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    const stem = dry ? '#b58a37' : '#d6aa38';
    const head = dry ? '#d8b24b' : '#f1ca4b';
    ctx.save();
    this.#contactShadow(x, y + 1 * s, 38 * s, 6 * s, s, 0.16);
    ctx.strokeStyle = '#5a3b17';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    for (let i = 0; i < 7; i += 1) {
      const bx = x + (i - 3) * 8 * s;
      const topY = y - (46 + ((i + variant) % 3) * 8) * s;
      ctx.strokeStyle = stem;
      ctx.beginPath();
      ctx.moveTo(snap(bx), snap(y));
      ctx.lineTo(snap(bx + (i - 3) * 2 * s), snap(topY));
      ctx.stroke();
      ctx.fillStyle = head;
      for (let k = 0; k < 4; k += 1) {
        const py = topY + k * 6 * s;
        this.#ellipse(bx - 4 * s, py, 4 * s, 3 * s, head, null);
        this.#ellipse(bx + 4 * s, py + 2 * s, 4 * s, 3 * s, '#f7d86e', null);
      }
    }
    ctx.restore();
    return true;
  }

  drawLeafClump(x, y, scale = 1, {
    round = false,
    variant = 0,
  } = {}) {
    if (this.#drawThree('leafClump', x, y, scale, { round, variant })) return true;
    return this.drawBush(x, y, scale * (round ? 0.72 : 0.62), {
      large: false,
      flowers: false,
      variant,
    });
  }

  drawGrassTuft(x, y, scale = 1, {
    large = false,
    dry = false,
    variant = 0,
  } = {}) {
    if (this.#drawThree('grassTuft', x, y, scale, { large, dry, variant })) return true;
    const ctx = this.ctx;
    const s = scale * (large ? 1.12 : 0.92);
    ctx.save();
    this.#contactShadow(x, y + 1 * s, (large ? 42 : 28) * s, 5 * s, s, dry ? 0.12 : 0.16);
    if (dry) {
      ctx.strokeStyle = '#b98932';
      ctx.lineWidth = Math.max(1, snap(2 * s));
      for (let i = 0; i < 9; i += 1) {
        const bx = x + (i - 4) * 7 * s;
        const lean = ((i + variant) % 3 - 1) * 8 * s;
        ctx.beginPath();
        ctx.moveTo(snap(bx), snap(y));
        ctx.lineTo(snap(bx + lean), snap(y - (28 + (i % 3) * 9) * s));
        ctx.stroke();
      }
    } else {
      this.#grassTuft(x, y, s, variant);
      this.#grassTuft(x - 16 * s, y + 1 * s, s * 0.72, variant + 1);
      if (large) this.#grassTuft(x + 16 * s, y + 1 * s, s * 0.74, variant + 2);
    }
    ctx.restore();
    return true;
  }

  drawVineBarrier(cx, y, width, scale = 1, {
    phase = 0,
  } = {}) {
    if (this.#drawThree('vineBarrier', cx, y, scale, { width, phase })) return true;
    const ctx = this.ctx;
    const s = scale;
    const w = Math.max(40, width);
    const left = cx - w / 2;
    const right = cx + w / 2;
    const baseY = y - 12 * s;
    const amp = 10 * s;

    ctx.save();
    this.#contactShadow(cx, y + 1 * s, w * 0.48, 6 * s, s, 0.18);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#123720';
    ctx.lineWidth = Math.max(4, snap(18 * s));
    this.#vinePath(left, right, baseY + 2 * s, amp, phase);
    ctx.stroke();

    ctx.strokeStyle = '#2b7f35';
    ctx.lineWidth = Math.max(3, snap(13 * s));
    this.#vinePath(left, right, baseY, amp, phase);
    ctx.stroke();

    ctx.strokeStyle = '#7ad94a';
    ctx.lineWidth = Math.max(1, snap(4 * s));
    this.#vinePath(left + 8 * s, right - 8 * s, baseY - 4 * s, amp * 0.72, phase + 1.1);
    ctx.stroke();

    for (let i = 1; i < 9; i += 1) {
      const t = i / 9;
      const x = left + w * t;
      const yy = baseY - Math.sin(t * Math.PI * 3 + phase) * amp;
      const dir = i % 2 ? -1 : 1;
      this.#leafBlade(x + dir * 11 * s, yy - 8 * s, 9 * s, 18 * s, dir * 0.82, i % 3 ? PALETTES.leaf.top : PALETTES.leaf.front, PALETTES.leaf.outline);
      ctx.fillStyle = '#1b4a23';
      ctx.fillRect(snap(x - 2 * s), snap(yy - 2 * s), Math.max(1, snap(4 * s)), Math.max(1, snap(4 * s)));
    }

    ctx.restore();
    return true;
  }

  drawOverhang(cx, bottomY, width, scale = 1, {
    variant = 'branch',
    accent = 0,
  } = {}) {
    if (this.#drawThree('overhang', cx, bottomY, scale, { width, variant, accent })) return true;
    const ctx = this.ctx;
    const s = scale;
    const w = Math.max(80, width);
    if (variant === 'web') {
      return this.#drawWebOverhang(cx, bottomY, w, s, accent);
    }

    const wood = PALETTES.wood;
    const y = bottomY - 10 * s;
    const left = cx - w / 2;
    const right = cx + w / 2;

    ctx.save();
    this.#contactShadow(cx, bottomY + 8 * s, w * 0.36, 7 * s, s, 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(120,220,255,${0.34 * accent})`;
    ctx.shadowBlur = (5 + 12 * accent) * s;

    ctx.strokeStyle = wood.outline;
    ctx.lineWidth = Math.max(5, snap(26 * s));
    ctx.beginPath();
    ctx.moveTo(snap(left), snap(y - 38 * s));
    ctx.bezierCurveTo(snap(cx - w * 0.24), snap(y - 70 * s), snap(cx + w * 0.20), snap(y - 25 * s), snap(right), snap(y - 58 * s));
    ctx.stroke();

    ctx.strokeStyle = wood.front;
    ctx.lineWidth = Math.max(4, snap(18 * s));
    ctx.beginPath();
    ctx.moveTo(snap(left + 4 * s), snap(y - 39 * s));
    ctx.bezierCurveTo(snap(cx - w * 0.22), snap(y - 66 * s), snap(cx + w * 0.19), snap(y - 28 * s), snap(right - 4 * s), snap(y - 56 * s));
    ctx.stroke();

    ctx.strokeStyle = wood.highlight;
    ctx.lineWidth = Math.max(1, snap(4 * s));
    ctx.beginPath();
    ctx.moveTo(snap(left + w * 0.14), snap(y - 50 * s));
    ctx.bezierCurveTo(snap(cx - w * 0.06), snap(y - 60 * s), snap(cx + w * 0.16), snap(y - 37 * s), snap(right - w * 0.20), snap(y - 54 * s));
    ctx.stroke();

    for (let i = 0; i < 7; i += 1) {
      const t = (i + 0.5) / 7;
      const bx = left + w * t;
      const by = y - (42 + ((i + 1) % 3) * 7) * s;
      const dir = i % 2 ? -1 : 1;
      ctx.strokeStyle = PALETTES.leaf.outline;
      ctx.lineWidth = Math.max(1, snap(3 * s));
      ctx.beginPath();
      ctx.moveTo(snap(bx), snap(by));
      ctx.lineTo(snap(bx + dir * 20 * s), snap(by + 32 * s));
      ctx.stroke();
      this.#leafBlade(bx + dir * 22 * s, by + 24 * s, 11 * s, 22 * s, dir * 0.7, i % 2 ? PALETTES.leaf.top : PALETTES.leaf.front, PALETTES.leaf.outline);
    }
    ctx.restore();
    return true;
  }

  drawPickupFlower(x, y, scale = 1, {
    rare = false,
    rich = false,
  } = {}) {
    if (this.#drawThree('pickupFlower', x, y, scale, { rare, rich })) return true;
    const ctx = this.ctx;
    const s = scale;
    const petal = rare ? '#5ab8ff' : '#ffd54a';
    const petalDark = rare ? '#2754a8' : '#c78612';
    const center = rare ? '#e8f8ff' : '#fff2aa';
    const r = (rich ? 15 : 12) * s;
    ctx.save();
    this.#contactShadow(x, y + 1 * s, 14 * s, 4 * s, s, 0.16);
    ctx.strokeStyle = rare ? '#17395f' : '#6a3c0c';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x), snap(y));
    ctx.lineTo(snap(x), snap(y - 24 * s));
    ctx.stroke();
    this.#leafBlade(x - 9 * s, y - 9 * s, 7 * s, 14 * s, -0.7, PALETTES.leaf.front, null);
    this.#leafBlade(x + 9 * s, y - 13 * s, 7 * s, 14 * s, 0.7, PALETTES.leaf.top, null);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      this.#ellipse(x + Math.cos(a) * r * 0.62, y - 31 * s + Math.sin(a) * r * 0.44, r * 0.42, r * 0.28, i % 2 ? petal : petalDark, null);
    }
    this.#ellipse(x, y - 31 * s, r * 0.32, r * 0.24, center, '#70400d');
    this.#ellipse(x - r * 0.16, y - 35 * s, r * 0.13, r * 0.08, rare ? '#ffffff' : '#fff8c8', null);
    ctx.restore();
    return true;
  }

  drawHeartPickup(x, y, scale = 1) {
    if (this.#drawThree('heart', x, y + 18 * scale, scale, {})) return true;
    const ctx = this.ctx;
    const s = scale;
    ctx.save();
    this.#contactShadow(x, y + 21 * s, 24 * s, 6 * s, s, 0.18);
    ctx.fillStyle = '#8f1e2b';
    ctx.strokeStyle = '#4a1019';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x), snap(y + 18 * s));
    ctx.bezierCurveTo(snap(x - 34 * s), snap(y - 4 * s), snap(x - 26 * s), snap(y - 32 * s), snap(x - 7 * s), snap(y - 22 * s));
    ctx.bezierCurveTo(snap(x), snap(y - 36 * s), snap(x + 26 * s), snap(y - 32 * s), snap(x + 27 * s), snap(y - 8 * s));
    ctx.bezierCurveTo(snap(x + 27 * s), snap(y + 4 * s), snap(x + 15 * s), snap(y + 12 * s), snap(x), snap(y + 18 * s));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this.#ellipse(x - 10 * s, y - 13 * s, 7 * s, 4 * s, '#ff8fa1', null);
    this.#ellipse(x + 11 * s, y - 8 * s, 5 * s, 3 * s, '#c94150', null);
    ctx.restore();
    return true;
  }

  drawPowerPickup(x, y, scale = 1, {
    color = '#a7ff7e',
  } = {}) {
    if (this.#drawThree('power', x, y, scale, { color })) return true;
    const ctx = this.ctx;
    const s = scale;
    const w = 46 * s;
    const h = 42 * s;
    const d = 10 * s;
    const top = y - h;
    const left = x - w / 2;
    ctx.save();
    this.#contactShadow(x, y + 2 * s, 24 * s, 6 * s, s, 0.17);
    ctx.strokeStyle = '#173020';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    this.#polygon([[left, top], [left + d, top - d], [left + w + d, top - d], [left + w, top]], '#d6f7c5');
    this.#polygon([[left + w, top], [left + w + d, top - d], [left + w + d, y - d], [left + w, y]], '#4d8b4b');
    ctx.fillStyle = color;
    ctx.fillRect(snap(left), snap(top), snap(w), snap(h));
    ctx.strokeRect(snap(left), snap(top), snap(w), snap(h));
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(snap(left + 8 * s), snap(top + 8 * s), snap(w * 0.34), Math.max(2, snap(5 * s)));
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(snap(left + 2 * s), snap(y - 10 * s), snap(w - 4 * s), Math.max(2, snap(8 * s)));
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(snap(left + w * 0.72), snap(top + 7 * s));
    ctx.lineTo(snap(left + w * 0.92), snap(top + 16 * s));
    ctx.stroke();
    ctx.restore();
    return true;
  }

  drawFence(x, y, scale = 1, {
    side = -1,
    variant = 0,
  } = {}) {
    if (this.#drawThree('fence', x, y, scale, { side, variant })) return true;
    const ctx = this.ctx;
    const direction = side > 0 ? -1 : 1;
    const s = scale;
    const palette = PALETTES.wood;
    const postW = Math.max(6, snap(12 * s));
    const postDepth = Math.max(3, snap(6 * s));
    const railH = Math.max(4, snap(9 * s));
    const railDepth = Math.max(2, snap(5 * s));
    const postY = y - 4 * s;
    const posts = [-46, -16, 16, 46].map((offset, i) => ({
      x: x + offset * s + direction * i * 2 * s,
      h: (66 + ((variant + i) % 2) * 8) * s,
    }));

    ctx.save();
    this.#contactShadow(x, y + 3 * s, 66 * s, 8 * s, s, 0.18);
    ctx.lineJoin = 'miter';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.strokeStyle = palette.outline;

    this.#board3d(x + direction * 5 * s, y - 48 * s, 112 * s, railH, railDepth, direction, palette);
    this.#board3d(x - direction * 2 * s, y - 27 * s, 108 * s, railH, railDepth, direction, palette);
    for (const post of posts) {
      this.#board3d(post.x, postY, postW, post.h, postDepth, direction, palette);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(
        snap(post.x - postW * 0.30),
        snap(postY - post.h + 9 * s),
        Math.max(1, snap(3 * s)),
        snap(post.h * 0.46),
      );
      ctx.fillStyle = '#3a210f';
      ctx.fillRect(snap(post.x + postW * 0.18), snap(postY - post.h + 13 * s), Math.max(1, snap(2 * s)), Math.max(1, snap(2 * s)));
      ctx.fillRect(snap(post.x - postW * 0.05), snap(postY - 25 * s), Math.max(1, snap(2 * s)), Math.max(1, snap(2 * s)));
    }

    this.#grassTuft(x - 49 * s, y + 2 * s, s * 0.85, 4);
    this.#grassTuft(x - 18 * s, y + 1 * s, s * 0.78, 2);
    this.#grassTuft(x + 15 * s, y + 1 * s, s * 0.82, 1);
    this.#grassTuft(x + 47 * s, y + 2 * s, s * 0.86, 5);
    ctx.restore();
    return true;
  }

  drawPipe(x, y, scale = 1, {
    side = -1,
  } = {}) {
    if (this.#drawThree('pipe', x, y, scale, { side })) return true;
    const ctx = this.ctx;
    const s = scale;
    const direction = side > 0 ? -1 : 1;
    const outline = '#153215';
    const front = '#2aa43a';
    const sideCol = '#17682d';
    const top = '#73df55';
    const lip = '#1d7f31';
    const w = Math.max(26, snap(64 * s));
    const h = Math.max(34, snap(90 * s));
    const d = Math.max(5, snap(13 * s));
    const lipH = Math.max(13, snap(25 * s));

    ctx.save();
    this.#contactShadow(x, y + 3 * s, 36 * s, 8 * s, s, 0.22);
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.strokeStyle = outline;

    ctx.fillStyle = sideCol;
    ctx.fillRect(snap(x - w / 2 + direction * d), snap(y - h + lipH * 0.35), w, h - lipH * 0.25);
    ctx.strokeRect(snap(x - w / 2 + direction * d), snap(y - h + lipH * 0.35), w, h - lipH * 0.25);

    ctx.fillStyle = front;
    ctx.fillRect(snap(x - w / 2), snap(y - h + lipH * 0.56), w, h - lipH * 0.56);
    ctx.strokeRect(snap(x - w / 2), snap(y - h + lipH * 0.56), w, h - lipH * 0.56);

    ctx.fillStyle = lip;
    ctx.fillRect(snap(x - w * 0.58), snap(y - h + lipH * 0.25), snap(w * 1.16), lipH);
    ctx.strokeRect(snap(x - w * 0.58), snap(y - h + lipH * 0.25), snap(w * 1.16), lipH);
    this.#ellipse(x + direction * d * 0.45, y - h + lipH * 0.24, w * 0.62, 14 * s, top, outline);
    this.#ellipse(x + direction * d * 0.45, y - h + lipH * 0.24, w * 0.42, 8 * s, '#0d3b22', null);

    ctx.fillStyle = '#8bf276';
    ctx.fillRect(snap(x - w * 0.27), snap(y - h + lipH * 0.74), Math.max(2, snap(7 * s)), Math.max(8, snap(h * 0.44)));
    ctx.fillStyle = '#0d5729';
    ctx.fillRect(snap(x + w * 0.24), snap(y - h + lipH * 0.82), Math.max(2, snap(4 * s)), Math.max(8, snap(h * 0.54)));
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(snap(x - w * 0.07), snap(y - h + lipH * 1.2), Math.max(1, snap(3 * s)), Math.max(8, snap(h * 0.50)));
    ctx.restore();
    return true;
  }

  drawPlanter(x, y, scale = 1, {
    side = -1,
    variant = 0,
  } = {}) {
    if (this.#drawThree('planter', x, y, scale, { side, variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    const direction = side > 0 ? -1 : 1;
    const pot = { front: '#b85f31', side: '#74361f', top: '#e08a4a', outline: '#3e2117', soil: '#4f2919' };
    const leaf = PALETTES.leaf;
    const w = Math.max(22, snap(58 * s));
    const h = Math.max(22, snap(52 * s));
    const d = Math.max(4, snap(9 * s));
    const left = x - w / 2;
    const right = x + w / 2;
    const topY = y - h;

    ctx.save();
    this.#contactShadow(x, y + 2 * s, 33 * s, 6 * s, s, 0.18);
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.strokeStyle = pot.outline;
    this.#polygon([[left, topY], [left + direction * d, topY - d], [right + direction * d, topY - d], [right, topY]], pot.top);
    this.#polygon([[right, topY], [right + direction * d, topY - d], [right + direction * d * 0.6, y - 5 * s], [right - 8 * s, y]], pot.side);
    ctx.fillStyle = pot.front;
    ctx.beginPath();
    ctx.moveTo(snap(left), snap(topY));
    ctx.lineTo(snap(right), snap(topY));
    ctx.lineTo(snap(right - 8 * s), snap(y));
    ctx.lineTo(snap(left + 8 * s), snap(y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pot.side;
    ctx.fillRect(snap(left + 9 * s), snap(y - 14 * s), snap(w - 18 * s), Math.max(3, snap(7 * s)));
    this.#ellipse(x + direction * d * 0.25, topY - 1 * s, w * 0.46, 7 * s, pot.soil, pot.outline);
    this.#ellipse(x + direction * d * 0.20, topY - 4 * s, w * 0.30, 4 * s, '#6a3822', null);

    ctx.strokeStyle = leaf.outline;
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x + direction * 2 * s), snap(topY - 2 * s));
    ctx.lineTo(snap(x + direction * (variant & 1 ? 4 : -4) * s), snap(topY - 32 * s));
    ctx.stroke();
    this.#leafBlade(x - 8 * s, topY - 24 * s, 18 * s, 28 * s, -0.62, leaf.top, leaf.outline);
    this.#leafBlade(x + 10 * s, topY - 30 * s, 17 * s, 32 * s, 0.58, leaf.front, leaf.outline);
    this.#leafBlade(x + 2 * s, topY - 18 * s, 12 * s, 22 * s, 0.18, leaf.highlight, leaf.outline);
    ctx.restore();
    return true;
  }

  drawMushroom(x, y, scale = 1, {
    variant = 'red',
  } = {}) {
    if (this.#drawThree('mushroom', x, y, scale, { variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    const cap =
      variant === 'blue'
        ? { front: '#4c8fe8', side: '#2854a8', top: '#70b7ff', spot: '#dff5ff' }
        : variant === 'purple'
          ? { front: '#9a55d8', side: '#5b2f91', top: '#c283f1', spot: '#f5dfff' }
          : { front: '#d94836', side: '#8f231d', top: '#ef7358', spot: '#ffe2c8' };
    const stem = { front: '#f1d39a', side: '#b9854b', top: '#ffe7b6', outline: '#5a321e' };
    const capW = Math.max(34, snap((variant === 'blue' ? 116 : 136) * s));
    const capH = Math.max(18, snap((variant === 'blue' ? 66 : 70) * s));
    const stemW = Math.max(10, snap((variant === 'purple' ? 36 : 31) * s));
    const stemH = Math.max(24, snap((variant === 'purple' ? 72 : 66) * s));
    const capY = y - stemH - 8 * s;

    ctx.save();
    this.#contactShadow(x, y + 3 * s, capW * 0.34, 9 * s, s, 0.20);
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.strokeStyle = stem.outline;

    ctx.fillStyle = stem.side;
    ctx.beginPath();
    ctx.moveTo(snap(x - stemW * 0.42), snap(y));
    ctx.bezierCurveTo(snap(x - stemW * 0.70), snap(y - stemH * 0.30), snap(x - stemW * 0.38), snap(y - stemH * 0.86), snap(x - stemW * 0.20), snap(y - stemH));
    ctx.lineTo(snap(x + stemW * 0.34), snap(y - stemH));
    ctx.bezierCurveTo(snap(x + stemW * 0.62), snap(y - stemH * 0.46), snap(x + stemW * 0.54), snap(y - stemH * 0.18), snap(x + stemW * 0.46), snap(y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = stem.front;
    ctx.beginPath();
    ctx.moveTo(snap(x - stemW * 0.25), snap(y - 4 * s));
    ctx.bezierCurveTo(snap(x - stemW * 0.42), snap(y - stemH * 0.34), snap(x - stemW * 0.18), snap(y - stemH * 0.82), snap(x + stemW * 0.05), snap(y - stemH));
    ctx.bezierCurveTo(snap(x + stemW * 0.30), snap(y - stemH * 0.65), snap(x + stemW * 0.32), snap(y - stemH * 0.24), snap(x + stemW * 0.22), snap(y - 4 * s));
    ctx.closePath();
    ctx.fill();
    this.#ellipse(x, y - 2 * s, stemW * 0.58, 7 * s, stem.top, stem.outline);

    this.#mushroomCap(x, capY, capW, capH, cap.front, cap.side, stem.outline, variant === 'blue');
    this.#ellipse(x - capW * 0.18, capY - capH * 0.22, capW * 0.26, capH * 0.13, cap.top, null);
    ctx.fillStyle = cap.spot;
    const spots = [
      [-0.34, -0.11, 0.09], [-0.08, -0.31, 0.10], [0.28, -0.13, 0.10],
      [0.02, 0.08, 0.06], [0.40, 0.08, 0.05],
    ];
    for (const [dx, dy, r] of spots) {
      this.#ellipse(x + capW * dx, capY + capH * dy, capW * r, capH * r * 0.82, cap.spot, null);
    }
    ctx.fillStyle = 'rgba(60, 35, 25, 0.28)';
    for (let i = -3; i <= 3; i += 1) {
      ctx.fillRect(snap(x + i * capW * 0.08), snap(capY + capH * 0.24), Math.max(1, snap(2 * s)), Math.max(3, snap(12 * s)));
    }
    ctx.restore();
    return true;
  }

  drawBush(x, y, scale = 1, {
    flowers = false,
    large = false,
    variant = 0,
  } = {}) {
    if (this.#drawThree('bush', x, y, scale, { flowers, large, variant })) return true;
    const ctx = this.ctx;
    const s = scale * (large ? 1.16 : 1);
    const leaf = PALETTES.leaf;
    const w = (large ? 170 : 118) * s;
    const h = (large ? 98 : 72) * s;

    ctx.save();
    this.#contactShadow(x, y + 2 * scale, w * 0.34, h * 0.10, scale, 0.18);
    ctx.lineWidth = Math.max(1, snap(2 * scale));
    this.#bushSilhouette(x, y - h * 0.08, w, h, leaf, variant);
    this.#leafMosaic(x, y - h * 0.31, w * 0.74, h * 0.48, scale, large ? 34 : 24, variant);
    if (flowers) {
      const flowerColor = ['#c46dff', '#a455e6', '#f3d14b'];
      for (let i = 0; i < (large ? 7 : 5); i += 1) {
        const px = x - w * 0.34 + ((i * 43 + variant * 13) % Math.max(1, w * 0.68));
        const py = y - h * 0.54 + ((i * 23 + variant * 7) % Math.max(1, h * 0.42));
        this.#flowerDot(px, py, Math.max(2, (large ? 6 : 5) * scale), flowerColor[i % flowerColor.length]);
      }
    }
    ctx.restore();
    return true;
  }

  drawTree(x, y, scale = 1, {
    variant = 0,
  } = {}) {
    if (this.#drawThree('tree', x, y, scale, { variant })) return true;
    const ctx = this.ctx;
    const s = scale;
    const wood = PALETTES.wood;
    const leaf = PALETTES.leaf;
    const trunkW = Math.max(14, snap(32 * s));
    const trunkH = Math.max(40, snap(104 * s));
    const canopyW = Math.max(74, snap(156 * s));
    const canopyH = Math.max(66, snap(136 * s));
    const cy = y - trunkH - canopyH * 0.08;

    ctx.save();
    this.#contactShadow(x, y + 4 * s, canopyW * 0.30, 12 * s, s, 0.20);
    this.#board3d(x, y, trunkW, trunkH, 9 * s, variant & 1 ? -1 : 1, wood);
    ctx.fillStyle = wood.highlight;
    ctx.fillRect(snap(x - trunkW * 0.24), snap(y - trunkH + 12 * s), Math.max(1, snap(4 * s)), snap(trunkH * 0.62));
    ctx.strokeStyle = wood.outline;
    ctx.lineWidth = Math.max(1, snap(2 * s));
    ctx.beginPath();
    ctx.moveTo(snap(x - 2 * s), snap(y - trunkH * 0.64));
    ctx.lineTo(snap(x - 25 * s), snap(y - trunkH * 0.94));
    ctx.moveTo(snap(x + 4 * s), snap(y - trunkH * 0.58));
    ctx.lineTo(snap(x + 28 * s), snap(y - trunkH * 0.90));
    ctx.stroke();

    this.#treeCanopy(x, cy, canopyW, canopyH, leaf, variant, scale);
    ctx.restore();
    return true;
  }

  #drawThree(kind, x, y, scale, options) {
    if (!this.enabled || !this.threeModels?.enabled) return false;
    return this.threeModels.draw(this.ctx, kind, x, y, scale, options);
  }

  #vinePath(left, right, y, amp, phase) {
    const ctx = this.ctx;
    const width = right - left;
    const segments = 16;
    ctx.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = left + width * t;
      const yy = y - Math.sin(t * Math.PI * 3 + phase) * amp;
      if (i === 0) ctx.moveTo(snap(x), snap(yy));
      else ctx.lineTo(snap(x), snap(yy));
    }
  }

  #drawWebOverhang(cx, bottomY, width, scale, accent) {
    const ctx = this.ctx;
    const s = scale;
    const topY = bottomY - 108 * s;
    const halfW = width * 0.48;
    const cy = topY + 54 * s;
    ctx.save();
    ctx.shadowColor = `rgba(120,220,255,${0.42 * accent})`;
    ctx.shadowBlur = (5 + 12 * accent) * s;
    const drawWebLines = (strokeStyle, lineWidth, yOffset = 0) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = Math.max(1, snap(lineWidth * s));
      for (let i = 0; i < 9; i += 1) {
        const t = i / 8;
        const x = cx - halfW + halfW * 2 * t;
        ctx.beginPath();
        ctx.moveTo(snap(cx), snap(cy - 20 * s + yOffset));
        ctx.lineTo(snap(x), snap(bottomY - 14 * s + yOffset));
        ctx.stroke();
      }
      for (let r = 1; r <= 4; r += 1) {
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4 * s + yOffset, halfW * (r / 4), 48 * s * (r / 4), 0, 0, Math.PI);
        ctx.stroke();
      }
    };

    drawWebLines('rgba(58,72,102,0.44)', 4, 1.5 * s);
    drawWebLines('rgba(248,252,255,0.94)', 1.8);
    ctx.fillStyle = '#3a2454';
    this.#ellipse(cx + 10 * s, cy + 18 * s, 9 * s, 12 * s, '#3a2454', '#160b22');
    this.#ellipse(cx + 8 * s, cy + 8 * s, 6 * s, 7 * s, '#4c326d', '#160b22');
    ctx.strokeStyle = '#160b22';
    ctx.lineWidth = Math.max(1, snap(2 * s));
    for (let i = 0; i < 4; i += 1) {
      const dir = i < 2 ? -1 : 1;
      const yy = cy + (i % 2 ? 16 : 22) * s;
      ctx.beginPath();
      ctx.moveTo(snap(cx + 8 * s), snap(yy));
      ctx.lineTo(snap(cx + dir * 22 * s), snap(yy + 8 * s));
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  #mushroomCap(x, y, w, h, front, side, outline, pointed = false) {
    const ctx = this.ctx;
    ctx.fillStyle = side;
    ctx.strokeStyle = outline;
    ctx.beginPath();
    ctx.moveTo(snap(x - w * 0.46), snap(y + h * 0.20));
    ctx.bezierCurveTo(snap(x - w * 0.38), snap(y - h * 0.36), snap(x - w * 0.10), snap(y - h * 0.58), snap(x), snap(y - h * (pointed ? 0.64 : 0.50)));
    ctx.bezierCurveTo(snap(x + w * 0.22), snap(y - h * 0.38), snap(x + w * 0.46), snap(y - h * 0.06), snap(x + w * 0.50), snap(y + h * 0.22));
    ctx.lineTo(snap(x + w * 0.34), snap(y + h * 0.30));
    ctx.lineTo(snap(x - w * 0.36), snap(y + h * 0.30));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(snap(x - w * 0.50), snap(y + h * 0.13));
    ctx.bezierCurveTo(snap(x - w * 0.40), snap(y - h * 0.34), snap(x - w * 0.11), snap(y - h * 0.68), snap(x + w * 0.02), snap(y - h * (pointed ? 0.74 : 0.56)));
    ctx.bezierCurveTo(snap(x + w * 0.30), snap(y - h * 0.48), snap(x + w * 0.50), snap(y - h * 0.03), snap(x + w * 0.52), snap(y + h * 0.16));
    ctx.lineTo(snap(x + w * 0.38), snap(y + h * 0.25));
    ctx.lineTo(snap(x - w * 0.42), snap(y + h * 0.25));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  #bushSilhouette(x, y, w, h, palette, variant) {
    const lobes = [
      [-0.42, 0.02, 0.26, 0.26],
      [-0.24, -0.18, 0.31, 0.31],
      [0.00, -0.29, 0.34, 0.32],
      [0.24, -0.18, 0.31, 0.31],
      [0.43, 0.02, 0.25, 0.25],
      [0.00, 0.08, 0.43, 0.30],
    ];
    for (const [dx, dy, rw, rh] of lobes) {
      this.#ellipse(x + w * dx, y + h * dy, w * rw, h * rh, palette.side, palette.outline);
      this.#ellipse(x + w * (dx - 0.03), y + h * (dy - 0.04), w * rw * 0.76, h * rh * 0.70, (variant + dx * 10) % 2 ? palette.front : palette.top, null);
    }
    this.#ellipse(x - w * 0.16, y - h * 0.34, w * 0.14, h * 0.05, palette.highlight, null);
    this.#ellipse(x + w * 0.18, y - h * 0.30, w * 0.12, h * 0.045, palette.highlight, null);
  }

  #treeCanopy(x, y, w, h, palette, variant, scale) {
    const lobes = [
      [-0.31, 0.03, 0.30, 0.28],
      [-0.18, -0.22, 0.34, 0.30],
      [0.08, -0.32, 0.36, 0.32],
      [0.31, -0.12, 0.30, 0.28],
      [0.24, 0.16, 0.28, 0.25],
      [-0.08, 0.20, 0.36, 0.26],
    ];
    for (const [dx, dy, rw, rh] of lobes) {
      this.#ellipse(x + w * dx, y + h * dy, w * rw, h * rh, palette.side, palette.outline);
      this.#ellipse(x + w * (dx - 0.035), y + h * (dy - 0.055), w * rw * 0.74, h * rh * 0.68, palette.front, null);
    }
    this.#leafMosaic(x, y - h * 0.08, w * 0.72, h * 0.58, scale, 42, variant);
    this.#ellipse(x - w * 0.17, y - h * 0.32, w * 0.11, h * 0.04, palette.highlight, null);
    this.#ellipse(x + w * 0.12, y - h * 0.28, w * 0.09, h * 0.035, palette.highlight, null);
  }

  #leafMosaic(cx, cy, w, h, scale, count, variant) {
    const ctx = this.ctx;
    const colors = ['#8bd84a', '#67bd3d', '#3fa34d', '#2d7d3c', '#b5ec5b'];
    const size = Math.max(3, snap(8 * scale));
    for (let i = 0; i < count; i += 1) {
      const angle = ((i * 137 + variant * 23) % 360) * Math.PI / 180;
      const radius = (((i * 47 + variant * 17) % 100) / 100) ** 0.55;
      const px = cx + Math.cos(angle) * w * 0.48 * radius;
      const py = cy + Math.sin(angle) * h * 0.48 * radius;
      const leafW = size * (0.8 + ((i + variant) % 3) * 0.18);
      const leafH = size * (0.55 + ((i + 1) % 3) * 0.16);
      ctx.fillStyle = colors[(i + variant) % colors.length];
      ctx.beginPath();
      ctx.moveTo(snap(px), snap(py - leafH));
      ctx.lineTo(snap(px + leafW), snap(py));
      ctx.lineTo(snap(px), snap(py + leafH));
      ctx.lineTo(snap(px - leafW), snap(py));
      ctx.closePath();
      ctx.fill();
    }
  }

  #grassTuft(x, y, scale, variant = 0) {
    const ctx = this.ctx;
    const blades = [-9, -4, 1, 6, 11];
    ctx.strokeStyle = '#206f2b';
    ctx.lineWidth = Math.max(1, snap(2 * scale));
    for (let i = 0; i < blades.length; i += 1) {
      const bx = x + blades[i] * scale;
      const lean = ((i + variant) % 3 - 1) * 5 * scale;
      ctx.beginPath();
      ctx.moveTo(snap(bx), snap(y));
      ctx.lineTo(snap(bx + lean), snap(y - (10 + (i % 2) * 5) * scale));
      ctx.stroke();
    }
    ctx.fillStyle = '#67bd3d';
    ctx.fillRect(snap(x - 13 * scale), snap(y - 3 * scale), snap(26 * scale), Math.max(2, snap(5 * scale)));
  }

  #contactShadow(cx, cy, rx, ry, scale = 1, alpha = 0.18) {
    const ctx = this.ctx;
    const a = clamp01(alpha);
    if (a <= 0 || rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = '#120d08';
    ctx.beginPath();
    ctx.ellipse(
      snap(cx),
      snap(cy),
      Math.max(1, snap(rx)),
      Math.max(1, snap(ry)),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(snap(cx - rx * 0.35), snap(cy - ry * 0.35), Math.max(1, snap(rx * 0.46)), Math.max(1, snap(scale)));
    ctx.restore();
  }

  #blockBevel(left, top, w, h, scale, palette) {
    const ctx = this.ctx;
    const px = Math.max(1, snap(2 * scale));
    ctx.save();
    ctx.fillStyle = palette.highlight;
    ctx.globalAlpha *= 0.58;
    ctx.fillRect(left + px, top + px, Math.max(px, snap(w * 0.38)), px);
    ctx.fillRect(left + px, top + px, px, Math.max(px, snap(h * 0.32)));
    ctx.globalAlpha *= 0.70;
    ctx.fillStyle = palette.edge;
    ctx.fillRect(left + w - px * 2, top + px * 2, px, Math.max(px, h - px * 4));
    ctx.fillRect(left + px * 2, top + h - px * 2, Math.max(px, w - px * 4), px);
    ctx.restore();
  }

  #sideRibs(edgeX, top, h, depth, rise, direction, scale, palette) {
    const ctx = this.ctx;
    const px = Math.max(1, snap(2 * scale));
    const count = Math.max(2, Math.floor(h / Math.max(10, 18 * scale)));
    ctx.save();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = px;
    ctx.globalAlpha *= 0.50;
    for (let i = 1; i < count; i += 1) {
      const y = top + (h * i) / count;
      ctx.beginPath();
      ctx.moveTo(snap(edgeX), snap(y));
      ctx.lineTo(snap(edgeX + direction * depth), snap(y - rise));
      ctx.stroke();
    }
    ctx.restore();
  }

  #plankLines(cx, bottomY, width, height, scale, palette) {
    const ctx = this.ctx;
    const left = cx - width / 2;
    const top = bottomY - height;
    const count = 4;
    ctx.save();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = Math.max(1, snap(2 * scale));
    ctx.globalAlpha *= 0.72;
    for (let i = 1; i < count; i += 1) {
      const x = left + (width * i) / count;
      ctx.beginPath();
      ctx.moveTo(snap(x), snap(top + 2 * scale));
      ctx.lineTo(snap(x), snap(bottomY - 2 * scale));
      ctx.stroke();
    }
    ctx.fillStyle = palette.highlight;
    ctx.globalAlpha *= 0.7;
    ctx.fillRect(snap(left + 8 * scale), snap(top + 3 * scale), Math.max(2, snap(width * 0.22)), Math.max(1, snap(2 * scale)));
    ctx.restore();
  }

  #leafBlade(cx, cy, w, h, tilt, fill, stroke) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(snap(cx), snap(cy));
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(0, snap(-h * 0.50));
    ctx.bezierCurveTo(snap(w * 0.52), snap(-h * 0.30), snap(w * 0.46), snap(h * 0.26), 0, snap(h * 0.50));
    ctx.bezierCurveTo(snap(-w * 0.44), snap(h * 0.22), snap(-w * 0.46), snap(-h * 0.28), 0, snap(-h * 0.50));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, snap(-h * 0.34));
    ctx.lineTo(snap(w * 0.18), 0);
    ctx.lineTo(0, snap(h * 0.30));
    ctx.closePath();
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
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

  #board3d(cx, bottomY, width, height, depth, direction, palette) {
    const ctx = this.ctx;
    const w = Math.max(4, snap(width));
    const h = Math.max(4, snap(height));
    const d = Math.max(1, snap(depth));
    const left = snap(cx - w / 2);
    const right = left + w;
    const top = snap(bottomY - h);
    const bottom = snap(bottomY);
    const shift = direction * d;

    ctx.strokeStyle = palette.outline;
    this.#polygon([[left, top], [left + shift, top - d], [right + shift, top - d], [right, top]], palette.top);
    this.#polygon([[right, top], [right + shift, top - d], [right + shift, bottom - d], [right, bottom]], palette.side);
    ctx.fillStyle = palette.front;
    ctx.fillRect(left, top, w, h);
    ctx.strokeRect(left, top, w, h);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(left + Math.max(1, snap(w * 0.12)), top + Math.max(1, snap(h * 0.16)), Math.max(1, snap(w * 0.20)), Math.max(1, snap(2)));
    ctx.fillStyle = palette.detail;
    ctx.fillRect(left + Math.max(1, snap(w * 0.55)), top + Math.max(1, snap(h * 0.56)), Math.max(1, snap(w * 0.22)), Math.max(1, snap(2)));
  }

  #ellipse(cx, cy, rx, ry, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(snap(cx), snap(cy), Math.max(1, snap(rx)), Math.max(1, snap(ry)), 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  #flowerDot(x, y, size, fill) {
    const ctx = this.ctx;
    const r = Math.max(1, snap(size));
    this.#ellipse(x - r * 0.65, y, r * 0.55, r * 0.42, fill, null);
    this.#ellipse(x + r * 0.65, y, r * 0.55, r * 0.42, fill, null);
    this.#ellipse(x, y - r * 0.55, r * 0.48, r * 0.42, fill, null);
    ctx.fillStyle = '#ffe67a';
    ctx.fillRect(snap(x), snap(y), Math.max(1, snap(r * 0.38)), Math.max(1, snap(r * 0.38)));
  }

  #materialAccents(left, top, w, h, scale, palette, material, variant) {
    const ctx = this.ctx;
    const px = Math.max(1, snap(3 * scale));
    if (material === 'grass') {
      ctx.fillStyle = '#2d7d3c';
      for (let i = 0; i < 5; i += 1) {
        const x = left + px * 3 + ((i * 19 + variant * 11) % Math.max(px, w - px * 8));
        const y = top - px + ((i + variant) % 2) * px;
        ctx.fillRect(snap(x), snap(y), px, px * 4);
      }
      ctx.fillStyle = '#7a3f1f';
      for (let i = 0; i < 4; i += 1) {
        const rx = left + px * 4 + ((i * 23 + variant * 7) % Math.max(px, w - px * 9));
        const ry = top + h * 0.44 + ((i * 13 + variant * 5) % Math.max(px, h * 0.28));
        ctx.fillRect(snap(rx), snap(ry), px * 2, px);
      }
      if ((variant ?? 0) % 4 >= 2) {
        for (let i = 0; i < 3; i += 1) {
          const fx = left + w * (0.24 + i * 0.24);
          this.#flowerDot(fx, top - px * 2, Math.max(2, 4 * scale), i % 2 ? '#b05cff' : '#ffd94d');
        }
      }
      return;
    }

    if (material === 'stone') {
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(left + px * 3, top + px * 3, Math.max(px * 3, snap(w * 0.18)), px);
      ctx.fillStyle = palette.edge;
      for (let i = 0; i < 5; i += 1) {
        const rx = left + px * 2 + ((i * 31 + variant * 17) % Math.max(px, w - px * 6));
        const ry = top + px * 5 + ((i * 11 + variant * 5) % Math.max(px, h - px * 10));
        ctx.fillRect(snap(rx), snap(ry), px * 2, px);
      }
      return;
    }

    if (material === 'purple') {
      ctx.fillStyle = '#c38cff';
      ctx.fillRect(left + px * 3, top + px * 3, Math.max(px * 3, snap(w * 0.20)), px);
      ctx.fillStyle = '#2a1648';
      for (let i = 0; i < 4; i += 1) {
        const rx = left + px * 3 + ((i * 37 + variant * 9) % Math.max(px, w - px * 8));
        const ry = top + px * 7 + ((i * 17 + variant * 3) % Math.max(px, h - px * 11));
        ctx.fillRect(snap(rx), snap(ry), px, px);
      }
      return;
    }

    if (material === 'question') {
      ctx.fillStyle = '#fff2aa';
      ctx.fillRect(left + px * 3, top + px * 2, Math.max(px * 4, snap(w * 0.28)), px);
      ctx.fillStyle = '#9a5e12';
      ctx.fillRect(left + px * 2, top + h - px * 5, w - px * 4, px);
    }
  }

  #pixelQuestionGlyph(cx, cy, scale) {
    const ctx = this.ctx;
    const p = Math.max(2, snap(5 * scale));
    const cells = [
      [1, 0], [2, 0], [3, 0],
      [0, 1], [4, 1],
      [4, 2],
      [3, 3],
      [2, 4],
      [2, 6],
    ];
    const left = snap(cx - 2.5 * p);
    const top = snap(cy - 3.5 * p);
    ctx.fillStyle = '#70400d';
    for (const [gx, gy] of cells) {
      ctx.fillRect(left + gx * p + Math.max(1, snap(scale)), top + gy * p + Math.max(1, snap(scale)), p, p);
    }
    ctx.fillStyle = '#fff2aa';
    for (const [gx, gy] of cells) {
      ctx.fillRect(left + gx * p, top + gy * p, p, p);
    }
    ctx.fillStyle = '#ffe87c';
    for (const [gx, gy] of [[1, 0], [2, 0], [0, 1], [3, 3], [2, 6]]) {
      ctx.fillRect(left + gx * p, top + gy * p, Math.max(1, snap(p * 0.45)), Math.max(1, snap(p * 0.45)));
    }
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
