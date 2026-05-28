/**
 * Lightweight live metrics overlay. Top-left fixed panel showing FPS
 * (rolling average over the most recent ~500ms window) + counts of live
 * entities by component-shape.
 *
 * Self-driven via requestAnimationFrame — does NOT plug into the game
 * loop, so toggling debug off cleanly stops it (just don't construct one).
 *
 * Instantiate only when `?debug=1` is on; one HUD per session.
 */
export class PerformanceHUD {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this._lastSampleAt = performance.now();
    this._framesSinceSample = 0;
    this._fps = 0;
    this._element = this.#buildDom();
    document.body.appendChild(this._element);
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _tick() {
    this._framesSinceSample += 1;
    const now = performance.now();
    const elapsed = now - this._lastSampleAt;
    if (elapsed >= 500) {
      this._fps = (this._framesSinceSample * 1000) / elapsed;
      this._framesSinceSample = 0;
      this._lastSampleAt = now;
      this.#render();
    }
    requestAnimationFrame(this._tick);
  }

  #render() {
    const registry = this.game.world.registry;
    let total = 0;
    let obstacles = 0;
    let collectibles = 0;
    let scenery = 0;
    let particles = 0;
    let popups = 0;
    // Walk the registry directly — cheaper than four query() generators
    // on every render, and this code only runs twice per second.
    for (const e of registry._list) {
      if (!e.alive) continue;
      total += 1;
      const c = e.components;
      if ('Hitbox' in c) obstacles += 1;
      else if ('CollectibleData' in c) collectibles += 1;
      else if ('ScenicData' in c) scenery += 1;
      else if ('ParticleTag' in c) particles += 1;
      else if ('ScorePopupTag' in c) popups += 1;
    }
    const fpsColor = this._fps >= 55 ? '#9af07a' : this._fps >= 30 ? '#ffd86a' : '#ff7878';
    const w = this.game.world;
    this._element.innerHTML = `
      <div class="row"><span class="lbl">FPS</span><b style="color:${fpsColor}">${this._fps.toFixed(1)}</b></div>
      <div class="row"><span class="lbl">State</span><b>${w.state}</b></div>
      <div class="row"><span class="lbl">Speed</span><b>${w.speed.toFixed(2)}</b></div>
      <div class="row"><span class="lbl">Entities</span><b>${total}</b></div>
      <div class="row"><span class="lbl">Obstacles</span><b>${obstacles}</b></div>
      <div class="row"><span class="lbl">Collect</span><b>${collectibles}</b></div>
      <div class="row"><span class="lbl">Scenery</span><b>${scenery}</b></div>
      <div class="row"><span class="lbl">Particles</span><b>${particles}</b></div>
      <div class="row"><span class="lbl">Popups</span><b>${popups}</b></div>
    `;
  }

  #buildDom() {
    const panel = document.createElement('aside');
    panel.id = 'perf-hud';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '12px',
      left: '12px',
      zIndex: '1000',
      minWidth: '128px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(10, 20, 32, 0.86)',
      color: '#dfefff',
      font: '11px/1.45 ui-monospace, "SF Mono", Menlo, monospace',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.32)',
      pointerEvents: 'none',
    });
    const style = document.createElement('style');
    style.textContent = `
      #perf-hud .row { display: flex; justify-content: space-between; gap: 12px; }
      #perf-hud .lbl { color: rgba(223, 239, 255, 0.62); }
      #perf-hud b { color: #f1faff; font-weight: 700; }
    `;
    panel.appendChild(style);
    return panel;
  }
}
