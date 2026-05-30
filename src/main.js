import { Game } from './core/Game.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { ASSET_SEMANTICS } from './config/assetSemantics.js';
import { TouchControls } from './core/TouchControls.js';
import { SwipeGestures } from './core/SwipeGestures.js';
import { PerformanceHUD } from './core/PerformanceHUD.js';
import { GamepadDebugOverlay } from './core/GamepadDebugOverlay.js';
import { pickPixelRatio } from './core/PlatformInfo.js';
import { runPatternTests } from './systems/spawn/PatternTests.js';

const params = new URLSearchParams(window.location.search);
const isLocalDev = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const requestedDebug =
  params.get('debug') === '1'
  || params.get('debugRun') === '1'
  || params.get('autostart') === '1'
  || params.get('debugPlayerStates') === '1';  // v3.8.27 — implies debug mode
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
// `?sideMapping=...` flips the side-aware variant mapping. Two formats:
//   ?sideMapping=swapped
//     → global swap: LEFT placement draws _right, RIGHT draws _left
//   ?sideMapping=grass_dirt_block:swapped,floating_platform:normal
//     → per-type overrides (one or more entries)
// The two formats compose: ?sideMapping=swapped,grass_dirt_block:normal
//     → global swap XOR per-type so grass_dirt_block stays normal
//
// Also exposes setSideMappingForType + getSideMappingForType on
// window.__ORCHID_DEBUG__ when debug mode is on, for live A/B without
// reloading.
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
// `?debugSideMatrix=1` replaces gameplay scenery with an isolated
// test matrix of every side-aware sprite at every left/right variant,
// drawn at three depths (near/mid/far). Lets QA compare _left vs
// _right artwork without gameplay noise.
if (params.get('debugSideMatrix') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showSideMatrix', { value: true, writable: false, configurable: true });
}
// `?enforcePlacement=1` flips the PlacementValidator from warn-mode to
// strict-mode: any spawn that violates ASSET_SEMANTICS zone or adjacency
// rules is dropped instead of just warned. Useful for catching
// regressions in HERO_LAYOUT / HERO_ROAD_SEQUENCE during composition QA.
if (params.get('enforcePlacement') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'enforcePlacementRules', { value: true, writable: false, configurable: true });
}
// v3.8.38 — `?debugComposition=1` overlays semantic info per spawned
// entity (category badge, assetType, zone, side, validity). Pair with
// `?compositionFilter=obstacles|pickups|decor|invalid` to scope the
// overlay to a single category for clearer reading.
if (params.get('debugComposition') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showComposition', { value: true, writable: false, configurable: true });
}
const compositionFilter = params.get('compositionFilter');
if (compositionFilter && ['all', 'obstacles', 'pickups', 'decor', 'invalid'].includes(compositionFilter)) {
  Object.defineProperty(GAME_CONFIG.debug, 'compositionFilter', { value: compositionFilter, writable: false, configurable: true });
}
// `?debugPlayer=1` overlays the player's visual bounds, foot anchor,
// collision capsule, and state label so visual-consistency QA can
// verify scale stays constant across states.
if (params.get('debugPlayer') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: true, writable: false, configurable: true });
}
// `?debugPlayerStates=1` — full state-switching QA mode. Freezes the
// world, exposes 1-9 to force a state, and adds a capture helper.
// Implies showPlayer = true so the cyan/magenta/red overlay shows.
if (params.get('debugPlayerStates') === '1') {
  Object.defineProperty(GAME_CONFIG.debug, 'showPlayerStates', { value: true, writable: false, configurable: true });
  Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: true, writable: false, configurable: true });
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
        // v3.8.37 — Phase 2 placement validation counter. 0 means no
        // spawn attempted by SpawnSystem / DecorationSystem violated a
        // zone / adjacency rule in this run. Regression-tested by the
        // 'placement validator' Playwright spec.
        placementViolations: game.world.placement?.violations ?? 0,
        // v3.8.39 — Phase 5 prefab composition counter. 0 means every
        // SIDE_DECORATION_PREFAB spawn passed validatePrefab() (support
        // graph + parent/child + side-aware checks).
        compositionViolations: game.world.placement?.compositionViolations ?? 0,
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
    /**
     * v3.8.38 — Phase 3 composition report. Walks the live registry,
     * groups entities by AssetSemantic category, counts entries per
     * assetType + flags any assetType whose placement violates the
     * semantic zone (e.g., obstacle ending up on side-decor). Result is
     * a structured object the QA panel renders + a console table.
     */
    compositionReport() {
      const r = game.world.registry;
      const byCategory = new Map();
      const byAssetType = new Map();
      const invalid = [];
      const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
      for (const e of r.query('Sprite')) {
        const sprite = e.components.Sprite;
        const assetType = sprite.assetType ?? sprite.type;
        const semantic = ASSET_SEMANTICS[assetType];
        const category = semantic?.category ?? 'unknown';
        bump(byCategory, category);
        bump(byAssetType, assetType);
        if (!semantic) {
          invalid.push({ assetType, reason: 'NEEDS_SEMANTIC_CLASSIFICATION' });
        }
      }
      // v3.8.39 — Phase 5 metrics: surface prefab composition state +
      // most/least used assets so the team sees which corners of the
      // catalog are over- or under-used.
      const placement = game.world.placement;
      const errors = placement?.recentPrefabErrors ?? [];
      const errorsByKind = new Map();
      for (const e of errors) bump(errorsByKind, e.kind);
      const sortedAssetTypes = [...byAssetType.entries()].sort((a, b) => b[1] - a[1]);
      const registeredAssetTypes = Object.keys(ASSET_SEMANTICS);
      const usedAssetTypes = new Set(byAssetType.keys());
      const leastUsedRegistered = registeredAssetTypes
        .filter((k) => !usedAssetTypes.has(k))
        .sort();
      const report = {
        timestamp: new Date().toISOString(),
        totalEntities: [...byAssetType.values()].reduce((a, b) => a + b, 0),
        // Phase 2 counter — bad zone / adjacency placements.
        placementViolations: placement?.violations ?? 0,
        // Phase 5 counters — bad prefab support graphs.
        compositionViolations: placement?.compositionViolations ?? 0,
        prefabErrorsByKind: Object.fromEntries(errorsByKind),
        recentPrefabErrors: errors,
        byCategory: Object.fromEntries(byCategory),
        mostUsedAssetTypes: Object.fromEntries(sortedAssetTypes.slice(0, 10)),
        leastUsedRegisteredAssets: leastUsedRegistered.slice(0, 20),
        invalid,
      };
      console.info('[compositionReport]', report);
      console.table(report.byCategory);
      if (Object.keys(report.prefabErrorsByKind).length) console.table(report.prefabErrorsByKind);
      return report;
    },
  };
}

