import { Game } from './core/Game.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { TouchControls } from './core/TouchControls.js';
import { PerformanceHUD } from './core/PerformanceHUD.js';
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

// ?hidpi=1 promotes the canvas backing store to window.devicePixelRatio.
// Off by default (pixel-art look + lower mobile fill). On = crisp Retina.
const hiDpi = params.get('hidpi') === '1';
const pixelRatio = hiDpi ? (window.devicePixelRatio ?? 1) : GAME_CONFIG.canvas.pixelRatio;

const canvas = document.getElementById('game');
const game = new Game(canvas, {
  autostart,
  freezeFrame,
  captureSteps,
  seed,
  pixelRatio,
});

new TouchControls(game.input);
// `?touch=1` forces the on-screen pad to appear on desktop — handy for
// testing the touch layout without a phone.
if (params.get('touch') === '1') document.body.classList.add('force-touch');

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
      else game.world.start();
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
  new PerformanceHUD(game);

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
