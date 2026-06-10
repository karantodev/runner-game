import { GAME_CONFIG } from '../config/gameConfig.js';
import { PLAYER_STATES } from '../ecs/playerFsm.js';

/**
 * v3.8.29 — Player Debug State Registry.
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
export const PLAYER_DEBUG_STATES = [
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

export const PLAYER_DEBUG_STATE_BY_ID = new Map(PLAYER_DEBUG_STATES.map((s) => [s.id, s]));
export const PLAYER_DEBUG_GROUPS = [...new Set(PLAYER_DEBUG_STATES.map((s) => s.group))];
// Keyboard 1-9 map to the most-used QA targets (backward compat).
export const PLAYER_DEBUG_KEY_MAP = {
  '1': 'run', '2': 'jump_ascend', '3': 'jump_peak', '4': 'jump_descend',
  '5': 'duck', '6': 'hit_01', '7': 'invuln_dim', '8': 'death', '9': 'replay',
};

const PLAYER_FRAME_RE = /^playerFarmer(Run|Crouch|Jump|Hit|Idle|Death)\d+$/;
const PLAYER_CANONICAL_W = 64;
const PLAYER_CANONICAL_H = 96;

/**
 * v3.8.27 — installs the player-states debug mode on top of the game.
 * v3.8.29 — driven by PLAYER_DEBUG_STATES registry (hoisted above) +
 * the on-screen QA panel.
 */
export function installPlayerStatesMode(game, debugApi) {
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
    // Sync the FSM label to match the directly-written legacy flags.
    // Debug presets bypass transitionTo intentionally — they pin arbitrary
    // combinations for visual QA, not for live gameplay flow.
    if (p.components.PlayerState) {
      const fsmState =
        state.worldState === 'dying' || state.worldState === 'dead' ? PLAYER_STATES.dead
        : state.isJumping  ? PLAYER_STATES.jumping
        : state.crouching  ? PLAYER_STATES.crouching
        : state.invuln > 0 ? PLAYER_STATES.hit
        : PLAYER_STATES.running;
      p.components.PlayerState.current = fsmState;
    }
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
   */
  debugApi.applyPlayerState = applyPreset;
  debugApi.getPlayerDebugStates = () => PLAYER_DEBUG_STATES.map((s) => ({ ...s }));
  debugApi.setPoseBaselineLock = (v) => { modes.poseBaselineLock = !!v; };

  // v3.8.32 — Player Frame Audit.
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
      applyPreset('run');
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

  // 2× PREVIEW INSET
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

  // CAPTURE BUTTONS
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

  // Player Frame Audit
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
