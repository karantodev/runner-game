const HEART_ICON_FULL = './assets/ui/icons/heart_full.png';
const HEART_ICON_EMPTY = './assets/ui/icons/heart_empty.png';
const ENERGY_ICON_FULL = './assets/ui/icons/energy_segment_full.png';
const ENERGY_ICON_EMPTY = './assets/ui/icons/energy_segment_empty.png';
const JUMP_BAR_SEGMENTS = 5;

export class HudSystem {
  constructor(eventBus, world) {
    this.world = world;
    this.score = document.getElementById('score');
    this.hearts = document.getElementById('hearts');
    this.distance = document.getElementById('distance');
    this.tier = document.getElementById('tier');
    this.bestScore = document.getElementById('best-score');
    this.powerups = document.getElementById('powerups');
    this.powerupsBox = document.getElementById('powerups-box');
    this.jumpbar = document.getElementById('jumpbar');
    this.overlay = document.getElementById('overlay');
    this.title = document.getElementById('title');
    this.sub = document.getElementById('sub');
    this.startButton = document.getElementById('start-button');

    // Last-rendered cache so the DOM is touched only when a value actually changes.
    this._last = {
      score: -1,
      distance: -1,
      tier: '',
      best: -1,
      hearts: -1,
      heartsCapacity: -1,
      jumpbarFilled: -1,
      powerupsText: null,
    };

    eventBus.on('scoreChanged', () => { this.#renderScore(); this.#renderTier(); });
    eventBus.on('livesChanged', () => this.#renderHearts());
    eventBus.on('tierChanged', () => this.#renderTier());
    eventBus.on('powerUpsChanged', () => this.#renderPowerUps());
    eventBus.on('distanceChanged', () => this.#renderDistance());
    eventBus.on('stateChanged', (state) => this.#state(state));

    this.#renderAll();
  }

  bindStart(handler) {
    this.startButton.addEventListener('click', handler);
  }

  bindPause(handler) {
    document.getElementById('pause').addEventListener('click', handler);
  }

  /**
   * Per-frame tick for dynamic widgets that change continuously
   * (distance counter, jumpbar). Each setter is dirty-checked so the DOM
   * still only updates when a value actually changes.
   */
  tick() {
    this.#renderDistance();
    this.#renderJumpBar();
  }

  #renderAll() {
    this.#renderScore();
    this.#renderDistance();
    this.#renderHearts();
    this.#renderTier();
    this.#renderPowerUps();
    this.#renderJumpBar();
  }

  #renderScore() {
    if (this.world.score === this._last.score) return;
    this._last.score = this.world.score;
    this.score.textContent = String(this.world.score);
    if (this.world.bestScore !== this._last.best) {
      this._last.best = this.world.bestScore;
      this.bestScore.textContent = String(this.world.bestScore);
    }
  }

  #renderDistance() {
    const floored = Math.floor(this.world.distanceRun);
    if (floored === this._last.distance) return;
    this._last.distance = floored;
    this.distance.textContent = `${floored}m`;
  }

  #renderTier() {
    const label = this.#tierLabel();
    if (label === this._last.tier) return;
    this._last.tier = label;
    this.tier.textContent = label;
  }

  #renderHearts() {
    const lives = Math.max(0, this.world.lives);
    const capacity = Math.max(lives, this.world.config.gameplay.startLives);
    if (lives === this._last.hearts && capacity === this._last.heartsCapacity) return;
    this._last.hearts = lives;
    this._last.heartsCapacity = capacity;
    let html = '';
    for (let i = 0; i < capacity; i += 1) {
      const src = i < lives ? HEART_ICON_FULL : HEART_ICON_EMPTY;
      html += `<img src="${src}" class="hud-heart" alt="">`;
    }
    this.hearts.innerHTML = html;
  }

  #renderJumpBar() {
    const vert = this.world.player?.components.VerticalState;
    const filled = vert?.isJumping
      ? Math.max(0, JUMP_BAR_SEGMENTS - Math.floor(vert.jumpHoldFrames / 2))
      : JUMP_BAR_SEGMENTS;
    if (filled === this._last.jumpbarFilled) return;
    this._last.jumpbarFilled = filled;
    let html = '';
    for (let i = 0; i < JUMP_BAR_SEGMENTS; i += 1) {
      const src = i < filled ? ENERGY_ICON_FULL : ENERGY_ICON_EMPTY;
      html += `<img src="${src}" class="hud-energy" alt="">`;
    }
    this.jumpbar.innerHTML = html;
  }

  #renderPowerUps() {
    const text = this.#powerUpText();
    if (text === this._last.powerupsText) return;
    this._last.powerupsText = text;
    this.powerups.innerHTML = text;
    this.powerupsBox.style.display = text ? '' : 'none';
  }

  #tierLabel() {
    if (this.world.currentTier <= 0) return 'Tier: Start';
    const threshold = this.world.config.gameplay.scoreTiers[this.world.currentTier - 1];
    return `Tier ${this.world.currentTier}: ${threshold}+`;
  }

  #powerUpText() {
    const snapshot = this.world.powerUpSystem.snapshot();
    const rows = [];
    if (snapshot.speedBurstActive) rows.push(`<b>⚡ Burst</b> ${Math.ceil(snapshot.speedBurstFrames / 60)}s`);
    if (snapshot.splitClonesActive) rows.push(`<b>✦ Split</b> ${Math.ceil(snapshot.splitClonesFrames / 60)}s`);
    return rows.join('<br>');
  }

  #state(state) {
    if (state === 'playing') {
      this.overlay.classList.remove('on');
      return;
    }

    if (state === 'menu') {
      this.#show(
        'Orchid Quest',
        'Collect Orchids, jump over vines (SPACE / ↑), duck under hanging branches (↓ / S), and avoid harmful greens. Tree gives a speed burst. Purple mushroom splits you into clones.',
        'Start Run',
      );
    }

    if (state === 'paused') {
      this.#show('Paused', 'Take a breather. Click resume or press ESC/P.', 'Resume');
    }

    if (state === 'dead') {
      this.#show(
        'Run Complete',
        `All lives are gone.<br>Orchids collected: <b>${this.world.score}</b><br>Distance: <b>${Math.floor(this.world.distanceRun)}m</b><br>${this.#tierLabel()}<br>Best: <b>${this.world.bestScore}</b><br><br>Click <b>Run again</b> to restart.`,
        'Run again',
      );
    }
  }

  #show(title, sub, button) {
    this.title.textContent = title;
    this.sub.innerHTML = sub;
    this.startButton.textContent = button;
    this.overlay.classList.add('on');
  }
}
