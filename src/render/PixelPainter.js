export class PixelPainter {
  constructor(ctx, spriteRenderer) {
    this.ctx = ctx;
    this.sprites = spriteRenderer;
  }

  flower(x, y, scale = 1) {
    if (this.sprites.draw('collectibleFlower', x, y, 42 * scale, 'center')) return;
    const ctx = this.ctx;
    ctx.fillStyle = '#f5b832';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * 8 * scale, y + Math.sin(angle) * 8 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#9d6417';
    ctx.beginPath(); ctx.arc(x, y, 5 * scale, 0, Math.PI * 2); ctx.fill();
  }

  heart(x, y, scale = 1) {
    if (this.sprites.draw('lifeHeart', x, y, 45 * scale, 'center')) return;
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#ff3855';
    ctx.beginPath();
    ctx.moveTo(x, y + 12 * s);
    ctx.bezierCurveTo(x - 28 * s, y - 6 * s, x - 18 * s, y - 28 * s, x, y - 12 * s);
    ctx.bezierCurveTo(x + 18 * s, y - 28 * s, x + 28 * s, y - 6 * s, x, y + 12 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(x - 9 * s, y - 12 * s, 6 * s, 5 * s);
  }

  mushroom(x, y, scale = 1, variant = 'red') {
    const spriteKey = variant === 'purple' ? 'mushroomPurple' : 'mushroomRed';
    const altKey = variant === 'purple' ? 'mushroomRed' : 'mushroomPurple';
    if (this.sprites.draw(spriteKey, x, y, 90 * scale, 'bottom')) return;
    if (this.sprites.draw(altKey, x, y, 90 * scale, 'bottom')) return;
    this.#fallbackMushroom(x, y, scale, variant);
  }

  bush(x, y, scale = 1) {
    if (this.sprites.draw('bushSpiky', x, y, 100 * scale, 'bottom')) return;
    this.#fallbackBush(x, y, scale);
  }

  wheat(x, y, scale = 1) {
    if (this.sprites.draw('wheatTuft', x, y, 105 * scale, 'bottom')) return;
    this.#fallbackBush(x, y, scale);
  }

  wallBlock(x, y, scale = 1, columns = 1, rows = 1) {
    if (columns >= 3 || rows > 1) {
      if (this.sprites.draw('brickPurplePlatform3', x, y, 150 * scale, 'bottom')) return;
    }
    if (this.sprites.draw('brickPurpleSingle', x, y, 72 * scale, 'bottom')) return;
    this.#fallbackWallBlock(x, y, scale, columns, rows);
  }

  questionBlock(x, y, scale = 1) {
    if (this.sprites.draw('questionBlock', x, y, 70 * scale, 'center')) return;
    this.#fallbackQuestionBlock(x, y, scale);
  }

  fence(x, y, scale = 1) {
    if (this.sprites.draw('fenceWoodShort', x, y, 105 * scale, 'bottom')) return;
    this.#fallbackFence(x, y, scale);
  }

  pipe(x, y, scale = 1) {
    if (this.sprites.draw('pipeGreen', x, y, 95 * scale, 'bottom')) return;
    this.#fallbackPipe(x, y, scale);
  }

  tree(x, y, scale = 1) {
    if (this.sprites.draw('treeRound', x, y, 112 * scale, 'bottom')) return;
    this.#fallbackTree(x, y, scale);
  }

  flowerBush(x, y, scale = 1) {
    if (this.sprites.draw('flowerPurpleCluster', x, y, 92 * scale, 'bottom')) return;
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#2b7a2e';
    ctx.beginPath(); ctx.arc(x, y - 12 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 14 * s, y - 7 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 14 * s, y - 7 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
    this.flower(x - 10 * s, y - 23 * s, s * 0.58);
    this.flower(x + 8 * s, y - 28 * s, s * 0.64);
  }

  smallFlower(x, y, scale = 1) {
    if (this.sprites.draw('flowerYellowSmall', x, y, 50 * scale, 'bottom')) return;
    this.flower(x, y - 18 * scale, scale * 0.7);
  }

  sprout(x, y, scale = 1) {
    if (this.sprites.draw('sprout', x, y, 48 * scale, 'bottom')) return;
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#3a7a2e'; ctx.fillRect(x - 3 * s, y - 28 * s, 6 * s, 28 * s);
    ctx.fillStyle = '#68c84a';
    ctx.beginPath(); ctx.ellipse(x - 10 * s, y - 28 * s, 12 * s, 7 * s, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 10 * s, y - 28 * s, 12 * s, 7 * s, 0.5, 0, Math.PI * 2); ctx.fill();
  }

  platform(x, y, scale = 1, variant = 0) {
    const key = variant === 1 ? 'terrainPlatformSmall' : 'terrainPlatformLong';
    const width = variant === 1 ? 90 : 160;
    if (this.sprites.draw(key, x, y, width * scale, 'bottom')) return;
    this.#fallbackPlatform(x, y, scale);
  }

  grassWall(x, y, scale = 1, variant = 0) {
    const key = variant === 1 ? 'terrainWallTallFlower' : 'terrainBlockFront';
    if (this.sprites.draw(key, x, y, 135 * scale, 'bottom')) return;
    this.#fallbackPlatform(x, y, scale * 1.15);
  }

  terrainBlock(x, y, scale = 1, variant = 0) {
    const keys = ['terrainBlockLeftFlower', 'terrainBlockFront', 'terrainBlockRightFlower', 'terrainStepLeft', 'terrainWallTallFlower'];
    const key = keys[Math.abs(variant) % keys.length];
    const width = key === 'terrainStepLeft' ? 145 : key === 'terrainWallTallFlower' ? 110 : 125;
    if (this.sprites.draw(key, x, y, width * scale, 'bottom')) return;
    this.grassWall(x, y, scale, variant);
  }

  stone(x, y, scale = 1) {
    // Stone is kept as a simple procedural fallback for variety.
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#8791a0';
    ctx.beginPath(); ctx.ellipse(x, y - 18 * s, 35 * s, 20 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5f6b79'; ctx.fillRect(x - 26 * s, y - 15 * s, 52 * s, 15 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 18 * s, y - 30 * s, 12 * s, 5 * s);
  }

  #fallbackMushroom(x, y, scale, variant) {
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#f4ead0'; ctx.fillRect(x - 12 * s, y - 28 * s, 24 * s, 28 * s);
    ctx.fillStyle = '#d8caa0'; ctx.fillRect(x + 6 * s, y - 28 * s, 6 * s, 28 * s);
    ctx.fillStyle = variant === 'purple' ? '#6a4fb5' : '#d63b3b';
    ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 32 * s, 22 * s, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 10 * s, y - 36 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 12 * s, y - 32 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  }

  #fallbackBush(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#b9802b';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = (28 + (i % 2 ? 6 : 0)) * s;
      ctx.lineTo(x + Math.cos(angle) * radius, y - 14 * s + Math.sin(angle) * radius * 0.6);
    }
    ctx.closePath(); ctx.fill();
  }

  #fallbackWallBlock(x, y, scale, columns, rows) {
    const ctx = this.ctx;
    const s = scale;
    const size = 50 * s;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const bx = x - (columns * size) / 2 + col * size;
        const by = y - (row + 1) * size;
        ctx.fillStyle = '#7e3eb2'; ctx.fillRect(bx, by, size, size);
        ctx.fillStyle = '#552676'; ctx.fillRect(bx + 4 * s, by + 4 * s, size - 8 * s, size - 8 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx, by, size, 4 * s);
      }
    }
  }

  #fallbackQuestionBlock(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    const size = 56 * s;
    ctx.fillStyle = '#d58b19'; ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 4 * s; ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = '#fff0c2'; ctx.font = `${42 * s}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 2 * s);
  }

  #fallbackFence(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#a06b3e'; ctx.fillRect(x - 22 * s, y - 20 * s, 44 * s, 4 * s);
    for (let i = 0; i < 4; i++) {
      const px = x - 22 * s + i * 14 * s;
      ctx.fillRect(px, y - 30 * s, 4 * s, 30 * s);
    }
  }

  #fallbackPipe(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#219c35'; ctx.fillRect(x - 28 * s, y - 64 * s, 56 * s, 64 * s);
    ctx.fillStyle = '#42c94f'; ctx.fillRect(x - 38 * s, y - 78 * s, 76 * s, 18 * s);
    ctx.fillStyle = '#0a5f20'; ctx.fillRect(x - 28 * s, y - 72 * s, 56 * s, 8 * s);
  }

  #fallbackTree(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    ctx.fillStyle = '#6e4a26'; ctx.fillRect(x - 7 * s, y - 36 * s, 14 * s, 36 * s);
    ctx.fillStyle = '#2e8b2e';
    ctx.beginPath(); ctx.arc(x, y - 60 * s, 44 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#48a948'; ctx.beginPath(); ctx.arc(x - 8 * s, y - 75 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
  }

  #fallbackPlatform(x, y, scale) {
    const ctx = this.ctx;
    const s = scale;
    const w = 110 * s;
    const h = 42 * s;
    const left = x - w / 2;
    const top = y - h;
    ctx.fillStyle = '#5db73c'; ctx.fillRect(left, top - 10 * s, w, 12 * s);
    ctx.fillStyle = '#78d34c'; ctx.fillRect(left, top - 10 * s, w, 4 * s);
    ctx.fillStyle = '#7b5128'; ctx.fillRect(left, top, w, h);
    ctx.fillStyle = '#5b3a1b';
    for (let i = 0; i < 16; i++) {
      const px = left + (i * 17 * s) % w;
      const py = top + Math.floor(i / 6) * 14 * s;
      ctx.fillRect(px, py, 8 * s, 8 * s);
    }
  }
}
