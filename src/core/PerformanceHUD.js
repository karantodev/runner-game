import { PLATFORM, platformLabel } from './PlatformInfo.js';

/**
 * Live diagnostics overlay. Top-left fixed panel showing FPS (avg + min
 * over a rolling window), per-frame timing breakdown (update vs render),
 * GC indicator (when `performance.memory` is exposed), live entity counts,
 * gamepad mapping + active buttons, and the platform / DPR context.
 *
 * Designed to be readable on console TVs at distance, so the panel is a
 * little chunkier than a typical browser overlay.
 *
 * Two cadences:
 *   - sample()  — every requestAnimationFrame, no DOM access. Walks the
 *                 ring buffer for min/max FPS, polls gamepad state, etc.
 *   - render()  — twice per second, writes to the DOM.
 *
 * Toggle: press `H` (or hold gamepad Select / Share) to hide / show.
 *
 * Instantiate only when `?debug=1` is on; one HUD per session.
 */
const SAMPLE_WINDOW_FRAMES = 120;     // 2 seconds at 60 fps
const RENDER_INTERVAL_MS = 500;       // DOM updates twice per second
const LONG_FRAME_THRESHOLD_MS = 18;   // anything >18 ms = visible hitch
const GC_DELTA_BYTES = 2 * 1024 * 1024; // heap drop ≥ 2 MB ≈ a GC
const STANDARD_BUTTON_LABELS = [
  'A', 'B', 'X', 'Y',
  'LB', 'RB', 'LT', 'RT',
  'Sel', 'Start', 'LS', 'RS',
  '↑', '↓', '←', '→',
  'Home',
];

