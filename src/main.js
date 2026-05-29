import { Game } from './core/Game.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { TouchControls } from './core/TouchControls.js';
import { SwipeGestures } from './core/SwipeGestures.js';
import { PerformanceHUD } from './core/PerformanceHUD.js';
import { GamepadDebugOverlay } from './core/GamepadDebugOverlay.js';
import { pickPixelRatio } from './core/PlatformInfo.js';
import { runPatternTests } from './systems/spawn/PatternTests.js';

const params = new URLSearchParams(window.location.search);
const isLocalDev = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const requestedDebug = params.get('debug') === '1' || params.get('debugRun') === '1' || params.get('autostart') === '1';
const debugAllowed = (isLocalDev && GAME_CONFIG.debug.allowLocalTools) || GAME_CONFIG.debug.allowRemoteTools;
const debugEnabled = requestedDebug && debugAllowed;
const autostart = debugEnabled && (params.get('autostart') === '1' || params.get('debugRun') === '1');
const freezeFrame = debugEnabled && params.get('debugFreeze') !== '0';
const captureSteps = debugEnabled ? Math.max(0, Number(params.get('debugSteps') || 12) || 12) : 0;

// ?seed=NN or ?seed=any-string → deterministic gameplay run. Useful for
// reproducing spawn sequences when investigating a specific bug. Without
// it, every session gets a fresh random seed.
const seedParam = params.get('seed');
const seed = seedParam === null
  ? undefined
  : /^[0-9]+$/.test(seedParam)
    ? Number(seedParam) >>> 0
    : seedParam;

// DPR selection: default 1 (pixel-art aesthetic + mobile fill rate, see
// PlatformInfo.pickPixelRatio for the full rationale). `?hidpi=1` opts into
// Retina up to 2×; `?dpr=N` is an explicit override for testing.
const pixelRatioChoice = pickPixelRatio(params, GAME_CONFIG.canvas.pixelRatio);

// `?roadStyle=tiles` boots with image-tile road; default is the procedural
// fillRect tile-grid. Press T at runtime to toggle between the two for
// quick A/B-comparison.
const roadStyle = params.get('roadStyle') === 'tiles' ? 'tiles' : 'procedural';

// `?debugAxis=1` enables castle-axis verification markers (drawn by
// LandmarksRenderer). Mutates the frozen config via a non-throwing
// shallow override.
if (params.get('debugAxis') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showAxis', { value: true, writable: false, configurable: true });
}
// `?debugSides=1` labels every side-aware scenery prop with its
// detected side, dx from road centre, and variant used (or FALLBACK
// when the designer's _left/_right pair isn't loaded).
if (params.get('debugSides') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showSides', { value: true, writable: false, configurable: true });
}

const canvas = document.getElementById('game');
const game = new Game(canvas, {
  autostart,
  freezeFrame,
  captureSteps,
  seed,
  pixelRatio: pixelRatioChoice.value,
  roadStyle,
});

// Live road-style toggle. Available in every build (not gated on debug)
// so the user can flip between procedural and image tiles to compare.
window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyT' || event.repeat) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  game.renderer.toggleRoadStyle();
});

new TouchControls(game.input);
// Canvas-level swipe gestures: complements the on-screen buttons. Swipes
// fire jump / crouch / lane-change; a stationary tap fires jump (and
// start, so a tap dismisses the menu).
new SwipeGestures(game.input, canvas);
// `?touch=1` forces the on-screen pad to appear on desktop — handy for
// testing the touch layout without a phone.
if (params.get('touch') === '1') document.body.classList.add('force-touch');

// Explicit orientation-change handler. `resize` fires on most modern
// browsers post-rotation, but iOS Safari sometimes only fires
// `orientationchange` reliably — adding both is cheap and defensive.
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => game.renderer.resizeToViewport(game.config.canvas.viewportPadding));
});

// `?gamepadDebug=1` shows an always-on gamepad inspection overlay. Gated
// independently of `?debug=1` so you can flip it on inside the PS5 / Xbox /
// Switch browser without unlocking the rest of the debug API.
if (params.get('gamepadDebug') === '1') new GamepadDebugOverlay();

const debugState = {
  enabled: debugEnabled,
  autostart,
  freezeFrame,
  errors: [],
  lastCapture: null,
  errorCountNode: null,
  captureNode: null,
};

function updateDebugPanel() {
  if (debugState.errorCountNode) {
    debugState.errorCountNode.textContent = `Errors: ${debugState.errors.length}`;
  }
  if (debugState.captureNode) {
    debugState.captureNode.textContent = debugState.lastCapture
      ? `Last capture: ${debugState.lastCapture.path.split('/').pop()}`
      : 'Last capture: none';
  }
}

