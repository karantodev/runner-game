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
  // Mode flags toggled from the QA panel.
  const modes = {
    poseBaselineLock: false,  // force y = 0 across all states (visual QA on common ground line)
    hidePerfHud: false,
    hideOrchidPanel: false,
  };

  const applyPreset = (stateId) => {
    const state = PLAYER_DEBUG_STATE_BY_ID.get(stateId);
    if (!state || !game.world?.player) return;
    const w = game.world;
    const p = w.player;
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
  debugApi.capturePlayerStates = async ({ debugOverlay = true, download = false, group = 'all' } = {}) => {
    const targets = group === 'all'
      ? PLAYER_DEBUG_STATES
      : PLAYER_DEBUG_STATES.filter((s) => s.group === group);
    const canvas = document.getElementById('game');
    const prevShowPlayer = GAME_CONFIG.debug.showPlayer;
    if (!debugOverlay) {
      Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: false, writable: false, configurable: true });
    }
    const results = {};
    for (const state of targets) {
      applyPreset(state.id);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataURL = canvas.toDataURL('image/png');
      results[state.id] = dataURL;
      if (download) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `player_state_${state.id}${debugOverlay ? '_debug' : '_clean'}.png`;
        a.click();
      }
    }
    if (!debugOverlay) {
      Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: prevShowPlayer, writable: false, configurable: true });
    }
    applyPreset('run');
    return results;
  };

  /**
   * v3.8.28 / v3.8.29 — capturePlayerStatesContactSheet({ debugOverlay, columns, download, group }):
   * Composites every state in `group` into one PNG grid. Default `columns`
   * is auto-derived from the state count (4 for all, 3 otherwise).
   */
  debugApi.capturePlayerStatesContactSheet = async ({
    debugOverlay = true, columns, cols, download = true, group = 'all',
  } = {}) => {
    const shots = await debugApi.capturePlayerStates({ debugOverlay, download: false, group });
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
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `player_states_contact_sheet${groupSlug}${debugOverlay ? '_debug' : '_clean'}.png`;
      a.click();
    }
    return dataURL;
  };

  installPlayerStateQAPanel(debugApi, modes, applyPreset);

  console.info(
    '[debugPlayerStates] on-screen panel available top-right.\n' +
    '  Keyboard 1-9 still maps to run / jump (×3) / duck / hit / invuln / death / replay.\n' +
    '  Captures via console:\n' +
    "    __ORCHID_DEBUG__.capturePlayerStates({ debugOverlay: false, download: true, group: 'Run' })\n" +
    "    __ORCHID_DEBUG__.capturePlayerStatesContactSheet({ debugOverlay: false, group: 'Jump' })",
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
    'Technical overlay (cyan/magenta/red)',
    () => GAME_CONFIG.debug.showPlayer,
    (v) => Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: !!v, writable: false, configurable: true }),
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

  // CAPTURE BUTTONS
  const captureLabel = document.createElement('div');
  captureLabel.textContent = 'Capture';
  Object.assign(captureLabel.style, labelStyle);
  panel.appendChild(captureLabel);

  const captureRow = document.createElement('div');
  Object.assign(captureRow.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' });
  const techBtn = document.createElement('button');
  techBtn.type = 'button';
  techBtn.textContent = 'Sheet ALL · technical';
  Object.assign(techBtn.style, captureBtnStyle);
  techBtn.addEventListener('click', () =>
    debugApi.capturePlayerStatesContactSheet({ debugOverlay: true, group: 'all' }));
  captureRow.appendChild(techBtn);
  const cleanBtn = document.createElement('button');
  cleanBtn.type = 'button';
  cleanBtn.textContent = 'Sheet ALL · clean';
  Object.assign(cleanBtn.style, captureBtnStyle);
  cleanBtn.addEventListener('click', () =>
    debugApi.capturePlayerStatesContactSheet({ debugOverlay: false, group: 'all' }));
  captureRow.appendChild(cleanBtn);
  panel.appendChild(captureRow);

  for (const group of PLAYER_DEBUG_GROUPS) {
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '4px', marginBottom: '3px' });
    const t = document.createElement('button');
    t.type = 'button';
    t.textContent = `${group} · tech`;
    Object.assign(t.style, captureBtnStyle);
    t.addEventListener('click', () =>
      debugApi.capturePlayerStatesContactSheet({ debugOverlay: true, group }));
    const c = document.createElement('button');
    c.type = 'button';
    c.textContent = `${group} · clean`;
    Object.assign(c.style, captureBtnStyle);
    c.addEventListener('click', () =>
      debugApi.capturePlayerStatesContactSheet({ debugOverlay: false, group }));
    row.appendChild(t);
    row.appendChild(c);
    panel.appendChild(row);
  }

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