export class PerformanceHUD {
  /**
   * @param {import('./Game.js').Game} game
   * @param {{ pixelRatioChoice?: { value: number, source: string } }} [options]
   */
  constructor(game, options = {}) {
    this.game = game;
    this.pixelRatioChoice = options.pixelRatioChoice ?? null;
    this.visible = true;

    // Rolling frame-delta ring (ms). Used for avg / min / max + long-frame count.
    this._frameMs = new Float32Array(SAMPLE_WINDOW_FRAMES);
    this._frameWriteIdx = 0;
    this._frameFilled = 0;
    this._longFramesTotal = 0;

    // Rolling update / render timing rings.
    this._updateMs = new Float32Array(SAMPLE_WINDOW_FRAMES);
    this._renderMs = new Float32Array(SAMPLE_WINDOW_FRAMES);

    this._lastRenderAt = 0;
    this._lastFrameCount = game.loop.metrics.frameCount;

    // GC tracking — only meaningful when `performance.memory` is exposed.
    /** @type {number | null} */
    this._lastHeap = PLATFORM.hasMemoryApi ? performance.memory.usedJSHeapSize : null;
    this._gcCount = 0;
    this._lastGcAt = 0;

    // Gamepad state (most recent poll).
    this._gamepadInfo = null;
    this._gamepadPressed = '';

    this._element = this.#buildDom();
    document.body.appendChild(this._element);

    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);

    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyH') this.#toggle();
    });
    window.addEventListener('gamepadconnected', (event) => this.#onGamepadConnected(event));
    window.addEventListener('gamepaddisconnected', () => { this._gamepadInfo = null; });
  }

  _tick(now) {
    const loopMetrics = this.game.loop.metrics;
    if (loopMetrics.frameCount !== this._lastFrameCount) {
      this._lastFrameCount = loopMetrics.frameCount;
      this.#recordSample(loopMetrics);
    }
    this.#pollGamepad();
    if (PLATFORM.hasMemoryApi) this.#pollHeap();

    if (now - this._lastRenderAt >= RENDER_INTERVAL_MS) {
      this._lastRenderAt = now;
      if (this.visible) this.#render();
    }
    requestAnimationFrame(this._tick);
  }

  /** Push one frame of timing into the ring buffers. */
  #recordSample(loopMetrics) {
    const i = this._frameWriteIdx;
    this._frameMs[i] = loopMetrics.frameDeltaMs;
    this._updateMs[i] = loopMetrics.updateMs;
    this._renderMs[i] = loopMetrics.renderMs;
    this._frameWriteIdx = (i + 1) % SAMPLE_WINDOW_FRAMES;
    if (this._frameFilled < SAMPLE_WINDOW_FRAMES) this._frameFilled += 1;
    if (loopMetrics.frameDeltaMs > LONG_FRAME_THRESHOLD_MS) this._longFramesTotal += 1;
  }

  /** Aggregate ring buffer → { avg, min, max, p95 } for frame delta. */
  #frameStats() {
    const n = this._frameFilled;
    if (n === 0) return { avgFps: 0, minFps: 0, maxFrameMs: 0, longRecent: 0 };
    let sum = 0;
    let maxDelta = 0;
    let longRecent = 0;
    for (let k = 0; k < n; k += 1) {
      const d = this._frameMs[k];
      sum += d;
      if (d > maxDelta) maxDelta = d;
      if (d > LONG_FRAME_THRESHOLD_MS) longRecent += 1;
    }
    const avgDelta = sum / n;
    return {
      avgFps: avgDelta > 0 ? 1000 / avgDelta : 0,
      minFps: maxDelta > 0 ? 1000 / maxDelta : 0,
      maxFrameMs: maxDelta,
      longRecent,
    };
  }

  /** Average + max over the ring buffer for an arbitrary timing array. */
  #avgOver(buffer) {
    const n = this._frameFilled;
    if (n === 0) return { avg: 0, max: 0 };
    let sum = 0;
    let max = 0;
    for (let k = 0; k < n; k += 1) {
      const v = buffer[k];
      sum += v;
      if (v > max) max = v;
    }
    return { avg: sum / n, max };
  }

  #pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = Array.from(pads).find(Boolean);
    if (!pad) {
      this._gamepadInfo = null;
      this._gamepadPressed = '';
      return;
    }
    this._gamepadInfo = {
      id: pad.id,
      mapping: pad.mapping || '(non-standard)',
      buttons: pad.buttons.length,
      axes: pad.axes.length,
    };
    // List currently-pressed buttons by their standard-mapping label.
    const pressed = [];
    for (let i = 0; i < pad.buttons.length; i += 1) {
      if (pad.buttons[i]?.pressed) {
        pressed.push(STANDARD_BUTTON_LABELS[i] ?? `b${i}`);
      }
    }
    // Add active axes (deadzone 0.25) so analog motion is visible too.
    for (let i = 0; i < pad.axes.length; i += 1) {
      const v = pad.axes[i] ?? 0;
      if (Math.abs(v) > 0.25) pressed.push(`a${i}:${v.toFixed(2)}`);
    }
    this._gamepadPressed = pressed.join(' ');
  }

  #pollHeap() {
    const heap = performance.memory.usedJSHeapSize;
    if (this._lastHeap !== null && this._lastHeap - heap > GC_DELTA_BYTES) {
      this._gcCount += 1;
      this._lastGcAt = performance.now();
    }
    this._lastHeap = heap;
  }

  #countEntities() {
    const world = this.game.world;
    const registry = world.registry;
    let total = 0;
    let obstacles = 0;
    let collectibles = 0;
    let scenery = 0;
    // Walk the registry directly — cheaper than three query() generators
    // on every render, and this only runs twice per second.
    for (const e of registry._list) {
      if (!e.alive) continue;
      total += 1;
      const c = e.components;
      if ('Hitbox' in c) obstacles += 1;
      else if ('CollectibleData' in c) collectibles += 1;
      else if ('ScenicData' in c) scenery += 1;
    }
    // Particles + popups live in pool-backed arrays, not the registry.
    const particles = world.particleSystem.particles.length;
    const popups = world.popupSystem.popups.length;
    return { total, obstacles, collectibles, scenery, particles, popups };
  }

  #render() {
    const fps = this.#frameStats();
    const updateTiming = this.#avgOver(this._updateMs);
    const renderTiming = this.#avgOver(this._renderMs);
    const counts = this.#countEntities();
    const w = this.game.world;
    const loopMetrics = this.game.loop.metrics;

    const fpsColor = fps.avgFps >= 55 ? '#9af07a' : fps.avgFps >= 30 ? '#ffd86a' : '#ff7878';
    const minFpsColor = fps.minFps >= 50 ? '#9af07a' : fps.minFps >= 28 ? '#ffd86a' : '#ff7878';

    const canvas = this.game.canvas;
    const dprChoice = this.pixelRatioChoice;
    const dprLabel = dprChoice
      ? `${dprChoice.value} (${dprChoice.source}, native ${PLATFORM.nativeDpr})`
      : `${PLATFORM.nativeDpr}`;
    const canvasSize = `${canvas.width}×${canvas.height}`;
    const viewport = `${window.innerWidth}×${window.innerHeight}`;

    const heapLine = PLATFORM.hasMemoryApi
      ? `<div class="row"><span class="lbl">Heap</span><b>${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB</b></div>
         <div class="row"><span class="lbl">GC events</span><b>${this._gcCount}</b></div>`
      : '<div class="row"><span class="lbl">Heap</span><b class="muted">n/a</b></div>';

    const gamepadLine = this._gamepadInfo
      ? `<div class="row"><span class="lbl">Gamepad</span><b>${this._gamepadInfo.mapping}</b></div>
         <div class="row"><span class="lbl">→ id</span><b class="small">${escapeHtml(this._gamepadInfo.id.slice(0, 32))}</b></div>
         <div class="row"><span class="lbl">→ input</span><b class="small">${this._gamepadPressed || '·'}</b></div>`
      : '<div class="row"><span class="lbl">Gamepad</span><b class="muted">not connected</b></div>';

    const dropped = loopMetrics.droppedBacklog ? '<span class="warn">backlog dropped</span>' : '';
    const difficultyBlock = this.#difficultyBlock(w);

    this._element.innerHTML = `
      <div class="section">
        <div class="row"><span class="lbl">FPS avg</span><b style="color:${fpsColor}">${fps.avgFps.toFixed(1)}</b></div>
        <div class="row"><span class="lbl">FPS min</span><b style="color:${minFpsColor}">${fps.minFps.toFixed(1)}</b></div>
        <div class="row"><span class="lbl">Worst frame</span><b>${fps.maxFrameMs.toFixed(1)} ms</b></div>
        <div class="row"><span class="lbl">Long ≥18ms</span><b>${fps.longRecent} / ${this._longFramesTotal}</b></div>
      </div>
      <div class="section">
        <div class="row"><span class="lbl">Update</span><b>${updateTiming.avg.toFixed(2)} ms <span class="muted">max ${updateTiming.max.toFixed(1)}</span></b></div>
        <div class="row"><span class="lbl">Render</span><b>${renderTiming.avg.toFixed(2)} ms <span class="muted">max ${renderTiming.max.toFixed(1)}</span></b></div>
        <div class="row"><span class="lbl">Steps</span><b>${loopMetrics.updateSteps} ${dropped}</b></div>
      </div>
      <div class="section">
        ${heapLine}
      </div>
      ${difficultyBlock}
      <div class="section">
        <div class="row"><span class="lbl">State</span><b>${w.state}</b></div>
        <div class="row"><span class="lbl">Speed</span><b>${w.speed.toFixed(2)}</b></div>
        <div class="row"><span class="lbl">Entities</span><b>${counts.total}</b></div>
        <div class="row sub"><span class="lbl">  obstacles</span><b>${counts.obstacles}</b></div>
        <div class="row sub"><span class="lbl">  collect</span><b>${counts.collectibles}</b></div>
        <div class="row sub"><span class="lbl">  scenery</span><b>${counts.scenery}</b></div>
        <div class="row sub"><span class="lbl">  particles</span><b>${counts.particles}</b></div>
        <div class="row sub"><span class="lbl">  popups</span><b>${counts.popups}</b></div>
      </div>
      <div class="section">
        ${gamepadLine}
      </div>
      <div class="section">
        <div class="row"><span class="lbl">Platform</span><b class="small">${platformLabel()}</b></div>
        <div class="row"><span class="lbl">DPR</span><b>${dprLabel}</b></div>
        <div class="row"><span class="lbl">Canvas</span><b class="small">${canvasSize}</b></div>
        <div class="row"><span class="lbl">Window</span><b class="small">${viewport}</b></div>
      </div>
      <div class="hint">H: hide</div>
    `;
  }

  /**
   * v3.5: difficulty + skill telemetry section. Reads live state from
   * SpawnSystem.director + AdaptiveSkill. Shows current level, skill bias
   * label, pattern / orchid spacing, and recent run distances so the
   * tuner can see "why" a pattern just spawned the way it did.
   */
  #difficultyBlock(w) {
    const spawn = w.spawnSystem;
    if (!spawn) return '';
    // v3.5: read the cached difficulty snapshot from SpawnSystem instead
    // of calling director.get() per-frame. director.get() consumes
    // seeded RNG, which would break deterministic replay tests if the
    // perf HUD was driving extra calls.
    const diff = spawn.lastDifficulty;
    if (!diff) return '';
    const skill = w.adaptiveSkill ? w.adaptiveSkill.level() : 'normal';
    const stats = w.playerStats ? w.playerStats.snapshot() : null;
    const recent = (stats && stats.recentRunDistances) || [];
    const recentLabel = recent.length ? recent.map((d) => d + 'm').join(' ') : '-';
    const nextPattern = (spawn.nextPattern != null) ? spawn.nextPattern.toFixed(1) : '-';
    return '<div class="section">'
      + '<div class="row"><span class="lbl">Level</span><b>' + diff.level + '</b></div>'
      + '<div class="row"><span class="lbl">Skill</span><b>' + skill + '</b></div>'
      + '<div class="row sub"><span class="lbl">  pattern d</span><b>' + diff.patternSpacing.toFixed(1) + '</b></div>'
      + '<div class="row sub"><span class="lbl">  orchid d</span><b>' + diff.orchidSpacing.toFixed(1) + '</b></div>'
      + '<div class="row sub"><span class="lbl">  next pattern</span><b>' + nextPattern + '</b></div>'
      + '<div class="row sub"><span class="lbl">  recent</span><b class="small">' + recentLabel + '</b></div>'
      + '</div>';
  }

  #onGamepadConnected(event) {
    const pad = event.gamepad;
    if (!pad) return;
    console.info(`[PerformanceHUD] Gamepad connected: ${pad.id} (mapping=${pad.mapping || 'non-standard'}, ${pad.buttons.length} buttons, ${pad.axes.length} axes)`);
  }

  #toggle() {
    this.visible = !this.visible;
    this._element.style.display = this.visible ? '' : 'none';
  }

  #buildDom() {
    const panel = document.createElement('aside');
    panel.id = 'perf-hud';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '12px',
      left: '12px',
      zIndex: '1000',
      minWidth: '210px',
      maxWidth: '320px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(10, 20, 32, 0.88)',
      color: '#dfefff',
      font: '12px/1.45 ui-monospace, "SF Mono", Menlo, monospace',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.36)',
      pointerEvents: 'none',
    });
    const style = document.createElement('style');
    style.textContent = `
      #perf-hud .section { padding: 4px 0; border-bottom: 1px solid rgba(140, 180, 220, 0.16); }
      #perf-hud .section:last-of-type { border-bottom: 0; }
      #perf-hud .row { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
      #perf-hud .row.sub .lbl { color: rgba(223, 239, 255, 0.42); }
      #perf-hud .lbl { color: rgba(223, 239, 255, 0.62); }
      #perf-hud b { color: #f1faff; font-weight: 700; }
      #perf-hud .muted { color: rgba(223, 239, 255, 0.42); font-weight: 400; }
      #perf-hud .small { font-size: 10.5px; }
      #perf-hud .warn { color: #ffb060; font-weight: 700; margin-left: 6px; }
      #perf-hud .hint { padding-top: 6px; color: rgba(223, 239, 255, 0.42); font-size: 10px; }
    `;
    panel.appendChild(style);
    return panel;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