installErrorCollector();

/**
 * v3.8.29 — Player Debug State Registry.
 *
 * Hoisted ABOVE the `if (debugEnabled)` block below: function declarations
 * are hoisted, but const declarations are NOT, so the registry must be
 * physically before any code path that reads it. `installPlayerStatesMode`
 * + `installPlayerStateQAPanel` (further down) both consume this registry
 * at module-init time when ?debugPlayerStates=1 is set.
 *
 * Flat array, grouped via the `group` field. The DOM QA panel renders one
 * button per entry; keyboard 1-9 maps to nine common ids for backward
 * compat. Adding a new state = appending one entry here; no renderer
 * change required.
 *
 * Separation of concerns:
 *  • POSE states (Run / Jump / Duck / Hit) — pin the player to a frame
 *    by setting vy, y, isJumping, crouching, invuln, hitFlash, runFrame
 *    on the live components.
 *  • OVERLAY states (Death / Replay) — change `world.state` so the
 *    death animation / replay overlay renders.
 *
 * `runFrame` is optional; setting it pegs a specific animation frame
 * (frame index N → runFrame = N * 3.15, matches the renderer cadence).
 */
const PLAYER_DEBUG_STATES = [
  // Run
  { id: 'run',           label: 'Run (anim)',      group: 'Run',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'run_01',        label: 'Frame 01',        group: 'Run',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0, runFrame: 0 },
  { id: 'run_03',        label: 'Frame 03',        group: 'Run',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0, runFrame: 6.3 },
  { id: 'run_06',        label: 'Frame 06',        group: 'Run',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0, runFrame: 15.75 },
  // Jump (all six poses, derived from the renderer's vy thresholds)
  { id: 'jump_ascend',   label: 'Ascend',          group: 'Jump',    worldState: 'paused', vy: -14, y: -80,  isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'jump_takeoff',  label: 'Takeoff (late)',  group: 'Jump',    worldState: 'paused', vy: -7,  y: -130, isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'jump_apex_up',  label: 'Apex Up',         group: 'Jump',    worldState: 'paused', vy: -2,  y: -160, isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'jump_peak',     label: 'Peak',            group: 'Jump',    worldState: 'paused', vy: 2,   y: -160, isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'jump_descend',  label: 'Descend',         group: 'Jump',    worldState: 'paused', vy: 7,   y: -80,  isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'jump_land',     label: 'Hard Impact',     group: 'Jump',    worldState: 'paused', vy: 14,  y: -10,  isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
  // Duck
  { id: 'duck',          label: 'Duck (anim)',     group: 'Duck',    worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: true,  invuln: 0,  hitFlash: 0 },
  { id: 'duck_01',       label: 'Frame 01',        group: 'Duck',    worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: true,  invuln: 0,  hitFlash: 0, runFrame: 0 },
  { id: 'duck_02',       label: 'Frame 02',        group: 'Duck',    worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: true,  invuln: 0,  hitFlash: 0, runFrame: 3.15 },
  { id: 'duck_03',       label: 'Frame 03',        group: 'Duck',    worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: true,  invuln: 0,  hitFlash: 0, runFrame: 6.3 },
  // Hit (4 frames pegged via invuln countdown threshold in renderer)
  { id: 'hit_01',        label: 'Hit Frame 01',    group: 'Hit',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 80, hitFlash: 0.6 },
  { id: 'hit_02',        label: 'Hit Frame 02',    group: 'Hit',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 76, hitFlash: 0.6 },
  { id: 'hit_03',        label: 'Hit Frame 03',    group: 'Hit',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 70, hitFlash: 0.6 },
  { id: 'hit_04',        label: 'Hit Frame 04',    group: 'Hit',     worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 62, hitFlash: 0.6 },
  // Effects (still a pose, not an overlay)
  { id: 'invuln_dim',    label: 'Invuln (dim)',    group: 'Effects', worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 21, hitFlash: 0 },
  { id: 'invuln_bright', label: 'Invuln (bright)', group: 'Effects', worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 24, hitFlash: 0 },
  { id: 'idle_menu',     label: 'Idle (menu)',     group: 'Effects', worldState: 'menu',   vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
  // Overlay (game state, not player pose)
  { id: 'death',         label: 'Death',           group: 'Overlay', worldState: 'dying',  vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
  { id: 'replay',        label: 'Replay Overlay',  group: 'Overlay', worldState: 'dead',   vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
];

const PLAYER_DEBUG_STATE_BY_ID = new Map(PLAYER_DEBUG_STATES.map((s) => [s.id, s]));
const PLAYER_DEBUG_GROUPS = [...new Set(PLAYER_DEBUG_STATES.map((s) => s.group))];
// Keyboard 1-9 map to the most-used QA targets (backward compat).
const PLAYER_DEBUG_KEY_MAP = {
  '1': 'run', '2': 'jump_ascend', '3': 'jump_peak', '4': 'jump_descend',
  '5': 'duck', '6': 'hit_01', '7': 'invuln_dim', '8': 'death', '9': 'replay',
};

if (debugEnabled) {
  const debugApi = createDebugApi();
  window.__ORCHID_DEBUG__ = debugApi;
  // v3.8.41 — Phase 7 visual-QA. Expose the live game instance behind
  // the same debug flag so capture scripts can read / poke world state
  // directly (e.g., set Health.invulnerabilityFrames high so the
  // autostart-driven player survives long-distance screenshots).
  window.__ORCHID_GAME__ = game;
  installDebugPanel(debugApi);
  new PerformanceHUD(game, { pixelRatioChoice });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'F8') return;
    event.preventDefault();
    debugApi.captureCanvas().catch((error) => {
      console.error('[Orchid Debug] capture failed', error);
    });
  });

  // v3.8.27 — ?debugPlayerStates=1 wiring: keyboard 1-9 forces a state,
  // world frozen, capturePlayerStates() helper grabs dataURLs.
  if (GAME_CONFIG.debug.showPlayerStates) {
    installPlayerStatesMode(game, debugApi);
  }
}

/**
 * v3.8.27 — installs the player-states debug mode on top of the game.
 * v3.8.29 — driven by PLAYER_DEBUG_STATES registry (hoisted above) +
 * the on-screen QA panel.
 */
function installPlayerStatesMode(game, debugApi) {
  // Mode flags toggled from the QA panel. The visual flags
  // (spriteLabMode, disableFullScreenEffects) live in GAME_CONFIG.debug
  // because they're read by the render pipeline; we mirror them here
  // only for initial defaults.
  const modes = {
    poseBaselineLock: false,  // force y = 0 across all states (visual QA on common ground line)
    hidePerfHud: true,        // v3.8.30 — hidden by default in QA mode
    hideOrchidPanel: true,    // v3.8.30 — hidden by default in QA mode
  };

  // v3.8.30 — hide perf HUD + Orchid debug panel on install so the QA
  // screenshots are clean by default; the QA panel toggles flip them
  // back on for the rare case the user wants both visible at once.
  requestAnimationFrame(() => {
    const perf = document.getElementById('perf-hud');
    if (perf) perf.style.display = 'none';
    const orchid = document.getElementById('debug-panel');
    if (orchid) orchid.style.display = 'none';
  });

  const applyPreset = (stateId) => {
    const state = PLAYER_DEBUG_STATE_BY_ID.get(stateId);
    if (!state || !game.world?.player) return;
    const w = game.world;
    const p = w.player;
    // v3.8.30 — Overlay-group states (Death, Replay) need the full-screen
    // overlay to render. Warn (don't auto-toggle) when Sprite Lab is on
    // because Sprite Lab bypasses the EffectsRenderer entirely — the
    // overlay won't be visible. User flips Sprite Lab off to see it.
    if (state.group === 'Overlay' && GAME_CONFIG.debug.spriteLabMode) {
      console.warn(
        `[debugPlayerStates] state '${stateId}' is an Overlay state. ` +
        'Sprite Lab Mode bypasses overlays — disable Sprite Lab in the QA panel to view it.',
      );
    }
    if (state.group === 'Overlay' && GAME_CONFIG.debug.disableFullScreenEffects) {
      console.warn(
        `[debugPlayerStates] state '${stateId}' is an Overlay state. ` +
        '"Disable full-screen effects" is on — disable it in the QA panel to view the overlay.',
      );
    }
    w.state = state.worldState;
    if (state.worldState === 'dying') w.dyingFrames = w.config.gameplay.dyingFrames;
    // Centre player in middle lane, zero scroll for a stable backdrop.
    p.components.LaneState.laneX = 0;
    p.components.LaneState.targetLane = 0;
    p.components.LaneState.laneTilt = 0;
    // Pose-baseline lock: force y = 0 so jump pose can be compared on
    // the same ground line as run/duck/hit. The vy still gets applied
    // so the renderer picks the correct jump frame, but the visual
    // anchor is locked to the ground.
    p.components.VerticalState.y = modes.poseBaselineLock ? 0 : state.y;
    p.components.VerticalState.vy = state.vy;
    p.components.VerticalState.isJumping = state.isJumping;
    p.components.VerticalState.jumpStretch = 0;
    p.components.VerticalState.landSquash = 0;
    p.components.CrouchState.isCrouching = state.crouching;
    p.components.Health.invulnerabilityFrames = state.invuln;
    p.components.Health.hitFlash = state.hitFlash;
    if (state.runFrame !== undefined) p.components.AnimState.runFrame = state.runFrame;
    console.info(`[debugPlayerStates] state = ${stateId}${modes.poseBaselineLock ? ' (baseline-locked)' : ''}`);
  };

  // Start the run automatically so player exists, then immediately
  // flip into the debug state.
  const enterMode = () => {
    if (!game.world?.player) {
      requestAnimationFrame(enterMode);
      return;
    }
    applyPreset('run');
  };
  requestAnimationFrame(() => {
    debugApi.startDebugRun();
    requestAnimationFrame(enterMode);
  });

  // Keyboard 1-9 — backward compat. Panel buttons cover everything else.
  window.addEventListener('keydown', (event) => {
    if (!GAME_CONFIG.debug.showPlayerStates) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const presetName = PLAYER_DEBUG_KEY_MAP[event.key];
    if (!presetName) return;
    event.preventDefault();
    applyPreset(presetName);
  });

  /**
   * v3.8.28 / v3.8.29 — capturePlayerStates({ debugOverlay, download, group }):
   *   debugOverlay: true  — keep cyan/magenta/red overlay (technical QA, default)
   *   debugOverlay: false — temporarily disable showPlayer for clean visual QA
   *   download:     true  — auto-trigger download per state
   *   group:        'Run' | 'Jump' | ... — only capture states in this group
   *
   * Returns { [stateId]: dataURL } for downstream composition.
   * Note: DOM overlays (PerformanceHUD, debug panel, QA panel) sit OUTSIDE
   * the canvas, so canvas.toDataURL never includes them — but the
   * hidePerfHud/hideOrchidPanel toggles still apply for manual
   * system screenshots taken on top of the QA panel.
   */
  debugApi.applyPlayerState = applyPreset;
  debugApi.getPlayerDebugStates = () => PLAYER_DEBUG_STATES.map((s) => ({ ...s }));
  debugApi.setPoseBaselineLock = (v) => { modes.poseBaselineLock = !!v; };

  // v3.8.32 — Player Frame Audit.
  // Iterates every registered key matching the playerFarmer* family and
  // checks its loaded image dims against the canonical 64×96 canvas.
  // Surfaces designer asset bugs (e.g., 1254×1254 jump frames) as a hard
  // FAIL the team can quote to the designer without manual inspection.
  const PLAYER_FRAME_RE = /^playerFarmer(Run|Crouch|Jump|Hit|Idle|Death)\d+$/;
  const PLAYER_CANONICAL_W = 64;
  const PLAYER_CANONICAL_H = 96;
  debugApi.auditPlayerFrames = () => {
    const manifest = game.config.assets ?? {};
    const rows = [];
    for (const [key, p] of Object.entries(manifest)) {
      if (!PLAYER_FRAME_RE.test(key)) continue;
      const img = game.assets.get(key);
      if (!img?.naturalWidth) {
        rows.push({
          key, path: p,
          sourceW: 0, sourceH: 0,
          expectedW: PLAYER_CANONICAL_W, expectedH: PLAYER_CANONICAL_H,
          status: 'MISSING',
          action: 'asset not loaded',
        });
        continue;
      }
      const ok = img.naturalWidth === PLAYER_CANONICAL_W
              && img.naturalHeight === PLAYER_CANONICAL_H;
      rows.push({
        key, path: p,
        sourceW: img.naturalWidth, sourceH: img.naturalHeight,
        expectedW: PLAYER_CANONICAL_W, expectedH: PLAYER_CANONICAL_H,
        status: ok ? 'OK' : 'FAIL',
        action: ok ? '' : `re-export on ${PLAYER_CANONICAL_W}×${PLAYER_CANONICAL_H}`,
      });
    }
    const pass = rows.filter((r) => r.status === 'OK').length;
    const fail = rows.filter((r) => r.status === 'FAIL').length;
    const miss = rows.filter((r) => r.status === 'MISSING').length;
    console.info(`[auditPlayerFrames] ${pass} OK · ${fail} FAIL · ${miss} MISSING (of ${rows.length})`);
    if (fail || miss) {
      console.table(
        rows.filter((r) => r.status !== 'OK'),
        ['key', 'sourceW', 'sourceH', 'status', 'action'],
      );
    } else {
      console.info('[auditPlayerFrames] ✓ all player frames are canonical 64×96');
    }
    return rows;
  };

  debugApi.formatPlayerFrameAudit = (rows) => {
    const data = rows ?? debugApi.auditPlayerFrames();
    const lines = [
      '# Player Frame Audit',
      '',
      `Generated ${new Date().toISOString()}`,
      `Canonical canvas: **${PLAYER_CANONICAL_W}×${PLAYER_CANONICAL_H}** (transparent, foot at canvas bottom, character centred)`,
      '',
      '| key | source | status | action |',
      '|-----|--------|--------|--------|',
    ];
    for (const r of data) {
      const src = r.status === 'MISSING' ? '—' : `${r.sourceW}×${r.sourceH}`;
      lines.push(`| \`${r.key}\` | ${src} | ${r.status} | ${r.action || '-'} |`);
    }
    const fails = data.filter((r) => r.status === 'FAIL');
    if (fails.length) {
      lines.push('', `## P0 Re-export List (${fails.length})`);
      lines.push('Designer: please re-export the following frames on a 64×96 transparent canvas.');
      lines.push('Foot at canvas bottom, character centred, no per-pose auto-crop.');
      lines.push('');
      for (const r of fails) {
        lines.push(`- \`${r.key}\` → \`${r.path}\` (currently ${r.sourceW}×${r.sourceH})`);
      }
    }
    return lines.join('\n');
  };

  // v3.8.30 / v3.8.31 — capture-time mode application.
  //   mode = 'lab'   → spriteLabMode ON, FX OFF (always)
  //   mode = 'scene' → spriteLabMode OFF; FX gated PER STATE:
  //                      Pose-group states  → FX OFF (farmer visible)
  //                      Overlay-group state → FX ON  (overlay visible)
  //   mode = 'auto'  → no overrides, use current toggle values
  // `debugOverlay` controls the technical boxes on the player and is
  // orthogonal to mode.
  const setFlag = (key, value) =>
    Object.defineProperty(GAME_CONFIG.debug, key,
      { value, writable: false, configurable: true });

  debugApi.capturePlayerStates = async ({
    debugOverlay = true, download = false, group = 'all', mode = 'auto',
  } = {}) => {
    const targets = group === 'all'
      ? PLAYER_DEBUG_STATES
      : PLAYER_DEBUG_STATES.filter((s) => s.group === group);
    const canvas = document.getElementById('game');
    const prevShowPlayer = GAME_CONFIG.debug.showPlayer;
    const prevLab = GAME_CONFIG.debug.spriteLabMode;
    const prevFx = GAME_CONFIG.debug.disableFullScreenEffects;
    if (!debugOverlay) setFlag('showPlayer', false);
    if (mode === 'lab') setFlag('spriteLabMode', true);
    else if (mode === 'scene') setFlag('spriteLabMode', false);
    const modeSlug = mode === 'lab' ? 'lab' : mode === 'scene' ? 'scene' : 'auto';
    const overlaySlug = debugOverlay ? 'technical' : 'clean';
    const results = {};
    for (const state of targets) {
      // v3.8.31 — per-state FX gating. Lab is always FX-off. Scene flips
      // FX based on whether the state's role is "pose" (then hide the
      // full-screen overlay so the farmer is visible) or "overlay" (then
      // show it because that's the point of the capture).
      if (mode === 'lab') {
        setFlag('disableFullScreenEffects', true);
      } else if (mode === 'scene') {
        setFlag('disableFullScreenEffects', state.group !== 'Overlay');
      }
      applyPreset(state.id);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataURL = canvas.toDataURL('image/png');
      results[state.id] = dataURL;
      if (download) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `player_state_${state.id}_${modeSlug}_${overlaySlug}.png`;
        a.click();
      }
    }
    if (!debugOverlay) setFlag('showPlayer', prevShowPlayer);
    setFlag('spriteLabMode', prevLab);
    setFlag('disableFullScreenEffects', prevFx);
    applyPreset('run');
    return results;
  };

  /**
   * v3.8.28 / v3.8.29 / v3.8.30 — capturePlayerStatesContactSheet.
   *   `mode`        : 'lab' (sprite lab) | 'scene' (in-game) | 'auto' (use current toggles)
   *   `debugOverlay`: true → cyan/magenta/red player boxes
   *   `group`       : 'all' | 'Run' | 'Jump' | ...
   *   `columns`     : grid columns (auto-derived from state count)
   * Composites every state in `group` into one PNG grid.
   */
  debugApi.capturePlayerStatesContactSheet = async ({
    debugOverlay = true, columns, cols, download = true, group = 'all', mode = 'auto',
  } = {}) => {
    const shots = await debugApi.capturePlayerStates({ debugOverlay, download: false, group, mode });
    const states = Object.keys(shots);
    const colCount = columns ?? cols ?? (states.length > 9 ? 4 : 3);
    const rows = Math.ceil(states.length / colCount);
    const canvas = document.getElementById('game');
    const cellW = canvas.width;
    const cellH = canvas.height;
    const margin = 12;
    const labelH = 28;
    const sheet = document.createElement('canvas');
    sheet.width = colCount * cellW + (colCount + 1) * margin;
    sheet.height = rows * (cellH + labelH) + (rows + 1) * margin;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < states.length; i += 1) {
      const stateId = states[i];
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const x = margin + col * (cellW + margin);
      const y = margin + row * (cellH + labelH + margin);
      const img = new Image();
      img.src = shots[stateId];
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { img.onload = r; });
      ctx.drawImage(img, x, y, cellW, cellH);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(stateId.toUpperCase(), x + cellW / 2, y + cellH + 20);
    }
    const dataURL = sheet.toDataURL('image/png');
    if (download) {
      const groupSlug = group === 'all' ? '' : `_${group.toLowerCase()}`;
      const modeSlug = mode === 'lab' ? '_lab' : mode === 'scene' ? '_scene' : '';
      const overlaySlug = debugOverlay ? '_technical' : '_clean';
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `player_states_contact_sheet${groupSlug}${modeSlug}${overlaySlug}.png`;
      a.click();
    }
    return dataURL;
  };

  installPlayerStateQAPanel(debugApi, modes, applyPreset);

  console.info(
    '[debugPlayerStates] on-screen panel available top-right.\n' +
    '  Modes: Sprite Lab (isolated player) + Disable FX (no full-screen fades).\n' +
    '  Keyboard 1-9 still maps to run / jump (×3) / duck / hit / invuln / death / replay.\n' +
    '  Captures via console:\n' +
    "    __ORCHID_DEBUG__.capturePlayerStatesContactSheet({ mode: 'lab',   debugOverlay: false, group: 'Run' })\n" +
    "    __ORCHID_DEBUG__.capturePlayerStatesContactSheet({ mode: 'scene', debugOverlay: true,  group: 'all' })",
  );
}

