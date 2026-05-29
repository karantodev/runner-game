import { platformLabel } from './PlatformInfo.js';

/**
 * Always-on gamepad inspection overlay. Activated by `?gamepadDebug=1`.
 *
 * Purpose: console testing without DevTools. PS5/Xbox/Switch browsers do
 * not expose a developer console reachable from the TV, so when a button
 * doesn't behave the way the code expects, the only way to see what
 * index it actually fires is a live on-screen panel.
 *
 * Displays:
 *   - platform / browser / DPR (sanity check)
 *   - pad index / id / mapping
 *   - every button: index, pressed / released, value (analog triggers)
 *   - every axis: index + signed value
 *   - last 8 button-down events (which index fired when)
 *
 * Independent of `?debug=1` so users on consoles can flip it on without
 * unlocking the broader debug API. Safe to instantiate in production.
 */
const RENDER_INTERVAL_MS = 100; // 10 Hz — gamepad polling cadence
const EVENT_LOG_CAPACITY = 8;
const STANDARD_BUTTON_LABELS = [
  'A/Cross', 'B/Circle', 'X/Square', 'Y/Triangle',
  'LB/L1', 'RB/R1', 'LT/L2', 'RT/R2',
  'Sel/Share', 'Start/Opt', 'L3', 'R3',
  '↑', '↓', '←', '→',
  'Home',
];

export class GamepadDebugOverlay {
  constructor() {
    this._lastRenderAt = 0;
    this._element = this.#buildDom();
    document.body.appendChild(this._element);

    // Memoised pressed state to detect button-down edges for the event log.
    this._prevPressed = [];
    this._eventLog = []; // ring of { button, label, ts }
    this._connectedId = null;

    window.addEventListener('gamepadconnected', (event) => {
      this._connectedId = event.gamepad?.id ?? null;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this._connectedId = null;
    });

    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _tick(now) {
    if (now - this._lastRenderAt >= RENDER_INTERVAL_MS) {
      this._lastRenderAt = now;
      this.#sampleAndRender();
    }
    requestAnimationFrame(this._tick);
  }

  #sampleAndRender() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads
      ? navigator.getGamepads()
      : [];
    const pad = Array.from(pads).find(Boolean);

    if (!pad) {
      this._element.innerHTML = `
        <div class="title">GAMEPAD DEBUG</div>
        <div class="row"><span class="lbl">Platform</span><b>${platformLabel()}</b></div>
        <div class="row"><span class="lbl">Status</span><b class="warn">no pad connected</b></div>
        <div class="hint">Press any button on a connected controller.</div>
      `;
      this._prevPressed.length = 0;
      return;
    }

    // Capture button-down edges for the event log.
    for (let i = 0; i < pad.buttons.length; i += 1) {
      const pressed = Boolean(pad.buttons[i]?.pressed);
      const wasPressed = this._prevPressed[i] ?? false;
      if (pressed && !wasPressed) {
        this._eventLog.unshift({
          button: i,
          label: STANDARD_BUTTON_LABELS[i] ?? `b${i}`,
          ts: Date.now(),
        });
        if (this._eventLog.length > EVENT_LOG_CAPACITY) this._eventLog.length = EVENT_LOG_CAPACITY;
      }
      this._prevPressed[i] = pressed;
    }

    const buttonRows = pad.buttons.map((b, i) => {
      const pressed = b?.pressed;
      const value = b?.value ?? 0;
      const label = STANDARD_BUTTON_LABELS[i] ?? `b${i}`;
      const stateClass = pressed ? 'btn-on' : 'btn-off';
      const valStr = Math.abs(value) > 0.001 && value < 1
        ? ` <span class="muted">${value.toFixed(2)}</span>`
        : '';
      return `<div class="btn-row ${stateClass}"><span class="idx">${i.toString().padStart(2, ' ')}</span><span class="lbl">${label}</span><b>${pressed ? 'DOWN' : '—'}</b>${valStr}</div>`;
    }).join('');

    const axisRows = pad.axes.map((v, i) => {
      const val = v ?? 0;
      const active = Math.abs(val) > 0.15;
      return `<div class="axis-row ${active ? 'axis-on' : ''}"><span class="idx">a${i}</span><b>${val.toFixed(3)}</b></div>`;
    }).join('');

    const eventRows = this._eventLog.map((e) => `<div class="event-row">${e.label} <span class="muted">(b${e.button})</span></div>`).join('');

    const mapping = pad.mapping || '(non-standard)';
    const mappingClass = pad.mapping === 'standard' ? '' : 'warn';

    this._element.innerHTML = `
      <div class="title">GAMEPAD DEBUG</div>
      <div class="section">
        <div class="row"><span class="lbl">Platform</span><b>${platformLabel()}</b></div>
        <div class="row"><span class="lbl">Pad index</span><b>${pad.index}</b></div>
        <div class="row"><span class="lbl">Mapping</span><b class="${mappingClass}">${mapping}</b></div>
        <div class="row"><span class="lbl">ID</span><b class="small">${escapeHtml(pad.id)}</b></div>
        <div class="row"><span class="lbl">Buttons / Axes</span><b>${pad.buttons.length} / ${pad.axes.length}</b></div>
      </div>
      <div class="section">
        <div class="subtitle">Buttons</div>
        ${buttonRows}
      </div>
      <div class="section">
        <div class="subtitle">Axes</div>
        ${axisRows}
      </div>
      <div class="section">
        <div class="subtitle">Recent button-down</div>
        ${eventRows || '<div class="muted">(press any button)</div>'}
      </div>
    `;
  }

