import { SpriteRenderer } from '../render/SpriteRenderer.js';
import { PixelPainter } from '../render/PixelPainter.js';
import { GradientCache } from '../render/GradientCache.js';
import {
  FOREGROUND_FRAME_SCENERY,
  LANE_BANDS,
  MIDGROUND_SCENERY,
  SCENE_ZONES,
} from '../config/sceneSchema.js';

const LAYERS = Object.freeze({
  SKY: 0,
  FAR_BACKGROUND: 1,
  DISTANT_LANDMARKS: 2,
  MAIN_GROUND: 3,
  MIDGROUND_TERRAIN: 4,
  FOREGROUND_DECOR: 5,
  GAMEPLAY: 6,
  PARTICLES: 7,
});

const PARALLAX = Object.freeze({
  farBackground: 0.08,
  castle: 0.20,
  midground: 0.46,
  foreground: 0.82,
});

const AMBIENT_MOTES = Object.freeze([
  { x: 0.12, y: 0.64, size: 4, speed: 0.7, color: 'rgba(255,244,180,0.26)' },
  { x: 0.24, y: 0.56, size: 3, speed: 0.9, color: 'rgba(210,255,210,0.18)' },
  { x: 0.76, y: 0.60, size: 4, speed: 0.8, color: 'rgba(255,244,180,0.24)' },
  { x: 0.86, y: 0.52, size: 3, speed: 0.6, color: 'rgba(214,255,228,0.18)' },
]);

export class RenderSystem {
  constructor(canvas, assets, projection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.projection = projection;
    this.sprites = new SpriteRenderer(this.ctx, assets);
    this.paint = new PixelPainter(this.ctx, this.sprites);
    this.gradients = new GradientCache(this.ctx, projection);
  }