function recordDebugError(kind, payload) {
  debugState.errors.push({
    kind,
    timestamp: new Date().toISOString(),
    ...payload,
  });
  updateDebugPanel();
}

function installDebugPanel(debugApi) {
  if (!debugEnabled) return;

  const panel = document.createElement('aside');
  panel.id = 'debug-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '1000',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(10, 20, 32, 0.88)',
    color: '#dfefff',
    font: '12px/1.3 monospace',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  });

  const title = document.createElement('div');
  title.textContent = 'ORCHID DEBUG';
  title.style.fontWeight = '700';
  panel.appendChild(title);

  const mode = document.createElement('div');
  mode.textContent = `Mode: ${autostart ? 'auto-run' : 'manual'}`;
  panel.appendChild(mode);

  debugState.errorCountNode = document.createElement('div');
  panel.appendChild(debugState.errorCountNode);

  debugState.captureNode = document.createElement('div');
  panel.appendChild(debugState.captureNode);

  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = 'Capture PNG';
  captureButton.addEventListener('click', () => {
    debugApi.captureCanvas().catch((error) => {
      console.error('[Orchid Debug] capture failed', error);
    });
  });
  panel.appendChild(captureButton);

  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.textContent = 'Restart Frame';
  restartButton.addEventListener('click', () => {
    if (autostart) game.startDebugRun();
    else game.world.start();
  });
  panel.appendChild(restartButton);

  for (const button of [captureButton, restartButton]) {
    Object.assign(button.style, {
      padding: '6px 8px',
      border: '0',
      borderRadius: '8px',
      cursor: 'pointer',
      background: '#8fe35e',
      color: '#11210b',
      font: 'inherit',
      fontWeight: '700',
    });
  }

  document.body.appendChild(panel);
  updateDebugPanel();
}

function installErrorCollector() {
  if (!debugEnabled) return;

  window.addEventListener('error', (event) => {
    recordDebugError('error', {
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? { message: event.reason.message, stack: event.reason.stack }
      : { message: String(event.reason) };
    recordDebugError('unhandledrejection', reason);
  });
}

function createDebugApi() {
  return {
    errors: debugState.errors,
    async captureCanvas(filename = `orchid-quest-runstate-${Date.now()}.png`) {
      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch('/__debug/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename }),
      });
      if (!response.ok) throw new Error(`Capture save failed: ${response.status}`);
      const payload = await response.json();
      debugState.lastCapture = payload;
      updateDebugPanel();
      console.log('[Orchid Debug] capture saved', payload.path);
      return payload;
    },
    captureDataUrl() {
      return canvas.toDataURL('image/png');
    },
    startDebugRun() {
      if (autostart) game.startDebugRun();
      // Skip the 3-2-1-GO countdown for debug/test entry so the simulation
      // ticks immediately (otherwise the first 200 frames are countdown-only
      // and spawn / collision tests have nothing to observe).
      else game.world.start({ skipCountdown: true });
    },
    resumeLiveUpdates() {
      game.resumeDebugRun();
    },
    getState() {
      const r = game.world.registry;
      let obstacles = 0;
      let collectibles = 0;
      let scenery = 0;
      for (const _ of r.query('Hitbox')) obstacles += 1;
      for (const _ of r.query('CollectibleData')) collectibles += 1;
      for (const _ of r.query('ScenicData')) scenery += 1;
      return {
        worldState: game.world.state,
        distanceRun: game.world.distanceRun,
        score: game.world.score,
        obstacles,
        collectibles,
        scenery,
        lastCapture: debugState.lastCapture,
        errors: debugState.errors,
      };
    },
    getSpawnLog() {
      return [...game.world.spawnSystem.spawnLog];
    },
    runPatternTests() {
      const results = runPatternTests();
      console.info('[PatternTests]', results.summary);
      return results;
    },
  };
}

installErrorCollector();

if (debugEnabled) {
  const debugApi = createDebugApi();
  window.__ORCHID_DEBUG__ = debugApi;
  installDebugPanel(debugApi);
  new PerformanceHUD(game, { pixelRatioChoice });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'F8') return;
    event.preventDefault();
    debugApi.captureCanvas().catch((error) => {
      console.error('[Orchid Debug] capture failed', error);
    });
  });
}

game.boot().catch((error) => {
  console.error('[Orchid Quest] boot failed', error);
  if (debugEnabled) {
    recordDebugError('boot', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});
