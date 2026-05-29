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
 * Sets world to a paused-but-rendering state, exposes 1-9 hotkeys, and
 * adds capturePlayerStates() to the debug API.
 */
function installPlayerStatesMode(game, debugApi) {
  const PRESETS = {
    run:           { worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
    jump_ascend:   { worldState: 'paused', vy: -14, y: -80,  isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
    jump_peak:     { worldState: 'paused', vy: 0,   y: -160, isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
    jump_descend:  { worldState: 'paused', vy: 12,  y: -80,  isJumping: true,  crouching: false, invuln: 0,  hitFlash: 0 },
    duck:          { worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: true,  invuln: 0,  hitFlash: 0 },
    hit:           { worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 78, hitFlash: 0.6 },
    invulnerable:  { worldState: 'paused', vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 30, hitFlash: 0 },
    death:         { worldState: 'dying',  vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
    replay:        { worldState: 'dying',  vy: 0,   y: 0,    isJumping: false, crouching: false, invuln: 0,  hitFlash: 0 },
  };
  const KEY_MAP = {
    '1': 'run', '2': 'jump_ascend', '3': 'jump_peak', '4': 'jump_descend',
    '5': 'duck', '6': 'hit', '7': 'invulnerable', '8': 'death', '9': 'replay',
  };

  const applyPreset = (presetName) => {
    const preset = PRESETS[presetName];
    if (!preset || !game.world?.player) return;
    const w = game.world;
    const p = w.player;
    w.state = preset.worldState;
    if (preset.worldState === 'dying') w.dyingFrames = w.config.gameplay.dyingFrames;
    // Centre player in middle lane, zero scroll for a stable backdrop.
    p.components.LaneState.laneX = 0;
    p.components.LaneState.targetLane = 0;
    p.components.LaneState.laneTilt = 0;
    p.components.VerticalState.y = preset.y;
    p.components.VerticalState.vy = preset.vy;
    p.components.VerticalState.isJumping = preset.isJumping;
    p.components.VerticalState.jumpStretch = 0;
    p.components.VerticalState.landSquash = 0;
    p.components.CrouchState.isCrouching = preset.crouching;
    p.components.Health.invulnerabilityFrames = preset.invuln;
    p.components.Health.hitFlash = preset.hitFlash;
    console.info(`[debugPlayerStates] state = ${presetName}`);
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

  // Keyboard 1-9 switches state.
  window.addEventListener('keydown', (event) => {
    if (!GAME_CONFIG.debug.showPlayerStates) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const presetName = KEY_MAP[event.key];
    if (!presetName) return;
    event.preventDefault();
    applyPreset(presetName);
  });

  /**
   * v3.8.28 — capturePlayerStates({ debugOverlay, download }):
   *   debugOverlay: true  — keep cyan/magenta/red player overlay (default; technical QA)
   *   debugOverlay: false — temporarily disable showPlayer for clean visual QA
   *   download:     true  — auto-trigger download per state
   *
   * Note: DOM-level overlays (PerformanceHUD panel, Orchid debug panel)
   * sit OUTSIDE the canvas, so canvas.toDataURL never includes them.
   * Only the in-canvas debug overlay (PlayerRenderer.#drawPlayerDebug)
   * is gated by the showPlayer flag.
   */
  debugApi.applyPlayerState = applyPreset;
  debugApi.capturePlayerStates = async ({ debugOverlay = true, download = false } = {}) => {
    const states = Object.keys(PRESETS);
    const canvas = document.getElementById('game');
    const prevShowPlayer = GAME_CONFIG.debug.showPlayer;
    if (!debugOverlay) {
      Object.defineProperty(GAME_CONFIG.debug, 'showPlayer', { value: false, writable: false, configurable: true });
    }
    const results = {};
    for (const state of states) {
      applyPreset(state);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataURL = canvas.toDataURL('image/png');
      results[state] = dataURL;
      if (download) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `player_state_${state}${debugOverlay ? '_debug' : '_clean'}.png`;
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
   * v3.8.28 — capturePlayerStatesContactSheet({ debugOverlay, cols, download }):
   * Composites all 9 state captures into one PNG grid (3 × 3 by default).
   * Lets QA verify cyan box constancy at a glance.
   */
  debugApi.capturePlayerStatesContactSheet = async ({ debugOverlay = true, cols = 3, download = true } = {}) => {
    const shots = await debugApi.capturePlayerStates({ debugOverlay, download: false });
    const states = Object.keys(shots);
    const rows = Math.ceil(states.length / cols);
    const canvas = document.getElementById('game');
    const cellW = canvas.width;
    const cellH = canvas.height;
    const margin = 12;
    const labelH = 28;
    const sheet = document.createElement('canvas');
    sheet.width = cols * cellW + (cols + 1) * margin;
    sheet.height = rows * (cellH + labelH) + (rows + 1) * margin;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < states.length; i += 1) {
      const state = states[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cellW + margin);
      const y = margin + row * (cellH + labelH + margin);
      const img = new Image();
      img.src = shots[state];
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { img.onload = r; });
      ctx.drawImage(img, x, y, cellW, cellH);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.toUpperCase(), x + cellW / 2, y + cellH + 20);
    }
    const dataURL = sheet.toDataURL('image/png');
    if (download) {
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `player_states_contact_sheet${debugOverlay ? '_debug' : '_clean'}.png`;
      a.click();
    }
    return dataURL;
  };

  console.info(
    '[debugPlayerStates] keys 1-9 switch state.\n' +
    '  Captures:\n' +
    '    __ORCHID_DEBUG__.capturePlayerStates({ debugOverlay: false, download: true })\n' +
    '    __ORCHID_DEBUG__.capturePlayerStatesContactSheet({ debugOverlay: false })',
  );
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