/**
 * v3.8.29 — On-screen QA panel for the player-states debug mode.
 * Renders one button per registry entry, grouped by `group`, plus toggles
 * for pose-baseline-lock / DOM overlay visibility / debug overlay and
 * capture buttons (per group + all). Buttons are generated from
 * PLAYER_DEBUG_STATES — no hardcoded 1-9 limit, no list to maintain in
 * two places.
 */
function installPlayerStateQAPanel(debugApi, modes, applyPreset) {
  const panel = document.createElement('aside');
  panel.id = 'player-state-qa-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '1001',
    width: '300px',
    maxHeight: '94vh',
    overflowY: 'auto',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(10, 20, 32, 0.92)',
    color: '#dfefff',
    font: '12px/1.35 system-ui, sans-serif',
    boxShadow: '0 10px 24px rgba(0,0,0,0.32)',
  });

  const title = document.createElement('div');
  title.textContent = 'PLAYER STATE QA';
  Object.assign(title.style, { fontWeight: '700', fontSize: '13px', marginBottom: '8px', letterSpacing: '0.5px' });
  panel.appendChild(title);

  const groupedHint = document.createElement('div');
  groupedHint.textContent = `${PLAYER_DEBUG_STATES.length} states / ${PLAYER_DEBUG_GROUPS.length} groups · 1-9 hotkeys`;
  Object.assign(groupedHint.style, { color: '#7fa9c8', fontSize: '10px', marginBottom: '10px' });
  panel.appendChild(groupedHint);

  const labelStyle = { fontWeight: '700', fontSize: '11px', marginTop: '8px', marginBottom: '4px', color: '#a8d4ff', textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = {
    padding: '5px 8px', margin: '2px 3px 2px 0', border: '0', borderRadius: '6px',
    cursor: 'pointer', background: '#1f3d5c', color: '#dfefff',
    font: '11px/1.1 system-ui, sans-serif',
  };
  const captureBtnStyle = { ...btnStyle, background: '#8fe35e', color: '#11210b', fontWeight: '700' };

  // STATE BUTTONS — grouped
  for (const group of PLAYER_DEBUG_GROUPS) {
    const groupLabel = document.createElement('div');
    groupLabel.textContent = group;
    Object.assign(groupLabel.style, labelStyle);
    panel.appendChild(groupLabel);
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', flexWrap: 'wrap' });
    for (const state of PLAYER_DEBUG_STATES.filter((s) => s.group === group)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = state.label;
      btn.title = state.id;
      Object.assign(btn.style, btnStyle);
      btn.addEventListener('click', () => applyPreset(state.id));
      row.appendChild(btn);
    }
    panel.appendChild(row);
  }

  // TOGGLES
  const togglesLabel = document.createElement('div');
  togglesLabel.textContent = 'Toggles';
  Object.assign(togglesLabel.style, labelStyle);
  panel.appendChild(togglesLabel);

  const makeToggle = (name, getter, setter) => {
    const row = document.createElement('label');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', cursor: 'pointer' });
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = getter();
    cb.addEventListener('change', () => setter(cb.checked));
    row.appendChild(cb);
    const txt = document.createElement('span');
    txt.textContent = name;
    row.appendChild(txt);
    return row;
  };

  panel.appendChild(makeToggle(
    'Sprite Lab Mode (isolate player)',
    () => GAME_CONFIG.debug.spriteLabMode,
    (v) => Object.defineProperty(GAME_CONFIG.debug, 'spriteLabMode',
      { value: !!v, writable: false, configurable: true }),
  ));
  panel.appendChild(makeToggle(
    'Disable full-screen FX (hit/death/fade)',
    () => GAME_CONFIG.debug.disableFullScreenEffects,
    (v) => Object.defineProperty(GAME_CONFIG.debug, 'disableFullScreenEffects',
      { value: !!v, writable: false, configurable: true }),
  ));
  panel.appendChild(makeToggle(
    'Technical overlay (cyan/magenta/red)',
    () => GAME_CONFIG.debug.showPlayer,
    (v) => Object.defineProperty(GAME_CONFIG.debug, 'showPlayer',
      { value: !!v, writable: false, configurable: true }),
  ));
  panel.appendChild(makeToggle(
    'Pose baseline lock (jump y → 0)',
    () => modes.poseBaselineLock,
    (v) => {
      modes.poseBaselineLock = !!v;
      applyPreset('run');  // re-apply current to reflect lock visually
    },
  ));
  panel.appendChild(makeToggle(
    'Hide perf HUD',
    () => modes.hidePerfHud,
    (v) => {
      modes.hidePerfHud = !!v;
      const el = document.getElementById('perf-hud');
      if (el) el.style.display = v ? 'none' : '';
    },
  ));
  panel.appendChild(makeToggle(
    'Hide Orchid debug panel',
    () => modes.hideOrchidPanel,
    (v) => {
      modes.hideOrchidPanel = !!v;
      const el = document.getElementById('debug-panel');
      if (el) el.style.display = v ? 'none' : '';
    },
  ));

  // v3.8.30 — 2× PREVIEW INSET. Live re-crop of the canvas region around
  // the player, scaled 2×. Even in In-Scene mode with overlays, the user
  // can see the farmer cleanly here (because the crop targets the
  // player's body rect). In Sprite Lab Mode it's the same scene as the
  // main canvas, just zoomed.
  const previewLabel = document.createElement('div');
  previewLabel.textContent = '2× Player Preview';
  Object.assign(previewLabel.style, labelStyle);
  panel.appendChild(previewLabel);
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 300;
  previewCanvas.height = 400;
  Object.assign(previewCanvas.style, {
    display: 'block', width: '100%', height: 'auto',
    borderRadius: '6px', background: '#0d1422',
    imageRendering: 'pixelated', marginBottom: '4px',
  });
  panel.appendChild(previewCanvas);
  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.imageSmoothingEnabled = false;
  const updatePreview = () => {
    const gameCanvas = document.getElementById('game');
    if (gameCanvas?.width) {
      const W = gameCanvas.width;
      const H = gameCanvas.height;
      // Source crop: 150 × 200 px centred on the player area. The player
      // foot baseline sits at ~94% of the canvas height; the body extends
      // ~220px above it. Anchor the crop so the foot is in the bottom
      // 15% of the preview frame.
      const srcW = 150;
      const srcH = 280;
      const srcX = W / 2 - srcW / 2;
      const srcY = Math.max(0, Math.round(H * 0.96 - srcH));
      previewCtx.fillStyle = '#0d1422';
      previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCtx.drawImage(
        gameCanvas, srcX, srcY, srcW, srcH,
        0, 0, previewCanvas.width, previewCanvas.height,
      );
    }
    requestAnimationFrame(updatePreview);
  };
  requestAnimationFrame(updatePreview);

  // CAPTURE BUTTONS — Sprite Lab and In-Scene rows. The current
  // "Technical overlay" toggle decides whether the captures include the
  // cyan/magenta boxes; nothing else does.
  const captureLabel = document.createElement('div');
  captureLabel.textContent = 'Sprite Lab Contact Sheets';
  Object.assign(captureLabel.style, labelStyle);
  panel.appendChild(captureLabel);
  const labRow = document.createElement('div');
  Object.assign(labRow.style, { display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' });
  const mkSheetBtn = (label, group, mode) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, captureBtnStyle);
    btn.addEventListener('click', () => {
      const debugOverlay = GAME_CONFIG.debug.showPlayer;
      debugApi.capturePlayerStatesContactSheet({ debugOverlay, group, mode });
    });
    return btn;
  };
  labRow.appendChild(mkSheetBtn('ALL', 'all', 'lab'));
  for (const group of PLAYER_DEBUG_GROUPS) labRow.appendChild(mkSheetBtn(group, group, 'lab'));
  panel.appendChild(labRow);

  const sceneLabel = document.createElement('div');
  sceneLabel.textContent = 'In-Scene Contact Sheets';
  Object.assign(sceneLabel.style, labelStyle);
  panel.appendChild(sceneLabel);
  const sceneRow = document.createElement('div');
  Object.assign(sceneRow.style, { display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' });
  sceneRow.appendChild(mkSheetBtn('ALL', 'all', 'scene'));
  for (const group of PLAYER_DEBUG_GROUPS) sceneRow.appendChild(mkSheetBtn(group, group, 'scene'));
  panel.appendChild(sceneRow);

  // v3.8.32 — Player Frame Audit section. Audit summary + copy-to-clip
  // so the failing-frame list can be pasted straight to the designer.
  const auditLabel = document.createElement('div');
  auditLabel.textContent = 'Player Frame Audit';
  Object.assign(auditLabel.style, labelStyle);
  panel.appendChild(auditLabel);
  const auditSummary = document.createElement('div');
  Object.assign(auditSummary.style, {
    font: '11px monospace', color: '#a8d4ff', marginBottom: '4px',
    padding: '4px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px',
  });
  auditSummary.textContent = 'click Audit to scan loaded player frames';
  panel.appendChild(auditSummary);
  const refreshAuditSummary = () => {
    const rows = debugApi.auditPlayerFrames();
    const pass = rows.filter((r) => r.status === 'OK').length;
    const fail = rows.filter((r) => r.status === 'FAIL').length;
    const miss = rows.filter((r) => r.status === 'MISSING').length;
    auditSummary.textContent = `${pass} OK · ${fail} FAIL · ${miss} MISSING (of ${rows.length})`;
    auditSummary.style.color = fail || miss ? '#ffb060' : '#9be8a3';
    return rows;
  };
  const auditRow = document.createElement('div');
  Object.assign(auditRow.style, { display: 'flex', gap: '4px', marginBottom: '8px' });
  const runAuditBtn = document.createElement('button');
  runAuditBtn.type = 'button';
  runAuditBtn.textContent = 'Audit';
  Object.assign(runAuditBtn.style, captureBtnStyle);
  runAuditBtn.addEventListener('click', () => refreshAuditSummary());
  auditRow.appendChild(runAuditBtn);
  const copyAuditBtn = document.createElement('button');
  copyAuditBtn.type = 'button';
  copyAuditBtn.textContent = 'Copy player frame audit';
  Object.assign(copyAuditBtn.style, captureBtnStyle);
  copyAuditBtn.addEventListener('click', async () => {
    const rows = refreshAuditSummary();
    const md = debugApi.formatPlayerFrameAudit(rows);
    try {
      await navigator.clipboard.writeText(md);
      copyAuditBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyAuditBtn.textContent = 'Copy player frame audit'; }, 1500);
    } catch (err) {
      console.error('[Copy player frame audit] clipboard failed', err);
      copyAuditBtn.textContent = 'Copy failed';
    }
  });
  auditRow.appendChild(copyAuditBtn);
  panel.appendChild(auditRow);

  document.body.appendChild(panel);
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
