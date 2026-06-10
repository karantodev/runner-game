import { Game } from './core/Game.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { TouchControls } from './core/TouchControls.js';
import { SwipeGestures } from './core/SwipeGestures.js';
import { pickPixelRatio } from './core/PlatformInfo.js';

const params = new URLSearchParams(window.location.search);
const isLocalDev = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const requestedDebug =
  params.get('debug') === '1'
  || params.get('debugRun') === '1'
  || params.get('autostart') === '1'
  || params.get('debugPlayerStates') === '1';
const debugAllowed = (isLocalDev && GAME_CONFIG.debug.allowLocalTools) || GAME_CONFIG.debug.allowRemoteTools;
const debugEnabled = requestedDebug && debugAllowed;
const sceneryQaRequested = params.get('sceneryQa') === '1';
const sceneryQaEnabled = sceneryQaRequested && debugAllowed;
const autostart = debugEnabled && (params.get('autostart') === '1' || params.get('debugRun') === '1');
const freezeFrame = debugEnabled && params.get('debugFreeze') !== '0';
const captureSteps = debugEnabled ? Math.max(0, Number(params.get('debugSteps') || 12) || 12) : 0;

const seedParam = params.get('seed');
const seed = seedParam === null
  ? undefined
  : /^[0-9]+$/.test(seedParam)
    ? Number(seedParam) >>> 0
    : seedParam;

const pixelRatioChoice = pickPixelRatio(params, GAME_CONFIG.canvas.pixelRatio);

// retroPixel param: debug-only scale override for chunky-pixel bracketing.
// e.g. ?debug=1&retroPixel=0.5 → 768×432 backing store.
const retroPixelParam = debugAllowed ? params.get('retroPixel') : null;
const retroPixelScale = retroPixelParam !== null ? Math.min(1, Math.max(0.1, Number(retroPixelParam) || 1)) : undefined;

const requestedRoadStyle = params.get('roadStyle');
const roadStyle = ['procedural', 'tiles', 'kit'].includes(requestedRoadStyle)
  ? requestedRoadStyle
  : 'procedural';

const requestedBlockStyle = params.get('blockStyle');
const blockStyle = ['3d', 'voxel'].includes(requestedBlockStyle) ? 'voxel' : 'sprite';
const playerVoxelEnabled = params.get('player3d') !== '0';
// Renderer strategy precedence:
//   1. Explicit URL param (for dev overrides)
//      ?renderer=three|webgl|three-scene  → 'three-scene'
//      ?renderer=2d|canvas|canvas2d       → 'canvas2d' (force 2D over a saved 3D setting)
//   2. Persisted setting in localStorage (key: GAME_CONFIG.gameplay.settingsKey)
//   3. Default: 'canvas2d'
const requestedRenderer = params.get('renderer');
let rendererStrategy;
if (['three', 'webgl', 'three-scene'].includes(requestedRenderer)) {
  rendererStrategy = 'three-scene';
} else if (['2d', 'canvas', 'canvas2d'].includes(requestedRenderer)) {
  rendererStrategy = 'canvas2d';
} else {
  // No URL param — consult persisted settings.
  try {
    const raw = window.localStorage.getItem(GAME_CONFIG.gameplay.settingsKey);
    const parsed = raw ? JSON.parse(raw) : null;
    rendererStrategy = parsed?.renderer === 'three-scene' ? 'three-scene' : 'canvas2d';
  } catch {
    rendererStrategy = 'canvas2d';
  }
}
const threeMode = ['2.5d', 'orthographic', 'ortho'].includes(params.get('threeMode'))
  ? '2.5d'
  : '3d';

if (params.get('cam') === 'classic') {
  GAME_CONFIG.player.heroScale = 1.0;
  GAME_CONFIG.player.bottomMargin = 50;
  GAME_CONFIG.projection.visualLaneScale = 0.86;
}

if (params.get('grade') === '0') {
  Object.defineProperty(GAME_CONFIG.visual, 'enabled', { value: false, writable: false, configurable: true });
}