  render(world) {
    const ctx = this.ctx;
    const shake = this.#cameraShake(world);
    ctx.setTransform(1, 0, 0, 1, shake.x, shake.y);
    ctx.clearRect(-shake.x, -shake.y, this.canvas.width, this.canvas.height);

    const sceneGraph = this.#buildSceneGraph(world);
    for (let layer = LAYERS.SKY; layer <= LAYERS.PARTICLES; layer += 1) {
      const drawCalls = sceneGraph.get(layer) ?? [];
      for (const drawCall of drawCalls) drawCall();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  resizeToViewport(padding = 0) {
    const maxWidth = window.innerWidth - padding;
    const maxHeight = window.innerHeight - padding;
    const ratio = this.canvas.width / this.canvas.height;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    width = Math.max(320, width);
    height = Math.max(180, height);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const stage = this.canvas.parentElement;
    if (stage) {
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
    }
  }

  #buildSceneGraph(world) {
    const graph = new Map();
    for (let layer = LAYERS.SKY; layer <= LAYERS.PARTICLES; layer += 1) graph.set(layer, []);

    graph.get(LAYERS.SKY).push(() => this.#sky(world));
    graph.get(LAYERS.FAR_BACKGROUND).push(() => this.#farBackground(world));
    graph.get(LAYERS.DISTANT_LANDMARKS).push(() => this.#distantLandmarks(world));
    graph.get(LAYERS.MAIN_GROUND).push(() => this.#mainGround(world));
    graph.get(LAYERS.MIDGROUND_TERRAIN).push(() => this.#midgroundTerraces(world));
    graph.get(LAYERS.FOREGROUND_DECOR).push(() => this.#foregroundGarden(world.scrollOffset, world));
    graph.get(LAYERS.GAMEPLAY).push(() => this.#gameplay(world));
    graph.get(LAYERS.PARTICLES).push(() => this.#particles(world));

    // Two-pass scenery: structural walls render first (behind), organic shoulder items second (in front).
    // Frame trees render last — they are close and should sit in front of scrolling scenery.
    const isStructuralItem = s => s.laneBand === LANE_BANDS.STRUCTURE
      || s.zone === SCENE_ZONES.STRUCTURE_LEFT || s.zone === SCENE_ZONES.STRUCTURE_RIGHT;
    const structuralScenery = world.scenery.filter(isStructuralItem).sort((a, b) => b.distance - a.distance);
    const organicScenery = world.scenery.filter(s => !isStructuralItem(s)).sort((a, b) => b.distance - a.distance);

    graph.get(LAYERS.FOREGROUND_DECOR).push(() => {
      for (const item of structuralScenery) this.#scenery(item, world, LAYERS.FOREGROUND_DECOR);
    });
    graph.get(LAYERS.FOREGROUND_DECOR).push(() => {
      for (const item of organicScenery) this.#scenery(item, world, LAYERS.FOREGROUND_DECOR);
    });
    graph.get(LAYERS.FOREGROUND_DECOR).push(() => this.#foregroundFrame(world));

    return graph;
  }

  #cameraShake(world) {
    if (!world.config.gameFeel.cameraShake) return { x: 0, y: 0 };
    const amount = world.cameraShake;
    if (amount <= 0.01) return { x: 0, y: 0 };
    const phase = world.cameraImpulseTime * 0.7;
    return {
      x: Math.sin(phase * 1.9) * amount * 0.55,
      y: Math.cos(phase * 2.3) * amount * 0.35,
    };
  }

  #parallaxOffset(world, amount, drift = 0) {
    const scrollDrift = Math.sin(world.scrollOffset * 0.01 + drift) * this.projection.width * amount * 0.006;
    return scrollDrift;
  }

  #roadTopHalfWidth() {
    return Math.max(this.projection.width * 0.022, this.#roadBaseHalfWidth() * 0.068);
  }

  #roadBaseHalfWidth() {
    return this.projection.roadBaseHalfWidth * 0.92;
  }

  #sky(world) {
    const ctx = this.ctx;
    const { width, height, horizonY } = this.projection;
    const g = this.gradients.gradients;
    const skyH = g.skyH;

    const skyImg = this.assets.get('backgroundSkyGradient');
    if (skyImg?.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(skyImg, 0, 0, width, skyH);
      ctx.restore();
    } else {
      ctx.fillStyle = g.sky;
      ctx.fillRect(0, 0, width, skyH);
    }
    ctx.fillStyle = g.skyDepth;
    ctx.fillRect(0, 0, width, skyH);

    ctx.fillStyle = g.haze;
    ctx.fillRect(0, horizonY - 12, width, 176);

    if (!this.sprites.draw('backgroundSun', width * 0.28, height * 0.172, height * 0.082, 'center')) {
      ctx.fillStyle = 'rgba(255,248,196,0.40)';
      ctx.beginPath();
      ctx.arc(width * 0.28, height * 0.172, height * 0.082, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,226,0.92)';
      ctx.beginPath();
      ctx.arc(width * 0.28, height * 0.172, height * 0.050, 0, Math.PI * 2);
      ctx.fill();
    }

    if (world.config.gameFeel.ambientMotion) {
      const time = world.timeAlive * 0.012;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fff8cf';
      for (const direction of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(width * (0.28 + direction * 0.04), 88);
        ctx.lineTo(width * (0.28 + direction * 0.13), height * 0.58);
        ctx.lineTo(width * (0.28 + direction * 0.06 + Math.sin(time + direction) * 0.01), height * 0.58);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  #farBackground(world) {
    const p = this.projection;
    const width = p.width;
    const mountainOffset = this.#parallaxOffset(world, PARALLAX.farBackground, 0.2);

    for (let i = 0; i < world.clouds.length; i += 1) {
      const cloud = world.clouds[i];
      const key = cloud.key ?? `backgroundCloud0${1 + (i % 6)}`;
      const targetW = (cloud.widthPx ?? cloud.radius * 5.25) * (i < 2 || i === 3 ? 0.92 : 0.96);
      const x = cloud.x + this.#parallaxOffset(world, 0.05 + (i % 3) * 0.015, i * 0.9);
      if (!this.sprites.draw(key, x, cloud.y, targetW, 'center')) {
        this.sprites.draw('cloudLarge', x, cloud.y, targetW, 'center');
      }
    }

    this.#drawSpriteFullWidth('backgroundMountainsFar',  -60 + mountainOffset,        p.horizonY - 18, width + 120, 0.62);
    this.#drawSpriteFullWidth('backgroundMountainsMid',  -50 + mountainOffset * 1.18, p.horizonY + 8,  width + 100, 0.76);
    this.#drawSpriteFullWidth('backgroundMountainsNear', -42 + mountainOffset * 1.35, p.horizonY + 28, width + 84,  0.88);
  }

  #distantLandmarks(world) {
    const ctx = this.ctx;
    const p = this.projection;
    const width = p.width;
    const castleOffset = this.#parallaxOffset(world, PARALLAX.castle, 1.1);
    const castleX = width / 2 + castleOffset;
    const gateY = p.roadVanishY + 34;
    const topHalf = this.#roadTopHalfWidth();

    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = '#3f8f44';
    ctx.beginPath();
    ctx.moveTo(0, p.roadVanishY + 78);
    const treeline = [[0.00, 24], [0.08, 18], [0.16, 28], [0.24, 16], [0.32, 30], [0.40, 20], [0.46, 28], [0.54, 28], [0.60, 20], [0.68, 30], [0.76, 16], [0.84, 28], [0.92, 18], [1.00, 24]];
    for (const [xRatio, yOffset] of treeline) {
      const px = xRatio * width + castleOffset * 0.45;
      if (Math.abs(px - castleX) < 132) continue;
      ctx.lineTo(px, p.roadVanishY + 78 + yOffset);
    }
    ctx.lineTo(width, p.roadVanishY + 124);
    ctx.lineTo(0, p.roadVanishY + 124);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.88;
    const castleDrawn = this.sprites.draw('backgroundCastle', castleX, gateY + 6, width * 0.076, 'bottom');
    ctx.restore();
    if (!castleDrawn) {
      const flagWave = world.config.gameFeel.ambientMotion ? Math.sin(world.timeAlive * 0.09) : 0;
      this.#castle(castleX, gateY + 18, flagWave);
    }

    ctx.save();
    ctx.fillStyle = this.gradients.gradients.roadJoin;
    ctx.beginPath();
    ctx.moveTo(castleX - topHalf * 0.42, p.roadVanishY - 4);
    ctx.lineTo(castleX - 26, gateY + 16);
    ctx.lineTo(castleX + 26, gateY + 16);
    ctx.lineTo(castleX + topHalf * 0.42, p.roadVanishY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(235,255,182,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(castleX - topHalf * 0.38, p.roadVanishY - 2);
    ctx.lineTo(castleX - 26, gateY + 14);
    ctx.moveTo(castleX + topHalf * 0.38, p.roadVanishY - 2);
    ctx.lineTo(castleX + 26, gateY + 14);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = this.gradients.gradients.distantHaze;
    ctx.fillRect(0, p.roadVanishY - 90, width, 210);

    ctx.fillStyle = this.gradients.gradients.depthHaze;
    ctx.fillRect(0, p.roadVanishY + 40, width, 70);

    // Prefer new high-quality forest sprite; fall back to legacy treeline.
    if (!this.#drawSpriteFullWidth('backgroundForestFar', -34 + castleOffset * 0.2, p.roadVanishY + 88, width + 68, 0.82)) {
      this.#drawSpriteRect('backgroundForestTreeline', -34, p.roadVanishY + 82, width + 68, 130, 0.68);
    }
    this.#drawSpriteRect('backgroundMeadowRolling', -24, p.roadVanishY + 122, width + 48, 76, 0.60);
  }

  #mainGround(world) {
    this.#ground();
    this.#road(world.scrollOffset);
  }

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

  #projectWithParallax(lane, distance, world, layer) {
    const projected = this.projection.project(lane, distance);
    const amount = layer === LAYERS.MIDGROUND_TERRAIN ? PARALLAX.midground : PARALLAX.foreground;
    return {
      ...projected,
      sx: projected.sx + this.#parallaxOffset(world, amount, distance * 0.02),
    };
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
    const baseHalf = this.#roadBaseHalfWidth();
    const topHalf = this.#roadTopHalfWidth();

    ctx.fillStyle = this.gradients.gradients.road;
    ctx.beginPath();
    ctx.moveTo(vpX - topHalf, vpY);
    ctx.lineTo(vpX + topHalf, vpY);
    ctx.lineTo(vpX + baseHalf, p.groundY);
    ctx.lineTo(vpX - baseHalf, p.groundY);
    ctx.closePath();
    ctx.fill();

    // Perspective-correct scrolling stripe surface — no image dependency.
    // For each horizontal band we compute the world-space distance to get a UV
    // coordinate that scrolls properly under perspective, then fill with canvas.
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
          innerNear.sx,
          innerNear.sy,
          near.sx,
          near.sy,
          farP.sx,
          farP.sy,
          innerFar.sx,
          innerFar.sy,
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
          p1.sx - w1,
          p1.sy,
          p1.sx + w1,
          p1.sy,
          p2.sx + w2,
          p2.sy,
          p2.sx - w2,
          p2.sy,
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
    const baseHalf = this.#roadBaseHalfWidth();
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

  #foregroundGarden(scrollOffset, world = null) {
    const ctx = this.ctx;
    const p = this.projection;
    const vpX = p.width / 2;
    const baseHalf = this.#roadBaseHalfWidth();
    const y0 = this.gradients.gradients.foregroundY0;
    const y1 = p.height;

    ctx.save();
    for (const side of [-1, 1]) {
      const edgeX = vpX + side * baseHalf;
      const outerX = side < 0 ? 0 : p.width;
      ctx.fillStyle = this.gradients.gradients.foregroundSide;
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

  #gameplay(world) {
    const items = [];
    for (const obstacle of world.obstacles) items.push({ kind: 'obstacle', distance: obstacle.distance, ref: obstacle });
    for (const collectible of world.collectibles) items.push({ kind: 'collectible', distance: collectible.distance, ref: collectible });
    items.sort((a, b) => b.distance - a.distance);

    for (const item of items) {
      if (item.kind === 'obstacle') this.#obstacle(item.ref, world.scrollOffset, world);
      if (item.kind === 'collectible' && !item.ref.collected) this.#collectible(item.ref, world);
    }

    this.#player(world);
  }

  #collectible(item, world) {
    const p = this.projection.project(item.lane, item.distance);
    const yOffset = item.high ? -86 : -40;
    const wobble = Math.sin(item.t) * 4 * p.scale;
    const x = p.sx + (item.laneJitter ?? 0) * this.projection.laneWidth;
    const y = p.sy + yOffset * p.scale + wobble;
    const pop = world.config.gameFeel.ambientMotion ? 1 + Math.sin(item.t * 2.1) * 0.05 : 1;
    const assetType = item.assetType ?? item.type;

    if (assetType === 'heart_full' || item.type === 'life') {
      this.paint.heart(x, y, p.scale * 1.35 * pop);
      return;
    }

    if (assetType === 'speed_tree_pickup' || item.type === 'power-tree') {
      this.#powerGlow(x, y - 22 * p.scale, p.scale * pop, '#72ff66');
      this.paint.tree(x, y + 28 * p.scale, p.scale * 0.64 * pop);
      return;
    }

    if (assetType === 'power_mushroom_pickup' || item.type === 'power-mushroom') {
      this.#powerGlow(x, y - 22 * p.scale, p.scale * pop, '#ad72ff');
      this.paint.mushroom(x, y + 18 * p.scale, p.scale * 0.82 * pop, 'purple');
      return;
    }

    const flowerKey = p.scale > 0.55 ? 'goldenFlowerBig' : 'goldenFlowerSmall';
    const szMod = 1 + (item.laneJitter ?? 0) * 0.5;  // ±8% size variation
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

  #obstacle(item, scrollOffset, world) {
    const assetType = item.assetType ?? item.type;
    if (assetType === 'vine_barrier' || item.type === 'vine') {
      this.#vine(item.distance, scrollOffset, item.warning);
      return;
    }

    const p = this.projection.project(item.lane, item.distance);
    if (item.warning) this.#warningPulse(p.sx, p.sy - 58 * p.scale, p.scale, world.timeAlive);
    if (assetType === 'spiky_bush_obstacle' || item.type === 'bush') this.paint.bush(p.sx, p.sy, p.scale);
    if (assetType === 'dry_grass_obstacle' || item.type === 'wheat') {
      if (!this.sprites.draw('dryGrassObstacle', p.sx, p.sy, 130 * p.scale)) this.paint.wheat(p.sx, p.sy, p.scale);
    }
    if (assetType === 'purple_brick_single' || item.type === 'wall') this.paint.wallBlock(p.sx, p.sy, p.scale, 1, item.variant === 2 ? 2 : 1);
    if (assetType === 'small_center_mushroom' || item.type === 'mushroom') {
      if (!this.sprites.draw('mushroomSmallRed', p.sx, p.sy, 140 * p.scale)) this.paint.mushroom(p.sx, p.sy, p.scale, item.variant);
    }
    if (assetType === 'stone_obstacle' || item.type === 'stone') this.paint.stone(p.sx, p.sy, p.scale);
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

  #scenery(item, world, layer) {
    if (item.distance < -5.5) return;
    const p = this.#projectWithParallax(item.lane, item.distance, world, layer);
    const scale = p.scale * item.visualScale;
    const y = p.sy + item.yOffset * scale;

    const isStructural = item.laneBand === LANE_BANDS.STRUCTURE
      || item.zone === SCENE_ZONES.STRUCTURE_LEFT
      || item.zone === SCENE_ZONES.STRUCTURE_RIGHT;
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
    const safeHalfWidth = this.#roadBaseHalfWidth() * 0.72;
    return Math.abs(x - center) < safeHalfWidth + 80 * scale;
  }

  #drawSceneryType(assetType, x, y, scale, variant, alpha = 1, mirrored = false) {
    const v = variant ?? 0;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    if (mirrored) {
      this.ctx.translate(x, 0);
      this.ctx.scale(-1, 1);
      this.ctx.translate(-x, 0);
    }

    // ── Structural wall elements ──────────────────────────────────────────────
    if (assetType === 'grass_dirt_block' || assetType === 'grass_dirt_step' || assetType === 'terrainBlock') {
      const blockKeys = ['grassBlockFrontRect', 'grassBlockCube01', 'grassBlockCube02', 'grassBlockColumnTall'];
      const key = blockKeys[v % 4];
      if (!this.sprites.draw(key, x, y, 185 * scale)) this.paint.terrainBlock(x, y, scale, v);
    }
    if (assetType === 'grass_dirt_wall' || assetType === 'grassWall') {
      const key = v % 2 === 0 ? 'purpleWallLow' : 'purpleWallStairs';
      if (!this.sprites.draw(key, x, y, 200 * scale)) this.paint.grassWall(x, y, scale, v % 2);
    }
    if (assetType === 'purple_brick_single' || assetType === 'blockStack') {
      if (!this.sprites.draw('purpleBrick01', x, y, 110 * scale)) this.paint.wallBlock(x, y, scale, v === 2 ? 3 : 1, 1);
    }
    if (assetType === 'floating_platform' || assetType === 'platform') {
      if (!this.sprites.draw('purplePlatformRow04', x, y, 290 * scale)) this.paint.platform(x, y, scale, v % 2);
    }
    if (assetType === 'question_block' || assetType === 'questionBlock') {
      if (!this.sprites.draw('questionBlockSprite', x, y - 62 * scale, 90 * scale)) this.paint.questionBlock(x, y - 62 * scale, scale);
    }
    if (assetType === 'green_pipe' || assetType === 'pipe') {
      if (!this.sprites.draw('pipeGreenSprite', x, y, 130 * scale)) this.paint.pipe(x, y, scale);
    }
    if (assetType === 'fence_wood_short' || assetType === 'fence') {
      if (!this.sprites.draw('fenceWoodSprite', x, y, 220 * scale)) this.paint.fence(x, y, scale);
    }
    if (assetType === 'hanging_platform_vines' || assetType === 'hangingPlatform') {
      this.sprites.draw('hangingPlatformVines', x, y, 280 * scale);
    }

    // ── Large organic / flora ─────────────────────────────────────────────────
    if (assetType === 'tree_round' || assetType === 'tree') {
      if (!this.sprites.draw('treeRoundSprite', x, y, 280 * scale)) this.paint.tree(x, y, scale, v);
    }
    if (assetType === 'mushroom_red_big' || assetType === 'mushroom') {
      const key = variant === 'red' ? 'mushroomRed' : 'mushroomPurple';
      if (!this.sprites.draw(key, x, y, 180 * scale)) this.paint.mushroom(x, y, scale, variant);
    }
    if (assetType === 'purple_flower_single' || assetType === 'flowerbush') {
      if (!this.sprites.draw('bushWithFlowers', x, y, 160 * scale)) this.paint.flowerBush(x, y, scale);
    }
    if (assetType === 'bush_large' || assetType === 'bushLarge') {
      this.sprites.draw('bushLarge', x, y, 240 * scale);
    }
    if (assetType === 'bush_large_with_purple_flowers' || assetType === 'bushLargeFlower') {
      this.sprites.draw('bushLargeFlower', x, y, 240 * scale);
    }

    // ── Small organic / ground cover ──────────────────────────────────────────
    if (assetType === 'yellow_flower_small' || assetType === 'smallFlower') {
      const key = v % 2 === 0 ? 'yellowFlowerSmall' : 'purpleFlowerCluster';
      if (!this.sprites.draw(key, x, y, 80 * scale)) this.paint.smallFlower(x, y, scale);
    }
    if (assetType === 'sprout_soil' || assetType === 'sprout') {
      if (!this.sprites.draw('sproutSoil', x, y, 75 * scale)) this.paint.sprout(x, y, scale);
    }
    if (assetType === 'wheat_tuft' || assetType === 'wheat') this.paint.wheat(x, y, scale);
    if (assetType === 'mushroom_blue_big' || assetType === 'mushroomBlue') {
      this.sprites.draw('mushroomBlue', x, y, 170 * scale);
    }
    if (assetType === 'leaf_clump_small' || assetType === 'leafClusterLow') {
      this.sprites.draw('leafClusterLow', x, y, 190 * scale);
    }
    if (assetType === 'leaf_clump_round' || assetType === 'leafClusterCompact') {
      if (!this.sprites.draw('leafClumpRound', x, y, 150 * scale)) this.sprites.draw('leafClusterCompact', x, y, 150 * scale);
    }
    if (assetType === 'grass_tuft' || assetType === 'grass_tuft_small' || assetType === 'grassTuft') {
      const key = v % 2 === 0 ? 'grassTuftSmall' : 'grassTuftLarge';
      if (!this.sprites.draw(key, x, y, 130 * scale)) this.sprites.draw('grassTuft', x, y, 130 * scale);
    }
    if (assetType === 'grass_tuft_large') {
      if (!this.sprites.draw('grassTuftLarge', x, y, 150 * scale)) this.sprites.draw('grassTuft', x, y, 130 * scale);
    }
    if (assetType === 'dry_grass_obstacle' || assetType === 'dryGrass') {
      this.sprites.draw('dryGrass', x, y, 150 * scale);
    }
    if (assetType === 'bush_with_purple_flowers') {
      if (!this.sprites.draw('bushWithFlowers', x, y, 160 * scale)) this.paint.flowerBush(x, y, scale);
    }

    this.ctx.restore();
  }

  #player(world) {
    const invulnAlpha = world.invulnerabilityFrames > 0
      ? (Math.floor(world.invulnerabilityFrames / 6) % 2 === 0 ? 0.28 : 1)
      : 1;

    const renderLanes = world.getPlayerRenderLanes();
    for (const laneX of renderLanes) {
      if (Math.abs(laneX - world.player.laneX) < 0.01) continue;
      this.#playerBody(world, laneX, 0.42 * invulnAlpha, true);
    }
    this.#playerBody(world, world.player.laneX, invulnAlpha, false);
  }

  #playerBody(world, renderLaneX, alpha = 1, isClone = false) {
    const ctx = this.ctx;
    const p = this.projection;
    const player = world.player;
    const x = p.width / 2 + renderLaneX * p.laneWidth;
    const idleBob = !player.isJumping ? Math.sin(player.idleTime * 0.10) * 2.4 : 0;
    const y = p.groundY + player.y + idleBob;
    const run = player.runFrame;
    const onGround = !player.isJumping;
    const tilt = (player.targetLane - player.laneX) * 0.10 + player.laneTilt * 0.05;
    const stretch = 1 + player.jumpStretch * 0.07 - player.landSquash * 0.03;
    const squash = 1 - player.jumpStretch * 0.05 + player.landSquash * 0.07;

    const bodyScale = (p.height / 720) * 1.23;

    // Try sprite first — draw outside the canvas transform stack so squash/stretch apply separately
    // runFrame advances at speed*0.7/tick; divide by 3.15 to target ~12 FPS at base speed (10–14 FPS range)
    const frameIndex = Math.floor(Math.abs(player.runFrame) / 3.15) % 8;
    const runKey = `playerFarmerRun${String(frameIndex + 1).padStart(2, '0')}`;
    const spriteImg = (this.assets.get(runKey) ?? this.assets.get('playerFarmerRun01'));
    // Always derive proportions from frame 01 so all frames render at the same size.
    const refFrame = this.assets.get('playerFarmerRun01') ?? spriteImg;
    if (spriteImg?.naturalWidth && !isClone) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.scale(squash, stretch);
      const spriteW = 118 * bodyScale;
      const spriteH = spriteW * (refFrame.naturalHeight / refFrame.naturalWidth);
      ctx.drawImage(spriteImg, -spriteW / 2, -spriteH, spriteW, spriteH);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(bodyScale * squash, bodyScale * stretch);

    if (isClone) {
      ctx.save();
      ctx.rotate(-tilt);
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = '#a978ff';
      ctx.beginPath();
      ctx.ellipse(0, -78, 42, 92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const airT = -player.y / 100;
    ctx.save();
    ctx.rotate(-tilt);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - Math.min(0.7, airT))})`;
    ctx.beginPath();
    ctx.ellipse(0, -player.y + 4, 36 - airT * 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const legLeftOffset = onGround ? Math.sin(run) * 12 : -8;
    const legRightOffset = onGround ? Math.sin(run + Math.PI) * 12 : -8;

    ctx.fillStyle = '#3a2410';
    ctx.fillRect(-18, -8 + Math.min(0, legLeftOffset * 0.3), 16, 10);
    ctx.fillRect(2, -8 + Math.min(0, legRightOffset * 0.3), 16, 10);
    ctx.fillStyle = '#2a5aa0';
    ctx.fillRect(-18, -52 + legLeftOffset * 0.2, 16, 44 + Math.abs(legLeftOffset * 0.1));
    ctx.fillRect(2, -52 + legRightOffset * 0.2, 16, 44 + Math.abs(legRightOffset * 0.1));
    ctx.fillStyle = '#1f4280';
    ctx.fillRect(-18, -52 + legLeftOffset * 0.2, 4, 44);
    ctx.fillRect(2, -52 + legRightOffset * 0.2, 4, 44);

    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(-28, -100, 56, 54);
    ctx.fillStyle = '#2a6a2a';
    ctx.fillRect(-28, -52, 56, 6);
    ctx.fillStyle = '#4ca84c';
    ctx.fillRect(-26, -100, 8, 54);
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(-22, -118, 8, 22);
    ctx.fillRect(14, -118, 8, 22);
    ctx.fillStyle = '#5fbf52';
    ctx.fillRect(-12, -72, 24, 6);
    ctx.fillStyle = '#7dd66e';
    ctx.fillRect(-4, -76, 8, 14);
    ctx.fillStyle = '#5fbf52';
    ctx.beginPath();
    ctx.moveTo(-12, -72);
    ctx.lineTo(-18, -66);
    ctx.lineTo(-12, -66);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -72);
    ctx.lineTo(18, -66);
    ctx.lineTo(12, -66);
    ctx.closePath();
    ctx.fill();

    const armSwing = onGround ? Math.sin(run + Math.PI) * 6 : -8;
    ctx.fillStyle = '#f0eee0';
    ctx.fillRect(-38, -100 + armSwing * 0.2, 12, 24);
    ctx.fillRect(26, -100 - armSwing * 0.2, 12, 24);
    ctx.fillStyle = '#dcb088';
    ctx.fillRect(-38, -76 + armSwing * 0.4, 12, 20);
    ctx.fillRect(26, -76 - armSwing * 0.4, 12, 20);
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(-40, -58 + armSwing * 0.4, 16, 10);
    ctx.fillRect(24, -58 - armSwing * 0.4, 16, 10);

    ctx.save();
    ctx.translate(32, -58 - armSwing * 0.4);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(-2, -14, 4, 30);
    ctx.fillStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.lineTo(7, 16);
    ctx.lineTo(5, 28);
    ctx.lineTo(-5, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.fillRect(-7, 14, 14, 2);
    ctx.restore();

    ctx.fillStyle = '#dcb088';
    ctx.fillRect(-10, -110, 20, 12);
    ctx.fillStyle = '#6a3f1a';
    ctx.fillRect(-22, -140, 44, 34);
    ctx.fillStyle = '#502d12';
    ctx.fillRect(-22, -140, 6, 34);
    ctx.fillStyle = '#7a4f2a';
    ctx.fillRect(-22, -140, 44, 5);
    ctx.fillStyle = '#6a3f1a';
    ctx.fillRect(-26, -130, 4, 14);
    ctx.fillRect(22, -130, 4, 14);

    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.ellipse(0, -140, 42, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4a236';
    ctx.beginPath();
    ctx.ellipse(0, -138, 42, 6, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#f0d066';
    ctx.fillRect(-20, -160, 40, 20);
    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.ellipse(0, -160, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a4b2b';
    ctx.fillRect(-20, -146, 40, 4);
    ctx.fillStyle = 'rgba(160,120,40,0.4)';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(-18 + i * 8, -158, 1, 14);

    ctx.restore();
  }

  #particles(world) {
    const ctx = this.ctx;
    if (world.config.gameFeel.particles) {
      for (const particle of world.particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = Math.min(1, particle.life / 22);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (world.config.gameFeel.scorePopups) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const popup of world.scorePopups) {
        const t = popup.life / popup.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.35);
        ctx.font = `900 ${Math.round(18 * popup.scale)}px system-ui, sans-serif`;
        ctx.strokeStyle = 'rgba(22,36,18,0.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(popup.text, popup.x, popup.y);
        ctx.fillStyle = popup.color;
        ctx.fillText(popup.text, popup.x, popup.y);
      }
    }

    if (world.hitFlash > 0) {
      ctx.globalAlpha = world.hitFlash * 0.12;
      ctx.fillStyle = '#ff6464';
      ctx.fillRect(0, 0, this.projection.width, this.projection.height);
    }
    ctx.globalAlpha = 1;
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