  #buildDom() {
    const panel = document.createElement('aside');
    panel.id = 'gamepad-debug-overlay';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '1001',
      width: '300px',
      maxHeight: 'calc(100vh - 24px)',
      overflowY: 'auto',
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'rgba(8, 16, 26, 0.92)',
      color: '#dfefff',
      font: '13px/1.5 ui-monospace, "SF Mono", Menlo, monospace',
      boxShadow: '0 8px 22px rgba(0, 0, 0, 0.42)',
      pointerEvents: 'none',
    });
    const style = document.createElement('style');
    style.textContent = `
      #gamepad-debug-overlay .title { font-weight: 800; letter-spacing: 1px; padding-bottom: 6px; border-bottom: 1px solid rgba(140, 180, 220, 0.22); margin-bottom: 6px; }
      #gamepad-debug-overlay .subtitle { font-weight: 700; color: rgba(223, 239, 255, 0.78); padding: 4px 0; }
      #gamepad-debug-overlay .section { padding: 4px 0; border-bottom: 1px solid rgba(140, 180, 220, 0.14); }
      #gamepad-debug-overlay .section:last-of-type { border-bottom: 0; }
      #gamepad-debug-overlay .row { display: flex; justify-content: space-between; gap: 10px; }
      #gamepad-debug-overlay .lbl { color: rgba(223, 239, 255, 0.62); }
      #gamepad-debug-overlay b { color: #f1faff; font-weight: 700; }
      #gamepad-debug-overlay .muted { color: rgba(223, 239, 255, 0.42); font-weight: 400; }
      #gamepad-debug-overlay .warn { color: #ffb060; }
      #gamepad-debug-overlay .small { font-size: 11px; word-break: break-all; text-align: right; }
      #gamepad-debug-overlay .btn-row, #gamepad-debug-overlay .axis-row { display: flex; gap: 10px; padding: 1px 0; }
      #gamepad-debug-overlay .btn-row .idx, #gamepad-debug-overlay .axis-row .idx { width: 28px; color: rgba(223, 239, 255, 0.42); font-variant-numeric: tabular-nums; }
      #gamepad-debug-overlay .btn-row .lbl { flex: 1; }
      #gamepad-debug-overlay .btn-on { color: #9af07a; }
      #gamepad-debug-overlay .btn-on b { color: #9af07a; }
      #gamepad-debug-overlay .axis-on b { color: #ffd86a; }
      #gamepad-debug-overlay .event-row { color: rgba(223, 239, 255, 0.86); }
      #gamepad-debug-overlay .hint { padding-top: 6px; color: rgba(223, 239, 255, 0.52); font-size: 11px; }
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