// Configuration overrides for debug modes
const debugFlags = [
  { param: 'debugAxis', flag: 'showAxis' },
  { param: 'debugSides', flag: 'showSides' },
  { param: 'debugSideMatrix', flag: 'showSideMatrix' },
  { param: 'enforcePlacement', flag: 'enforcePlacementRules' },
  { param: 'debugComposition', flag: 'showComposition' },
  { param: 'showCompositionGroups', flag: 'showCompositionGroups' },
  { param: 'perf', flag: 'renderMetrics' },
  { param: 'patternLog', flag: 'patternLog' },
  { param: 'debugPlayer', flag: 'showPlayer' },
];

debugFlags.forEach(({ param, flag }) => {
  if (params.get(param) === '1') {
    Object.defineProperty(GAME_CONFIG.debug, flag, { value: true, writable: false, configurable: true });
  }
});

if (params.get('debugPlayerStates') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showPlayerStates', { value: true, writable: false, configurable: true });
  Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: true, writable: false, configurable: true });
}

const compositionFilter = params.get('compositionFilter');
if (compositionFilter && ['all', 'obstacles', 'pickups', 'decor', 'invalid'].includes(compositionFilter)) {
  Object.defineProperty(GAME_CONFIG.debug, 'compositionFilter', { value: compositionFilter, writable: false, configurable: true });
}

// Side mapping initialization
import('./render/renderers/scenery/sceneryDispatch.js').then(({
  setSideMappingSwap, setSideMappingForType, getSideMappingForType,
}) => {
  const mapping = params.get('sideMapping');
  if (mapping) {
    for (const part of mapping.split(',')) {
      const piece = part.trim();
      if (piece === 'swapped' || piece === 'normal') {
        setSideMappingSwap(piece === 'swapped');
      } else if (piece.includes(':')) {
        const [type, mode] = piece.split(':').map(s => s.trim());
        setSideMappingForType(type, mode);
      }
    }
  }
  if (window.__ORCHID_DEBUG__) {
    window.__ORCHID_DEBUG__.setSideMapping = setSideMappingForType;
    window.__ORCHID_DEBUG__.getSideMapping = getSideMappingForType;
    window.__ORCHID_DEBUG__.setGlobalSideSwap = setSideMappingSwap;
  }
});

const canvas = document.getElementById('game');
const game = new Game(canvas, {
  autostart,
  freezeFrame,
  captureSteps,
  seed,
  pixelRatio: pixelRatioChoice.value,
  retroPixelScale,
  roadStyle,
  blockStyle,
  playerVoxelEnabled,
  rendererStrategy,
  threeMode,
});

let resolveBootReady = null;
let bootFailure = null;
const bootReady = new Promise((resolve) => {
  resolveBootReady = resolve;
});

// Initialize debug tools if enabled. The scenery QA sheet only needs
// debugAllowed (not ?debug=1), so it loads the module too.
if (debugEnabled || sceneryQaEnabled) {
  import('./debug/init.js').then(({ initDebugTools }) => {
    initDebugTools(game, canvas, params, {
      debugEnabled,
      autostart,
      freezeFrame,
      pixelRatioChoice,
      debugAllowed,
      sceneryQaEnabled,
      bootReady,
    });
  });
}

// Core Event Listeners
window.addEventListener('keydown', (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

  if (event.code === 'KeyT') {
    game.renderer?.toggleRoadStyle();
  } else if (event.code === 'KeyY') {
    game.settings.toggleBlockStyle();
  }
});

new TouchControls(game.input);
new SwipeGestures(game.input, canvas);

if (params.get('touch') === '1') {
  document.body.classList.add('force-touch');
}

window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => game.renderer?.resizeToViewport(game.config.canvas.viewportPadding));
});

game.boot()
  .then(async () => {
    resolveBootReady?.();
  })
  .catch((error) => {
    bootFailure = error;
    resolveBootReady?.();
    console.error('[Orchid Quest] boot failed', error);
    // If debug tools are loaded, they will handle recording the error
    if (window.__ORCHID_DEBUG__ && typeof window.__ORCHID_DEBUG__.recordDebugError === 'function') {
      window.__ORCHID_DEBUG__.recordDebugError('boot', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });
