export class HudSystem {
  constructor(eventBus, world) {
    this.world = world;
    this.score = document.getElementById('score');
    this.hearts = document.getElementById('hearts');
    this.distance = document.getElementById('distance');
    this.tier = document.getElementById('tier');
    this.bestScore = document.getElementById('best-score');
    this.powerups = document.getElementById('powerups');
    this.jumpbar = document.getElementById('jumpbar');
    this.overlay = document.getElementById('overlay');
    this.title = document.getElementById('title');
    this.sub = document.getElementById('sub');
    this.startButton = document.getElementById('start-button');

    eventBus.on('scoreChanged', () => this.render());
    eventBus.on('livesChanged', () => this.render());
    eventBus.on('tierChanged', () => this.render());
    eventBus.on('powerUpsChanged', () => this.render());
    eventBus.on('stateChanged', (state) => this.#state(state));
    this.render();
  }

  bindStart(handler) {
    this.startButton.addEventListener('click', handler);
  }

  bindPause(handler) {
    document.getElementById('pause').addEventListener('click', handler);
  }

  render() {
    this.score.textContent = String(this.world.score);
    this.distance.textContent = `${Math.floor(this.world.distanceRun)}m`;
    this.tier.textContent = this.#tierLabel();
    this.bestScore.textContent = String(this.world.bestScore);
    this.powerups.innerHTML = this.#powerUpText();

    const lives = Math.max(0, this.world.lives);
    const maxHearts = Math.max(lives, this.world.config.gameplay.startLives);
    this.hearts.innerHTML = Array.from({ length: maxHearts }, (_, i) => {
      const src = i < lives
        ? './assets/ui/icons/heart_full.png'
        : './assets/ui/icons/heart_empty.png';
      return `<img src="${src}" class="hud-heart" alt="">`;
    }).join('');

    const total = 5;
    const filled = this.world.player.isJumping
      ? Math.max(0, total - Math.floor(this.world.player.jumpHoldFrames / 2))
      : total;
    this.jumpbar.innerHTML = Array.from({ length: total }, (_, i) => {
      const src = i < filled
        ? './assets/ui/icons/energy_segment_full.png'
        : './assets/ui/icons/energy_segment_empty.png';
      return `<img src="${src}" class="hud-energy" alt="">`;
    }).join('');
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
    return rows.length ? rows.join('<br>') : '<span class="muted">No power-up</span>';
  }

  #state(state) {
    if (state === 'playing') {
      this.overlay.classList.remove('on');
      return;
    }

    if (state === 'menu') {
      this.#show(
        'Orchid Quest',
        'Collect Orchids, jump over vines, and avoid harmful greens. Tree gives a speed burst. Purple mushroom splits you into clones.',
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
